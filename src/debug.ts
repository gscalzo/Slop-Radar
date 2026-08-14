/**
 * Console logging for the content script. On by default, because the only way
 * to install this is unpacked — a build you loaded yourself is a build you are
 * debugging. Silence it from the page console with:
 *
 *   localStorage.slopRadarDebug = "off"
 */

const PREFIX = "[slop-radar]";

export function debugEnabled(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem("slopRadarDebug") !== "off";
  } catch {
    // Some pages block storage access; logging is not worth an exception.
    return true;
  }
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

export function createLogger(
  storage: Pick<Storage, "getItem">,
  sink: (...args: unknown[]) => void,
): (...args: unknown[]) => void {
  return (...args) => {
    if (debugEnabled(storage)) sink(PREFIX, ...args);
  };
}
