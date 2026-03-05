import { Node, mergeAttributes } from "@tiptap/core";

export interface AudioAnnotationOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioAnnotation: {
      insertAudioAnnotation: (attrs: {
        src: string;
        label?: string;
      }) => ReturnType;
    };
  }
}

export const AudioAnnotation = Node.create<AudioAnnotationOptions>({
  name: "audioAnnotation",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: { default: "" },
      label: { default: "Play" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-audio-annotation]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-audio-annotation": "true",
        "data-src": node.attrs.src as string,
        class: "audio-annotation",
        contenteditable: "false",
      }),
      ["span", { class: "audio-icon" }, "\u{1F50A}"],
      ["span", { class: "audio-label" }, ` ${node.attrs.label as string}`],
    ];
  },

  addCommands() {
    return {
      insertAudioAnnotation:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span");
      dom.classList.add("audio-annotation");
      dom.setAttribute("data-audio-annotation", "true");
      dom.contentEditable = "false";
      dom.innerHTML = `<span class="audio-icon">\u{1F50A}</span> <span class="audio-label">${node.attrs.label as string}</span>`;

      dom.addEventListener("click", () => {
        const src = node.attrs.src as string;
        if (src) {
          const audio = new Audio(src);
          audio.play().catch(console.error);
        } else {
          // Fallback: use browser TTS
          const text = node.attrs.label as string;
          if ("speechSynthesis" in window && text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "ja-JP";
            window.speechSynthesis.speak(utterance);
          }
        }
      });

      return { dom };
    };
  },
});
