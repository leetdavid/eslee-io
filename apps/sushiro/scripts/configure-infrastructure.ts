import { databaseUrl, environmentId, railway, railwayScope } from "./deployment-tools";

type Status = {
  services: { edges: { node: { id: string; name: string } }[] };
  environments: {
    edges: {
      node: {
        id: string;
        volumeInstances: { edges: { node: { id: string; serviceId: string } }[] };
      };
    }[];
  };
};

const status: Status = JSON.parse(await railway(["status", ...railwayScope, "--json"]));
const environment = status.environments.edges.find(({ node }) => node.id === environmentId)?.node;
if (!environment) throw new Error("Railway production environment was not found");

for (const name of ["sushiro-postgres", "sushiro-preview-postgres"] as const) {
  const service = status.services.edges.find(({ node }) => node.name === name)?.node;
  if (!service) throw new Error(`Missing Railway service ${name}; apply .railway/railway.ts first`);
  const scope = [...railwayScope, "--service", service.id, "--json"];
  let proxies: { proxies: { applicationPort: number; syncStatus: string }[] } = JSON.parse(
    await railway(["tcp-proxy", "list", ...scope]),
  );
  if (proxies.proxies.length === 0) {
    await railway(["tcp-proxy", "create", "--port", "5432", ...scope]);
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    proxies = JSON.parse(await railway(["tcp-proxy", "list", ...scope]));
    if (
      proxies.proxies.some(
        (proxy) => proxy.applicationPort === 5432 && proxy.syncStatus === "ACTIVE",
      )
    )
      break;
    if (attempt === 29) throw new Error(`${name} TCP proxy did not become active on port 5432`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  const values: Record<string, string> = JSON.parse(await railway(["variable", "list", ...scope]));
  if (!values.DATABASE_PUBLIC_URL) {
    await railway([
      "variable",
      "set",
      ...scope,
      "--skip-deploys",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Railway resolves these references.
      "DATABASE_PUBLIC_URL=postgresql://${{PGUSER}}:${{PGPASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{PGDATABASE}}?sslmode=require",
    ]);
  }
  const publicUrl = new URL(await databaseUrl(name));
  if (
    !publicUrl.hostname ||
    !publicUrl.port ||
    publicUrl.searchParams.get("sslmode") !== "require"
  ) {
    throw new Error(`${name} public database URL is incomplete or does not require TLS`);
  }

  if (name === "sushiro-postgres") {
    const volume = environment.volumeInstances.edges.find(
      ({ node }) => node.serviceId === service.id,
    )?.node;
    if (!volume) throw new Error("Production Postgres has no persistent volume");
    const variables = JSON.stringify({ id: volume.id });
    const query =
      "query($id: String!) { volumeInstanceBackupScheduleList(volumeInstanceId: $id) { kind } }";
    const readSchedules = async () => {
      const result = JSON.parse(await railway(["api", query, "--variables", variables]));
      return result.data.volumeInstanceBackupScheduleList.map(
        (schedule: { kind: string }) => schedule.kind,
      ) as string[];
    };
    const schedules = await readSchedules();
    if (!schedules.includes("DAILY") || !schedules.includes("WEEKLY")) {
      await railway([
        "api",
        "mutation($id: String!, $kinds: [VolumeInstanceBackupScheduleKind!]!) { volumeInstanceBackupScheduleUpdate(volumeInstanceId: $id, kinds: $kinds) }",
        "--variables",
        JSON.stringify({ id: volume.id, kinds: [...new Set([...schedules, "DAILY", "WEEKLY"])] }),
      ]);
    }
    const verified = await readSchedules();
    if (!verified.includes("DAILY") || !verified.includes("WEEKLY"))
      throw new Error("Production backup verification failed");
  }
  console.log(
    `${name}: TCP proxy${name === "sushiro-postgres" ? " and daily/weekly backups" : ""} verified`,
  );
}
