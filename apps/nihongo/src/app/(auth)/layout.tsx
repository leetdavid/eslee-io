export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">日本語</span>{" "}
            <span className="text-muted-foreground">Nihongo</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Learn Japanese with interactive clips and AI-powered tools
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
