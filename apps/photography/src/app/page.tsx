import { HydrateClient, api } from "@/trpc/server";
import { PhotoGallery } from "./_components/gallery";

export default async function Home() {
  void api.photos.getAll.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <header className="mb-16 text-center">
            <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                Portfolio
              </span>
            </h1>
            <p className="text-xl text-gray-400">Captured moments in time</p>
          </header>

          <PhotoGallery />
        </div>
      </main>
    </HydrateClient>
  );
}
