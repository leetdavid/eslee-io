"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// [romaji, hiragana, katakana] — null = empty cell
type KanaCell = [string, string, string] | null;

const GOJUUON: { row: string; chars: KanaCell[] }[] = [
  {
    row: "∅",
    chars: [
      ["a", "あ", "ア"],
      ["i", "い", "イ"],
      ["u", "う", "ウ"],
      ["e", "え", "エ"],
      ["o", "お", "オ"],
    ],
  },
  {
    row: "k",
    chars: [
      ["ka", "か", "カ"],
      ["ki", "き", "キ"],
      ["ku", "く", "ク"],
      ["ke", "け", "ケ"],
      ["ko", "こ", "コ"],
    ],
  },
  {
    row: "s",
    chars: [
      ["sa", "さ", "サ"],
      ["shi", "し", "シ"],
      ["su", "す", "ス"],
      ["se", "せ", "セ"],
      ["so", "そ", "ソ"],
    ],
  },
  {
    row: "t",
    chars: [
      ["ta", "た", "タ"],
      ["chi", "ち", "チ"],
      ["tsu", "つ", "ツ"],
      ["te", "て", "テ"],
      ["to", "と", "ト"],
    ],
  },
  {
    row: "n",
    chars: [
      ["na", "な", "ナ"],
      ["ni", "に", "ニ"],
      ["nu", "ぬ", "ヌ"],
      ["ne", "ね", "ネ"],
      ["no", "の", "ノ"],
    ],
  },
  {
    row: "h",
    chars: [
      ["ha", "は", "ハ"],
      ["hi", "ひ", "ヒ"],
      ["fu", "ふ", "フ"],
      ["he", "へ", "ヘ"],
      ["ho", "ほ", "ホ"],
    ],
  },
  {
    row: "m",
    chars: [
      ["ma", "ま", "マ"],
      ["mi", "み", "ミ"],
      ["mu", "む", "ム"],
      ["me", "め", "メ"],
      ["mo", "も", "モ"],
    ],
  },
  {
    row: "y",
    chars: [
      ["ya", "や", "ヤ"],
      null,
      ["yu", "ゆ", "ユ"],
      null,
      ["yo", "よ", "ヨ"],
    ],
  },
  {
    row: "r",
    chars: [
      ["ra", "ら", "ラ"],
      ["ri", "り", "リ"],
      ["ru", "る", "ル"],
      ["re", "れ", "レ"],
      ["ro", "ろ", "ロ"],
    ],
  },
  {
    row: "w",
    chars: [
      ["wa", "わ", "ワ"],
      null,
      null,
      null,
      ["wo", "を", "ヲ"],
    ],
  },
  {
    row: "n",
    chars: [
      ["n", "ん", "ン"],
      null,
      null,
      null,
      null,
    ],
  },
];

const VOWELS = ["a", "i", "u", "e", "o"];

function KanaGrid({ script }: { script: "hiragana" | "katakana" }) {
  const idx = script === "hiragana" ? 1 : 2;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[320px]">
        {/* Column headers */}
        <div className="mb-1 grid grid-cols-[2rem_repeat(5,1fr)] gap-1.5">
          <div />
          {VOWELS.map((v) => (
            <div key={v} className="py-1 text-center font-medium text-muted-foreground text-xs">
              -{v}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {GOJUUON.map((rowData, rowIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static ordered data
            <div key={rowIdx} className="grid grid-cols-[2rem_repeat(5,1fr)] gap-1.5">
              {/* Row label */}
              <div className="flex items-center justify-center font-medium text-muted-foreground text-xs">
                {rowData.row === "∅" ? "" : rowData.row}-
              </div>

              {/* Cells */}
              {rowData.chars.map((cell, colIdx) =>
                cell ? (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static ordered data
                    key={colIdx}
                    className="flex flex-col items-center justify-center rounded-md border bg-card py-3"
                  >
                    <span className="text-2xl leading-none">{cell[idx]}</span>
                    <span className="mt-1.5 text-[10px] text-muted-foreground">{cell[0]}</span>
                  </div>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static ordered data
                  <div key={colIdx} className="rounded-md bg-muted/30" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChartsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-8 p-4 pb-20 md:p-6 lg:p-8">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Kana Charts</h1>
          <p className="text-muted-foreground text-sm">
            Hiragana and katakana reference (gojuuon order)
          </p>
        </div>

        <Tabs defaultValue="hiragana">
          <TabsList>
            <TabsTrigger value="hiragana">Hiragana (ひらがな)</TabsTrigger>
            <TabsTrigger value="katakana">Katakana (カタカナ)</TabsTrigger>
          </TabsList>
          <TabsContent value="hiragana" className="mt-4">
            <KanaGrid script="hiragana" />
          </TabsContent>
          <TabsContent value="katakana" className="mt-4">
            <KanaGrid script="katakana" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
