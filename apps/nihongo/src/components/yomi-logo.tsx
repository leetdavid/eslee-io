import { cn } from "@/lib/utils";

interface YomiLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: "size-6 text-lg rounded-md", text: "text-sm", sub: "text-[9px]" },
  md: { icon: "size-8 text-2xl rounded-lg", text: "text-sm", sub: "text-[10px]" },
  lg: { icon: "size-12 text-4xl rounded-xl", text: "text-xl", sub: "text-xs" },
};

export function YomiLogo({ size = "md", showWordmark = false, className }: YomiLogoProps) {
  const s = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center bg-primary text-primary-foreground font-bold shrink-0",
          s.icon,
        )}
        style={{ fontFamily: "'Noto Sans JP', 'Hiragino Sans', serif" }}
      >
        よ
      </div>
      {showWordmark && (
        <div className="grid flex-1 text-left leading-tight">
          <span className={cn("font-semibold tracking-tight", s.text)}>yomi</span>
          <span className={cn("text-muted-foreground", s.sub)}>よみ</span>
        </div>
      )}
    </div>
  );
}
