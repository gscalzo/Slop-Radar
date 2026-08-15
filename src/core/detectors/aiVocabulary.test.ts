import { describe, expect, it } from "vitest";
import { aiVocabulary } from "./aiVocabulary";

describe("aiVocabulary", () => {
  it("flags lexicon words with word boundaries", () => {
    const flags = aiVocabulary("Let's delve into the tapestry of modern work.");
    expect(flags.map((f) => f.excerpt.toLowerCase())).toEqual(["delve", "tapestry"]);
  });

  it("weights strong openers higher", () => {
    const flags = aiVocabulary("In today's fast-paced world, everything changes.");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.weight).toBe(3);
  });

  it("does not flag substrings inside other words", () => {
    // "delve" must not fire inside e.g. a name like "Adelved" (word boundary check)
    expect(aiVocabulary("Delvers guild meeting tonight")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    expect(aiVocabulary("A GAME-CHANGER for the industry")).toHaveLength(1);
  });
});
