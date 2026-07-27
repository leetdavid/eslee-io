import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { BlogPost, BlogTag } from "@/server/posts";

type PostArchiveProps = {
  emptyMessage: string;
  posts: BlogPost[];
  tags: BlogTag[];
};

export function PostArchive({ emptyMessage, posts, tags }: PostArchiveProps) {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_10rem]">
      <section aria-label="Posts">
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ol className="divide-y divide-border border-border border-y">
            {posts.map((post) => (
              <li key={post.id}>
                <article className="py-7 sm:py-8">
                  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-muted-foreground text-xs">
                    <time dateTime={post.publishedAt ?? undefined}>
                      {formatDate(post.publishedAt)}
                    </time>
                    {post.authors.length > 0 && (
                      <span>by {post.authors.map(({ name }) => name).join(", ")}</span>
                    )}
                  </div>
                  <h2 className="font-semibold text-2xl tracking-tight sm:text-3xl">
                    <Link
                      className="outline-none hover:underline focus-visible:underline"
                      href={`/blog/${post.slug}`}
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 max-w-2xl text-muted-foreground leading-7">{post.excerpt}</p>
                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag.id}
                          className="text-muted-foreground text-xs transition-colors hover:text-foreground"
                          href={`/tags/${tag.slug}`}
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
      {tags.length > 0 && (
        <aside className="hidden lg:block" aria-label="Tags">
          <p className="mb-3 font-mono text-muted-foreground text-xs uppercase tracking-wide">
            Topics
          </p>
          <ul className="space-y-2 text-sm">
            {tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  className="text-muted-foreground hover:text-foreground"
                  href={`/tags/${tag.slug}`}
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
