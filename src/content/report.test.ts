import { describe, expect, it } from "vitest";
import { analyze } from "../core/analyze";
import { scoreText } from "../core/score";
import { combine } from "../verdict";
import { buildReport } from "./report";

const TEXT =
  "Let's delve into growth — because growth is what we all want from our careers, " +
  "our teams, and the products we build together every single day at work.";

describe("buildReport", () => {
  const flags = analyze(TEXT);
  const heuristic = scoreText(TEXT, flags);

  it("builds a heuristics-only report", () => {
    const verdict = combine(heuristic, null);
    const vm = buildReport(TEXT, flags, verdict, null, false);
    expect(vm.tier).toBe(verdict.tier);
    expect(vm.items.every((i) => i.source === "pattern")).toBe(true);
    expect(vm.spans.length).toBe(flags.length);
    expect(vm.likelihood).toBeUndefined();
  });

  it("merges located judge quotes into spans and items", () => {
    const judge = {
      likelihood: 0.9,
      summary: "Formulaic contrast and stock vocabulary.",
      phrases: [
        { quote: "delve into growth", reason: "stock phrasing" },
        { quote: "never in the text", reason: "hallucinated" },
      ],
    };
    const vm = buildReport(TEXT, flags, combine(heuristic, judge), judge, true);
    expect(vm.partial).toBe(true);
    expect(vm.judgeSummary).toBe("Formulaic contrast and stock vocabulary.");
    const judgeSpans = vm.spans.filter((s) => s.label.startsWith("Model:"));
    expect(judgeSpans).toHaveLength(1);
    const unlocated = vm.items.find((i) => i.excerpt === "never in the text");
    expect(unlocated?.start).toBeNull();
    const starts = vm.spans.map((s) => s.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});
