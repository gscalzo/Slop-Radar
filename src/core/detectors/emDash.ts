import type { Detector } from "../types";
import { regexFlags } from "../regexFlags";

const ID = "em-dash";

/** Em dashes, plus en dashes spaced as em dashes. Weight is low: humans use them too. */
export const emDash: Detector = (text) => [
  ...regexFlags(text, /—/g, ID, "Em dash", 1),
  ...regexFlags(text, / – /g, ID, "Spaced en dash used as em dash", 1),
];
