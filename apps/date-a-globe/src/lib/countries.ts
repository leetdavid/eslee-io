import type { Region } from "@/engine";

// ISO 3166-1 alpha-2 codes by the game's regions. A country that spans two regions is in both.
const BY_REGION: Record<Region, string> = {
  Europe:
    "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK GE AM AZ TR KZ",
  "Middle East": "AE BH CY EG IL IQ IR JO KW LB OM PS QA SA SY TR YE AM AZ GE",
  Africa:
    "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  Asia: "AF BD BN BT CN HK ID IN JP KG KH KP KR KZ LA LK MM MN MO MV MY NP PH PK RU SG TH TJ TL TM TW UZ VN IR",
  "North America":
    "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  "South America": "AR BO BR CL CO EC FK GF GY PE PY SR UY VE GS",
  Oceania: "AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
  Antarctica: "AQ BV HM TF",
};

const REGIONS_OF = new Map<string, Region[]>();
for (const [region, codes] of Object.entries(BY_REGION) as [Region, string][]) {
  for (const code of codes.split(" "))
    REGIONS_OF.set(code, [...(REGIONS_OF.get(code) ?? []), region]);
}

/** The regions a country lies in; Russia is split at the Urals. */
export function regionsOf(countryCode: string, lon?: number): Region[] {
  const code = countryCode.toUpperCase();
  if (code === "RU" && lon !== undefined) return lon < 60 ? ["Europe"] : ["Asia"];
  return REGIONS_OF.get(code) ?? [];
}
