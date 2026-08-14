import type { Flag } from "./types";

/** Turn every match of a global regex into a Flag. */
export function regexFlags(
  text: string,
  re: RegExp,
  detector: string,
  label: string,
  weight: number,
): Flag[] {
  const flags: Flag[] = [];
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    flags.push({ detector, label, start, end: start + m[0].length, excerpt: m[0], weight });
  }
  return flags;
}
