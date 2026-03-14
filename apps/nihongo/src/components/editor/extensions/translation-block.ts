import { mergeAttributes, Node } from "@tiptap/core";

export interface TranslationBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    translationBlock: {
      insertTranslationBlock: () => ReturnType;
    };
  }
}

export const TranslationBlock = Node.create<TranslationBlockOptions>({
  name: "translationBlock",
  group: "block",
  content: "block+",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      sourceLanguage: { default: "ja" },
      targetLanguage: { default: "en" },
      sourceText: { default: "" },
      targetText: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-translation-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-translation-block": "true",
        class: "translation-block",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertTranslationBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              sourceLanguage: "ja",
              targetLanguage: "en",
            },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Source text..." }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Translation..." }],
              },
            ],
          });
        },
    };
  },
});
