import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
  ],
  upload: {
    modifyResponseHeaders: ({ headers }) => {
      headers.set("Cache-Control", "public, max-age=60");
      return headers;
    },
  },
};
