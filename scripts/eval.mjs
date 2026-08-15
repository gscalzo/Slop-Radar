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
 */
import { build } from "esbuild";

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

process.argv.splice(1, 1); // hand argv[2] to the bundle as the model list
await import(`../${OUT}`);
