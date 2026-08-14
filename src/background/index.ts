/**
 * Background service worker (browser glue — logic lives in tested modules).
 * Owns the cloud-judge call so the API key never touches page context, and
 * memoises verdicts by text hash for the worker's lifetime.
 */
import { loadConfig } from "../config";
import { createOpenAiCompatibleJudge } from "../judge/openaiCompatible";
import type { JudgeResult } from "../judge/types";
import type { ExpandRequestMessage, JudgeRequestMessage, JudgeResponseMessage } from "../messages";

const cache = new Map<string, JudgeResult>();

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function handleJudge(message: JudgeRequestMessage): Promise<JudgeResponseMessage> {
  const cached = cache.get(message.hash);
  if (cached) return { ok: true, result: cached };
  const config = await loadConfig();
  if (!config.enabled || config.apiKey === "") {
    return { ok: false, reason: "cloud judge disabled" };
  }
  try {
    const result = await createOpenAiCompatibleJudge(config).judge(message.text);
    cache.set(message.hash, result);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, reason: errorReason(error) };
  }
}

chrome.runtime.onMessage.addListener(
  (message: JudgeRequestMessage, _sender, sendResponse: (r: JudgeResponseMessage) => void) => {
    if (message?.type !== "aitm-judge") return undefined;
    void handleJudge(message).then(sendResponse);
    return true; // keep the message channel open for the async response
  },
);

// The expand-truncated keyboard command (see manifest "commands") relays to the
// active tab's content script; only a user-invoked command reaches here (ADR 0007).
async function relayExpandCommand(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  const message: ExpandRequestMessage = { type: "aitm-expand" };
  await chrome.tabs.sendMessage(tab.id, message).catch(() => undefined);
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "expand-truncated") void relayExpandCommand();
});
