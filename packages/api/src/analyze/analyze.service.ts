import { Injectable, PayloadTooLargeException } from "@nestjs/common";
import {
  analyze,
  checkLinks,
  defaultRules,
  LINK_STATUS_RULE,
  type Issue,
  type Report,
  type Severity,
} from "@email-qa/core";
import { createSafeFetch } from "./safe-fetch.js";

export const MAX_HTML_BYTES = 1024 * 1024;

@Injectable()
export class AnalyzeService {
  // Replaceable in tests so they never touch the network.
  fetch: typeof globalThis.fetch = createSafeFetch();

  listRules() {
    return [
      ...defaultRules.map(({ id, description }) => ({ id, description })),
      { id: LINK_STATUS_RULE, description: "Links respond without a 4xx/5xx error (opt-in)." },
    ];
  }

  async analyze(html: string, options: { checkLinks?: boolean } = {}): Promise<Report> {
    if (Buffer.byteLength(html) > MAX_HTML_BYTES) {
      throw new PayloadTooLargeException(`Templates are limited to ${MAX_HTML_BYTES / 1024} KB.`);
    }

    const report = analyze(html);
    if (!options.checkLinks) return report;

    const linkIssues = await checkLinks(html, { fetch: this.fetch });
    return merge(report, linkIssues);
  }
}

function merge(report: Report, extra: Issue[]): Report {
  const issues = [...report.issues, ...extra].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of issues) counts[issue.severity]++;
  return { ...report, counts, issues };
}
