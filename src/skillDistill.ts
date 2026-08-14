import { chatCompletion } from "./judge/chat";

export class SkillDistillError extends Error {}

export interface DistillConfig {
  baseUrl: string;
  apiKey: string;
  distillModel: string;
}

const MIN_RUBRIC_CHARS = 200;

const DISTILL_SYSTEM_PROMPT = `You compress the humanizer skill — a guide for removing signs of AI-generated writing — into a compact detection rubric. KEEP: every distinct pattern as a numbered entry with its name, the exact words/phrases/constructions to watch, and a one-line description of the signal; the what-NOT-to-flag false-positive guidance; the signs of human writing; the judge-clusters-not-isolated-tells rule. DROP: rewriting instructions, before/after examples, voice calibration, personality guidance, invocation modes, process/output sections. Output plain markdown only — no preamble, no commentary, no code fences. Target roughly a tenth of the input length.`;

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

/** Compress the full humanizer skill into the compact rubric the judge reads (ADR 0009). */
export async function distillSkill(
  skillMarkdown: string,
  config: DistillConfig,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const body = {
    model: config.distillModel,
    temperature: 0,
    messages: [
      { role: "system", content: DISTILL_SYSTEM_PROMPT },
      { role: "user", content: skillMarkdown },
    ],
  };
  const rubric = stripFence(await chatCompletion(config, body, fetchFn, fail));
  if (rubric.length < MIN_RUBRIC_CHARS) throw fail("looks empty or refused");
  if (rubric.length >= skillMarkdown.length) throw fail("did not compress the skill");
  return rubric;
}
