import { describe, it, expect } from "vitest";
import { distillSkill, SkillDistillError, type DistillConfig } from "./skillDistill";

const LONG_INPUT = `# Humanizer Skill

This comprehensive guide teaches you to identify and remove signs of AI-generated writing from text. AI writing exhibits distinctive patterns: overuse of complex transitions, formulaic structures, and patterns that rarely appear in authentic human writing.

## Overview

The humanizer skill provides a detection rubric for AI-generated content. It focuses on practical patterns that distinguish machine-written text from human-written prose. These patterns cluster together — you should look for multiple signals before flagging content, not isolated tells.

## Core Patterns

### Pattern 1: Transition Overuse
- Exact phrases: "Furthermore", "Moreover", "In addition"
- What NOT to flag: These appear in human writing in formal contexts
- Signal: Three or more in a single paragraph is suspicious
- Human writing: Uses varied transitions naturally

### Pattern 2: Formulaic Openings
- Watch for: "It is important to note that", "It cannot be denied that"
- Description: These rigid frames rarely appear in organic writing
- False positives: Legal documents use these legitimately
- Human signal: Varied sentence starts with personal voice

### Pattern 3: Lists and Enumeration
- Phrases: "Firstly", "Secondly", "Finally"
- What to look for: Overly consistent numbering across multiple lists
- Not a tell alone: Single well-structured list is human
- Cluster signal: Multiple numbered lists plus complex transitions

### Pattern 4: Passive Voice Clusters
- Watch: Extended passages with predominantly passive constructions
- Human writing: Mixes active and passive naturally
- False positive: Academic writing legitimately uses passive
- AI pattern: Passive dominates in succession

### Pattern 5: Generic Hedging
- Exact words: "arguably", "could be argued", "one might say"
- Description: Excessive hedging without commitment
- Human writing: Direct statements with occasional caveats
- Signal: More than 3-4 hedges per 500 words

## What NOT to Flag

- Long sentences: Humans write long sentences
- Complex vocabulary: Human experts use sophisticated language
- Repetition: Humans repeat words they like
- Organization: Good structure is human
- Careful tone: Thoughtful writing is human

## Judge Rules

Remember: judge clusters, not isolated tells. A single transition word means nothing. Three patterns in the same paragraph means investigate. Five patterns across a page means very likely AI.

## Invocation

This skill is used by the humanizer extension to evaluate text for AI signals. It guides the detection process and helps calibrate the confidence threshold.

## Process Notes

The skill distills patterns observed in real AI-generated text. As models evolve, new patterns emerge. Regular updates ensure the skill stays current with AI writing evolution.

---

Last updated: January 2025
Used by: humanizer-extension, analysis-tools, research-projects`.repeat(
  2,
); // ~6000 chars

describe("distillSkill", () => {
  it("should successfully distill a skill with valid response", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const distilledContent = "# AI Detection Rubric\n\n1. Pattern A\n2. Pattern B\n3. Pattern C\n\nDo not flag in isolation.".repeat(
      3,
    ); // ~300 chars
    const capturedRequest: { body?: string; headers?: Record<string, string> } =
      {};

    const fakeFetch = (async (url: string, init?: RequestInit) => {
      capturedRequest.body = init?.body as string;
      capturedRequest.headers = init?.headers as Record<string, string>;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: distilledContent } }],
        }),
      );
    }) as typeof fetch;

    const result = await distillSkill(LONG_INPUT, config, fakeFetch);

    expect(result).toEqual(distilledContent);
    expect(capturedRequest.headers?.["content-type"]).toBe("application/json");
    expect(capturedRequest.headers?.authorization).toBe("Bearer test-key");
    const bodyObj = JSON.parse(capturedRequest.body!);
    expect(bodyObj.model).toBe("gpt-4");
    expect(bodyObj.messages[0].role).toBe("system");
    expect(bodyObj.messages[1].content).toBe(LONG_INPUT);
  });

  it("should unwrap markdown code fences", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const unwrappedContent =
      "# AI Detection Rubric\n\n1. Pattern A with description\n2. Pattern B with description\n3. Pattern C with description\n\nDo not flag in isolation. Look for clusters of patterns.".repeat(
        3,
      );
    const fencedContent = `\`\`\`markdown\n${unwrappedContent}\n\`\`\``;
    const fakeFetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: fencedContent } }],
        }),
      );
    }) as typeof fetch;

    const result = await distillSkill(LONG_INPUT, config, fakeFetch);

    expect(result).not.toContain("```");
    expect(result).toContain("# AI Detection Rubric");
  });

  it("should throw on HTTP error", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const fakeFetch = (async () => {
      return new Response(null, { status: 500 });
    }) as typeof fetch;

    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      SkillDistillError,
    );
    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it("should throw when content is too short", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const tooShort = "Too short";
    const fakeFetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: tooShort } }],
        }),
      );
    }) as typeof fetch;

    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      SkillDistillError,
    );
    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      /looks empty or refused/,
    );
  });

  it("should throw when content is not compressed", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const notCompressed = LONG_INPUT + " and even more content";
    const fakeFetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: notCompressed } }],
        }),
      );
    }) as typeof fetch;

    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      SkillDistillError,
    );
    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      /did not compress/,
    );
  });

  it("should throw when message content is missing", async () => {
    const config: DistillConfig = {
      baseUrl: "https://api.example.com",
      apiKey: "test-key",
      distillModel: "gpt-4",
    };

    const fakeFetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: {} }],
        }),
      );
    }) as typeof fetch;

    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      SkillDistillError,
    );
    await expect(distillSkill(LONG_INPUT, config, fakeFetch)).rejects.toThrow(
      /returned no content/,
    );
  });
});
