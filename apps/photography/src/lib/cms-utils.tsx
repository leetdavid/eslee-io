"use client";
import { env } from "@/env";

export function getImageUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // Use the configured CMS URL from environment variables
  const baseUrl = env.NEXT_PUBLIC_CMS_URL || "https://cms.eslee.io";
  return `${baseUrl}${url}`;
}
