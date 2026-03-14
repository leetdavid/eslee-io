"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const utils = api.useUtils();

  const { data: settings, isLoading } = api.user.getSettings.useQuery();

  const updateSettings = api.user.updateSettings.useMutation({
    onSuccess: () => {
      void utils.user.getSettings.invalidate();
    },
  });

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
    <div className="mx-auto max-w-2xl space-y-8 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-medium">Profile</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label htmlFor="profile-name" className="font-medium text-sm">
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
            <label htmlFor="profile-email" className="font-medium text-sm">
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
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label htmlFor="target-lang" className="font-medium text-sm">
              Target Language
            </label>
            <p className="text-muted-foreground text-xs">
              Default language used for translations and AI explanations
            </p>
            {isLoading ? (
              <div className="flex h-10 items-center justify-center rounded-md border border-input bg-muted px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <select
                id="target-lang"
                value={settings?.targetLanguage ?? "en"}
                onChange={(e) => updateSettings.mutate({ targetLanguage: e.target.value })}
                disabled={updateSettings.isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="study-lang" className="font-medium text-sm">
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
        <div className="border-destructive/50 border-b px-6 py-4">
          <h2 className="font-medium text-destructive">Danger Zone</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-muted-foreground text-sm">
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
                <p className="text-muted-foreground text-sm">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className={cn(
                  "inline-flex h-9 items-center rounded-md bg-destructive px-3",
                  "font-medium text-destructive-foreground text-sm",
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
