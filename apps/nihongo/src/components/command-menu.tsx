"use client";

import { FileText, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/trpc/react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    const customEvent = () => setOpen((open) => !open);

    document.addEventListener("keydown", down);
    document.addEventListener("open-command-menu", customEvent);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-command-menu", customEvent);
    };
  }, []);

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        toast.success("Clip created");
        setOpen(false);
        router.push(`/clips/${clip.id}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create clip: ${error.message}`);
    },
  });

  const handleCreateClip = () => {
    createClip.mutate({
      title: "Untitled Clip",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={handleCreateClip}
              disabled={createClip.isPending}
              className="flex items-center gap-2"
            >
              {createClip.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Clip
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pages">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                router.push("/clips");
              }}
              className="flex items-center gap-2"
            >
              <FileText />
              Clips
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
