import { execFileSync } from "node:child_process";

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

type LayoutReport = { viewport: number; page: number; copy: number; bindingGap: number };

let failures = 0;
try {
  for (const locale of ["ko", "en"]) {
    for (const url of urls) {
      browser("open", url);
      browser("eval", `document.cookie = "lang=${locale}; path=/"`);
      browser("open", url);
      browser("wait", ".sheet");
      if (new URL(url).pathname.startsWith("/c/")) browser("wait", ".plot > svg");

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
                return {
                  viewport: root.clientWidth,
                  page: root.scrollWidth,
                  copy: copy && share
                    ? copy.getBoundingClientRect().width - share.getBoundingClientRect().width
                    : 0,
                  bindingGap: gaps.length ? Math.min(...gaps) : 0,
                };
              })()`,
          ),
        );
        const { viewport, page, copy, bindingGap } = report.data.result;
        if (page > viewport + 1 || copy > 1 || bindingGap < 16) {
          failures += 1;
          console.error(
            `FAIL ${locale} ${width}px ${url}: page ${page}px, copy overflow ${copy}px, binding gap ${bindingGap.toFixed(1)}px`,
          );
        }
      }
      console.log(`Checked ${locale} ${url} at ${widths.join(", ")}px`);
    }
  }
} finally {
  browser("close");
}

if (failures) throw new Error(`${failures} responsive checks failed`);
console.log("No horizontal overflow or crowded notebook rings.");
