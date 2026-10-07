"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="game-shell error-page">
      <h1>The game couldn&apos;t load.</h1>
      <p>Your saved run is still in this browser.</p>
      <Button onClick={reset}>Retry</Button>
    </main>
  );
}
