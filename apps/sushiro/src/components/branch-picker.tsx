"use client";

import { Drawer } from "@base-ui/react/drawer";
import { Check, Search, Star } from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsNarrow } from "@/lib/media";
import { copy, fill, type Language, queueBand, storeName } from "@/lib/queue-presentation";
import { isActiveStore, type QueueStore } from "@/lib/queues";
import { type TerritoryBand, territoryBandOf } from "@/lib/store-grid";

type BranchPickerProps = {
  language: Language;
  // Called with the chosen branch, or null for all branches. Choosing closes the picker.
  onChoose?: (store: QueueStore | null) => void;
  onOpenChange?: (open: boolean) => void;
  // Called when a branch's star is toggled. The picker stays open so several can be starred.
  onToggleSaved?: (storeId: number) => void;
  savedIds?: number[];
  selectedId?: number | null;
  stores: QueueStore[];
  // The button that opens the picker.
  trigger: ReactElement;
};

const territoryOrder: TerritoryBand[] = ["newTerritories", "kowloon", "hongKongIsland"];
// On phones the sheet opens over this share of the screen and drags up to all of it. Its height
// never follows the number of matches, so typing cannot shrink it behind the keyboard.
const restingHeight = 0.6;
const sheetHeights = [restingHeight, 1];

// A searchable list of branches by territory. It chooses one branch (Stats) or stars several
// (My branches). It is a popover on wide screens and a bottom sheet on phones, which drags up to
// full height and down to close.
export function BranchPicker({
  language,
  onChoose,
  onOpenChange,
  onToggleSaved,
  savedIds = [],
  selectedId = null,
  stores,
  trigger,
}: BranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sheetHeight, setSheetHeight] = useState<Drawer.Root.SnapPoint | null>(restingHeight);
  const sheet = useRef<HTMLDivElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
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

  function changeOpen(next: boolean) {
    if (next) {
      setSheetHeight(restingHeight);
    }

    setOpen(next);
    onOpenChange?.(next);
  }

  function changeSheetHeight(height: Drawer.Root.SnapPoint | null) {
    setSheetHeight(height);

    // Dragging the sheet down from full height puts the keyboard away with it.
    if (height !== 1) {
      searchField.current?.blur();
    }
  }

  function choose(store: QueueStore | null) {
    onChoose?.(store);
    changeOpen(false);
  }

  // In the sheet the list is the drawer's content, so a drag on it scrolls before it closes.
  const List = isNarrow ? Drawer.Content : "div";
  const list = (
    <div className="picker">
      <div className="picker-find">
        {/* A touch on the field is for typing, so it never starts a drag of the sheet. */}
        <label className="picker-search" data-base-ui-swipe-ignore="">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label={text.findBranch}
            // biome-ignore lint/a11y/noAutofocus: the picker opens for typing a branch name, and only on wide screens where no keyboard slides up.
            autoFocus={!isNarrow}
            onChange={(event) => setSearch(event.target.value)}
            // The keyboard takes the lower half of a phone, so the sheet goes to full height.
            onFocus={() => setSheetHeight(1)}
            placeholder={text.findBranch}
            ref={searchField}
            type="search"
            value={search}
          />
        </label>
        {isNarrow ? (
          <Button asChild className="h-11" variant="ghost">
            <Drawer.Close>{saving ? text.done : text.close}</Drawer.Close>
          </Button>
        ) : null}
      </div>
      <List className="picker-list">
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
      </List>
      {term && groups.length > 0 ? (
        <p className="picker-note picker-count">
          {fill(text.branchesMatch, { count: matches.length, total: stores.length })}
        </p>
      ) : null}
    </div>
  );

  if (isNarrow) {
    return (
      <Drawer.Root
        onOpenChange={changeOpen}
        onSnapPointChange={changeSheetHeight}
        open={open}
        snapPoint={sheetHeight}
        snapPoints={sheetHeights}
        // One drag moves one stop: full to part height, then part height to closed.
        snapToSequentialPoints
      >
        <Drawer.Trigger render={trigger} />
        {/* Keeps the sheet and its list clear of the on-screen keyboard. */}
        <Drawer.VirtualKeyboardProvider>
          <Drawer.Portal>
            <Drawer.Backdrop className="drawer-backdrop" />
            <Drawer.Viewport className="drawer-viewport">
              <Drawer.Popup
                aria-label={text.chooseBranch}
                className="picker-sheet"
                // Focus goes to the sheet, not the search field, so no keyboard slides up yet.
                initialFocus={sheet}
                ref={sheet}
              >
                <div className="sheet-grip">
                  <div className="sheet-handle" />
                </div>
                {list}
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.VirtualKeyboardProvider>
      </Drawer.Root>
    );
  }

  return (
    <Popover onOpenChange={changeOpen} open={open}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="picker-popover">
        {list}
      </PopoverContent>
    </Popover>
  );
}
