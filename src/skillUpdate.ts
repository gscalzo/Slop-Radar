import type { RubricSource } from "./config";

export interface SkillSource {
  repo: string;
  repoUrl: string;
  rawUrl: string;
  /** Text the real document always contains; an error page never does. */
  marker: RegExp;
}

export const SKILL_SOURCES: Record<RubricSource, SkillSource> = {
  "ai-writing-patterns": {
    repo: "gscalzo/gio-skills",
    repoUrl: "https://github.com/gscalzo/gio-skills",
    rawUrl:
      "https://raw.githubusercontent.com/gscalzo/gio-skills/main/skills/ai-writing-patterns/SKILL.md",
    marker: /ai.writing.patterns/i,
  },
  humanizer: {
    repo: "blader/humanizer",
    repoUrl: "https://github.com/blader/humanizer",
    rawUrl: "https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md",
    marker: /humanizer/i,
  },
};

export class SkillUpdateError extends Error {}

// The real skill is substantial, names itself, and opens with frontmatter or a
// heading — enough to tell it from an error page or a redirect.
function looksLikeSkill(text: string, source: SkillSource): boolean {
  return (
    text.length >= 500 &&
    source.marker.test(text) &&
    (text.startsWith("---") || text.startsWith("#"))
  );
}

export async function fetchLatestSkill(
  source: RubricSource,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const skillSource = SKILL_SOURCES[source];
  const response = await fetchFn(skillSource.rawUrl);
  if (!response.ok) {
    throw new SkillUpdateError(`skill download failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  if (!looksLikeSkill(text.trim(), skillSource)) {
    throw new SkillUpdateError(`downloaded file does not look like the ${source} skill`);
  }
  return text;
}
