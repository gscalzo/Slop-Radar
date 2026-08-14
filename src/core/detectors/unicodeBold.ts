import type { Detector } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "unicode-bold";

// Mathematical Alphanumeric Symbols block, abused as "bold"/"italic" styling in
// plain-text posts. Runs may span spaces between styled words.
const BOLD_RUN = /[\u{1D400}-\u{1D7FF}][\u{1D400}-\u{1D7FF} ]*[\u{1D400}-\u{1D7FF}]/gu;

/** Unicode pseudo-bold headers (𝗟𝗶𝗸𝗲 𝘁𝗵𝗶𝘀) — a staple of formula posts. */
export const unicodeBold: Detector = (text) =>
  regexFlags(text, BOLD_RUN, ID, "Unicode bold/italic styling", 2);
