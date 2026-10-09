import { JevMbtiChart } from "@eslee/db/jev-mbti";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/database";

// Example charts are chosen by the site owner:
//   pnpm examples list | add <id> | remove <id>
const [command, id] = process.argv.slice(2);
const db = await getDatabase();

if (command === "add" || command === "remove") {
  if (!id) throw new Error(`Usage: pnpm examples ${command} <chart id>`);
  const rows = await db
    .update(JevMbtiChart)
    .set({ isExample: command === "add" })
    .where(eq(JevMbtiChart.id, id))
    .returning({
      id: JevMbtiChart.id,
      question: JevMbtiChart.question,
      reviewStatus: JevMbtiChart.reviewStatus,
    });
  if (!rows.length) throw new Error(`No chart ${id}`);
  console.log(command === "add" ? "Featured" : "Unfeatured", rows[0]);
} else if (command === "list") {
  const rows = await db
    .select({
      id: JevMbtiChart.id,
      question: JevMbtiChart.question,
      example: JevMbtiChart.isExample,
      review: JevMbtiChart.reviewStatus,
    })
    .from(JevMbtiChart)
    .orderBy(desc(JevMbtiChart.createdAt))
    .limit(40);
  console.table(rows);
} else {
  console.log("Usage: pnpm examples list | add <id> | remove <id>");
}
process.exit(0);
