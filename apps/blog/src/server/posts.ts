import "server-only";

import type { Post, Tag, UserInterface } from "@eslee/payload";
import { payload } from "@/server/payload";

export type BlogAuthor = Pick<UserInterface, "id" | "name" | "bio" | "website">;
export type BlogTag = Pick<Tag, "id" | "name" | "slug">;
export type BlogPost = Omit<Post, "authors" | "tags"> & {
  authors: BlogAuthor[];
  tags: BlogTag[];
};

function isAuthor(author: number | UserInterface): author is UserInterface {
  return typeof author !== "number";
}

function isTag(tag: number | Tag): tag is Tag {
  return typeof tag !== "number";
}

function toBlogPost(post: Post): BlogPost {
  return {
    ...post,
    authors: post.authors.filter(isAuthor).map(({ id, name, bio, website }) => ({
      id,
      name: name || "Anonymous",
      bio,
      website,
    })),
    tags: (post.tags ?? []).filter(isTag).map(({ id, name, slug }) => ({ id, name, slug })),
  };
}

const published = { _status: { equals: "published" } } as const;

export async function getPublishedPosts() {
  const { docs } = await payload.find({
    collection: "posts",
    depth: 1,
    limit: 100,
    overrideAccess: false,
    sort: "-publishedAt",
    where: published,
  });

  return docs.map(toBlogPost);
}

export async function getPostBySlug(slug: string) {
  const { docs } = await payload.find({
    collection: "posts",
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: {
      and: [published, { slug: { equals: slug } }],
    },
  });

  return docs[0] ? toBlogPost(docs[0]) : null;
}

export async function getTagBySlug(slug: string) {
  const { docs } = await payload.find({
    collection: "tags",
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  });

  return docs[0] ?? null;
}

export async function getPostsByTag(tag: Tag) {
  const { docs } = await payload.find({
    collection: "posts",
    depth: 1,
    limit: 100,
    overrideAccess: false,
    sort: "-publishedAt",
    where: {
      and: [published, { tags: { contains: tag.id } }],
    },
  });

  return docs.map(toBlogPost);
}

export async function getPublishedTags() {
  const { docs } = await payload.find({
    collection: "tags",
    limit: 100,
    overrideAccess: false,
    sort: "name",
  });

  return docs;
}
