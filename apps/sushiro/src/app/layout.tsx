import type { Metadata } from "next";
import { Inter, Noto_Sans_HK } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ axes: ["opsz"], subsets: ["latin"], variable: "--font-inter" });
// Hong Kong Chinese fallback for devices without PingFang HK.
const notoSansHk = Noto_Sans_HK({ preload: false, variable: "--font-noto-hk" });

// Applies the saved or system theme before first paint, so dark mode never flashes light.
const themeScript = `(function(){try{var t=localStorage.getItem("sushiro-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export const metadata: Metadata = {
  title: "香港壽司郎籌號",
  description: "即時查看香港壽司郎分店輪候時間。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${inter.variable} ${notoSansHk.variable}`}
      lang="zh-HK"
      suppressHydrationWarning
    >
      <body>
        <Script id="sushiro-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
