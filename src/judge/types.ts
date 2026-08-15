/** A phrase the judge model quoted from the post, with its reasoning. */
export interface JudgePhrase {
  /** Exact substring of the post (located to offsets by core/locate). */
  quote: string;
  reason: string;
}

export interface JudgeResult {
  /** 0..1 — how strongly the post reads as AI-patterned. */
  likelihood: number;
  summary?: string;
  phrases: JudgePhrase[];
}

export interface Judge {
  judge(text: string): Promise<JudgeResult>;
}
