import { PhotoGallery } from "@/components/gallery";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, HydrateClient } from "@/trpc/server";

export default async function Home() {
  const photos = await api.photos.getAll();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-white font-sans text-black transition-colors duration-300 dark:bg-black dark:text-white">
        <header className="sticky top-0 z-50 w-full border-gray-200 border-b bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-black/80">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="font-bold font-mono text-gray-900 text-sm uppercase tracking-widest dark:text-gray-100">
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
