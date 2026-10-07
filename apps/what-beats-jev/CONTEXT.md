# What Beats Jev

This context describes a web game in which players build a chain of answers that beat the preceding challenge. The title is provisional.

## Players

**Anonymous play**:
Play without a required player identity or registered account. This is the intended initial experience.
_Avoid_: guest account, registered player

## Play

**Challenge**:
The thing the player's next answer must beat. Every run begins with rock, and an accepted answer becomes the next challenge.
_Avoid_: opponent, question

**Answer**:
Free-form text describing what a player proposes to beat the current challenge, with a maximum of 240 visible Unicode characters. Answers may describe creative, absurd, or metaphorical counters.
_Avoid_: prompt, verdict

**Phrase identity**:
The identity of answer or challenge text ignoring capitalization and surrounding whitespace. It is shared by matchup reuse, matchup discovery, and the no-repeat rule; synonyms and rewordings retain separate identities.
_Avoid_: semantic equivalence, exact spelling

**Beats**:
The relationship Jev judges sufficient for an answer to overcome the current challenge. It is not restricted to literal physical defeat or a predefined set of counters.
_Avoid_: destroys, objectively wins

**Matchup**:
The ordered pairing of the current challenge and a proposed answer. Trying the same answer against a different challenge is a different matchup.
_Avoid_: answer phrase, unordered pair

**Verdict**:
Jev's decision about whether the proposed answer beats the challenge in a particular matchup. A saved verdict can be reused when that matchup is tried again.
_Avoid_: answer, novelty

**Jev confidence**:
Jev's reported certainty in its selected verdict, displayed as a percentage. It is not the probability of winning or a guarantee of correctness and does not determine whether the run continues.
_Avoid_: win probability, accuracy rate

**New matchup**:
The first successful result for a particular ordered matchup across the game. A newly judged loss and replaying a cached win are not new; whether the answer phrase appeared elsewhere is irrelevant.
_Avoid_: new answer phrase, first in this run

**Chain**:
The ordered sequence formed as accepted answers replace the preceding challenge. A phrase already in the chain, including its starting challenge, cannot be reused in the same run.
_Avoid_: conversation, streak

**Chain length**:
The number of accepted answers in a run, starting at zero and excluding the starting challenge. A rejected answer does not increase it.
_Avoid_: number of matchups, starter-inclusive count

**Run**:
One player's attempt to build a chain from its starting challenge until a proposed answer receives a rejecting verdict. Invalid input and technical errors do not end it, and phrase reuse is restricted within the run rather than across the game as a whole.
_Avoid_: account, matchup

**Judge**:
The model with sole authority to decide whether an answer beats the current challenge. This game's judge is Jev.
_Avoid_: LLM, opponent

**Jev**:
TypeSafe AI's System One model, used as this game's judge. Jev makes structured decisions rather than generating text like an LLM.
_Avoid_: human judge, chatbot
