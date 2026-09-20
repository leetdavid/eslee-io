import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { mask } from "./deployment-tools";

export function previewName(pullRequest: number) {
  if (!Number.isSafeInteger(pullRequest) || pullRequest < 1) {
    throw new Error("A positive pull request number is required");
  }
  return `sushiro_pr_${pullRequest}`;
}

async function withPreviewLock<T>(
  adminUrl: string,
  name: string,
  run: (sql: postgres.Sql) => Promise<T>,
) {
  const sql = postgres(adminUrl, { max: 1, connect_timeout: 10, onnotice: () => {} });
  try {
    await sql`set lock_timeout = '60s'`;
    await sql`select pg_advisory_lock(hashtext(${name}))`;
    const [database] = await sql`
      select pg_get_userbyid(datdba) as owner from pg_database where datname = ${name}
    `;
    if (database && database.owner !== name)
      throw new Error("Preview database has an unexpected owner");
    const [role] =
      await sql`select rolsuper, rolcreatedb, rolcreaterole from pg_roles where rolname = ${name}`;
    if (role && (role.rolsuper || role.rolcreatedb || role.rolcreaterole)) {
      throw new Error("Refusing to modify a privileged role");
    }
    return await run(sql);
  } finally {
    await sql.end(); // Closing the dedicated session also releases its advisory lock.
  }
}

export async function createPreviewDatabase(adminUrl: string, pullRequest: number) {
  const name = previewName(pullRequest);
  const password = randomBytes(32).toString("hex");
  mask(password);
  await withPreviewLock(adminUrl, name, async (sql) => {
    const [role] = await sql`select 1 from pg_roles where rolname = ${name}`;
    // PostgreSQL role DDL cannot bind a password parameter. Both interpolated
    // values are generated here: a validated numeric name and random hex.
    await sql.unsafe(
      `${role ? "alter" : "create"} role "${name}" login nosuperuser nocreatedb nocreaterole password '${password}'`,
    );
    const [database] = await sql`select 1 from pg_database where datname = ${name}`;
    if (!database) await sql`create database ${sql(name)} owner ${sql(name)}`;
    await sql`revoke all on database ${sql(name)} from public`;
  });
  const url = new URL(adminUrl);
  url.username = name;
  url.password = password;
  url.pathname = `/${name}`;
  mask(url.toString());
  return url.toString();
}

export async function deletePreviewDatabase(adminUrl: string, pullRequest: number) {
  const name = previewName(pullRequest);
  await withPreviewLock(adminUrl, name, async (sql) => {
    await sql`drop database if exists ${sql(name)} with (force)`;
    await sql`drop role if exists ${sql(name)}`;
  });
}
