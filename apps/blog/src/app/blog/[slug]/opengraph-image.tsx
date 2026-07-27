import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/server/posts";

export const alt = "David E. S. Lee - Blog";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return new ImageResponse(
    <div
      style={{
        background: "#faf9f6",
        color: "#292826",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ fontSize: 30 }}>DAVID E. S. LEE / BLOG</div>
      <div
        style={{
          fontSize: 68,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          maxWidth: "1000px",
        }}
      >
        {post?.title ?? "Technical writing"}
      </div>
    </div>,
    size,
  );
}
