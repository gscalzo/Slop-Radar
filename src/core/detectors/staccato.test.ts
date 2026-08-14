import { describe, expect, it } from "vitest";
import { staccato } from "./staccato";

describe("staccato", () => {
  it("flags three one-word sentences in a row", () => {
    const flags = staccato("My mantra: Growth. Grit. Gratitude.");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.excerpt).toBe("Growth. Grit. Gratitude.");
  });

  it("flags runs across line breaks", () => {
    expect(staccato("Focus.\nShip.\nRepeat.")).toHaveLength(1);
  });

  it("ignores two one-word sentences", () => {
    expect(staccato("Focus. Ship. And then iterate on what you learn.")).toHaveLength(0);
  });

  it("ignores dotted abbreviations", () => {
    expect(staccato("The U.S.A. team arrived early.")).toHaveLength(0);
  });

  it("ignores normal prose", () => {
    expect(staccato("We shipped the feature. It went well. Users liked it.")).toHaveLength(0);
  });
});
