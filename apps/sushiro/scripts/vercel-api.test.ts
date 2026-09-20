import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkDeploymentHealth } from "./vercel-api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("VERCEL_TOKEN", "test-api-token");
  vi.stubEnv("GITHUB_ACTIONS", "false");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementationOnce(async (_url, init) => {
    const { generate } = JSON.parse(init?.body as string);
    return Response.json({
      protectionBypass: {
        existing: { scope: "automation-bypass", note: "Someone else's bypass" },
        temporary: { scope: "automation-bypass", note: generate.note },
      },
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("waits for a new bypass to reach the edge without forwarding it to the login redirect", async () => {
  vi.useFakeTimers();
  fetchMock
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://vercel.com/sso-api?url=candidate" },
      }),
    )
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(Response.json({}));

  const check = checkDeploymentHealth("https://candidate.vercel.app");
  await vi.advanceTimersByTimeAsync(2_000);
  await check;

  expect(fetchMock.mock.calls[1]?.[0]?.toString()).toBe("https://candidate.vercel.app/api/health");
  expect(fetchMock.mock.calls[2]?.[0]?.toString()).toBe("https://candidate.vercel.app/api/health");
  expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toEqual({
    revoke: { secret: "temporary", regenerate: false },
  });
});

it("checks the protected candidate and revokes only its temporary bypass", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(Response.json({}));

  await checkDeploymentHealth("https://candidate.vercel.app");

  expect(fetchMock.mock.calls[1]?.[0]?.toString()).toBe("https://candidate.vercel.app/api/health");
  expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
    "x-vercel-protection-bypass": "temporary",
  });
  expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
    revoke: { secret: "temporary", regenerate: false },
  });
});

it.each([
  200, 503,
])("rejects an unhealthy HTTP %s candidate and still revokes the bypass", async (status) => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ ok: false }, { status }))
    .mockResolvedValueOnce(Response.json({}));

  await expect(checkDeploymentHealth("https://candidate.vercel.app")).rejects.toThrow(
    "failed its database health check",
  );
  expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
    revoke: { secret: "temporary", regenerate: false },
  });
});

it("revokes the temporary bypass when the health request cannot connect", async () => {
  fetchMock
    .mockRejectedValueOnce(new Error("Connection failed"))
    .mockResolvedValueOnce(Response.json({}));

  await expect(checkDeploymentHealth("https://candidate.vercel.app")).rejects.toThrow(
    "Connection failed",
  );
  expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
    revoke: { secret: "temporary", regenerate: false },
  });
});
