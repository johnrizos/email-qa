import { describe, expect, it } from "vitest";
import { createSafeFetch, isPublicAddress } from "../src/analyze/safe-fetch.js";

describe("isPublicAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPublicAddress(ip)).toBe(false),
  );

  it.each(["93.184.215.14", "8.8.8.8", "2606:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) =>
    expect(isPublicAddress(ip)).toBe(true),
  );

  it("rejects things that aren't IP addresses", () => {
    expect(isPublicAddress("localhost")).toBe(false);
  });
});

describe("createSafeFetch", () => {
  const dns: Record<string, string> = { "public.test": "93.184.215.14", "internal.test": "10.0.0.5" };
  const lookup = async (host: string) => (dns[host] ? [{ address: dns[host] }] : []);

  /** Upstream fetch that serves redirects from a table. */
  function upstream(redirects: Record<string, string> = {}, calls: string[] = []) {
    return (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      const location = redirects[url];
      return location
        ? new Response(null, { status: 302, headers: { location } })
        : new Response("ok", { status: 200 });
    }) as typeof fetch;
  }

  it("fetches public hosts", async () => {
    const safe = createSafeFetch({ fetch: upstream(), lookup });
    expect((await safe("https://public.test/")).status).toBe(200);
  });

  it("refuses private hosts, IP literals and unknown hosts before any request", async () => {
    const calls: string[] = [];
    const safe = createSafeFetch({ fetch: upstream({}, calls), lookup });

    await expect(safe("https://internal.test/")).rejects.toThrow("private address");
    await expect(safe("http://127.0.0.1:8080/")).rejects.toThrow("private address");
    await expect(safe("http://[::1]/")).rejects.toThrow("private address");
    await expect(safe("https://nowhere.test/")).rejects.toThrow("private address");
    await expect(safe("file:///etc/passwd")).rejects.toThrow("not checked");
    expect(calls).toEqual([]);
  });

  it("checks every redirect hop", async () => {
    const calls: string[] = [];
    const safe = createSafeFetch({
      fetch: upstream({ "https://public.test/go": "http://internal.test/admin" }, calls),
      lookup,
    });

    await expect(safe("https://public.test/go")).rejects.toThrow("private address");
    expect(calls).toEqual(["https://public.test/go"]);
  });

  it("follows relative redirects and stops after too many", async () => {
    const safe = createSafeFetch({
      fetch: upstream({ "https://public.test/a": "/b", "https://public.test/b": "/a" }),
      lookup,
      maxRedirects: 3,
    });

    await expect(safe("https://public.test/a")).rejects.toThrow("more than 3 redirects");
  });
});
