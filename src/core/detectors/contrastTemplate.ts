import type { Detector, Flag } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "contrast-template";
const LABEL = "Contrast template (“not X — it's Y”)";
const WEIGHT = 3;

const PATTERNS: RegExp[] = [
  /\bit'?s not (?:just |only |about )?[^.!?\n]{2,60}?[—–,;.-]\s*it'?s\b[^.!?\n]{0,60}/gi,
  /\bnot (?:just|only) [^.!?\n]{2,60}?\s*[—–,;-]\s*but\b[^.!?\n]{0,60}/gi,
  /\bisn'?t (?:just |only |about )[^.!?\n]{2,60}?[—–,;.-]\s*it'?s\b[^.!?\n]{0,60}/gi,
  /\bthis (?:isn'?t|is not) about [^.!?\n]{2,60}?\.\s*it'?s about\b[^.!?\n]{0,60}/gi,
];

// One contrast sentence can match several patterns; count it once.
function dropOverlaps(flags: Flag[]): Flag[] {
  const sorted = [...flags].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Flag[] = [];
  for (const flag of sorted) {
    const last = kept[kept.length - 1];
    if (!last || flag.start >= last.end) kept.push(flag);
  }
  return kept;
}

/** The signature AI contrast construction: "It's not X, it's Y." */
export const contrastTemplate: Detector = (text) =>
  dropOverlaps(PATTERNS.flatMap((re) => regexFlags(text, re, ID, LABEL, WEIGHT)));
