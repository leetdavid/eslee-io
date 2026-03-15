import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/trpc/react";

export function useCreateClip() {
  const router = useRouter();
  const utils = api.useUtils();

  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        toast.success("Clip created!");
        void utils.clip.getAll.invalidate();
        router.push(`/clips/${clip.id}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create clip: ${error.message}`);
    },
  });

  const handleCreateClip = () => {
    createClip.mutate({
      title: "",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      sourceLanguage: "ja",
    });
  };

  return {
    createClip,
    handleCreateClip,
    isPending: createClip.isPending,
  };
}
