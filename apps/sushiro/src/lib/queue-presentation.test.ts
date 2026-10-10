import { describe, expect, it } from "vitest";
import {
  fill,
  homeLists,
  networkTotal,
  queueBand,
  shortStoreName,
  storeName,
  waitingGroups,
} from "@/lib/queue-presentation";
import type { QueueStore } from "@/lib/queues";

function store(overrides: Partial<QueueStore> = {}): QueueStore {
  return {
    address: "",
    area: "",
    id: 1,
    latitude: 22.3,
    longitude: 114.1,
    name: "旺角店",
    nameEn: "Mong Kok",
    netTicketStatus: "OFFLINE_MANUAL",
    storeQueue: [],
    storeStatus: "OPEN",
    wait: 0,
    waitingGroupCounter: 0,
    waitingGroupPair: 0,
    waitingGroupTable: 0,
    ...overrides,
  };
}

describe("queueBand", () => {
  it.each([
    [0, "none"],
    [5, "short"],
    [10, "short"],
    [15, "moderate"],
    [30, "moderate"],
    [35, "long"],
    [449, "long"],
  ])("puts an official wait of %i minutes in the %s band", (wait, band) => {
    expect(queueBand(store({ wait }))).toBe(band);
  });

  it("mutes a closed store and one not issuing tickets, whatever the wait", () => {
    expect(queueBand(store({ storeStatus: "CLOSED", wait: 40 }))).toBe("muted");
    expect(queueBand(store({ netTicketStatus: "OFF", wait: 40 }))).toBe("muted");
  });
});

describe("networkTotal", () => {
  it("sums waiting groups, not minutes, across active stores only", () => {
    const stores = [
      store({ id: 1, wait: 90, waitingGroupTable: 109 }),
      store({ id: 2, wait: 5, waitingGroupTable: 2 }),
      store({ id: 3, storeStatus: "CLOSED", wait: 20, waitingGroupTable: 30 }),
    ];

    expect(networkTotal(stores)).toEqual({ activeStores: 2, groups: 111 });
    expect(waitingGroups(stores[0] as QueueStore)).toBe(109);
  });
});

describe("homeLists", () => {
  const stores = [
    store({ id: 1, nameEn: "Tuen Mun Town Plaza", wait: 90, waitingGroupTable: 109 }),
    store({ id: 2, nameEn: "Sheung Wan", wait: 5, waitingGroupTable: 2 }),
    store({ id: 3, nameEn: "Jordan JD Mall", wait: 5, waitingGroupTable: 5 }),
    store({ id: 4, nameEn: "Wo Che", wait: 0 }),
    store({ id: 5, nameEn: "Fanling Centre", wait: 0 }),
    store({ id: 6, nameEn: "Lam Tin", storeStatus: "CLOSED", wait: 0 }),
  ];

  it("lists no-queue stores by name and leaves inactive stores out", () => {
    expect(homeLists(stores, "en").noQueue.map(({ id }) => id)).toEqual([5, 4]);
  });

  it("orders queueing stores by shortest official wait, then fewest groups", () => {
    expect(homeLists(stores, "en").queueing.map(({ id }) => id)).toEqual([2, 3, 1]);
  });
});

describe("copy helpers", () => {
  it("fills placeholders and falls back to the Chinese name when English is missing", () => {
    expect(fill("Show all {count}", { count: 31 })).toBe("Show all 31");
    expect(storeName(store({ nameEn: "" }), "en")).toBe("旺角店");
    expect(storeName(store(), "zh-HK")).toBe("旺角店");
  });

  it("drops the trailing 店 for tiles and rows but leaves English names alone", () => {
    expect(shortStoreName(store(), "zh-HK")).toBe("旺角");
    expect(shortStoreName(store(), "en")).toBe("Mong Kok");
  });
});
