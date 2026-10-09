# Jev MBTI design brief

Status: The user chose the direction (notebook with red-pen 첨삭). Fourteen reviewed screens on Doop canvas `l2R2l7AW3M` await the user's approval; see the [frame index](./doop-designs.md). No app code, model calls, database changes, or deployment are authorized until then. Terms follow [the glossary](../CONTEXT.md); decisions and defaults live in [the discovery notes](../../../docs/plans/jev-mbti.md).

## 1. Feature summary

A public, anonymous, bilingual site. A visitor asks a question in Korean or English. Jev reads it and places all 16 MBTI types within seconds, drawing on a curated library of Korean social media lore; only a question about each type's style waits for an LLM to suggest two axes first. An LLM review then names the chart, explains every placement, and corrects the ones it disagrees with, while Jev's original placements stay visible. Every chart is saved under a chart link with a share image.

## 2. Primary user action

Type a question and get a chart. The question box is the first thing on the home page: no landing tour, no signup, no gate. Choosing axes yourself is available but tucked away, because most visitors won't need it.

## 3. Design direction

The candidate moods were a sticker-pop Instagram card, an editorial data graphic, a sibling of What Beats Jev's tin toy, and a school notebook graded in red pen. The user chose the notebook because it says what the product does. Jev is the quick student sticking types onto graph paper. The review is the teacher's red pen (첨삭): circles, arrows to corrected spots, margin notes, and an overall comment (총평) at the bottom of the page. The Korean classroom details (모눈 노트, the 153 ballpoint, 채점) give the site an identity that generic AI dashboards don't have.

Doop's inspiration search returned HTTP 403, so no gallery exemplar was used. This brief derives from the chosen mood and the design principles.

### Palette

Every color is a physical object on the desk. Implementation should convert these to OKLCH tokens.

| Role | Hex | Object |
| --- | --- | --- |
| Desk (outer ground) | `#E8ECF3` | Grey desk mat |
| Paper | `#FAFBFE` | Cool white grid notebook page |
| Grid, minor and major | `#DFE8F6` / `#C9D8EF` | Printed blue grid lines |
| Ink (text, axes, primary action) | `#1D2550` | Navy ballpoint |
| Secondary ink | `#4A5274` | Lighter ballpoint pressure |
| Graphite (Jev's original spot) | `#6B7285` | Pencil outline |
| Red pen (review only) | `#C8282E` | Teacher's red pen |
| Sticker NT, NF, SJ, SP | `#CBBDF6` / `#B6E5C4` / `#B9D9F5` / `#F8DE84` | Lavender, mint, sky, and butter die-cut stickers |
| Warning (technical problems) | `#A15C07` | Highlighter-orange margin tab |

Calculated WCAG contrast on paper: ink 14.2:1, secondary ink 7.4:1, graphite 4.6:1, red pen 5.3:1, and warning 5.0:1. Ink on the sticker colors ranges from 8.5:1 to 11.0:1, and white on the ink button is 14.7:1. Graphite text appears only on paper, because it drops to 4.1:1 on the desk color. These are token-pair calculations, not a rendered audit.

Red is reserved for the review. Errors and warnings never use red, so a technical failure can't be mistaken for a correction. The four sticker colors follow the purple, green, blue, and yellow grouping that Korean MBTI fans already recognize, in stationery tones and labeled by letter pairs (NT, NF, SJ, SP) rather than another site's group names.

### Typography

- [Pretendard Variable](https://github.com/orioncactus/pretendard) for interface text, questions, and explanations, at weights 400 to 800. Its Latin glyphs come from Inter, so Fluid Functionalism's weight animations still work.
- [Bagel Fat One](https://fonts.google.com/specimen/Bagel+Fat+One) for sticker type codes and the wordmark only. It reads as a chunky die-cut label.
- [Nanum Pen Script](https://fonts.google.com/specimen/Nanum+Pen+Script) for anything the red pen writes: margin notes, the grade, and 총평. It is never smaller than 22px. Every handwritten explanation is repeated in Pretendard in the type list.
- Scale: 14px supporting, 16px body, 20px emphasis, 28px section, and 40 to 44px for the question on desktop (28px on mobile). Counts and ranks use tabular numbers, and inputs stay at least 16px.

### Visual device and components

The hero is the notebook page itself: a grid-paper sheet with spiral binding across the top and a "No. / Date" header line. Placements are stickers. Corrections appear as a dashed pencil outline at Jev's spot, a curved red arrow to the corrected sticker, a red circle, and a numbered note in the right margin. The grade ("13/16", circled in red) is the visual form of the correction count. It shows how many placements the review kept.

Components come from Fluid Functionalism, re-themed:

- InputMessage-style composer for the question
- Tabs for Auto / one axis / two axes and for With review / Jev only
- Accordion for "Set axes yourself"
- Buttons, Badges, and Tooltip
- ThinkingSteps for progress
- Banner for problems
- Dialog (or a bottom sheet on mobile) for type detail
- InputCopy for the chart link

One-line direction: a grid-paper notebook where Jev sticks all 16 types in place and a teacher's red pen marks what it got wrong.

## 4. Layout strategy

On desktop, the sheet holds the question, a toolbar row (grade, review toggle, chart kind), the chart, and a right-hand margin column for red notes. The 총평 sits under the chart, followed by the ranked type list and share actions.

On mobile, a one-axis chart turns vertical: the high end is at the top, and stickers sit in columns on both sides of the axis, like a ranking ladder. A two-axis chart stays square at full width with smaller stickers. Margin notes move below the chart with numbered markers that match the circles. Nothing is removed to make it fit, and the page scrolls naturally.

Stickers never overlap. On one axis they stack in lanes, and on two axes they are nudged apart. Long questions wrap fully at every width.

## 5. Key states

| State | What the visitor sees |
| --- | --- |
| Home | Question box, axis-mode tabs, a collapsed custom-axes control, and example charts |
| Suggesting axes | The question at the top of a blank page and the first ThinkingSteps step active |
| Jev placing | Stickers landing quickly in staggered order, with the axes drawn |
| Review writing | Jev's chart complete and red notes arriving one at a time ("첨삭 중 9/16") |
| Complete (reviewed) | Grade, circles, arrows, margin notes, 총평, ranked list, and share actions |
| Jev only | Same chart with stickers at Jev's placements and no red ink |
| Type detail | Type code and group, rank or position under Jev and under review, Jev's confidence meter, explanation, and lore topics used |
| No corrections | No arrows, and a red "참 잘했어요" stamp beside a 16/16 grade |
| Review failed | Jev's chart intact, plus a warning Banner with Retry |
| Refused question | An inline note under the composer, with the question preserved for editing |
| Rate limited | An inline note with the time to wait. Saved charts still open normally. |
| Missing chart | A blank notebook page that links back to asking a question |

## 6. Interaction model

- Enter submits the question and Shift+Enter adds a line. IME composition never triggers a submit.
- Changing axes on a saved chart creates a new chart with its own link. A saved chart never changes, except that its review arrives once.
- The review toggle defaults to With review once the review exists. It is unavailable until the review starts.
- Selecting a sticker opens its type detail, from either the chart or the list. Stickers are buttons and are reachable with the keyboard in ranked order.
- Motion: stickers drop in with a short spring and stagger, red ink draws its strokes along the path, and the grade circles itself last. Under reduced motion, everything appears at its final state.
- Screen readers get the chart as the ranked list. Corrections are announced in words, such as "ISFJ: Jev 7th, reviewed 3rd," never by color alone.

## 7. Content requirements

Copy is short and written by hand. Jev never "explains" anything; explanations belong to the review.

| Location | Korean | English |
| --- | --- | --- |
| Home headline | 질문 하나면 16가지 MBTI 자리 배치 끝 | One question. All 16 types, placed. |
| Home subline | Jev가 16개 유형을 붙이고, 빨간 펜이 한 번 더 첨삭해요. | Jev places every type in seconds. Then the red pen checks its work. |
| Input label | 질문 | Your question |
| Input example | 예: 회식 2차까지 가는 MBTI는? | e.g. Which type stays for the second round? |
| Axis tabs | 자동 · 한 축 · 두 축 | Auto · One axis · Two axes |
| Custom axes | 축 직접 정하기 | Set axes yourself |
| Submit | 배치하기 | Place them |
| Suggesting axes | 질문에 맞는 축을 고르는 중 | Choosing axes for your question |
| Jev placing | Jev가 16개 유형을 붙이는 중 | Jev is placing all 16 types |
| Review writing | 빨간 펜이 첨삭하는 중 · 9/16 | The red pen is reviewing · 9/16 |
| Grade label | Jev 점수 | Jev's score |
| Review toggle | 첨삭 반영 · Jev만 | With review · Jev only |
| Summary label | 총평 | Overall |
| Review failed | 첨삭을 끝내지 못했어요. Jev 배치는 그대로예요. | Couldn't finish the review. Jev's placements are safe. |
| Retry | 다시 첨삭하기 | Retry review |
| Refused | 이 질문은 차트로 만들 수 없어요. 다른 질문을 해 주세요. | We can't chart that question. Try another one. |
| Rate limited | 새 차트를 많이 만들었어요. {n}분 뒤에 다시 시도해 주세요. | You've made a lot of new charts. Try again in {n} minutes. |
| Missing chart | 이 차트를 찾을 수 없어요. | We couldn't find this chart. |
| Share | 링크 복사 · 이미지 저장 | Copy link · Save image |
| Change axes | 축 바꾸기 | Change axes |
| Footer | Jev(TypeSafe)가 배치하고 Gemini 3.8 Flash가 첨삭해요. MBTI 정보는 한국 SNS 밈을 바탕으로 했고, 심리 검사가 아니에요. | Placed by Jev (TypeSafe), reviewed by Gemini 3.8 Flash. Lore comes from Korean social media memes, not psychology. |

All example placements, explanations, and grades in the frames are illustrative design content, labeled as such, not real Jev or LLM output.

## 8. Deliverables on Doop

Paired desktop (1280 wide) and mobile (390 wide) frames for home, progress, a finished one-axis chart, and a finished two-axis chart. Mobile frames for type detail and Jev only. Desktop frames for the failed review and the other system states. Share images in Korean and English (1200 by 630). Every frame is screenshot-reviewed for fit, spacing, hierarchy, contrast, and alignment before moving on.

## 9. Open questions

- The grade, the "참 잘했어요" stamp, and showing which lore topics were used are presentational proposals that need the user's approval.
- The public name and domain need confirming before publishing. The frames use `jev-mbti.vercel.app` as a stand-in.
