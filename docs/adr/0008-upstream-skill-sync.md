# ADR 0008 — The rubric is the real upstream humanizer skill, updatable at runtime

## Status

Accepted. Amends [ADR 0006](./0006-humanizer-skill-as-data.md): the skill file is
no longer hand-written; it is the shared upstream skill, vendored and syncable.
Amended by [ADR 0009](./0009-distilled-rubric.md): the downloaded skill is now
distilled into a compact detection rubric before use, so the judge no longer reads
the full skill verbatim.

## Context

ADR 0006 made the rubric a versioned skill file, but the content was written for
this project. The community already maintains the definitive version:
[blader/humanizer](https://github.com/blader/humanizer) (MIT), based on
Wikipedia's "Signs of AI writing" guide from WikiProject AI Cleanup. It is broader,
battle-tested, and actively updated. The requirement is to use that real shared
skill and be able to pull its latest version without waiting for an extension
release.

## Decision

1. **`skills/humanizer/SKILL.md` is vendored verbatim** from blader/humanizer
   (no edits, upstream frontmatter intact). Provenance (commit, version, license and
   source URLs) lives in `skills/humanizer/UPSTREAM.json`, with the
   upstream MIT `LICENSE` alongside. Refreshing the snapshot is re-copying the
   file and updating UPSTREAM.json.
2. **Runtime update command**: *Options → Update skill from GitHub* fetches the
   current `SKILL.md` from the upstream repo's raw URL (origin permission for
   `raw.githubusercontent.com` requested on first use), validates it (length,
   humanizer marker, markdown shape, so an HTML error page never gets stored), and
   stores it as `config.downloadedSkill`.
3. **Precedence**: user override (`skillText`) > downloaded copy > bundled
   snapshot. An unedited rubric still stores `""`, so it tracks whichever
   default is current.
4. **The skill stays a rewriting skill; judging is framed in code.** Upstream is
   written to *remove* AI patterns, not score them, so a code-owned judging
   preamble ("you are a judge, not an editor…", with likelihood calibration)
   wraps the skill, and the code-owned JSON output contract follows it. Neither
   is user-editable, so no rubric update or edit can break parsing.

## Consequences

- Detection quality inherits upstream improvements. A skill update is one click
  rather than a release. The bundled snapshot still ships so the extension works offline
  and on first run.
- The full skill is ~30 KB (≈7k tokens), so each judged post costs roughly a
  cent of `gpt-5.6-luna` input; acceptable given per-URN caching and viewport
  gating, and users can paste a trimmed rubric as an override if they care.
- Fetching from `main` means an upstream breaking rewrite lands unreviewed at
  runtime; the validation gate and preamble contain the blast radius, and the
  stored copy can always be discarded (falling back to the reviewed snapshot).
- The deterministic detectors are no longer a 1:1 projection of the skill; they
  remain a fast approximation of its core patterns.
