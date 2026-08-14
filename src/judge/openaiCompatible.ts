import type { MeterConfig } from "../config";
import { clamp01 } from "../core/clamp";
import { buildSystemPrompt } from "./prompt";
import type { Judge, JudgePhrase, JudgeResult } from "./types";

export class JudgeRequestError extends Error {}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

function requestBody(config: MeterConfig, text: string): unknown {
  return {
    model: config.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(config) },
      { role: "user", content: text },
    ],
  };
}

function extractContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new JudgeRequestError("judge response had no message content");
  }
  return content;
}

function parsePhrases(value: unknown): JudgePhrase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is JudgePhrase =>
        typeof p === "object" && p !== null &&
        typeof (p as JudgePhrase).quote === "string" &&
        typeof (p as JudgePhrase).reason === "string",
    )
    .slice(0, 10);
}

function toRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
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
  const record = toRecord(raw);
  return {
    likelihood: parseLikelihood(record.likelihood),
    summary: typeof record.summary === "string" ? record.summary : undefined,
    phrases: parsePhrases(record.phrases),
  };
}

async function requestJudgement(
  config: MeterConfig,
  fetchFn: typeof fetch,
  text: string,
): Promise<JudgeResult> {
  const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody(config, text)),
  });
  if (!response.ok) {
    throw new JudgeRequestError(`judge request failed: HTTP ${response.status}`);
  }
  return parseJudgeResult(extractContent((await response.json()) as ChatCompletionResponse));
}

/** Works against any OpenAI-compatible /chat/completions endpoint. */
export function createOpenAiCompatibleJudge(
  config: MeterConfig,
  fetchFn: typeof fetch = fetch,
): Judge {
  return { judge: (text) => requestJudgement(config, fetchFn, text) };
}
