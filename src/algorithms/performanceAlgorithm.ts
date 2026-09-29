import type { AnswerRecord } from '../types';

export interface PerformanceMetric {
  attempts: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number | null;
}

export interface TimeMetrics {
  averageSeconds: number | null;
  medianSeconds: number | null;
  fastestSeconds: number | null;
  slowestSeconds: number | null;
  veryFast: number;
  verySlow: number;
}

export interface PerformanceSummary {
  windows: Record<'10' | '20' | '30' | '50' | '100' | 'all', PerformanceMetric>;
  time: TimeMetrics;
  byDiscipline: Array<{ discipline: string; attempts: number; correct: number; wrong: number; accuracy: number | null; time: TimeMetrics }>;
  recentTrend: 'up' | 'down' | 'stable' | 'insufficient';
}

export interface DailyPerformance {
  date: string;
  attempts: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number | null;
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

function summarizeTime(attempts: AnswerRecord[]): TimeMetrics {
  const values = attempts.map((attempt) => attempt.tempoGasto / 1000).filter((value) => Number.isFinite(value) && value >= 0).sort((left, right) => left - right);
  if (!values.length) return { averageSeconds: null, medianSeconds: null, fastestSeconds: null, slowestSeconds: null, veryFast: 0, verySlow: 0 };
  const medianSeconds = values.length % 2
    ? values[Math.floor(values.length / 2)]
    : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  return {
    averageSeconds: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianSeconds,
    fastestSeconds: values[0],
    slowestSeconds: values[values.length - 1],
    veryFast: values.filter((value) => value < Math.max(2, medianSeconds * 0.4)).length,
    verySlow: values.filter((value) => value > Math.max(10, medianSeconds * 2)).length,
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
    time: summarizeTime(ordered),
    byDiscipline: [...byDiscipline.entries()].map(([discipline, records]) => {
      const metric = summarize(records);
      return {
        discipline,
        attempts: metric.attempts,
        correct: metric.correct,
        wrong: metric.wrong,
        accuracy: metric.accuracy,
        time: summarizeTime(records),
      };
    }).sort((left, right) => right.attempts - left.attempts),
    recentTrend,
  };
}

export function calculateDailyPerformance(attempts: AnswerRecord[], days?: number): DailyPerformance[] {
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : undefined;
  const byDate = new Map<string, AnswerRecord[]>();
  for (const attempt of attempts) {
    const timestamp = new Date(attempt.data).getTime();
    if (cutoff !== undefined && timestamp < cutoff) continue;
    const date = attempt.data.slice(0, 10);
    const records = byDate.get(date) ?? [];
    records.push(attempt);
    byDate.set(date, records);
  }

  return [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, records]) => {
    const metric = summarize(records);
    return { date, attempts: metric.attempts, correct: metric.correct, wrong: metric.wrong, blank: metric.blank, accuracy: metric.accuracy };
  });
}