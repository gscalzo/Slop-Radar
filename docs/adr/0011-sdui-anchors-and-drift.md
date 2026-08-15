# ADR 0011 — Anchor on testids, and make markup drift announce itself

## Status

Accepted. Implements [ADR 0002](./0002-dom-only-extraction.md) against the feed
LinkedIn actually serves; supersedes the selectors it assumed.

## Context

The first adapter matched nothing at all. LinkedIn had moved the feed to
server-driven UI (`data-sdui-screen`), and every anchor it used was gone:

- **Class names are content hashes** (`_1e5cedba`, `dee433f2`) that rotate each
  build. No class can be a selector.
- **Posts carry no `urn:li:` id anywhere in the DOM.** The activity URN the
  adapter keyed on, cached on, and deduped by simply does not appear.
- `componentkey` is on 351 elements, but most values are per-render UUIDs.

Worse than being broken was being *silently* broken: zero matches looked
exactly like an empty feed. Finding this took four rounds of probing a live
page, because each probe guessed which branch mattered and capped the rest.

## Decision

**Anchor on `data-testid`, and on `componentkey` only where its value is
structural.** LinkedIn ships testids on the feed list, every text body and every
"…more" toggle; they survive rebuilds because they exist for their own test
suite. Post identity is the card's `componentkey`
("expanded&lt;ID&gt;FeedType_MAIN_FEED_…"); comments kept a real
`urn:li:comment`, inside a `replaceableComment_` key.

**Extract text from a clone, not from `textContent`.** A body is spans and
`<br>`s wrapping the "…more" button. Reading it raw appends the button's label
to every clamped post and welds the lines together — which would quietly
disable the line-oriented detectors rather than fail.

**Comments are inside their post's card and reuse the same testids**, so a post
reads only bodies not inside a `replaceableComment_` container. Without that, a
post with no text of its own adopts its first comment's words.

**Drift has to announce itself.** `SiteAdapter.diagnose` returns a per-selector
census plus every identity-bearing attribute found in the page, keyed
`attribute=prefix`. An empty scan prints it. Counting attributes the adapter
does *not* use is the point: that is how a renamed anchor names itself instead
of registering as a zero. `scripts/dump-feed.js` captures the whole feed subtree
as an outline for when the census is not enough.

## Consequences

- The next redesign is a census read and one file changed, not four rounds of
  probing.
- `FeedItem.id` is no longer a URN. It was always specified as "stable id", so
  nothing outside the adapter changes — but cached verdicts do not survive a
  change in LinkedIn's key format.
- Test fixtures are shaped from the captured DOM, hashed classes omitted. They
  will drift from reality without anyone noticing; the census is what catches
  that, not the tests.
- Anchoring on someone else's test ids is a bet that they keep testing the feed.
  It is the strongest anchor available, not a guarantee.
