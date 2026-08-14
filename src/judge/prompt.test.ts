import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_BODY, buildSystemPrompt, defaultRubric } from "./prompt";

function config(skillText = "", distilledSkill = ""): { skillText: string; distilledSkill: string } {
  return { skillText, distilledSkill };
}

describe("DEFAULT_SKILL_BODY", () => {
  it("is the bundled distilled rubric with its frontmatter stripped", () => {
    expect(DEFAULT_SKILL_BODY).toMatch(/em dash/i);
    expect(DEFAULT_SKILL_BODY).toMatch(/rule of three/i);
    expect(DEFAULT_SKILL_BODY).toMatch(/clusters/i);
    expect(DEFAULT_SKILL_BODY.startsWith("---")).toBe(false);
    expect(DEFAULT_SKILL_BODY).not.toContain("name: humanizer-distilled");
  });

  it("is a distillation, not the full rewriting skill", () => {
    // The full skill's rewriting machinery must not leak into the rubric.
    expect(DEFAULT_SKILL_BODY).not.toContain("Invocation Modes");
    expect(DEFAULT_SKILL_BODY).not.toContain("final rewrite");
    expect(DEFAULT_SKILL_BODY.length).toBeLessThan(8000);
  });
});

describe("defaultRubric", () => {
  it("falls back to the bundled snapshot when nothing was distilled at runtime", () => {
    expect(defaultRubric("")).toBe(DEFAULT_SKILL_BODY);
  });

  it("prefers a runtime-distilled copy, stripping its frontmatter", () => {
    expect(defaultRubric("---\nname: x\n---\nFresh distilled rubric.")).toBe(
      "Fresh distilled rubric.",
    );
  });
});

describe("buildSystemPrompt", () => {
  it("wraps the rubric in the judging preamble and appends the JSON contract", () => {
    const prompt = buildSystemPrompt(config());
    expect(prompt).toContain("judge, not an editor");
    expect(prompt).toMatch(/em dash/i);
    expect(prompt).toContain('"likelihood"');
    expect(prompt).toContain("copied verbatim");
  });

  it("uses the runtime-distilled rubric over the bundled snapshot", () => {
    const prompt = buildSystemPrompt(config("", "Distilled rubric only."));
    expect(prompt).toContain("Distilled rubric only.");
    expect(prompt).not.toMatch(/rule of three/i);
  });

  it("lets a user override beat both, keeping preamble and contract", () => {
    const prompt = buildSystemPrompt(config("Only flag excessive emojis.", "distilled text"));
    expect(prompt).toContain("Only flag excessive emojis.");
    expect(prompt).not.toContain("distilled text");
    expect(prompt).toContain("judge, not an editor");
    expect(prompt).toContain('"likelihood"');
  });

  it("treats a whitespace-only override as unset", () => {
    expect(buildSystemPrompt(config("  \n "))).toBe(buildSystemPrompt(config()));
  });
});
