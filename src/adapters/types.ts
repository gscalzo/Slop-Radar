/** An item (post or comment) extracted from a host page's feed. */
export interface FeedItem {
  /** Stable id for caching, e.g. LinkedIn's activity or comment URN. */
  id: string;
  /** The card element to decorate. */
  element: HTMLElement;
  /** Normalised text as currently rendered. */
  text: string;
  /** True when the host page has clamped the text ("…see more"). */
  truncated: boolean;
  /** Whether this item is a top-level post or a comment on one. */
  kind: "post" | "comment";
}

/**
 * What the adapter can see in the page right now. Host feeds rename their
 * markup without notice, so when findItems comes back empty this is what tells
 * us whether the page is unrecognisable or simply not a feed.
 */
export interface AdapterDiagnostics {
  /** Match count for each candidate selector the adapter knows about. */
  selectors: Record<string, number>;
  /**
   * Every attribute in the page carrying an id the adapter might anchor to,
   * keyed "attribute=prefix" (e.g. "componentkey=urn:li:fsd_update"). Counting
   * attributes we do NOT look at is the point: that is how a renamed anchor
   * shows itself instead of registering as a silent zero.
   */
  idAttributes: Record<string, number>;
}

/**
 * A site adapter is the only code allowed to know a host page's DOM.
 * Supporting a new site means writing a new adapter, nothing else (ADR 0002).
 */
export interface SiteAdapter {
  name: string;
  findItems(root: ParentNode): FeedItem[];
  /** Selector census for debugging markup drift; never used for analysis. */
  diagnose(root: ParentNode): AdapterDiagnostics;
  /**
   * Clicks the host page's own "see more" toggles for every truncated
   * post/comment currently in the DOM. Returns how many were clicked.
   * Only ever invoked from an explicit user command (ADR 0007) — adapters
   * must never call it themselves.
   */
  expandTruncated(root: ParentNode): number;
}
