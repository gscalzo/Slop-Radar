/*
 * Paste this whole file into the DevTools console on a LinkedIn feed page,
 * with a few posts visible. Returns one string — consoles collapse objects,
 * and the collapsed half is the half you needed.
 *
 * LinkedIn's feed is now server-driven UI (data-sdui-screen), with hashed
 * class names that rotate every build, no urn:li: values, and componentkey
 * UUIDs that identify a render rather than a post. So this does not look for
 * known selectors. It finds the elements where post text actually bottoms out,
 * then prints the ancestor chain above each one — with sibling counts, so the
 * repeated card container gives itself away.
 */
(() => {
  const SKIP = new Set(["class", "style", "d", "viewBox", "xmlns", "fill", "stroke"]);
  const MAX = 70;
  const clip = (v) => (v.length > MAX ? `${v.slice(0, MAX)}…` : v);
  const text = (el) => (el.textContent ?? "").trim();

  const attrs = (el) =>
    [...el.attributes]
      .filter((a) => !SKIP.has(a.name))
      .map((a) => `${a.name}="${clip(a.value)}"`)
      .join(" ");

  // Class signature: hashed names rotate per build, but WITHIN one page they
  // still mark siblings that are the same kind of thing.
  const sig = (el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join(".")}`;
  const twins = (el) =>
    el.parentElement ? [...el.parentElement.children].filter((c) => sig(c) === sig(el)).length : 0;

  const describe = (el) =>
    `${sig(el)} ${attrs(el)} children=${el.children.length} text=${text(el).length} twins=${twins(el)}`;

  // An element where text "bottoms out": long enough to be prose, and not
  // simply inherited from one child (which would make it a wrapper).
  const isLeafText = (el) => {
    const len = text(el).length;
    if (len < 120) return false;
    return [...el.children].every((c) => text(c).length < len * 0.8);
  };

  const leaves = [...document.querySelectorAll("div, span, p")].filter(isLeafText).slice(0, 6);

  const chains = leaves.map((leaf, i) => {
    const lines = [`--- text ${i + 1} (${text(leaf).length} chars) ---`, `"${clip(text(leaf))}"`];
    let node = leaf;
    for (let d = 0; d < 9 && node && node !== document.body; d += 1) {
      lines.push(`${"  ".repeat(d)}${describe(node)}`);
      node = node.parentElement;
    }
    return lines.join("\n");
  });

  // Every data-* / aria-* name in the page: the stable-looking candidates.
  const names = new Map();
  for (const el of document.querySelectorAll("*")) {
    for (const a of el.attributes) {
      if (!/^(data-|aria-)/.test(a.name)) continue;
      names.set(a.name, (names.get(a.name) ?? 0) + 1);
    }
  }

  const seeMore = [...document.querySelectorAll("button, a, span")]
    .filter((el) => /^(…|\.\.\.)?\s*(see|show) more$/i.test(text(el)))
    .slice(0, 4)
    .map((el) => `${describe(el)}  parent: ${el.parentElement ? sig(el.parentElement) : "-"}`);

  return [
    `URL: ${location.href}  elements: ${document.querySelectorAll("*").length}`,
    `leaf text blocks: ${[...document.querySelectorAll("div, span, p")].filter(isLeafText).length}`,
    "",
    "DATA/ARIA ATTRIBUTE NAMES",
    [...names.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} x${c}`).join("  "),
    "",
    "CHAINS ABOVE POST TEXT",
    chains.join("\n\n") || "(none found — scroll so posts are visible, then rerun)",
    "",
    "SEE-MORE CONTROLS",
    seeMore.join("\n") || "(none)",
  ].join("\n");
})();
