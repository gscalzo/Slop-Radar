import type { AdapterDiagnostics, FeedItem, SiteAdapter } from "./types";

/*
 * LinkedIn's feed is server-driven UI (`data-sdui-screen`). Three things about
 * it dictate everything below:
 *
 *   - Class names are content hashes (`_1e5cedba`) that rotate every build, so
 *     no class is a selector.
 *   - Posts carry no `urn:li:` id anywhere. Identity comes from `componentkey`,
 *     which on a card is stable per post ("expanded<ID>FeedType_MAIN_FEED_…")
 *     while elsewhere it is a per-render UUID — so only the card's is worth
 *     reading. Comments kept their URN, inside a `replaceableComment_` key.
 *   - `data-testid` survives: the feed list, every text body and every "…more"
 *     toggle carry one. They are the only stable anchors left.
 */
const FEED = '[data-testid="mainFeed"]';
const CARD = '[role="listitem"][componentkey]';
const COMMENT = '[componentkey^="replaceableComment_"]';
const BODY = '[data-testid="expandable-text-box"]';
const MORE = '[data-testid="expandable-text-button"]';

// Cards inside the feed list, plus cards identified by their own componentkey —
// either anchor alone is enough, so losing one does not blind the adapter.
const CARD_SELECTOR = `${FEED} ${CARD}, ${CARD}[componentkey^="expanded"]`;

// Comments render inside their post's card and use the same testids, so a post
// must ignore anything sitting inside one. Without this, a post with no text of
// its own would adopt its first comment's words.
function ownedByPost(el: Element): boolean {
  return el.closest(COMMENT) === null;
}

const anything = (): boolean => true;

/** Everything that differs between the two kinds of card, in one place. */
interface Kind {
  kind: FeedItem["kind"];
  selector: string;
  isOwn: (el: Element) => boolean;
}

const KINDS: Kind[] = [
  { kind: "post", selector: CARD_SELECTOR, isOwn: ownedByPost },
  { kind: "comment", selector: COMMENT, isOwn: anything },
];

function normalizeText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A body is one <p> of spans and <br>s that also contains the "…more" button.
 * textContent would run every line together and append the button's label, so
 * extract from a clone: buttons removed, breaks turned back into newlines.
 * Line structure matters — emoji listicles are a line-oriented tell.
 */
function extractText(body: Element): string {
  const clone = body.cloneNode(true) as Element;
  for (const button of clone.querySelectorAll("button")) button.remove();
  for (const br of clone.querySelectorAll("br")) br.replaceWith("\n");
  return normalizeText(clone.textContent ?? "");
}

/** First descendant matching `selector` that belongs to this card, not a nested one. */
function ownedFirst(
  card: Element,
  selector: string,
  isOwn: (el: Element) => boolean,
): Element | null {
  for (const el of card.querySelectorAll(selector)) {
    if (isOwn(el)) return el;
  }
  return null;
}

function toItem(card: Element, spec: Kind): FeedItem | null {
  const id = card.getAttribute("componentkey");
  const body = ownedFirst(card, BODY, spec.isOwn);
  if (id === null || body === null || !(card instanceof HTMLElement)) return null;
  const text = extractText(body);
  if (text === "") return null;
  const truncated = ownedFirst(card, MORE, spec.isOwn) !== null;
  return { id, element: card, text, truncated, kind: spec.kind };
}

// SDUI repeats the same componentkey on several nested wrappers, so one comment
// matches many times; keeping the first match keeps the outermost element.
function collect(root: ParentNode, spec: Kind, seen: Set<string>): FeedItem[] {
  const items: FeedItem[] = [];
  for (const card of root.querySelectorAll(spec.selector)) {
    const item = toItem(card, spec);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

function findItems(root: ParentNode): FeedItem[] {
  const seen = new Set<string>();
  return KINDS.flatMap((spec) => collect(root, spec, seen));
}

// Clicks each card's own "…more" toggle at most once — only ever reached from
// an explicit user command (ADR 0007).
function expandKind(root: ParentNode, spec: Kind, clicked: Set<Element>): void {
  for (const card of root.querySelectorAll(spec.selector)) {
    const control = ownedFirst(card, MORE, spec.isOwn);
    if (!control || clicked.has(control)) continue;
    clicked.add(control);
    if (control instanceof HTMLElement) control.click();
  }
}

function expandTruncated(root: ParentNode): number {
  const clicked = new Set<Element>();
  for (const spec of KINDS) expandKind(root, spec, clicked);
  return clicked.size;
}

// Each anchor probed separately, so a census names the one that went stale.
// The bottom rows are the pre-SDUI selectors: if they ever come back, that is
// worth knowing too.
const PROBES = [
  FEED,
  CARD,
  COMMENT,
  BODY,
  MORE,
  "[data-sdui-screen]",
  "[componentkey]",
  '[data-id^="urn:li:activity"]',
  ".update-components-text",
  "main",
];

/** "urn:li:activity:123" → "urn:li:activity"; "expandedABC…" → "expanded". */
function prefixOf(id: string): string {
  return id.startsWith("urn:") ? id.split(":").slice(0, 3).join(":") : id.slice(0, 8);
}

/** Any attribute that could be an identity anchor, whatever it is called. */
function idKeys(el: Element): string[] {
  return [...el.attributes]
    .filter((attr) => attr.name === "componentkey" || attr.value.startsWith("urn:li:"))
    .map((attr) => `${attr.name}=${prefixOf(attr.value)}`);
}

function countIdAttributes(root: ParentNode): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of root.querySelectorAll("*")) {
    for (const key of idKeys(el)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function diagnose(root: ParentNode): AdapterDiagnostics {
  const selectors: Record<string, number> = {};
  for (const probe of PROBES) selectors[probe] = root.querySelectorAll(probe).length;
  return { selectors, idAttributes: countIdAttributes(root) };
}

export const linkedInAdapter: SiteAdapter = {
  name: "linkedin-feed",
  findItems,
  diagnose,
  expandTruncated,
};
