export const SKILL_SOURCE = {
  repo: "blader/humanizer",
  repoUrl: "https://github.com/blader/humanizer",
  rawUrl: "https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md",
} as const;

export class SkillUpdateError extends Error {}

function validateSkillText(text: string): boolean {
  const trimmed = text.trim();

  // Must be at least 500 chars
  if (trimmed.length < 500) {
    return false;
  }

  // Must mention humanizer (case-insensitive)
  if (!/humanizer/i.test(trimmed)) {
    return false;
  }

  // Must start with frontmatter (---) or markdown heading (#)
  if (!trimmed.startsWith("---") && !trimmed.startsWith("#")) {
    return false;
  }

  return true;
}

export async function fetchLatestSkill(fetchFn: typeof fetch = fetch): Promise<string> {
  const response = await fetchFn(SKILL_SOURCE.rawUrl);
  if (!response.ok) {
    throw new SkillUpdateError(`skill download failed: HTTP ${response.status}`);
  }

  const text = await response.text();

  if (!validateSkillText(text)) {
    throw new SkillUpdateError("downloaded file does not look like the humanizer skill");
  }

  return text;
}
