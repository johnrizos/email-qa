import { textContent } from "domutils";
import type { Finding, Rule } from "../types.js";
import { byteLength, formatKb, styleText } from "../utils.js";

// Gmail cuts the message off with a "[Message clipped]" link above ~102KB of HTML.
const GMAIL_CLIP_BYTES = 102 * 1024;
const CLIP_WARNING_BYTES = 90 * 1024;

export const gmailClipping: Rule = {
  id: "gmail-clipping",
  description: "Gmail clips emails whose HTML is larger than ~102KB.",
  check(ctx) {
    const size = byteLength(ctx.html);

    if (size > GMAIL_CLIP_BYTES) {
      return [
        {
          severity: "error",
          message: `HTML is ${formatKb(size)}. Gmail will clip it (limit ~102 KB), hiding the footer and unsubscribe link.`,
        },
      ];
    }
    if (size > CLIP_WARNING_BYTES) {
      return [
        {
          severity: "warning",
          message: `HTML is ${formatKb(size)}, close to Gmail's ~102 KB limit. ESP tracking links will add more.`,
        },
      ];
    }
    return [];
  },
};

export const darkMode: Rule = {
  id: "dark-mode",
  description: "Checks that the template declares how it should behave in dark mode.",
  check(ctx) {
    const hasMeta =
      ctx.select('meta[name="color-scheme" i], meta[name="supported-color-schemes" i]').length > 0;
    const hasMediaQuery = /prefers-color-scheme\s*:\s*dark/i.test(styleText(ctx.select("style")));

    if (hasMediaQuery && !hasMeta) {
      return [
        {
          severity: "warning",
          message:
            'Dark mode styles found but no <meta name="color-scheme" content="light dark">. Apple Mail will ignore them.',
        },
      ];
    }
    if (!hasMediaQuery && !hasMeta) {
      return [
        {
          severity: "info",
          message: "No dark mode handling. Outlook.com and the Gmail app will invert colors on their own.",
        },
      ];
    }
    return [];
  },
};

export const documentMeta: Rule = {
  id: "document-meta",
  description: "Checks the basics every email document should have.",
  check(ctx) {
    const findings: Finding[] = [];

    const [html] = ctx.select("html");
    if (html && !html.attribs.lang) {
      findings.push({
        severity: "warning",
        message: "<html> has no lang attribute. Screen readers need it to pick the right voice.",
        ...ctx.locate(html),
      });
    }

    const [title] = ctx.select("title");
    if (!title || !textContent(title).trim()) {
      findings.push({
        severity: "warning",
        message: 'Missing <title>. It is shown in the browser tab of the "view online" version.',
      });
    }

    if (ctx.select('meta[name="viewport" i]').length === 0) {
      findings.push({
        severity: "warning",
        message: "Missing viewport meta tag. Mobile clients may render the email zoomed out.",
      });
    }

    return findings;
  },
};
