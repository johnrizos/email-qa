import type { Report } from "@email-qa/core";

export type { Issue, Report, Severity } from "@email-qa/core";

export class ApiError extends Error {}

export async function analyzeTemplate(html: string, checkLinks: boolean): Promise<Report> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ html, checkLinks }),
    });
  } catch {
    throw new ApiError("Can't reach the API. Is it running?");
  }

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(message ?? `The API answered with HTTP ${res.status}.`);
  }
  return body as Report;
}
