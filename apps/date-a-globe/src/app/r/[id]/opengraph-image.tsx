import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ERA_NAMES } from "@/components/certificate";
import { type Era, yearOf } from "@/engine";
import { resultFor } from "@/server/results";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "When this globe was most likely printed";

// Each era's look, reduced to what the share image needs: paper, ink, accent, and its two faces.
const LOOKS: Record<
  Era,
  {
    paper: string;
    ink: string;
    accent: string;
    range: string;
    text: string;
    files: [string, string];
  }
> = {
  engraved: {
    paper: "#F7F2E6",
    ink: "#2B241D",
    accent: "#B8432F",
    range: "Bodoni",
    text: "Cormorant",
    files: ["bodoni-600.woff", "cormorant-italic-500.woff"],
  },
  imperial: {
    paper: "#F4EBD6",
    ink: "#2A2A2A",
    accent: "#A3263A",
    range: "OldStandard",
    text: "OldStandardText",
    files: ["old-standard-700.woff", "old-standard-400.woff"],
  },
  interwar: {
    paper: "#F1E8D0",
    ink: "#1C2B2C",
    accent: "#C2412F",
    range: "Josefin",
    text: "JosefinText",
    files: ["josefin-700.woff", "josefin-500.woff"],
  },
  mid: {
    paper: "#F7F5EE",
    ink: "#1D1D1B",
    accent: "#D7382F",
    range: "Jost",
    text: "JostText",
    files: ["jost-700.woff", "jost-500.woff"],
  },
  web: {
    paper: "#FFFFFF",
    ink: "#202124",
    accent: "#1A73E8",
    range: "Roboto",
    text: "RobotoText",
    files: ["roboto-500.woff", "roboto-400.woff"],
  },
};

const asset = (...parts: string[]) => join(process.cwd(), ...parts);

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const found = await resultFor((await params).id);
  const era: Era = found?.play.result.era ?? "mid";
  const look = LOOKS[era];
  const [rangeFont, textFont, brandFont, brandLight, globe, icon] = await Promise.all([
    readFile(asset("src/app/fonts", look.files[0])),
    readFile(asset("src/app/fonts", look.files[1])),
    readFile(asset("src/app/fonts", "geologica-600.woff")),
    readFile(asset("src/app/fonts", "geologica-400.woff")),
    readFile(asset("public/eras", `${era}.png`)),
    readFile(asset("public/brand", "icon-small.png")),
  ]);
  const result = found?.play.result;
  const label = result?.label ?? "Date a Globe";
  const from = result ? yearOf(result.window.from) : 1805;
  const to = result ? yearOf(result.window.to) : 2026;
  const s0 = Math.floor((from + to) / 2 / 5) * 5 - 15;
  const s1 = s0 + 30;
  const x = (y: number) => Math.max(0, Math.min(560, ((y - s0) / (s1 - s0)) * 560));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: look.paper,
        color: look.ink,
        position: "relative",
        padding: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 16,
          top: 16,
          width: 1168,
          height: 598,
          border: `2.5px solid ${look.ink}`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 24,
          width: 1152,
          height: 582,
          border: `1px solid ${look.ink}`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 66,
          width: 640,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: look.text,
            fontSize: 17,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: look.accent,
          }}
        >
          {`${ERA_NAMES[era].name} · ${ERA_NAMES[era].years}`}
        </div>
        <div style={{ fontFamily: look.text, fontSize: 26, marginTop: 26 }}>
          My globe was most likely printed in
        </div>
        <div
          style={{
            fontFamily: look.range,
            fontSize: Math.min(100, Math.floor(1120 / label.length)),
            lineHeight: 1,
            whiteSpace: "nowrap",
            marginTop: 12,
            marginBottom: 34,
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 560 }}>
          <div style={{ fontFamily: look.text, fontSize: 14, letterSpacing: 2.6 }}>
            SCALE OF YEARS
          </div>
          <div style={{ position: "relative", display: "flex", height: 52, marginTop: 8 }}>
            <div
              style={{
                position: "absolute",
                left: x(from),
                top: 0,
                width: Math.max(8, x(to + 1) - x(from)),
                height: 26,
                background: look.accent,
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 30,
                width: 560,
                height: 9,
                border: `1.5px solid ${look.ink}`,
                display: "flex",
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <div
                  key={k}
                  style={{
                    width: 93,
                    height: "100%",
                    background: k % 2 ? "transparent" : look.ink,
                    display: "flex",
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: look.text,
              fontSize: 15,
            }}
          >
            {[s0, s0 + 10, s0 + 20, s1].map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>
      </div>
      {/* biome-ignore lint/performance/noImgElement: satori draws plain img elements */}
      <img
        src={`data:image/png;base64,${globe.toString("base64")}`}
        width={410}
        height={410}
        style={{ position: "absolute", right: 62, top: 96 }}
        alt=""
      />
      {result && (
        <div
          style={{
            position: "absolute",
            right: 56,
            bottom: 62,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 26px",
            border: `3.4px solid ${look.accent}`,
            borderRadius: 8,
            color: look.accent,
            background: look.paper,
            transform: "rotate(-8deg)",
          }}
        >
          <span style={{ fontFamily: look.range, fontSize: 32 }}>{result.sure}%</span>
          <span style={{ fontFamily: look.text, fontSize: 13, letterSpacing: 2.4 }}>SURE</span>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 56,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: satori draws plain img elements */}
        <img
          src={`data:image/png;base64,${icon.toString("base64")}`}
          width={44}
          height={44}
          alt=""
        />
        <span style={{ fontFamily: "Geologica", fontSize: 28, marginLeft: 12, letterSpacing: -1 }}>
          date
        </span>
        <span style={{ fontFamily: "GeologicaLight", fontSize: 28, marginLeft: 7 }}>a</span>
        <span style={{ fontFamily: "Geologica", fontSize: 28, marginLeft: 7, letterSpacing: -1 }}>
          globe
        </span>
        <span
          style={{
            fontFamily: "GeologicaLight",
            fontSize: 19,
            color: "#55514A",
            marginLeft: 22,
            paddingLeft: 16,
            borderLeft: "1.5px solid rgba(29,29,27,.25)",
          }}
        >
          dateaglobe.eslee.io · Date yours in about a dozen questions
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: look.range, data: rangeFont, style: "normal" },
        { name: look.text, data: textFont, style: era === "engraved" ? "italic" : "normal" },
        { name: "Geologica", data: brandFont, weight: 600 },
        { name: "GeologicaLight", data: brandLight, weight: 400 },
      ],
    },
  );
}
