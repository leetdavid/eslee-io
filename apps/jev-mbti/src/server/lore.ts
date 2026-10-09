import "server-only";

import { lettersOf, type MbtiType } from "@/lib/mbti";
import { LETTER_LORE } from "@/lore/letter-lore";
import type { LoreTopic } from "@/lore/schema";
import { TYPE_LORE } from "@/lore/type-lore";

/**
 * The English lore a judgment about one type needs: the type's overall image,
 * its lines for the chart's topics, and the matching letter memes. Unrelated
 * topics are left out because irrelevant state lowers Jev's accuracy.
 */
export function loreFor(type: MbtiType, topics: LoreTopic[]) {
  const lore = TYPE_LORE[type];
  const typeLore: Record<string, string | string[]> = {
    nickname: lore.nickname.en,
    overall: lore.summary.map((line) => line.en),
  };
  for (const topic of topics) typeLore[topic] = lore.topics[topic].map((line) => line.en);
  const letterLore: Record<string, string[]> = {};
  for (const letter of lettersOf(type)) {
    const entry = LETTER_LORE[letter];
    const topical = topics.flatMap((topic) => entry[topic] ?? []);
    letterLore[letter] = (topical.length ? topical : entry.general.slice(0, 2)).map(
      (line) => line.en,
    );
  }
  return { type_lore: typeLore, letter_lore: letterLore };
}
