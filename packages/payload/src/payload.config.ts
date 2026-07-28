import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import {
  BlocksFeature,
  CodeBlock,
  FixedToolbarFeature,
  HeadingFeature,
  InlineCodeFeature,
  InlineToolbarFeature,
  LinkFeature,
  lexicalEditor,
  UploadFeature,
} from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";

import { Media } from "./collections/Media";
import { Photos } from "./collections/Photos";
import { Posts } from "./collections/Posts";
import { Tags } from "./collections/Tags";
import { Users } from "./collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const require = createRequire(import.meta.url);
const sharp = process.env.PAYLOAD_DISABLE_SHARP === "true" ? undefined : require("sharp");
const r2Enabled = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY,
);

export const config = buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Photos, Tags, Posts],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4"] }),
      InlineCodeFeature(),
      LinkFeature(),
      UploadFeature({ collections: { media: { fields: [] } } }),
      BlocksFeature({ blocks: [CodeBlock()] }),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || "temporary-secret-for-build",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, "migrations"),
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  // biome-ignore lint/suspicious/noExplicitAny: I know it works, the types are getting in the way here
  sharp: sharp as any,
  plugins: [
    s3Storage({
      alwaysInsertFields: true,
      bucket: process.env.R2_BUCKET_NAME ?? "",
      clientUploads: true,
      collections: {
        media: {
          prefix: "media",
        },
        photos: {
          prefix: "photos",
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
        endpoint: process.env.R2_ACCOUNT_ID
          ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
          : undefined,
        region: "auto",
      },
      enabled: r2Enabled,
    }),
  ],
});

export default config;
