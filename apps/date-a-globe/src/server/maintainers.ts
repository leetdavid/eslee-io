import "server-only";

import { DateAGlobeMaintainer } from "@eslee/db/date-a-globe";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDatabase } from "@/server/database";
import { signInEnabled } from "@/server/github-env";
import { USER_AGENT } from "@/server/safe-fetch";

const REPOSITORY = "leetdavid/eslee-io";
const RECHECK_MS = 60 * 60_000;

export interface Reviewer {
  userId: string;
  login: string;
  name: string;
  image: string | null;
  isMaintainer: boolean;
}

/** Asks GitHub, with the user's own token, whether they can maintain or administer the repository. */
async function askGitHub(token: string) {
  const headers = {
    authorization: `Bearer ${token}`,
    "user-agent": USER_AGENT,
    accept: "application/vnd.github+json",
  };
  const [user, repo] = await Promise.all([
    fetch("https://api.github.com/user", { headers, signal: AbortSignal.timeout(8_000) }),
    fetch(`https://api.github.com/repos/${REPOSITORY}`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    }),
  ]);
  if (!user.ok || !repo.ok) return null;
  const login = ((await user.json()) as { login: string }).login;
  const permissions = (
    (await repo.json()) as { permissions?: { admin?: boolean; maintain?: boolean } }
  ).permissions;
  return { login, isMaintainer: !!(permissions?.admin || permissions?.maintain) };
}

/** The signed-in reviewer, if any, with a maintainer check no older than an hour. */
export async function currentReviewer(): Promise<Reviewer | null> {
  if (!signInEnabled) return null;
  // Loaded here so pages that never sign in don't need the shared session database.
  const [{ auth }, { db: authDb }, { account }] = await Promise.all([
    import("@/server/auth"),
    import("@eslee/db/client"),
    import("@eslee/db/schema"),
  ]);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const db = await getDatabase();
  const [cached] = await db
    .select()
    .from(DateAGlobeMaintainer)
    .where(eq(DateAGlobeMaintainer.userId, session.user.id))
    .limit(1);
  const base = {
    userId: session.user.id,
    name: session.user.name,
    image: session.user.image ?? null,
  };
  if (cached && Date.now() - cached.checkedAt.getTime() < RECHECK_MS)
    return { ...base, login: cached.login, isMaintainer: cached.isMaintainer };

  const [github] = await authDb
    .select({ token: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "github")))
    .limit(1);
  const answer = github?.token ? await askGitHub(github.token) : null;
  // If GitHub can't be reached, keep the last answer rather than locking a maintainer out.
  const checked =
    answer ??
    (cached
      ? { login: cached.login, isMaintainer: cached.isMaintainer }
      : { login: session.user.name, isMaintainer: false });
  if (answer) {
    await db
      .insert(DateAGlobeMaintainer)
      .values({ userId: session.user.id, ...answer, checkedAt: new Date() })
      .onConflictDoUpdate({
        target: DateAGlobeMaintainer.userId,
        set: { ...answer, checkedAt: new Date() },
      });
  }
  return { ...base, ...checked };
}
