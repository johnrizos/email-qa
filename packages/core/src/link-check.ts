import { createContext } from "./context.js";
import type { Issue } from "./types.js";

export interface LinkTarget {
  url: string;
  line?: number;
  snippet?: string;
}

export interface LinkCheckOptions {
  /** Swap in a guarded fetch on servers (see the API package). */
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  concurrency?: number;
  /** Hard cap so one template can't turn into hundreds of requests. */
  maxLinks?: number;
}

export const LINK_STATUS_RULE = "link-status";

/** Unique absolute http(s) links, in document order, with the line of their first use. */
export function extractLinks(html: string): LinkTarget[] {
  const ctx = createContext(html);
  const seen = new Map<string, LinkTarget>();

  for (const a of ctx.select("a[href]")) {
    const url = a.attribs.href.trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.set(url, { url, ...ctx.locate(a) });
  }

  return [...seen.values()];
}

/**
 * Requests every link and reports the ones that fail. HEAD first, then GET for
 * servers that don't implement HEAD (405/501) or reject it outright (403).
 */
export async function checkLinks(html: string, options: LinkCheckOptions = {}): Promise<Issue[]> {
  const { fetch = globalThis.fetch, timeoutMs = 5000, concurrency = 5, maxLinks = 50 } = options;
  const links = extractLinks(html);
  const issues: Issue[] = [];

  if (links.length > maxLinks) {
    issues.push({
      rule: LINK_STATUS_RULE,
      severity: "info",
      message: `Checked the first ${maxLinks} of ${links.length} links.`,
    });
  }

  const queue = links.slice(0, maxLinks);
  const worker = async () => {
    for (let link = queue.shift(); link; link = queue.shift()) {
      const problem = await probe(link.url, fetch, timeoutMs);
      if (problem) issues.push({ rule: LINK_STATUS_RULE, line: link.line, snippet: link.snippet, ...problem });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

  return issues.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

async function probe(
  url: string,
  fetch: typeof globalThis.fetch,
  timeoutMs: number,
): Promise<Pick<Issue, "severity" | "message"> | undefined> {
  try {
    let res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(timeoutMs) });
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(timeoutMs) });
    }

    if (res.status >= 400) {
      return {
        severity: res.status >= 500 || res.status === 404 || res.status === 410 ? "error" : "warning",
        message: `${url} returned HTTP ${res.status}.`,
      };
    }
    return undefined;
  } catch (err) {
    const reason =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
        ? `timed out after ${timeoutMs / 1000}s`
        : err instanceof Error
          ? err.message
          : "request failed";
    return { severity: "error", message: `${url} could not be reached (${reason}).` };
  }
}
