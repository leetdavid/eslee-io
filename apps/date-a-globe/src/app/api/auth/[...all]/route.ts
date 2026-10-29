import { signInEnabled } from "@/server/github-env";

// Auth loads only where sign-in is on; previews have neither an OAuth app nor the session database.
async function handle(request: Request) {
  if (!signInEnabled) return new Response("Sign-in is off here", { status: 404 });
  const [{ toNextJsHandler }, { auth }] = await Promise.all([
    import("better-auth/next-js"),
    import("@/server/auth"),
  ]);
  const handlers = toNextJsHandler(auth);
  return request.method === "POST" ? handlers.POST(request) : handlers.GET(request);
}

export { handle as GET, handle as POST };
