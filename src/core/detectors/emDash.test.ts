import { describe, expect, it } from "vitest";
import { emDash } from "./emDash";

describe("emDash", () => {
  it("flags each em dash with its offset", () => {
    const text = "Growth — real growth — takes time.";
    const flags = emDash(text);
    expect(flags).toHaveLength(2);
    expect(flags[0]).toMatchObject({ detector: "em-dash", start: 7, end: 8, excerpt: "—" });
  });

  it("flags a spaced en dash used as an em dash", () => {
    const flags = emDash("Growth – it takes time.");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.excerpt).toBe(" – ");
  });

  it("ignores hyphens and unspaced en dashes in ranges", () => {
    expect(emDash("A well-known 9–5 job")).toHaveLength(0);
  });
});
