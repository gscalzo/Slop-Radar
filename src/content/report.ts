import type { Flag } from "../core/types";
import { locateQuote } from "../core/locate";
import type { JudgeResult } from "../judge/types";
import type { Verdict } from "../verdict";
import type { HighlightSpan, ReportItem, ReportViewModel } from "./modal";

function judgeItems(text: string, judge: JudgeResult | null): ReportItem[] {
  if (!judge) return [];
  return judge.phrases.map((phrase) => {
    const span = locateQuote(text, phrase.quote);
    return { label: phrase.reason, excerpt: phrase.quote, start: span?.start ?? null, source: "judge" as const };
  });
}

function toSpans(text: string, flags: Flag[], judge: JudgeResult | null): HighlightSpan[] {
  const heuristic = flags.map((f) => ({ start: f.start, end: f.end, label: f.label }));
  const located = (judge?.phrases ?? [])
    .map((phrase) => ({ span: locateQuote(text, phrase.quote), label: phrase.reason }))
    .filter((p): p is { span: { start: number; end: number }; label: string } => p.span !== null)
    .map((p) => ({ start: p.span.start, end: p.span.end, label: `Model: ${p.label}` }));
  return [...heuristic, ...located].sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Assemble everything the report modal needs for one post. */
export function buildReport(
  text: string,
  flags: Flag[],
  verdict: Verdict,
  judge: JudgeResult | null,
  truncated: boolean,
): ReportViewModel {
  const patternItems: ReportItem[] = flags.map((f) => ({
    label: f.label,
    excerpt: f.excerpt,
    start: f.start,
    source: "pattern" as const,
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
    spans: toSpans(text, flags, judge),
    items: [...patternItems, ...judgeItems(text, judge)],
  };
}
