import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Nanum_Pen_Script } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/pretendard.css";
import "@/app/globals.css";
import { getLocale } from "@/server/locale";

// Both faces cover Hangul through Google's unicode-range slices, which
// next/font self-hosts; nothing is fetched from Google at runtime.
const bagel = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bagel",
  preload: false,
});
const pen = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pen",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "Jev MBTI", template: "%s · Jev MBTI" },
  description: "Ask anything. Jev places all 16 MBTI types, then the red pen checks its work.",
};

export const viewport: Viewport = { themeColor: "#e8ecf3" };

export default async function Layout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${bagel.variable} ${pen.variable}`}>
      <body>{children}</body>
    </html>
  );
}
