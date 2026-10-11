import type { MetadataRoute } from "next";

// Lets a phone add the site to its Home Screen. An iPhone only delivers pushed ticket alerts to a
// site opened from there.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "香港壽司郎籌號",
    short_name: "壽司郎籌號",
    description: "即時查看香港壽司郎分店輪候時間。",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
