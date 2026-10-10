"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

// The shadcn/ui calendar on react-day-picker, styled with this app's tokens in globals.css.
function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("calendar", className)}
      classNames={{
        button_next: "calendar-step",
        button_previous: "calendar-step",
        caption_label: "calendar-caption",
        day: "calendar-day",
        day_button: "calendar-day-button",
        disabled: "is-disabled",
        hidden: "is-hidden",
        month: "calendar-month",
        month_caption: "calendar-month-caption",
        month_grid: "calendar-grid",
        months: "calendar-months",
        nav: "calendar-nav",
        outside: "is-outside",
        selected: "is-selected",
        today: "is-today",
        weekday: "calendar-weekday",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
        ...components,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

export { Calendar };
