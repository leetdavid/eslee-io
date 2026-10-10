export type StoreGrid = ReadonlyArray<ReadonlyArray<string | null>>;

export type TerritoryBand = "newTerritories" | "kowloon" | "hongKongIsland";

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
    "Dragon Centre",
    "Mong Kok",
    "Kai Tak Mall 2",
    "Kowloon Bay Telford Plaza 2",
    "Kowloon Bay Amoy",
    "Hang Hau",
  ],
  [
    "Nam Cheong V-Walk",
    "Jordan JD Mall",
    "Whampoa Fashion World",
    "Kwun Tong",
    "Lam Tin",
    "TKO Plaza",
  ],
  [
    "Olympian City 2",
    "Tsim Sha Tsui Granville Road",
    "Whampoa Deli Place",
    null,
    "Yau Tong",
    "The LOHAS",
  ],
  [
    "Aberdeen Port Centre Shopping Arcade",
    "Sheung Wan",
    "Wan Chai Emperor Group Centre",
    "Causeway Bay Plaza 2",
    "Harbour North Phase 2",
    "Quarry Bay",
  ],
] as const satisfies StoreGrid;

// Rows of the grid that belong to each territory band, north to south. Kowloon's sixth column is
// Tseung Kwan O, and Hong Kong Island sits below the harbour divider.
const bandRows: ReadonlyArray<{ band: TerritoryBand; from: number; to: number }> = [
  { band: "newTerritories", from: 0, to: 3 },
  { band: "kowloon", from: 3, to: 7 },
  { band: "hongKongIsland", from: 7, to: 8 },
];

export const storeGridBands = bandRows.map(({ band, from, to }) => ({
  band,
  cells: storeGrid.slice(from, to).flatMap((row, rowIndex) =>
    row.map((name, columnIndex) => ({
      key: `grid-${from + rowIndex + 1}-${columnIndex + 1}`,
      name,
    })),
  ),
}));

export const storeGridNames: string[] = storeGrid.flatMap((row) =>
  row.flatMap((name) => (name ? [name] : [])),
);

function normalizedName(name: string) {
  return name.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase();
}

const bandByName = new Map(
  storeGridBands.flatMap(({ band, cells }) =>
    cells.flatMap(({ name }) => (name ? [[normalizedName(name), band] as const] : [])),
  ),
);

// The territory band a branch sits in on the grid, from its English name. Null for a branch
// that has not been placed yet.
export function territoryBandOf(nameEn: string): TerritoryBand | null {
  return bandByName.get(normalizedName(nameEn)) ?? null;
}
