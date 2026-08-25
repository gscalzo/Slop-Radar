import type { RubricSource } from "../config";
import awpSnapshot from "../../skills/ai-writing-patterns/DISTILLED.md";
import humanizerSnapshot from "../../skills/humanizer/DISTILLED.md";

/**
 * The per-post judge runs on a compact DETECTION rubric distilled from the
 * selected rubric source (ADR 0009, ADR 0013, ADR 0014). Two sources ship,
 * chosen by config.rubricSource:
 *
 *   - skills/ai-writing-patterns/ — the tiered 58-pattern catalog from
 *     gscalzo/gio-skills (default).
 *   - skills/humanizer/ — the classic blader/humanizer skill.
 *
 * Each source directory holds the upstream SKILL.md vendored verbatim
 * (provenance in UPSTREAM.json; input to distillation, never sent per post)
 * and a bundled DISTILLED.md snapshot. Runtime copies:
 *
 *   - config.distilledSkill — a fresher distillation produced at runtime by
 *     Options → Update skill from GitHub (download → distill with a stronger
 *     model → store). It applies only while config.distilledSource matches
 *     the selected source.
 *   - config.skillText — a user override that beats everything.
 *
 * The judging preamble is per-source (each rubric keeps the preamble it was
 * measured with); the JSON output contract is code-owned and always wraps the
 * rubric, so no update or edit can break parsing.
 */

const PREAMBLES: Record<RubricSource, string> = {
  "ai-writing-patterns": [
    "You are a judge, not an editor. The reference below is a detection rubric",
    "distilled from the ai-writing-patterns catalogue of the signs of AI-generated",
    "writing. Read the post you are given and estimate how strongly it exhibits",
    "those signs; do NOT rewrite anything. Patterns are tiered: a single",
    "fingerprint is near-proof, strong tells (✱) weigh heavily, moderate tells",
    "count only in clusters, weak tells merely corroborate. You are a pattern",
    "meter, not an authorship oracle: humans use these patterns too, so weigh",
    "density and combination, and be conservative with text that has genuine",
    "specifics or personal texture. Calibrate likelihood: below 0.35 reads mostly",
    "human; 0.35–0.6 noticeably AI-patterned; above 0.6 dense and formulaic.",
    "\n\n--- DETECTION RUBRIC ---\n",
  ].join(" "),
  humanizer: [
    "You are a judge, not an editor. The reference below is a detection rubric",
    "distilled from the humanizer skill — a catalogue of the signs of AI-generated",
    "writing. Read the post you are given and estimate how strongly it exhibits",
    "those signs; do NOT rewrite anything. You are a pattern meter, not an",
    "authorship oracle: humans use these patterns too, so weigh density and",
    "combination, and be conservative with text that has genuine specifics or",
    "personal texture. Calibrate likelihood: below 0.35 reads mostly human;",
    "0.35–0.6 noticeably AI-patterned; above 0.6 dense and formulaic.",
    "\n\n--- DETECTION RUBRIC ---\n",
  ].join(" "),
};

const OUTPUT_CONTRACT = [
  "Reply with ONLY a JSON object of the shape",
  '{"likelihood": <number 0..1>, "summary": "<one sentence>",',
  ' "phrases": [{"quote": "<EXACT substring copied from the post>", "reason": "<why>"}]}.',
  "Include at most 10 phrases; every quote must be copied verbatim from the post.",
].join(" ");

function body(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

/** The bundled distilled snapshots, frontmatter stripped. */
export const DEFAULT_SKILL_BODIES: Record<RubricSource, string> = {
  "ai-writing-patterns": body(awpSnapshot),
  humanizer: body(humanizerSnapshot),
};

/**
 * Effective default rubric for a source: its runtime-distilled copy when that
 * distillation came from the same source, else its bundled snapshot.
 */
export function defaultRubric(
  source: RubricSource,
  distilledSkill: string,
  distilledSource: string,
): string {
  const distilled = distilledSource === source ? body(distilledSkill) : "";
  return distilled || DEFAULT_SKILL_BODIES[source];
}

export interface RubricConfig {
  /** User override; empty = track the default. */
  skillText: string;
  /** Runtime-distilled rubric from the last skill update; empty = bundled snapshot. */
  distilledSkill: string;
  /** Which source produced distilledSkill; it only applies while it matches. */
  distilledSource: string;
  /** The selected rubric source. */
  rubricSource: RubricSource;
}

/** Full system prompt: the source's judging preamble + effective rubric + output contract. */
export function buildSystemPrompt(config: RubricConfig): string {
  const rubric =
    body(config.skillText) ||
    defaultRubric(config.rubricSource, config.distilledSkill, config.distilledSource);
  return `${PREAMBLES[config.rubricSource]}\n${rubric}\n\n${OUTPUT_CONTRACT}`;
}
