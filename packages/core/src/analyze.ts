import { createContext } from "./context.js";
import { defaultRules } from "./rules/index.js";
import type { Issue, Report, Rule, Severity } from "./types.js";
import { byteLength } from "./utils.js";

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function analyze(html: string, rules: Rule[] = defaultRules): Report {
  const ctx = createContext(html);
  const issues: Issue[] = [];

  for (const rule of rules) {
    for (const finding of rule.check(ctx)) {
      issues.push({ rule: rule.id, ...finding });
    }
  }

  // Document-level issues (no line) first, then top to bottom.
  issues.sort(
    (a, b) =>
      (a.line ?? 0) - (b.line ?? 0) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;

  return { sizeBytes: byteLength(html), counts, issues };
}
