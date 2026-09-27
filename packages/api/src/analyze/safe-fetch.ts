import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Addresses a public server must never be tricked into requesting (SSRF):
// loopback, private networks, link-local (cloud metadata lives at 169.254.169.254), etc.
const blocked = new BlockList();
const V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];
const V6: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];
for (const [net, prefix] of V4) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of V6) blocked.addSubnet(net, prefix, "ipv6");

export function isPublicAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return isPublicAddress(mapped[1]);

  const family = isIP(address);
  if (family === 0) return false;
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class BlockedUrlError extends Error {
  override name = "BlockedUrlError";
}

type Lookup = (hostname: string) => Promise<{ address: string }[]>;

export interface SafeFetchOptions {
  fetch?: typeof globalThis.fetch;
  lookup?: Lookup;
  maxRedirects?: number;
}

/**
 * A fetch that only talks to public hosts. Redirects are followed by hand so
 * every hop is checked, not just the first URL.
 *
 * Known gap: the address is resolved here and again by fetch, so a DNS server
 * that answers differently the second time (DNS rebinding) could slip through.
 * Closing that needs a connect-time check in a custom dispatcher.
 */
export function createSafeFetch(options: SafeFetchOptions = {}): typeof globalThis.fetch {
  const {
    fetch = globalThis.fetch,
    lookup = (host: string) => dnsLookup(host, { all: true }),
    maxRedirects = 5,
  } = options;

  async function assertPublic(url: URL) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BlockedUrlError(`${url.protocol} URLs are not checked`);
    }
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host);
    if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
      throw new BlockedUrlError("host resolves to a private address");
    }
  }

  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    let url = new URL(input instanceof Request ? input.url : String(input));

    for (let hop = 0; ; hop++) {
      await assertPublic(url);
      const res = await fetch(url, { ...init, redirect: "manual" });

      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) return res;
      if (hop === maxRedirects) throw new Error(`more than ${maxRedirects} redirects`);

      url = new URL(location, url);
    }
  }) as typeof globalThis.fetch;
}
