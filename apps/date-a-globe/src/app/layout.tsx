import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Geist_Mono,
  Geologica,
  Josefin_Sans,
  Jost,
  Old_Standard_TT,
  Roboto,
} from "next/font/google";
import type { ReactNode } from "react";
import "@/app/globals.css";

// Geologica runs the game. The others dress only the reveal, one per era, so none of them preload.
const geologica = Geologica({ subsets: ["latin"], variable: "--font-geologica" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", preload: false });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", preload: false });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", preload: false });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  preload: false,
});
const oldStandard = Old_Standard_TT({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-old-standard",
  preload: false,
});
const josefin = Josefin_Sans({ subsets: ["latin"], variable: "--font-josefin", preload: false });
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto",
  preload: false,
});

const site =
  process.env.VERCEL_ENV === "production" ? "https://dateaglobe.eslee.io" : "http://localhost:3012";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Date a Globe", template: "%s · Date a Globe" },
  description:
    "Answer yes, no or can't tell about what your globe shows, and find out when it was printed.",
  openGraph: { siteName: "Date a Globe", type: "website" },
};

export const viewport: Viewport = { themeColor: "#efeee9" };

export default function Layout({ children }: { children: ReactNode }) {
  const fonts = [geologica, mono, jost, bodoni, cormorant, oldStandard, josefin, roboto]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts}>
      <body>{children}</body>
    </html>
  );
}
