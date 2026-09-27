import { useState } from "react";
import type { Issue, Report, Severity } from "./api";

interface Props {
  report: Report;
  onSelect(issue: Issue): void;
}

type Filter = Severity | "all";

const LABELS: Record<Severity, string> = { error: "Errors", warning: "Warnings", info: "Info" };

export function IssueList({ report, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? report.issues : report.issues.filter((i) => i.severity === filter);

  if (report.issues.length === 0) {
    return (
      <div className="empty">
        <strong>No issues found.</strong>
        <span>Nothing in this template trips the checks. Still send yourself a test.</span>
      </div>
    );
  }

  return (
    <div className="issues">
      <div className="filters" role="group" aria-label="Filter by severity">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All <span className="count">{report.issues.length}</span>
        </FilterButton>
        {(Object.keys(LABELS) as Severity[]).map((s) => (
          <FilterButton key={s} active={filter === s} onClick={() => setFilter(s)} disabled={!report.counts[s]}>
            <span className={`dot dot-${s}`} /> {LABELS[s]} <span className="count">{report.counts[s]}</span>
          </FilterButton>
        ))}
      </div>

      <ul className="issue-list">
        {shown.map((issue, i) => (
          <li key={i}>
            <button type="button" className="issue" onClick={() => onSelect(issue)} disabled={!issue.line}>
              <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
              <span className="issue-body">
                <span className="issue-message">{issue.message}</span>
                {issue.snippet && <code className="issue-snippet">{issue.snippet}</code>}
              </span>
              <span className="issue-meta">
                <span>{issue.line ? `Line ${issue.line}` : "Document"}</span>
                <span className="rule">{issue.rule}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterButton(props: React.ComponentProps<"button"> & { active: boolean }) {
  const { active, ...rest } = props;
  return <button type="button" className={active ? "filter active" : "filter"} aria-pressed={active} {...rest} />;
}
