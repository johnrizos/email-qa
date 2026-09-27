import { analyze } from "../src/analyze.js";
import type { Rule } from "../src/types.js";

/** Runs a single rule and returns its issues. */
export function run(rule: Rule, html: string) {
  return analyze(html, [rule]).issues;
}
