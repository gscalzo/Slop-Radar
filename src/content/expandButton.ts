/**
 * Floating "expand all clamped items" button for the feed.
 */

/**
 * Creates a hidden, unattached expand-all button.
 * Caller must append to DOM and call updateExpandButton to show.
 *
 * @param doc The document in which to create the button
 * @param onClick Callback fired on each click
 * @returns A configured but hidden button element
 */
export function createExpandButton(doc: Document, onClick: () => void): HTMLButtonElement {
  const button = doc.createElement("button");
  button.className = "aitm-expand-all";

  button.style.cssText =
    "position:fixed;" +
    "bottom:24px;" +
    "right:24px;" +
    "z-index:2147483645;" +
    "font:600 12px sans-serif;" +
    "padding:6px 14px;" +
    "border-radius:16px;" +
    "border:none;" +
    "background:#0a66c2;" +
    "color:#fff;" +
    "cursor:pointer;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.3);" +
    "display:none;";

  button.onclick = (): void => {
    onClick();
  };

  return button;
}

/**
 * Updates button visibility and text based on truncated item count.
 * Shows the button with count if count > 0; hides if count <= 0.
 *
 * @param button The button element to update
 * @param truncatedCount Number of clamped items awaiting expansion
 */
export function updateExpandButton(button: HTMLButtonElement, truncatedCount: number): void {
  if (truncatedCount > 0) {
    button.style.display = "block";
    button.textContent = `Expand ${truncatedCount} clamped ◐`;
  } else {
    button.style.display = "none";
  }

  button.title = 'Click every "…see more" so full text can be analysed (Alt+Shift+E)';
}
