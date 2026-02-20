import { Mark, mergeAttributes } from "@tiptap/core";

export interface FuriganaOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    furigana: {
      setFurigana: (reading: string) => ReturnType;
      unsetFurigana: () => ReturnType;
    };
  }
}

export const Furigana = Mark.create<FuriganaOptions>({
  name: "furigana",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      reading: {
        default: "",
        parseHTML: (element) => {
          const rt = element.querySelector("rt");
          return rt?.textContent ?? "";
        },
        renderHTML: (attributes) => {
          return { "data-reading": attributes.reading as string };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "ruby" }];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const reading = mark.attrs.reading as string;
    return [
      "ruby",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0, // content slot
      ["rp", {}, "("],
      ["rt", {}, reading],
      ["rp", {}, ")"],
    ];
  },

  addCommands() {
    return {
      setFurigana:
        (reading: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { reading });
        },
      unsetFurigana:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-r": () => {
        const reading = window.prompt("Enter furigana reading:");
        if (reading) {
          return this.editor.commands.setFurigana(reading);
        }
        return false;
      },
    };
  },
});
