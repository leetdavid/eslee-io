import { YomiLogo } from "@/components/yomi-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="flex flex-col items-center space-y-3">
          <YomiLogo size="lg" />
          <div className="space-y-1 text-center">
            <h1 className="font-bold text-3xl tracking-tight">yomi</h1>
            <p className="text-muted-foreground text-sm">
              Learn Japanese with interactive clips and AI-powered tools
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
