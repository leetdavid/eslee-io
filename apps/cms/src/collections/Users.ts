import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  dbName: "payload_users", // Avoid conflict with existing 'user' table
  fields: [
    // Email and Password are added by default with auth: true
  ],
};
