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
