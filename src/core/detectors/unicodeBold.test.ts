import { describe, expect, it } from "vitest";
import { unicodeBold } from "./unicodeBold";

describe("unicodeBold", () => {
  it("flags a run of mathematical-bold characters", () => {
    const flags = unicodeBold("𝗧𝗵𝗲 𝗿𝗲𝗮𝗹 𝘀𝗲𝗰𝗿𝗲𝘁 to growth:");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.start).toBe(0);
    expect(flags[0]!.weight).toBe(2);
  });

  it("flags separate runs separately", () => {
    const flags = unicodeBold("𝗢𝗻𝗲 normal text between 𝗧𝘄𝗼");
    expect(flags).toHaveLength(2);
  });

  it("ignores plain text", () => {
    expect(unicodeBold("Just a normal sentence.")).toHaveLength(0);
  });
});
