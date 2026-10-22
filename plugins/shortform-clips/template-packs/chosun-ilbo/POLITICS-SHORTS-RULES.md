# Politics team: rules inferred from published Shorts

Source for the `prompt` text (Korean, escaped in JSON) of `heukbaek`,
`jeongjwippul` and `panilgi`, plus a rules draft for **Today's 1 Minute**
(the Korean program title is omitted because this repository allows only
English text in documents), which has no template yet.

Collected 2026-10-22 from the Chosun Media channel's Shorts tab with `yt-dlp`
(low quality, metadata, Korean auto-captions; nothing committed). The newest 20
Shorts per program were taken by the `[program]` tag in the title. Screen
headlines were read from one frame per Short (3 s in) for eight Shorts per
program; on every one checked the on-screen headline matched the YouTube title.

| Program | Template | Shorts analysed | Upload dates |
| --- | --- | --- | --- |
| Heukbaek Yeouido | `heukbaek.json` | 19 of 20 (`V6QhN-g5DU8` failed to download) | 2026-10-12 to 10-21 |
| Jeongjwippul | `jeongjwippul.json` | 15 (the channel has only 15) | 2026-08-01 to 08-21 |
| Panilgi | `panilgi.json` | 20 | 2026-05-15 to 06-12 |
| Today's 1 Minute | none | 20 | 2026-09-09 to 10-21 |

The Heukbaek Yeouido playlist named in the request holds only full episodes
(long videos, several private), so its Shorts came from the channel's Shorts
tab.

## Findings

| | Heukbaek | Jeongjwippul | Panilgi | Today's 1 Min |
| --- | --- | --- | --- | --- |
| Length (median, range, seconds) | 53, 34-62 | 58, 29-90 | 63, 50-80 | 62, 52-84 |
| Headline chars, both lines (median, range) | 34, 25-41 | 27, 16-32 | 33, 25-44 | 30, 16-41 |
| Most uploads in one day | 4 | 5 | 5 | 3 |
| Speaker changes in captions (median) | 2 | 10 | 0 | 0 |
| Captions with laughter | 7 of 19 | 12 of 15 | 3 of 20 | 0 of 20 |
| Titles with a double-quoted quote | 17 | 8 | 14 | 7 |
| Titles with a single-quoted key term | 4 | 1 | 8 | 9 |
| Titles with an ellipsis | 18 | 9 | 4 | 9 |
| Titles that are questions | 11 | 5 | 4 | 0 |

- **Heukbaek Yeouido**: one panelist's blunt take on the day's story about the
  president, the ruling party or a named politician; often an anecdote. The
  first sentence names the issue; the last is a conclusion or a punchline.
  Headline: line 1 names the issue (or opens with a quote), line 2 is the
  sharpest quote ending in an ellipsis and `!`, or in `?`. The president is
  abbreviated to a single hanja.
- **Jeongjwippul**: a drinking-table panel of four to six. Satire of
  government policy through irony and analogy. Mostly one topic with fast
  back-and-forth, ending on a laugh. Headline: line 1 target or topic, line 2
  the quote; no `!` was used.
- **Panilgi**: a legal reporter reading rulings, indictments and disciplinary
  filings as a monologue, plus interview and courtroom-anecdote pieces.
  Headline: line 1 gives the angle or source (an exclusive document, a former
  election-commission judge), line 2 a quote, with single quotes around key
  terms.
- **Today's 1 Minute** (rules only, not applied to any template): a narrated
  news explainer over footage, about 60 s, no on-camera speaker and no
  laughter. Each Short covers one news item in the order what happened,
  context, impact. The first sentence states the news fact; the last is an
  attributed summary ("critics point out..."). Headline: line 1 white, line 2
  in a yellow box, usually a quote or a result. Titles use single quotes for key
  terms (9 of 20), a country hanja (US, China, North Korea) and sometimes
  hashtags (2 of 20). Topics mix international news (unrest in France, Hamas,
  US-China), the economy (rents, chips, interest rates) and domestic issues.

## Before and after

These examples apply the old and new prompt text by hand to real clips. They
are **not** model output: the generation environment was not available, so
this is a prompt-only comparison. Headlines are shown in the channel's own
English titles.

| Clip | Old prompt, applied by hand | New prompt, applied by hand (equals the published headline) |
| --- | --- | --- |
| Heukbaek `6ReLHJAttms` | Line 1 a quote ("There is no room for excuse"), line 2 who/what within 16 chars ("Kim Min-seok fire station visit") | Line 1 "Kim Min-seok, 5 a.m. fire station visit"; line 2 a pun quote on his name |
| Panilgi `Bk8NHEnfsO8` | Line 1 a quote ("Acquittal in the first trial needs a prosecutor-general's permission?"), line 2 "Supreme Prosecutors' Office reviews appeal limits" | Line 1 "Fraudsters get four trials, victims get one?" (quote); line 2 "Comment section erupts over 'appeal limits' report" |
| Jeongjwippul `10X1cRMDa98` | Line 1 "Government scraps tax cuts: controversy", line 2 a summary (old text only said "line 1 target, line 2 summary") | Line 1 "Government that gives then takes back"; line 2 "Do you think the public are monkeys?" (quote) |

The right-hand column was written from the same captions after the rules were
set, so it illustrates what the rules ask for; it is not independent
evidence. Run a template on a fresh episode to see real output.

## Limits

- Comparison with the long-form originals was skipped.
- Jeongjwippul has only 15 Shorts, all from 2026-08. Its count guide is marked
  as needing customer confirmation.
- Frame headlines were checked on eight Shorts per program, not all.
- Lengths are measured in characters of the YouTube title; the on-screen line
  split was read from frames, not measured per line.
