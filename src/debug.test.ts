import { describe, expect, it, vi } from "vitest";
import { createLogger, debugEnabled, formatCounts } from "./debug";

function storage(value: string | null): Pick<Storage, "getItem"> {
  return { getItem: () => value };
}

describe("debugEnabled", () => {
  it("is on when nothing is stored", () => {
    expect(debugEnabled(storage(null))).toBe(true);
  });

  it("is off only for the exact opt-out value", () => {
    expect(debugEnabled(storage("off"))).toBe(false);
    expect(debugEnabled(storage("on"))).toBe(true);
  });

  it("stays on when storage throws", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(debugEnabled(blocked)).toBe(true);
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

describe("createLogger", () => {
  it("prefixes every message", () => {
    const sink = vi.fn();
    createLogger(storage(null), sink)("scan", { found: 3 });
    expect(sink).toHaveBeenCalledWith("[slop-radar]", "scan", { found: 3 });
  });

  it("says nothing when disabled", () => {
    const sink = vi.fn();
    createLogger(storage("off"), sink)("scan");
    expect(sink).not.toHaveBeenCalled();
  });
});
