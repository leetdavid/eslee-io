# Doop designs and verification

Canvas: `l2R2l7AW3M`, named "Jev MBTI". These are 14 original frames in the notebook with red-pen 첨삭 direction, plus the canvas style guide `notebook-red-pen`. Status: approved by the user and implemented in `apps/jev-mbti`; see "Implementation" at the end for verified behavior and deliberate deviations.

Every placement, explanation, grade, and confidence value in the frames is illustrative design content, labeled "디자인 예시 · Design example", not a real Jev or LLM result.

## Frames

The frames are arranged in reading order. Each row pairs desktop with mobile, and the share images sit in the right-hand column.

| Screen | Frame ID | Size | Render |
| --- | --- | --- | --- |
| Home, desktop (KO) | `_AwV4X3ZiK` | 1280 × 1300 | [PNG](https://doop.design/i/_AwV4X3ZiK.png?scale=2) |
| Home, mobile (EN) | `IX8WsglwbI` | 390 × 1830 | [PNG](https://doop.design/i/IX8WsglwbI.png?scale=2) |
| One-axis chart, reviewed, desktop (KO) | `VS3x08HFfy` | 1280 × 1540 | [PNG](https://doop.design/i/VS3x08HFfy.png?scale=2) |
| One-axis chart, reviewed, mobile ladder (EN) | `UvgANIUk7s` | 390 × 2790 | [PNG](https://doop.design/i/UvgANIUk7s.png?scale=2) |
| Jev-only view, mobile (EN) | `HzdsmLDF1T` | 390 × 2230 | [PNG](https://doop.design/i/HzdsmLDF1T.png?scale=2) |
| Type detail sheet, mobile (EN) | `Q-mz0ptbAM` | 390 × 844 | [PNG](https://doop.design/i/Q-mz0ptbAM.png?scale=2) |
| Two-axis chart, INTJ selected, desktop (KO) | `d3RzmkFolF` | 1280 × 1700 | [PNG](https://doop.design/i/d3RzmkFolF.png?scale=2) |
| Two-axis chart, mobile (EN) | `OgGpVlO_m3` | 390 × 2150 | [PNG](https://doop.design/i/OgGpVlO_m3.png?scale=2) |
| Progress, review writing, desktop (KO) | `RtXsULd6SY` | 1280 × 1500 | [PNG](https://doop.design/i/RtXsULd6SY.png?scale=2) |
| Progress, Jev placing, mobile (EN) | `qHltAn-SeF` | 390 × 1185 | [PNG](https://doop.design/i/qHltAn-SeF.png?scale=2) |
| Review failed, desktop (EN) | `l64jLtWg11` | 1280 × 1290 | [PNG](https://doop.design/i/l64jLtWg11.png?scale=2) |
| Other states, desktop (KO) | `LhfB8sC665` | 1280 × 880 | [PNG](https://doop.design/i/LhfB8sC665.png?scale=2) |
| Share image (KO) | `Po1Nz4Nb-p` | 1200 × 630 | [PNG](https://doop.design/i/Po1Nz4Nb-p.png?scale=2) |
| Share image (EN) | `NZzkLu7cH3` | 1200 × 630 | [PNG](https://doop.design/i/NZzkLu7cH3.png?scale=2) |

The "Other states" frame covers a refused question, a rate limit, a missing chart, and a review with no corrections ("참 잘했어요" stamp, 16/16). Image URLs render each frame's current HTML, not a fixed snapshot.

## What the frames demonstrate

- **Jev's placement versus the review.** A dashed pencil outline marks Jev's spot, and a curved red arrow, red circle, and numbered marker show where the review moved the type. A legend in each chart explains the marks.
- **The grade.** The circled red grade (13/16, 14/16) counts the placements the review kept. The "참 잘했어요" stamp replaces arrows when nothing was corrected.
- **Margin notes.** On desktop they sit in the notebook's right margin. On mobile they move below the chart with matching numbers. Every handwritten note is repeated in Pretendard in the type list.
- **Mobile one-axis layout.** The chart turns into a vertical ladder with the high end on top. Jev's spots sit on the axis line, and stickers fill four columns on either side.
- **Jev only.** The red ink disappears and the list shows Jev's ranking with a confidence meter, labeled as concentration rather than accuracy.
- **Type detail.** It shows the move, Jev's per-level probability distribution and confidence, the explanation, and the lore topics Jev read. On mobile this is a bottom sheet. On desktop the margin turns into a detail panel while a sticker is selected.
- **Progress.** ThinkingSteps cover choosing axes, Jev placing, and the review writing. Stickers drop in during placement. During the review, notes and explanations fill in while unfinished rows show skeleton lines.
- **Problems.** These use the orange warning tone and never red. The failed-review Banner keeps Jev's chart and offers Retry review. Refused and rate-limited questions keep the visitor's text.

## Screenshot review

Every frame was screenshot-reviewed after creation, and again after each fix.

| Check | Verdict |
| --- | --- |
| Fit | All content fits its artboard. Excess height was trimmed and cut-off footers were fixed. |
| Spacing | Groups are tight and sections are separated by grid rules, not nested cards. |
| Hierarchy | The question and chart dominate. The grade and margin notes come next, and the list and actions are secondary. |
| Contrast | Token pairs meet the calculations in the brief: graphite 4.6:1 and red 5.3:1 on paper. Problem states never use red. |
| Alignment | Stickers never overlap. One axis uses lane packing, two axes use collision nudging around the axis labels, and number markers are placed in a free corner. |
| Realism | The questions are realistic Korean MBTI memes. Every example verdict is labeled illustrative. |
| Logos | No third-party marks are used. The wordmark is the provisional "Jev MBTI" title set as a label sticker. |

Corrections made during review:

- Fixed a CSS class clash that turned the "축 바꾸기" button into a dashed outline.
- Moved Jev's spots into a pencil row above the axis so arrows run upward rather than looping over stacks.
- Moved two-axis labels out of the way of stickers and spots.
- Placed number markers in free corners.
- Replaced a check glyph that the handwriting font can't render with a pen icon.
- Moved the zero-correction stamp off the stickers.
- Added Korean word-keeping line breaks.

## Implementation notes found during design

- **Self-host and subset the Korean fonts.** Doop's renderer often captured frames before Google's Korean font slices had loaded, which produced missing glyphs or a full fallback. In those fallbacks the grade overflowed its circle. The app should load Pretendard, Bagel Fat One, and Nanum Pen Script through `next/font` with metric-matched fallbacks, so text never renders as tofu or reflows late.
- **Use `word-break: keep-all` for Korean.** Without it, Korean wraps mid-word ("오/열", "따/라 움").
- **Compute sticker layout in code.** The prototypes' lane packing, collision nudging, and free-corner marker placement are the intended behavior. Positions are rendered from placements, never hand-placed.
- The frames are self-contained HTML prototypes showing Fluid Functionalism anatomy (InputMessage composer, Tabs, Accordion, ThinkingSteps, Banner, Dialog/sheet, InputCopy). The app must install the actual registry components.
- Font loading, real keyboard and screen-reader behavior, and motion are not verified by these static frames.

## Implementation

The app implements the approved frames with the installed Fluid Functionalism components: InputMessage, Tabs, Accordion, ThinkingSteps, Banner, Dialog, InputCopy, Badge, and Button. Layout uses the prototypes' algorithms, ported to `src/lib/layout.ts` and covered by tests. Headless-browser checks at 1280 and 390 pixels with real Jev and LLM output covered the following:

- Home, with owner-picked examples and the language switch.
- The two-step creation progress.
- A one-axis chart, horizontal on desktop and a ladder on mobile.
- A two-axis chart with real corrections, including spots, arrows, rings, markers, and grade.
- The streaming review, the 16/16 stamp, Jev only, and type detail (margin panel on desktop, Dialog on mobile).
- Refused and over-long questions.
- A failed review with its banner, and Retry running a fresh review.
- The missing-chart page, which returns 404.
- Both share images.

Deliberate deviations from the frames:

- Score axes use seven levels rather than five. Live evaluation showed five-level axes piling types at the ends; seven calibrated levels separate them better. The type-detail distribution therefore shows seven bars.
- On mobile, type detail uses Fluid's centered Dialog rather than a bottom sheet. The registry Dialog positions itself with animation transforms.
- The composer's send action is InputMessage's built-in icon button. Its accessible name and tooltip say "배치하기 / Place them", and the hint line explains Enter.
- Share images set the question in Noto Sans KR, which Google can subset as TrueType for image rendering, instead of Pretendard.
- Reviews currently run on Gemini 2.5 Flash, because the team's AI Gateway free tier blocks Gemini 3.x. The interface credits whichever model actually wrote each review.
