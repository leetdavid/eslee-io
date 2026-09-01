export type QueueStore = {
  address: string;
  area: string;
  id: number;
  latitude: number;
  longitude: number;
  name: string;
  nameEn: string;
  netTicketStatus: string;
  storeQueue: Array<number | string>;
  storeStatus: string;
  wait: number;
  waitingGroupCounter: number;
  waitingGroupPair: number;
  waitingGroupTable: number;
};

export type QueueSnapshot = {
  stores: QueueStore[];
};

export type QueueHistoryPoint = {
  collectedAt: string;
  wait: number;
};

export type QueueStoreHistory = {
  latestWait: number;
  name: string;
  nameEn: string;
  points: QueueHistoryPoint[];
  storeId: number;
};

export type QueueHistory = {
  global: QueueHistoryPoint[];
  stores: QueueStoreHistory[];
};

export function isTicketing(store: QueueStore) {
  return store.netTicketStatus.includes("MANUAL") || store.netTicketStatus.includes("ONLINE");
}

export function isActiveStore(store: QueueStore) {
  return store.storeStatus === "OPEN" && isTicketing(store);
}
