/**
 * Offline model evaluation. Run with `npm run eval`.
 *
 * The tier boundaries and the default model were both chosen without evidence.
 * This measures them: every post in eval/corpus is labelled by its filename
 * prefix ("ai-" or "human-"), and each configured model scores all of them
 * through the real production path — same rubric, same prompt, same parser —
 * so the numbers describe what ships, not a re-implementation.
 *
 * What matters is separation, not accuracy: a judge whose AI and human posts
 * score 0.9 and 0.1 is useful at any threshold, while one scoring 0.6 and 0.5
 * is useless at every threshold. The human traps in the corpus (em dashes,
 * emoji lists, "not X — it's Y") carry the most weight, because calling a
 * person's own writing machine-made is the expensive mistake.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { withDefaults } from "../config";
import { createOpenAiCompatibleJudge } from "../judge/openaiCompatible";
import { judgeTier } from "../verdict";

interface Case {
  name: string;
  label: "ai" | "human";
  text: string;
}

interface Score {
  case: Case;
  likelihood: number | null;
  error?: string;
}

const CORPUS_DIRS = ["eval/corpus", "eval/local"];

function entriesIn(dir: string): { name: string }[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return []; // eval/local is optional: your own posts, never committed.
  }
}

function loadCases(): Case[] {
  const cases: Case[] = [];
  for (const dir of CORPUS_DIRS) {
    for (const file of entriesIn(dir)) {
      if (!file.name.endsWith(".txt")) continue;
      const label = file.name.startsWith("ai-") ? "ai" : "human";
      cases.push({
        name: file.name.replace(/\.txt$/, ""),
        label,
        text: readFileSync(join(dir, file.name), "utf8").trim(),
      });
    }
  }
  return cases;
}

function safeReaddir(dir: string): boolean {
  try {
    readdirSync(dir);
    return true;
  } catch {
    return false;
  }
}

function configFor(model: string): ReturnType<typeof withDefaults> {
  return withDefaults({
    model,
    baseUrl: process.env.SLOP_RADAR_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.SLOP_RADAR_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  });
}

async function scoreCase(model: string, item: Case): Promise<Score> {
  const config = configFor(model);
  try {
    const result = await createOpenAiCompatibleJudge(config).judge(item.text);
    return { case: item, likelihood: result.likelihood };
  } catch (error) {
    return {
      case: item,
      likelihood: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function fmt(value: number | null): string {
  return value === null ? "  err" : value.toFixed(2);
}

/** Tiers a judge would assign, compared with the label. */
function misread(score: Score): boolean {
  if (score.likelihood === null) return false;
  const tier = judgeTier(score.likelihood);
  return score.case.label === "ai" ? tier === "green" : tier !== "green";
}

function summarise(model: string, scores: Score[]): string {
  const value = (label: "ai" | "human"): number[] =>
    scores.filter((s) => s.case.label === label && s.likelihood !== null).map((s) => s.likelihood!);
  const ai = mean(value("ai"));
  const human = mean(value("human"));
  const errors = scores.filter((s) => s.likelihood === null).length;
  return [
    pad(model, 22),
    pad(ai.toFixed(2), 10),
    pad(human.toFixed(2), 13),
    pad((ai - human).toFixed(2), 12),
    pad(String(scores.filter(misread).length), 10),
    errors === 0 ? "" : `${errors} errors`,
  ].join("");
}

function printTable(models: string[], cases: Case[], byModel: Map<string, Score[]>): void {
  console.log(
    pad("model", 22) + pad("mean(ai)", 10) + pad("mean(human)", 13) + pad("separation", 12) + "misreads",
  );
  for (const [model, scores] of byModel) console.log(summarise(model, scores));

  console.log(`\n${pad("post", 24)}${pad("label", 8)}${models.map((m) => pad(m, 16)).join("")}`);
  for (const [index, item] of cases.entries()) {
    const cells = models.map((m) => pad(fmt(byModel.get(m)![index]!.likelihood), 16));
    console.log(`${pad(item.name, 24)}${pad(item.label, 8)}${cells.join("")}`);
  }
}

function printErrors(byModel: Map<string, Score[]>): void {
  const errors = [...byModel.values()].flat().filter((s) => s.error);
  if (errors.length === 0) return;
  console.log(`\nerrors:\n${errors.map((s) => `  ${s.case.name}: ${s.error}`).join("\n")}`);
}

async function main(): Promise<void> {
  const models = (process.argv[2] ?? "gpt-5.6-luna,gpt-5.6-terra").split(",");
  const cases = loadCases();
  if (cases.length === 0) throw new Error("no cases found in eval/corpus");
  console.log(`corpus: ${cases.length} posts, models: ${models.join(", ")}\n`);

  const byModel = new Map<string, Score[]>();
  for (const model of models) {
    byModel.set(model, await Promise.all(cases.map((item) => scoreCase(model, item))));
  }

  printTable(models, cases, byModel);
  printErrors(byModel);
  console.log("\nTiers: green < 0.35, yellow < 0.7, red above. A misread is an");
  console.log("ai-labelled post scored green, or a human-labelled post scored above green.");
}

if (!safeReaddir("eval/corpus")) {
  console.error("run this from the repository root: npm run eval");
  process.exit(1);
}
void main();
