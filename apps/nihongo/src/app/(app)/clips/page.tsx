"use client";

import { ClipsDesktopView } from "./_components/clips-desktop-view";
import { ClipsMobileView } from "./_components/clips-mobile-view";

export default function ClipsPage() {
  return (
    <>
      <ClipsMobileView />
      <ClipsDesktopView />
    </>
  );
}
