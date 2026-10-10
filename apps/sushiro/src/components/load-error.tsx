import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copy, type Language } from "@/lib/queue-presentation";

type LoadErrorProps = {
  language: Language;
  onRetry: () => void;
};

// Shown when a page has nothing to show because its data could not be loaded: plain words and
// one action.
export function LoadError({ language, onRetry }: LoadErrorProps) {
  const text = copy[language];

  return (
    <section className="load-error" role="alert">
      <p className="load-error-title">{text.loadErrorTitle}</p>
      <p>{text.loadErrorNote}</p>
      <Button leadingIcon={RefreshCw} onClick={onRetry} variant="secondary">
        {text.tryAgain}
      </Button>
    </section>
  );
}
