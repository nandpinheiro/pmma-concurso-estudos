import type { AnswerRecord, MarkState, NotebookCategory, NotebookItem, Question, QuestionProgress, TopicProgress } from '../types';
import { isReviewOverdue } from './reviewAlgorithm';

export function buildNotebookItems(
  questions: Question[],
  attempts: AnswerRecord[],
  marks: Record<string, MarkState>,
  progressByQuestion: Map<string, QuestionProgress>,
  topicProgress: TopicProgress[],
  now = new Date(),
): NotebookItem[] {
  const topicsByKey = new Map(topicProgress.map((topic) => [`${topic.disciplina}\u0000${topic.assunto}`, topic]));
  const latestAttemptByQuestion = new Map<string, AnswerRecord>();
  for (const attempt of attempts) {
    const current = latestAttemptByQuestion.get(attempt.questionId);
    if (!current || new Date(attempt.data).getTime() > new Date(current.data).getTime()) {
      latestAttemptByQuestion.set(attempt.questionId, attempt);
    }
  }

  return questions.flatMap((question) => {
    const progress = progressByQuestion.get(question.id);
    if (!progress) return [];
    const mark = marks[question.id];
    const topic = topicsByKey.get(`${question.disciplina}\u0000${question.assunto}`);
    const latestAttempt = latestAttemptByQuestion.get(question.id);
    const categories: NotebookCategory[] = [];
    const lastSeen = progress.lastSeenAt ? new Date(progress.lastSeenAt).getTime() : 0;

    if (progress.lastWasCorrect === false && now.getTime() - lastSeen <= 7 * 24 * 60 * 60 * 1000) categories.push('ERROS_RECENTES');
    if (progress.timesWrong >= 2 || (topic?.recurringErrors ?? 0) >= 2) categories.push('ERROS_RECORRENTES');
    if (isReviewOverdue(progress, now)) categories.push('REVISOES_VENCIDAS');
    if (mark?.dificil) categories.push('QUESTOES_DIFICEIS');
    if (mark?.favorita) categories.push('FAVORITAS');
    if (mark?.pegadinha || question.pegadinha || question.tags.some((tag) => tag.toLowerCase().includes('pegadinha'))) categories.push('PEGADINHAS');
    if (!progress.timesSeen) categories.push('NAO_VISTAS');

    const confidenceSignal = latestAttempt?.confidence !== undefined
      ? latestAttempt.acertou === false && latestAttempt.confidence >= 4
        ? 'ERRO_ALTA_CONFIANCA' as const
        : latestAttempt.acertou === true && latestAttempt.confidence <= 2
          ? 'ACERTO_BAIXA_CONFIANCA' as const
          : undefined
      : undefined;

    return [{
      questionId: question.id,
      disciplina: question.disciplina,
      assunto: question.assunto,
      enunciado: question.enunciado,
      data: progress.lastSeenAt ? new Date(progress.lastSeenAt).toLocaleDateString('pt-BR') : '—',
      erros: progress.timesWrong,
      ultimaResposta: progress.lastAnswer ?? null,
      proximaRevisao: progress.nextReviewAt ? new Date(progress.nextReviewAt).toLocaleDateString('pt-BR') : 'Não agendada',
      prioridade: topic && topic.priorityScore >= 65 ? 'alta' as const : topic && topic.priorityScore >= 35 ? 'média' as const : 'baixa' as const,
      vencida: isReviewOverdue(progress, now),
      categorias: categories,
      confidenceSignal,
      lastAttemptAt: latestAttempt?.data,
    }];
  }).sort((left, right) => Number(right.vencida) - Number(left.vencida) || new Date(right.lastAttemptAt ?? 0).getTime() - new Date(left.lastAttemptAt ?? 0).getTime());
}