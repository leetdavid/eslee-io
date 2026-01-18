import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";

import { Media } from "./collections/Media";
import { Photos } from "./collections/Photos";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export const config = buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Photos],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "temporary-secret-for-build",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: !!process.env.BLOB_READ_WRITE_TOKEN,
      clientUploads: true,
      collections: {
        media: {
          prefix: "media",
        },
        photos: {
          prefix: "photos",
        },
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
});

export default config;
