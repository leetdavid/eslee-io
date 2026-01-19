import { PhotoGallery } from "@/components/gallery";
import { ThemeToggle } from "@/components/theme-toggle";
import { HydrateClient, api } from "@/trpc/server";

export default async function Home() {
  const photos = await api.photos.getAll();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans transition-colors duration-300">
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="font-mono text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-gray-100">
              ESLEE / PHOTOGRAPHY
            </h1>
            <div className="flex items-center gap-6">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="w-full">
          <PhotoGallery initialPhotos={photos} />
        </div>
      </main>
    </HydrateClient>
  );
}
