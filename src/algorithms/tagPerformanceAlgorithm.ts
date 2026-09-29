import type { AnswerRecord, Question } from '../types';

export interface TagPerformance {
  tag: string;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  errorRate: number;
}

export function calculateTagPerformance(questions: Question[], attempts: AnswerRecord[]): TagPerformance[] {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const byTag = new Map<string, { correct: number; wrong: number }>();
  for (const attempt of attempts) {
    if (attempt.acertou === null) continue;
    const question = questionsById.get(attempt.questionId);
    if (!question) continue;
    for (const rawTag of question.tags) {
      const tag = rawTag.trim().toUpperCase();
      if (!tag) continue;
      const current = byTag.get(tag) ?? { correct: 0, wrong: 0 };
      if (attempt.acertou) current.correct += 1;
      else current.wrong += 1;
      byTag.set(tag, current);
    }
  }

  return [...byTag.entries()].map(([tag, result]) => {
    const attemptsCount = result.correct + result.wrong;
    return {
      tag,
      attempts: attemptsCount,
      correct: result.correct,
      wrong: result.wrong,
      accuracy: result.correct / attemptsCount,
      errorRate: result.wrong / attemptsCount,
    };
  }).sort((left, right) => right.errorRate - left.errorRate || right.attempts - left.attempts);
}