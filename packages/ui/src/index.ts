import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export { cn };

export * from "./button";
export * from "./dropdown-menu";
export * from "./form";
export * from "./input";
export * from "./label";
export * from "./theme";
export * from "./toast";
