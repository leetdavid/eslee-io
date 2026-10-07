import type { Metadata } from "next";
import { Figtree, Sour_Gummy } from "next/font/google";
import type { ReactNode } from "react";
import "@/app/globals.css";

const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
const display = Sour_Gummy({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "What Beats Jev?",
  description:
    "Anything goes. What beats rock? Build the longest chain you can, with Jev making the call.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
