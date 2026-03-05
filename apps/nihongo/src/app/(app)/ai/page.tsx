"use client";

import { defaultModel, models } from "@/lib/ai";
import { type JLPTLevel, JLPT_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useCompletion } from "@ai-sdk/react";
import {
  BookOpen,
  ClipboardList,
  FilePlus,
  GraduationCap,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const aiTools = [
  {
    id: "reading",
    name: "Reading Passage",
    icon: BookOpen,
    description: "Generate a reading passage on any topic",
  },
  {
    id: "grammar",
    name: "Grammar Lesson",
    icon: MessageSquare,
    description: "Create a grammar lesson",
  },
  {
    id: "vocabulary",
    name: "Vocabulary List",
    icon: ClipboardList,
    description: "Generate themed vocabulary",
  },
  { id: "quiz", name: "Quiz", icon: GraduationCap, description: "Create a practice quiz" },
] as const;

export default function AIPage() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<string>("reading");
  const [topic, setTopic] = useState("");
  const [jlptLevel, setJlptLevel] = useState("");
  const [userLanguage, setUserLanguage] = useState<"en" | "ko">("en");
  const [model, setModel] = useState<string>(defaultModel);

  const { completion, isLoading, complete } = useCompletion({
    api: "/api/ai/generate",
  });

  const saveGeneration = api.ai.saveGeneration.useMutation();
  const createClip = api.clip.create.useMutation({
    onSuccess: (clip) => {
      if (clip) {
        router.push(`/clips/${clip.id}`);
      }
    },
  });

  const handleGenerate = async () => {
    if (!topic) return;

    await complete("", {
      body: {
        topic,
        type: selectedTool,
        jlptLevel: jlptLevel || undefined,
        userLanguage,
        model,
      },
    });
  };

  const handleSave = () => {
    if (!completion) return;

    saveGeneration.mutate({
      prompt: `${selectedTool}: ${topic}`,
      response: completion,
      model,
      type: selectedTool as "reading" | "grammar" | "vocabulary" | "quiz",
    });
  };

  const handleSaveAsClip = () => {
    if (!completion) return;

    const tiptapJson = {
      type: "doc",
      content: completion.split("\n").map((line) => {
        if (!line.trim()) {
          return { type: "paragraph" };
        }
        return {
          type: "paragraph",
          content: [{ type: "text", text: line }],
        };
      }),
    };

    createClip.mutate({
      title: `AI Generated: ${topic}`,
      content: tiptapJson,
      sourceLanguage: "ja",
      jlptLevel: jlptLevel ? (jlptLevel as JLPTLevel) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Tools</h1>
        <p className="text-sm text-muted-foreground">Generate educational content with AI</p>
      </div>

      {/* Tool selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {aiTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setSelectedTool(tool.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
              selectedTool === tool.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
          >
            <tool.icon className="h-6 w-6" />
            <span className="text-sm font-medium">{tool.name}</span>
            <span className="text-xs text-muted-foreground">{tool.description}</span>
          </button>
        ))}
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 space-y-2">
          <label htmlFor="topic" className="text-sm font-medium">
            Topic
          </label>
          <input
            id="topic"
            type="text"
            placeholder="e.g., Japanese food, travel, daily conversation..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ai-jlpt" className="text-sm font-medium">
            JLPT Level
          </label>
          <select
            id="ai-jlpt"
            value={jlptLevel}
            onChange={(e) => setJlptLevel(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {JLPT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="ai-lang" className="text-sm font-medium">
            Your Language
          </label>
          <select
            id="ai-lang"
            value={userLanguage}
            onChange={(e) => setUserLanguage(e.target.value as "en" | "ko")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Object.entries(models).map(([key, modelObj]) => (
            <option key={key} value={key}>
              {modelObj.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!topic || isLoading}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4",
            "text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Output */}
      {completion && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Generated Content</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveGeneration.isPending}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:opacity-50"
              >
                {saveGeneration.isPending ? "Saving..." : "Save to History"}
              </button>
              <button
                type="button"
                onClick={handleSaveAsClip}
                disabled={createClip.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <FilePlus className="h-4 w-4" />
                {createClip.isPending ? "Creating..." : "Save as Clip"}
              </button>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-6 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {completion}
          </div>
        </div>
      )}
    </div>
  );
}
