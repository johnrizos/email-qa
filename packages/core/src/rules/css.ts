import { isText } from "domhandler";
import type { Finding, Rule } from "../types.js";

export const externalCss: Rule = {
  id: "external-css",
  description: "Email clients don't load external stylesheets.",
  check(ctx) {
    const findings: Finding[] = ctx.select('link[rel~="stylesheet" i]').map((link) => ({
      severity: "error",
      message: "External stylesheets are ignored. Inline the CSS or move it into a <style> block.",
      ...ctx.locate(link),
    }));

    for (const style of ctx.select("style")) {
      for (const child of style.children) {
        if (!isText(child) || child.startIndex == null) continue;
        for (const match of child.data.matchAll(/@import\b/gi)) {
          findings.push({
            severity: "warning",
            message: "@import is not supported by Gmail or Outlook.",
            line: ctx.lineAt(child.startIndex + match.index),
          });
        }
      }
    }

    return findings;
  },
};

const RISKY_CSS = [
  {
    pattern: /display\s*:\s*(?:inline-)?(?:flex|grid)\b/i,
    message: "Flexbox and Grid don't work in Outlook for Windows. Use tables for layout.",
  },
  {
    pattern: /position\s*:\s*(?:absolute|fixed|relative|sticky)\b/i,
    message: "CSS position is stripped by Gmail and Outlook.",
  },
];

export const cssSupport: Rule = {
  id: "css-support",
  description: "Flags CSS that major email clients don't support.",
  check(ctx) {
    const findings: Finding[] = [];

    for (const el of ctx.select("[style]")) {
      for (const { pattern, message } of RISKY_CSS) {
        if (pattern.test(el.attribs.style)) {
          findings.push({ severity: "warning", message, ...ctx.locate(el) });
        }
      }
    }

    for (const style of ctx.select("style")) {
      for (const child of style.children) {
        if (!isText(child) || child.startIndex == null) continue;
        for (const { pattern, message } of RISKY_CSS) {
          // fresh global copy, so no lastIndex state leaks between scans
          for (const match of child.data.matchAll(new RegExp(pattern, "gi"))) {
            findings.push({
              severity: "warning",
              message,
              line: ctx.lineAt(child.startIndex + match.index),
              snippet: match[0],
            });
          }
        }
      }
    }

    return findings;
  },
};
