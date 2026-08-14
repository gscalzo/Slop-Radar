import type { Detector } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "ai-vocabulary";

interface LexiconEntry {
  re: RegExp;
  label: string;
  weight: number;
}

/** Stock phrasing heavily over-represented in LLM output. Weights reflect specificity. */
const LEXICON: LexiconEntry[] = [
  { re: /\bdelv(?:e|es|ed|ing)\b/gi, label: "Stock AI phrase: “delve”", weight: 2 },
  { re: /\btapestry\b/gi, label: "Stock AI phrase: “tapestry”", weight: 2 },
  { re: /\btestament to\b/gi, label: "Stock AI phrase: “testament to”", weight: 2 },
  { re: /\bgame.?changer\b/gi, label: "Stock AI phrase: “game-changer”", weight: 2 },
  { re: /\bin today'?s (?:fast-paced|ever-changing|ever-evolving|digital) world\b/gi, label: "Stock AI opener: “in today's … world”", weight: 3 },
  { re: /\bever-evolving\b/gi, label: "Stock AI phrase: “ever-evolving”", weight: 2 },
  { re: /\bnavigat\w* the (?:complex )?landscape\b/gi, label: "Stock AI phrase: “navigating the landscape”", weight: 2 },
  { re: /\bthe landscape of\b/gi, label: "Stock AI phrase: “the landscape of”", weight: 1 },
  { re: /\bseamless(?:ly)?\b/gi, label: "Stock AI phrase: “seamless”", weight: 1 },
  { re: /\bharness(?:ing)? the power\b/gi, label: "Stock AI phrase: “harness the power”", weight: 2 },
  { re: /\bunlock(?:ing)? (?:the|your|new)\b/gi, label: "Stock AI phrase: “unlock the/your”", weight: 1 },
  { re: /\brevolutioniz\w+\b/gi, label: "Stock AI phrase: “revolutionize”", weight: 1 },
  { re: /\btransformative\b/gi, label: "Stock AI phrase: “transformative”", weight: 1 },
  { re: /\belevate your\b/gi, label: "Stock AI phrase: “elevate your”", weight: 2 },
  { re: /\bdouble-edged sword\b/gi, label: "Stock AI phrase: “double-edged sword”", weight: 2 },
  { re: /\bgone are the days\b/gi, label: "Stock AI opener: “gone are the days”", weight: 2 },
  { re: /\btreasure trove\b/gi, label: "Stock AI phrase: “treasure trove”", weight: 2 },
];

export const aiVocabulary: Detector = (text) =>
  LEXICON.flatMap((entry) => regexFlags(text, entry.re, ID, entry.label, entry.weight));
