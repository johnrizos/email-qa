import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AnalyzeService } from "../src/analyze/analyze.service.js";

let app: INestApplication;

beforeAll(async () => {
  app = await createApp({ logger: false });
  // Link checks answer from a table instead of the network.
  app.get(AnalyzeService).fetch = (async (input: string | URL | Request) =>
    new Response(null, { status: String(input).includes("broken") ? 404 : 200 })) as typeof fetch;
  await app.init();
});

afterAll(() => app.close());

const http = () => request(app.getHttpServer());

describe("GET /api/health", () => {
  it("responds ok", async () => {
    await http().get("/api/health").expect(200, { status: "ok" });
  });
});

describe("GET /api/rules", () => {
  it("lists every rule, including the opt-in link check", async () => {
    const res = await http().get("/api/rules").expect(200);
    const ids = res.body.map((r: { id: string }) => r.id);
    expect(ids).toContain("img-alt");
    expect(ids).toContain("link-status");
  });
});

describe("POST /api/analyze", () => {
  it("returns the report for posted HTML", async () => {
    const res = await http()
      .post("/api/analyze")
      .send({ html: '<a href="#">x</a>' })
      .expect(200);

    expect(res.body.counts.error).toBe(1);
    expect(res.body.issues).toContainEqual(expect.objectContaining({ rule: "link-href", line: 1 }));
  });

  it("rejects a missing or empty html field", async () => {
    await http().post("/api/analyze").send({}).expect(400);
    await http().post("/api/analyze").send({ html: "   " }).expect(400);
    await http().post("/api/analyze").send({ html: 42 }).expect(400);
  });

  it("accepts templates above the default 100 KB body limit", async () => {
    const html = `<p>${"a".repeat(150 * 1024)}</p>`;
    const res = await http().post("/api/analyze").send({ html }).expect(200);
    expect(res.body.issues).toContainEqual(expect.objectContaining({ rule: "gmail-clipping" }));
  });

  it("rejects templates over 1 MB", async () => {
    await http()
      .post("/api/analyze")
      .send({ html: "a".repeat(1024 * 1024 + 1) })
      .expect(413);
  });

  it("only checks links when asked to", async () => {
    const html = '<a href="https://example.com/broken">x</a>';

    const without = await http().post("/api/analyze").send({ html }).expect(200);
    expect(without.body.issues.map((i: { rule: string }) => i.rule)).not.toContain("link-status");

    const withLinks = await http().post("/api/analyze").send({ html, checkLinks: true }).expect(200);
    expect(withLinks.body.issues).toContainEqual(
      expect.objectContaining({ rule: "link-status", severity: "error", line: 1 }),
    );
  });
});

describe("POST /api/analyze/upload", () => {
  it("analyzes an uploaded .html file", async () => {
    const res = await http()
      .post("/api/analyze/upload")
      .attach("file", Buffer.from('<img src="https://x.com/a.png">'), "template.html")
      .expect(200);

    expect(res.body.issues).toContainEqual(expect.objectContaining({ rule: "img-alt" }));
  });

  it("passes checkLinks through the query string", async () => {
    const res = await http()
      .post("/api/analyze/upload?checkLinks=true")
      .attach("file", Buffer.from('<a href="https://x.com/broken">x</a>'), "t.htm")
      .expect(200);

    expect(res.body.issues).toContainEqual(expect.objectContaining({ rule: "link-status" }));
  });

  it("rejects other file types and missing files", async () => {
    await http()
      .post("/api/analyze/upload")
      .attach("file", Buffer.from("x"), "notes.txt")
      .expect(400);
    await http().post("/api/analyze/upload").expect(400);
  });
});
