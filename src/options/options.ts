/** Options page glue: load/save config, request the API origin permission. */
import { CONFIG_KEY, loadConfig, withDefaults, type MeterConfig, type RubricSource } from "../config";
import { createOpenAiCompatibleJudge } from "../judge/openaiCompatible";
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
let distilledSource = "";

function selectedSource(): RubricSource {
  return el<HTMLSelectElement>("rubricSource").value === "humanizer"
    ? "humanizer"
    : "ai-writing-patterns";
}

/** The default rubric for the source currently selected in the form. */
function currentDefault(): string {
  return defaultRubric(selectedSource(), distilledSkill, distilledSource);
}

/** An unedited textarea stores as "" so it keeps tracking the default rubric. */
function skillOverride(value: string): string {
  return value.trim() === currentDefault().trim() ? "" : value;
}

function readForm(): MeterConfig {
  return withDefaults({
    enabled: field("enabled").checked,
    baseUrl: field("baseUrl").value,
    model: field("model").value,
    apiKey: field("apiKey").value,
    checkComments: field("checkComments").checked,
    rubricSource: selectedSource(),
    skillText: skillOverride(skillBox().value),
    downloadedSkill,
    distilledSkill,
    distilledSource,
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

// Long enough to clear the judge's own minimum, and patterned enough that a
// working model should return a non-zero likelihood.
const PROBE_TEXT = [
  "In today's fast-paced digital world, leadership isn't just about strategy — it's about people.",
  "Last week I delved into this with my team and unlocked a game-changing insight.",
  "Growth. Grit. Gratitude. That's the tapestry of every transformative journey.",
  "Agree? Repost if this resonates. ♻️",
].join("\n");

/** Runs a real request end to end and reports what actually happened. */
async function testConnection(): Promise<void> {
  const config = readForm();
  if (config.apiKey === "") {
    setStatus("Set an API key first.");
    return;
  }
  if (!(await grantOrigin(apiOrigin(config.baseUrl)))) {
    setStatus(`Host permission for ${config.baseUrl} was not granted — the judge cannot reach it.`);
    return;
  }
  setStatus(`Calling ${config.model}…`);
  try {
    const result = await createOpenAiCompatibleJudge(config).judge(PROBE_TEXT);
    setStatus(`✓ ${config.model} replied: likelihood ${result.likelihood}, ${result.phrases.length} phrases quoted.`);
  } catch (err) {
    setStatus(`✗ ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Only refresh the textarea when it was still showing the old default. */
function refreshRubricBox(previousDefault: string): void {
  if (skillBox().value.trim() === previousDefault) skillBox().value = currentDefault();
}

/** Download the selected source's skill, distill it, and store all three (ADR 0008, ADR 0014). */
async function updateSkillFromGitHub(): Promise<void> {
  const config = readForm();
  if (config.apiKey === "") {
    setStatus("Set an API key first — updating distills the skill with a model.");
    return;
  }
  if (!(await grantUpdatePermissions(config.baseUrl))) return;

  const source = selectedSource();
  const previousDefault = currentDefault().trim();
  try {
    setStatus("Downloading skill…");
    const raw = await fetchLatestSkill(source);
    setStatus(`Distilling with ${config.distillModel}…`);
    const distilled = await distillSkill(raw, config, source);

    downloadedSkill = raw;
    distilledSkill = distilled;
    distilledSource = source;
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
  distilledSource = config.distilledSource;
  field("enabled").checked = config.enabled;
  field("baseUrl").value = config.baseUrl;
  field("model").value = config.model;
  field("apiKey").value = config.apiKey;
  field("checkComments").checked = config.checkComments;
  field("distillModel").value = config.distillModel;
  el<HTMLSelectElement>("rubricSource").value = config.rubricSource;
  skillBox().value = config.skillText || currentDefault();
  // Switching source swaps the shown rubric — but only when the textarea was
  // still tracking the previous source's default, never over a user's edit.
  let shownDefault = currentDefault().trim();
  el<HTMLSelectElement>("rubricSource").addEventListener("change", () => {
    refreshRubricBox(shownDefault);
    shownDefault = currentDefault().trim();
  });
  el<HTMLButtonElement>("save").addEventListener("click", () => void save());
  el<HTMLButtonElement>("resetSkill").addEventListener("click", () => {
    skillBox().value = currentDefault();
  });
  el<HTMLButtonElement>("updateSkill").addEventListener("click", () => void updateSkillFromGitHub());
  el<HTMLButtonElement>("testConnection").addEventListener("click", () => void testConnection());
}

void init();
