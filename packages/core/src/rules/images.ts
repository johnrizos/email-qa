import type { Finding, Rule } from "../types.js";
import { classifyUrl } from "../urls.js";

export const imgAlt: Rule = {
  id: "img-alt",
  description: "Images need an alt attribute. Many clients block images by default.",
  check(ctx) {
    return ctx.select("img:not([alt])").map((img) => ({
      severity: "error",
      message: 'Image has no alt attribute. Use alt="" for purely decorative images.',
      ...ctx.locate(img),
    }));
  },
};

export const imgSrc: Rule = {
  id: "img-src",
  description: "Image sources must be absolute https URLs.",
  check(ctx) {
    const findings: Finding[] = [];

    for (const img of ctx.select("img")) {
      const src = img.attribs.src ?? "";
      const at = ctx.locate(img);

      if (/^data:/i.test(src)) {
        findings.push({
          severity: "error",
          message: "Base64 (data:) images are stripped by Gmail and blocked by Outlook. Host the image instead.",
          ...at,
        });
        continue;
      }
      // cid: points to an image attached to the message itself
      if (/^cid:/i.test(src)) continue;

      const kind = classifyUrl(src);
      if (kind === "empty") {
        findings.push({ severity: "error", message: "Image has no src.", ...at });
      } else if (kind === "relative" || kind === "placeholder") {
        findings.push({
          severity: "error",
          message: `Relative image path "${src}" won't load in an inbox.`,
          ...at,
        });
      } else if (kind === "insecure") {
        findings.push({
          severity: "warning",
          message: "Image is served over http://. Some clients will block it or show a warning.",
          ...at,
        });
      }
    }

    return findings;
  },
};

export const imgWidth: Rule = {
  id: "img-width",
  description: "Images should have a width attribute so Outlook doesn't render them at full size.",
  check(ctx) {
    return ctx.select("img:not([width])").map((img) => ({
      severity: "warning",
      message: "Image has no width attribute. Outlook for Windows ignores CSS width on images.",
      ...ctx.locate(img),
    }));
  },
};
