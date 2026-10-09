import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale, pickLocale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
}
