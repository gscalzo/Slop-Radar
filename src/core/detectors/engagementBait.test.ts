import { describe, expect, it } from "vitest";
import { engagementBait } from "./engagementBait";

describe("engagementBait", () => {
  it("flags a closing 'Agree?'", () => {
    const flags = engagementBait("Hard work beats talent.\n\nAgree?");
    expect(flags).toHaveLength(1);
    expect(flags[0]!.label).toBe("Engagement-bait closer");
  });

  it("flags the repost emoji", () => {
    expect(engagementBait("Great insight.\n\n♻️ Repost this to help someone.")).toHaveLength(2);
  });

  it("ignores bait phrasing far from the end", () => {
    const body = "Do you agree? ".padEnd(600, "Later we discuss details. ");
    expect(engagementBait(body)).toHaveLength(0);
  });
});
