import { execFile } from "node:child_process";
import { randomInt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";
import { expect, it } from "vitest";
import { createPreviewDatabase, deletePreviewDatabase, previewName } from "./preview-database";

it.each([
  0,
  -1,
  1.5,
  NaN,
  Infinity,
])("rejects invalid PR number %s before accessing a database", (number) => {
  expect(() => previewName(number)).toThrow("positive pull request number");
});

const testUrl = process.env.SUSHIRO_TEST_DATABASE_URL;

it.skipIf(!testUrl)(
  "isolates PR credentials, serializes migrations, preserves data on rebuild, and cleans up",
  async () => {
    if (!testUrl) return;
    const firstId = randomInt(100_000_000, 200_000_000);
    const secondId = firstId + 1;
    const connections: postgres.Sql[] = [];
    const admin = postgres(testUrl, { max: 1 });
    try {
      const firstUrl = await createPreviewDatabase(testUrl, firstId);
      const secondUrl = await createPreviewDatabase(testUrl, secondId);
      const migrate = (url: string) =>
        promisify(execFile)(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], {
          env: { ...process.env, SUSHIRO_DATABASE_URL: url },
        });
      // Both runners begin with an empty database. Without the advisory lock,
      // concurrent CREATE SCHEMA / CREATE TABLE operations can race.
      await Promise.all([migrate(firstUrl), migrate(firstUrl)]);
      const first = postgres(firstUrl, { max: 1 });
      connections.push(first);
      await first`insert into sushiro_store_hours values (1, 'address', 'name', 'nameEn', '[]', '', 'unavailable', now())`;

      const crossDatabaseUrl = new URL(firstUrl);
      crossDatabaseUrl.pathname = new URL(secondUrl).pathname;
      const crossDatabase = postgres(crossDatabaseUrl.toString(), { max: 1 });
      connections.push(crossDatabase);
      await expect(crossDatabase`select 1`).rejects.toMatchObject({ code: "42501" });
      await expect(first`create database unauthorized_database`).rejects.toMatchObject({
        code: "42501",
      });

      const rebuiltUrl = await createPreviewDatabase(testUrl, firstId);
      const rebuilt = postgres(rebuiltUrl, { max: 1 });
      connections.push(rebuilt);
      await migrate(rebuiltUrl);
      expect(
        (await rebuilt`select count(*)::int as count from sushiro_store_hours`)[0]?.count,
      ).toBe(1);

      await Promise.all(connections.map((connection) => connection.end()));
      await deletePreviewDatabase(testUrl, firstId);
      await deletePreviewDatabase(testUrl, firstId);
      expect(
        await admin`select 1 from pg_database where datname = ${previewName(firstId)}`,
      ).toHaveLength(0);
      expect(
        await admin`select 1 from pg_roles where rolname = ${previewName(firstId)}`,
      ).toHaveLength(0);
      expect(
        await admin`select 1 from pg_database where datname = ${previewName(secondId)}`,
      ).toHaveLength(1);
    } finally {
      await Promise.all(connections.map((connection) => connection.end()));
      await deletePreviewDatabase(testUrl, firstId);
      await deletePreviewDatabase(testUrl, secondId);
      await admin.end();
    }
  },
  60_000,
);
