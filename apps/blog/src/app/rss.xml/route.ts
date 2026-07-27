import { getPublishedPosts } from "@/server/posts";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "'": "&apos;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getPublishedPosts();
  const items = posts
    .map((post) => {
      const url = `https://blog.eslee.io/blog/${post.slug}`;

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${url}</link>
          <guid>${url}</guid>
          <description>${escapeXml(post.excerpt)}</description>
          <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
          ${post.authors.map((author) => `<author>${escapeXml(author.name)}</author>`).join("")}
        </item>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>David E. S. Lee - Blog</title>
          <link>https://blog.eslee.io</link>
          <description>Technical writing by David E. S. Lee.</description>
          ${items}
        </channel>
      </rss>`,
    {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    },
  );
}
