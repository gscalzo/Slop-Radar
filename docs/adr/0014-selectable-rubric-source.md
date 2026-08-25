# ADR 0014 — Both rubric sources ship, selectable in Options

## Status

Accepted. Amends [ADR 0013](./0013-rubric-source-gio-skills.md): the
ai-writing-patterns catalog no longer *replaces* the humanizer skill — both are
vendored, and Options chooses between them. The catalog stays the default.

## Context

ADR 0013 swapped the rubric upstream from blader/humanizer to the gio-skills
ai-writing-patterns catalog and re-measured. Fresh same-week runs of all four
model × rubric combinations then showed the two rubrics tie on AUC within the
corpus's noise floor (re-running terra × humanizer unchanged moved 0.857 →
0.883, so ~±0.03 is run-to-run weather): luna × humanizer 0.863 vs
luna × catalog 0.844; terra × humanizer 0.883 vs terra × catalog 0.901. The
differences that do replicate are behavioural, not rank-order: the humanizer
rubric runs luna hotter (three humans in yellow at the shipped boundaries vs
the catalog's one), the catalog is directionally best with terra on every
split, and it costs ~1.7× the per-post rubric tokens. Different products, not
strictly better/worse — a user has defensible reasons for either. Throwing
the humanizer away bought nothing.

## Decision

1. **Both skills stay vendored** — `skills/ai-writing-patterns/` and
   `skills/humanizer/`, each with its upstream SKILL.md, bundled DISTILLED.md,
   LICENSE, and UPSTREAM.json. `config.rubricSource` selects one
   (default: `ai-writing-patterns`), exposed as a dropdown in Options.
2. **Everything rubric-shaped is keyed by source.** The update pipeline
   (`SKILL_SOURCES`: per-source raw URL and validation marker), the
   distillation extraction prompt, the bundled snapshot, and the judging
   preamble — each source keeps the exact preamble its evaluation ran with,
   so both sets of measured numbers stay valid.
3. **Tier boundaries are per-source, each where its own evaluation put it**
   (the rule of ADR 0012 — red must cost no human sample a red border):
   red 0.7 for ai-writing-patterns (top human: 0.64), red 0.6 for humanizer
   (top human: 0.58). Yellow is 0.35 for both. The content script captures
   the source at boot, like checkComments.
4. **A runtime distillation is tagged with its source**
   (`config.distilledSource`) and applies only while it matches the selected
   source. Switching sources falls back to the new source's bundled snapshot
   until the user runs Update skill from GitHub again — never a silent
   cross-source rubric. Installs predating this ADR have no tag, so their
   stored distillation is ignored in favour of the bundled snapshot: safe,
   and one click re-creates it.
5. **The eval harness measures either source**: `SLOP_RADAR_RUBRIC=humanizer
   npm run eval`. The boundary sweep it prints is read against that source's
   red.

## Consequences

- Users choose between the tiered catalog (directionally best with a strong
  judge, fingerprints, richer guards, fewest human yellows on luna) and the
  classic catalogue (hotter scoring that catches a few more AI posts on luna,
  ~40% fewer rubric tokens per post) without waiting for a release.
- The rubric textarea in Options tracks the *selected* source's default;
  switching sources swaps the shown text only when it was unedited, and a
  user override continues to beat everything regardless of source.
- Two vendored skills mean two upstreams to refresh. UPSTREAM.json in each
  directory keeps the provenance separate.
- A source switch in Options takes effect for open LinkedIn tabs on reload,
  matching how every other config change behaves.
