import type { Flag } from "../core/types";
import { locateQuote } from "../core/locate";
import type { JudgeResult } from "../judge/types";
import type { Verdict } from "../verdict";
import type { HighlightSpan, ReportItem, ReportViewModel } from "./modal";

function judgeItems(text: string, judge: JudgeResult | null): ReportItem[] {
  return (judge?.phrases ?? []).map((phrase) => ({
    label: phrase.reason,
    excerpt: phrase.quote,
    start: locateQuote(text, phrase.quote)?.start ?? null,
    source: "judge" as const,
  }));
}

// Quotes the judge invented, or that the post no longer contains, simply drop out.
function judgeSpans(text: string, judge: JudgeResult | null): HighlightSpan[] {
  return (judge?.phrases ?? []).flatMap((phrase) => {
    const span = locateQuote(text, phrase.quote);
    return span ? [{ ...span, label: `Model: ${phrase.reason}` }] : [];
  });
}

/** Assemble everything the report modal needs for one post. */
export function buildReport(
  text: string,
  flags: Flag[],
  verdict: Verdict,
  judge: JudgeResult | null,
  truncated: boolean,
): ReportViewModel {
  const patternSpans = flags.map((f) => ({ start: f.start, end: f.end, label: f.label }));
  const patternItems = flags.map((f) => ({
    label: f.label,
    excerpt: f.excerpt,
    start: f.start,
    source: "pattern" as const,
    detector: f.detector, // groups the report and selects the explanation
  }));
  return {
    tier: verdict.tier,
    abstain: verdict.abstain,
    partial: truncated,
    density: verdict.heuristic.density,
    words: verdict.heuristic.words,
    likelihood: verdict.likelihood,
    judgeSummary: judge?.summary,
    text,
    spans: [...patternSpans, ...judgeSpans(text, judge)].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    ),
    items: [...patternItems, ...judgeItems(text, judge)],
  };
}
