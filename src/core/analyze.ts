import type { Detector, Flag } from "./types";
import { aiVocabulary } from "./detectors/aiVocabulary";
import { contrastTemplate } from "./detectors/contrastTemplate";
import { emDash } from "./detectors/emDash";
import { emojiBullets } from "./detectors/emojiBullets";
import { engagementBait } from "./detectors/engagementBait";
import { staccato } from "./detectors/staccato";
import { unicodeBold } from "./detectors/unicodeBold";

const DETECTORS: Detector[] = [
  emDash,
  contrastTemplate,
  aiVocabulary,
  emojiBullets,
  unicodeBold,
  engagementBait,
  staccato,
];

function dedupe(flags: Flag[]): Flag[] {
  const seen = new Map<string, Flag>();
  for (const flag of flags) {
    const key = `${flag.detector}:${flag.start}:${flag.end}`;
    if (!seen.has(key)) seen.set(key, flag);
  }
  return [...seen.values()];
}

/** Run every detector over the text; flags come back deduped and offset-sorted. */
export function analyze(text: string): Flag[] {
  const flags = DETECTORS.flatMap((detector) => detector(text));
  return dedupe(flags).sort((a, b) => a.start - b.start || a.end - b.end);
}
