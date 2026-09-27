import type { Finding, Rule } from "../types.js";
import { classifyUrl } from "../urls.js";

export const linkHref: Rule = {
  id: "link-href",
  description: "Every link needs a real, absolute URL.",
  check(ctx) {
    const findings: Finding[] = [];

    for (const a of ctx.select("a")) {
      const href = a.attribs.href;
      // <a name="top"> style anchors are not links
      if (href === undefined && a.attribs.name !== undefined) continue;

      const at = ctx.locate(a);
      switch (classifyUrl(href)) {
        case "empty":
          findings.push({ severity: "error", message: "Link has no href.", ...at });
          break;
        case "placeholder":
          findings.push({
            severity: "error",
            message: `Placeholder link "${href}". Replace it with the real URL.`,
            ...at,
          });
          break;
        case "script":
          findings.push({
            severity: "error",
            message: "javascript: links are blocked by every email client.",
            ...at,
          });
          break;
        case "relative":
          findings.push({
            severity: "error",
            message: `Relative URL "${href}" won't resolve inside an inbox. Use an absolute URL.`,
            ...at,
          });
          break;
        case "insecure":
          findings.push({ severity: "warning", message: "Link uses http:// instead of https://.", ...at });
          break;
      }
    }

    return findings;
  },
};
