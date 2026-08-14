import { describe, expect, it } from "vitest";
import { locateQuote } from "./locate";

describe("locateQuote", () => {
  const text = "Growth is not a race. It's a Marathon.";

  it("finds an exact quote", () => {
    expect(locateQuote(text, "not a race")).toEqual({ start: 10, end: 20 });
  });

  it("falls back to case-insensitive matching", () => {
    expect(locateQuote(text, "it's a marathon")).toEqual({ start: 22, end: 37 });
  });

  it("returns null instead of misaligned offsets when lowercasing changes lengths", () => {
    // "İ" lowercases to two code units, which would shift every later offset.
    const tricky = "İstanbul thoughts. It's a Marathon.";
    expect(locateQuote(tricky, "it's a marathon")).toBeNull();
  });

  it("returns null when the quote is absent", () => {
    expect(locateQuote(text, "sprint")).toBeNull();
  });

  it("returns null for an empty quote", () => {
    expect(locateQuote(text, "")).toBeNull();
  });
});
