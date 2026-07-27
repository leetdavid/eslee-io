import * as migration_20260727_153000_add_blog_schema from "./20260727_153000_add_blog_schema";

export const migrations = [
  {
    name: "20260727_153000_add_blog_schema",
    down: migration_20260727_153000_add_blog_schema.down,
    up: migration_20260727_153000_add_blog_schema.up,
  },
];
