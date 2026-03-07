"use client";

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
import { FileText, Image as ImageIcon, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

  const ocrImage = api.ai.ocrImage.useMutation({
    onSuccess: (data) => {
      const paragraphs = data.text.split("\n").map((p) => ({
        type: "paragraph",
        content: p.trim() ? [{ type: "text", text: p }] : undefined,
      }));

      createClip.mutate({
        title: "From Image",
        content: { type: "doc", content: paragraphs },
        sourceLanguage: "ja",
      });
    },
    onError: (error) => {
      toast.error(`Failed to extract text: ${error.message}`);
    },
  });

  const handleCreateClip = () => {
    createClip.mutate({
      title: "Untitled Clip",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      toast.loading("Extracting text from image...", { id: "ocr-toast" });

      // Need to clean up toast on success/error, so let's update mutations
      ocrImage.mutate(
        { imageBase64: base64String },
        {
          onSettled: () => {
            toast.dismiss("ocr-toast");
          },
        },
      );
    };
    reader.readAsDataURL(file);

    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={handleCreateClip}
              disabled={createClip.isPending || ocrImage.isPending}
              className="flex items-center gap-2"
            >
              {createClip.isPending && !ocrImage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Clip
            </CommandItem>
            <CommandItem
              onSelect={() => fileInputRef.current?.click()}
              disabled={createClip.isPending || ocrImage.isPending}
              className="flex items-center gap-2"
            >
              {ocrImage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Create Clip from Image (OCR)
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
            {/* Add more navigation here if needed */}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
