# ADR 0005 — The model is the primary analysis engine

## Status

Accepted. Supersedes the scoring-combination rule of [ADR 0001](./0001-heuristics-are-the-source-of-truth.md)
(its offsets-from-heuristics and never-override-abstention rules stand).

## Context

ADR 0001 made deterministic heuristics the source of truth, with the LLM as an
optional second opinion averaged in. In practice a fixed pattern list can only catch
what it enumerates: paraphrased contrasts, novel stock phrases, and structural
uniformity all slip through, and the list goes stale as models change voice. The
product direction is that real analysis must come from a model — not everything can
be detected deterministically.

## Decision

1. **When a model result exists, its tier IS the verdict** (`likelihood ≥ 0.7` red,
   `≥ 0.35` yellow, else green) — no averaging with the heuristic tier. The verdict
   carries `basis: "model"`.
2. **Heuristics keep two jobs**: offset-level annotation for the report modal (an LLM
   cannot return reliable offsets — it returns verbatim quotes we locate locally),
   and the fallback tier when no model is configured. Fallback verdicts are visibly
   marked (`≈` on the badge, "pattern-only estimate" in the report,
   `basis: "patterns"`).
3. **Abstention still beats the judge**: posts under the word floor or mostly
   non-Latin get no verdict from anyone.
4. **Model analysis is enabled by default** (inert until an API key is entered).
   The default model is **`gpt-5.6-luna`** — OpenAI's fast/affordable GPT-5.6 tier
   (about $1 input / $6 output per 1M tokens as of August 2026), aimed at exactly
   this shape of high-volume classification. Any OpenAI-compatible endpoint and
   model name can be substituted in Options.

## Consequences

- Verdicts are non-deterministic and cost tokens; viewport gating and per-URN
  caching bound the spend.
- Once a key is configured, feed text leaves the machine — disclosed in Options and
  the README. Removing the key returns the extension to fully-local estimates.
- The heuristic thresholds (ADR 0001) now only decide fallback verdicts.
- CI still needs no model: the judge sits behind an interface and is faked in tests.
