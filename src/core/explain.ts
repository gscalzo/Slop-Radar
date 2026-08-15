/**
 * Why each detected pattern is a tell.
 *
 * The report used to print what was matched ("Em dash") without ever saying
 * why that means anything, which left the reader to guess at the reasoning — or
 * to assume an accusation that is not being made. Every note therefore carries
 * its own limits: most of these patterns are things people write too, and the
 * signal is in the cluster, never the single instance (ADR 0001).
 */

export interface DetectorNote {
  /** The pattern in a phrase, used as a section heading. */
  title: string;
  /** Why it reads as AI — and where it doesn't. */
  why: string;
}

const NOTES: Record<string, DetectorNote> = {
  "em-dash": {
    title: "Em dashes",
    why: "Chat models punctuate with em dashes far more often than most writers do. On its own this means very little — plenty of people write this way — so it only carries weight alongside other tells.",
  },
  "contrast-template": {
    title: "“Not X — it's Y” reversals",
    why: "Setting up a claim only to reverse it is a house style of chat models: it produces the shape of an insight without adding information. One is unremarkable; two or three in a short post is a strong signal.",
  },
  "ai-vocabulary": {
    title: "Stock LLM vocabulary",
    why: "Phrasing that appears far more often in model output than in ordinary writing — “delve”, “tapestry”, “testament to”, “in today's fast-paced world”. Any single one can be coincidence; several together rarely are.",
  },
  "emoji-bullets": {
    title: "Emoji-led list",
    why: "Three or more consecutive lines each opening with an emoji is the shape a model produces when asked for a LinkedIn post. People write lists too, but rarely with decoration this regular.",
  },
  "unicode-bold": {
    title: "Unicode pseudo-bold",
    why: "Mathematical Alphanumeric characters (𝗹𝗶𝗸𝗲 𝘁𝗵𝗶𝘀) standing in for bold, because the composer offers no formatting. It marks a post engineered for the feed — often, though not always, with help.",
  },
  "engagement-bait": {
    title: "Engagement-bait closer",
    why: "“Agree?”, “Thoughts?”, “Let that sink in”, “♻️ Repost this” — endings that ask for interaction instead of saying something. Counted only near the end of a post, where the ask actually lands.",
  },
  staccato: {
    title: "Staccato one-word sentences",
    why: "“Growth. Grit. Gratitude.” Percussive fragments are a rhythm models fall into when asked to sound punchy, and one people reach for far less often than the feed suggests.",
  },
};

const FALLBACK: DetectorNote = {
  title: "Pattern",
  why: "A writing pattern over-represented in model output.",
};

export function explain(detector: string): DetectorNote {
  return NOTES[detector] ?? FALLBACK;
}
