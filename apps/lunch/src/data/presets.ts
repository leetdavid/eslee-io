export type LunchSpot = {
  name: string;
  url?: string;
};

export type LunchPreset = {
  title: string;
  spots: LunchSpot[];
};

export const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const DEFAULT_SPOTS: LunchSpot[] = [
  { name: "Maison Libanaise", url: mapsUrl("Maison Libanaise") },
  { name: "BaseHall", url: mapsUrl("BaseHall") },
  { name: "Kyung Yang Katsu", url: mapsUrl("Kyung Yang Katsu") },
  {
    name: "Unremarkable Korean Place (Jeonpo Meat Shop)",
    url: mapsUrl("Jeonpo Meat Shop"),
  },
  { name: "Zagin Soba" },
  { name: "Art & Taste", url: mapsUrl("Art & Taste (美食台灣餐廳)") },
  { name: "Servo", url: mapsUrl("Servo") },
  { name: "Samsic", url: mapsUrl("Samsic") },
  { name: "Blue Supreme", url: mapsUrl("Blue Supreme") },
  { name: "La Parrilla", url: mapsUrl("La Parrilla") },
  { name: "Morty's", url: mapsUrl("Morty's") },
  { name: "obp.ㅇㅂㅍ" },
  { name: "Urban Coffee Roaster SOHO" },
  { name: "IFC (Shake Shack)", url: mapsUrl("Shake Shack IFC") },
  { name: "BRKLYN Pizza", url: mapsUrl("BRKLYN Pizza") },
  { name: "The Globe", url: mapsUrl("The Globe") },
  { name: "Jus", url: mapsUrl("Jus") },
  { name: "Samsen", url: mapsUrl("Samsen") },
  { name: "Here Thai", url: mapsUrl("Here Thai") },
  { name: "Korean" },
  { name: "Brunch" },
  { name: "Ramen" },
  { name: "Pizza" },
  { name: "Burger" },
  { name: "Sushi" },
  { name: "Sandwich" },
];

export const RECOMMENDED_PRESETS: LunchPreset[] = [
  { title: "Today's Lunch", spots: DEFAULT_SPOTS },
  {
    title: "Dessert",
    spots: [
      { name: "Ice Cream" },
      { name: "Bakery" },
      { name: "Café" },
      { name: "Patisserie" },
      { name: "Gelato" },
      { name: "Bingsu" },
    ],
  },
  {
    title: "4:30pm Snack",
    spots: [
      { name: "Bakehouse", url: mapsUrl("Bakehouse Staunton") },
      { name: "Amo·Ago", url: mapsUrl("Amo·Ago") },
      { name: "Vission Bakery", url: mapsUrl("Vission Bakery") },
      { name: "Frenchies", url: mapsUrl("Frenchies") },
      { name: "Coffee Shop" },
      { name: "Boba" },
      { name: "Convenience Store" },
      { name: "Snack Bar" },
      { name: "Fruit Stand" },
      { name: "Chips" },
    ],
  },
];
