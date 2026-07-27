import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = join(packageRoot, "drizzle");
const journalPath = join(migrationsFolder, "meta", "_journal.json");
const migrationsSchema = "drizzle";
const migrationsTableCandidates = ["__drizzle-migrations", "__drizzle_migrations"] as const;
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

function color(text: string, colorName: keyof typeof colors) {
  return `${colors[colorName]}${text}${colors.reset}`;
}

type Journal = {
  entries: {
    idx: number;
    when: number;
    tag: string;
    breakpoints: boolean;
  }[];
};

type LocalMigration = {
  idx: number;
  tag: string;
  createdAt: number;
  hash: string;
};

type AppliedMigration = {
  id: number;
  hash: string;
  created_at: string | number | Date | null;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL_UNPOOLED or DATABASE_URL");
  }

  return databaseUrl;
}

function readLocalMigrations(): LocalMigration[] {
  if (!existsSync(journalPath)) {
    throw new Error(`Can't find ${journalPath}`);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;

  return journal.entries.map((entry) => {
    const migrationPath = join(migrationsFolder, `${entry.tag}.sql`);

    if (!existsSync(migrationPath)) {
      throw new Error(`Migration listed in journal but missing on disk: ${entry.tag}`);
    }

    const sql = readFileSync(migrationPath, "utf8");

    return {
      idx: entry.idx,
      tag: entry.tag,
      createdAt: entry.when,
      hash: createHash("sha256").update(sql).digest("hex"),
    };
  });
}

function toMillis(value: AppliedMigration["created_at"]) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return null;
}

function formatDate(value: number | null) {
  if (!value) return "unknown";
  return new Date(value).toISOString();
}

function formatDatabaseHost(databaseUrl: string) {
  try {
    return new URL(databaseUrl).host;
  } catch {
    return "unknown";
  }
}

function formatMigrationName(tag: string) {
  return tag.replace(/^\d+_/, "");
}

function printMigrationLine(indexWidth: number, migration: LocalMigration, status: string) {
  console.log(
    `${String(migration.idx).padStart(indexWidth)}  ${formatMigrationName(migration.tag)} ${status}`,
  );
}

async function resolveMigrationsTable(sql: postgres.Sql) {
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ${migrationsSchema}
      AND table_name IN (${migrationsTableCandidates[0]}, ${migrationsTableCandidates[1]})
    ORDER BY table_name
  `;

  return tables.at(0)?.table_name ?? migrationsTableCandidates[0];
}

async function readAppliedMigrations(
  sql: postgres.Sql,
  migrationsTable: string,
): Promise<AppliedMigration[]> {
  if (
    !migrationsTableCandidates.includes(
      migrationsTable as (typeof migrationsTableCandidates)[number],
    )
  ) {
    throw new Error(`Unexpected migrations table name: ${migrationsTable}`);
  }

  const [table] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${migrationsSchema}
        AND table_name = ${migrationsTable}
    ) AS "exists"
  `;

  if (!table?.exists) return [];

  return sql<AppliedMigration[]>`
    SELECT id, hash, created_at
    FROM ${sql(migrationsSchema)}.${sql(migrationsTable)}
    ORDER BY created_at ASC, id ASC
  `;
}

async function main() {
  const localMigrations = readLocalMigrations();
  const sql = postgres(getDatabaseUrl(), { max: 1 });

  try {
    const migrationsTable = await resolveMigrationsTable(sql);
    const appliedMigrations = await readAppliedMigrations(sql, migrationsTable);
    const localByHash = new Map(localMigrations.map((migration) => [migration.hash, migration]));
    const appliedByCreatedAt = new Map(
      appliedMigrations.flatMap((migration) => {
        const millis = toMillis(migration.created_at);
        return millis === null ? [] : [[millis, migration] as const];
      }),
    );
    const appliedByHash = new Map(
      appliedMigrations.map((migration) => [migration.hash, migration]),
    );

    const pending = localMigrations.filter((migration) => !appliedByHash.has(migration.hash));
    const appliedNotLocal = appliedMigrations.filter(
      (migration) => !localByHash.has(migration.hash),
    );
    const editedAfterApply = localMigrations.filter((migration) => {
      const appliedAtSameTimestamp = appliedByCreatedAt.get(migration.createdAt);
      return appliedAtSameTimestamp && appliedAtSameTimestamp.hash !== migration.hash;
    });
    const timestampMismatches = localMigrations.filter((migration) => {
      const applied = appliedByHash.get(migration.hash);
      const appliedAt = toMillis(applied?.created_at ?? null);
      return appliedAt !== null && appliedAt !== migration.createdAt;
    });

    const lastApplied = appliedMigrations.at(-1);
    const lastAppliedAt = toMillis(lastApplied?.created_at ?? null);
    const current =
      pending.length === 0 &&
      appliedNotLocal.length === 0 &&
      editedAfterApply.length === 0 &&
      timestampMismatches.length === 0;

    const indexWidth = Math.max(
      ...localMigrations.map((migration) => String(migration.idx).length),
    );

    console.log("\nDrizzle migration status");
    console.log(
      `${formatDatabaseHost(getDatabaseUrl())} (${migrationsSchema}.${migrationsTable})\n`,
    );

    for (const migration of localMigrations) {
      const applied = appliedByHash.has(migration.hash);
      const skippedByDrizzle = lastAppliedAt !== null && migration.createdAt <= lastAppliedAt;

      if (applied) {
        printMigrationLine(indexWidth, migration, color("Applied", "green"));
      } else if (skippedByDrizzle) {
        printMigrationLine(
          indexWidth,
          migration,
          color("(not applied, older than last applied)", "yellow"),
        );
      } else {
        printMigrationLine(indexWidth, migration, color("(not applied)", "yellow"));
      }
    }

    if (current) {
      console.log(`\n${color("Up-to-date!", "green")}\n`);
      return;
    }

    console.log(`\n${color("Not up-to-date!", "red")}`);

    if (timestampMismatches.length > 0) {
      console.log("\nApplied with different Drizzle timestamps:");
      for (const migration of timestampMismatches) {
        const applied = appliedByHash.get(migration.hash);
        console.log(
          `  - ${migration.tag} local=${formatDate(migration.createdAt)} database=${formatDate(toMillis(applied?.created_at ?? null))}`,
        );
      }
    }

    if (editedAfterApply.length > 0) {
      console.log("\nModified after apply:");
      for (const migration of editedAfterApply) {
        console.log(`  - ${migration.tag}`);
      }
    }

    if (appliedNotLocal.length > 0) {
      console.log("\nApplied in database but missing locally:");
      for (const migration of appliedNotLocal) {
        console.log(
          `  - id=${migration.id} created_at=${formatDate(toMillis(migration.created_at))} hash=${migration.hash.slice(0, 12)}...`,
        );
      }
    }

    console.log("");
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("\nFailed to check migration status");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
