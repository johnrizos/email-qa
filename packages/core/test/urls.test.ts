import { describe, expect, it } from "vitest";
import { classifyUrl } from "../src/urls.js";

describe("classifyUrl", () => {
  it.each([
    [undefined, "empty"],
    ["   ", "empty"],
    ["#", "placeholder"],
    ["#section", "placeholder"],
    ["javascript:void(0)", "script"],
    ["https://example.com", "ok"],
    ["HTTPS://EXAMPLE.COM", "ok"],
    ["mailto:hi@example.com", "ok"],
    ["tel:+302100000000", "ok"],
    ["http://example.com", "insecure"],
    ["/pricing", "relative"],
    ["images/logo.png", "relative"],
    ["//cdn.example.com/a.png", "relative"],
  ])("%s -> %s", (url, kind) => {
    expect(classifyUrl(url)).toBe(kind);
  });

  it.each(["%%view_online%%", "{{ unsubscribe_url }}", "*|UNSUB|*", "#SPCUNSUBSCRIBE#"])(
    "treats ESP merge tag %s as valid",
    (tag) => {
      expect(classifyUrl(tag)).toBe("merge-tag");
    },
  );
});
