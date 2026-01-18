import { config } from "@eslee/payload";
import { getPayload } from "payload";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const photosRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const payload = await getPayload({ config });

    const photos = await payload.find({
      collection: "photos",
      sort: "-captureDate",
      limit: 100,
    });

    return photos.docs;
  }),
});
