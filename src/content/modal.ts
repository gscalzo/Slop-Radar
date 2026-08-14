import type { AbstainReason, Tier } from "../core/types";

export interface HighlightSpan {
  start: number;
  end: number;
  label: string;
}

export interface ReportItem {
  label: string;
  excerpt: string;
  /** Offset in the post text, or null when a judge quote could not be located. */
  start: number | null;
  source: "pattern" | "judge";
}

export interface ReportViewModel {
  tier: Tier | null;
  abstain?: AbstainReason;
  partial: boolean;
  density: number;
  words: number;
  likelihood?: number;
  judgeSummary?: string;
  text: string;
  /** Sorted by start; overlaps are resolved first-wins while rendering. */
  spans: HighlightSpan[];
  items: ReportItem[];
}

const TIER_TEXT: Record<Tier, string> = {
  green: "Low AI-tell density",
  yellow: "Medium AI-tell density",
  red: "High AI-tell density",
};

const ABSTAIN_TEXT: Record<AbstainReason, string> = {
  "too-short": "Post is too short for a meaningful read.",
  "non-latin": "Post is mostly non-Latin text; the pattern set is English-tuned.",
};

const STYLE = `
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 2147483646;
    display: flex; align-items: center; justify-content: center; }
  .panel { background: #fff; color: #222; max-width: 640px; width: calc(100% - 48px);
    max-height: 80vh; overflow: auto; border-radius: 8px; padding: 20px 24px;
    font: 14px/1.5 sans-serif; }
  h2 { margin: 0 0 4px; font-size: 18px; }
  .meta { color: #666; margin-bottom: 12px; }
  .disclaimer { color: #666; font-style: italic; margin-top: 12px; }
  .text { white-space: pre-wrap; background: #f6f6f6; border-radius: 6px; padding: 12px;
    margin-bottom: 12px; }
  mark { background: #ffe08a; border-radius: 2px; }
  ol { padding-left: 20px; } li { margin-bottom: 6px; }
  code { background: #f0f0f0; padding: 0 4px; border-radius: 3px; }
  .close { float: right; border: none; background: none; font-size: 18px; cursor: pointer; }
`;

function headline(vm: ReportViewModel): string {
  if (vm.tier) return TIER_TEXT[vm.tier];
  return vm.abstain ? `No verdict — ${ABSTAIN_TEXT[vm.abstain]}` : "No verdict";
}

function metaLine(vm: ReportViewModel): string {
  const parts = [`${vm.density} tell-weight per 100 words`, `${vm.words} words`];
  if (vm.likelihood !== undefined) parts.push(`model likelihood ${Math.round(vm.likelihood * 100)}%`);
  else if (vm.tier) parts.push("pattern-only estimate — no model configured");
  if (vm.partial) parts.push("partial text — post was truncated");
  return parts.join(" · ");
}

function renderHighlighted(doc: Document, text: string, spans: HighlightSpan[]): HTMLElement {
  const box = doc.createElement("div");
  box.className = "text";
  let pos = 0;
  for (const span of spans) {
    if (span.start < pos || span.end > text.length) continue;
    box.appendChild(doc.createTextNode(text.slice(pos, span.start)));
    const mark = doc.createElement("mark");
    mark.textContent = text.slice(span.start, span.end);
    mark.title = span.label;
    box.appendChild(mark);
    pos = span.end;
  }
  box.appendChild(doc.createTextNode(text.slice(pos)));
  return box;
}

function renderItem(doc: Document, item: ReportItem): HTMLElement {
  const li = doc.createElement("li");
  const code = doc.createElement("code");
  code.textContent = item.excerpt;
  li.appendChild(code);
  const where = item.start === null ? "not located" : `at char ${item.start}`;
  const source = item.source === "judge" ? "model" : "pattern";
  li.appendChild(doc.createTextNode(` — ${item.label} (${source}, ${where})`));
  return li;
}

function renderItems(doc: Document, items: ReportItem[]): HTMLElement {
  const list = doc.createElement("ol");
  for (const item of items) list.appendChild(renderItem(doc, item));
  return list;
}

function renderPanel(doc: Document, vm: ReportViewModel, close: () => void): HTMLElement {
  const panel = doc.createElement("div");
  panel.className = "panel";
  const closeBtn = doc.createElement("button");
  closeBtn.className = "close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", close);
  panel.appendChild(closeBtn);
  const title = doc.createElement("h2");
  title.textContent = headline(vm);
  panel.appendChild(title);
  const meta = doc.createElement("div");
  meta.className = "meta";
  meta.textContent = metaLine(vm);
  panel.appendChild(meta);
  if (vm.judgeSummary) {
    const summary = doc.createElement("p");
    summary.textContent = vm.judgeSummary;
    panel.appendChild(summary);
  }
  panel.appendChild(renderHighlighted(doc, vm.text, vm.spans));
  panel.appendChild(renderItems(doc, vm.items));
  const disclaimer = doc.createElement("p");
  disclaimer.className = "disclaimer";
  disclaimer.textContent =
    "This meter measures AI-typical patterns, not authorship. Humans write like this too.";
  panel.appendChild(disclaimer);
  return panel;
}

/** Shadow-DOM report overlay. Returns the host element (already appended). */
export function openReportModal(doc: Document, vm: ReportViewModel): HTMLElement {
  const host = doc.createElement("div");
  host.className = "aitm-modal-host";
  const shadow = host.attachShadow({ mode: "open" });

  function close(): void {
    host.remove();
    doc.removeEventListener("keydown", onKey);
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") close();
  }

  const style = doc.createElement("style");
  style.textContent = STYLE;
  shadow.appendChild(style);
  const backdrop = doc.createElement("div");
  backdrop.className = "backdrop";
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.appendChild(renderPanel(doc, vm, close));
  shadow.appendChild(backdrop);
  doc.addEventListener("keydown", onKey);
  doc.body.appendChild(host);
  return host;
}
