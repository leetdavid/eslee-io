import type { QueueSnapshot, QueueStore } from "@/lib/queues";

const source = "https://sushipass.sushiro.com.hk/api/2.0";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeStore(value: unknown): Omit<QueueStore, "storeQueue"> | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = numberValue(value.id);
  const latitude = numberValue(value.latitude);
  const longitude = numberValue(value.longitude);
  const wait = numberValue(value.wait);
  const waitingGroupCounter = numberValue(value.waitingGroupCounter);
  const waitingGroupPair = numberValue(value.waitingGroupPair);
  const waitingGroupTable = numberValue(value.waitingGroupTable);

  if (
    id === null ||
    latitude === null ||
    longitude === null ||
    wait === null ||
    waitingGroupCounter === null ||
    waitingGroupPair === null ||
    waitingGroupTable === null
  ) {
    return null;
  }

  return {
    address: textValue(value.address),
    area: textValue(value.area),
    id,
    latitude,
    longitude,
    name: textValue(value.name),
    nameEn: textValue(value.nameEn),
    netTicketStatus: textValue(value.netTicketStatus),
    storeStatus: textValue(value.storeStatus),
    wait,
    waitingGroupCounter,
    waitingGroupPair,
    waitingGroupTable,
  };
}

function queueValues(value: unknown): Array<number | string> {
  if (!isRecord(value) || !Array.isArray(value.storeQueue)) {
    throw new Error("Sushiro returned an invalid queue");
  }

  if (value.storeQueue.some((ticket) => typeof ticket !== "number" && typeof ticket !== "string")) {
    throw new Error("Sushiro returned an invalid ticket number");
  }

  return value.storeQueue;
}

async function getJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Sushiro responded with ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export async function fetchQueues(): Promise<QueueSnapshot> {
  const result = await getJson(
    `${source}/info/storelist?latitude=22&longitude=114&numresults=100&region=HK`,
  );

  if (!Array.isArray(result)) {
    throw new Error("Sushiro returned an invalid store list");
  }

  const stores: Array<Omit<QueueStore, "storeQueue">> = [];

  for (const store of result) {
    const normalizedStore = normalizeStore(store);

    if (!normalizedStore) {
      throw new Error("Sushiro returned an invalid store");
    }

    stores.push(normalizedStore);
  }

  const queues = await Promise.all(
    stores.map(async (store) => {
      const result = await getJson(`${source}/remote/groupqueues?region=HK&storeid=${store.id}`);
      return { ...store, storeQueue: queueValues(result) };
    }),
  );

  return { stores: queues };
}
