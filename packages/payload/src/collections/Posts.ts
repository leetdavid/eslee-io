import type { CollectionConfig } from "payload";
import { authorOnly, authorOrPublished, isUserWithRole } from "../lib/access";
import { slugify } from "../lib/slug";

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
