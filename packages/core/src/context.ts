import { selectAll } from "css-select";
import type { AnyNode, Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import type { RuleContext } from "./types.js";

const SNIPPET_MAX = 120;

export function createContext(html: string): RuleContext {
  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true });

  const lineStarts = [0];
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 10) lineStarts.push(i + 1);
  }

  function lineAt(index: number): number {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  function locate(el: Element) {
    if (el.startIndex == null) return {};

    const tagEnd = html.indexOf(">", el.startIndex);
    let snippet = html
      .slice(el.startIndex, tagEnd === -1 ? undefined : tagEnd + 1)
      .replace(/\s+/g, " ");
    if (snippet.length > SNIPPET_MAX) snippet = snippet.slice(0, SNIPPET_MAX - 3) + "...";

    return { line: lineAt(el.startIndex), snippet };
  }

  return {
    html,
    doc,
    select: (query) => selectAll<AnyNode, Element>(query, doc),
    lineAt,
    locate,
  };
}
