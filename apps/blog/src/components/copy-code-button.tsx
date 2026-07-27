"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <button
      aria-label={copied ? "Code copied" : "Copy code"}
      className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      onClick={copyCode}
      type="button"
    >
      {copied ? <Check className="size-3.5" weight="bold" /> : <Copy className="size-3.5" />}
    </button>
  );
}
