import { useMemo, useRef, useState } from "react";
import { analyzeTemplate, type Issue, type Report, type Severity } from "./api";
import { Editor } from "./Editor";
import { IssueList } from "./IssueList";
import { Preview } from "./Preview";
import { SAMPLE_TEMPLATE } from "./sample";

type Tab = "issues" | "preview";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function App() {
  const [html, setHtml] = useState("");
  const [checkLinks, setCheckLinks] = useState(false);
  const [report, setReport] = useState<Report>();
  const [analyzed, setAnalyzed] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("issues");
  const [jump, setJump] = useState<{ line: number }>();
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const marks = useMemo(() => {
    const byLine = new Map<number, Severity>();
    for (const issue of report?.issues ?? []) {
      if (!issue.line) continue;
      const current = byLine.get(issue.line);
      if (!current || RANK[issue.severity] < RANK[current]) byLine.set(issue.line, issue.severity);
    }
    return byLine;
  }, [report]);

  async function run(source = html) {
    if (!source.trim()) return;
    setLoading(true);
    setError(undefined);
    try {
      setReport(await analyzeTemplate(source, checkLinks));
      setAnalyzed(source);
      setTab("issues");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function load(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setHtml(text);
    void run(text);
  }

  function select(issue: Issue) {
    if (issue.line) setJump({ line: issue.line });
  }

  const stale = report !== undefined && analyzed !== html;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" />
            <path d="M8 10.5h16v11H8z M8 11l8 6 8-6" />
          </svg>
          <div>
            <h1>email-qa</h1>
            <p>Catch broken links, missing alt text and client quirks before you hit send.</p>
          </div>
        </div>
      </header>

      <main className="workspace">
        <section
          className={dragging ? "panel source dragging" : "panel source"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void load(e.dataTransfer.files[0]);
          }}
        >
          <div className="toolbar">
            <button type="button" className="ghost" onClick={() => setHtml(SAMPLE_TEMPLATE)}>
              Load sample
            </button>
            <button type="button" className="ghost" onClick={() => fileInput.current?.click()}>
              Upload .html
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".html,.htm,text/html"
              hidden
              onChange={(e) => {
                void load(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <label className="toggle">
              <input type="checkbox" checked={checkLinks} onChange={(e) => setCheckLinks(e.target.checked)} />
              Check links
            </label>
            <button type="button" className="primary" onClick={() => void run()} disabled={loading || !html.trim()}>
              {loading ? "Checking..." : "Check template"}
            </button>
          </div>
          <Editor value={html} onChange={setHtml} marks={stale ? new Map() : marks} jump={jump} />
        </section>

        <section className="panel results">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "issues"} onClick={() => setTab("issues")}>
              Issues
              {report && (
                <span className={report.counts.error ? "tab-count has-errors" : "tab-count"}>
                  {report.issues.length}
                </span>
              )}
            </button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
              Preview
            </button>
            {report && <span className="size">{(report.sizeBytes / 1024).toFixed(1)} KB</span>}
          </div>

          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {stale && !loading && <div className="notice">The template changed since the last check.</div>}

          <div className="tab-body">
            {tab === "preview" ? (
              <Preview html={html} />
            ) : report ? (
              <IssueList report={report} onSelect={select} />
            ) : (
              <div className="empty">
                <strong>No report yet.</strong>
                <span>Paste a template or load the sample, then press Check template.</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
