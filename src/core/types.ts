/** A single detected writing tell, anchored to character offsets in the post text. */
export interface Flag {
  /** Machine id of the detector that produced this flag, e.g. "em-dash". */
  detector: string;
  /** Human-readable label shown in the report modal. */
  label: string;
  /** Start offset (inclusive) in the analysed text. */
  start: number;
  /** End offset (exclusive) in the analysed text. */
  end: number;
  /** The matched text. */
  excerpt: string;
  /** Contribution to the density score. */
  weight: number;
}

export type Detector = (text: string) => Flag[];

export type Tier = "green" | "yellow" | "red";

export type AbstainReason = "too-short" | "non-latin";

export interface HeuristicScore {
  words: number;
  totalWeight: number;
  /** Flag weight per 100 words. */
  density: number;
  tier: Tier;
  abstain?: AbstainReason;
}
