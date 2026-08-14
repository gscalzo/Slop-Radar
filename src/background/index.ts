/**
 * Background service worker (browser glue — logic lives in tested modules).
 * Owns the cloud-judge call so the API key never touches page context, and
 * memoises verdicts by text hash for the worker's lifetime.
 *
 * Its console is separate from the page's: chrome://extensions → Slop Radar →
 * "service worker". Every reason a verdict does not happen is logged there.
 */
import { loadConfig, type MeterConfig } from "../config";
import { createLogger } from "../debug";
import { createOpenAiCompatibleJudge } from "../judge/openaiCompatible";
import type { JudgeResult } from "../judge/types";
import type { ExpandRequestMessage, JudgeRequestMessage, JudgeResponseMessage } from "../messages";

// MV3 workers have no localStorage, so there is no opt-out to read here; the
// worker console is already opt-in.
const log = createLogger({ getItem: () => null }, console.log.bind(console));

const cache = new Map<string, JudgeResult>();

function apiOrigin(baseUrl: string): string | null {
  try {
    return `${new URL(baseUrl).origin}/*`;
  } catch {
    return null;
  }
}

/** Why the judge cannot run at all, or null when it can. */
function unusable(config: MeterConfig): string | null {
  if (!config.enabled) return "model analysis is switched off in Options";
  if (config.apiKey === "") return "no API key set in Options";
  return null;
}

/**
 * The host permission is optional and granted per origin from the Options page.
 * Without it fetch fails with a bare "Failed to fetch", so check first and say
 * what is actually missing.
 */
async function permissionProblem(config: MeterConfig): Promise<string | null> {
  const origin = apiOrigin(config.baseUrl);
  if (origin === null) return `API base URL is not a valid URL: "${config.baseUrl}"`;
  const granted = await chrome.permissions.contains({ origins: [origin] });
  return granted ? null : `no host permission for ${origin} — open Options and press Save to grant it`;
}

function explain(reason: string): string {
  return reason.includes("Failed to fetch")
    ? `${reason} — the endpoint was unreachable: check the base URL, and that it allows requests from an extension`
    : reason;
}

function errorReason(error: unknown): string {
  return explain(error instanceof Error ? error.message : String(error));
}

async function judgeNow(config: MeterConfig, message: JudgeRequestMessage): Promise<JudgeResponseMessage> {
  try {
    const result = await createOpenAiCompatibleJudge(config).judge(message.text);
    cache.set(message.hash, result);
    log(`verdict ${message.hash}: likelihood ${result.likelihood}, ${result.phrases.length} phrases`);
    return { ok: true, result };
  } catch (error) {
    const reason = errorReason(error);
    log(`FAILED ${message.hash}: ${reason}`);
    return { ok: false, reason };
  }
}

async function handleJudge(message: JudgeRequestMessage): Promise<JudgeResponseMessage> {
  const cached = cache.get(message.hash);
  if (cached) return { ok: true, result: cached };
  const config = await loadConfig();
  log(
    `judging ${message.hash}: ${message.text.length} chars, model=${config.model}, ` +
      `baseUrl=${config.baseUrl}, apiKey=${config.apiKey === "" ? "MISSING" : "set"}`,
  );
  const blocked = unusable(config) ?? (await permissionProblem(config));
  if (blocked !== null) {
    log(`refused ${message.hash}: ${blocked}`);
    return { ok: false, reason: blocked };
  }
  return judgeNow(config, message);
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

log("service worker started");
