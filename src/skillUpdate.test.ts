import { describe, expect, it, vi } from "vitest";
import { SkillUpdateError, fetchLatestSkill } from "./skillUpdate";

describe("fetchLatestSkill", () => {
  it("returns the exact text for a plausible skill document", async () => {
    const filler =
      "The humanizer skill teaches the judge to identify common clichés and trite phrases. " +
      "It focuses on flagging overused vocabulary, stock phrases, and formulaic expressions. " +
      "The humanizer skill analyzes writing patterns and suggests improvements. " +
      "It helps writers avoid humanizer errors by checking against known patterns. " +
      "Apply humanizer rules consistently across all documents. ".repeat(3);
    const skillText = `---
name: humanizer
description: Flag clichés and trite phrases
---

# Humanizer Skill

${filler}`;

    const fetchFn = vi.fn(
      async () => new Response(skillText, { status: 200 }),
    );

    const result = await fetchLatestSkill(fetchFn);

    expect(result).toBe(skillText);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md",
    );
  });

  it("rejects HTTP 404 with error message", async () => {
    const fetchFn = vi.fn(async () => new Response("Not Found", { status: 404 }));

    await expect(fetchLatestSkill(fetchFn)).rejects.toThrow(
      new SkillUpdateError("skill download failed: HTTP 404"),
    );
  });

  it("rejects an HTML error page", async () => {
    const htmlError = "<!doctype html><html><body>404 Not Found</body></html>";
    const fetchFn = vi.fn(async () => new Response(htmlError, { status: 200 }));

    await expect(fetchLatestSkill(fetchFn)).rejects.toThrow(
      new SkillUpdateError("downloaded file does not look like the humanizer skill"),
    );
  });

  it("rejects a too-short response", async () => {
    const tooShort = "# Humanizer\nThis is too short";
    const fetchFn = vi.fn(async () => new Response(tooShort, { status: 200 }));

    await expect(fetchLatestSkill(fetchFn)).rejects.toThrow(
      new SkillUpdateError("downloaded file does not look like the humanizer skill"),
    );
  });

  it("rejects text missing humanizer keyword", async () => {
    const noKeyword =
      "---\nname: other\n---\n" +
      "This is a long skill document that meets the 500 character minimum but does not ".repeat(
        10,
      ) +
      "mention the required keyword";
    const fetchFn = vi.fn(async () => new Response(noKeyword, { status: 200 }));

    await expect(fetchLatestSkill(fetchFn)).rejects.toThrow(
      new SkillUpdateError("downloaded file does not look like the humanizer skill"),
    );
  });

  it("rejects text with wrong header format", async () => {
    const wrongHeader =
      "HUMANIZER SKILL\n" +
      "This is a skill document that is definitely long enough and mentions humanizer multiple times. ".repeat(
        10,
      );
    const fetchFn = vi.fn(async () => new Response(wrongHeader, { status: 200 }));

    await expect(fetchLatestSkill(fetchFn)).rejects.toThrow(
      new SkillUpdateError("downloaded file does not look like the humanizer skill"),
    );
  });
});
