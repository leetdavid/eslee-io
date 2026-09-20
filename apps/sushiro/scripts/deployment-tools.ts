import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
export const projectId = "28fa81db-2e0a-44f6-a2f6-6f2296b2fad1";
export const environmentId = "52f8807d-84a4-4fbc-ae43-50ebdeb98649";
export const vercelProjectId = "prj_gfTnc5u6lO9BLdsovERkpQ51vc8p";
export const vercelTeamId = "team_tPjktSIurawh0LBAXsKia7HA";

export function command(binary: string, args: string[], env = process.env) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: repositoryRoot,
      env,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      // Arguments can contain credentials. Never include them in an exception.
      if (code !== 0) reject(new Error(`${binary} exited with code ${code}`));
      else resolve(output.trim());
    });
  });
}

export function railway(args: string[]) {
  return command("railway", args, {
    ...process.env,
    RAILWAY_CALLER: "eslee:sushiro-ci",
    RAILWAY_AGENT_SESSION: process.env.GITHUB_RUN_ID ?? "sushiro-local",
  });
}

export const railwayScope = ["--project", projectId, "--environment", environmentId];

export function mask(value: string) {
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${value}`);
}

export async function databaseUrl(service: "sushiro-postgres" | "sushiro-preview-postgres") {
  const variables: Record<string, string> = JSON.parse(
    await railway(["variable", "list", ...railwayScope, "--service", service, "--json"]),
  );
  const url = variables.DATABASE_PUBLIC_URL;
  if (!url) throw new Error(`Missing DATABASE_PUBLIC_URL on ${service}`);
  mask(url);
  mask(new URL(url).password);
  return url;
}
