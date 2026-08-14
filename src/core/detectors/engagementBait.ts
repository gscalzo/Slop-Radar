import type { Detector } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "engagement-bait";
const TAIL_CHARS = 250;

const BAIT =
  /(?:agree\?|thoughts\?+|what do you think\??|let that sink in\.?|♻️|repost (?:this|if)|follow (?:me|for more)|drop a comment)/gi;

/** Formula closers, only counted when they appear near the end of the post. */
export const engagementBait: Detector = (text) => {
  const tailStart = Math.max(0, text.length - TAIL_CHARS);
  return regexFlags(text, BAIT, ID, "Engagement-bait closer", 2).filter(
    (flag) => flag.start >= tailStart,
  );
};
