import { describe, expect, it } from "vitest";
import { auc, bestThreshold, likelihoods, mean, sweep } from "./report";

describe("auc", () => {
  it("is 1 when every AI post outscores every human one", () => {
    expect(auc([0.8, 0.9], [0.1, 0.2])).toBe(1);
  });

  it("is 0.5 for identical distributions — a coin flip", () => {
    expect(auc([0.5, 0.5], [0.5, 0.5])).toBe(0.5);
  });

  it("is 0 when the ranking is exactly backwards", () => {
    expect(auc([0.1, 0.2], [0.8, 0.9])).toBe(0);
  });

  it("counts partial overlap proportionally", () => {
    // 0.6 beats both humans; 0.3 beats only 0.2 → 3 of 4 pairs.
    expect(auc([0.6, 0.3], [0.2, 0.4])).toBe(0.75);
  });

  it("is 0 rather than NaN when a class is empty", () => {
    expect(auc([], [0.5])).toBe(0);
  });
});

describe("sweep", () => {
  it("counts the mistakes each boundary would make", () => {
    const rows = sweep([0.8, 0.6], [0.1, 0.5], 9);
    const at = (t: number): { falsePositives: number; falseNegatives: number } =>
      rows.find((r) => Math.abs(r.threshold - t) < 1e-9)!;

    expect(at(0.4)).toMatchObject({ falsePositives: 1, falseNegatives: 0 });
    expect(at(0.7)).toMatchObject({ falsePositives: 0, falseNegatives: 1 });
  });
});

describe("bestThreshold", () => {
  it("picks the fewest total mistakes", () => {
    const best = bestThreshold(sweep([0.9, 0.8], [0.1, 0.2]));
    expect(best!.falsePositives + best!.falseNegatives).toBe(0);
  });

  it("prefers the stricter boundary when two tie", () => {
    // Nothing between 0.2 and 0.8, so every boundary in between is perfect.
    const best = bestThreshold(sweep([0.8], [0.2]));
    expect(best!.threshold).toBeGreaterThan(0.5);
  });
});

describe("likelihoods and mean", () => {
  it("selects one class and drops failed calls", () => {
    const scores = [
      { name: "a", label: "ai" as const, likelihood: 0.8 },
      { name: "b", label: "ai" as const, likelihood: null },
      { name: "c", label: "human" as const, likelihood: 0.2 },
    ];
    expect(likelihoods(scores, "ai")).toEqual([0.8]);
    expect(mean(likelihoods(scores, "human"))).toBe(0.2);
  });

  it("means an empty list as zero rather than NaN", () => {
    expect(mean([])).toBe(0);
  });
});
