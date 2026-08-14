# ADR 0001 — Heuristics are the source of truth; the cloud judge is a second opinion

## Status

Partially superseded by [ADR 0005](./0005-model-primary-analysis.md): the model's
tier now wins outright when available, and heuristics are the annotation layer and
fallback. The offsets-from-heuristics rule, the abstention rules, and the density
framing below still stand.

## Context

The extension must (a) tier each post green/yellow/red and (b) list the concrete
tells *and where they occur* in a report modal. Two candidate engines:

- **Deterministic heuristics** (em dashes, contrast templates, stock vocabulary,
  emoji listicles, unicode-bold headers, engagement bait, staccato runs) — derived
  from the "humanizer" catalogue of AI-writing tells.
- **An LLM verdict.** Chrome's built-in Gemini Nano was considered first, but it is
  unavailable on many machines (multi-GB download, GPU requirements), cannot return
  reliable character offsets, and small models are weak at exactly this judgment.
  The user redirected to a cloud model behind an API key instead.

## Decision

1. Heuristics always run, fully locally, and produce the flags, offsets, and the
   base score (weight per 100 words → tier).
2. The cloud judge is optional and provider-agnostic: any OpenAI-compatible
   `/chat/completions` endpoint (base URL + model + key are user config). It returns
   a 0–1 likelihood plus **verbatim quotes**, which we locate back to offsets with a
   string search — LLMs cannot be trusted with numeric offsets.
3. The final tier is the rounded-up average of the heuristic tier and the judge tier,
   so the judge can move the verdict one step but never overrule an abstention.
4. **Framing is "AI-tell density", never authorship.** Posts under 40 words or mostly
   non-Latin text get no verdict at all: false accusations (non-native speakers,
   professional writers) are the failure mode this product must avoid.

## Consequences

- The extension works fully offline by default; enabling the judge sends post text
  to the configured endpoint (disclosed in Options and README).
- The judge is trivially fakeable behind the `Judge` interface, so CI needs no model.
- Tier thresholds (3 and 7 per 100 words) are provisional and expected to be
  calibrated against real feeds.
