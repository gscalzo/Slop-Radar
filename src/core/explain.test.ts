import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { explain } from "./explain";

const EVERY_DETECTOR = [
  "em-dash",
  "contrast-template",
  "ai-vocabulary",
  "emoji-bullets",
  "unicode-bold",
  "engagement-bait",
  "staccato",
];

describe("explain", () => {
  it("has a note for every detector", () => {
    for (const detector of EVERY_DETECTOR) {
      const note = explain(detector);
      expect(note.title).not.toBe("Pattern");
      expect(note.why.length).toBeGreaterThan(40);
    }
  });

  it("falls back rather than throwing for an unknown detector", () => {
    expect(explain("invented-later").title).toBe("Pattern");
  });

  // The point of the notes is that a detector cannot ship without one; this
  // catches a new detector added to analyze() and forgotten here.
  it("covers every detector the analyser can actually emit", () => {
    const text = [
      "Let's delve into the tapestry — it's not just growth, it's transformation.",
      "🚀 One line",
      "💡 Two lines",
      "🔥 Three lines",
      "𝗕𝗼𝗹𝗱 𝗵𝗲𝗮𝗱𝗲𝗿",
      "Growth. Grit. Gratitude.",
      "Agree? Thoughts?",
    ].join("\n");
    const emitted = new Set(analyze(text).map((flag) => flag.detector));

    expect(emitted.size).toBeGreaterThan(4);
    for (const detector of emitted) expect(explain(detector).title).not.toBe("Pattern");
  });
});
