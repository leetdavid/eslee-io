import type { FieldHook, TextField } from "payload";
import { describe, expect, it } from "vitest";
import { Posts } from "./Posts";

const slugField = Posts.fields.find(
  (field): field is TextField => field.type === "text" && field.name === "slug",
);

function slugFor(siblingData: { title?: string }, value?: string) {
  const [hook] = slugField?.hooks?.beforeValidate ?? [];
  return hook?.({ siblingData, value } as Parameters<FieldHook>[0]);
}

describe("post slug", () => {
  // The create view saves an empty draft on every visit, and slug is unique.
  it("is null for an untitled draft, so empty drafts do not collide", () => {
    expect(slugFor({})).toBeNull();
    expect(slugFor({ title: "" }, "")).toBeNull();
  });

  it("comes from the title when no slug is given", () => {
    expect(slugFor({ title: "Hello, World" })).toBe("hello-world");
  });

  it("keeps a slug the author typed", () => {
    expect(slugFor({ title: "Hello, World" }, "My Slug")).toBe("my-slug");
  });
});
