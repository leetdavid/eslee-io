import { isActiveStore, type QueueStore } from "@/lib/queues";

export type Language = "en" | "zh-HK";

export const copy = {
  "zh-HK": {
    activeStores: "間正在派籌",
    address: "地址",
    calledTickets: "店鋪籌號",
    close: "關閉",
    closed: "閉店中",
    comingSoon: "即將推出",
    counter: "吧檯",
    dataSource: "非官方工具，資料來自壽司郎香港。",
    fitMap: "全圖",
    grid: "主頁",
    globalQueues: "全港輪候組數",
    groups: "組",
    history: "輪候趨勢",
    historyEmpty: "首次收集後將顯示趨勢。",
    historyPeriod: {
      24: "過去 24 小時",
      168: "過去 7 日",
      720: "過去 30 日",
    },
    historyRange: {
      24: "24 小時",
      168: "7 日",
      720: "30 日",
    },
    language: "語言",
    loading: "載入中",
    long: "輪候較多",
    map: "地圖",
    mapInstructions:
      "拖曳移動地圖，滾動或雙指縮放。鍵盤方向鍵可移動，+ 和 - 可縮放，Home 可顯示全圖。",
    mapLabel: "香港壽司郎籌號",
    moderate: "輪候中等",
    navigation: "主選單",
    noQueue: "暫無輪候",
    open: "營業中",
    pair: "二人枱",
    queueBreakdown: "輪候分類",
    refresh: "更新",
    resetMap: "顯示全圖",
    retry: "重試",
    short: "輪候較少",
    stats: "統計",
    table: "餐桌",
    ticketing: "派籌中",
    ticketingPaused: "停止派籌",
    ticketingPausedNotice: "壽司郎目前未有為此分店派籌。",
    unavailable: "未能載入籌號資料",
    unplacedStores: "未編排位置的分店",
    waitingGroups: "輪候組數",
    zoomIn: "放大地圖",
    zoomOut: "縮小地圖",
  },
  en: {
    activeStores: "issuing tickets",
    address: "Address",
    calledTickets: "Called tickets",
    close: "Close",
    closed: "Closed",
    comingSoon: "Coming soon",
    counter: "Counter",
    dataSource: "Unofficial tool. Data from Sushiro Hong Kong.",
    fitMap: "Fit",
    grid: "Home",
    globalQueues: "All-store queue",
    groups: "groups",
    history: "Queue trends",
    historyEmpty: "Trends will appear after the first collection.",
    historyPeriod: {
      24: "Last 24 hours",
      168: "Last 7 days",
      720: "Last 30 days",
    },
    historyRange: {
      24: "24h",
      168: "7d",
      720: "30d",
    },
    language: "Language",
    loading: "Loading",
    long: "Long queue",
    map: "Map",
    mapInstructions:
      "Drag to move. Scroll or pinch to zoom. Use arrow keys to move, + and - to zoom, and Home to fit the whole map.",
    mapLabel: "Sushiro Hong Kong Queue",
    moderate: "Moderate queue",
    navigation: "Main navigation",
    noQueue: "No queue",
    open: "Open",
    pair: "Pair seating",
    queueBreakdown: "Queue breakdown",
    refresh: "Refresh",
    resetMap: "Fit whole map",
    retry: "Retry",
    short: "Short queue",
    stats: "Stats",
    table: "Table",
    ticketing: "Issuing tickets",
    ticketingPaused: "Ticketing paused",
    ticketingPausedNotice: "Sushiro is not issuing tickets at this store right now.",
    unavailable: "Unable to load queue data",
    unplacedStores: "Needs grid placement",
    waitingGroups: "Waiting groups",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
} as const;

export function queueBand(store: QueueStore) {
  if (!isActiveStore(store)) {
    return "muted";
  }

  if (store.wait === 0) {
    return "none";
  }

  if (store.wait <= 10) {
    return "short";
  }

  if (store.wait <= 30) {
    return "moderate";
  }

  return "long";
}

export function queueBandLabel(store: QueueStore, language: Language) {
  const text = copy[language];
  const band = queueBand(store);

  if (band === "none") {
    return text.noQueue;
  }

  if (band === "short") {
    return text.short;
  }

  if (band === "moderate") {
    return text.moderate;
  }

  return band === "long" ? text.long : null;
}
