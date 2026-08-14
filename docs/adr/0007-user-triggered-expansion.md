# ADR 0007 — Expansion of "…see more" is user-triggered, never automatic

## Status

Accepted. Amends [ADR 0002](./0002-dom-only-extraction.md): its "no synthetic
clicks" rule becomes "no *unprompted* synthetic clicks".

## Context

ADR 0002 chose partial analysis for clamped posts because silently clicking
"…see more" mutates the feed the user is reading and behaves like automation.
That left long posts — the slop heartland — half-analysed until the user expanded
them by hand, one by one. The requested middle ground: a command that expands
everything at once so the full text gets processed.

## Decision

- **Expansion runs only from an explicit user action**: the `expand-truncated`
  keyboard command (default `Alt+Shift+E`, remappable at
  `chrome://extensions/shortcuts`, relayed by the service worker to the active
  tab) or the floating **"Expand N clamped ◐"** button shown on the feed while
  truncated items exist. The extension never expands on its own — not on scan,
  not on scroll, not on a timer.
- The click targets are exactly the toggles the user could click by hand,
  matched with the same anchored ownership rules as truncation detection
  (a comment's toggle belongs to the comment; "See more comments" is never a
  target), deduped within a pass. `SiteAdapter.expandTruncated` makes this part
  of the adapter contract, so other sites inherit the same posture.
- No new pipeline: expansion mutates the DOM, the mutation observer rescans,
  each expanded item's text hash changes, and the full text re-runs analysis and
  the judge. The ◐ partial marker disappears with the clamp.

## Consequences

- One keystroke visibly changes the user's feed (that is the feature); LinkedIn
  keeps items expanded, so the effect is what hand-expanding would have done.
- Expansion covers items currently in the DOM — newly scrolled-in clamped posts
  need another invocation; the floating button's count makes that visible.
- Still no internal LinkedIn APIs and no background fetching (ADR 0002's
  remaining rules stand).
