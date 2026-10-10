"use client";

import { Check, Search, Star } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsNarrow } from "@/lib/media";
import { copy, fill, type Language, queueBand, storeName } from "@/lib/queue-presentation";
import { isActiveStore, type QueueStore } from "@/lib/queues";
import { type TerritoryBand, territoryBandOf } from "@/lib/store-grid";

type BranchPickerProps = {
  language: Language;
  // Called with the chosen branch, or null for all branches. Choosing closes the picker.
  onChoose?: (store: QueueStore | null) => void;
  // Called when a branch's star is toggled. The picker stays open so several can be starred.
  onToggleSaved?: (storeId: number) => void;
  savedIds?: number[];
  selectedId?: number | null;
  stores: QueueStore[];
  // The button that opens the picker.
  trigger: ReactElement;
};

const territoryOrder: TerritoryBand[] = ["newTerritories", "kowloon", "hongKongIsland"];

// A searchable list of branches by territory. It chooses one branch (Stats) or stars several
// (My branches). It is a popover on wide screens and a bottom sheet on phones.
export function BranchPicker({
  language,
  onChoose,
  onToggleSaved,
  savedIds = [],
  selectedId = null,
  stores,
  trigger,
}: BranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isNarrow = useIsNarrow();
  const text = copy[language];
  const saving = Boolean(onToggleSaved);
  const term = search.trim().toLocaleLowerCase();
  const matches = stores
    .filter((store) =>
      [store.name, store.nameEn, store.area].some((value) =>
        value.toLocaleLowerCase().includes(term),
      ),
    )
    .sort((left, right) => storeName(left, language).localeCompare(storeName(right, language)));
  const saved = saving ? matches.filter(({ id }) => savedIds.includes(id)) : [];
  const groups = [
    ...(saved.length > 0 ? [{ label: text.myBranches, stores: saved }] : []),
    ...territoryOrder.map((band) => ({
      label: text.territory[band],
      stores: matches.filter(
        (store) => territoryBandOf(store.nameEn) === band && !saved.includes(store),
      ),
    })),
    {
      label: text.otherBranches,
      stores: matches.filter(
        (store) => territoryBandOf(store.nameEn) === null && !saved.includes(store),
      ),
    },
  ].filter((group) => group.stores.length > 0);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!(open && isNarrow)) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isNarrow, open]);

  function choose(store: QueueStore | null) {
    onChoose?.(store);
    setOpen(false);
  }

  const list = (
    <div className="picker">
      <label className="picker-search">
        <Search aria-hidden="true" size={16} />
        <input
          aria-label={text.findBranch}
          // biome-ignore lint/a11y/noAutofocus: the picker opens for typing a branch name, and only on wide screens where no keyboard slides up.
          autoFocus={!isNarrow}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={text.findBranch}
          type="search"
          value={search}
        />
      </label>
      <div className="picker-list">
        {!saving && !term ? (
          <button
            aria-pressed={selectedId === null}
            className="picker-option"
            onClick={() => choose(null)}
            type="button"
          >
            <span>{text.allBranches}</span>
            {selectedId === null ? <Check size={16} /> : null}
          </button>
        ) : null}
        {groups.map((group) => (
          <section aria-label={group.label} key={group.label}>
            <p className="picker-group">{group.label}</p>
            {group.stores.map((store) => {
              const isSaved = savedIds.includes(store.id);

              return (
                <button
                  aria-pressed={saving ? isSaved : store.id === selectedId}
                  className="picker-option"
                  data-band={queueBand(store)}
                  key={store.id}
                  onClick={() => (saving ? onToggleSaved?.(store.id) : choose(store))}
                  type="button"
                >
                  <i className="band-dot" />
                  <span>{storeName(store, language)}</span>
                  <span className="picker-wait">
                    {isActiveStore(store) ? `${store.wait} ${text.minutes}` : text.pausedFigure}
                  </span>
                  {saving ? (
                    <Star
                      className="picker-star"
                      data-saved={isSaved || undefined}
                      fill={isSaved ? "currentColor" : "none"}
                      size={16}
                    />
                  ) : store.id === selectedId ? (
                    <Check size={16} />
                  ) : null}
                </button>
              );
            })}
          </section>
        ))}
        {groups.length === 0 ? <p className="picker-note">{text.noBranchMatch}</p> : null}
      </div>
      {term && groups.length > 0 ? (
        <p className="picker-note picker-count">
          {fill(text.branchesMatch, { count: matches.length, total: stores.length })}
        </p>
      ) : null}
    </div>
  );

  if (isNarrow) {
    return (
      <>
        <PickerTrigger onOpen={() => setOpen(true)} trigger={trigger} />
        {open ? (
          <>
            <button
              aria-label={text.close}
              className="sheet-backdrop"
              onClick={() => setOpen(false)}
              tabIndex={-1}
              type="button"
            />
            <aside aria-label={text.chooseBranch} className="picker-sheet">
              <div className="sheet-handle" />
              {list}
            </aside>
          </>
        ) : null}
      </>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="picker-popover">
        {list}
      </PopoverContent>
    </Popover>
  );
}

// On phones the trigger opens the bottom sheet directly.
function PickerTrigger({ onOpen, trigger }: { onOpen: () => void; trigger: ReactElement }) {
  return (
    <span className="picker-trigger" onClickCapture={onOpen}>
      {trigger}
    </span>
  );
}
