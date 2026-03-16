"use client";

import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { formatDistanceToNow } from "date-fns";
import { ArrowRightLeft, Copy, Loader2, Save, Trash2, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { AudioAnnotation } from "@/components/editor/extensions/audio-annotation";
import { Furigana } from "@/components/editor/extensions/furigana";
import { TranslationBlock } from "@/components/editor/extensions/translation-block";
import { VocabularyHighlight } from "@/components/editor/extensions/vocabulary-highlight";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type TranslationHistoryItem,
  useTranslationHistory,
} from "@/hooks/use-translation-history";
import { defaultModel, models } from "@/lib/ai";
import { LANGUAGES } from "@/lib/constants";
import { api } from "@/trpc/react";

const extensions = [StarterKit, Furigana, VocabularyHighlight, TranslationBlock, AudioAnnotation];

function hasJapanese(text: string) {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
}

function speak(text: string, langCode: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    toast.error("Text-to-speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Map our internal lang codes to BCP 47
  if (langCode === "ja") utterance.lang = "ja-JP";
  else if (langCode === "en") utterance.lang = "en-US";
  else if (langCode === "ko") utterance.lang = "ko-KR";

  window.speechSynthesis.speak(utterance);
}

export default function TranslatePage() {
  const router = useRouter();
  // const utils = api.useUtils();
  const { history, addHistoryItem, removeHistoryItem, clearHistory } = useTranslationHistory();

  // Settings
  const { data: userSettings } = api.user.getSettings.useQuery();

  // State
  const [sourceLang, setSourceLang] = useState<string>("ja");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [model, setModel] = useState<string>(defaultModel);

  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");

  const [sourceFuriganaHtml, setSourceFuriganaHtml] = useState<string | null>(null);
  const [targetFuriganaHtml, setTargetFuriganaHtml] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [isFuriganaProcessing, setIsFuriganaProcessing] = useState(false);

  // Initialize from settings if available
  useEffect(() => {
    if (userSettings?.targetLanguage && targetLang === "en") {
      setTargetLang(userSettings.targetLanguage);
    }
  }, [userSettings, targetLang]);

  // Mutations
  const translateMut = api.ai.translate.useMutation();
  const furiganaMut = api.ai.addFurigana.useMutation();
  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        toast.success("Clip created successfully!");
        router.push(`/clips/${clip.id}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create clip: ${error.message}`);
    },
  });

  // Just debounce the text input directly. 800ms is a good balance.
  const [debouncedText] = useDebounceValue(sourceText, 800);

  // Trigger translation when debounced text or settings change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Mutators and history items cause infinite loops if included
  useEffect(() => {
    if (!debouncedText.trim()) {
      setTargetText("");
      setSourceFuriganaHtml(null);
      setTargetFuriganaHtml(null);
      setIsTranslating(false);
      setIsFuriganaProcessing(false);
      return;
    }

    let isSubscribed = true;

    const runTranslation = async () => {
      setIsTranslating(true);
      try {
        const isSrcJa = hasJapanese(debouncedText);
        let sFurigana: string | null = null;

        if (isSrcJa && isSubscribed) setIsFuriganaProcessing(true);

        // 1. Fire translations and furigana independently
        const furiganaTask = isSrcJa
          ? furiganaMut.mutateAsync({ text: debouncedText }).catch(() => null)
          : Promise.resolve(null);

        const translateTask = translateMut.mutateAsync({
          text: debouncedText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          model: model,
        });

        // 2. Wait for translation (priority)
        const tResult = await translateTask;

        if (!isSubscribed) return;

        const translated = tResult.translation;
        setTargetText(translated);

        // 3. Wait for source furigana
        const sResult = await furiganaTask;
        if (isSubscribed) {
          if (sResult?.html) {
            sFurigana = sResult.html;
            setSourceFuriganaHtml(sFurigana);
          } else if (isSrcJa) {
            sFurigana = debouncedText;
            setSourceFuriganaHtml(sFurigana);
          } else {
            setSourceFuriganaHtml(null);
          }
          setIsFuriganaProcessing(false); // Source furigana done
        }

        // 4. Target furigana
        const isTgtJa = hasJapanese(translated);
        let tFurigana: string | null = null;

        if (isTgtJa && isSubscribed) {
          setIsFuriganaProcessing(true);
          try {
            const tgtResult = await furiganaMut.mutateAsync({ text: translated });
            if (isSubscribed) {
              tFurigana = tgtResult.html;
              setTargetFuriganaHtml(tFurigana);
            }
          } catch (_e) {
            if (isSubscribed) {
              tFurigana = translated;
              setTargetFuriganaHtml(tFurigana);
            }
          } finally {
            if (isSubscribed) setIsFuriganaProcessing(false);
          }
        } else if (isSubscribed) {
          setTargetFuriganaHtml(null);
        }

        // 5. Save to history
        if (isSubscribed) {
          addHistoryItem({
            sourceText: debouncedText,
            targetText: translated,
            sourceFuriganaHtml: isSrcJa && sFurigana ? sFurigana : undefined,
            targetFuriganaHtml: isTgtJa && tFurigana ? tFurigana : undefined,
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
            model: model,
          });
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Translation error:", err);
          toast.error(`Translation failed`);
        }
      } finally {
        if (isSubscribed) {
          setIsTranslating(false);
          setIsFuriganaProcessing(false);
        }
      }
    };

    runTranslation();

    return () => {
      isSubscribed = false;
    };
  }, [debouncedText, sourceLang, targetLang, model]);

  // Source text change handler with Auto-Swap logic
  const handleSourceTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setSourceText(newText);

    // Auto-swap logic (only triggers if we have at least a few characters to prevent jumping on 1 letter)
    if (newText.trim().length > 3) {
      const containsJa = hasJapanese(newText);
      if (containsJa && sourceLang !== "ja") {
        setTargetLang(sourceLang === "en" ? "en" : sourceLang);
        setSourceLang("ja");
      } else if (!containsJa && sourceLang === "ja") {
        setSourceLang(targetLang !== "ja" ? targetLang : "en");
        setTargetLang("ja");
      }
    }
  };

  const swapLanguages = () => {
    const newSrc = targetLang;
    const newTgt = sourceLang;
    setSourceLang(newSrc);
    setTargetLang(newTgt);
    setSourceText(targetText);
    setTargetText(sourceText);
    setSourceFuriganaHtml(targetFuriganaHtml);
    setTargetFuriganaHtml(sourceFuriganaHtml);
  };

  const handleTurnIntoClip = () => {
    if (!sourceText.trim() && !targetText.trim()) return;

    const sourceJson = sourceFuriganaHtml
      ? generateJSON(sourceFuriganaHtml, extensions).content
      : [{ type: "paragraph", content: [{ type: "text", text: sourceText }] }];

    const targetJson = targetFuriganaHtml
      ? generateJSON(targetFuriganaHtml, extensions).content
      : [{ type: "paragraph", content: [{ type: "text", text: targetText }] }];

    const content = {
      type: "doc",
      content: [...(sourceJson || []), { type: "horizontalRule" }, ...(targetJson || [])],
    };

    createClip.mutate({
      title: "Translation",
      content,
      sourceLanguage: sourceLang as "ja" | "en" | "ko",
      targetLanguage: targetLang as "ja" | "en" | "ko",
    });
  };

  const loadHistoryItem = (item: TranslationHistoryItem) => {
    setSourceText(item.sourceText);
    setTargetText(item.targetText);
    setSourceFuriganaHtml(item.sourceFuriganaHtml || null);
    setTargetFuriganaHtml(item.targetFuriganaHtml || null);
    setSourceLang(item.sourceLanguage);
    setTargetLang(item.targetLanguage);
    setModel(item.model);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b p-4 lg:px-6">
        <div className="flex items-center gap-2">
          <Select value={sourceLang} onValueChange={setSourceLang}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={swapLanguages} className="rounded-full">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mx-2 hidden h-6 w-px bg-border sm:block" />

          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="hidden w-[180px] sm:flex">
              <SelectValue placeholder="AI Model" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(models).map(([key, m]) => (
                <SelectItem key={key} value={key}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleTurnIntoClip}
            disabled={(!sourceText && !targetText) || createClip.isPending}
            className="gap-2"
          >
            {createClip.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Turn into Clip
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2 md:grid-rows-[1fr_auto]">
        {/* Source Area */}
        <div className="flex flex-col border-b md:border-r md:border-b-0">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <span className="font-medium text-muted-foreground text-sm">Source</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  navigator.clipboard.writeText(sourceText);
                  toast.success("Copied to clipboard");
                }}
                disabled={!sourceText}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => speak(sourceText, sourceLang)}
                disabled={!sourceText}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <Textarea
              value={sourceText}
              onChange={handleSourceTextChange}
              placeholder="Type or paste text here to translate..."
              className="min-h-[120px] flex-1 resize-none border-none bg-none p-0 text-xl shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            {sourceFuriganaHtml && (
              <div className="prose dark:prose-invert mt-4 max-w-none rounded-md border bg-muted/10 p-4 text-lg">
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Need to render HTML from API */}
                <div dangerouslySetInnerHTML={{ __html: sourceFuriganaHtml }} />
              </div>
            )}
          </div>
        </div>

        {/* Target Area */}
        <div className="flex flex-col border-b md:border-b-0">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground text-sm">Translation</span>
              {(isTranslating || isFuriganaProcessing) && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  navigator.clipboard.writeText(targetText);
                  toast.success("Copied to clipboard");
                }}
                disabled={!targetText}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => speak(targetText, targetLang)}
                disabled={!targetText}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            {targetFuriganaHtml ? (
              <div className="prose dark:prose-invert max-w-none flex-1 rounded-md bg-transparent text-lg">
                {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Need to render HTML from API */}
                <div dangerouslySetInnerHTML={{ __html: targetFuriganaHtml }} />
              </div>
            ) : (
              <div className="flex-1 whitespace-pre-wrap text-lg">{targetText}</div>
            )}
          </div>
        </div>

        {/* History Panel */}
        <div className="col-span-1 border-t bg-muted/10 md:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-medium text-sm">Recent Translations</span>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-8 px-2 text-muted-foreground text-xs hover:text-destructive"
              >
                Clear History
              </Button>
            )}
          </div>
          <ScrollArea className="h-40 w-full whitespace-nowrap">
            {history.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm">
                No recent translations
              </div>
            ) : (
              <div className="flex w-max space-x-4 p-4">
                {history.map((item) => (
                  // biome-ignore lint/a11y/useSemanticElements: Cannot nest buttons
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className="group relative w-64 shrink-0 cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                    onClick={() => loadHistoryItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadHistoryItem(item);
                      }
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <span className="uppercase">{item.sourceLanguage}</span>
                        <span>→</span>
                        <span className="uppercase">{item.targetLanguage}</span>
                      </div>
                      <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                    </div>
                    <div className="line-clamp-2 font-medium text-sm">{item.sourceText}</div>
                    <div className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                      {item.targetText}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.id);
                      }}
                      className="absolute top-2 right-2 rounded-md p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
