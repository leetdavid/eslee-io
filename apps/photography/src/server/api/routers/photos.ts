import { config } from "@eslee/payload";
import type { Photo } from "@eslee/payload";
import { getPayload } from "payload";
import { env } from "../../../env";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const photosRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    if (env.NODE_ENV === "development") {
      const res = await fetch("http://localhost:3002/api/photos?sort=-captureDate&limit=100");
      const data = (await res.json()) as { docs: Photo[] };
      return data.docs;
    }

    const payload = await getPayload({ config });

    const photos = await payload.find({
      collection: "photos",
      sort: "-captureDate",
      limit: 100,
    });

    return photos.docs;
  }),
});
