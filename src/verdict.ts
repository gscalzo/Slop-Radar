import { clamp01 } from "./core/clamp";
import type { AbstainReason, HeuristicScore, Tier } from "./core/types";
import type { JudgeResult } from "./judge/types";

export interface Verdict {
  /** Final tier, or null when the meter abstains. */
  tier: Tier | null;
  abstain?: AbstainReason;
  heuristic: HeuristicScore;
  judgeTier?: Tier;
  likelihood?: number;
  /** "model" when the tier came from the LLM judge, "patterns" for the heuristic fallback. */
  basis: "model" | "patterns";
}

export function judgeTier(likelihood: number): Tier {
  if (likelihood >= 0.7) return "red";
  if (likelihood >= 0.35) return "yellow";
  return "green";
}

/**
 * The LLM judge is the primary analysis engine: when it returns a result, its
 * tier is the verdict outright. Heuristics run locally on every post and
 * annotate the report with offset-level flags; they also stand in as the
 * tier when no model is configured (or when the post abstains, which the
 * judge is never allowed to override). See ADR 0001 and ADR 0005.
 */
export function combine(heuristic: HeuristicScore, judge: JudgeResult | null): Verdict {
  if (heuristic.abstain) return { tier: null, abstain: heuristic.abstain, heuristic, basis: "patterns" };
  if (!judge) return { tier: heuristic.tier, heuristic, basis: "patterns" };
  const likelihood = clamp01(judge.likelihood);
  const tier = judgeTier(likelihood);
  return { tier, heuristic, judgeTier: tier, likelihood, basis: "model" };
}
