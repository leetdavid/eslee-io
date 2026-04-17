import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

function isMarkdownTable(text: string): boolean {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return false;
  const hasTableLines = lines.every((l) => l.trim().startsWith("|"));
  const hasSeparator = lines.some((l) => /^\|[\s\-:|]+\|/.test(l.trim()));
  return hasTableLines && hasSeparator;
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function buildTableNode(lines: string[]) {
  const nonEmpty = lines.filter((l) => l.trim());
  const dataLines = nonEmpty.filter((l) => !isSeparatorRow(l));

  if (dataLines.length === 0) return null;

  const [headerLine, ...bodyLines] = dataLines;
  const headerCells = parseCells(headerLine!);

  const makeCell = (text: string, cellType: "tableHeader" | "tableCell") => ({
    type: cellType,
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  });

  const headerRow = {
    type: "tableRow",
    content: headerCells.map((cell) => makeCell(cell, "tableHeader")),
  };

  const bodyRows = bodyLines.map((line) => ({
    type: "tableRow",
    content: parseCells(line).map((cell) => makeCell(cell, "tableCell")),
  }));

  return {
    type: "table",
    content: [headerRow, ...bodyRows],
  };
}

export const TableMarkdownPaste = Extension.create({
  name: "tableMarkdownPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableMarkdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (!isMarkdownTable(text)) return false;

            const lines = text.trim().split("\n");
            const tableNode = buildTableNode(lines);
            if (!tableNode) return false;

            const { state, dispatch } = view;
            const { tr, schema } = state;

            try {
              const node = schema.nodeFromJSON(tableNode);
              const pos = state.selection.from;
              dispatch(tr.replaceSelectionWith(node));
              view.focus();
              return true;
            } catch {
              return false;
            }
          },
        },
      }),
    ];
  },
});
