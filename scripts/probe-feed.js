/*
 * Paste this whole file into the DevTools console on a LinkedIn feed page.
 *
 * It needs no extension: it reports what the page actually contains, so the
 * adapter's selectors can be rewritten against reality rather than guessed.
 * Everything comes back as one string, because the console collapses objects
 * and the collapsed part is always the part you needed.
 */
(() => {
  const SELECTORS = [
    '[data-id^="urn:li:activity"]',
    '[data-urn^="urn:li:activity"]',
    '[data-id^="urn:li:comment"]',
    "article.comments-comment-entity",
    ".update-components-update-v2__commentary",
    ".update-components-text",
    ".feed-shared-update-v2__description",
    ".comments-comment-item__main-content",
    ".feed-shared-inline-show-more-text__see-more-less-toggle",
    ".feed-shared-update-v2",
    ".fie-impression-container",
    "[componentkey]",
    "[data-id]",
    "[data-urn]",
    "main",
    "article",
  ];

  const count = (sel) => `${sel}=${document.querySelectorAll(sel).length}`;

  // Every attribute anywhere in the page whose value is a LinkedIn URN,
  // keyed "attribute=urn:li:prefix". Finds anchors under names we don't know.
  const urns = {};
  for (const el of document.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      if (!attr.value.startsWith("urn:li:")) continue;
      const key = `${attr.name}=${attr.value.split(":").slice(0, 3).join(":")}`;
      urns[key] = (urns[key] ?? 0) + 1;
    }
  }

  // The deepest elements holding a paragraph's worth of text are the post
  // bodies; their class names are what a text selector should target.
  const textish = [];
  for (const el of document.querySelectorAll("div, span, p")) {
    const text = el.textContent ?? "";
    if (text.length < 200 || el.children.length > 3) continue;
    textish.push(`${el.tagName.toLowerCase()}.${(el.className || "(no class)").toString().slice(0, 90)}`);
  }

  const top = (list, n) =>
    Object.entries(
      list.reduce((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, n2]) => `${n2}x ${key}`);

  return [
    `URL: ${location.href}`,
    "",
    "SELECTORS",
    SELECTORS.map(count).join("\n"),
    "",
    "URN-BEARING ATTRIBUTES",
    Object.entries(urns)
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} x${n}`)
      .join("\n") || "(none)",
    "",
    "CLASSES OF TEXT-BEARING ELEMENTS (top 15)",
    top(textish, 15).join("\n") || "(none)",
  ].join("\n");
})();
