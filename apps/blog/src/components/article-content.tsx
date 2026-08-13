import type { JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { HighlightedCode } from "@/components/highlighted-code";
import { addHeadingIds, getTableOfContents } from "@/lib/headings";
import type { BlogPost } from "@/server/posts";

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    code: ({ node }: { node: { fields?: { code?: string; language?: string } } }) => {
      const fields = node.fields as { code?: string; language?: string } | undefined;

      return <HighlightedCode code={fields?.code ?? ""} language={fields?.language} />;
    },
  },
  heading: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children });
    const id = (node as { id?: string }).id;

    if (node.tag === "h2") return <h2 id={id}>{children}</h2>;
    if (node.tag === "h3") return <h3 id={id}>{children}</h3>;
    return <h4 id={id}>{children}</h4>;
  },
});

export function ArticleContent({ content }: Pick<BlogPost, "content">) {
  const headings = getTableOfContents(content);
  const data = addHeadingIds(content, headings);

  return (
    <RichText className="article-content mt-10" converters={converters} data={data as never} />
  );
}
