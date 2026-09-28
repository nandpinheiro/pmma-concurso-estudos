import type { AnswerRecord, Difficulty, Question, QuestionProgress } from '../types';

const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 15, 30] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface ReviewSchedule {
  level: number;
  nextReviewAt: string;
}

export function calculateNextReview(options: {
  correct: boolean;
  currentLevel: number;
  difficulty: Difficulty;
  consecutiveCorrect?: number;
  now?: Date;
}): ReviewSchedule {
  const { correct, difficulty, now = new Date() } = options;
  const currentLevel = Math.max(0, Math.min(5, options.currentLevel));
  let level: number;

  if (!correct) {
    level = 1;
  } else if (currentLevel === 0) {
    level = 3;
  } else if (currentLevel === 1) {
    level = 2;
  } else {
    level = Math.min(5, currentLevel + 1);
  }

  let intervalDays: number = REVIEW_INTERVAL_DAYS[level];
  if (difficulty === 'difícil') intervalDays = Math.max(1, Math.floor(intervalDays * 0.75));
  if (difficulty === 'fácil' && correct && (options.consecutiveCorrect ?? 0) >= 3) {
    intervalDays = Math.min(30, Math.ceil(intervalDays * 1.25));
  }

  return {
    level,
    nextReviewAt: new Date(now.getTime() + intervalDays * DAY_IN_MS).toISOString(),
  };
}

function deriveProgressFromAttempts(
  question: Question,
  attempts: AnswerRecord[],
  now = new Date(),
): QuestionProgress {
  const ordered = attempts
    .sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime());

  let currentLevel = 0;
  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;
  let nextReviewAt: string | undefined;

  for (const attempt of ordered) {
    if (attempt.acertou === null) {
      consecutiveCorrect = 0;
      consecutiveWrong = 0;
      continue;
    }
    const correct = Boolean(attempt.acertou);
    const schedule = calculateNextReview({
      correct,
      currentLevel,
      difficulty: question.dificuldade,
      consecutiveCorrect,
      now: new Date(attempt.data),
    });
    currentLevel = schedule.level;
    nextReviewAt = schedule.nextReviewAt;
    consecutiveCorrect = correct ? consecutiveCorrect + 1 : 0;
    consecutiveWrong = correct ? 0 : consecutiveWrong + 1;
  }

  const lastAttempt = ordered[ordered.length - 1];
  const responseTimes = ordered.map((attempt) => attempt.tempoGasto).filter((time) => time > 0);

  return {
    questionId: question.id,
    timesSeen: ordered.length,
    timesCorrect: ordered.filter((attempt) => attempt.acertou === true).length,
    timesWrong: ordered.filter((attempt) => attempt.acertou === false).length,
    lastSeenAt: lastAttempt?.data,
    lastAnswer: lastAttempt?.resposta === 'CERTO' || lastAttempt?.resposta === 'ERRADO'
      ? lastAttempt.resposta
      : undefined,
    currentLevel,
    nextReviewAt,
    consecutiveCorrect,
    consecutiveWrong,
    averageResponseTime: responseTimes.length
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
      : undefined,
    lastWasCorrect: lastAttempt?.acertou ?? undefined,
  };
}

export function deriveQuestionProgress(
  question: Question,
  attempts: AnswerRecord[],
  now = new Date(),
): QuestionProgress {
  return deriveProgressFromAttempts(
    question,
    attempts.filter((attempt) => attempt.questionId === question.id),
    now,
  );
}

export function deriveProgressByQuestion(
  questions: Question[],
  attempts: AnswerRecord[],
  now = new Date(),
): Map<string, QuestionProgress> {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const attemptsByQuestion = new Map<string, AnswerRecord[]>();
  for (const attempt of attempts) {
    if (!questionsById.has(attempt.questionId)) continue;
    const questionAttempts = attemptsByQuestion.get(attempt.questionId) ?? [];
    questionAttempts.push(attempt);
    attemptsByQuestion.set(attempt.questionId, questionAttempts);
  }

  return new Map(questions.map((question) => [
    question.id,
    deriveProgressFromAttempts(question, attemptsByQuestion.get(question.id) ?? [], now),
  ]));
}

export function isReviewOverdue(progress: QuestionProgress, now = new Date()): boolean {
  return Boolean(progress.nextReviewAt && new Date(progress.nextReviewAt).getTime() <= now.getTime());
}