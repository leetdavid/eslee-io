import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createClient } from "redis";

const port = Number(process.env.PORT ?? 3000);
const redisUrl = process.env.REDIS_URL;
const token = process.env.SUSHIRO_CACHE_GATEWAY_TOKEN;
const maximumBodyBytes = 1_000_000;
const maximumTtlSeconds = 5 * 60;
const cacheKeys = new Set([
  "sushiro:queues",
  "sushiro:queues:refresh-lock",
  "sushiro:queues:charts:grid",
  "sushiro:queues:charts:grid:refresh-lock",
]);

if (!redisUrl || !token) {
  throw new Error("REDIS_URL and SUSHIRO_CACHE_GATEWAY_TOKEN are required");
}

const cache = createClient({ url: redisUrl });
cache.on("error", () => {});

class RequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function isAuthorized(request: IncomingMessage) {
  const authorization = request.headers.authorization;
  const expected = Buffer.from(`Bearer ${token}`);
  const received = typeof authorization === "string" ? Buffer.from(authorization) : null;

  return received?.length === expected.length && timingSafeEqual(received, expected);
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > maximumBodyBytes) {
      throw new RequestError(413, "Request body is too large");
    }

    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new RequestError(400, "Request body must be valid JSON");
  }
}

function requestValue(body: unknown, name: string) {
  if (!body || typeof body !== "object") {
    throw new RequestError(400, "Request body must be an object");
  }

  return (body as Record<string, unknown>)[name];
}

function cacheKey(body: unknown) {
  const key = requestValue(body, "key");

  if (typeof key !== "string" || !cacheKeys.has(key)) {
    throw new RequestError(400, "Cache key is not allowed");
  }

  return key;
}

async function handleCache(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    send(response, 405, { error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(request)) {
    send(response, 401, { error: "Unauthorized" });
    return;
  }

  const body = await readBody(request);
  const action = requestValue(body, "action");
  const key = cacheKey(body);

  if (action === "get") {
    send(response, 200, { value: await cache.get(key) });
    return;
  }

  if (action === "set") {
    const value = requestValue(body, "value");
    const ttl = requestValue(body, "ttl");
    const nx = requestValue(body, "nx");

    if (
      typeof value !== "string" ||
      typeof ttl !== "number" ||
      !Number.isSafeInteger(ttl) ||
      ttl < 1 ||
      ttl > maximumTtlSeconds ||
      (nx !== undefined && typeof nx !== "boolean")
    ) {
      throw new RequestError(400, "Cache value, TTL, or NX flag is invalid");
    }

    const stored = await cache.set(key, value, nx ? { EX: ttl, NX: true } : { EX: ttl });
    send(response, 200, { stored: stored === "OK" });
    return;
  }

  if (action === "delete") {
    send(response, 200, { deleted: (await cache.del(key)) > 0 });
    return;
  }

  throw new RequestError(400, "Cache action is not allowed");
}

const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;

    if (path === "/health" && request.method === "GET") {
      await cache.ping();
      send(response, 200, { ok: true });
      return;
    }

    if (path === "/") {
      await handleCache(request, response);
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof RequestError) {
      send(response, error.status, { error: error.message });
      return;
    }

    send(response, 503, { error: "Cache unavailable" });
  }
});

await cache.connect();

server.listen(port, "0.0.0.0");

async function shutdown() {
  server.close();
  await cache.quit();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
