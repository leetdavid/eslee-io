import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractTextFromContent(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromContent).join(" ");
  if (typeof node === "object") {
    if ("text" in node) return node.text as string;
    if ("content" in node) return extractTextFromContent(node.content);
  }
  return "";
}

export function getClipPreview(content: unknown, length = 100): string {
  if (!content) return "";
  const text = extractTextFromContent(content).replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}...` : text;
}
