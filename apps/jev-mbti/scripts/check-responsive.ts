import { execFileSync } from "node:child_process";
import { CHART_VIEWS, type ChartViewMode } from "@/lib/chart";
import { MESSAGES } from "@/lib/i18n";

// Opt-in real-browser regression check. Requires the agent-browser CLI.
// Usage: pnpm check:responsive <home URL> <one-axis chart URL> <two-axis chart URL>
const urls = process.argv.slice(2).map((url) => new URL(url).href);
if (!urls.length) throw new Error("Usage: pnpm check:responsive <url> [url ...]");

const session = `jev-mbti-responsive-${process.pid}`;
const widths = [320, 360, 375, 390, 430, 768, 844, 1024, 1280];

function browser(...args: string[]) {
  return execFileSync("agent-browser", ["--session", session, ...args], {
    encoding: "utf8",
    timeout: 60_000,
  });
}

type LayoutReport = {
  viewport: number;
  page: number;
  copy: number;
  bindingGap: number;
  annotations: number;
  stickerCount: number;
  descriptions: string;
  imageView: string | null;
};

let failures = 0;
try {
  for (const locale of ["ko", "en"] as const) {
    for (const url of urls) {
      browser("open", url);
      browser("eval", `document.cookie = "lang=${locale}; path=/"`);
      browser("open", url);
      browser("wait", ".sheet");
      const isChart = new URL(url).pathname.startsWith("/c/");
      if (isChart) browser("wait", ".plot > svg");
      const views: (ChartViewMode | null)[] = isChart ? [...CHART_VIEWS] : [null];
      let reviewedDescriptions = "";

      for (const view of views) {
        if (view) {
          const t = MESSAGES[locale];
          const label =
            view === "review" ? t.withReview : view === "clean" ? t.cleanChart : t.jevOnly;
          browser("find", "role", "tab", "click", "--name", label);
        }
        for (const width of widths) {
          browser("set", "viewport", String(width), "844");
          const report: { data: { result: LayoutReport } } = JSON.parse(
            browser(
              "--json",
              "eval",
              `(async () => {
                await document.fonts.ready;
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
                const root = document.documentElement;
                const share = document.querySelector('.share');
                const copy = share?.firstElementChild;
                const binding = document.querySelector('.spiral').getBoundingClientRect();
                const rings = [...document.querySelectorAll('.spiral span')]
                  .map(ring => ring.getBoundingClientRect())
                  .filter(ring => ring.bottom <= binding.bottom + 1
                    && ring.right <= binding.right + 1);
                const gaps = rings.slice(1).map((ring, i) => ring.left - rings[i].right);
                const stickers = [...document.querySelectorAll('.plot .sticker')];
                const image = document.querySelector('.share a[download]');
                return {
                  viewport: root.clientWidth,
                  page: root.scrollWidth,
                  copy: copy && share
                    ? copy.getBoundingClientRect().width - share.getBoundingClientRect().width
                    : 0,
                  bindingGap: gaps.length ? Math.min(...gaps) : 0,
                  annotations: document.querySelectorAll(
                    '.spot, .mark, .legend, .note, .fx, .grade, .stamp, .summary.hand'
                  ).length,
                  stickerCount: stickers.length,
                  descriptions: JSON.stringify(stickers
                    .map(sticker => [sticker.textContent, sticker.getAttribute('aria-label')])
                    .sort((a, b) => a[0].localeCompare(b[0]))),
                  imageView: image ? new URL(image.href).searchParams.get('view') : null,
                };
              })()`,
            ),
          );
          const { viewport, page, copy, bindingGap } = report.data.result;
          const { annotations, stickerCount, descriptions, imageView } = report.data.result;
          if (view === "review") reviewedDescriptions = descriptions;
          const wrongView =
            view !== null &&
            (stickerCount !== 16 ||
              imageView !== view ||
              (view !== "review" && annotations > 0) ||
              (view === "clean" && descriptions !== reviewedDescriptions));
          if (page > viewport + 1 || copy > 1 || bindingGap < 16 || wrongView) {
            failures += 1;
            console.error(
              `FAIL ${locale} ${view ?? "home"} ${width}px ${url}: page ${page}px, copy overflow ${copy}px, binding gap ${bindingGap.toFixed(1)}px, wrong view ${wrongView}`,
            );
          }
        }
        console.log(`Checked ${locale} ${view ?? "home"} ${url} at ${widths.join(", ")}px`);
      }
    }
  }
} finally {
  browser("close");
}

if (failures) throw new Error(`${failures} responsive checks failed`);
console.log("Chart views, saved-image links, and responsive layouts passed.");
