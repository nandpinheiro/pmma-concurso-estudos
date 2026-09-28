import type { AnswerRecord, Question, Recommendation, ReviewPriority } from '../types';
import { calculateTopicProgress } from './priorityAlgorithm';
import { deriveProgressByQuestion, isReviewOverdue } from './reviewAlgorithm';

const RECOMMENDATION_QUANTITY = 10;

export function getNextRecommendation(
  attempts: AnswerRecord[],
  questions: Question[],
  now = new Date(),
  progressByQuestion = deriveProgressByQuestion(questions, attempts, now),
): Recommendation {
  const topics = calculateTopicProgress(questions, attempts, now, progressByQuestion);
  const overdueByTopic = new Map<string, number>();
  let overdueTotal = 0;

  for (const question of questions) {
    const progress = progressByQuestion.get(question.id);
    if (progress && isReviewOverdue(progress, now)) {
      const key = `${question.disciplina}\u0000${question.assunto}`;
      overdueByTopic.set(key, (overdueByTopic.get(key) ?? 0) + 1);
      overdueTotal += 1;
    }
  }

  const dueTopic = topics
    .filter((topic) => overdueByTopic.has(`${topic.disciplina}\u0000${topic.assunto}`))
    .sort((left, right) =>
      (overdueByTopic.get(`${right.disciplina}\u0000${right.assunto}`) ?? 0) -
      (overdueByTopic.get(`${left.disciplina}\u0000${left.assunto}`) ?? 0) ||
      right.priorityScore - left.priorityScore,
    )[0];

  if (dueTopic) {
    const dueCount = overdueByTopic.get(`${dueTopic.disciplina}\u0000${dueTopic.assunto}`) ?? 0;
    return {
      type: 'review',
      mode: 'REVISAO',
      disciplina: dueTopic.disciplina,
      assunto: dueTopic.assunto,
      quantidade: Math.min(RECOMMENDATION_QUANTITY, dueCount),
      prioridade: getPriorityLabel(dueTopic.priorityScore / 100),
      motivo: `${overdueTotal} ${overdueTotal === 1 ? 'revisão vencida' : 'revisões vencidas'}; este assunto tem ${dueCount}. Aproveitamento histórico: ${formatAccuracy(dueTopic)}.`,
    };
  }

  const weakTopic = topics.find((topic) =>
    topic.questionsSeen >= 3 && (topic.recurringErrors > 0 || topic.repeatedErrors > 0 || topic.trend === 'down' || topic.accuracy < 0.65),
  );
  if (weakTopic) {
    const recentDescription = weakTopic.recentAccuracy === null
      ? `${weakTopic.questionsSeen} questões respondidas`
      : `${Math.round(weakTopic.recentAccuracy * 100)}% nas últimas ${Math.min(10, weakTopic.questionsSeen)} questões`;
    return {
      type: 'practice',
      mode: 'ERROS',
      disciplina: weakTopic.disciplina,
      assunto: weakTopic.assunto,
      quantidade: RECOMMENDATION_QUANTITY,
      prioridade: getPriorityLabel(weakTopic.priorityScore / 100),
      motivo: `${formatAccuracy(weakTopic)}; ${recentDescription}${weakTopic.errorClassification === 'ERRO_CRITICO' ? `; dificuldade recorrente em ${weakTopic.recurringErrors} questões diferentes` : weakTopic.repeatedErrors ? `; ${weakTopic.repeatedErrors} questões erradas mais de uma vez` : ''}.`,
    };
  }

  const unseenTotal = topics.reduce((sum, topic) => sum + topic.unseenQuestions, 0);
  if (unseenTotal > 0) {
    const unseenTopic = [...topics].sort((left, right) =>
      right.unseenQuestions - left.unseenQuestions || right.priorityScore - left.priorityScore,
    )[0];
    return {
      type: 'new',
      mode: 'NAO_VISTAS',
      disciplina: unseenTopic?.disciplina ?? '',
      assunto: unseenTopic?.assunto ?? 'Questões não vistas',
      quantidade: Math.min(RECOMMENDATION_QUANTITY, unseenTotal),
      prioridade: getPriorityLabel((unseenTopic?.priorityScore ?? 0) / 100),
      motivo: `Há ${unseenTotal} ${unseenTotal === 1 ? 'questão não vista' : 'questões não vistas'} no banco${unseenTopic ? `; ${unseenTopic.assunto} tem ${unseenTopic.unseenQuestions}` : ''}.`,
    };
  }

  const topTopic = topics[0];
  if (topTopic) {
    return {
      type: 'mixed',
      mode: 'TREINO',
      disciplina: topTopic.disciplina,
      assunto: topTopic.assunto,
      quantidade: RECOMMENDATION_QUANTITY,
      prioridade: getPriorityLabel(topTopic.priorityScore / 100),
      motivo: `Todas as questões estão vistas. ${formatAccuracy(topTopic)}; use um treino para consolidar o histórico.`,
    };
  }

  return {
    type: 'new',
    mode: 'NAO_VISTAS',
    disciplina: '',
    assunto: 'Importe ou adicione questões',
    quantidade: 0,
    prioridade: 'baixa',
    motivo: 'O banco está vazio; nenhuma recomendação pode ser calculada sem questões.',
  };
}

function formatAccuracy(topic: { accuracy: number; correct: number; wrong: number }): string {
  const answered = topic.correct + topic.wrong;
  if (!answered) return 'Sem tentativas registradas';
  return `${Math.round(topic.accuracy * 100)}% de acerto em ${answered} ${answered === 1 ? 'questão' : 'questões'}`;
}

export function getPriorityLabel(value: number): ReviewPriority {
  if (value >= 0.65) return 'alta';
  if (value >= 0.35) return 'média';
  return 'baixa';
}
