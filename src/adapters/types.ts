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
 * A site adapter is the only code allowed to know a host page's DOM.
 * Supporting a new site means writing a new adapter, nothing else (ADR 0002).
 */
export interface SiteAdapter {
  name: string;
  findItems(root: ParentNode): FeedItem[];
  /**
   * Clicks the host page's own "see more" toggles for every truncated
   * post/comment currently in the DOM. Returns how many were clicked.
   * Only ever invoked from an explicit user command (ADR 0007) — adapters
   * must never call it themselves.
   */
  expandTruncated(root: ParentNode): number;
}
