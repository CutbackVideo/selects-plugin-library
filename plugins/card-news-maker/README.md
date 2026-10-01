# Card News Maker

Turns a news article into an editable 4:5 card news set: a new Draft in the
open Project with one card per picture, where every text is an editable Motion
Graphic.

## Using the panel

Open **Card News Maker** from the Plugin list with a Project open.

1. **Source.** Paste an article link or the article text, or pick an analyzed
   video in the Project.
2. **Template.** Choose a template and the number of cards, or let the AI
   recommend one. Add extra instructions if you like.
3. **Plan cards.** The Selects AI writes the cards to the template's rules,
   using only facts from the source. For a link, it also finds the article's
   own photos and their credits.
4. **Review.** Edit each card's text, picture and credit. A picture can be an
   article photo, an AI image, a file from your computer, the same picture as
   an earlier card, or none. Nothing is generated until you press
   **Build Draft**.
5. **Build Draft.** Article photos are added to the Project, and AI images are
   made with Selects image generation using your Selects credits. The panel
   builds a 1080 x 1350 Draft and keeps the set's pictures and Draft together
   in one Project folder.
6. **Export card images.** Saves each card as a 1080 x 1350 PNG, with the
   caption and hashtags in `caption.txt`, in
   `~/.selects/plugin-data/card-news-maker/exports/`. To make a video, export
   the Draft with Handoff → Export.

## Templates

| Template | Look | Pictures | Last card |
| --- | --- | --- | --- |
| News report | Orange label and three-line headline on the cover; slanted news sentences on a black panel below the photo | Article photos first, then AI images | None |
| Photo essay | Two-line cover with one yellow word; a yellow heading and three lines of text over each photo | Article photos | Brand outro, once a brand is set |
| Q&A tips | Outlined label and two-line hook; numbered questions with three-line answers | AI images that share one visual idea | Call to action |

In the **Templates** tab you can change the layout, fonts and colors, the brand
marks (label, wordmark, handles, credits, outro), where pictures come from, the
AI image style and the AI writing rules. Templates can be duplicated, reset or
deleted.
