# ADR 0002 — Read-only DOM extraction behind a site adapter

## Status

Accepted. Amended by [ADR 0007](./0007-user-triggered-expansion.md): "no
synthetic clicks" is relaxed to "no *unprompted* synthetic clicks", so an explicit
user command may expand "…see more" toggles.

## Context

LinkedIn's markup is an obfuscated, frequently-churning SPA; posts virtualise in and
out and long posts are clamped behind "…see more". Options for getting full text:
read the rendered DOM, programmatically click "see more", or call LinkedIn's internal
(Voyager) API with the user's cookies.

## Decision

- **Read the DOM only.** No synthetic clicks (visible mutation of the user's feed),
  no internal API calls (scraping under LinkedIn's User Agreement, and brittle).
- Truncated posts are scored on visible text and marked **partial**; when the user
  expands a post naturally, the text hash changes and it is re-scored.
- All LinkedIn DOM knowledge lives in `src/adapters/linkedin.ts` behind the
  `SiteAdapter` interface. Posts are anchored by `data-id`/`data-urn`
  (`urn:li:activity:…`) attributes, the only stable selectors, and decoration is
  idempotent because LinkedIn re-renders wipe inline styles.
- Extending to other sites takes one new adapter and a manifest `matches` entry.

## Consequences

- Long posts get partial analysis until expanded. Accepted trade-off, surfaced in
  the UI (◐).
- Selector churn breaks only one file, which is covered by fixture tests.
