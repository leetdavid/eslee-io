import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Voice chat is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { voice?: string };
  const voice = body.voice ?? "shimmer";

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[realtime/session] OpenAI error:", errorBody);
    return NextResponse.json(
      { error: "Failed to create realtime session" },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json({
    ephemeralKey: data.client_secret.value,
  });
}
