"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Failed to sign in");
      setLoading(false);
    } else {
      router.push("/clips");
      router.refresh();
    }
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    await signIn.social({
      provider,
      callbackURL: "/clips",
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="font-medium text-sm leading-none">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="font-medium text-sm leading-none">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2",
            "font-medium text-primary-foreground text-sm",
            "ring-offset-background transition-colors",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4",
            "font-medium text-sm",
            "ring-offset-background transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("github")}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4",
            "font-medium text-sm",
            "ring-offset-background transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          GitHub
        </button>
      </div>

      <p className="text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
