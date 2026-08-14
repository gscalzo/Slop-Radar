import type { AdapterDiagnostics, FeedItem, SiteAdapter } from "./types";

// LinkedIn's class names are obfuscated and churn; data-* URN attributes are
// the stable anchors. All selectors live here and nowhere else.
const POST_SELECTOR = '[data-id^="urn:li:activity"], [data-urn^="urn:li:activity"]';
// Comments are rendered as their own cards but nested inside a post's card.
const COMMENT_SELECTOR = '[data-id^="urn:li:comment"], article.comments-comment-entity';

const SEE_MORE_CLASS = ".feed-shared-inline-show-more-text__see-more-less-toggle";
// Anchored: the clamp toggle reads exactly "…see more". A substring match would
// also hit unrelated buttons like "See more comments" and flag full posts as clamped.
const SEE_MORE_TEXT = /^…?\s*see more$/i;

/** A post's text and see-more toggle must not belong to one of its nested comments. */
function ownedByPost(el: Element): boolean {
  return el.closest(COMMENT_SELECTOR) === null;
}

const anything = (): boolean => true;

/** Everything that differs between the two kinds of card, in one place. */
interface Kind {
  kind: FeedItem["kind"];
  selector: string;
  textSelectors: string[];
  /** Tells a card's own elements from those of a nested comment. */
  isOwn: (el: Element) => boolean;
  idOf: (el: Element) => string | null;
}

const KINDS: Kind[] = [
  {
    kind: "post",
    selector: POST_SELECTOR,
    textSelectors: [
      ".update-components-update-v2__commentary",
      ".update-components-text",
      ".feed-shared-update-v2__description",
    ],
    isOwn: ownedByPost,
    idOf: (el) => el.getAttribute("data-id") ?? el.getAttribute("data-urn"),
  },
  {
    kind: "comment",
    selector: COMMENT_SELECTOR,
    textSelectors: [".comments-comment-item__main-content", ".update-components-text"],
    isOwn: anything,
    idOf: (el) => el.getAttribute("data-id"),
  },
];

function normalizeText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/…?\s*see more\s*$/i, "")
    .trim();
}

/** First element the card owns matching any of its text selectors, normalised. */
function readText(card: Element, spec: Kind): string {
  for (const selector of spec.textSelectors) {
    for (const el of card.querySelectorAll(selector)) {
      if (spec.isOwn(el)) return normalizeText(el.textContent ?? "");
    }
  }
  return "";
}

/** The card's own see-more control: the clamp toggle class, else an anchored button. */
function findSeeMore(card: Element, isOwn: (el: Element) => boolean): Element | null {
  const toggle = [...card.querySelectorAll(SEE_MORE_CLASS)].find(isOwn);
  if (toggle) return toggle;
  return (
    [...card.querySelectorAll("button")].find(
      (b) => isOwn(b) && SEE_MORE_TEXT.test((b.textContent ?? "").trim()),
    ) ?? null
  );
}

function toItem(card: Element, spec: Kind): FeedItem | null {
  const id = spec.idOf(card);
  if (id === null || !(card instanceof HTMLElement)) return null;
  const text = readText(card, spec);
  if (text === "") return null;
  return {
    id,
    element: card,
    text,
    truncated: findSeeMore(card, spec.isOwn) !== null,
    kind: spec.kind,
  };
}

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

// Clicks each card's own see-more control at most once, deduping by element
// identity so a comment matched by two overlapping selectors isn't double-clicked.
function expandKind(root: ParentNode, spec: Kind, clicked: Set<Element>): void {
  for (const card of root.querySelectorAll(spec.selector)) {
    const control = findSeeMore(card, spec.isOwn);
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

// Every selector this adapter depends on, listed one at a time so a census can
// name the exact one that stopped matching. The last few are sanity probes:
// they answer "is this even a rendered feed?" when all the real ones read zero.
const PROBES = [
  '[data-id^="urn:li:activity"]',
  '[data-urn^="urn:li:activity"]',
  '[data-id^="urn:li:comment"]',
  "article.comments-comment-entity",
  ".update-components-update-v2__commentary",
  ".update-components-text",
  ".feed-shared-update-v2__description",
  ".comments-comment-item__main-content",
  SEE_MORE_CLASS,
  "[data-id]",
  "[data-urn]",
  "main",
];

function idOf(el: Element): string {
  return el.getAttribute("data-id") ?? el.getAttribute("data-urn") ?? "";
}

/** "urn:li:activity:123" → "urn:li:activity": the part LinkedIn is free to rename. */
function prefixOf(id: string): string {
  return id.split(":").slice(0, 3).join(":");
}

function countIdPrefixes(root: ParentNode): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const el of root.querySelectorAll("[data-id], [data-urn]")) {
    const id = idOf(el);
    if (!id.startsWith("urn:")) continue;
    counts[prefixOf(id)] = (counts[prefixOf(id)] ?? 0) + 1;
  }
  return counts;
}

function diagnose(root: ParentNode): AdapterDiagnostics {
  const selectors: Record<string, number> = {};
  for (const probe of PROBES) selectors[probe] = root.querySelectorAll(probe).length;
  return { selectors, idPrefixes: countIdPrefixes(root) };
}

export const linkedInAdapter: SiteAdapter = {
  name: "linkedin-feed",
  findItems,
  diagnose,
  expandTruncated,
};
