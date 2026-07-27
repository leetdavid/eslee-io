import type { CollectionConfig } from "payload";
import { isAdmin } from "../lib/access";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  dbName: "payload_users", // Avoid conflict with existing 'user' table
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "author",
      options: [
        { label: "Administrator", value: "admin" },
        { label: "Author", value: "author" },
      ],
      saveToJWT: true,
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
    },
    {
      name: "name",
      type: "text",
    },
    {
      name: "avatar",
      type: "relationship",
      relationTo: "media",
    },
    {
      name: "bio",
      type: "textarea",
      maxLength: 280,
    },
    {
      name: "website",
      type: "text",
      validate: (value: unknown) => {
        if (!value) return true;
        if (typeof value !== "string") return "Enter a valid URL.";

        try {
          new URL(value);
          return true;
        } catch {
          return "Enter a valid URL.";
        }
      },
    },
  ],
};
