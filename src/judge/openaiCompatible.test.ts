import { describe, expect, it, vi } from "vitest";
import { withDefaults } from "../config";
import { JudgeRequestError, createOpenAiCompatibleJudge, parseJudgeResult } from "./openaiCompatible";

const CONFIG = withDefaults({
  enabled: true,
  baseUrl: "https://api.example.com/v1",
  model: "test-model",
  apiKey: "sk-test",
});

function chatResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

describe("createOpenAiCompatibleJudge", () => {
  it("POSTs to /chat/completions with auth and parses the verdict", async () => {
    const content = JSON.stringify({
      likelihood: 0.8,
      summary: "Formulaic.",
      phrases: [{ quote: "delve", reason: "stock verb" }],
    });
    const fetchFn = vi.fn(async () => chatResponse(content));
    const judge = createOpenAiCompatibleJudge(CONFIG, fetchFn as any);

    const result = await judge.judge("Let us delve into this.");

    expect(result).toEqual({
      likelihood: 0.8,
      summary: "Formulaic.",
      phrases: [{ quote: "delve", reason: "stock verb" }],
    });
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("test-model");
    expect(body.messages[1].content).toBe("Let us delve into this.");
    // With no override, the system prompt embeds the bundled distilled rubric.
    expect(body.messages[0].content).toMatch(/em dash/i);
    expect(body.messages[0].content).toContain("judge, not an editor");
    expect(body.messages[0].content).toContain('"likelihood"');
  });

  it("uses a configured rubric override as the system prompt, keeping the contract", async () => {
    const fetchFn = vi.fn(async () => chatResponse('{"likelihood": 0.2, "phrases": []}'));
    const judge = createOpenAiCompatibleJudge(
      withDefaults({ ...CONFIG, skillText: "Only flag excessive emojis." }),
      fetchFn as any,
    );
    await judge.judge("text");
    const body = JSON.parse((fetchFn.mock.calls[0] as any)[1].body);
    expect(body.messages[0].content).toContain("Only flag excessive emojis.");
    expect(body.messages[0].content).toContain('"likelihood"');
  });

  it("throws JudgeRequestError on HTTP failure", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 401 }));
    const judge = createOpenAiCompatibleJudge(CONFIG, fetchFn as any);
    await expect(judge.judge("text")).rejects.toThrow("HTTP 401");
  });

  it("throws when the response has no content", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const judge = createOpenAiCompatibleJudge(CONFIG, fetchFn as any);
    await expect(judge.judge("text")).rejects.toThrow(JudgeRequestError);
  });
});

describe("parseJudgeResult", () => {
  it("strips markdown fences", () => {
    const result = parseJudgeResult('```json\n{"likelihood": 0.5, "phrases": []}\n```');
    expect(result.likelihood).toBe(0.5);
  });

  it("strips fences surrounded by whitespace", () => {
    const result = parseJudgeResult('\n```json\n{"likelihood": 0.5, "phrases": []}\n```\n');
    expect(result.likelihood).toBe(0.5);
  });

  it("clamps likelihood into 0..1", () => {
    expect(parseJudgeResult('{"likelihood": 7, "phrases": []}').likelihood).toBe(1);
    expect(parseJudgeResult('{"likelihood": -2, "phrases": []}').likelihood).toBe(0);
  });

  it("drops malformed phrases and caps the list at 10", () => {
    const phrases = Array.from({ length: 15 }, (_, i) => ({ quote: `q${i}`, reason: "r" }));
    const result = parseJudgeResult(
      JSON.stringify({ likelihood: 0.4, phrases: [...phrases, { quote: 42 }, "junk"] }),
    );
    expect(result.phrases).toHaveLength(10);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseJudgeResult("not json")).toThrow("invalid JSON");
  });

  it("rejects a missing likelihood", () => {
    expect(() => parseJudgeResult('{"phrases": []}')).toThrow("missing likelihood");
  });
});
