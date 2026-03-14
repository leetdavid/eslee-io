"use client";

import { Image as ImageIcon, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/trpc/react";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
  }[];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        toast.success("Clip created!");
        void utils.clip.getAll.invalidate();
        router.push(`/clips/${clip.id}`);
      }
      setIsProcessingImage(false);
    },
    onError: (error) => {
      toast.error(`Failed to create clip: ${error.message}`);
      setIsProcessingImage(false);
    },
  });

  const ocrImage = api.ai.ocrImage.useMutation({
    onSuccess: (data) => {
      if (data.text) {
        createClip.mutate({
          title: "Image Scan",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: data.text }],
              },
            ],
          },
          sourceLanguage: "ja",
        });
      } else {
        toast.error("No text could be found in the image.");
        setIsProcessingImage(false);
      }
    },
    onError: (error) => {
      toast.error(`Failed to process image: ${error.message}`);
      setIsProcessingImage(false);
    },
  });

  const handleCreateClip = () => {
    createClip.mutate({
      title: "Untitled Clip",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setIsProcessingImage(true);
    toast.loading("Scanning image for Japanese text...", { id: "ocr-toast" });

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];

      if (!base64) {
        toast.error("Failed to parse image data.");
        setIsProcessingImage(false);
        return;
      }

      ocrImage.mutate(
        { imageBase64: base64 },
        {
          onSettled: () => {
            toast.dismiss("ocr-toast");
          },
        },
      );
    };
    reader.onerror = () => {
      toast.error("Failed to read the image file.");
      toast.dismiss("ocr-toast");
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="New Clip"
              onClick={handleCreateClip}
              disabled={createClip.isPending || isProcessingImage}
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground disabled:opacity-50"
            >
              {createClip.isPending && !isProcessingImage ? (
                <Loader2 className="animate-spin" />
              ) : (
                <PlusCircle />
              )}
              <span>New Clip</span>
            </SidebarMenuButton>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <Button
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={createClip.isPending || isProcessingImage}
              className="size-8 disabled:opacity-50 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
              title="Upload Image for Clip"
            >
              {isProcessingImage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
              <span className="sr-only">Upload Image for Clip</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
