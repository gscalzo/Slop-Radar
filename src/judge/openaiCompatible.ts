import type { MeterConfig } from "../config";
import { clamp01 } from "../core/clamp";
import { chatCompletion } from "./chat";
import { buildSystemPrompt } from "./prompt";
import type { Judge, JudgePhrase, JudgeResult } from "./types";

export class JudgeRequestError extends Error {}

const MAX_PHRASES = 10;

function fail(detail: string): Error {
  return new JudgeRequestError(`judge request ${detail}`);
}

function isPhrase(value: unknown): value is JudgePhrase {
  const phrase = value as JudgePhrase | null;
  return typeof phrase?.quote === "string" && typeof phrase?.reason === "string";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function parseLikelihood(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new JudgeRequestError("judge response missing likelihood");
  }
  return clamp01(value);
}

export function parseJudgeResult(content: string): JudgeResult {
  const stripped = content.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(stripped);
  } catch {
    throw new JudgeRequestError("judge returned invalid JSON");
  }
  const record = asRecord(raw);
  return {
    likelihood: parseLikelihood(record.likelihood),
    summary: typeof record.summary === "string" ? record.summary : undefined,
    phrases: Array.isArray(record.phrases) ? record.phrases.filter(isPhrase).slice(0, MAX_PHRASES) : [],
  };
}

/** Works against any OpenAI-compatible /chat/completions endpoint. */
export function createOpenAiCompatibleJudge(
  config: MeterConfig,
  fetchFn: typeof fetch = fetch,
): Judge {
  const body = (text: string): unknown => ({
    model: config.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(config) },
      { role: "user", content: text },
    ],
  });
  return {
    judge: async (text) =>
      parseJudgeResult(await chatCompletion(config, body(text), fetchFn, fail)),
  };
}
