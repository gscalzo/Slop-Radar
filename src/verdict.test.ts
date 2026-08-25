import { describe, expect, it } from "vitest";
import type { HeuristicScore } from "./core/types";
import { combine, judgeTier } from "./verdict";

function heuristic(tier: HeuristicScore["tier"], abstain?: HeuristicScore["abstain"]): HeuristicScore {
  return { words: 100, totalWeight: 5, density: 5, tier, abstain };
}

describe("judgeTier", () => {
  it("maps likelihood to tiers", () => {
    expect(judgeTier(0.1, "ai-writing-patterns")).toBe("green");
    expect(judgeTier(0.5, "ai-writing-patterns")).toBe("yellow");
    expect(judgeTier(0.9, "ai-writing-patterns")).toBe("red");
  });

  it("puts each source's boundaries where its evaluation put them (ADR 0012-0014)", () => {
    expect(judgeTier(0.34, "ai-writing-patterns")).toBe("green");
    expect(judgeTier(0.35, "ai-writing-patterns")).toBe("yellow");
    // 0.64 is the highest any human scored under this rubric: stays out of red.
    expect(judgeTier(0.64, "ai-writing-patterns")).toBe("yellow");
    expect(judgeTier(0.7, "ai-writing-patterns")).toBe("red");
    // 0.58 is the highest any human scored under the humanizer rubric.
    expect(judgeTier(0.34, "humanizer")).toBe("green");
    expect(judgeTier(0.58, "humanizer")).toBe("yellow");
    expect(judgeTier(0.6, "humanizer")).toBe("red");
  });
});

describe("combine", () => {
  it("abstention wins regardless of the judge", () => {
    const verdict = combine(heuristic("red", "too-short"), { likelihood: 0.9, phrases: [] }, "ai-writing-patterns");
    expect(verdict.tier).toBeNull();
    expect(verdict.abstain).toBe("too-short");
    expect(verdict.basis).toBe("patterns");
  });

  it("falls back to the heuristic tier when no judge result exists", () => {
    const verdict = combine(heuristic("yellow"), null, "ai-writing-patterns");
    expect(verdict.tier).toBe("yellow");
    expect(verdict.basis).toBe("patterns");
    expect(verdict.judgeTier).toBeUndefined();
  });

  it("the judge verdict wins outright, even against an opposite heuristic tier", () => {
    const verdict = combine(heuristic("red"), { likelihood: 0.1, phrases: [] }, "ai-writing-patterns");
    expect(verdict.tier).toBe("green");
    expect(verdict.basis).toBe("model");
    expect(verdict.heuristic.tier).toBe("red");
  });

  it("a low heuristic tier does not hold back a high judge likelihood", () => {
    const verdict = combine(heuristic("green"), { likelihood: 0.9, phrases: [] }, "ai-writing-patterns");
    expect(verdict.tier).toBe("red");
    expect(verdict.basis).toBe("model");
  });

  it("records the judge's contribution and keeps the heuristic score for the report", () => {
    const verdict = combine(heuristic("yellow"), { likelihood: 0.8, phrases: [] }, "ai-writing-patterns");
    expect(verdict.tier).toBe("red");
    expect(verdict.judgeTier).toBe("red");
    expect(verdict.likelihood).toBe(0.8);
    expect(verdict.heuristic.tier).toBe("yellow");
  });

  it("clamps an out-of-range likelihood before mapping it to a tier", () => {
    const verdict = combine(heuristic("green"), { likelihood: 1.5, phrases: [] }, "ai-writing-patterns");
    expect(verdict.tier).toBe("red");
    expect(verdict.likelihood).toBe(1);
  });
});
