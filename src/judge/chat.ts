/**
 * The one place that speaks OpenAI's /chat/completions wire format.
 *
 * No `temperature` is sent. Reasoning models (o1/o3/o4-mini and the GPT-5
 * family) reject any value but their default, and OpenAI's guidance is to omit
 * the parameter rather than work around the rejection. Nothing is lost: a
 * temperature of 0 was never a determinism guarantee — OpenAI documents only
 * best-effort reproducibility, via `seed`, and warns even that is not assured.
 */

export interface ChatEndpoint {
  baseUrl: string;
  apiKey: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/**
 * OpenAI-compatible APIs put the actual complaint in the error body — an
 * unknown model, an unsupported parameter. "HTTP 400" on its own sends the
 * reader guessing, so carry the message through.
 */
function apiMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === "string") return parsed.error.message;
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return body.slice(0, 300);
}

function messageContent(data: ChatCompletionResponse): unknown {
  return data.choices?.[0]?.message?.content;
}

async function failureDetail(response: Response): Promise<string> {
  const detail = apiMessage(await response.text().catch(() => "")).trim();
  return `failed: HTTP ${response.status}${detail === "" ? "" : ` — ${detail}`}`;
}

/**
 * POST a chat completion and return the assistant's message text.
 * `fail` turns a failure detail into the caller's own error type.
 */
export async function chatCompletion(
  endpoint: ChatEndpoint,
  body: unknown,
  fetchFn: typeof fetch,
  fail: (detail: string) => Error,
): Promise<string> {
  const response = await fetchFn(`${endpoint.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw fail(await failureDetail(response));
  const content = messageContent((await response.json()) as ChatCompletionResponse);
  if (typeof content !== "string") throw fail("returned no content");
  return content;
}
