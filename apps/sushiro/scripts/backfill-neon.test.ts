import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { expect, it } from "vitest";

const testUrl = process.env.SUSHIRO_TEST_DATABASE_URL;

it.skipIf(!testUrl)(
  "backfills across batches and resumes without overwriting Railway data",
  async () => {
    if (!testUrl) return;
    const admin = postgres(testUrl, { max: 1 });
    const suffix = randomBytes(6).toString("hex");
    const sourceName = `backfill_source_${suffix}`;
    const targetName = `backfill_target_${suffix}`;
    const sourceUrl = new URL(testUrl);
    const targetUrl = new URL(testUrl);
    sourceUrl.pathname = `/${sourceName}`;
    targetUrl.pathname = `/${targetName}`;
    const source = postgres(sourceUrl.toString(), { max: 1 });
    const target = postgres(targetUrl.toString(), { max: 1 });

    try {
      await admin`create database ${admin(sourceName)}`;
      await admin`create database ${admin(targetName)}`;
      for (const connection of [source, target]) {
        await migrate(drizzle(connection), {
          migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
        });
      }
      await source`
      insert into sushiro_queue_snapshot
      select id, '2026-09-01T04:00:00Z', 'address', 'area', 22, 114, 'name', 'nameEn',
        'ONLINE', '[123,"A002"]'::jsonb, 'OPEN', 3, 1, 1, 1
      from generate_series(1, 1001) as id
    `;
      await source`
      insert into sushiro_store_hours values
      (1, 'address', 'name', 'nameEn', '["11:00-22:00"]', '12345678', 'google_maps', now())
    `;
      await source`
      insert into sushiro_ticket_report
      (owner_hash, store_id, store_name, store_name_en, ticket_number, ticket_key, queue_date, taken_at)
      values ('owner', 1, 'name', 'nameEn', 'A002', 'A002', '2026-09-01', '2026-09-01T04:00:00Z')
    `;

      async function backfill() {
        await promisify(execFile)(
          process.execPath,
          ["--import", "tsx", "scripts/backfill-neon.ts"],
          {
            env: {
              ...process.env,
              SUSHIRO_LEGACY_DATABASE_URL: sourceUrl.toString(),
              SUSHIRO_DATABASE_URL: targetUrl.toString(),
            },
          },
        );
      }

      await backfill();
      expect(
        (await target`select count(*)::int as count from sushiro_queue_snapshot`)[0]?.count,
      ).toBe(1001);
      expect(
        (await target`select store_queue from sushiro_queue_snapshot limit 1`)[0]?.store_queue,
      ).toEqual([123, "A002"]);
      expect(
        (await target`select opening_hours from sushiro_store_hours`)[0]?.opening_hours,
      ).toEqual(["11:00-22:00"]);
      expect(
        (await target`select queue_date::text from sushiro_ticket_report`)[0]?.queue_date,
      ).toBe("2026-09-01");

      await target`update sushiro_ticket_report set called_at = '2026-09-01T04:30:00Z'`;
      await backfill();
      expect(
        (await target`select count(*)::int as count from sushiro_queue_snapshot`)[0]?.count,
      ).toBe(1001);
      const [ticket] = await target`select called_at from sushiro_ticket_report`;
      expect(new Date(ticket?.called_at).toISOString()).toBe("2026-09-01T04:30:00.000Z");
      expect((await source`select called_at from sushiro_ticket_report`)[0]?.called_at).toBeNull();
    } finally {
      await Promise.all([source.end(), target.end()]);
      await admin`drop database if exists ${admin(sourceName)}`;
      await admin`drop database if exists ${admin(targetName)}`;
      await admin.end();
    }
  },
  60_000,
);
