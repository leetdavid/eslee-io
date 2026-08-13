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

export function isTicketing(store: QueueStore) {
  return store.netTicketStatus.includes("MANUAL") || store.netTicketStatus.includes("ONLINE");
}

export function isActiveStore(store: QueueStore) {
  return store.storeStatus === "OPEN" && isTicketing(store);
}
