"use client";

import { signIn, signOut } from "@eslee/auth/client";
import { useState } from "react";
import { GitHubIcon } from "@/components/icons";

export function GitHubButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="mt-6 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-ink font-medium text-[#f5f1e6] text-[15.5px]"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signIn
          .social({ provider: "github", callbackURL: "/review" })
          .catch(() => setBusy(false));
      }}
    >
      <GitHubIcon />
      {busy ? "Opening GitHub…" : "Continue with GitHub"}
    </button>
  );
}

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut().then(() => location.assign("/review"))}
    >
      Sign out
    </button>
  );
}
