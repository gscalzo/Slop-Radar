import { describe, expect, it } from "vitest";
import type { HeuristicScore } from "./core/types";
import { combine, judgeTier } from "./verdict";

function heuristic(tier: HeuristicScore["tier"], abstain?: HeuristicScore["abstain"]): HeuristicScore {
  return { words: 100, totalWeight: 5, density: 5, tier, abstain };
}

describe("judgeTier", () => {
  it("maps likelihood to tiers", () => {
    expect(judgeTier(0.1)).toBe("green");
    expect(judgeTier(0.5)).toBe("yellow");
    expect(judgeTier(0.9)).toBe("red");
  });
});

describe("combine", () => {
  it("abstention wins regardless of the judge", () => {
    const verdict = combine(heuristic("red", "too-short"), { likelihood: 0.9, phrases: [] });
    expect(verdict.tier).toBeNull();
    expect(verdict.abstain).toBe("too-short");
    expect(verdict.basis).toBe("patterns");
  });

  it("falls back to the heuristic tier when no judge result exists", () => {
    const verdict = combine(heuristic("yellow"), null);
    expect(verdict.tier).toBe("yellow");
    expect(verdict.basis).toBe("patterns");
    expect(verdict.judgeTier).toBeUndefined();
  });

  it("the judge verdict wins outright, even against an opposite heuristic tier", () => {
    const verdict = combine(heuristic("red"), { likelihood: 0.1, phrases: [] });
    expect(verdict.tier).toBe("green");
    expect(verdict.basis).toBe("model");
    expect(verdict.heuristic.tier).toBe("red");
  });

  it("a low heuristic tier does not hold back a high judge likelihood", () => {
    const verdict = combine(heuristic("green"), { likelihood: 0.9, phrases: [] });
    expect(verdict.tier).toBe("red");
    expect(verdict.basis).toBe("model");
  });

  it("records the judge's contribution and keeps the heuristic score for the report", () => {
    const verdict = combine(heuristic("yellow"), { likelihood: 0.8, phrases: [] });
    expect(verdict.tier).toBe("red");
    expect(verdict.judgeTier).toBe("red");
    expect(verdict.likelihood).toBe(0.8);
    expect(verdict.heuristic.tier).toBe("yellow");
  });

  it("clamps an out-of-range likelihood before mapping it to a tier", () => {
    const verdict = combine(heuristic("green"), { likelihood: 1.5, phrases: [] });
    expect(verdict.tier).toBe("red");
    expect(verdict.likelihood).toBe(1);
  });
});
