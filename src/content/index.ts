/**
 * Content-script orchestrator (browser glue — logic lives in tested modules).
 * Heuristics run for every discovered post/comment; the cloud judge is only
 * consulted for items that actually enter the viewport, cached by URN.
 */
import { linkedInAdapter } from "../adapters/linkedin";
import type { FeedItem } from "../adapters/types";
import { loadConfig } from "../config";
import { createLogger, formatCounts } from "../debug";
import { analyze } from "../core/analyze";
import { hashText } from "../core/hash";
import { scoreText } from "../core/score";
import type { Flag } from "../core/types";
import type { JudgeResult } from "../judge/types";
import type { ExpandRequestMessage, JudgeRequestMessage, JudgeResponseMessage } from "../messages";
import { combine, type Verdict } from "../verdict";
import { clearDecoration, decoratePost } from "./decorate";
import { createExpandButton, updateExpandButton } from "./expandButton";
import { openReportModal } from "./modal";
import { buildReport } from "./report";

// Comments are short by nature; see ADR 0004 for the lower abstain floor.
const COMMENT_MIN_WORDS = 20;

const log = createLogger(localStorage, console.log.bind(console));

let checkComments = true;

interface ItemState {
  item: FeedItem;
  hash: string;
  flags: Flag[];
  judge: JudgeResult | null;
  verdict: Verdict;
  judgeRequested: boolean;
}

const states = new Map<string, ItemState>();
const elementIds = new WeakMap<Element, string>();

function decorate(state: ItemState): void {
  const isComment = state.item.kind === "comment";
  // Abstaining comments stay unmarked — no badge clutter on "Congrats!" replies.
  // Clear any earlier decoration in case a previous verdict marked this element.
  if (isComment && state.verdict.abstain) {
    clearDecoration(state.item.element);
    return;
  }
  decoratePost(
    state.item.element,
    {
      tier: state.verdict.tier,
      partial: state.item.truncated,
      compact: isComment,
      basis: state.verdict.basis,
    },
    () => {
      openReportModal(
        document,
        buildReport(state.item.text, state.flags, state.verdict, state.judge, state.item.truncated),
      );
    },
  );
}

// A judge failure used to return silently, which is why a misconfigured model
// looked exactly like a working one: pattern-only badges and no explanation.
function applyJudgeResponse(state: ItemState, response: JudgeResponseMessage | undefined): void {
  if (response === undefined) {
    log(`judge: no response for ${state.item.id} (service worker asleep or erroring?)`);
    return;
  }
  if (!response.ok) {
    log(`judge REFUSED for ${state.item.id}: ${response.reason}`);
    return;
  }
  state.judge = response.result;
  state.verdict = combine(state.verdict.heuristic, response.result);
  log(
    `judge ok for ${state.item.id}: likelihood ${response.result.likelihood} → ${state.verdict.tier}`,
  );
  decorate(state);
}

function requestJudgement(state: ItemState): void {
  if (state.judgeRequested || state.verdict.abstain) return;
  state.judgeRequested = true;
  log(`judge: requesting for ${state.item.id} (${state.verdict.heuristic.words} words)`);
  const message: JudgeRequestMessage = {
    type: "aitm-judge",
    text: state.item.text,
    hash: state.hash,
  };
  chrome.runtime.sendMessage(message, (response: JudgeResponseMessage | undefined) => {
    void chrome.runtime.lastError; // swallow "no receiver" errors
    applyJudgeResponse(state, response);
  });
}

const viewport = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const id = elementIds.get(entry.target);
    const state = id ? states.get(id) : undefined;
    if (entry.isIntersecting && state) requestJudgement(state);
  }
});

function process(item: FeedItem): void {
  const hash = hashText(item.text);
  const existing = states.get(item.id);
  if (existing && existing.hash === hash) {
    existing.item = item; // element may have been re-rendered
    decorate(existing);
  } else {
    const flags = analyze(item.text);
    const floor = item.kind === "comment" ? { minWords: COMMENT_MIN_WORDS } : undefined;
    const verdict = combine(scoreText(item.text, flags, floor), null);
    const state: ItemState = { item, hash, flags, judge: null, verdict, judgeRequested: false };
    states.set(item.id, state);
    decorate(state);
  }
  elementIds.set(item.element, item.id);
  viewport.observe(item.element);
}

// LinkedIn virtualises the feed: cards scroll away and are removed from the
// DOM. Drop their states so the map does not retain detached elements forever
// (judge verdicts stay memoised by text hash in the background worker).
function pruneDisconnected(): void {
  for (const [id, state] of states) {
    if (!state.item.element.isConnected) {
      viewport.unobserve(state.item.element);
      states.delete(id);
    }
  }
}

// Expansion only ever runs from an explicit user command — the keyboard
// shortcut relayed by the background worker, or the floating button (ADR 0007).
// The resulting DOM mutations re-trigger scan(), where the changed text hash
// re-analyses each expanded item in full.
function expandAll(): void {
  linkedInAdapter.expandTruncated(document);
}

const expandButton = createExpandButton(document, expandAll);

function truncatedCount(): number {
  return [...states.values()].filter((s) => s.item.truncated && s.item.element.isConnected).length;
}

function summarise(items: FeedItem[]): Record<string, unknown> {
  return {
    found: items.length,
    posts: items.filter((i) => i.kind === "post").length,
    comments: items.filter((i) => i.kind === "comment").length,
    verdicts: [...states.values()].map((s) => ({
      kind: s.item.kind,
      words: s.verdict.heuristic.words,
      tier: s.verdict.tier,
      abstain: s.verdict.abstain,
      basis: s.verdict.basis,
      truncated: s.item.truncated,
    })),
  };
}

function scan(): void {
  pruneDisconnected();
  const items = linkedInAdapter.findItems(document);
  for (const item of items) {
    if (item.kind === "comment" && !checkComments) continue;
    process(item);
  }
  updateExpandButton(expandButton, truncatedCount());
  logScan(items);
}

// LinkedIn mutates the DOM constantly, so scans are frequent; only say
// something when the picture actually changed.
let lastLogged = "";

function logScan(items: FeedItem[]): void {
  const summary = summarise(items);
  const fingerprint = JSON.stringify(summary);
  if (fingerprint === lastLogged) return;
  lastLogged = fingerprint;
  log(`scan ${fingerprint}`);
  // Nothing matched: the page is either not the feed or LinkedIn renamed its
  // markup. The census says which, naming the exact selector that went stale.
  if (items.length === 0) logCensus();
}

function logCensus(): void {
  const { selectors, idAttributes } = linkedInAdapter.diagnose(document);
  log(`no items — selectors: ${formatCounts(selectors)}`);
  log(`no items — id attributes: ${formatCounts(idAttributes)}`);
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function boot(): Promise<void> {
  log(`booted on ${location.href} — silence with localStorage.slopRadarDebug = "off"`);
  try {
    checkComments = (await loadConfig()).checkComments;
  } catch {
    // storage unavailable — keep the default (on)
  }
  document.body.appendChild(expandButton);
  chrome.runtime.onMessage.addListener((message: ExpandRequestMessage) => {
    if (message?.type === "aitm-expand") expandAll();
  });
  const debouncedScan = debounce(scan, 400);
  new MutationObserver(debouncedScan).observe(document.body, { childList: true, subtree: true });
  scan();
}

void boot();
