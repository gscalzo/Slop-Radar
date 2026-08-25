import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_BODIES, buildSystemPrompt, defaultRubric, type RubricConfig } from "./prompt";

function config(overrides: Partial<RubricConfig> = {}): RubricConfig {
  return {
    skillText: "",
    distilledSkill: "",
    distilledSource: "",
    rubricSource: "ai-writing-patterns",
    ...overrides,
  };
}

describe("DEFAULT_SKILL_BODIES", () => {
  it("are the bundled distilled rubrics with their frontmatter stripped", () => {
    for (const body of Object.values(DEFAULT_SKILL_BODIES)) {
      expect(body).toMatch(/em dash/i);
      expect(body).toMatch(/rule of three/i);
      expect(body).toMatch(/clusters/i);
      expect(body.startsWith("---")).toBe(false);
      expect(body).not.toContain("name: ");
    }
  });

  it("ai-writing-patterns is a distillation keeping tiers and stable numbers", () => {
    const body = DEFAULT_SKILL_BODIES["ai-writing-patterns"];
    // The catalog's per-pattern Fix advice must not leak into the rubric.
    expect(body).not.toContain("**Fix:**");
    expect(body).not.toContain("Sources and lineage");
    expect(body).toMatch(/fingerprint/i);
    expect(body).toContain("✱");
    expect(body).toMatch(/burstiness/i);
    // Compactness bound: the 58-pattern rubric costs ~2.6k tokens per post,
    // well under the ~5k of the raw catalog (ADR 0009, ADR 0013).
    expect(body.length).toBeLessThan(12000);
  });

  it("humanizer is a distillation, not the full rewriting skill", () => {
    const body = DEFAULT_SKILL_BODIES.humanizer;
    expect(body).not.toContain("Invocation Modes");
    expect(body).not.toContain("final rewrite");
    expect(body.length).toBeLessThan(8000);
  });
});

describe("defaultRubric", () => {
  it("falls back to the source's bundled snapshot when nothing was distilled", () => {
    expect(defaultRubric("ai-writing-patterns", "", "")).toBe(
      DEFAULT_SKILL_BODIES["ai-writing-patterns"],
    );
    expect(defaultRubric("humanizer", "", "")).toBe(DEFAULT_SKILL_BODIES.humanizer);
  });

  it("prefers a runtime-distilled copy from the same source, stripping its frontmatter", () => {
    expect(
      defaultRubric("ai-writing-patterns", "---\nname: x\n---\nFresh distilled rubric.", "ai-writing-patterns"),
    ).toBe("Fresh distilled rubric.");
  });

  it("ignores a distillation that came from the other source", () => {
    expect(defaultRubric("humanizer", "Distilled from the catalog.", "ai-writing-patterns")).toBe(
      DEFAULT_SKILL_BODIES.humanizer,
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

  it("each source gets its own preamble and bundled rubric", () => {
    const catalog = buildSystemPrompt(config());
    expect(catalog).toContain("ai-writing-patterns catalogue");
    expect(catalog).toContain("Patterns are tiered");
    expect(catalog).toMatch(/burstiness/i);
    const humanizer = buildSystemPrompt(config({ rubricSource: "humanizer" }));
    expect(humanizer).toContain("the humanizer skill");
    expect(humanizer).not.toContain("Patterns are tiered");
    expect(humanizer).toContain(DEFAULT_SKILL_BODIES.humanizer);
  });

  it("uses the runtime-distilled rubric over the bundled snapshot when sources match", () => {
    const prompt = buildSystemPrompt(
      config({ distilledSkill: "Distilled rubric only.", distilledSource: "ai-writing-patterns" }),
    );
    expect(prompt).toContain("Distilled rubric only.");
    expect(prompt).not.toMatch(/rule of three/i);
  });

  it("ignores a stale distillation from the other source", () => {
    const prompt = buildSystemPrompt(
      config({ distilledSkill: "Distilled rubric only.", distilledSource: "humanizer" }),
    );
    expect(prompt).not.toContain("Distilled rubric only.");
    expect(prompt).toMatch(/rule of three/i);
  });

  it("lets a user override beat both, keeping preamble and contract", () => {
    const prompt = buildSystemPrompt(
      config({
        skillText: "Only flag excessive emojis.",
        distilledSkill: "distilled text",
        distilledSource: "ai-writing-patterns",
      }),
    );
    expect(prompt).toContain("Only flag excessive emojis.");
    expect(prompt).not.toContain("distilled text");
    expect(prompt).toContain("judge, not an editor");
    expect(prompt).toContain('"likelihood"');
  });

  it("treats a whitespace-only override as unset", () => {
    expect(buildSystemPrompt(config({ skillText: "  \n " }))).toBe(buildSystemPrompt(config()));
  });
});
