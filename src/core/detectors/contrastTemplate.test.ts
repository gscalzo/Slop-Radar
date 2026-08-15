import { describe, expect, it } from "vitest";
import { contrastTemplate } from "./contrastTemplate";

describe("contrastTemplate", () => {
  it("flags “it's not X, it's Y”", () => {
    const flags = contrastTemplate("It's not about the money, it's about freedom.");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.weight).toBe(3);
  });

  it("flags “not just X — but Y”", () => {
    expect(contrastTemplate("Not just a tool — but a mindset shift.")).toHaveLength(1);
  });

  it("flags “this isn't about X. It's about Y” across a sentence break", () => {
    expect(contrastTemplate("This isn't about hustle. It's about leverage.")).toHaveLength(1);
  });

  it("leaves plain negation alone", () => {
    expect(contrastTemplate("I did not enjoy the conference this year.")).toHaveLength(0);
  });
});
