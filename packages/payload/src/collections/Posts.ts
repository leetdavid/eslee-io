import { generateText } from "ai";
import { APIError, type CollectionConfig, type Endpoint } from "payload";
import { authorOnly, authorOrPublished, isUserWithRole } from "../lib/access";
import { slugify } from "../lib/slug";

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(" ");
  if (typeof value !== "object" || value === null) return "";

  const node = value as { children?: unknown; text?: unknown };
  return [typeof node.text === "string" ? node.text : "", extractText(node.children)]
    .filter(Boolean)
    .join(" ");
}

const generateExcerpt: Endpoint = {
  path: "/generate-excerpt",
  method: "post",
  handler: async (req) => {
    if (!req.user) {
      throw new APIError("Unauthorized", 401);
    }

    const body = ((await req.json?.()) ?? {}) as { content?: unknown; title?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = extractText(body.content).replace(/\s+/g, " ").trim().slice(0, 12_000);

    if (!title && !content) {
      throw new APIError("Add a title or content before generating an excerpt.", 400);
    }

    try {
      const { text } = await generateText({
        model: "openai/gpt-5-nano",
        system:
          "Write a factual, engaging article excerpt. Return only the excerpt: one or two sentences, no more than 300 characters, with no quotation marks or heading.",
        prompt: `Title: ${title}\n\nArticle:\n${content}`,
        maxOutputTokens: 120,
        providerOptions: {
          gateway: {
            tags: ["feature:post-excerpt"],
            user: String(req.user.id),
          },
        },
      });

      const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 320);

      if (!excerpt) {
        throw new APIError("The AI service returned an empty excerpt.", 502);
      }

      return Response.json({ excerpt });
    } catch (error) {
      if (error instanceof APIError) throw error;

      req.payload.logger.error("Post excerpt generation failed.");
      throw new APIError("Unable to generate an excerpt. Please try again.", 502);
    }
  },
};

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "authors", "publishedAt", "updatedAt"],
  },
  access: {
    read: ({ req }) => authorOrPublished(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => authorOnly(req.user),
    delete: ({ req }) => authorOnly(req.user),
  },
  endpoints: [generateExcerpt],
  versions: {
    drafts: {
      autosave: true,
      schedulePublish: true,
      validate: false,
    },
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [({ siblingData, value }) => slugify(value || siblingData.title)],
      },
    },
    {
      name: "excerpt",
      type: "textarea",
      required: true,
      maxLength: 320,
      admin: {
        components: {
          Field: "/components/ExcerptField#ExcerptField",
        },
      },
    },
    {
      name: "content",
      type: "richText",
      required: true,
    },
    {
      name: "authors",
      type: "relationship",
      relationTo: "users",
      hasMany: true,
      required: true,
      minRows: 1,
    },
    {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc, req }) => {
        if (operation === "create" && (!data.authors || data.authors.length === 0)) {
          if (!isUserWithRole(req.user)) {
            throw new Error("An authenticated author is required to create a post.");
          }

          data.authors = [req.user.id];
        }

        if (data._status === "published" && !originalDoc?.publishedAt && !data.publishedAt) {
          data.publishedAt = new Date().toISOString();
        }

        return data;
      },
    ],
  },
};
