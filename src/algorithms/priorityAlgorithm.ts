import type { AnswerRecord, Difficulty, Question, TopicProgress } from '../types';
import { deriveProgressByQuestion, isReviewOverdue } from './reviewAlgorithm';

export const PRIORITY_WEIGHTS = {
  weakness: 0.25,
  recentErrors: 0.2,
  recurringErrors: 0.2,
  overdueReviews: 0.15,
  recentTrend: 0.1,
  difficulty: 0.05,
  unseen: 0.05,
} as const;

const DIFFICULTY_SCORE: Record<Difficulty, number> = {
  fácil: 0.25,
  média: 0.6,
  difícil: 1,
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export interface PriorityInputs {
  accuracy: number;
  recentAccuracy: number | null;
  recentErrors: number;
  repeatedErrors: number;
  overdueReviews: number;
  questionsSeen: number;
  unseenQuestions: number;
  averageDifficulty: number;
}

export function calculatePriority(input: PriorityInputs): number {
  const weakness = 1 - clamp(input.accuracy);
  const recentErrorRate = input.questionsSeen > 0
    ? clamp(input.recentErrors / Math.min(input.questionsSeen, 10))
    : 0;
  const recurringErrorRate = clamp(input.repeatedErrors / 3);
  const overdueRate = clamp(input.overdueReviews / Math.max(1, input.questionsSeen));
  const trendDecline = input.recentAccuracy === null
    ? 0
    : clamp((input.accuracy - input.recentAccuracy) * 2);
  const unseenRate = input.unseenQuestions > 0
    ? clamp(input.unseenQuestions / Math.max(1, input.questionsSeen + input.unseenQuestions))
    : 0;

  const weightedScore =
    weakness * PRIORITY_WEIGHTS.weakness +
    recentErrorRate * PRIORITY_WEIGHTS.recentErrors +
    recurringErrorRate * PRIORITY_WEIGHTS.recurringErrors +
    overdueRate * PRIORITY_WEIGHTS.overdueReviews +
    trendDecline * PRIORITY_WEIGHTS.recentTrend +
    clamp(input.averageDifficulty) * PRIORITY_WEIGHTS.difficulty +
    unseenRate * PRIORITY_WEIGHTS.unseen;

  return Math.round(weightedScore * 100);
}

export function calculateTopicProgress(
  questions: Question[],
  attempts: AnswerRecord[],
  now = new Date(),
  progressByQuestion = deriveProgressByQuestion(questions, attempts, now),
): TopicProgress[] {
  const groups = new Map<string, Question[]>();
  const attemptsByQuestion = new Map<string, AnswerRecord[]>();
  for (const attempt of attempts) {
    const questionAttempts = attemptsByQuestion.get(attempt.questionId) ?? [];
    questionAttempts.push(attempt);
    attemptsByQuestion.set(attempt.questionId, questionAttempts);
  }
  for (const question of questions) {
    const key = `${question.disciplina}\u0000${question.assunto}`;
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }

  return [...groups.values()].map((topicQuestions) => {
    const topicAttempts = topicQuestions
      .flatMap((question) => attemptsByQuestion.get(question.id) ?? [])
      .filter((attempt) => attempt.acertou !== null)
      .sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime());
    const correct = topicAttempts.filter((attempt) => attempt.acertou).length;
    const answeredCount = topicAttempts.length;
    const accuracy = answeredCount ? correct / answeredCount : 0;
    const recent = topicAttempts.slice(-10);
    const recentAccuracy = recent.length >= 3
      ? recent.filter((attempt) => attempt.acertou).length / recent.length
      : null;
    const questionsWithErrors = new Map<string, number>();
    for (const attempt of topicAttempts) {
      if (!attempt.acertou) questionsWithErrors.set(attempt.questionId, (questionsWithErrors.get(attempt.questionId) ?? 0) + 1);
    }
    const repeatedErrors = [...questionsWithErrors.values()].filter((count) => count >= 2).length;
    const recurringErrors = questionsWithErrors.size >= 2 ? questionsWithErrors.size : 0;
    const progress = topicQuestions.map((question) => progressByQuestion.get(question.id)).filter((item) => item !== undefined);
    const questionsSeen = progress.filter((item) => item.timesSeen > 0).length;
    const overdueReviews = progress.filter((item) => isReviewOverdue(item, now)).length;
    const unseenQuestions = topicQuestions.length - questionsSeen;
    const averageDifficulty = topicQuestions.reduce((sum, question) => sum + DIFFICULTY_SCORE[question.dificuldade], 0) / topicQuestions.length;
    const priorityScore = calculatePriority({
      accuracy,
      recentAccuracy,
      recentErrors: recent.filter((attempt) => !attempt.acertou).length,
      repeatedErrors: Math.max(repeatedErrors, recurringErrors),
      overdueReviews,
      questionsSeen,
      unseenQuestions,
      averageDifficulty,
    });
    const confidence = answeredCount / (answeredCount + 5);

    const trend: TopicProgress['trend'] = recentAccuracy === null
      ? 'insufficient'
      : recentAccuracy < accuracy - 0.05
        ? 'down'
        : recentAccuracy > accuracy + 0.05
          ? 'up'
          : 'stable';
    const errorClassification: TopicProgress['errorClassification'] = questionsWithErrors.size >= 3
      ? 'ERRO_CRITICO'
      : questionsWithErrors.size >= 2 || repeatedErrors > 0
        ? 'ERRO_RECORRENTE'
        : recent.filter((attempt) => !attempt.acertou).length > 0
          ? 'ERRO_RECENTE'
          : questionsWithErrors.size === 1
            ? 'ERRO_ISOLADO'
            : null;

    return {
      disciplina: topicQuestions[0].disciplina,
      assunto: topicQuestions[0].assunto,
      questionCount: topicQuestions.length,
      questionsSeen,
      correct,
      wrong: answeredCount - correct,
      accuracy,
      recentAccuracy,
      confidence,
      repeatedErrors,
      recurringErrors,
      errorClassification,
      unseenQuestions,
      overdueReviews,
      masteryScore: Math.round(accuracy * confidence * 100),
      priorityScore,
      trend,
    };
  }).sort((left, right) => right.priorityScore - left.priorityScore);
}