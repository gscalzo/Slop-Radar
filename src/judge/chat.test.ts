import { describe, expect, it, vi } from "vitest";
import { chatCompletion } from "./chat";

const ENDPOINT = { baseUrl: "https://api.example.com/v1", apiKey: "sk-test" };
const fail = (detail: string): Error => new Error(`judge request ${detail}`);

function respond(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

describe("chatCompletion", () => {
  it("returns the assistant message text", async () => {
    const fetchFn = respond({ choices: [{ message: { content: "hello" } }] });
    await expect(chatCompletion(ENDPOINT, {}, fetchFn, fail)).resolves.toBe("hello");
  });

  it("carries the API's own explanation into the error", async () => {
    const fetchFn = respond(
      { error: { message: "The model `gpt-nope` does not exist", type: "invalid_request_error" } },
      400,
    );
    await expect(chatCompletion(ENDPOINT, {}, fetchFn, fail)).rejects.toThrow(
      "HTTP 400 — The model `gpt-nope` does not exist",
    );
  });

  it("falls back to the raw body when the error is not JSON", async () => {
    const fetchFn = respond("upstream timeout", 502);
    await expect(chatCompletion(ENDPOINT, {}, fetchFn, fail)).rejects.toThrow(
      "HTTP 502 — upstream timeout",
    );
  });

  it("still reports the status when the body is empty", async () => {
    const fetchFn = respond("", 401);
    await expect(chatCompletion(ENDPOINT, {}, fetchFn, fail)).rejects.toThrow("HTTP 401");
  });

  it("rejects a response with no message content", async () => {
    const fetchFn = respond({ choices: [] });
    await expect(chatCompletion(ENDPOINT, {}, fetchFn, fail)).rejects.toThrow("returned no content");
  });
});

// Each test uses its own model name: the "this model rejects temperature"
// memo is module-level, exactly as it is in the worker.
describe("models that reject temperature", () => {
  const REJECTION = {
    error: {
      message:
        "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
      code: "unsupported_value",
      param: "temperature",
    },
  };

  /** Like the real API: rejects any request that carries a temperature. */
  function pickyModel(): { fetchFn: typeof fetch; sent: () => Record<string, unknown>[] } {
    const bodies: Record<string, unknown>[] = [];
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      bodies.push(body);
      return "temperature" in body
        ? new Response(JSON.stringify(REJECTION), { status: 400 })
        : new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    });
    return { fetchFn: fetchFn as unknown as typeof fetch, sent: () => bodies };
  }

  it("retries once without temperature and succeeds", async () => {
    const { fetchFn, sent } = pickyModel();
    const body = { model: "picky-1", temperature: 0, messages: [] };

    await expect(chatCompletion(ENDPOINT, body, fetchFn, fail)).resolves.toBe("ok");
    expect(sent()).toHaveLength(2);
    expect(sent()[0]).toHaveProperty("temperature", 0);
    expect(sent()[1]).not.toHaveProperty("temperature");
    expect(sent()[1]).toHaveProperty("model", "picky-1");
  });

  it("remembers, so later calls skip temperature from the start", async () => {
    const first = pickyModel();
    const body = { model: "picky-2", temperature: 0, messages: [] };
    await chatCompletion(ENDPOINT, body, first.fetchFn, fail);

    const again = pickyModel();
    await expect(chatCompletion(ENDPOINT, body, again.fetchFn, fail)).resolves.toBe("ok");
    expect(again.sent()).toHaveLength(1);
    expect(again.sent()[0]).not.toHaveProperty("temperature");
  });

  it("does not retry a 400 that is about something else", async () => {
    const fetchFn = respond({ error: { message: "The model `nope` does not exist" } }, 400);
    const body = { model: "nope", temperature: 0, messages: [] };

    await expect(chatCompletion(ENDPOINT, body, fetchFn, fail)).rejects.toThrow("does not exist");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("surfaces a retry that fails for a different reason", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify(
          (fetchFn as unknown as { mock: { calls: unknown[] } }).mock.calls.length === 1
            ? REJECTION
            : { error: { message: "insufficient_quota" } },
        ),
        { status: 400 },
      ),
    ) as unknown as typeof fetch;
    const body = { model: "picky-3", temperature: 0, messages: [] };

    await expect(chatCompletion(ENDPOINT, body, fetchFn, fail)).rejects.toThrow("insufficient_quota");
  });
});
