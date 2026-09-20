import { appendFile } from "node:fs/promises";
import { command, databaseUrl, vercelProjectId } from "./deployment-tools";
import { createPreviewDatabase } from "./preview-database";
import { setDatabaseEnvironment } from "./vercel-api";

const target = process.env.DEPLOY_TARGET;
const sha = process.env.DEPLOY_HEAD_SHA;
const branch = process.env.DEPLOY_BRANCH;
const pullRequest = Number(process.env.DEPLOY_PR_NUMBER);
const token = process.env.VERCEL_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if ((target !== "production" && target !== "preview") || !sha || !branch || !token || !repository) {
  throw new Error("Deployment target, head SHA, branch, Vercel token, and repository are required");
}
if (target === "production" && branch !== "main")
  throw new Error("Production deploys must come from main");

async function isCurrent() {
  const path =
    target === "production"
      ? `repos/${repository}/commits/main`
      : `repos/${repository}/pulls/${pullRequest}`;
  const result = JSON.parse(await command("gh", ["api", path]));
  return target === "production"
    ? result.sha === sha
    : result.state === "open" &&
        result.head.sha === sha &&
        result.head.repo.full_name === repository;
}

try {
  if (!(await isCurrent())) {
    console.log("Skipping a superseded commit or closed pull request");
    process.exit(0);
  }
  const adminUrl = await databaseUrl(
    target === "production" ? "sushiro-postgres" : "sushiro-preview-postgres",
  );
  const url =
    target === "production" ? adminUrl : await createPreviewDatabase(adminUrl, pullRequest);
  console.log("Applying Sushiro migrations before building the deployment");
  console.log(
    await command("pnpm", ["--filter", "@eslee/sushiro", "db:migrate"], {
      ...process.env,
      SUSHIRO_DATABASE_URL: url,
    }),
  );
  await setDatabaseEnvironment(url, target, target === "preview" ? branch : undefined);

  const authentication = ["--token", token, "--scope", "eslee"];
  const deployment = await command("vercel", [
    "deploy",
    "--yes",
    "--project",
    vercelProjectId,
    "--env",
    `SUSHIRO_DATABASE_URL=${url}`,
    "--build-env",
    `SUSHIRO_DATABASE_URL=${url}`,
    ...(target === "production" ? ["--prod", "--skip-domain"] : []),
    "--meta",
    `githubCommitSha=${sha}`,
    "--meta",
    `githubCommitRef=${branch}`,
    ...authentication,
  ]);
  const deploymentUrl = new URL(deployment).toString();
  const health = JSON.parse(
    await command("vercel", [
      ...authentication,
      "curl",
      "/api/health",
      "--deployment",
      deploymentUrl,
      "--",
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "30",
    ]),
  );
  if (health.ok !== true)
    throw new Error("The candidate deployment failed its database health check");

  if (!(await isCurrent())) {
    console.log("Candidate passed its health check, but the source changed; skipping promotion");
    process.exit(0);
  }
  if (target === "production") {
    console.log(await command("vercel", ["promote", deploymentUrl, "--yes", ...authentication]));
  }
  console.log(`${target} deployment verified: ${deploymentUrl}`);
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `url=${deploymentUrl}\n`);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Sushiro ${target}: ${deploymentUrl}\n\nMigrations and database health check passed.\n`,
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Sushiro deployment failed");
  process.exitCode = 1;
}
