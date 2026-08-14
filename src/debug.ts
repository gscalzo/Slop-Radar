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

export function createLogger(
  storage: Pick<Storage, "getItem">,
  sink: (...args: unknown[]) => void,
): (...args: unknown[]) => void {
  return (...args) => {
    if (debugEnabled(storage)) sink(PREFIX, ...args);
  };
}
