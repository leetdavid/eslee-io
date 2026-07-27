import type { Where } from "payload";

type UserWithRole = {
  id: number | string;
  role?: "admin" | "author";
};

export function isAdmin(user: unknown) {
  return typeof user === "object" && user !== null && (user as UserWithRole).role === "admin";
}

export function isUserWithRole(user: unknown): user is UserWithRole {
  return typeof user === "object" && user !== null && "id" in user;
}

export function authorOrPublished(user: unknown): boolean | Where {
  if (isAdmin(user)) return true;

  if (!isUserWithRole(user)) {
    return { _status: { equals: "published" } };
  }

  return {
    or: [{ _status: { equals: "published" } }, { authors: { contains: user.id } }],
  };
}

export function authorOnly(user: unknown): boolean | Where {
  if (isAdmin(user)) return true;
  if (!isUserWithRole(user)) return false;

  return { authors: { contains: user.id } };
}
