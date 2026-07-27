export const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(date: string | null | undefined) {
  return date ? dateFormatter.format(new Date(date)) : "Unpublished";
}
