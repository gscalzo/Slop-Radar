import type { JudgeResult } from "./judge/types";

/** Content script → background: judge this post text. */
export interface JudgeRequestMessage {
  type: "aitm-judge";
  text: string;
  hash: string;
}

export type JudgeResponseMessage =
  | { ok: true; result: JudgeResult }
  | { ok: false; reason: string };

/** Background → content script: the user invoked the expand-truncated command. */
export interface ExpandRequestMessage {
  type: "aitm-expand";
}
