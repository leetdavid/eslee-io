export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl tracking-tight">
            <span className="text-primary">日本語</span>{" "}
            <span className="text-muted-foreground">Nihongo</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Learn Japanese with interactive clips and AI-powered tools
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
