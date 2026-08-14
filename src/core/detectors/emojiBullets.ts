import type { Detector, Flag } from "../types";
import { findRuns, splitLines, type Line, type Run } from "./lines";

const ID = "emoji-bullets";
const BULLET = /^\s{0,3}\p{Extended_Pictographic}/u;
const MIN_LINES = 3;

function toFlag(lines: Line[], run: Run): Flag {
  const first = lines[run.from] as Line;
  const last = lines[run.to] as Line;
  const count = run.to - run.from + 1;
  const excerpt = lines
    .slice(run.from, run.to + 1)
    .map((l) => l.line.trim())
    .join(" / ");
  return {
    detector: ID,
    label: `Emoji bullet list (${count} lines)`,
    start: first.start,
    end: last.start + last.line.length,
    excerpt: excerpt.length > 80 ? `${excerpt.slice(0, 79)}…` : excerpt,
    weight: 2,
  };
}

/** Three or more consecutive lines that open with an emoji — the LLM listicle. */
export const emojiBullets: Detector = (text) => {
  const lines = splitLines(text);
  return findRuns(lines.map((l) => BULLET.test(l.line)))
    .filter((run) => run.to - run.from + 1 >= MIN_LINES)
    .map((run) => toFlag(lines, run));
};
