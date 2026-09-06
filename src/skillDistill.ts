import type { RubricSource } from "./config";
import { chatCompletion } from "./judge/chat";

export class SkillDistillError extends Error {}

export interface DistillConfig {
  baseUrl: string;
  apiKey: string;
  distillModel: string;
}

const MIN_RUBRIC_CHARS = 200;

/** Each source's extraction prompt matches what its document actually contains. */
const DISTILL_PROMPTS: Record<RubricSource, string> = {
  "ai-writing-patterns":
    "You compress the ai-writing-patterns catalog — a tiered catalog of the tells that mark prose as AI-generated — into a compact detection rubric. KEEP: every pattern as a numbered entry under its original §N (the numbers are stable identifiers — never renumber), with its name, signal tier (fingerprint / strong ✱ / moderate / weak), the exact words/phrases/constructions to watch, and density qualifiers (\"at density\", \"2+ per paragraph\"); the signal-tier definitions; the what-NOT-to-flag false-positive guidance; the signs of human writing; the judge-clusters-not-isolated-tells rule. DROP: the Fix/rewriting advice, before/after examples, and the sources/lineage section. Output plain markdown only — no preamble, no commentary, no code fences. Target roughly half the input length.",
  humanizer:
    "You compress the humanizer skill — a guide for removing signs of AI-generated writing — into a compact detection rubric. KEEP: every distinct pattern as a numbered entry with its name, the exact words/phrases/constructions to watch, and a one-line description of the signal; the what-NOT-to-flag false-positive guidance; the signs of human writing; the judge-clusters-not-isolated-tells rule. DROP: rewriting instructions, before/after examples, voice calibration, personality guidance, invocation modes, process/output sections. Output plain markdown only — no preamble, no commentary, no code fences. Target roughly a tenth of the input length.",
};

function fail(detail: string): Error {
  return new SkillDistillError(`distillation ${detail}`);
}

function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:markdown)?\s*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

/** Compress the full skill into the compact rubric the judge reads (ADR 0009, ADR 0014). */
export async function distillSkill(
  skillMarkdown: string,
  config: DistillConfig,
  source: RubricSource,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const body = {
    model: config.distillModel,
    messages: [
      { role: "system", content: DISTILL_PROMPTS[source] },
      { role: "user", content: skillMarkdown },
    ],
  };
  const rubric = stripFence(await chatCompletion(config, body, fetchFn, fail));
  if (rubric.length < MIN_RUBRIC_CHARS) throw fail("looks empty or refused");
  if (rubric.length >= skillMarkdown.length) throw fail("did not compress the skill");
  return rubric;
}
