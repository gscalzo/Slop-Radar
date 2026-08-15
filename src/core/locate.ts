/**
 * LLMs cannot reliably return character offsets, so the cloud judge returns
 * exact quotes instead and we locate them here (see ADR 0001).
 */

export interface Span {
  start: number;
  end: number;
}

// Lowercasing can change a string's length (e.g. "İ" → "i̇"), which would desync
// every offset after it; in that rare case, abstain rather than misplace spans.
function lengthSafeLower(value: string): string | null {
  const lower = value.toLowerCase();
  return lower.length === value.length ? lower : null;
}

function caseInsensitiveIndex(text: string, quote: string): number {
  const lowerText = lengthSafeLower(text);
  const lowerQuote = lengthSafeLower(quote);
  if (lowerText === null || lowerQuote === null) return -1;
  return lowerText.indexOf(lowerQuote);
}

export function locateQuote(text: string, quote: string): Span | null {
  if (quote === "") return null;
  let index = text.indexOf(quote);
  if (index < 0) index = caseInsensitiveIndex(text, quote);
  return index < 0 ? null : { start: index, end: index + quote.length };
}
