// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { openReportModal, type ReportItem, type ReportViewModel } from "./modal";

function vm(overrides: Partial<ReportViewModel> = {}): ReportViewModel {
  return {
    tier: "red",
    partial: false,
    density: 8.2,
    words: 120,
    text: "Let's delve into growth — it matters.",
    spans: [
      { start: 6, end: 11, label: "Stock AI phrase: “delve”" },
      { start: 24, end: 25, label: "Em dash" },
    ],
    items: [
      {
        label: "Stock AI phrase: “delve”",
        excerpt: "delve",
        start: 6,
        source: "pattern",
        detector: "ai-vocabulary",
      },
      { label: "formulaic emphasis", excerpt: "it matters", start: null, source: "judge" },
    ],
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("openReportModal", () => {
  it("renders the verdict headline and meta into a shadow root", () => {
    const host = openReportModal(document, vm({ likelihood: 0.8 }));
    const shadow = host.shadowRoot!;
    expect(shadow.querySelector("h2")!.textContent).toBe("High AI-tell density");
    expect(shadow.querySelector(".meta")!.textContent).toContain("model likelihood 80%");
    expect(document.body.contains(host)).toBe(true);
  });

  it("marks verdicts without a model result as pattern-only estimates", () => {
    const shadow = openReportModal(document, vm()).shadowRoot!;
    expect(shadow.querySelector(".meta")!.textContent).toContain("pattern-only estimate");
  });

  it("omits the pattern-only note when abstaining", () => {
    const shadow = openReportModal(document, vm({ tier: null, abstain: "too-short" })).shadowRoot!;
    expect(shadow.querySelector(".meta")!.textContent).not.toContain("pattern-only estimate");
  });

  it("highlights each span with its label as a tooltip", () => {
    const shadow = openReportModal(document, vm()).shadowRoot!;
    const marks = [...shadow.querySelectorAll("mark")];
    expect(marks.map((m) => m.textContent)).toEqual(["delve", "—"]);
    expect(marks[0]!.title).toContain("delve");
  });

  it("lists flags including unlocated judge quotes", () => {
    const shadow = openReportModal(document, vm()).shadowRoot!;
    const items = [...shadow.querySelectorAll("li")].map((li) => li.textContent);
    expect(items[0]).toContain("at char 6");
    expect(items[1]).toContain("not located");
  });

  it("heads each pattern with what it is and why it counts", () => {
    const shadow = openReportModal(document, vm()).shadowRoot!;
    const headings = [...shadow.querySelectorAll("h3")].map((h) => h.textContent);
    const why = [...shadow.querySelectorAll(".why")].map((p) => p.textContent);

    expect(headings[0]).toBe("Stock LLM vocabulary");
    expect(why[0]).toContain("appears far more often in model output");
    expect(headings).toContain("Flagged by the model");
  });

  it("groups repeats of one pattern under a single explanation, with a count", () => {
    const dash = (start: number): ReportItem => ({
      label: "Em dash",
      excerpt: "—",
      start,
      source: "pattern",
      detector: "em-dash",
    });
    const shadow = openReportModal(
      document,
      vm({ items: [dash(24), dash(30), dash(35)] }),
    ).shadowRoot!;

    expect([...shadow.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["Em dashes (3)"]);
    expect(shadow.querySelectorAll(".why")).toHaveLength(1);
    expect(shadow.querySelectorAll("li")).toHaveLength(3);
  });

  it("says nothing about the model when the model found nothing", () => {
    const shadow = openReportModal(
      document,
      vm({ items: [{ label: "Em dash", excerpt: "—", start: 24, source: "pattern", detector: "em-dash" }] }),
    ).shadowRoot!;
    expect([...shadow.querySelectorAll("h3")].map((h) => h.textContent)).not.toContain(
      "Flagged by the model",
    );
  });

  it("skips overlapping spans instead of corrupting the text", () => {
    const shadow = openReportModal(
      document,
      vm({ spans: [{ start: 6, end: 11, label: "a" }, { start: 8, end: 14, label: "b" }] }),
    ).shadowRoot!;
    const text = shadow.querySelector(".text")!;
    expect(text.textContent).toBe("Let's delve into growth — it matters.");
    expect(text.querySelectorAll("mark")).toHaveLength(1);
  });

  it("explains abstentions and marks partial analyses", () => {
    const shadow = openReportModal(
      document,
      vm({ tier: null, abstain: "too-short", partial: true }),
    ).shadowRoot!;
    expect(shadow.querySelector("h2")!.textContent).toContain("too short");
    expect(shadow.querySelector(".meta")!.textContent).toContain("truncated");
  });

  it("closes on backdrop click and on Escape", () => {
    const host = openReportModal(document, vm());
    (host.shadowRoot!.querySelector(".backdrop") as HTMLElement).click();
    expect(document.body.contains(host)).toBe(false);

    const second = openReportModal(document, vm());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.body.contains(second)).toBe(false);
  });
});
