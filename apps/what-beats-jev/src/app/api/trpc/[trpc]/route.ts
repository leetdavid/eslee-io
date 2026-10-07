import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function handler(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return new Response("Forbidden", { status: 403 });
      }
    } catch {
      return new Response("Forbidden", { status: 403 });
    }
  }
  if (request.method === "POST") {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return new Response("Use JSON", { status: 415 });
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 32_768) {
      return new Response("Answer payload is too large", { status: 413 });
    }
    request = new Request(request.url, { method: "POST", headers: request.headers, body });
  }
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => ({ request }),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export { handler as GET, handler as POST };
