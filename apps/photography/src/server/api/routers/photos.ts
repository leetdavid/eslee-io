import type { Photo } from "@eslee/payload";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { payload } from "@/server/payload";

export const photosRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    try {
      const photos = await payload.find({
        collection: "photos",
        sort: "-captureDate",
        limit: 96,
      });

      return photos.docs;
    } catch (err) {
      console.error("Failed to fetch photos from Payload:", err);
      return [] as Photo[];
    }
  }),
});
