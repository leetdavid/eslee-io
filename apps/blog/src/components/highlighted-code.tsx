import { codeToHtml } from "shiki";
import { CopyCodeButton } from "@/components/copy-code-button";

type HighlightedCodeProps = {
  code: string;
  language?: string;
};

export async function HighlightedCode({ code, language }: HighlightedCodeProps) {
  let html: string | null = null;

  try {
    html = await codeToHtml(code, {
      lang: language || "text",
      themes: {
        dark: "github-dark",
        light: "github-light",
      },
    });
  } catch {
    html = null;
  }

  return (
    <figure className="my-8 overflow-hidden rounded-lg border border-border bg-muted">
      <figcaption className="flex h-10 items-center justify-between border-border border-b px-3 font-mono text-muted-foreground text-xs">
        <span>{language || "text"}</span>
        <CopyCodeButton code={code} />
      </figcaption>
      {html ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki escapes source code and returns trusted highlight markup.
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="overflow-x-auto p-5 font-mono text-sm leading-6">
          <code>{code}</code>
        </pre>
      )}
    </figure>
  );
}
