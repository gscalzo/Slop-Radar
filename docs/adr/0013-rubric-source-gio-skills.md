# ADR 0013 — The rubric source moves to the gio-skills ai-writing-patterns catalog

## Status

Accepted. Amended by [ADR 0014](./0014-selectable-rubric-source.md): the
humanizer skill returns as a selectable alternative source; the
ai-writing-patterns catalog remains the default. Amends
[ADR 0008](./0008-upstream-skill-sync.md) and
[ADR 0009](./0009-distilled-rubric.md): the vendor-and-distill pipeline is
unchanged, but the upstream it points at is now
[gscalzo/gio-skills](https://github.com/gscalzo/gio-skills)
`skills/ai-writing-patterns/SKILL.md` instead of blader/humanizer.

## Context

The humanizer skill served well, but it is one input among several to a richer
catalog: gio-skills' `ai-writing-patterns` merges and deduplicates
blader/humanizer (itself built from Wikipedia's "Signs of AI writing"), Peter
Yang's no-ai-slop, conorbronsdon/avoid-ai-writing, Aboudjem/humanizer-skill,
gregorymm/humanize-text, and tropes.fyi — so switching loses nothing the old
rubric had. On top of the merge it adds exactly what a judge needs and the
humanizer skill lacked:

- **Explicit signal tiers.** Fingerprints (near-proof alone) > strong ✱ >
  moderate (clusters only) > weak (corroboration only), with a downgrade rule
  for single instances of "at density" patterns. The old rubric had only the
  informal clusters rule.
- **Fingerprints (§54-58)** the judge never knew to look for: chatbot citation
  markup, AI-tool URL parameters, unfilled placeholders, Unicode obfuscation,
  fabricated citations.
- **~25 additional patterns** (faux-insight setups, false concessions,
  treadmill restatement, interchangeable paragraphs, low burstiness as a
  first-class signal, …) with stable §N identifiers both this project and the
  upstream's own detect-ai-writing skill cite.
- **Stronger false-positive guards**, including the documented non-native
  speaker misfire — directly relevant to LinkedIn's audience.

It is also maintained by this project's author, so upstream fixes are a PR away
rather than a fork.

## Decision

1. **`skills/ai-writing-patterns/` replaces `skills/humanizer/`**: the catalog
   vendored verbatim, upstream MIT LICENSE alongside, provenance (repo, commit,
   version, raw URL) in `UPSTREAM.json`. Runtime updates fetch the same file
   from the gio-skills raw URL; the download validator now checks for the
   catalog's own marker.
2. **The bundled `DISTILLED.md` keeps the catalog's structure**: all 58
   patterns under their stable §N numbers, each with its tier and watch-words,
   plus the tier definitions, false-positive guards, human-writing signs, and
   the clusters rule. Only the per-pattern Fix guidance and the lineage section
   are dropped. The distillation prompt instructs runtime re-distillations to
   preserve the same shape (never renumber; keep tiers and density
   qualifiers).
3. **The judging preamble now states the tier weighting** (fingerprint ≈
   near-proof, ✱ heavy, moderate in clusters, weak corroboration); likelihood
   calibration anchors are unchanged pending measurement.
4. **The compactness bound rises from 8 KB to 12 KB.** 58 tiered patterns do
   not fit the old bound without cutting watch-words, which are the operative
   payload. Per-post rubric cost goes from ≈1.5k to ≈2.6k tokens — still well
   under the ≈5k of sending the raw catalog, and per-URN caching and viewport
   gating stand.
5. **Calibration follows ADR 0012**: the rubric change shifts the judge's
   likelihood distribution, so `npm run eval` is re-run against the 104-post
   corpus before the 0.35/0.6 tier boundaries are treated as still valid, and
   they move only if the measurement says so.

## Consequences

- **Measured** (104-post corpus, per decision 5): terra 0.857 → **0.901** AUC
  (hard-AI split 0.702 → 0.772, obvious 0.955 → 0.982), luna 0.870 → 0.844.
  The tiered rubric pays off with the stronger judge and costs the cheaper one
  a little — it reads as a rubric that needs instruction-following capacity.
  Luna stays the default on price; terra is now the measured upgrade rather
  than a wash.
- **Red moved back 0.6 → 0.7** by ADR 0012's own rule: the formulaic-human
  ceiling rose from 0.58 to 0.64 under the new rubric, and red must cost no
  human a red border. Cost: exactly one obvious AI post stays yellow. Yellow
  is unchanged at 0.35 (next-highest human: 0.28).
- The judge gains the fingerprint tier and the burstiness/structure signals,
  which the local detectors cannot see, at ~1.7x the per-post rubric tokens.
- The catalog's detect-ai-writing companion skill (mirror test, sentence-level
  pass, short-text confidence caps) is deliberately NOT adopted here: it
  changes the output contract and per-post cost materially. It is the natural
  next step if measurement shows the rubric alone under-delivers.
- Upstream tier disagreement to resolve in gio-skills: §41 low burstiness is
  marked ✱ strong in the catalog but tiered moderate in detect-ai-writing's
  operational rubric. The distilled snapshot follows the vendored catalog (✱).
- The deterministic local detectors remain a fast approximation of the
  catalog's mechanically encodable core; extending them (fingerprints,
  burstiness, the two-tier vocabulary list) is tracked as follow-up work, not
  part of this change.
