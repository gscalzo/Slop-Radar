import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";

describe("analyze", () => {
  it("aggregates flags from multiple detectors, sorted by offset", () => {
    const text = "Let's delve into growth — it matters.\n\nAgree?";
    const flags = analyze(text);
    expect(flags.map((f) => f.detector)).toEqual(["ai-vocabulary", "em-dash", "engagement-bait"]);
    const starts = flags.map((f) => f.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  it("returns no flags for unremarkable text", () => {
    expect(analyze("We met the team for coffee and talked about the roadmap.")).toHaveLength(0);
  });

  it("dedupes identical detector/offset pairs", () => {
    const flags = analyze("It's not luck, it's leverage.");
    const keys = flags.map((f) => `${f.detector}:${f.start}:${f.end}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
