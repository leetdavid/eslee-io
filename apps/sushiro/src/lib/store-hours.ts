import type { QueueStore } from "@/lib/queues";

const concurrentLookups = 5;

export type StoreHours = {
  address: string;
  name: string;
  nameEn: string;
  openingHours: string[];
  phone: string;
  source: "google_maps" | "unavailable";
  storeId: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function unavailableHours(store: QueueStore): StoreHours {
  return {
    address: store.address,
    name: store.name,
    nameEn: store.nameEn,
    openingHours: [],
    phone: "",
    source: "unavailable",
    storeId: store.id,
  };
}

async function googleMapsHours(store: QueueStore): Promise<StoreHours> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return unavailableHours(store);
  }

  const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    body: JSON.stringify({
      languageCode: "zh-Hant",
      maxResultCount: 1,
      regionCode: "HK",
      textQuery: `${store.name} ${store.address}`,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.id",
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });

  if (!searchResponse.ok) {
    return unavailableHours(store);
  }

  const searchResult = (await searchResponse.json()) as unknown;
  const place =
    isRecord(searchResult) && Array.isArray(searchResult.places) && isRecord(searchResult.places[0])
      ? searchResult.places[0]
      : null;
  const placeId = place ? stringValue(place.id) : "";

  if (!placeId) {
    return unavailableHours(store);
  }

  const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "internationalPhoneNumber,regularOpeningHours.weekdayDescriptions",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!detailsResponse.ok) {
    return unavailableHours(store);
  }

  const details = (await detailsResponse.json()) as unknown;
  const openingHours =
    isRecord(details) && isRecord(details.regularOpeningHours)
      ? stringArray(details.regularOpeningHours.weekdayDescriptions)
      : [];

  return openingHours.length > 0
    ? {
        address: store.address,
        name: store.name,
        nameEn: store.nameEn,
        openingHours,
        phone: isRecord(details) ? stringValue(details.internationalPhoneNumber) : "",
        source: "google_maps",
        storeId: store.id,
      }
    : unavailableHours(store);
}

export async function fetchStoreHours(stores: QueueStore[]): Promise<StoreHours[]> {
  const results: StoreHours[] = [];

  for (let index = 0; index < stores.length; index += concurrentLookups) {
    const batch = await Promise.all(
      stores
        .slice(index, index + concurrentLookups)
        .map((store) => googleMapsHours(store).catch(() => unavailableHours(store))),
    );

    results.push(...batch);
  }

  return results;
}
