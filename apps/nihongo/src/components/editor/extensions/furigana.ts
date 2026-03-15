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

  inclusive: false,

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
    return [
      {
        tag: "ruby",
        getAttrs: (node) => {
          if (node instanceof HTMLElement) {
            // Check data attribute first, then fallback to <rt> tag
            const dataReading = node.getAttribute("data-reading");
            if (!dataReading) {
              const rt = node.querySelector("rt");
              if (rt) {
                node.setAttribute("data-reading", rt.textContent || "");
              }
            }

            // Remove rt and rp to prevent their text from being parsed as the ruby mark's content
            node.querySelectorAll("rt").forEach((el) => {
              el.remove();
            });
            node.querySelectorAll("rp").forEach((el) => {
              el.remove();
            });
          }
          return null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const reading = mark.attrs.reading as string;
    return [
      "ruby",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-reading": reading }),
      0,
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
