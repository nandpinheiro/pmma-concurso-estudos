import type { AnswerRecord, Question } from '../types';
import { deriveProgressByQuestion, isReviewOverdue } from './reviewAlgorithm';

export type QuestionSelectionMode = 'practice' | 'review' | 'errors' | 'unseen' | 'mixed';

export interface QuestionSelectionOptions {
  questions: Question[];
  attempts: AnswerRecord[];
  quantity: number;
  discipline?: string;
  topic?: string;
  priorityTopic?: string;
  mode?: QuestionSelectionMode;
  now?: Date;
  excludeRecentlySeenHours?: number;
}

export interface QuestionSelectionResult {
  questions: Question[];
  eligibleCount: number;
  recentlyExcluded: number;
}

export function selectQuestionsForSession(options: QuestionSelectionOptions): QuestionSelectionResult {
  const {
    attempts,
    now = new Date(),
    mode = 'practice',
    excludeRecentlySeenHours = 24,
  } = options;
  const quantity = Math.max(0, Math.floor(options.quantity));
  const relevantQuestions = options.questions.filter((question) =>
    question.active !== false &&
    (!options.discipline || question.disciplina === options.discipline) &&
    (!options.topic || question.assunto === options.topic),
  );
  const latestAttempt = new Map<string, AnswerRecord>();
  for (const attempt of attempts) {
    const current = latestAttempt.get(attempt.questionId);
    if (!current || new Date(attempt.data).getTime() > new Date(current.data).getTime()) {
      latestAttempt.set(attempt.questionId, attempt);
    }
  }

  const recentCutoff = now.getTime() - excludeRecentlySeenHours * 60 * 60 * 1000;
  const progressByQuestion = deriveProgressByQuestion(relevantQuestions, attempts, now);
  const recentlyExcluded = relevantQuestions.filter((question) => {
    const latest = latestAttempt.get(question.id);
    return latest && new Date(latest.data).getTime() > recentCutoff;
  }).length;
  const candidates = relevantQuestions
    .filter((question) => {
      const latest = latestAttempt.get(question.id);
      return !latest || new Date(latest.data).getTime() <= recentCutoff;
    })
    .map((question) => {
      const progress = progressByQuestion.get(question.id);
      const latest = latestAttempt.get(question.id);
      const due = progress ? isReviewOverdue(progress, now) : false;
      const wrong = Boolean(latest && !latest.acertou);
      let rank = 0;

      if (mode === 'review') rank = due ? 0 : 1;
      else if (mode === 'errors') rank = wrong ? 0 : !latest ? 1 : 2;
      else if (mode === 'unseen') rank = latest ? 1 : 0;
      else if (mode === 'mixed') rank = due ? 0 : !latest ? 1 : wrong ? 2 : 3;
      else rank = !latest ? 0 : due ? 1 : wrong ? 2 : 3;

      const seenAt = latest ? new Date(latest.data).getTime() : 0;
      return { question, rank, seenAt };
    })
    .filter(({ rank }) => mode !== 'review' && mode !== 'unseen' || rank === 0)
    .sort((left, right) => left.rank - right.rank || left.seenAt - right.seenAt || left.question.id.localeCompare(right.question.id));

  let selectedCandidates = candidates;
  if (options.priorityTopic && !options.topic) {
    const priorityCount = Math.min(quantity, Math.ceil(quantity * 0.7));
    const priority = candidates.filter((candidate) => candidate.question.assunto === options.priorityTopic);
    const complementary = candidates.filter((candidate) => candidate.question.assunto !== options.priorityTopic);
    selectedCandidates = [
      ...priority.slice(0, priorityCount),
      ...complementary.slice(0, Math.max(0, quantity - priorityCount)),
      ...priority.slice(priorityCount),
      ...complementary.slice(Math.max(0, quantity - priorityCount)),
    ];
  }

  return {
    questions: selectedCandidates.slice(0, quantity).map((candidate) => candidate.question),
    eligibleCount: candidates.length,
    recentlyExcluded,
  };
}