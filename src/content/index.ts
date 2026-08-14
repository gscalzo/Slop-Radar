/**
 * Content-script orchestrator (browser glue — logic lives in tested modules).
 * Heuristics run for every discovered post/comment; the cloud judge is only
 * consulted for items that actually enter the viewport, cached by URN.
 */
import { linkedInAdapter } from "../adapters/linkedin";
import type { FeedItem } from "../adapters/types";
import { loadConfig } from "../config";
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

function applyJudgeResponse(state: ItemState, response: JudgeResponseMessage | undefined): void {
  if (!response?.ok) return;
  state.judge = response.result;
  state.verdict = combine(state.verdict.heuristic, response.result);
  decorate(state);
}

function requestJudgement(state: ItemState): void {
  if (state.judgeRequested || state.verdict.abstain) return;
  state.judgeRequested = true;
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

function scan(): void {
  pruneDisconnected();
  for (const item of linkedInAdapter.findItems(document)) {
    if (item.kind === "comment" && !checkComments) continue;
    process(item);
  }
  updateExpandButton(expandButton, truncatedCount());
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

async function boot(): Promise<void> {
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
