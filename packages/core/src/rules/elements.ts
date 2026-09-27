import type { Finding, Rule, Severity } from "../types.js";

const UNSUPPORTED: Record<string, { severity: Severity; reason: string }> = {
  script: { severity: "error", reason: "Scripts are stripped by every email client." },
  iframe: { severity: "error", reason: "Iframes are not supported in email." },
  object: { severity: "error", reason: "<object> is not supported in email." },
  embed: { severity: "error", reason: "<embed> is not supported in email." },
  form: { severity: "error", reason: "Forms are disabled or stripped by most clients, Gmail included." },
  video: { severity: "warning", reason: "<video> only plays in Apple Mail. Use a linked thumbnail." },
  audio: { severity: "warning", reason: "<audio> is only supported by Apple Mail." },
  svg: { severity: "warning", reason: "Inline SVG is not supported by Gmail or Outlook." },
};

export const unsupportedElements: Rule = {
  id: "unsupported-elements",
  description: "Flags HTML elements that email clients strip or don't render.",
  check(ctx) {
    const findings: Finding[] = [];

    for (const el of ctx.select(Object.keys(UNSUPPORTED).join(", "))) {
      const { severity, reason } = UNSUPPORTED[el.name];
      findings.push({ severity, message: reason, ...ctx.locate(el) });
    }

    return findings;
  },
};
