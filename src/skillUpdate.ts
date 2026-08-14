export const SKILL_SOURCE = {
  repo: "blader/humanizer",
  repoUrl: "https://github.com/blader/humanizer",
  rawUrl: "https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md",
} as const;

export class SkillUpdateError extends Error {}

// The real skill is substantial, names itself, and opens with frontmatter or a
// heading — enough to tell it from an error page or a redirect.
function looksLikeSkill(text: string): boolean {
  return (
    text.length >= 500 &&
    /humanizer/i.test(text) &&
    (text.startsWith("---") || text.startsWith("#"))
  );
}

export async function fetchLatestSkill(fetchFn: typeof fetch = fetch): Promise<string> {
  const response = await fetchFn(SKILL_SOURCE.rawUrl);
  if (!response.ok) {
    throw new SkillUpdateError(`skill download failed: HTTP ${response.status}`);
  }
  const text = await response.text();
  if (!looksLikeSkill(text.trim())) {
    throw new SkillUpdateError("downloaded file does not look like the humanizer skill");
  }
  return text;
}
