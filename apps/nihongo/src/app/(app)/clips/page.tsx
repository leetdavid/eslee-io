"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { ClipsDesktopView } from "./_components/clips-desktop-view";
import { ClipsMobileView } from "./_components/clips-mobile-view";

export default function ClipsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = api.clip.getAll.useQuery(search ? { search } : undefined);
  const utils = api.useUtils();

  const deleteClip = api.clip.delete.useMutation({
    onSuccess: () => {
      toast.success("Clip deleted successfully");
      void utils.clip.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete clip: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    deleteClip.mutate({ id });
  };

  return (
    <>
      <ClipsMobileView
        data={data}
        isLoading={isLoading}
        onDelete={handleDelete}
        isDeleting={deleteClip.isPending}
      />
      <ClipsDesktopView
        data={data}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onDelete={handleDelete}
        isDeleting={deleteClip.isPending}
      />
    </>
  );
}
