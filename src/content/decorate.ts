import type { Tier } from "../core/types";

export interface DecorationView {
  tier: Tier | null;
  partial: boolean;
  compact?: boolean;
  basis?: "model" | "patterns";
}

const COLORS: Record<Tier, string> = {
  green: "#1a7f37",
  yellow: "#b58900",
  red: "#c62828",
};

const BADGE_TEXT: Record<Tier, string> = {
  green: "AI tells: low",
  yellow: "AI tells: medium",
  red: "AI tells: high",
};

const BADGE_CLASS = "aitm-badge";

const MODEL_TITLE = "Verdict from model analysis";
const ESTIMATE_TITLE = "Pattern-based estimate — configure a model in Options for full analysis";

export function badgeLabel(view: DecorationView): string {
  const base = view.tier ? BADGE_TEXT[view.tier] : "AI tells: n/a";
  const approximated = view.tier !== null && view.basis !== "model";
  const withApprox = approximated ? `${base} ≈` : base;
  return view.partial ? `${withApprox} ◐` : withApprox;
}

function badgeTitle(view: DecorationView): string {
  return view.basis === "model" ? MODEL_TITLE : ESTIMATE_TITLE;
}

function ensureBadge(el: HTMLElement): HTMLButtonElement {
  const existing = el.querySelector<HTMLButtonElement>(`.${BADGE_CLASS}`);
  if (existing) return existing;
  const badge = el.ownerDocument.createElement("button");
  badge.className = BADGE_CLASS;
  badge.style.cssText =
    "position:absolute;z-index:10;font:600 11px/1.6 sans-serif;" +
    "border-radius:12px;border:none;color:#fff;cursor:pointer;";
  el.appendChild(badge);
  return badge;
}

function applyBadgeStyle(badge: HTMLButtonElement, compact?: boolean): void {
  if (compact) {
    badge.style.top = "4px";
    badge.style.right = "4px";
    badge.style.fontSize = "10px";
    badge.style.padding = "0 8px";
  } else {
    badge.style.top = "8px";
    badge.style.right = "8px";
    badge.style.fontSize = "11px";
    badge.style.padding = "1px 10px";
  }
}

function applyOutline(el: HTMLElement, tier: Tier | null, compact?: boolean): void {
  if (tier) {
    const width = compact ? "2px" : "3px";
    const offset = compact ? "-2px" : "-3px";
    el.style.outline = `${width} solid ${COLORS[tier]}`;
    el.style.outlineOffset = offset;
  } else {
    el.style.outline = "";
    el.style.outlineOffset = "";
  }
}

function ensurePositioned(el: HTMLElement): void {
  const position = el.ownerDocument.defaultView?.getComputedStyle(el).position ?? "";
  if (position === "" || position === "static") el.style.position = "relative";
}

/** Remove any decoration previously applied to a card (badge, outline, tier marker). */
export function clearDecoration(el: HTMLElement): void {
  el.querySelector(`.${BADGE_CLASS}`)?.remove();
  applyOutline(el, null);
  delete el.dataset.aitmTier;
}

/**
 * Border + badge for one post card. Idempotent: LinkedIn re-renders wipe
 * inline styles, so callers re-invoke this freely on every scan.
 */
export function decoratePost(el: HTMLElement, view: DecorationView, onOpen: () => void): void {
  ensurePositioned(el);
  applyOutline(el, view.tier, view.compact);
  const badge = ensureBadge(el);
  // Rebind on every call: the caller's state may have been rebuilt (e.g. after
  // a "…see more" expansion), and a listener bound only at creation would keep
  // opening a report for the old text.
  badge.onclick = (event): void => {
    event.stopPropagation();
    onOpen();
  };
  badge.style.background = view.tier ? COLORS[view.tier] : "#757575";
  badge.textContent = badgeLabel(view);
  badge.title = badgeTitle(view);
  applyBadgeStyle(badge, view.compact);
  el.dataset.aitmTier = view.tier ?? "none";
}
