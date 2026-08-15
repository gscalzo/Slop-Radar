/*
 * Paste into the DevTools console on a LinkedIn feed page, with posts visible.
 *
 * Dumps the ENTIRE feed subtree as an indented outline and puts it on the
 * clipboard with the console's copy(). Nothing is capped: depth, breadth and
 * text are all complete, because guessing which branch mattered is what made
 * the earlier probes need three rounds.
 *
 * An outline, not outerHTML: LinkedIn's markup is mostly hashed class names and
 * inline SVG path data, which is bulk without information. Tags, the attributes
 * that could anchor a selector, and text are what a rewrite needs.
 *
 * Then, in the terminal:  pbpaste > /tmp/feed.txt
 */
(() => {
  const KEEP = /^(data-|aria-|role|componentkey|id|href|type|dir|lang|alt|title)/;
  const DROP = new Set(["svg", "path", "script", "style", "noscript", "canvas"]);
  const TEXT_MAX = 300;

  const clip = (v, n) => (v.length > n ? `${v.slice(0, n)}…` : v);
  const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

  const attrs = (el) =>
    [...el.attributes]
      .filter((a) => KEEP.test(a.name) && a.value)
      .map((a) => `${a.name}="${clip(a.value, 90)}"`)
      .join(" ");

  const root =
    document.querySelector('[data-testid="mainFeed"]') ??
    document.querySelector("[data-sdui-screen]") ??
    document.querySelector("main");
  if (!root) return "no feed root found";

  const lines = [];
  const walk = (el, depth) => {
    if (DROP.has(el.tagName.toLowerCase())) return;
    const own = text(el);
    const head = `${"  ".repeat(depth)}${el.tagName.toLowerCase()} ${attrs(el)}`.trimEnd();
    // Leaves carry the words; containers only need their size, since their text
    // is just their children's concatenated.
    if (el.children.length === 0) {
      lines.push(own ? `${head} :: "${clip(own, TEXT_MAX)}"` : head);
      return;
    }
    lines.push(`${head} [${own.length}]`);
    for (const child of el.children) walk(child, depth + 1);
  };
  walk(root, 0);

  const out = [
    `URL: ${location.href}`,
    `root: ${root.tagName.toLowerCase()} ${attrs(root)}`,
    `cards: ${root.querySelectorAll('[role="listitem"]').length}`,
    `lines: ${lines.length}`,
    "",
    lines.join("\n"),
  ].join("\n");

  // eslint-disable-next-line no-undef
  copy(out);
  return `copied ${out.length} chars / ${lines.length} lines — now run:  pbpaste > /tmp/feed.txt`;
})();
