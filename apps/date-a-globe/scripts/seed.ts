// Adds the researched events to the database. Run with `pnpm db:seed`; it never changes reviewed events.
import { getDatabase } from "../src/server/database";
import { seedEvents } from "../src/server/seed";

const { added, total } = await seedEvents(await getDatabase());
console.log(`Seeded ${added} of ${total} researched events`);
process.exit(0);
