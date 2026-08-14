import type { Detector } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "staccato";

// Three or more consecutive one-word "sentences": "Growth. Grit. Gratitude."
// Words must be at least two characters so abbreviations like "U.S.A." don't fire.
const RUN = /(?:\b[\w''-]{2,}[.!]\s+){2,}\b[\w''-]{2,}[.!]/g;

/** Staccato one-word sentence runs — a percussion pattern LLM copy loves. */
export const staccato: Detector = (text) =>
  regexFlags(text, RUN, ID, "Staccato one-word sentence run", 2);
