/** The one place that speaks OpenAI's /chat/completions wire format. */

export interface ChatEndpoint {
  baseUrl: string;
  apiKey: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

// Newer OpenAI models reject any temperature but their default, with a 400.
// Verdicts want determinism, so temperature 0 is still asked for first and
// dropped only where the API says it cannot be had.
const UNSUPPORTED_TEMPERATURE = /temperature.{0,40}(unsupported|not support)|unsupported.{0,40}temperature/i;

// Remembered per endpoint+model so the rejection costs one request, not one
// per post. A worker restart forgets it, which costs a single retry.
const noTemperature = new Set<string>();

function modelOf(body: unknown): string {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return typeof record.model === "string" ? record.model : "";
}

function stripTemperature(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const { temperature: _temperature, ...rest } = body as Record<string, unknown>;
  return rest;
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

function post(endpoint: ChatEndpoint, body: unknown, fetchFn: typeof fetch): Promise<Response> {
  return fetchFn(`${endpoint.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

async function readContent(response: Response, fail: (detail: string) => Error): Promise<string> {
  const content = messageContent((await response.json()) as ChatCompletionResponse);
  if (typeof content !== "string") throw fail("returned no content");
  return content;
}

async function retryWithoutTemperature(
  endpoint: ChatEndpoint,
  body: unknown,
  fetchFn: typeof fetch,
  fail: (detail: string) => Error,
  key: string,
): Promise<string> {
  noTemperature.add(key);
  const response = await post(endpoint, stripTemperature(body), fetchFn);
  if (!response.ok) throw fail(await failureDetail(response));
  return readContent(response, fail);
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
  const key = `${endpoint.baseUrl}|${modelOf(body)}`;
  const response = await post(endpoint, noTemperature.has(key) ? stripTemperature(body) : body, fetchFn);
  if (response.ok) return readContent(response, fail);
  const detail = await failureDetail(response);
  if (!UNSUPPORTED_TEMPERATURE.test(detail)) throw fail(detail);
  return retryWithoutTemperature(endpoint, body, fetchFn, fail, key);
}
