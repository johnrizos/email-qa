import type { Element } from "domhandler";
import { textContent } from "domutils";

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function styleText(styles: Element[]): string {
  return styles.map((el) => textContent(el)).join("\n");
}
