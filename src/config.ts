export interface MeterConfig {
  /**
   * Whether the cloud judge is enabled at all. The model judge is the primary
   * analysis engine; heuristics always run and serve as the fallback when
   * disabled or unconfigured. Defaults to true, but the judge stays inert
   * until an API key is entered.
   */
  enabled: boolean;
  /** OpenAI-compatible API base, e.g. "https://api.openai.com/v1". */
  baseUrl: string;
  /** Model name as the provider knows it. */
  model: string;
  apiKey: string;
  /** Whether to check comments in addition to posts. */
  checkComments: boolean;
  /**
   * User override of the humanizer rubric sent to the judge. Empty string means
   * "track the default" — the downloaded upstream copy if present, else the
   * bundled skills/humanizer/SKILL.md snapshot (ADR 0006, ADR 0008).
   */
  skillText: string;
  /**
   * Latest upstream SKILL.md fetched at runtime via Options → Update skill from
   * GitHub. Empty string means none downloaded yet (use the bundled snapshot).
   */
  downloadedSkill: string;
  /**
   * Compact detection rubric distilled from downloadedSkill via distillModel.
   * Empty string means use bundled snapshot.
   */
  distilledSkill: string;
  /** Stronger model used to distill the skill into a compact rubric. */
  distillModel: string;
}

export const CONFIG_KEY = "aitmConfig";

export const DEFAULT_CONFIG: MeterConfig = {
  enabled: true,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-5.6-luna",
  apiKey: "",
  checkComments: true,
  skillText: "",
  downloadedSkill: "",
  distilledSkill: "",
  distillModel: "gpt-5.6-terra",
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function optionalStr(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Merge possibly-partial stored config over the defaults, dropping junk. */
export function withDefaults(stored: unknown): MeterConfig {
  const partial = (typeof stored === "object" && stored !== null ? stored : {}) as Partial<MeterConfig>;
  return {
    enabled: partial.enabled !== false,
    baseUrl: str(partial.baseUrl, DEFAULT_CONFIG.baseUrl).replace(/\/+$/, ""),
    model: str(partial.model, DEFAULT_CONFIG.model),
    apiKey: optionalStr(partial.apiKey).trim(),
    checkComments: partial.checkComments !== false,
    skillText: optionalStr(partial.skillText),
    downloadedSkill: optionalStr(partial.downloadedSkill),
    distilledSkill: optionalStr(partial.distilledSkill),
    distillModel: str(partial.distillModel, DEFAULT_CONFIG.distillModel),
  };
}

/** Load config from extension storage (chrome-only; not exercised in tests). */
export async function loadConfig(): Promise<MeterConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return withDefaults(stored[CONFIG_KEY]);
}
