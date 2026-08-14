# ADR 0004 — Comment checking: same engine, lower floor, quieter UI

## Status

Accepted.

## Context

The meter originally scored only post bodies. Comments are the other text surface in
the feed — and increasingly AI-drafted — but they differ in two ways that matter:
they are numerous, and they are usually short. A density score (weight per 100 words)
is noise on a ten-word comment, and a grey "no verdict" badge on every "Congrats!"
would bury the signal in clutter.

## Decision

- The adapter extracts comments as first-class items (`FeedItem.kind: "post" | "comment"`,
  anchored by `urn:li:comment` data-ids) through the same `SiteAdapter` interface;
  the analysis pipeline, judge path, and caching are identical to posts.
- The abstain floor is **20 words for comments** vs 40 for posts — comments are short
  by nature, so demanding post-length text would exempt almost all of them.
- **Abstaining comments get no decoration at all** (no border, no badge). Posts keep
  their grey "n/a" badge; comments only surface when there is something to say.
- Comments use **compact decoration** (thinner outline, smaller badge) to fit
  comment-sized elements.
- A **"check comments" toggle** in Options (default on) disables comment scanning
  entirely for users who find it noisy.

## Consequences

- Sub-20-word generic praise ("Great insight, thanks for sharing! 🙌") is invisible
  to the meter by design. Detecting that species of slop needs a different signal
  than pattern density; out of scope for now.
- Even a 20-word floor makes comment verdicts noisier than post verdicts; the
  compact badge and no-abstain-clutter rule are the mitigation, not a fix.
