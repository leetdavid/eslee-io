"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { TabItem, Tabs, TabsList } from "@/components/ui/tabs";
import { type Locale, MESSAGES } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <Tabs
      value={locale}
      size="compact"
      onValueChange={(value) => {
        document.documentElement.lang = value;
        startTransition(async () => {
          await setLocale(value);
          router.refresh();
        });
      }}
    >
      <TabsList aria-label={MESSAGES[locale].languageLabel}>
        <TabItem value="ko" label="한국어" lang="ko" />
        <TabItem value="en" label="EN" lang="en" />
      </TabsList>
    </Tabs>
  );
}
