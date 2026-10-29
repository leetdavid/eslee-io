import type { Metadata } from "next";
import { Game } from "@/components/game/game";

export const metadata: Metadata = { title: "Date your globe" };

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ recheck?: string; turn?: string; more?: string }>;
}) {
  const { recheck, turn, more } = await searchParams;
  const again =
    recheck && turn !== undefined && /^\d+$/.test(turn)
      ? { id: recheck.slice(0, 12), turn: Number(turn) }
      : undefined;
  return <Game recheck={again} more={more && /^[\w-]{6,12}$/.test(more) ? more : undefined} />;
}
