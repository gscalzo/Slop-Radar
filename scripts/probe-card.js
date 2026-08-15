/*
 * Paste into the DevTools console on a LinkedIn feed page, with posts visible.
 *
 * probe-feed.js found the card boundary; this one dumps the inside of a single
 * card so the post body can be told apart from the author block and the
 * reaction chrome. Prints the subtree with each node's text length, so the
 * body is the node whose text is prose rather than a name or a counter.
 */
(() => {
  const KEEP = /^(data-|aria-|role|componentkey|id|href|type|dir|lang)/;
  const MAX = 60;
  const clip = (v) => (v.length > MAX ? `${v.slice(0, MAX)}…` : v);
  const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

  const attrs = (el) =>
    [...el.attributes]
      .filter((a) => KEEP.test(a.name))
      .map((a) => `${a.name}="${clip(a.value)}"`)
      .join(" ");

  const cards = [...document.querySelectorAll('[data-testid="mainFeed"] [role="listitem"]')];
  if (cards.length === 0) return "no cards under [data-testid=mainFeed] [role=listitem]";

  // Prefer a card with a decent amount of prose in it.
  const card = cards.sort((a, b) => text(b).length - text(a).length)[0];

  const lines = [];
  const walk = (el, depth) => {
    if (depth > 14 || lines.length > 160) return;
    const own = text(el);
    const pad = "  ".repeat(depth);
    const leaf = el.children.length === 0;
    const label = `${pad}${el.tagName.toLowerCase()} ${attrs(el)} [${own.length}]`;
    lines.push(leaf || own.length < 400 ? `${label} "${clip(own)}"` : label);
    for (const child of el.children) walk(child, depth + 1);
  };
  walk(card, 0);

  return [
    `cards: ${cards.length}`,
    `chosen card text length: ${text(card).length}`,
    `card componentkey: ${card.getAttribute("componentkey")}`,
    "",
    lines.join("\n"),
  ].join("\n");
})();
