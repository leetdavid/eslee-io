import { isActiveStore, type QueueStore } from "@/lib/queues";
import { type UsualSlot, usualRange } from "@/lib/usual";

export type Language = "en" | "zh-HK";

export const copy = {
  "zh-HK": {
    activeStores: "間正在派籌",
    averageWait: "全港平均輪候",
    bandRange: { long: "35+", moderate: "15-30", none: "0", short: "5-10" },
    branchCount: "{count} 間",
    branchesIssuing: "{count} 間分店派籌中",
    darkMode: "切換深色模式",
    groupsWaiting: "組輪候中",
    lightMode: "切換淺色模式",
    longestWaits: "輪候最耐嘅分店",
    mapCredit: "地圖來源 MapSVG，CC BY 4.0",
    allBranches: "全部分店",
    branchesMatch: "{total} 間入面有 {count} 間符合",
    chooseBranch: "揀分店",
    findBranch: "搵分店",
    myBranches: "我的分店",
    noBranchMatch: "搵唔到分店",
    otherBranches: "其他分店",
    myBranchesNote: "平時係{weekday}呢個鐘嘅輪候",
    removeBranch: "由我的分店移除",
    saveBranch: "加入我的分店",
    branchStats: "分店統計",
    usualNone: "平時唔使等",
    usualRange: "平時 {low} 至 {high} 分鐘",
    usualSheet: "{weekday}呢個鐘通常 {low} 至 {high} 分鐘",
    usualSheetNone: "{weekday}呢個鐘通常唔使等",
    legendNote: "數字係壽司郎估計輪候分鐘",
    minutes: "分鐘",
    noCalledTickets: "暫無叫號資料",
    officialWait: "壽司郎估計輪候時間",
    pausedFigure: "休",
    queueing: "輪候中",
    showAll: "顯示全部 {count} 間",
    showFewer: "顯示較少",
    territory: {
      harbour: "維多利亞港",
      hongKongIsland: "港島",
      kowloon: "九龍",
      newTerritories: "新界",
      tseungKwanO: "將軍澳",
    },
    updated: "{time} 更新",
    address: "地址",
    calledTickets: "店鋪籌號",
    close: "關閉",
    closed: "閉店中",
    comingSoon: "即將推出",
    counter: "吧檯",
    dataSource: "非官方工具，資料來自壽司郎香港。",
    fitMap: "全圖",
    grid: "主頁",
    plan: "計劃",
    planMeal: "計劃用餐",
    globalQueues: "全港輪候組數",
    groups: "組",
    history: "輪候趨勢",
    sixHours: "6 小時",
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
    allClosed: "而家冇分店派籌",
    allClosedNote: "分店收市後唔派籌",
    loadErrorNote: "壽司郎嘅資料暫時連接唔到。過一陣再試下。",
    loadErrorTitle: "暫時讀取唔到輪候資料",
    loading: "載入中",
    loadingQueues: "載入緊分店輪候…",
    planTomorrow: "計劃聽日幾時去",
    staleNotice: "更新唔到，顯示緊 {time} 嘅數字",
    tryAgain: "再試一次",
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
    tickets: "我的籌號",
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
    averageWait: "Average wait across Hong Kong",
    bandRange: { long: "35+", moderate: "15-30", none: "0", short: "5-10" },
    branchCount: "{count} branches",
    branchesIssuing: "{count} branches issuing tickets",
    darkMode: "Switch to dark mode",
    groupsWaiting: "groups waiting",
    lightMode: "Switch to light mode",
    longestWaits: "Longest waits",
    mapCredit: "Map from MapSVG, CC BY 4.0",
    allBranches: "All branches",
    branchesMatch: "{count} of {total} branches match",
    chooseBranch: "Choose a branch",
    findBranch: "Find a branch",
    myBranches: "My branches",
    noBranchMatch: "No branch matches",
    otherBranches: "Other branches",
    myBranchesNote: "Usual is for this time on {weekday}s",
    removeBranch: "Remove from My branches",
    saveBranch: "Add to My branches",
    branchStats: "Branch stats",
    usualNone: "usually no queue",
    usualRange: "usual {low} to {high} min",
    usualSheet: "Usually {low} to {high} min at this time on {weekday}s",
    usualSheetNone: "Usually no queue at this time on {weekday}s",
    legendNote: "Numbers are Sushiro's estimated wait in minutes",
    minutes: "min",
    noCalledTickets: "No called numbers supplied",
    officialWait: "Sushiro's estimated wait",
    pausedFigure: "Off",
    queueing: "Queueing",
    showAll: "Show all {count}",
    showFewer: "Show fewer",
    territory: {
      harbour: "Victoria Harbour",
      hongKongIsland: "Hong Kong Island",
      kowloon: "Kowloon",
      newTerritories: "New Territories",
      tseungKwanO: "Tseung Kwan O",
    },
    updated: "Updated {time}",
    address: "Address",
    calledTickets: "Called tickets",
    close: "Close",
    closed: "Closed",
    comingSoon: "Coming soon",
    counter: "Counter",
    dataSource: "Unofficial tool. Data from Sushiro Hong Kong.",
    fitMap: "Fit",
    grid: "Home",
    plan: "Plan",
    planMeal: "Plan a meal",
    globalQueues: "All-store queue",
    groups: "groups",
    history: "Queue trends",
    sixHours: "6h",
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
    allClosed: "No branch is issuing tickets right now",
    allClosedNote: "Branches stop issuing tickets when they close",
    loadErrorNote: "Sushiro's data could not be reached. Try again in a moment.",
    loadErrorTitle: "Queue data is unavailable right now",
    loading: "Loading",
    loadingQueues: "Loading branch queues…",
    planTomorrow: "Plan tomorrow's visit",
    staleNotice: "Could not update. Showing figures from {time}.",
    tryAgain: "Try again",
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
    tickets: "My tickets",
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

export type QueueBand = "long" | "moderate" | "muted" | "none" | "short";

export function fill(template: string, values: Record<string, number | string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function storeName(store: QueueStore, language: Language) {
  return language === "en" ? store.nameEn || store.name : store.name;
}

// Tiles, chips and rows drop the trailing 店 ("branch") that every Chinese name carries, so
// more of the name fits. The store detail sheet keeps the full name.
export function shortStoreName(store: QueueStore, language: Language) {
  return storeName(store, language).replace(/店$/, "");
}

// The source reports one waiting-group count under three seating names. They have always been
// equal, so the table count stands for the store's waiting groups.
export function waitingGroups(store: QueueStore) {
  return store.waitingGroupTable;
}

// The network total counts groups only at stores that are open and issuing tickets.
export function networkTotal(stores: QueueStore[]) {
  const activeStores = stores.filter(isActiveStore);

  return {
    activeStores: activeStores.length,
    groups: activeStores.reduce((total, store) => total + waitingGroups(store), 0),
  };
}

// Home lists: active stores with no official wait, then the rest by shortest official wait.
export function homeLists(stores: QueueStore[], language: Language) {
  const activeStores = stores.filter(isActiveStore);

  return {
    noQueue: activeStores
      .filter((store) => store.wait === 0)
      .sort((left, right) =>
        storeName(left, language).localeCompare(storeName(right, language), language),
      ),
    queueing: activeStores
      .filter((store) => store.wait > 0)
      .sort(
        (left, right) =>
          left.wait - right.wait ||
          waitingGroups(left) - waitingGroups(right) ||
          left.id - right.id,
      ),
  };
}

// The usual wait for a time of day as a short phrase, or null when nothing usual is known.
export function usualText(slot: UsualSlot | null, language: Language) {
  if (!slot) {
    return null;
  }

  const { high, low } = usualRange(slot);
  return high === 0 ? copy[language].usualNone : fill(copy[language].usualRange, { high, low });
}

// Bands are set from the official wait in minutes: 0, 5-10, 15-30, then 35 and over.
export function waitBand(wait: number): Exclude<QueueBand, "muted"> {
  if (wait <= 0) {
    return "none";
  }

  if (wait <= 10) {
    return "short";
  }

  return wait <= 30 ? "moderate" : "long";
}

export function queueBand(store: QueueStore): QueueBand {
  return isActiveStore(store) ? waitBand(store.wait) : "muted";
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
