# ADR 0009 — Skill updates distill the full skill into a compact detection rubric

## Status

Accepted. Amends [ADR 0008](./0008-upstream-skill-sync.md): the raw upstream
skill is still downloaded and vendored, but it is no longer what the per-post
judge reads.

## Context

The upstream humanizer skill is ~30 KB (≈7k tokens) of *rewriting* machinery:
before/after examples, voice calibration, invocation modes, process loops. The judge
only needs the detection signals out of all that. Sending it verbatim with every
judged post multiplied cost and drowned the signal in instructions addressed to
an editor, not a judge.

## Decision

1. **Skill updates become a two-stage pipeline**: download the latest upstream
   `SKILL.md` (as before, validated) → send it to an LLM with a code-owned
   extraction prompt → store the returned compact **detection rubric** as
   `config.distilledSkill` (the raw download is kept as `downloadedSkill` for
   provenance). The stage is atomic: any failure leaves everything unchanged.
2. **Distillation uses a stronger model than the per-post judge**:
   `config.distillModel`, default **`gpt-5.6-terra`**. It runs once per update
   rather than per post, and extraction fidelity matters more than latency. The
   extraction prompt keeps every pattern (name, words-to-watch, one-line signal),
   the false-positive guidance, the signs of human writing, and the clusters
   rule; it drops rewriting instructions, examples, and process sections. Output
   is validated (length floor, must be shorter than the input).
3. **A distilled snapshot ships in the repo** (`skills/humanizer/DISTILLED.md`,
   generated from the vendored SKILL.md) so first-run and keyless installs get
   the compact rubric with no API call. Rubric precedence: user override
   (`skillText`) > runtime distillation (`distilledSkill`) > bundled
   `DISTILLED.md`. The full `SKILL.md` stays vendored as the distillation source
   and provenance record, and is never sent per post.

## Consequences

- Per-post prompt drops from ≈7k to ≈1.5k tokens, roughly a 5× input-cost cut, and
  the judge reads a rubric written for judging.
- Distillation is itself an LLM step and can lose nuance; mitigations: a
  stronger model, a validation gate, the rubric being fully visible and editable
  in Options, and one-click re-distillation. The bundled snapshot is reviewed
  in-repo like any other change.
- A skill update now requires a configured API key (the pipeline includes a
  model call); the error message says so instead of silently half-updating.
