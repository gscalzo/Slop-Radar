import type { FeedItem, SiteAdapter } from "./types";

// LinkedIn's class names are obfuscated and churn; data-* URN attributes are
// the stable anchors. All selectors live here and nowhere else.
const POST_SELECTOR = '[data-id^="urn:li:activity"], [data-urn^="urn:li:activity"]';
// Comments are rendered as their own cards but nested inside a post's card.
const COMMENT_SELECTOR = '[data-id^="urn:li:comment"], article.comments-comment-entity';

const TEXT_SELECTORS = [
  ".update-components-update-v2__commentary",
  ".update-components-text",
  ".feed-shared-update-v2__description",
];

const COMMENT_TEXT_SELECTORS = [".comments-comment-item__main-content", ".update-components-text"];

const SEE_MORE_CLASS = ".feed-shared-inline-show-more-text__see-more-less-toggle";
// Anchored: the clamp toggle reads exactly "…see more". A substring match would
// also hit unrelated buttons like "See more comments" and flag full posts as clamped.
const SEE_MORE_TEXT = /^…?\s*see more$/i;

function firstMatch(scope: Element, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = scope.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// A post's text candidate must not actually belong to one of its nested
// comments, so skip any match sitting inside a comment container.
function findPostTextElement(post: Element): Element | null {
  for (const selector of TEXT_SELECTORS) {
    for (const el of post.querySelectorAll(selector)) {
      if (!el.closest(COMMENT_SELECTOR)) return el;
    }
  }
  return null;
}

function normalizeText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/…?\s*see more\s*$/i, "")
    .trim();
}

// Finds the scope's own see-more control: the clamp toggle class first, else
// a button whose trimmed text matches the anchored see-more regex.
function findSeeMore(scope: Element, isOwn: (el: Element) => boolean): Element | null {
  const toggle = [...scope.querySelectorAll(SEE_MORE_CLASS)].find(isOwn);
  if (toggle) return toggle;
  return (
    [...scope.querySelectorAll("button")].find(
      (b) => isOwn(b) && SEE_MORE_TEXT.test((b.textContent ?? "").trim()),
    ) ?? null
  );
}

function isTruncated(scope: Element, isOwn: (el: Element) => boolean): boolean {
  return findSeeMore(scope, isOwn) !== null;
}

// A see-more toggle inside a nested comment belongs to that comment, not the post.
function notInNestedComment(el: Element): boolean {
  return el.closest(COMMENT_SELECTOR) === null;
}

function isPostTruncated(post: Element): boolean {
  return isTruncated(post, notInNestedComment);
}

function isCommentTruncated(comment: Element): boolean {
  return isTruncated(comment, () => true);
}

function buildItem(
  el: HTMLElement,
  id: string,
  kind: FeedItem["kind"],
  text: string,
  truncated: boolean,
): FeedItem | null {
  if (text === "") return null;
  return { id, element: el, text, truncated, kind };
}

function withPostText(el: HTMLElement, id: string): FeedItem | null {
  const text = normalizeText(findPostTextElement(el)?.textContent ?? "");
  return buildItem(el, id, "post", text, isPostTruncated(el));
}

function withCommentText(el: HTMLElement, id: string): FeedItem | null {
  const text = normalizeText(firstMatch(el, COMMENT_TEXT_SELECTORS)?.textContent ?? "");
  return buildItem(el, id, "comment", text, isCommentTruncated(el));
}

function toPost(el: Element): FeedItem | null {
  const id = el.getAttribute("data-id") ?? el.getAttribute("data-urn");
  if (!id || !(el instanceof HTMLElement)) return null;
  return withPostText(el, id);
}

function toComment(el: Element): FeedItem | null {
  const id = el.getAttribute("data-id");
  if (!id || !(el instanceof HTMLElement)) return null;
  return withCommentText(el, id);
}

function collect(
  root: ParentNode,
  selector: string,
  toItem: (el: Element) => FeedItem | null,
  seen: Set<string>,
  out: FeedItem[],
): void {
  for (const el of root.querySelectorAll(selector)) {
    const item = toItem(el);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
}

function findItems(root: ParentNode): FeedItem[] {
  const out: FeedItem[] = [];
  const seen = new Set<string>();
  collect(root, POST_SELECTOR, toPost, seen, out);
  collect(root, COMMENT_SELECTOR, toComment, seen, out);
  return out;
}

function clickIfElement(el: Element): void {
  if (el instanceof HTMLElement) el.click();
}

// Clicks each container's own see-more control at most once, deduping by
// element identity so a comment matched by two overlapping selectors isn't
// double-clicked.
function expandOwn(
  containers: Iterable<Element>,
  isOwn: (el: Element) => boolean,
  clicked: Set<Element>,
): void {
  for (const container of containers) {
    const control = findSeeMore(container, isOwn);
    if (!control || clicked.has(control)) continue;
    clicked.add(control);
    clickIfElement(control);
  }
}

function expandTruncated(root: ParentNode): number {
  const clicked = new Set<Element>();
  expandOwn(root.querySelectorAll(POST_SELECTOR), notInNestedComment, clicked);
  expandOwn(root.querySelectorAll(COMMENT_SELECTOR), () => true, clicked);
  return clicked.size;
}

export const linkedInAdapter: SiteAdapter = { name: "linkedin-feed", findItems, expandTruncated };
