import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArchive } from "@/components/post-archive";
import { SiteHeader } from "@/components/site-header";
import { getPostsByTag, getPublishedTags, getTagBySlug } from "@/server/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  return tag ? { title: tag.name, description: `Technical writing about ${tag.name}.` } : {};
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);

  if (!tag) notFound();

  const [posts, tags] = await Promise.all([getPostsByTag(tag), getPublishedTags()]);

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-5 sm:px-8">
      <SiteHeader />
      <section className="py-16 sm:py-24">
        <p className="mb-5 font-mono text-muted-foreground text-sm">Topic</p>
        <h1 className="font-sans font-semibold text-4xl tracking-tight sm:text-6xl">{tag.name}</h1>
      </section>
      <PostArchive
        emptyMessage={`No published posts are tagged ${tag.name}.`}
        posts={posts}
        tags={tags}
      />
    </main>
  );
}
