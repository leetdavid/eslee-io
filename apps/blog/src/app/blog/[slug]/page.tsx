import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/article-content";
import { SiteHeader } from "@/components/site-header";
import { TableOfContents } from "@/components/table-of-contents";
import { formatDate } from "@/lib/format";
import { getTableOfContents } from "@/lib/headings";
import { getPostBySlug } from "@/server/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  const url = `/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      description: post.excerpt,
      title: post.title,
      type: "article",
      url,
      images: [`${url}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      description: post.excerpt,
      title: post.title,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const headings = getTableOfContents(post.content);

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 sm:px-8">
      <SiteHeader />
      <article className="grid gap-12 py-14 xl:grid-cols-[minmax(0,44rem)_12rem] xl:justify-center xl:py-24">
        <div>
          <header className="border-border border-b pb-10">
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-muted-foreground text-xs">
              <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
              {post.authors.length > 0 && (
                <span>
                  by{" "}
                  {post.authors.map((author, index) => (
                    <span key={author.id}>
                      {index > 0 && ", "}
                      {author.website ? (
                        <a
                          className="underline underline-offset-2 hover:text-foreground"
                          href={author.website}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {author.name}
                        </a>
                      ) : (
                        author.name
                      )}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <h1 className="font-sans font-semibold text-4xl tracking-tight sm:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 max-w-2xl text-muted-foreground text-xl leading-8">{post.excerpt}</p>
            {post.tags.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2">
                {post.tags.map((tag) => (
                  <Link
                    className="text-muted-foreground text-xs hover:text-foreground"
                    href={`/tags/${tag.slug}`}
                    key={tag.id}
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </header>
          <ArticleContent content={post.content} />
        </div>
        <TableOfContents headings={headings} />
      </article>
    </main>
  );
}
