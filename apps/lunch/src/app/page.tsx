import { SlotMachine } from "@/components/slot-machine";

export default function Home() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        {/*<p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--color-muted)]">
          eslee.io
        </p>*/}
        <h1 className="mt-2 font-display text-5xl text-[var(--color-cream)] tracking-tight md:text-6xl">
          where do we eat
        </h1>
        <p className="mt-3 max-w-sm text-[var(--color-muted)] text-sm">
          Can&rsquo;t decide? Pull the lever.
        </p>
      </header>
      <SlotMachine />
    </main>
  );
}
