import postgres from "postgres";

const sourceUrl = process.env.SUSHIRO_LEGACY_DATABASE_URL;
const targetUrl = process.env.SUSHIRO_DATABASE_URL;

if (!sourceUrl || !targetUrl || sourceUrl === targetUrl) {
  throw new Error("Set distinct SUSHIRO_LEGACY_DATABASE_URL and SUSHIRO_DATABASE_URL values");
}

const source = postgres(sourceUrl, { max: 1, connect_timeout: 10 });
const target = postgres(targetUrl, { max: 1, connect_timeout: 10 });
const tables = [
  { name: "sushiro_queue_snapshot", jsonColumn: "store_queue" },
  { name: "sushiro_store_hours", jsonColumn: "opening_hours" },
  { name: "sushiro_ticket_report", jsonColumn: null },
] as const;

try {
  // The source is read-only. Each target batch commits separately so reruns can resume.
  await source.begin("isolation level repeatable read read only", async (read) => {
    for (const { name, jsonColumn } of tables) {
      let scanned = 0;
      let inserted = 0;

      for await (const batch of read`select * from ${read(name)}`.cursor(1_000)) {
        const rows = batch.map((row) =>
          jsonColumn ? { ...row, [jsonColumn]: target.json(row[jsonColumn]) } : row,
        );
        const saved = await target`
          insert into ${target(name)} ${target(rows)}
          on conflict do nothing
          returning 1
        `;
        scanned += rows.length;
        inserted += saved.length;
        console.log(JSON.stringify({ table: name, scanned, inserted }));
      }

      console.log(JSON.stringify({ table: name, scanned, inserted, complete: true }));
    }
  });
} finally {
  await Promise.all([source.end(), target.end()]);
}
