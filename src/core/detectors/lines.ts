/** Line-splitting helpers shared by line-oriented detectors. */

export interface Line {
  line: string;
  start: number;
}

export function splitLines(text: string): Line[] {
  const out: Line[] = [];
  let start = 0;
  for (const line of text.split("\n")) {
    out.push({ line, start });
    start += line.length + 1;
  }
  return out;
}

export interface Run {
  from: number;
  to: number;
}

/** Contiguous runs of `true` in a boolean sequence, as inclusive index ranges. */
export function findRuns(matches: boolean[]): Run[] {
  const runs: Run[] = [];
  let from = -1;
  matches.forEach((matched, i) => {
    if (matched && from < 0) from = i;
    if (!matched && from >= 0) {
      runs.push({ from, to: i - 1 });
      from = -1;
    }
  });
  if (from >= 0) runs.push({ from, to: matches.length - 1 });
  return runs;
}
