import { describe, expect, it, vi } from "vitest";
import { createLog, distinct, formatCounts, verboseEnabled } from "./debug";

function storage(value: string | null): Pick<Storage, "getItem"> {
  return { getItem: () => value };
}

describe("verboseEnabled", () => {
  it("is off unless explicitly switched on", () => {
    expect(verboseEnabled(storage(null))).toBe(false);
    expect(verboseEnabled(storage("off"))).toBe(false);
    expect(verboseEnabled(storage("yes"))).toBe(false);
    expect(verboseEnabled(storage("on"))).toBe(true);
  });

  it("stays off when storage throws", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(verboseEnabled(blocked)).toBe(false);
  });
});

describe("createLog", () => {
  it("keeps detail quiet by default but always reports problems", () => {
    const sink = vi.fn();
    const log = createLog(storage(null), sink);

    log.detail("scan", { found: 3 });
    expect(sink).not.toHaveBeenCalled();

    log.problem("no verdicts");
    expect(sink).toHaveBeenCalledWith("[slop-radar]", "no verdicts");
  });

  it("emits detail once switched on", () => {
    const sink = vi.fn();
    createLog(storage("on"), sink).detail("scan");
    expect(sink).toHaveBeenCalledWith("[slop-radar]", "scan");
  });
});

describe("distinct", () => {
  it("reports each message once, however often it recurs", () => {
    const report = vi.fn();
    const once = distinct(report);

    once("no API key set");
    once("no API key set");
    once("HTTP 401");

    expect(report.mock.calls).toEqual([["no API key set"], ["HTTP 401"]]);
  });
});

describe("formatCounts", () => {
  it("flattens counts onto one line", () => {
    expect(formatCounts({ "[data-id]": 0, main: 1 })).toBe("[data-id]=0  main=1");
  });

  it("says so when there is nothing to report", () => {
    expect(formatCounts({})).toBe("(none)");
  });
});
