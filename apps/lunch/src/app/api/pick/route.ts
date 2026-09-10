import { mapsUrl } from "@/data/presets";

type LunchItem = {
  name: string;
};

type LunchChoice = LunchItem & {
  googleMapsLink: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function response(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

function parseItems(value: unknown): LunchItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const items: LunchItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const { name } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim()) {
      return null;
    }

    items.push({ name: name.trim() });
  }

  return items;
}

function choose(items: LunchItem[], count: number): LunchItem[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const selected = shuffled[randomIndex];
    if (!current || !selected) continue;
    shuffled[index] = selected;
    shuffled[randomIndex] = current;
  }
  return shuffled.slice(0, count);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET() {
  return response({
    endpoint: "/api/pick",
    method: "POST",
    body: {
      items: [
        {
          name: "Lunch spot",
        },
      ],
      topN: 3,
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Request body must be an object." }, { status: 400 });
  }

  const { items: rawItems, topN: rawTopN = 3 } = body as Record<string, unknown>;
  const items = parseItems(rawItems);
  if (!items) {
    return response(
      { error: "items must be a non-empty list of { name } objects." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(rawTopN) || typeof rawTopN !== "number" || rawTopN < 1) {
    return response({ error: "topN must be a positive integer." }, { status: 400 });
  }

  const choices: LunchChoice[] = choose(items, Math.min(rawTopN, items.length)).map((item) => ({
    ...item,
    googleMapsLink: mapsUrl(item.name),
  }));
  return response({ choices });
}
