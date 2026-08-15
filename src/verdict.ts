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

/*
 * Boundaries measured, not guessed — see ADR 0012 and `npm run eval`.
 *
 * Red was 0.7. Across 104 posts the highest-scoring human sample reached 0.58,
 * so moving red to 0.6 costs no human a red border while moving a third more
 * of the obviously-patterned posts out of yellow, where they were understating
 * what they are.
 *
 * Yellow stays at 0.35: every candidate between 0.125 and 0.30 produced the
 * same total error, trading fewer misses for more humans flagged. That trade
 * is not neutral here — telling someone their own writing reads as machine-made
 * is the expensive mistake — so the boundary stays where false positives are
 * rarest.
 */
export function judgeTier(likelihood: number): Tier {
  if (likelihood >= 0.6) return "red";
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
