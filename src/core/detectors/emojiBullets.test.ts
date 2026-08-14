import { describe, expect, it } from "vitest";
import { emojiBullets } from "./emojiBullets";

describe("emojiBullets", () => {
  it("flags three or more consecutive emoji-led lines as one flag", () => {
    const text = "Big news!\n🚀 We launched\n✅ We shipped\n💡 We learned\nThanks all.";
    const flags = emojiBullets(text);
    expect(flags).toHaveLength(1);
    expect(flags[0]!.label).toBe("Emoji bullet list (3 lines)");
    expect(flags[0]!.start).toBe(text.indexOf("🚀"));
    expect(flags[0]!.end).toBe(text.indexOf("learned") + "learned".length);
  });

  it("ignores two emoji lines", () => {
    expect(emojiBullets("🚀 One\n✅ Two\nplain text")).toHaveLength(0);
  });

  it("ignores emoji mid-line", () => {
    expect(emojiBullets("We launched 🚀 today\nand shipped ✅ it\nthen learned 💡 things")).toHaveLength(0);
  });

  it("handles a bullet run that ends the post", () => {
    const flags = emojiBullets("Intro\n🔥 a\n🔥 b\n🔥 c");
    expect(flags).toHaveLength(1);
  });
});
