/**
 * Console output for the content script and the worker, in two levels.
 *
 *   detail  — routine tracing (scans, per-post judge traffic). Off by default;
 *             switch it on from the page console with
 *             `localStorage.slopRadarDebug = "on"`.
 *   problem — something the user may need to act on: no verdicts, a dead
 *             extension context, a feed whose markup stopped matching. Always
 *             printed, and worth keeping short.
 */

const PREFIX = "[slop-radar]";

export function verboseEnabled(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem("slopRadarDebug") === "on";
  } catch {
    // Some pages block storage access; that is not worth an exception.
    return false;
  }
}

export interface Log {
  detail: (...args: unknown[]) => void;
  problem: (...args: unknown[]) => void;
}

export function createLog(
  storage: Pick<Storage, "getItem">,
  sink: (...args: unknown[]) => void,
): Log {
  return {
    detail: (...args) => {
      if (verboseEnabled(storage)) sink(PREFIX, ...args);
    },
    problem: (...args) => sink(PREFIX, ...args),
  };
}

/**
 * One post failing usually means every post is failing for the same reason, so
 * report each distinct message once rather than once per card.
 */
export function distinct(report: (message: string) => void): (message: string) => void {
  const seen = new Set<string>();
  return (message) => {
    if (seen.has(message)) return;
    seen.add(message);
    report(message);
  };
}

/**
 * "a=1  b=2" on one line. The console collapses objects behind a disclosure
 * triangle, which is exactly the data that goes missing when someone copies a
 * log into a bug report — so counts are logged as flat text instead.
 */
export function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return "(none)";
  return entries.map(([key, value]) => `${key}=${value}`).join("  ");
}
