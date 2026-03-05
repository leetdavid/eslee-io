"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type JLPTLevel, JLPT_COLORS, JLPT_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

export default function VocabularyPage() {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);

  // Add form state
  const [newWord, setNewWord] = useState("");
  const [newReading, setNewReading] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newLevel, setNewLevel] = useState("");

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editLevel, setEditLevel] = useState("");

  const { data: vocab, isLoading } = api.vocabulary.getAll.useQuery({
    search: search || undefined,
    jlptLevel: (filterLevel as JLPTLevel) || undefined,
  });

  const { data: stats } = api.vocabulary.getStats.useQuery();

  const utils = api.useUtils();

  const createVocab = api.vocabulary.create.useMutation({
    onSuccess: () => {
      void utils.vocabulary.getAll.invalidate();
      void utils.vocabulary.getStats.invalidate();
      setShowAdd(false);
      setNewWord("");
      setNewReading("");
      setNewMeaning("");
      setNewLevel("");
    },
  });

  const updateVocab = api.vocabulary.update.useMutation({
    onSuccess: () => {
      void utils.vocabulary.getAll.invalidate();
      void utils.vocabulary.getStats.invalidate();
      setEditingId(null);
    },
  });

  const deleteVocab = api.vocabulary.delete.useMutation({
    onSuccess: () => {
      void utils.vocabulary.getAll.invalidate();
      void utils.vocabulary.getStats.invalidate();
    },
  });

  const initStudy = api.study.initializeFromVocabulary.useMutation({
    onSuccess: (result) => {
      alert(`Added ${result.added} cards to study deck`);
    },
  });

  const handleAdd = () => {
    if (!newWord || !newMeaning) return;
    createVocab.mutate({
      word: newWord,
      reading: newReading || undefined,
      meaning: newMeaning,
      jlptLevel: (newLevel as JLPTLevel) || undefined,
    });
  };

  const openEditDialog = (item: {
    id: string;
    word: string;
    reading?: string | null;
    meaning: string;
    jlptLevel?: string | null;
  }) => {
    setEditingId(item.id);
    setEditWord(item.word);
    setEditReading(item.reading || "");
    setEditMeaning(item.meaning);
    setEditLevel(item.jlptLevel || "");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editWord || !editMeaning) return;
    updateVocab.mutate({
      id: editingId,
      word: editWord,
      reading: editReading || null,
      meaning: editMeaning,
      jlptLevel: (editLevel as JLPTLevel) || null,
    });
  };

  const handleAddAllToStudy = () => {
    if (!vocab || vocab.length === 0) return;
    initStudy.mutate({
      vocabularyIds: vocab.map((v) => v.id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vocabulary</h1>
          <p className="text-sm text-muted-foreground">
            {stats?.total ?? 0} words in your collection
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddAllToStudy}
            disabled={!vocab?.length || initStudy.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            Add All to Study
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4",
              "text-sm font-medium text-primary-foreground hover:bg-primary/90",
            )}
          >
            <Plus className="h-4 w-4" />
            Add Word
          </button>
        </div>
      </div>

      {/* JLPT Stats */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          {JLPT_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFilterLevel(filterLevel === level ? "" : level)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterLevel === level
                  ? JLPT_COLORS[level]
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {level}: {(stats as Record<string, number>)[level]}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border bg-card p-4 space-y-3 animate-in fade-in zoom-in-95">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Word (e.g., 食べる)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Reading (e.g., たべる)"
              value={newReading}
              onChange={(e) => setNewReading(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Meaning (e.g., to eat)"
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">JLPT Level</option>
              {JLPT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newWord || !newMeaning || createVocab.isPending}
            className={cn(
              "inline-flex h-9 items-center rounded-md bg-primary px-3",
              "text-sm font-medium text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50",
            )}
          >
            {createVocab.isPending ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search vocabulary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
      </div>

      {/* Vocabulary table */}
      {isLoading ? (
        <div className="space-y-2">
          {["s1", "s2", "s3", "s4", "s5"].map((key) => (
            <div key={key} className="h-14 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : vocab?.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No vocabulary yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add words manually or highlight vocabulary in your clips
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {vocab?.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-lg font-medium">{item.word}</span>
                  {item.reading && (
                    <span className="ml-2 text-sm text-muted-foreground">({item.reading})</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{item.meaning}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.jlptLevel && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      JLPT_COLORS[item.jlptLevel] ?? "bg-muted",
                    )}
                  >
                    {item.jlptLevel}
                  </span>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-2">
                  <button
                    type="button"
                    onClick={() => openEditDialog(item)}
                    className="p-1.5 rounded-md hover:bg-accent hover:text-foreground text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this word?")) {
                        deleteVocab.mutate({ id: item.id });
                      }
                    }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Vocabulary</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div>
                <label htmlFor="edit-word" className="text-sm font-medium">
                  Word
                </label>
                <Input
                  id="edit-word"
                  autoFocus
                  placeholder="e.g. 食べる"
                  value={editWord}
                  onChange={(e) => setEditWord(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="edit-reading" className="text-sm font-medium">
                  Reading (Furigana)
                </label>
                <Input
                  id="edit-reading"
                  placeholder="e.g. たべる"
                  value={editReading}
                  onChange={(e) => setEditReading(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="edit-meaning" className="text-sm font-medium">
                  Meaning
                </label>
                <Input
                  id="edit-meaning"
                  placeholder="e.g. to eat"
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="edit-level" className="text-sm font-medium mb-1.5 block">
                  JLPT Level
                </label>
                <select
                  id="edit-level"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {JLPT_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={!editWord || !editMeaning || updateVocab.isPending}>
                {updateVocab.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
