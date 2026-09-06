import type { RubricSource } from "./config";
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
 * Boundaries measured, not guessed — each rubric source keeps the red boundary
 * its own evaluation produced (`npm run eval`; ADR 0012, ADR 0013, ADR 0014).
 * The rule is the same in both cases: red must cost no human sample a red
 * border, so red sits just above the highest-scoring human — the formulaic
 * 2013 Stack Exchange answer both rubrics rank at the top. It reaches 0.64
 * under ai-writing-patterns (red: 0.7) and 0.58 under humanizer (red: 0.6).
 *
 * Yellow is 0.35 for both: the next-highest human sits well below it, so 0.35
 * flags only that one formulaic outlier. Telling someone their own writing
 * reads as machine-made is the expensive mistake, so the boundary stays where
 * false positives are rarest.
 */
const RED_AT: Record<RubricSource, number> = { "ai-writing-patterns": 0.7, humanizer: 0.6 };

export function judgeTier(likelihood: number, source: RubricSource): Tier {
  if (likelihood >= RED_AT[source]) return "red";
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
export function combine(
  heuristic: HeuristicScore,
  judge: JudgeResult | null,
  source: RubricSource,
): Verdict {
  if (heuristic.abstain) return { tier: null, abstain: heuristic.abstain, heuristic, basis: "patterns" };
  if (!judge) return { tier: heuristic.tier, heuristic, basis: "patterns" };
  const likelihood = clamp01(judge.likelihood);
  const tier = judgeTier(likelihood, source);
  return { tier, heuristic, judgeTier: tier, likelihood, basis: "model" };
}
