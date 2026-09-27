import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import type { Report } from "../src/api";

const report: Report = {
  sizeBytes: 2048,
  counts: { error: 1, warning: 1, info: 0 },
  issues: [
    { rule: "document-meta", severity: "warning", message: "Missing <title>." },
    { rule: "link-href", severity: "error", message: 'Placeholder link "#".', line: 3, snippet: '<a href="#">' },
  ],
};

function mockApi(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  it("sends the template to the API and lists the issues", async () => {
    const fetch = mockApi(200, report);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(screen.getByRole("checkbox", { name: "Check links" }));
    await user.click(screen.getByRole("button", { name: "Check template" }));

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/analyze");
    expect(JSON.parse(String(init.body))).toMatchObject({ checkLinks: true });

    expect(await screen.findByText('Placeholder link "#".')).toBeInTheDocument();
    expect(screen.getByText("Line 3")).toBeInTheDocument();
    expect(screen.getByText("Document")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("selects the offending line when an issue is clicked", async () => {
    mockApi(200, report);
    const user = userEvent.setup();
    render(<App />);

    const editor = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Email HTML" });
    await user.click(editor);
    await user.paste("<p>one</p>\n<p>two</p>\n<a href=\"#\">three</a>");
    await user.click(screen.getByRole("button", { name: "Check template" }));
    await user.click(await screen.findByText('Placeholder link "#".'));

    expect(editor.value.slice(editor.selectionStart, editor.selectionEnd)).toBe('<a href="#">three</a>');
  });

  it("filters issues by severity", async () => {
    mockApi(200, report);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(screen.getByRole("button", { name: "Check template" }));
    await user.click(await screen.findByRole("button", { name: /Errors/ }));

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText('Placeholder link "#".')).toBeInTheDocument();
  });

  it("shows the API's error message", async () => {
    mockApi(413, { statusCode: 413, message: "Templates are limited to 1024 KB." });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(screen.getByRole("button", { name: "Check template" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Templates are limited to 1024 KB.");
  });

  it("warns when the template changes after a check", async () => {
    mockApi(200, report);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Load sample" }));
    await user.click(screen.getByRole("button", { name: "Check template" }));
    await screen.findByText('Placeholder link "#".');
    await user.type(screen.getByRole("textbox", { name: "Email HTML" }), "x");

    expect(screen.getByText("The template changed since the last check.")).toBeInTheDocument();
  });
});
