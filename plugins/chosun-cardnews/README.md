# Chosun Ilbo TikTok Card News

Turns a news article into an editable 4:5 card news set in Chosun Ilbo
templates: a new Draft in the open Project with one card per picture, where
every text is an editable Motion Graphic.

## Using the panel

Open **Chosun Ilbo TikTok Card News** from the Plugin list with a Project open.

1. **Source.** Paste an article link or the article text, or pick an analyzed
   video in the Project.
2. **Template.** Choose a design and the number of cards, or let the AI
   recommend one. Add extra instructions if you like.
3. **Plan cards.** The Selects AI writes the cards to the template's rules,
   using only facts from the source. For a link, it also finds the article's
   own photos and their credits.
4. **Review.** Edit each card's text, picture and credit, and the post text
   and hashtags. A picture can be an article photo, an AI image, a file from
   your computer, the same picture as an earlier card, or none. Nothing is
   generated until you press **Build Draft**.
5. **Build Draft.** Article photos are added to the Project, and AI images are
   made with Selects image generation using your Selects credits. The panel
   builds a 1080 x 1350 Draft and keeps the set's pictures and Draft together
   in one Project folder.
6. **Export card images.** Saves each card as a 1080 x 1350 PNG, with the
   caption and hashtags in `caption.txt`, and shows the exported cards.

## Templates

Three Chosun Ilbo designs ship as built-in templates: a news report with an
orange label, a photo essay with the THE CHOSUN ILBO wordmark and brand outro,
and Q&A tips with AI images. In the **Templates** tab you can change the
layout, type, brand marks, end card, where pictures come from and the AI's
writing rules. Duplicate a template to make your own.

## Data

Templates, saved work, downloaded photos and exported card images are kept in
`~/.selects/plugin-data/chosun-cardnews/`. Installing a new version keeps them.
