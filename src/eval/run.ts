/**
 * Offline model evaluation. Run with `npm run eval`.
 *
 * The tier boundaries and the default model were both chosen without evidence.
 * This measures them: every post in eval/corpus and eval/local is labelled by
 * its filename prefix ("ai-" or "human-"), and each model scores all of them
 * through the real production path — same rubric, same prompt, same parser — so
 * the numbers describe what ships, not a re-implementation.
 *
 * Human samples must come from `scripts/fetch-corpus.mjs`, which only accepts
 * text third parties timestamped before 2020. Writing "human" examples by hand
 * proves nothing: whoever writes them is imitating the thing being measured.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withDefaults } from "../config";
import { createOpenAiCompatibleJudge } from "../judge/openaiCompatible";
import { auc, bestThreshold, likelihoods, mean, sweep, type Scored } from "./report";

interface Case {
  name: string;
  label: "ai" | "human";
  text: string;
}

const CORPUS_DIRS = ["eval/corpus", "eval/local"];
const RESULTS = "eval/local/results.csv";

function entriesIn(dir: string): { name: string }[] {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return []; // eval/local is optional: fetched samples, never committed.
  }
}

function loadCases(): Case[] {
  const cases: Case[] = [];
  for (const dir of CORPUS_DIRS) {
    for (const file of entriesIn(dir)) {
      if (!file.name.endsWith(".txt")) continue;
      cases.push({
        name: file.name.replace(/\.txt$/, ""),
        label: file.name.startsWith("ai-") ? "ai" : "human",
        text: readFileSync(join(dir, file.name), "utf8").trim(),
      });
    }
  }
  return cases;
}

function configFor(model: string): ReturnType<typeof withDefaults> {
  return withDefaults({
    model,
    baseUrl: process.env.SLOP_RADAR_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.SLOP_RADAR_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  });
}

async function scoreCase(model: string, item: Case): Promise<Scored & { error?: string }> {
  try {
    const result = await createOpenAiCompatibleJudge(configFor(model)).judge(item.text);
    return { name: item.name, label: item.label, likelihood: result.likelihood };
  } catch (error) {
    return {
      name: item.name,
      label: item.label,
      likelihood: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Requests are issued in small batches: 120 at once trips rate limits. */
async function scoreAll(model: string, cases: Case[], size = 6): Promise<(Scored & { error?: string })[]> {
  const out: (Scored & { error?: string })[] = [];
  for (let i = 0; i < cases.length; i += size) {
    out.push(...(await Promise.all(cases.slice(i, i + size).map((item) => scoreCase(model, item)))));
    process.stdout.write(`\r  ${model}: ${out.length}/${cases.length}`);
  }
  process.stdout.write("\n");
  return out;
}

const pad = (value: string, width: number): string => value.padEnd(width);
const num = (value: number, places = 2): string => value.toFixed(places);

function printSummary(byModel: Map<string, Scored[]>): void {
  console.log(
    `\n${pad("model", 22)}${pad("AUC", 8)}${pad("mean(ai)", 10)}${pad("mean(human)", 13)}${pad("gap", 8)}errors`,
  );
  for (const [model, scores] of byModel) {
    const ai = likelihoods(scores, "ai");
    const human = likelihoods(scores, "human");
    const errors = scores.filter((s) => s.likelihood === null).length;
    console.log(
      pad(model, 22) +
        pad(num(auc(ai, human), 3), 8) +
        pad(num(mean(ai)), 10) +
        pad(num(mean(human)), 13) +
        pad(num(mean(ai) - mean(human)), 8) +
        (errors === 0 ? "-" : String(errors)),
    );
  }
  console.log("\nAUC is the model-choice number: probability an AI post outranks a human one.");
  console.log("1.0 perfect, 0.5 a coin flip. It does not depend on where we put the tiers.");
}

function printSweep(model: string, scores: Scored[]): void {
  const ai = likelihoods(scores, "ai");
  const human = likelihoods(scores, "human");
  const rows = sweep(ai, human);
  const best = bestThreshold(rows);
  console.log(`\n${model} — where should the boundary sit? (${ai.length} ai, ${human.length} human)`);
  console.log(`${pad("threshold", 12)}${pad("humans flagged", 17)}ai missed`);
  for (const row of rows) {
    const mark = row.threshold === best?.threshold ? "  ← fewest mistakes" : "";
    console.log(
      pad(num(row.threshold, 2), 12) + pad(String(row.falsePositives), 17) + row.falseNegatives + mark,
    );
  }
}

function printWorst(model: string, scores: Scored[], count = 5): void {
  const rank = (label: "ai" | "human", dir: 1 | -1): Scored[] =>
    scores
      .filter((s) => s.label === label && s.likelihood !== null)
      .sort((a, b) => dir * ((b.likelihood ?? 0) - (a.likelihood ?? 0)))
      .slice(0, count);
  const show = (title: string, rows: Scored[]): void => {
    console.log(`\n${model} — ${title}`);
    for (const row of rows) console.log(`  ${num(row.likelihood ?? 0)}  ${row.name}`);
  };
  show("humans scored highest (the costly mistakes)", rank("human", 1));
  show("ai scored lowest (the misses)", rank("ai", -1));
}

function writeCsv(models: string[], byModel: Map<string, Scored[]>): void {
  const header = ["post", "label", ...models].join(",");
  const names = byModel.get(models[0]!)!.map((s) => s.name);
  const rows = names.map((name, i) => {
    const cells = models.map((m) => byModel.get(m)![i]?.likelihood ?? "");
    return [name, byModel.get(models[0]!)![i]!.label, ...cells].join(",");
  });
  writeFileSync(RESULTS, `${[header, ...rows].join("\n")}\n`, "utf8");
  console.log(`\nfull scores: ${RESULTS}`);
}

function describeCorpus(cases: Case[], models: string[]): void {
  const ai = cases.filter((c) => c.label === "ai").length;
  console.log(`corpus: ${cases.length} posts (${ai} ai, ${cases.length - ai} human)`);
  if (ai === 0 || ai === cases.length) {
    console.log("WARNING: one class is empty; AUC will be meaningless.");
  }
  console.log(`models: ${models.join(", ")} — ${models.length * cases.length} requests\n`);
}

function printErrors(byModel: Map<string, Scored[]>): void {
  const errors = [...byModel.values()].flat().filter((s) => (s as { error?: string }).error);
  if (errors.length === 0) return;
  console.log(`\nerrors (${errors.length}, first 5 shown):`);
  for (const e of errors.slice(0, 5)) console.log(`  ${e.name}: ${(e as { error?: string }).error}`);
}

async function main(): Promise<void> {
  const models = (process.argv[2] ?? "gpt-5.6-luna,gpt-5.6-terra").split(",");
  const cases = loadCases();
  if (cases.length === 0) throw new Error("no cases found — run scripts/fetch-corpus.mjs first");
  describeCorpus(cases, models);

  const byModel = new Map<string, Scored[]>();
  for (const model of models) byModel.set(model, await scoreAll(model, cases));

  report(models, byModel);
}

function report(models: string[], byModel: Map<string, Scored[]>): void {
  printSummary(byModel);
  for (const [model, scores] of byModel) printSweep(model, scores);
  for (const [model, scores] of byModel) printWorst(model, scores);
  writeCsv(models, byModel);
  printErrors(byModel);
}

void main();
