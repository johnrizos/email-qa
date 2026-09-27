import { describe, expect, it } from "vitest";
import { cssSupport, externalCss } from "../src/rules/css.js";
import { darkMode, documentMeta, gmailClipping } from "../src/rules/document.js";
import { unsupportedElements } from "../src/rules/elements.js";
import { imgAlt, imgSrc, imgWidth } from "../src/rules/images.js";
import { linkHref } from "../src/rules/links.js";
import { run } from "./helpers.js";

describe("link-href", () => {
  it("flags placeholder, empty, javascript and relative links", () => {
    const issues = run(
      linkHref,
      `<a href="#">a</a>
<a href="">b</a>
<a>c</a>
<a href="javascript:void(0)">d</a>
<a href="/pricing">e</a>`,
    );

    expect(issues.map((i) => i.line)).toEqual([1, 2, 3, 4, 5]);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("warns on http links", () => {
    const [issue] = run(linkHref, '<a href="http://example.com">x</a>');
    expect(issue.severity).toBe("warning");
  });

  it("accepts https, mailto and merge tags", () => {
    const html = `<a href="https://example.com">a</a>
<a href="mailto:a@b.com">b</a>
<a href="%%view_online%%">c</a>
<a href="#SPCUNSUBSCRIBE#">d</a>`;
    expect(run(linkHref, html)).toEqual([]);
  });

  it("ignores named anchors", () => {
    expect(run(linkHref, '<a name="top"></a>')).toEqual([]);
  });

  it("includes the opening tag as a snippet", () => {
    const [issue] = run(linkHref, '<p>\n  <a href="#" style="color:red">Buy now</a>\n</p>');
    expect(issue.line).toBe(2);
    expect(issue.snippet).toBe('<a href="#" style="color:red">');
  });
});

describe("images", () => {
  it("requires alt but allows empty alt", () => {
    const issues = run(imgAlt, '<img src="https://x.com/a.png">\n<img src="https://x.com/b.png" alt="">');
    expect(issues).toHaveLength(1);
    expect(issues[0].line).toBe(1);
  });

  it("rejects relative and base64 sources", () => {
    const issues = run(
      imgSrc,
      `<img src="images/hero.jpg">
<img src="data:image/png;base64,iVBORw0KGgo=">
<img src="cid:logo@example">
<img src="https://cdn.example.com/ok.png">`,
    );
    expect(issues.map((i) => i.line)).toEqual([1, 2]);
  });

  it("warns when width attribute is missing", () => {
    const issues = run(imgWidth, '<img src="a" style="width:100px">\n<img src="b" width="100">');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });
});

describe("unsupported-elements", () => {
  it("errors on scripts and forms, warns on svg", () => {
    const issues = run(unsupportedElements, "<script></script><form></form><svg></svg>");
    expect(issues.map((i) => i.severity).sort()).toEqual(["error", "error", "warning"]);
  });
});

describe("css", () => {
  it("flags external stylesheets and @import", () => {
    const issues = run(
      externalCss,
      `<link rel="stylesheet" href="https://x.com/a.css">
<style>
  @import url("https://fonts.googleapis.com/css?family=Inter");
</style>`,
    );
    expect(issues.map((i) => [i.line, i.severity])).toEqual([
      [1, "error"],
      [3, "warning"],
    ]);
  });

  it("flags flex and position in inline styles and style blocks", () => {
    const issues = run(
      cssSupport,
      `<div style="display: flex">a</div>
<style>
  .grid { display:grid; }
  .badge { position: absolute; }
</style>`,
    );
    expect(issues.map((i) => i.line)).toEqual([1, 3, 4]);
  });

  it("does not flag display:block", () => {
    expect(run(cssSupport, '<td style="display:block">x</td>')).toEqual([]);
  });
});

describe("gmail-clipping", () => {
  const pad = (kb: number) => `<p>${"a".repeat(kb * 1024)}</p>`;

  it("passes small emails", () => {
    expect(run(gmailClipping, pad(10))).toEqual([]);
  });

  it("warns when close to the limit", () => {
    expect(run(gmailClipping, pad(95))[0].severity).toBe("warning");
  });

  it("errors above the limit", () => {
    expect(run(gmailClipping, pad(110))[0].severity).toBe("error");
  });

  it("counts bytes, not characters", () => {
    // Greek letters are 2 bytes each in UTF-8
    expect(run(gmailClipping, "α".repeat(60 * 1024))[0].severity).toBe("error");
  });
});

describe("dark-mode", () => {
  it("is fine with meta and media query", () => {
    const html = `<meta name="color-scheme" content="light dark">
<style>@media (prefers-color-scheme: dark) { body { color: #fff } }</style>`;
    expect(run(darkMode, html)).toEqual([]);
  });

  it("warns when the media query has no meta tag", () => {
    const html = "<style>@media (prefers-color-scheme: dark) { body { color: #fff } }</style>";
    expect(run(darkMode, html)[0].severity).toBe("warning");
  });

  it("gives a hint when there is no dark mode handling at all", () => {
    expect(run(darkMode, "<p>hi</p>")[0].severity).toBe("info");
  });
});

describe("document-meta", () => {
  it("flags missing lang, title and viewport", () => {
    const issues = run(documentMeta, "<html><head></head><body></body></html>");
    expect(issues).toHaveLength(3);
  });

  it("treats an empty title as missing", () => {
    const html = `<html lang="en"><head>
<meta name="viewport" content="width=device-width">
<title> </title></head></html>`;
    expect(run(documentMeta, html)).toHaveLength(1);
  });
});
