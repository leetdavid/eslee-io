import "server-only";

import { suggestAxes } from "@/server/axes";
import { chartService } from "@/server/charts";
import { getDatabase } from "@/server/database";
import { placeTypes } from "@/server/jev";
import { LLM_LABEL } from "@/server/models";
import { writeReview } from "@/server/review";

export const charts = chartService({
  db: getDatabase,
  suggestAxes,
  placeTypes,
  writeReview,
  reviewModel: LLM_LABEL,
  secret: () => {
    const secret = process.env.RATE_LIMIT_SECRET;
    if (!secret) throw new Error("Signing secret is not configured");
    return secret;
  },
  now: Date.now,
});
