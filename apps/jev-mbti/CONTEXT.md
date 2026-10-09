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
The short, permanent address of a chart. It opens in the viewer's interface language, whichever language the question used.
_Avoid_: URL, permalink, share link

**Share image**:
A picture of a chart for posting elsewhere. It serves as both the link preview and the downloadable image.
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

**Suggested axis**:
An axis proposed automatically from the question. Most charts are expected to use only suggested axes.
_Avoid_: default axis, generated axis

**Custom axis**:
An axis whose ends the visitor labeled instead of accepting a suggested axis.
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

## Review

**Review**:
The LLM's automatic pass over every completed chart. It gives each type an explanation and may correct placements it disagrees with.
_Avoid_: second opinion, validation, audit

**Explanation**:
The review's short account, in both languages, of why a type sits where it does.
_Avoid_: reason, rationale, comment

**Correction**:
A review's decision to move a type away from its placement. The original placement remains visible next to the corrected position.
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
A subject in the lore library, such as texting, dating, or conflict. A chart draws only on the topics relevant to its question.
_Avoid_: category, tag, facet

## Models

**Jev**:
TypeSafe AI's System One model, which judges every placement. Jev returns structured judgments rather than generated text, so it cannot write axis labels or explanations.
_Avoid_: LLM, chatbot

**LLM**:
The generative language model that suggests axes and performs the review. Unlike Jev, it writes text.
_Avoid_: AI, assistant, Jev
