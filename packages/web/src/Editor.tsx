import { useEffect, useMemo, useRef } from "react";
import type { Severity } from "./api";

interface Props {
  value: string;
  onChange(value: string): void;
  /** Worst severity per line, shown as a mark in the gutter. */
  marks: Map<number, Severity>;
  /** Changing this object selects that line and scrolls to it. */
  jump?: { line: number };
}

const LINE_HEIGHT = 20;

export function Editor({ value, onChange, marks, jump }: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => value.split("\n").length, [value]);

  useEffect(() => {
    const el = textarea.current;
    if (!el || !jump) return;

    const lines = el.value.split("\n");
    const line = Math.min(jump.line, lines.length);
    const start = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0);

    el.focus({ preventScroll: true });
    el.setSelectionRange(start, start + lines[line - 1].length);
    el.scrollTop = Math.max(0, (line - 1) * LINE_HEIGHT - el.clientHeight / 3);
  }, [jump]);

  return (
    <div className="editor" style={{ "--line-height": `${LINE_HEIGHT}px` } as React.CSSProperties}>
      <div className="gutter" ref={gutter} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => {
          const mark = marks.get(i + 1);
          return (
            <div key={i} className={mark ? `gutter-line mark-${mark}` : "gutter-line"}>
              {i + 1}
            </div>
          );
        })}
      </div>
      <textarea
        ref={textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
        }}
        spellCheck={false}
        wrap="off"
        aria-label="Email HTML"
        placeholder="Paste your email HTML here, drop a file, or load the sample."
      />
    </div>
  );
}
