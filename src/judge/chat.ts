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
  if (!response.ok) throw fail(`failed: HTTP ${response.status}`);
  const content = messageContent((await response.json()) as ChatCompletionResponse);
  if (typeof content !== "string") throw fail("returned no content");
  return content;
}
