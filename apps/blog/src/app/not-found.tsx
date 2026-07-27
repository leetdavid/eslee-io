import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <main className="mx-auto min-h-svh max-w-5xl px-5 sm:px-8">
      <SiteHeader />
      <section className="py-24">
        <p className="font-mono text-muted-foreground text-sm">404</p>
        <h1 className="mt-4 font-sans font-semibold text-4xl tracking-tight">
          This page does not exist.
        </h1>
        <Link className="mt-8 inline-block text-sm underline underline-offset-4" href="/">
          Back to the archive
        </Link>
      </section>
    </main>
  );
}
