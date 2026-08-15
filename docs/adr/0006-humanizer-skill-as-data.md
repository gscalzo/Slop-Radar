# ADR 0006 — The humanizer skill is versioned data, and users can update it

## Status

Accepted. Amended by [ADR 0008](./0008-upstream-skill-sync.md): the skill file is
now vendored verbatim from upstream blader/humanizer and can be refreshed at
runtime; the update-and-override mechanics below still stand.

## Context

The judge's system prompt, holding the catalogue of AI-writing tells and the judging
rubric, was a string constant buried in the judge client. That made the project's
central domain knowledge invisible, unreviewable, and unchangeable without a
rebuild. The deterministic detectors are derived from the same catalogue, so it
deserves to be a first-class artifact.

## Decision

1. The rubric lives at **`skills/humanizer/SKILL.md`** in giopilot's skill format
   (folder + `SKILL.md` with `name`/`description` frontmatter), so the same file
   can be dropped into a `.giopilot/skills/` directory unchanged. It is the single
   source of truth: the judge bundles it (esbuild `text` loader, mirrored by a
   vitest plugin), and the detector set in `src/core/detectors/` is its
   deterministic projection (kept in sync by hand; see the catalogue sections).
2. **Users can update it without a rebuild**: Options shows the effective rubric
   in an editable textarea. A non-default value is stored as `skillText` in
   extension storage and replaces the bundled rubric; a *Reset to default* button
   restores it. An unedited rubric is stored as `""` so those installs keep
   tracking bundled improvements to the skill.
3. The **JSON output contract stays code-owned** and is always appended after the
   rubric. A rubric edit can change what the judge looks for, never the response shape
   the parser depends on. Frontmatter is stripped before sending (and from
   pasted skill files).

## Consequences

- Rubric changes are ordinary reviewed diffs to a markdown file, and prompt
  engineering no longer requires touching TypeScript.
- A user override freezes their rubric until they reset. That is accepted, and it is
  why "unchanged means track the default" is the storage rule.
- A hostile or nonsensical override only degrades that user's own verdicts;
  parsing is protected by the fixed contract and existing validation/clamping.
