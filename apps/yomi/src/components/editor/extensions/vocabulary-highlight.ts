import { Mark, mergeAttributes } from "@tiptap/core";

export interface VocabularyHighlightOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vocabularyHighlight: {
      setVocabularyHighlight: (attrs: {
        word: string;
        reading?: string;
        meaning?: string;
        jlptLevel?: string;
      }) => ReturnType;
      unsetVocabularyHighlight: () => ReturnType;
    };
  }
}

const jlptColorMap: Record<string, string> = {
  N5: "vocab-n5",
  N4: "vocab-n4",
  N3: "vocab-n3",
  N2: "vocab-n2",
  N1: "vocab-n1",
};

export const VocabularyHighlight = Mark.create<VocabularyHighlightOptions>({
  name: "vocabularyHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      word: { default: "" },
      reading: { default: "" },
      meaning: { default: "" },
      jlptLevel: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-vocabulary]",
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const jlptLevel = mark.attrs.jlptLevel as string | null;
    const className = jlptLevel ? (jlptColorMap[jlptLevel] ?? "") : "";

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-vocabulary": "true",
        "data-word": mark.attrs.word as string,
        "data-reading": mark.attrs.reading as string,
        "data-meaning": mark.attrs.meaning as string,
        "data-jlpt-level": jlptLevel ?? "",
        class: `cursor-pointer rounded-sm px-0.5 ${className}`,
        title: `${mark.attrs.word}${mark.attrs.reading ? ` (${mark.attrs.reading})` : ""}: ${mark.attrs.meaning}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setVocabularyHighlight:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetVocabularyHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
