# Huick Inside Card News

Turns an issue of Hankook Ilbo's **Huick Inside** newsletter into an editable
3:4 card news set in Huick's three-perspectives format: a cover, what
happened, the perspectives at a glance, one card per perspective and a closing
quote. Every card but the quote gets a hand-drawn picture of its own content,
in Huick's lime and charcoal. It is a copy of
[Card News Maker](../card-news-maker) for the Huick alpha test.

Cards are 1080 x 1440 (3:4) for TikTok photo posts, which Instagram also
accepts. Text stays out of the bottom 240 px, where TikTok lays its caption
over a post, and out of the right 130 px, where its buttons sit; the picture
credit is in the top corner.

**Design** picks the look before planning. **Huick** is lime on charcoal with a
picture across the top of each card. **Magazine** follows the Slide-to-ticket
card news template the Huick team pointed to: white pages and black ink with
lime tags and highlights, the cover picture full bleed (drawn 3:4), each body
picture in a ruled frame (drawn 3:2) between a title bar and a ruled text box,
and a pull quote to close. A set keeps the design it was planned with.

## Using the panel

Open **Huick Inside Card News** from the Plugin list with a Project open. A
set takes three steps.

1. **Make cards.** Paste the issue's link from
   `hankookilbo.com/newsletter/huickinside` and press **Plan the cards**
   (about a minute).
   - **Pick the parts by: Code** (the default) splits the issue at its section
     banners. Every issue from VOL.14 to VOL.46 uses the same banner images,
     so the app knows where each part starts although the banners' words are
     only in the pictures. STEP.01 (the news summary), each STEP.02 textbook
     perspective and the closing quote are used; the greeting, the glossary
     and the STEP.03 questions are not. **Load the page and pick parts** shows
     the parts first so you can change the ticks.
   - **Pick the parts by: AI** is for a changed newsletter layout: if the
     banners are not found, the panel says so. The Selects AI then opens the
     link itself and uses only STEP.01, STEP.02 and the closing quote. It is
     slower.
   - **AI instructions** shows what the AI is told about the reader and tone,
     the cover, the body cards, the closing card and the picture style. Edit
     and **Save** them. A picture style written in Korean is put into English
     for the image model on save, and the English is shown under it.
     **Back to the defaults** restores Huick's. They apply from the next plan.
2. **Check the cards.** In **My card news**, pick a card from the thumbnails
   and fix its copy or its picture scene (the image prompt).
3. **Make the cards.** One button draws every picture with Selects image
   generation (Selects credits, about six pictures a set), builds a
   1080 x 1440 Draft whose texts stay editable, and exports one PNG per card
   with the caption and hashtags in `caption.txt`. The finished cards are also
   added to the set's Project folder, beside its pictures and Draft. After
   editing the Draft in Selects, **Export the images again**: the new cards
   replace the old ones in that folder.

A set is named the same way in the work history, as its Project folder and as
its Draft: the issue number, the cover headline and the time it was started,
for example `VOL.36 · Teen social media rules … · 10.21 23:41`.

Saved work, instructions and exports are kept in
`~/.selects/plugin-data/huick-cardnews/`.
