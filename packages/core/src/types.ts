import type { Document, Element } from "domhandler";

export type Severity = "error" | "warning" | "info";

export interface Location {
  line?: number;
  snippet?: string;
}

export interface Issue extends Location {
  rule: string;
  severity: Severity;
  message: string;
}

/** What a rule returns. The rule id is filled in by `analyze`. */
export type Finding = Omit<Issue, "rule">;

export interface RuleContext {
  html: string;
  doc: Document;
  select(query: string): Element[];
  lineAt(index: number): number;
  locate(el: Element): Location;
}

export interface Rule {
  id: string;
  description: string;
  check(ctx: RuleContext): Finding[];
}

export interface Report {
  sizeBytes: number;
  counts: Record<Severity, number>;
  issues: Issue[];
}
