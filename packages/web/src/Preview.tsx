import { useState } from "react";

const WIDTHS = { desktop: "100%", mobile: "375px" } as const;

export function Preview({ html }: { html: string }) {
  const [device, setDevice] = useState<keyof typeof WIDTHS>("desktop");

  return (
    <div className="preview">
      <div className="filters" role="group" aria-label="Preview width">
        {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((d) => (
          <button
            key={d}
            type="button"
            className={device === d ? "filter active" : "filter"}
            aria-pressed={device === d}
            onClick={() => setDevice(d)}
          >
            {d === "desktop" ? "Desktop" : "Mobile (375px)"}
          </button>
        ))}
      </div>
      <div className="preview-stage">
        {/* Empty sandbox: the template's scripts and forms can't run here. */}
        <iframe title="Email preview" sandbox="" srcDoc={html} style={{ width: WIDTHS[device] }} />
      </div>
    </div>
  );
}
