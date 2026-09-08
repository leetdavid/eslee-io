export type StoreGrid = ReadonlyArray<ReadonlyArray<string | null>>;

// Keep this geographic layout in display-name form so it can be rearranged without looking up IDs.
// Empty cells retain the intended relative positions between nearby stores.
export const storeGrid = [
  [
    "Tin Shui Wai T Town",
    "Yuen Long Plaza",
    "KOLOUR Yuen Long",
    "Sheung Shui Spot",
    "Fanling Centre",
    null,
  ],
  ["Tuen Mun Town Plaza", "Tsuen Wan Plaza", "Luk Yeung", "Tai Wo Plaza", "Tai Po", "Ma On Shan"],
  [
    "Tuen Mun Waldorf Avenue",
    "Maritime Square 1",
    "Kwai Fong",
    "New Town Plaza Phase 3, Sha Tin",
    "Shatin Centre",
    "Wo Che",
  ],
  ["Lai Chi Kok", "Mong Kok East Moko", "Lok Fu", "Wong Tai Sin", "San Po Kong Mikiki", "Po Lam"],
  [
    "Nam Cheong V-Walk",
    "Mong Kok",
    "Kai Tak Mall 2",
    "Kowloon Bay Telford Plaza 2",
    "Kowloon Bay Amoy",
    "Hang Hau",
  ],
  [
    "Olympian City 2",
    "Jordan JD Mall",
    "Whampoa Fashion World",
    "Kwun Tong",
    "Lam Tin",
    "TKO Plaza",
  ],
  [null, "Tsim Sha Tsui Granville Road", "Whampoa Deli Place", null, "Yau Tong", "The LOHAS"],
  [
    "Aberdeen Port Centre Shopping Arcade",
    "Sheung Wan",
    "Causeway Bay Plaza 2",
    "Harbour North Phase 2",
    "Quarry Bay",
    null,
  ],
] as const satisfies StoreGrid;

export const storeGridCells = storeGrid.flatMap((row, rowIndex) =>
  row.map((name, columnIndex) => ({
    key: `grid-${rowIndex + 1}-${columnIndex + 1}`,
    name,
  })),
);
