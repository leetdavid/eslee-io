import type { MbtiType } from "@/lib/mbti";
import type { TypeLore } from "@/lore/schema";
import { NF_LORE } from "@/lore/types/nf";
import { NT_LORE } from "@/lore/types/nt";
import { SJ_LORE } from "@/lore/types/sj";
import { SP_LORE } from "@/lore/types/sp";

export const TYPE_LORE: Record<MbtiType, TypeLore> = {
  ...NT_LORE,
  ...NF_LORE,
  ...SJ_LORE,
  ...SP_LORE,
};
