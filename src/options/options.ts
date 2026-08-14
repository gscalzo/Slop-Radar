/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig } from "../config";
import { defaultRubric } from "../judge/prompt";
import { fetchLatestSkill } from "../skillUpdate";
import { distillSkill } from "../skillDistill";

const GITHUB_ORIGIN = "https://raw.githubusercontent.com/*";

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const field = (id: string): HTMLInputElement => el<HTMLInputElement>(id);
const skillBox = (): HTMLTextAreaElement => el<HTMLTextAreaElement>("skillText");

function setStatus(text: string): void {
  const status = document.getElementById("status");
  if (status) status.textContent = text;
}

let downloadedSkill = "";
let distilledSkill = "";

/** An unedited textarea stores as "" so it keeps tracking the default rubric. */
function skillOverride(value: string): string {
  return value.trim() === defaultRubric(distilledSkill).trim() ? "" : value;
}

function readForm(): MeterConfig {
  return withDefaults({
    enabled: field("enabled").checked,
    baseUrl: field("baseUrl").value,
    model: field("model").value,
    apiKey: field("apiKey").value,
    checkComments: field("checkComments").checked,
    skillText: skillOverride(skillBox().value),
    downloadedSkill,
    distilledSkill,
    distillModel: field("distillModel").value,
  });
}

function apiOrigin(baseUrl: string): string | null {
  try {
    return `${new URL(baseUrl).origin}/*`;
  } catch {
    return null;
  }
}

/** Chrome only allows an origin permission prompt from a user gesture, so both callers are click handlers. */
async function grantOrigin(origin: string | null): Promise<boolean> {
  if (origin === null) return false;
  try {
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

async function save(): Promise<void> {
  const config = readForm();
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
  const granted = !config.enabled || (await grantOrigin(apiOrigin(config.baseUrl)));
  setStatus(
    granted ? "Saved." : "Saved, but the API host permission was not granted — the judge cannot run.",
  );
}

async function grantUpdatePermissions(baseUrl: string): Promise<boolean> {
  if (!(await grantOrigin(GITHUB_ORIGIN))) {
    setStatus("GitHub access not granted — cannot update the skill.");
    return false;
  }
  if (!(await grantOrigin(apiOrigin(baseUrl)))) {
    setStatus("API host permission was not granted — cannot distill the skill.");
    return false;
  }
  return true;
}

/** Only refresh the textarea when it was still showing the old default. */
function refreshRubricBox(previousDefault: string): void {
  if (skillBox().value.trim() === previousDefault) skillBox().value = defaultRubric(distilledSkill);
}

/** Download the upstream skill, distill it into a rubric, and store both (ADR 0008). */
async function updateSkillFromGitHub(): Promise<void> {
  const config = readForm();
  if (config.apiKey === "") {
    setStatus("Set an API key first — updating distills the skill with a model.");
    return;
  }
  if (!(await grantUpdatePermissions(config.baseUrl))) return;

  const previousDefault = defaultRubric(distilledSkill).trim();
  try {
    setStatus("Downloading skill…");
    const raw = await fetchLatestSkill();
    setStatus(`Distilling with ${config.distillModel}…`);
    const distilled = await distillSkill(raw, config);

    downloadedSkill = raw;
    distilledSkill = distilled;
    await chrome.storage.local.set({ [CONFIG_KEY]: readForm() });
    refreshRubricBox(previousDefault);
    setStatus("Skill updated & distilled ✓");
  } catch (err) {
    setStatus(`Update failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}

async function init(): Promise<void> {
  const config = await loadConfig();
  downloadedSkill = config.downloadedSkill;
  distilledSkill = config.distilledSkill;
  field("enabled").checked = config.enabled;
  field("baseUrl").value = config.baseUrl;
  field("model").value = config.model;
  field("apiKey").value = config.apiKey;
  field("checkComments").checked = config.checkComments;
  field("distillModel").value = config.distillModel;
  skillBox().value = config.skillText || defaultRubric(distilledSkill);
  el<HTMLButtonElement>("save").addEventListener("click", () => void save());
  el<HTMLButtonElement>("resetSkill").addEventListener("click", () => {
    skillBox().value = defaultRubric(distilledSkill);
  });
  el<HTMLButtonElement>("updateSkill").addEventListener("click", () => void updateSkillFromGitHub());
}

void init();
