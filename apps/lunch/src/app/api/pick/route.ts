type LunchItem = {
  name: string;
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

    const { name, googleMapsLink } = item as Record<string, unknown>;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof googleMapsLink !== "string" ||
      !googleMapsLink.trim()
    ) {
      return null;
    }

    try {
      const url = new URL(googleMapsLink);
      if (url.protocol !== "https:") return null;
    } catch {
      return null;
    }

    items.push({ name: name.trim(), googleMapsLink: googleMapsLink.trim() });
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
          googleMapsLink: "https://www.google.com/maps/search/?api=1&query=Lunch+spot",
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
      { error: "items must be a non-empty list of { name, googleMapsLink } objects." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(rawTopN) || typeof rawTopN !== "number" || rawTopN < 1) {
    return response({ error: "topN must be a positive integer." }, { status: 400 });
  }

  const choices = choose(items, Math.min(rawTopN, items.length));
  return response({ choices });
}
