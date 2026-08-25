import { describe, expect, it, vi } from "vitest";
import { SkillUpdateError, fetchLatestSkill } from "./skillUpdate";

function rejection(source: string): SkillUpdateError {
  return new SkillUpdateError(`downloaded file does not look like the ${source} skill`);
}

describe("fetchLatestSkill", () => {
  it("returns the exact text for a plausible ai-writing-patterns catalog", async () => {
    const filler =
      "The ai-writing-patterns catalog names the tells that mark prose as AI-generated. " +
      "It covers vocabulary, rhetoric, tone, structure, formatting, and fingerprints. " +
      "Each pattern carries a stable number and a signal tier. " +
      "Judge clusters, not isolated tells, and weigh the tiers. ".repeat(4);
    const skillText = `---
name: ai-writing-patterns
description: Catalog of the tells that mark prose as AI-generated
---

# AI writing patterns

${filler}`;

    const fetchFn = vi.fn(
      async () => new Response(skillText, { status: 200 }),
    );

    const result = await fetchLatestSkill("ai-writing-patterns", fetchFn);

    expect(result).toBe(skillText);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/gscalzo/gio-skills/main/skills/ai-writing-patterns/SKILL.md",
    );
  });

  it("fetches the humanizer skill from its own upstream and validates its marker", async () => {
    const skillText =
      "---\nname: humanizer\n---\n\n# Humanizer Skill\n\n" +
      "The humanizer skill flags overused vocabulary, stock phrases, and formulaic expressions. ".repeat(
        8,
      );
    const fetchFn = vi.fn(async () => new Response(skillText, { status: 200 }));

    const result = await fetchLatestSkill("humanizer", fetchFn);

    expect(result).toBe(skillText);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md",
    );
  });

  it("rejects HTTP 404 with error message", async () => {
    const fetchFn = vi.fn(async () => new Response("Not Found", { status: 404 }));

    await expect(fetchLatestSkill("ai-writing-patterns", fetchFn)).rejects.toThrow(
      new SkillUpdateError("skill download failed: HTTP 404"),
    );
  });

  it("rejects an HTML error page", async () => {
    const htmlError = "<!doctype html><html><body>404 Not Found</body></html>";
    const fetchFn = vi.fn(async () => new Response(htmlError, { status: 200 }));

    await expect(fetchLatestSkill("ai-writing-patterns", fetchFn)).rejects.toThrow(
      rejection("ai-writing-patterns"),
    );
  });

  it("rejects a too-short response", async () => {
    const tooShort = "# AI writing patterns\nThis is too short";
    const fetchFn = vi.fn(async () => new Response(tooShort, { status: 200 }));

    await expect(fetchLatestSkill("ai-writing-patterns", fetchFn)).rejects.toThrow(
      rejection("ai-writing-patterns"),
    );
  });

  it("rejects text missing the selected source's marker", async () => {
    const humanizerText =
      "---\nname: humanizer\n---\n\n# Humanizer Skill\n\n" +
      "The humanizer skill flags overused vocabulary and stock phrases. ".repeat(10);
    const fetchFn = vi.fn(async () => new Response(humanizerText, { status: 200 }));

    // A valid humanizer document is not a valid ai-writing-patterns catalog.
    await expect(fetchLatestSkill("ai-writing-patterns", fetchFn)).rejects.toThrow(
      rejection("ai-writing-patterns"),
    );
  });

  it("rejects text with wrong header format", async () => {
    const wrongHeader =
      "AI WRITING PATTERNS\n" +
      "This document is definitely long enough and mentions ai-writing-patterns often. ".repeat(
        10,
      );
    const fetchFn = vi.fn(async () => new Response(wrongHeader, { status: 200 }));

    await expect(fetchLatestSkill("ai-writing-patterns", fetchFn)).rejects.toThrow(
      rejection("ai-writing-patterns"),
    );
  });
});
