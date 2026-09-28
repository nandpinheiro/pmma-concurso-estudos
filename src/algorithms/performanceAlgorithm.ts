import type { AnswerRecord } from '../types';

export interface PerformanceMetric {
  attempts: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number | null;
}

export interface PerformanceSummary {
  windows: Record<'10' | '20' | '30' | '50' | '100' | 'all', PerformanceMetric>;
  byDiscipline: Array<{ discipline: string; attempts: number; correct: number; wrong: number; accuracy: number | null }>;
  recentTrend: 'up' | 'down' | 'stable' | 'insufficient';
}

function summarize(attempts: AnswerRecord[]): PerformanceMetric {
  const correct = attempts.filter((attempt) => attempt.acertou === true).length;
  const wrong = attempts.filter((attempt) => attempt.acertou === false).length;
  const evaluated = correct + wrong;
  return {
    attempts: attempts.length,
    correct,
    wrong,
    blank: attempts.length - evaluated,
    accuracy: evaluated ? correct / evaluated : null,
  };
}

export function calculatePerformance(attempts: AnswerRecord[]): PerformanceSummary {
  const ordered = [...attempts].sort((left, right) => new Date(left.data).getTime() - new Date(right.data).getTime());
  const windows = {
    '10': summarize(ordered.slice(-10)),
    '20': summarize(ordered.slice(-20)),
    '30': summarize(ordered.slice(-30)),
    '50': summarize(ordered.slice(-50)),
    '100': summarize(ordered.slice(-100)),
    all: summarize(ordered),
  };
  const byDiscipline = new Map<string, AnswerRecord[]>();
  for (const attempt of ordered) {
    if (attempt.acertou === null) continue;
    const current = byDiscipline.get(attempt.disciplina) ?? [];
    current.push(attempt);
    byDiscipline.set(attempt.disciplina, current);
  }

  const overallAccuracy = windows.all.accuracy;
  const recentAccuracy = windows['10'].accuracy;
  const recentTrend: PerformanceSummary['recentTrend'] = overallAccuracy === null || recentAccuracy === null || windows['10'].attempts < 3
    ? 'insufficient'
    : recentAccuracy < overallAccuracy - 0.05
      ? 'down'
      : recentAccuracy > overallAccuracy + 0.05
        ? 'up'
        : 'stable';

  return {
    windows,
    byDiscipline: [...byDiscipline.entries()].map(([discipline, records]) => {
      const metric = summarize(records);
      return {
        discipline,
        attempts: metric.attempts,
        correct: metric.correct,
        wrong: metric.wrong,
        accuracy: metric.accuracy,
      };
    }).sort((left, right) => right.attempts - left.attempts),
    recentTrend,
  };
}