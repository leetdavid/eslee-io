"use client";

import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [nativeLanguage, setNativeLanguage] = useState<"en" | "ko">("en");

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      // TODO: Implement account deletion
      alert("Account deletion is not yet implemented");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-medium">Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={session?.user?.name ?? ""}
              disabled
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="profile-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={session?.user?.email ?? ""}
              disabled
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Language Preferences */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-medium">Language Preferences</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="native-lang" className="text-sm font-medium">
              Native Language
            </label>
            <p className="text-xs text-muted-foreground">
              Used for AI explanations and translations
            </p>
            <select
              id="native-lang"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value as "en" | "ko")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="ko">Korean (한국어)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="study-lang" className="text-sm font-medium">
              Study Language
            </label>
            <input
              id="study-lang"
              type="text"
              value="Japanese (日本語)"
              disabled
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 bg-card">
        <div className="border-b border-destructive/50 px-6 py-4">
          <h2 className="font-medium text-destructive">Danger Zone</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent"
            >
              Sign Out
            </button>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className={cn(
                  "inline-flex h-9 items-center rounded-md bg-destructive px-3",
                  "text-sm font-medium text-destructive-foreground",
                  "hover:bg-destructive/90",
                )}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
