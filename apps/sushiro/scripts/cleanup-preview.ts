import { command, databaseUrl } from "./deployment-tools";
import { deletePreviewDatabase, previewName } from "./preview-database";
import { removePreviewEnvironment } from "./vercel-api";

try {
  const pullRequest = Number(process.env.DEPLOY_PR_NUMBER);
  previewName(pullRequest);
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) throw new Error("Missing GITHUB_REPOSITORY");
  const current = JSON.parse(
    await command("gh", ["api", `repos/${repository}/pulls/${pullRequest}`]),
  );
  if (current.state !== "closed" || current.head.repo.full_name !== repository) {
    console.log("Skipping cleanup for an open or external pull request");
    process.exit(0);
  }
  const branch: string = current.head.ref;
  if (!branch || branch === "main") throw new Error("A preview branch is required");
  await removePreviewEnvironment(branch);
  await deletePreviewDatabase(await databaseUrl("sushiro-preview-postgres"), pullRequest);
  console.log(`Removed the database and Vercel variable for PR ${process.env.DEPLOY_PR_NUMBER}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Preview cleanup failed");
  process.exitCode = 1;
}
