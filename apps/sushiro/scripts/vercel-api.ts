import { vercelProjectId, vercelTeamId } from "./deployment-tools";

export async function vercelApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("Missing VERCEL_TOKEN");
  const url = new URL(path, "https://api.vercel.com");
  url.searchParams.set("teamId", vercelTeamId);
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Vercel ${method} ${url.pathname} failed with HTTP ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function setDatabaseEnvironment(
  url: string,
  target: "production" | "preview",
  branch?: string,
) {
  if (target === "preview" && !branch) throw new Error("Preview environment requires a branch");
  await vercelApi(`/v10/projects/${vercelProjectId}/env?upsert=true`, "POST", {
    key: "SUSHIRO_DATABASE_URL",
    value: url,
    type: "encrypted",
    target: [target],
    ...(branch ? { gitBranch: branch } : {}),
  });
}

export async function removePreviewEnvironment(branch: string) {
  if (!branch || branch === "main") throw new Error("A preview branch is required");
  const { envs } = await vercelApi<{
    envs: { id: string; key: string; gitBranch?: string; target: string[] }[];
  }>(`/v10/projects/${vercelProjectId}/env`);
  for (const variable of envs) {
    if (
      variable.key === "SUSHIRO_DATABASE_URL" &&
      variable.gitBranch === branch &&
      variable.target.includes("preview")
    ) {
      await vercelApi(`/v9/projects/${vercelProjectId}/env/${variable.id}`, "DELETE");
    }
  }
}
