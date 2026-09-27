import { describe, expect, it } from "vitest";
import { checkLinks, extractLinks } from "../src/index.js";

/** A fake fetch that answers from a table of url -> status (or thrown error). */
function fakeFetch(table: Record<string, number | Error>, calls: string[] = []) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    const answer = table[url];
    if (answer instanceof Error) throw answer;
    return new Response(null, { status: answer ?? 200 });
  }) as typeof fetch;
}

describe("extractLinks", () => {
  it("keeps absolute http(s) links once, with the line of first use", () => {
    const html = [
      '<a href="https://a.com">a</a>',
      '<a href="#">skip</a><a href="mailto:x@y.z">skip</a><a href="%%view%%">skip</a>',
      '<a href="https://a.com">again</a><a href="http://b.com">b</a>',
    ].join("\n");

    expect(extractLinks(html).map((l) => [l.url, l.line])).toEqual([
      ["https://a.com", 1],
      ["http://b.com", 3],
    ]);
  });
});

describe("checkLinks", () => {
  it("reports 4xx/5xx and unreachable links, and ignores working ones", async () => {
    const html = [
      '<a href="https://ok.com">ok</a>',
      '<a href="https://gone.com">gone</a>',
      '<a href="https://down.com">down</a>',
      '<a href="https://nope.invalid">nope</a>',
    ].join("\n");

    const issues = await checkLinks(html, {
      fetch: fakeFetch({
        "https://gone.com": 404,
        "https://down.com": 503,
        "https://nope.invalid": new TypeError("fetch failed"),
      }),
    });

    expect(issues.map((i) => [i.line, i.severity])).toEqual([
      [2, "error"],
      [3, "error"],
      [4, "error"],
    ]);
    expect(issues[0].message).toContain("HTTP 404");
    expect(issues[2].message).toContain("could not be reached");
    expect(issues.every((i) => i.rule === "link-status")).toBe(true);
  });

  it("retries with GET when the server doesn't support HEAD", async () => {
    const calls: string[] = [];
    const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method} ${input}`);
      return new Response(null, { status: init?.method === "HEAD" ? 405 : 200 });
    }) as typeof globalThis.fetch;

    const issues = await checkLinks('<a href="https://x.com">x</a>', { fetch });

    expect(issues).toEqual([]);
    expect(calls).toEqual(["HEAD https://x.com", "GET https://x.com"]);
  });

  it("caps the number of links it requests", async () => {
    const calls: string[] = [];
    const html = Array.from({ length: 5 }, (_, i) => `<a href="https://x.com/${i}">x</a>`).join("");

    const issues = await checkLinks(html, { fetch: fakeFetch({}, calls), maxLinks: 2 });

    expect(calls).toHaveLength(2);
    expect(issues).toEqual([expect.objectContaining({ severity: "info", message: "Checked the first 2 of 5 links." })]);
  });
});
