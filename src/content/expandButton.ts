/** Floating "expand all clamped items" button for the feed. */

const STYLE = [
  "position:fixed",
  "bottom:24px",
  "right:24px",
  "z-index:2147483645",
  "font:600 12px sans-serif",
  "padding:6px 14px",
  "border-radius:16px",
  "border:none",
  "background:#0a66c2",
  "color:#fff",
  "cursor:pointer",
  "box-shadow:0 2px 8px rgba(0,0,0,.3)",
  "display:none",
].join(";");

const TITLE = 'Click every "…see more" so full text can be analysed (Alt+Shift+E)';

/** Creates the button hidden and unattached; the caller appends and updates it. */
export function createExpandButton(doc: Document, onClick: () => void): HTMLButtonElement {
  const button = doc.createElement("button");
  button.className = "aitm-expand-all";
  button.style.cssText = STYLE;
  button.title = TITLE;
  button.onclick = (): void => onClick();
  return button;
}

/** Shows the button with a count while anything is still clamped; hides it otherwise. */
export function updateExpandButton(button: HTMLButtonElement, truncatedCount: number): void {
  button.style.display = truncatedCount > 0 ? "block" : "none";
  if (truncatedCount > 0) button.textContent = `Expand ${truncatedCount} clamped ◐`;
}
