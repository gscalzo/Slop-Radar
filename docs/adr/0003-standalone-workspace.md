# ADR 0003 — Self-contained workspace inside the giopilot repo

## Status

Accepted, and since carried out: the extension now lives in its own repository
(Slop Radar), with `extension/` promoted to the repository root. The decision below
is what made that move a copy rather than surgery. Paths named as `extension/…` are
now root-relative.

## Context

The extension is prototyped on a branch of giopilot but is destined for its own
repository. Sharing giopilot's root lockfile, ESLint config, and coverage gate would
make that move surgery; it would also put browser-DOM code under a Node/Ink toolchain.

## Decision

`extension/` is fully self-contained: its own `package.json`, lockfile, TypeScript,
ESLint (mirroring the complexity ≤ 5 rule), Vitest (mirroring the 80% coverage
thresholds), docs, and ADRs. The root project ignores the folder; nothing imports
across the boundary in either direction.

## Consequences

- Extraction later is `git subtree split --prefix=extension` (or a plain copy) plus
  a new remote, with no config untangling.
- Some config duplication with the root, accepted as the cost of a clean seam.
