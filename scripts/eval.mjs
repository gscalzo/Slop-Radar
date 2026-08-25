#!/usr/bin/env node
/*
 * Bundles and runs the offline model evaluation (src/eval/run.ts).
 *
 * It goes through esbuild rather than a TS runner because the judge imports the
 * rubric as a .md file — the same loader the extension build uses. That is the
 * point: the evaluation exercises the production prompt, not a copy of it.
 *
 *   SLOP_RADAR_API_KEY=sk-… npm run eval
 *   SLOP_RADAR_API_KEY=sk-… npm run eval -- gpt-5.6-luna,gpt-5.6-terra
 *   SLOP_RADAR_RUBRIC=humanizer npm run eval   # measure the other rubric source
 */
import { build } from "esbuild";
import { loadEnv } from "./env.mjs";

loadEnv();

const OUT = "dist/eval.mjs";

if (!process.env.SLOP_RADAR_API_KEY && !process.env.OPENAI_API_KEY) {
  console.error("Set SLOP_RADAR_API_KEY (or OPENAI_API_KEY) — this calls a real endpoint.");
  console.error("Costs a few cents: one request per post per model.");
  process.exit(1);
}

await build({
  entryPoints: ["src/eval/run.ts"],
  outfile: OUT,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  loader: { ".md": "text" },
  logLevel: "warning",
});

// The bundle is imported in-process, so it sees this script's argv unchanged
// and reads the model list from argv[2] itself.
await import(`../${OUT}`);
