import { PostArchive } from "@/components/post-archive";
import { SiteHeader } from "@/components/site-header";
import { getPublishedPosts, getPublishedTags } from "@/server/posts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getPublishedTags()]);

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-5 sm:px-8">
      <SiteHeader />
      <section className="py-16 sm:py-24">
        <p className="mb-5 font-mono text-muted-foreground text-sm">Technical notes</p>
        <h1 className="max-w-2xl font-sans font-semibold text-4xl tracking-tight sm:text-6xl">
          Building software with care.
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground leading-7">
          Writing about software engineering, systems, and the work behind products that last.
        </p>
      </section>
      <PostArchive emptyMessage="No posts have been published yet." posts={posts} tags={tags} />
      <footer className="py-10 font-mono text-muted-foreground text-xs">
        Copyright {new Date().getFullYear()} David E. S. Lee
      </footer>
    </main>
  );
}
