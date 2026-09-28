export interface CebraspeScore {
  correct: number;
  wrong: number;
  blank: number;
  evaluated: number;
  accuracy: number | null;
  netScore: number;
}

export function calculateCebraspeScore(results: Array<boolean | null>, penalty = 1): CebraspeScore {
  const correct = results.filter((result) => result === true).length;
  const wrong = results.filter((result) => result === false).length;
  const blank = results.length - correct - wrong;
  const evaluated = correct + wrong;

  return {
    correct,
    wrong,
    blank,
    evaluated,
    accuracy: evaluated ? correct / evaluated : null,
    netScore: correct - wrong * Math.max(0, penalty),
  };
}