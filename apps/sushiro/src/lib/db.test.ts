import { afterEach, expect, it, vi } from "vitest";

const connect = vi.hoisted(() => vi.fn(() => ({})));
vi.mock("postgres", () => ({ default: connect }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

it("uses the dedicated database even when the shared Neon URL is present", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://shared-neon/database");
  vi.stubEnv("SUSHIRO_DATABASE_URL", "postgres://railway/sushiro");

  await import("@/lib/db");

  expect(connect).toHaveBeenCalledWith("postgres://railway/sushiro", expect.any(Object));
});

it("fails clearly instead of falling back to the quota-limited shared database", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://shared-neon/database");
  vi.stubEnv("SUSHIRO_DATABASE_URL", undefined);

  await expect(import("@/lib/db")).rejects.toThrow("Missing SUSHIRO_DATABASE_URL");
  expect(connect).not.toHaveBeenCalled();
});
