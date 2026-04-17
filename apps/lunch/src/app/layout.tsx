import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const fontDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "lunch — a slot machine for deciding where to eat",
  description: "Spin the reel. Commit to the answer. Go eat.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen antialiased",
          fontBody.variable,
          fontDisplay.variable,
          fontMono.variable,
        )}
      >
        {children}
      </body>
    </html>
  );
}
