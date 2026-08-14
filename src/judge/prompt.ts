import distilledSnapshot from "../../skills/humanizer/DISTILLED.md";

/**
 * The per-post judge runs on a compact DETECTION rubric distilled from the
 * humanizer skill, not on the full ~30KB rewriting skill (ADR 0009):
 *
 *   - skills/humanizer/SKILL.md — the upstream skill, vendored verbatim
 *     (provenance in UPSTREAM.json); input to distillation, never sent per post.
 *   - skills/humanizer/DISTILLED.md — the bundled distilled snapshot (below).
 *   - config.distilledSkill — a fresher distillation produced at runtime by
 *     Options → Update skill from GitHub (download → distill with a stronger
 *     model → store).
 *   - config.skillText — a user override that beats both.
 *
 * The judging preamble and JSON output contract are code-owned and always
 * wrap the rubric, so no update or edit can break parsing.
 */

const JUDGING_PREAMBLE = [
  "You are a judge, not an editor. The reference below is a detection rubric",
  "distilled from the humanizer skill — a catalogue of the signs of AI-generated",
  "writing. Read the post you are given and estimate how strongly it exhibits",
  "those signs; do NOT rewrite anything. You are a pattern meter, not an",
  "authorship oracle: humans use these patterns too, so weigh density and",
  "combination, and be conservative with text that has genuine specifics or",
  "personal texture. Calibrate likelihood: below 0.35 reads mostly human;",
  "0.35–0.7 noticeably AI-patterned; above 0.7 dense and formulaic.",
  "\n\n--- DETECTION RUBRIC ---\n",
].join(" ");

const OUTPUT_CONTRACT = [
  "Reply with ONLY a JSON object of the shape",
  '{"likelihood": <number 0..1>, "summary": "<one sentence>",',
  ' "phrases": [{"quote": "<EXACT substring copied from the post>", "reason": "<why>"}]}.',
  "Include at most 10 phrases; every quote must be copied verbatim from the post.",
].join(" ");

function body(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

/** The bundled distilled snapshot, frontmatter stripped. */
export const DEFAULT_SKILL_BODY = body(distilledSnapshot);

/** Effective default rubric: the runtime-distilled copy if present, else the bundled snapshot. */
export function defaultRubric(distilledSkill: string): string {
  return body(distilledSkill) || DEFAULT_SKILL_BODY;
}

export interface RubricConfig {
  /** User override; empty = track the default. */
  skillText: string;
  /** Runtime-distilled rubric from the last skill update; empty = bundled snapshot. */
  distilledSkill: string;
}

/** Full system prompt: judging preamble + effective rubric + output contract. */
export function buildSystemPrompt(config: RubricConfig): string {
  const rubric = body(config.skillText) || defaultRubric(config.distilledSkill);
  return `${JUDGING_PREAMBLE}\n${rubric}\n\n${OUTPUT_CONTRACT}`;
}
