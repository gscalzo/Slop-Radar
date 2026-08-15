import { describe, expect, it } from "vitest";
import { scoreText } from "./score";
import type { Flag } from "./types";

function flag(weight: number): Flag {
  return { detector: "x", label: "x", start: 0, end: 1, excerpt: "x", weight };
}

const FIFTY_WORDS = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
const TWENTYFIVE_WORDS = Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ");

describe("scoreText", () => {
  it("computes density per 100 words", () => {
    const score = scoreText(FIFTY_WORDS, [flag(2), flag(1)]);
    expect(score.words).toBe(50);
    expect(score.totalWeight).toBe(3);
    expect(score.density).toBe(6);
  });

  it("maps density to tiers: green < 3 ≤ yellow < 7 ≤ red", () => {
    expect(scoreText(FIFTY_WORDS, [flag(1)]).tier).toBe("green");
    expect(scoreText(FIFTY_WORDS, [flag(2)]).tier).toBe("yellow");
    expect(scoreText(FIFTY_WORDS, [flag(4)]).tier).toBe("red");
  });

  it("abstains on posts under 40 words", () => {
    const score = scoreText("Short post.", []);
    expect(score.abstain).toBe("too-short");
  });

  it("abstains on mostly non-Latin text", () => {
    const cyrillic = Array.from({ length: 45 }, () => "слово").join(" ");
    expect(scoreText(cyrillic, []).abstain).toBe("non-latin");
  });

  it("does not abstain on long Latin text", () => {
    expect(scoreText(FIFTY_WORDS, []).abstain).toBeUndefined();
  });

  it("handles empty text without dividing by zero", () => {
    const score = scoreText("", []);
    expect(score.density).toBe(0);
    expect(score.abstain).toBe("too-short");
  });

  it("abstains on ~25-word text by default but not with minWords: 20", () => {
    expect(scoreText(TWENTYFIVE_WORDS, []).abstain).toBe("too-short");
    expect(scoreText(TWENTYFIVE_WORDS, [], { minWords: 20 }).abstain).toBeUndefined();
  });
});
