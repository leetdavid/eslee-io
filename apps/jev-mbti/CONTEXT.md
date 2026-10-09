# Jev MBTI

This context describes a bilingual website that answers a question by placing each of the 16 MBTI types on one axis or two. The title is provisional and matches the design canvas.

## Charting

**Question**:
The visitor's free-form prompt, in Korean or English, that a chart answers, such as which types are most likely to cry at a movie.
_Avoid_: prompt, query, topic

**Question identity**:
A question's wording, ignoring letter case and whitespace. Translations and rewordings keep separate identities.
_Avoid_: semantic match, same meaning

**Chart**:
The saved answer to a question: its axes, the placements of all 16 types, and its review. Asking a question with the same question identity and the same axes reuses the existing chart instead of creating a new one.
_Avoid_: result, graph, plot

**Chart link**:
The short, permanent address of a chart. It opens in the viewer's interface language, whichever language the question used. The question itself is shown in the viewer's language too, with the original wording beneath it when the languages differ.
_Avoid_: URL, permalink, share link

**Share image**:
A picture of a chart for posting elsewhere. As a link preview it uses the question's language and the annotated review, since nobody knows who will see the link. Saved from the chart page, it uses the viewer's interface language and selected chart view.
_Avoid_: screenshot, thumbnail, OG image

**Example chart**:
A chart chosen by the site owner to show on the home page. Visitors' charts never appear publicly unless someone shares their chart link.
_Avoid_: featured chart, trending, feed

**Type**:
One of the 16 four-letter MBTI types, such as INFP or ESTJ. Identity suffixes such as -A and -T are not distinguished.
_Avoid_: personality, character, MBTI (as a name for a single type)

**Axis**:
A named dimension with a labeled low end and high end, along which every type receives a position.
_Avoid_: scale, spectrum, dimension

**Ranking question**:
A question about which types are most or least something, such as who cries first at a movie. Jev decides whether a question ranks the types or asks about each type's style, such as each type's texting style.
_Avoid_: one-axis question, simple question

**Fit axis**:
The axis of a ranking question: how strongly Korean MBTI communities would name each type as the answer. Its levels are fixed, so Jev places the types without waiting for the LLM.
_Avoid_: generic axis, default axis, likelihood scale

**Suggested axis**:
An axis the LLM designs for a question about each type's style, or for a two-axis chart, before Jev places anything.
_Avoid_: default axis, generated axis

**Custom axis**:
An axis whose ends the visitor labeled instead of accepting a fit or suggested axis. Jev places types between the visitor's ends right away.
_Avoid_: manual axis, user axis

**One-axis chart**:
A chart in which every type is positioned along a single axis.
_Avoid_: 1D chart, line chart, ranking

**Two-axis chart**:
A chart in which every type is positioned on two perpendicular axes, one horizontal and one vertical.
_Avoid_: 2D chart, scatter plot, quadrant chart

**Placement**:
A type's position on a chart, with one value per axis, as judged by Jev.
_Avoid_: score, rank, rating

**Chart view**:
How a chart is displayed, without changing its stored placements or review. With review shows corrected positions and the red-pen history. Clean chart (최종 배치) shows the same corrected positions and explanations without old spots, marks, margin notes, grading, or before-and-after comparisons; it becomes available once the review finishes. Jev only shows the original placements. Save image follows the selected view.
_Avoid_: chart mode, correction toggle

## Review

**Review**:
The LLM's automatic pass over every completed chart. It gives each type an explanation and may correct placements it disagrees with.
_Avoid_: second opinion, validation, audit

**Wording**:
What the review writes first for a chart with a fit or custom axis: the question in both languages and the axis's name, ends, and level labels. Until it arrives, the chart shows the visitor's original question and plain placeholder labels. It names the chart rather than correcting it, so it also appears in the Jev-only view.
_Avoid_: labels, copy, translation step

**Explanation**:
The review's short account, in both languages, of why a type sits where it does.
_Avoid_: reason, rationale, comment

**Correction**:
A review's decision to move a type away from its placement. In With review, the original placement remains visible next to the corrected position. Clean chart hides that history without undoing the correction.
_Avoid_: override, fix, adjustment

**Summary**:
The review's one-line overall takeaway about a chart, written in both languages. In Korean it is presented as 총평.
_Avoid_: verdict, conclusion, TL;DR

**Grade**:
The number of types, out of 16, whose placements the review kept. It is presented as Jev's score (Jev 점수), and a chart with no corrections earns the "참 잘했어요" stamp.
_Avoid_: accuracy, Score (the Jev question type is a different thing)

## Knowledge

**Type lore**:
The stereotypes, memes, and anecdotes about a type that circulate on Korean social media. It describes community perception, not validated psychology.
_Avoid_: personality facts, official description, research

**Letter lore**:
Type lore about a single MBTI letter rather than a whole type, such as the T-versus-F "너 T야?" meme.
_Avoid_: dimension facts, function theory

**Lore library**:
The curated, bilingual collection of type lore and letter lore, written in this project's own words from Korean social media sources. It is maintained by people and does not change while a visitor is using the site.
_Avoid_: dataset, corpus, scrape, live search

**Lore topic**:
A subject in the lore library, such as texting, dating, or conflict. A chart draws only on the topics Jev judges relevant to its question.
_Avoid_: category, tag, facet

## Models

**Jev**:
TypeSafe AI's System One model. It reads each question first, deciding whether to refuse it, whether it is a ranking question, and which lore topics matter, and then judges every placement. Jev returns structured judgments rather than generated text, so it cannot write axis labels or explanations.
_Avoid_: LLM, chatbot

**LLM**:
The generative language model that designs suggested axes and performs the review, including its wording. Unlike Jev, it writes text.
_Avoid_: AI, assistant, Jev
