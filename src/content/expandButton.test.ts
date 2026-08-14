// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createExpandButton, updateExpandButton } from "./expandButton";

describe("createExpandButton", () => {
  it("creates a hidden, unattached button with the correct class", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.className).toBe("aitm-expand-all");
    expect(button.style.display).toBe("none");
    expect(document.body.contains(button)).toBe(false);
  });

  it("has fixed positioning and pill styling", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    expect(button.style.position).toBe("fixed");
    expect(button.style.bottom).toBe("24px");
    expect(button.style.right).toBe("24px");
    expect(button.style.zIndex).toBe("2147483645");
    expect(button.style.borderRadius).toBe("16px");
    expect(button.style.border).toMatch(/none/);
    expect(button.style.backgroundColor).toBe("#0a66c2");
    expect(button.style.color).toBe("#fff");
    expect(button.style.cursor).toBe("pointer");
  });

  it("fires onClick on click", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    button.click();
    expect(onClick).toHaveBeenCalledOnce();

    button.click();
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe("updateExpandButton", () => {
  it("shows the button with correct label when truncatedCount > 0", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    updateExpandButton(button, 3);

    expect(button.style.display).toBe("block");
    expect(button.textContent).toBe("Expand 3 clamped ◐");
  });

  it("hides the button when truncatedCount is 0", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    updateExpandButton(button, 5);
    expect(button.style.display).toBe("block");

    updateExpandButton(button, 0);
    expect(button.style.display).toBe("none");
  });

  it("hides the button when truncatedCount is negative", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    updateExpandButton(button, -1);
    expect(button.style.display).toBe("none");
  });

  it("sets the title tooltip", () => {
    const onClick = vi.fn();
    const button = createExpandButton(document, onClick);

    updateExpandButton(button, 1);

    expect(button.title).toBe('Click every "…see more" so full text can be analysed (Alt+Shift+E)');
  });
});
