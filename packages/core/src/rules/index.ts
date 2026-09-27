import type { Rule } from "../types.js";
import { cssSupport, externalCss } from "./css.js";
import { darkMode, documentMeta, gmailClipping } from "./document.js";
import { unsupportedElements } from "./elements.js";
import { imgAlt, imgSrc, imgWidth } from "./images.js";
import { linkHref } from "./links.js";

export const defaultRules: Rule[] = [
  linkHref,
  imgAlt,
  imgSrc,
  imgWidth,
  unsupportedElements,
  externalCss,
  cssSupport,
  gmailClipping,
  darkMode,
  documentMeta,
];
