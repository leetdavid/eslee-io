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
          // Check data attribute first, then fallback to <rt> tag
          const dataReading = element.getAttribute("data-reading");
          if (dataReading) return dataReading;

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
      ["span", {}, 0], // The content hole (0) must be the only child of its parent node in ProseMirror
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
});
