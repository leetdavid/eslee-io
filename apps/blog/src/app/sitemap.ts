import type { MetadataRoute } from "next";
import { getPublishedPosts, getPublishedTags } from "@/server/posts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getPublishedTags()]);

  return [
    { lastModified: new Date(), url: "https://blog.eslee.io" },
    ...posts.map((post) => ({
      lastModified: new Date(post.updatedAt),
      url: `https://blog.eslee.io/blog/${post.slug}`,
    })),
    ...tags.map((tag) => ({
      lastModified: new Date(tag.updatedAt),
      url: `https://blog.eslee.io/tags/${tag.slug}`,
    })),
  ];
}
