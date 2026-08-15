/** The one place that speaks OpenAI's /chat/completions wire format. */

export interface ChatEndpoint {
  baseUrl: string;
  apiKey: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

function messageContent(data: ChatCompletionResponse): unknown {
  return data.choices?.[0]?.message?.content;
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

async function failureDetail(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  const detail = apiMessage(body).trim();
  return detail === ""
    ? `failed: HTTP ${response.status}`
    : `failed: HTTP ${response.status} — ${detail}`;
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
