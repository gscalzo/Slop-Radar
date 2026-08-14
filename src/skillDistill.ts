export class SkillDistillError extends Error {}

export interface DistillConfig {
  baseUrl: string;
  apiKey: string;
  distillModel: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const DISTILL_SYSTEM_PROMPT = `You compress the humanizer skill — a guide for removing signs of AI-generated writing — into a compact detection rubric. KEEP: every distinct pattern as a numbered entry with its name, the exact words/phrases/constructions to watch, and a one-line description of the signal; the what-NOT-to-flag false-positive guidance; the signs of human writing; the judge-clusters-not-isolated-tells rule. DROP: rewriting instructions, before/after examples, voice calibration, personality guidance, invocation modes, process/output sections. Output plain markdown only — no preamble, no commentary, no code fences. Target roughly a tenth of the input length.`;

function buildRequestBody(
  model: string,
  skillMarkdown: string,
): unknown {
  return {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: DISTILL_SYSTEM_PROMPT },
      { role: "user", content: skillMarkdown },
    ],
  };
}

function extractContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new SkillDistillError("distillation returned no content");
  }
  return content;
}

function stripFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:markdown)?\s*\n?/, "")
    .replace(/\n?```$/, "");
}

export async function distillSkill(
  skillMarkdown: string,
  config: DistillConfig,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildRequestBody(config.distillModel, skillMarkdown)),
  });

  if (!response.ok) {
    throw new SkillDistillError(`distillation failed: HTTP ${response.status}`);
  }

  const result = stripFence(
    extractContent((await response.json()) as ChatCompletionResponse),
  ).trim();

  if (result.length < 200) {
    throw new SkillDistillError("distilled rubric looks empty or refused");
  }

  if (result.length >= skillMarkdown.length) {
    throw new SkillDistillError("distillation did not compress the skill");
  }

  return result;
}
