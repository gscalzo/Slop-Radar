// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { badgeLabel, clearDecoration, decoratePost } from "./decorate";

function card(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("decoratePost", () => {
  it("outlines the card in the tier colour and adds a badge", () => {
    const el = card();
    decoratePost(el, { tier: "red", partial: false }, () => {});
    expect(el.style.outline).toContain("#c62828");
    const badge = el.querySelector("button.aitm-badge")!;
    // basis omitted behaves like "patterns" — no judge ran, so it's an estimate.
    expect(badge.textContent).toBe("AI tells: high ≈");
    expect(el.dataset.aitmTier).toBe("red");
  });

  it("is idempotent — repeat calls keep a single badge and update it", () => {
    const el = card();
    decoratePost(el, { tier: "green", partial: false }, () => {});
    decoratePost(el, { tier: "yellow", partial: true }, () => {});
    expect(el.querySelectorAll(".aitm-badge")).toHaveLength(1);
    expect(el.querySelector(".aitm-badge")!.textContent).toBe("AI tells: medium ≈ ◐");
  });

  it("shows a grey no-verdict badge without an outline when abstaining", () => {
    const el = card();
    decoratePost(el, { tier: null, partial: false }, () => {});
    expect(el.style.outline).toBe("");
    expect(el.querySelector(".aitm-badge")!.textContent).toBe("AI tells: n/a");
  });

  it("opens the report when the badge is clicked", () => {
    const el = card();
    const onOpen = vi.fn();
    decoratePost(el, { tier: "green", partial: false }, onOpen);
    (el.querySelector(".aitm-badge") as HTMLButtonElement).click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("rebinds the click handler on re-decoration so the latest onOpen wins", () => {
    const el = card();
    const first = vi.fn();
    const second = vi.fn();
    decoratePost(el, { tier: "green", partial: false }, first);
    decoratePost(el, { tier: "green", partial: false }, second);
    (el.querySelector(".aitm-badge") as HTMLButtonElement).click();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("produces a 2px outline and compact badge styles in compact mode", () => {
    const el = card();
    decoratePost(el, { tier: "green", partial: false, compact: true }, () => {});
    expect(el.style.outline).toContain("2px");
    expect(el.style.outlineOffset).toBe("-2px");
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(badge.style.top).toBe("4px");
    expect(badge.style.right).toBe("4px");
    expect(badge.style.fontSize).toBe("10px");
    expect(badge.style.padding).toBe("0px 8px");
  });

  it("switches from compact to non-compact by updating the single badge", () => {
    const el = card();
    decoratePost(el, { tier: "red", partial: false, compact: true }, () => {});
    decoratePost(el, { tier: "red", partial: false, compact: false }, () => {});
    expect(el.querySelectorAll(".aitm-badge")).toHaveLength(1);
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(el.style.outline).toContain("3px");
    expect(el.style.outlineOffset).toBe("-3px");
    expect(badge.style.top).toBe("8px");
    expect(badge.style.right).toBe("8px");
    expect(badge.style.fontSize).toBe("11px");
    expect(badge.style.padding).toBe("1px 10px");
  });

  it("marks a pattern-only verdict with the ≈ suffix and the estimate tooltip", () => {
    const el = card();
    decoratePost(el, { tier: "yellow", partial: false, basis: "patterns" }, () => {});
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(badge.textContent).toBe("AI tells: medium ≈");
    expect(badge.title).toBe("Pattern-based estimate — configure a model in Options for full analysis");
  });

  it("gives a model verdict no suffix and the model tooltip", () => {
    const el = card();
    decoratePost(el, { tier: "yellow", partial: false, basis: "model" }, () => {});
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(badge.textContent).toBe("AI tells: medium");
    expect(badge.title).toBe("Verdict from model analysis");
  });

  it("treats an omitted basis like patterns, since no judge ran", () => {
    const el = card();
    decoratePost(el, { tier: "yellow", partial: false }, () => {});
    const badge = el.querySelector<HTMLButtonElement>("button.aitm-badge")!;
    expect(badge.textContent).toBe("AI tells: medium ≈");
    expect(badge.title).toBe("Pattern-based estimate — configure a model in Options for full analysis");
  });
});

describe("clearDecoration", () => {
  it("removes the badge, outline and tier marker", () => {
    const el = card();
    decoratePost(el, { tier: "red", partial: false }, () => {});
    clearDecoration(el);
    expect(el.querySelector(".aitm-badge")).toBeNull();
    expect(el.style.outline).toBe("");
    expect(el.dataset.aitmTier).toBeUndefined();
  });

  it("is a no-op on an undecorated card", () => {
    const el = card();
    expect(() => clearDecoration(el)).not.toThrow();
  });
});

describe("badgeLabel", () => {
  it("marks partial analyses", () => {
    expect(badgeLabel({ tier: "green", partial: true })).toBe("AI tells: low ≈ ◐");
  });

  it("adds no ≈ suffix for a model-basis verdict", () => {
    expect(badgeLabel({ tier: "green", partial: false, basis: "model" })).toBe("AI tells: low");
  });

  it("adds no ≈ suffix when there is no tier (abstention)", () => {
    expect(badgeLabel({ tier: null, partial: false })).toBe("AI tells: n/a");
  });
});
