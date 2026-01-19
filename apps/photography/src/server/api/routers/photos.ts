// import { config } from "@eslee/payload";
import type { Photo } from "@eslee/payload";
// import { getPayload } from "payload";
import { env } from "../../../env";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const photosRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    if (env.NODE_ENV === "development") {
      try {
        const res = await fetch("http://localhost:3002/api/photos?sort=-captureDate&limit=100");
        const data = (await res.json()) as { docs: Photo[] };
        return data.docs;
      } catch (e) {
        console.warn("Failed to fetch from dev CMS", e);
        return [] as Photo[];
      }
    }

    try {
      // Allow skipping Payload initialization for builds where DB is not available
      if (process.env.SKIP_PAYLOAD) {
        console.warn("Skipping Payload initialization due to SKIP_PAYLOAD env var");
        return [] as Photo[];
      }

      // Ensure we have a database URL before trying to initialize Payload
      if (!process.env.DATABASE_URL) {
        console.warn("No DATABASE_URL found, returning empty photos list");
        return [] as Photo[];
      }

      const { getPayload } = await import("payload");
      const { config } = await import("@eslee/payload");

      const payload = await getPayload({ config });

      const photos = await payload.find({
        collection: "photos",
        sort: "-captureDate",
        limit: 100,
      });

      return photos.docs;
    } catch (err) {
      console.error("Failed to fetch photos from Payload:", err);
      // Return empty array so build doesn't fail
      return [] as Photo[];
    }
  }),
});
