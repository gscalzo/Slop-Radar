/** Scoring maths for the offline evaluation, kept pure so it is testable. */

export interface Scored {
  name: string;
  label: "ai" | "human";
  likelihood: number | null;
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export function likelihoods(scores: Scored[], label: "ai" | "human"): number[] {
  return scores
    .filter((s) => s.label === label && s.likelihood !== null)
    .map((s) => s.likelihood as number);
}

/**
 * Probability that a random AI post outscores a random human one (Mann-Whitney
 * U / ROC AUC). 1.0 is perfect ranking, 0.5 is a coin flip.
 *
 * This is the number to choose a model on, because it is threshold-independent:
 * accuracy and misread counts measure the judge and our measured 0.35/0.7
 * boundaries at the same time, and a model that ranks perfectly but scores
 * everything in a narrow band would look bad on those while being ideal — you
 * would simply move the boundary.
 */
function pairScore(a: number, h: number): number {
  if (a > h) return 1;
  return a === h ? 0.5 : 0;
}

export function auc(ai: number[], human: number[]): number {
  if (ai.length === 0 || human.length === 0) return 0;
  const wins = ai.reduce(
    (total, a) => total + human.reduce((row, h) => row + pairScore(a, h), 0),
    0,
  );
  return wins / (ai.length * human.length);
}

export interface Sweep {
  threshold: number;
  falsePositives: number;
  falseNegatives: number;
}

/**
 * How many mistakes each candidate boundary would make. False positives —
 * humans flagged as AI — are the costly ones: this tool tells someone their
 * writing reads as machine-made.
 */
export function sweep(ai: number[], human: number[], steps = 9): Sweep[] {
  return Array.from({ length: steps }, (_, i) => {
    const threshold = (i + 1) / (steps + 1);
    return {
      threshold,
      falsePositives: human.filter((h) => h >= threshold).length,
      falseNegatives: ai.filter((a) => a < threshold).length,
    };
  });
}

/** The threshold with the fewest total mistakes; ties go to the stricter one. */
export function bestThreshold(rows: Sweep[]): Sweep | undefined {
  return [...rows].sort(
    (a, b) =>
      a.falsePositives + a.falseNegatives - (b.falsePositives + b.falseNegatives) ||
      b.threshold - a.threshold,
  )[0];
}
