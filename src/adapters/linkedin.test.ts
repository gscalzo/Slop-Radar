// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { linkedInAdapter } from "./linkedin";

// Fixtures mirror the shape captured from a live feed (scripts/dump-feed.js):
// hashed classes omitted as noise, since no selector may depend on them.
const MORE_BUTTON =
  '<button type="button" data-testid="expandable-text-button"><span>…</span><span>more</span></button>';

function textBox(text: string, truncated?: boolean): string {
  return `<p><span data-testid="expandable-text-box">${text}${truncated ? MORE_BUTTON : ""}</span></p>`;
}

/** SDUI nests the same componentkey on several wrappers; the fixture does too. */
function comment(urn: string, text: string, truncated?: boolean): string {
  const key = `replaceableComment_urn:li:comment:(urn:li:ugcPost:1,${urn})`;
  return `
    <div componentkey="${key}">
      <div id="${key}" componentkey="${key}">
        <div><p><span>Roberto Peretto</span></p></div>
        ${textBox(text, truncated)}
      </div>
    </div>`;
}

function card(options: {
  key: string;
  body?: string;
  truncated?: boolean;
  chrome?: string;
  comments?: string;
}): string {
  return `
    <div data-lazy-mount-id="${options.key}">
      <div role="listitem" componentkey="expanded${options.key}FeedType_MAIN_FEED_RELEVANCE">
        <div componentkey="${options.key}">
          <h2><span>Feed post</span></h2>
          ${options.chrome ?? "<div><p><span>Jane Doe</span></p></div>"}
          ${options.body === undefined ? "" : textBox(options.body, options.truncated)}
          <button type="button"><span>Like</span></button>
          ${options.comments ?? ""}
        </div>
      </div>
    </div>`;
}

function feed(...cards: string[]): ParentNode {
  document.body.innerHTML = `
    <div role="list" data-testid="mainFeed" data-component-type="LazyColumn">
      ${cards.join("")}
    </div>`;
  return document;
}

describe("linkedInAdapter", () => {
  it("extracts posts keyed by the card's componentkey", () => {
    const root = feed(
      card({ key: "AAA", body: "First post text here." }),
      card({ key: "BBB", body: "Second post text here." }),
    );
    const items = linkedInAdapter.findItems(root);

    expect(items.map((i) => i.id)).toEqual([
      "expandedAAAFeedType_MAIN_FEED_RELEVANCE",
      "expandedBBBFeedType_MAIN_FEED_RELEVANCE",
    ]);
    expect(items[0]!.kind).toBe("post");
    expect(items[0]!.text).toBe("First post text here.");
    expect(items[0]!.truncated).toBe(false);
  });

  it("reads only the post body, never the author block or action buttons", () => {
    const root = feed(
      card({
        key: "AAA",
        body: "The body.",
        chrome: '<div><p><span>Jane Doe</span></p><p><span>CEO at Example</span></p></div>',
      }),
    );
    expect(linkedInAdapter.findItems(root)[0]!.text).toBe("The body.");
  });

  it("turns <br> back into line breaks, since listicles are a line-level tell", () => {
    const root = feed(card({ key: "AAA", body: "🚀 One<br>💡 Two<br>🔥 Three" }));
    expect(linkedInAdapter.findItems(root)[0]!.text).toBe("🚀 One\n💡 Two\n🔥 Three");
  });

  it("collapses runs of blank lines left by consecutive <br>s", () => {
    const root = feed(card({ key: "AAA", body: "Top<br><br><br><br><br>Bottom" }));
    expect(linkedInAdapter.findItems(root)[0]!.text).toBe("Top\n\nBottom");
  });

  it("marks a clamped post truncated and keeps the …more label out of the text", () => {
    const root = feed(card({ key: "AAA", body: "A long story about growth", truncated: true }));
    const item = linkedInAdapter.findItems(root)[0]!;

    expect(item.truncated).toBe(true);
    expect(item.text).toBe("A long story about growth");
  });

  it("does not treat a post ending in the word 'more' as clamped", () => {
    const root = feed(card({ key: "AAA", body: "We should all ship more" }));
    const item = linkedInAdapter.findItems(root)[0]!;

    expect(item.truncated).toBe(false);
    expect(item.text).toBe("We should all ship more");
  });

  it("normalises non-breaking spaces", () => {
    const root = feed(card({ key: "AAA", body: "Hello&nbsp;world" }));
    expect(linkedInAdapter.findItems(root)[0]!.text).toBe("Hello world");
  });

  it("skips cards with no text body, such as pure media reshares", () => {
    const root = feed(card({ key: "AAA" }), card({ key: "BBB", body: "Kept." }));
    expect(linkedInAdapter.findItems(root).map((i) => i.text)).toEqual(["Kept."]);
  });

  it("dedupes a card matched by both the feed-list and componentkey selectors", () => {
    const root = feed(card({ key: "AAA", body: "Once only." }));
    expect(linkedInAdapter.findItems(root)).toHaveLength(1);
  });

  it("finds cards outside the feed list via their componentkey alone", () => {
    document.body.innerHTML = card({ key: "AAA", body: "Orphaned but findable." });
    expect(linkedInAdapter.findItems(document)).toHaveLength(1);
  });

  describe("comments", () => {
    it("extracts a comment nested in a post as its own item, keyed by its urn", () => {
      const root = feed(
        card({ key: "AAA", body: "Post body.", comments: comment("42", "Comment body.") }),
      );
      const items = linkedInAdapter.findItems(root);

      expect(items).toHaveLength(2);
      const post = items.find((i) => i.kind === "post")!;
      const reply = items.find((i) => i.kind === "comment")!;
      expect(post.text).toBe("Post body.");
      expect(reply.text).toBe("Comment body.");
      expect(reply.id).toContain("urn:li:comment:");
    });

    it("dedupes the wrappers SDUI stacks under one componentkey", () => {
      const root = feed(card({ key: "AAA", body: "Post.", comments: comment("42", "Reply.") }));
      expect(linkedInAdapter.findItems(root).filter((i) => i.kind === "comment")).toHaveLength(1);
    });

    it("never lets a post with no text of its own adopt its comment's words", () => {
      const root = feed(card({ key: "AAA", comments: comment("42", "Comment body.") }));
      const items = linkedInAdapter.findItems(root);

      expect(items.map((i) => i.kind)).toEqual(["comment"]);
    });

    it("marks a comment truncated without truncating its post", () => {
      const root = feed(
        card({ key: "AAA", body: "Full post.", comments: comment("42", "Clamped", true) }),
      );
      const items = linkedInAdapter.findItems(root);

      expect(items.find((i) => i.kind === "post")!.truncated).toBe(false);
      expect(items.find((i) => i.kind === "comment")!.truncated).toBe(true);
    });
  });

  describe("expandTruncated", () => {
    it("clicks each clamped card's toggle once and returns the count", () => {
      const root = feed(
        card({ key: "AAA", body: "Clamped", truncated: true }),
        card({ key: "BBB", body: "Also clamped", truncated: true }),
        card({ key: "CCC", body: "Full text" }),
      );
      let clicks = 0;
      document
        .querySelectorAll('[data-testid="expandable-text-button"]')
        .forEach((el) => el.addEventListener("click", () => (clicks += 1)));

      expect(linkedInAdapter.expandTruncated(root)).toBe(2);
      expect(clicks).toBe(2);
    });

    it("clicks nothing when no card is clamped", () => {
      const root = feed(card({ key: "AAA", body: "Full text" }));
      expect(linkedInAdapter.expandTruncated(root)).toBe(0);
    });
  });

  describe("diagnose", () => {
    it("counts each anchor separately so a stale one is identifiable", () => {
      const root = feed(card({ key: "AAA", body: "Text." }));
      const { selectors } = linkedInAdapter.diagnose(root);

      expect(selectors['[data-testid="mainFeed"]']).toBe(1);
      expect(selectors['[data-testid="expandable-text-box"]']).toBe(1);
      expect(selectors['[data-id^="urn:li:activity"]']).toBe(0);
    });

    it("reports identity attributes by prefix, so a renamed anchor shows up", () => {
      document.body.innerHTML = `
        <div componentkey="expandedAAAFeedType_MAIN_FEED_RELEVANCE"></div>
        <div componentkey="expandedBBBFeedType_MAIN_FEED_RELEVANCE"></div>
        <div data-id="urn:li:activity:111"></div>`;
      expect(linkedInAdapter.diagnose(document).idAttributes).toEqual({
        "componentkey=expanded": 2,
        "data-id=urn:li:activity": 1,
      });
    });
  });
});
