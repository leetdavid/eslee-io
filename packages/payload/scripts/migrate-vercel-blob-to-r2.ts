import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { list } from "@vercel/blob";
import postgres from "postgres";

type BlobObject = {
  pathname: string;
  size: number;
  url: string;
};

type StoredFile = {
  filename: string | null;
  prefix: string | null;
};

const apply = process.argv.includes("--apply");

function requiredEnvironment(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function objectKey(prefix: string | null, filename: string) {
  const normalizedFilename = filename.replaceAll("\\", "/").replace(/^\/+/, "");
  const normalizedPrefix = (prefix ?? "").replace(/^\/+|\/+$/g, "");

  if (
    normalizedFilename === normalizedPrefix ||
    normalizedFilename.startsWith(`${normalizedPrefix}/`)
  ) {
    return normalizedFilename;
  }

  return normalizedPrefix ? `${normalizedPrefix}/${normalizedFilename}` : normalizedFilename;
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata !== null &&
    "httpStatusCode" in error.$metadata &&
    error.$metadata.httpStatusCode === 404
  );
}

async function getStoredObjectKeys(sql: postgres.Sql) {
  const [media, photos] = await Promise.all([
    sql<StoredFile[]>`select prefix, filename from media`,
    sql<
      StoredFile[]
    >`select prefix, filename from photos union all select prefix, sizes_thumbnail_filename as filename from photos union all select prefix, sizes_card_filename as filename from photos union all select prefix, sizes_feature_filename as filename from photos`,
  ]);

  return new Set(
    [...media, ...photos]
      .filter((file): file is StoredFile & { filename: string } => Boolean(file.filename))
      .map(({ filename, prefix }) => objectKey(prefix, filename)),
  );
}

async function getVercelBlobObjects(token: string) {
  const blobs: BlobObject[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ cursor, token });
    blobs.push(...page.blobs.map(({ pathname, size, url }) => ({ pathname, size, url })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return blobs;
}

async function copyObject({
  blob,
  bucket,
  client,
}: {
  blob: BlobObject;
  bucket: string;
  client: S3Client;
}) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: blob.pathname }));
    return "skipped";
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  const response = await fetch(blob.url);

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${blob.pathname}: ${response.status}`);
  }

  const body = Buffer.from(await response.arrayBuffer());

  if (body.length !== blob.size) {
    throw new Error(`Incomplete download for ${blob.pathname}`);
  }

  await client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      CacheControl: "public, max-age=60",
      ContentLength: body.length,
      ContentType: response.headers.get("content-type") ?? undefined,
      Key: blob.pathname,
    }),
  );

  return "copied";
}

async function copyObjectWithRetries(args: { blob: BlobObject; bucket: string; client: S3Client }) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await copyObject(args);
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `Retrying ${args.blob.pathname} after a failed source download (attempt ${attempt + 1}/${maxAttempts})`,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }

  throw new Error(`Unable to copy ${args.blob.pathname}`);
}

async function copyObjects({
  blobs,
  bucket,
  client,
}: {
  blobs: BlobObject[];
  bucket: string;
  client: S3Client;
}) {
  const stats = { copied: 0, skipped: 0 };
  let nextBlobIndex = 0;

  async function copyNextObject() {
    while (nextBlobIndex < blobs.length) {
      const blob = blobs[nextBlobIndex];
      nextBlobIndex += 1;

      if ((await copyObjectWithRetries({ blob, bucket, client })) === "copied") {
        stats.copied += 1;
      } else {
        stats.skipped += 1;
      }

      const completed = stats.copied + stats.skipped;

      if (completed % 10 === 0 || completed === blobs.length) {
        console.log(`Copied ${completed}/${blobs.length} objects`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, blobs.length) }, () => copyNextObject()));

  return stats;
}

async function main() {
  const blobToken = requiredEnvironment("BLOB_READ_WRITE_TOKEN");
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const sql = postgres(databaseUrl);

  try {
    const [storedObjectKeys, blobs] = await Promise.all([
      getStoredObjectKeys(sql),
      getVercelBlobObjects(blobToken),
    ]);
    const blobKeys = new Set(blobs.map((blob) => blob.pathname));
    const missingStoredObjects = [...storedObjectKeys].filter((key) => !blobKeys.has(key));

    if (missingStoredObjects.length > 0) {
      throw new Error(
        `${missingStoredObjects.length} database-referenced object(s) are missing from Vercel Blob`,
      );
    }

    if (!apply) {
      console.log(
        `Dry run: ${blobs.length} Vercel Blob object(s) are ready to copy; ${storedObjectKeys.size} are referenced by Payload. Re-run with --apply to migrate.`,
      );
      return;
    }

    const accountId = requiredEnvironment("R2_ACCOUNT_ID");
    const bucket = requiredEnvironment("R2_BUCKET_NAME");
    const client = new S3Client({
      credentials: {
        accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
      },
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
    });
    const { copied, skipped } = await copyObjects({ blobs, bucket, client });

    console.log(`Migration complete: ${copied} copied, ${skipped} already present.`);
  } finally {
    await sql.end();
  }
}

void main();
