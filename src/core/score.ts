import type { AbstainReason, Flag, HeuristicScore, Tier } from "./types";

const MIN_WORDS = 40;
const YELLOW_AT = 3;
const RED_AT = 7;
const MIN_LATIN_SHARE = 0.5;

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function latinShare(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 1;
  const latin = text.match(/\p{Script=Latin}/gu) ?? [];
  return latin.length / letters.length;
}

function tierFor(density: number): Tier {
  if (density >= RED_AT) return "red";
  if (density >= YELLOW_AT) return "yellow";
  return "green";
}

function abstainReason(text: string, words: number, minWords: number): AbstainReason | undefined {
  if (words < minWords) return "too-short";
  if (latinShare(text) < MIN_LATIN_SHARE) return "non-latin";
  return undefined;
}

/**
 * Density scoring: flag weight per 100 words. The tiers deliberately measure
 * "AI-typical pattern density", never authorship — see ADR 0001.
 * Abstains on text shorter than options.minWords (default: 40) or mostly non-Latin.
 */
export function scoreText(text: string, flags: Flag[], options?: { minWords?: number }): HeuristicScore {
  const minWords = options?.minWords ?? MIN_WORDS;
  const words = countWords(text);
  const totalWeight = flags.reduce((sum, flag) => sum + flag.weight, 0);
  const density = words === 0 ? 0 : Math.round((totalWeight / words) * 1000) / 10;
  return { words, totalWeight, density, tier: tierFor(density), abstain: abstainReason(text, words, minWords) };
}
