"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import { enUS, zhHK } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Language } from "@/lib/queue-presentation";

type DatePickerProps = {
  // Earliest and latest selectable dates, as YYYY-MM-DD. Days outside them are disabled.
  first: string | null;
  label: string;
  language: Language;
  last: string;
  note?: string;
  onChange: (date: string) => void;
  todayLabel: string;
  value: string;
};

// Dates are plain calendar days. They are held in the browser's own time zone only while the
// calendar draws them, so the visitor's time zone never shifts the day.
function toLocalDate(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fromLocalDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DatePicker({
  first,
  label,
  language,
  last,
  note,
  onChange,
  todayLabel,
  value,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toLocalDate(value);
  const lastDate = toLocalDate(last);
  const firstDate = first ? toLocalDate(first) : undefined;
  const formatted = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(selected);

  function choose(date: string) {
    onChange(date);
    setOpen(false);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            active={open}
            aria-label={`${label}: ${formatted}`}
            className="date-trigger"
            leadingIcon={CalendarDays}
            trailingIcon={ChevronDown}
            variant="secondary"
          />
        }
      >
        {formatted}
      </PopoverTrigger>
      <PopoverContent align="end" className="date-popover">
        <Calendar
          defaultMonth={selected}
          disabled={[{ after: lastDate }, ...(firstDate ? [{ before: firstDate }] : [])]}
          endMonth={lastDate}
          locale={language === "en" ? enUS : zhHK}
          mode="single"
          onSelect={(date) => date && choose(fromLocalDate(date))}
          selected={selected}
          startMonth={firstDate}
          weekStartsOn={1}
        />
        <div className="calendar-footer">
          <Button onClick={() => choose(last)} size="compact" variant="ghost">
            {todayLabel}
          </Button>
          {note ? <span className="caption">{note}</span> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
