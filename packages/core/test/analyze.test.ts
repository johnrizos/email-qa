import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze } from "../src/index.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("analyze", () => {
  it("reports nothing for a well-built template", () => {
    const report = analyze(fixture("clean.html"));
    expect(report.issues).toEqual([]);
    expect(report.counts).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("tags each issue with its rule id and counts by severity", () => {
    const report = analyze('<a href="#">x</a><img src="https://x.com/a.png" width="10">');

    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("link-href");
    expect(rules).toContain("img-alt");
    expect(report.counts.error).toBe(2);
  });

  it("sorts document-level issues first, then by line", () => {
    const report = analyze('<p>\n<a href="#">x</a>\n</p>\n<img alt="" src="https://x.com/a.png" width="1">');
    const lines = report.issues.map((i) => i.line ?? 0);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });

  it("reports the size in bytes", () => {
    expect(analyze("abc").sizeBytes).toBe(3);
  });
});
