import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "香港壽司郎籌號",
  description: "即時查看香港壽司郎分店輪候組數。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
