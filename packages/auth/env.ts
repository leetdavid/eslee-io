import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_DISCORD_ID: z.string().min(1),
    AUTH_DISCORD_SECRET: z.string().min(1),
    AUTH_SECRET:
      process.env.NODE_ENV === "production" ? z.string().min(1) : z.string().min(1).optional(),
    // CLERK_SECRET_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  client: {
    // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    //   process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
