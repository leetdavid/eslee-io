import type { Post } from "@eslee/payload";

type ContentNode = {
  children?: ContentNode[];
  id?: string;
  tag?: string;
  text?: string;
  type?: string;
};

export type TableOfContentsItem = {
  id: string;
  level: 2 | 3 | 4;
  text: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textContent(node: ContentNode): string {
  return [node.text ?? "", ...(node.children ?? []).map(textContent)].join("");
}

function isArticleHeading(node: ContentNode): node is ContentNode & { tag: "h2" | "h3" | "h4" } {
  return node.type === "heading" && (node.tag === "h2" || node.tag === "h3" || node.tag === "h4");
}

function visit(nodes: ContentNode[], callback: (node: ContentNode) => void) {
  for (const node of nodes) {
    callback(node);
    if (node.children) visit(node.children, callback);
  }
}

export function getTableOfContents(content: Post["content"]) {
  const headings: TableOfContentsItem[] = [];
  const counts = new Map<string, number>();

  visit(content.root.children as ContentNode[], (node) => {
    if (!isArticleHeading(node)) return;

    const text = textContent(node).trim();
    if (!text) return;

    const baseId = slugify(text) || "section";
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);

    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      level: Number(node.tag.slice(1)) as 2 | 3 | 4,
      text,
    });
  });

  return headings;
}

export function addHeadingIds(content: Post["content"], headings: TableOfContentsItem[]) {
  const clone = structuredClone(content);
  let index = 0;

  visit(clone.root.children as ContentNode[], (node) => {
    if (isArticleHeading(node)) {
      const heading = headings[index];
      if (heading) node.id = heading.id;
      index += 1;
    }
  });

  return clone;
}
