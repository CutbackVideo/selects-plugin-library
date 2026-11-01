# Card News Maker

Turn an article, pasted text or a project video into editable news cards and export the images.
All designs use the same template editor, card editor, Draft builder and export pipeline.

## Make cards

Open **Card News Maker** with a Project open.

1. **Source:** paste an article link or text, or choose an analyzed project video. For an article link,
   **Use my own images** starts off. Turn it on to add JPEG, PNG or WebP photos, individually or as a
   folder in file-name order. Turning it off keeps the chosen files in the form.
2. **Template:** choose a saved or imported team design. Add optional instructions. With your own
   photos, each photo supplies one non-end card; otherwise choose a card count or use the recommendation.
3. **Generate:** a connected ChatGPT or Claude subscription writes a common card plan from source facts
   and your instructions. There is no model selector here and no fallback to Selects credits. If the
   article cannot be read, paste its text in the fallback field. That text belongs to the current URL.
4. **Review:** every design uses the same card previews and editable headline/body fields. Change the
   picture, crop, order or credit. End cards stay last. Editing a built set creates a revised Draft on
   the next build or export; the previous Draft remains in the Project.
5. **Export:** choose PNG or JPEG, then **Export card images**. It builds the Draft when needed and
   writes `card-01`, `card-02`, ... plus `caption.txt` into a new folder. **Build Draft** is also available
   separately. Generated pictures use Selects image-generation credits, as shown before building.

Work is saved as you edit. **Start over** returns to the inputs; **Saved** reopens a card set. Each new
set keeps a template snapshot. **Apply template changes** explicitly takes newer library settings.
A fixed text-box design rejects extra or overflowing text before build/export, so copy is never silently
cut off. The default export location is `~/.selects/plugin-data/card-news-maker/exports/`; older photo
sets retain their output-folder setting and default to `Pictures/Card news`.

## Edit templates

The **Templates** tab uses the same template toolbar, add menu, file transfer dialog and responsive editor navigation as Shortform Clips. Create or import with **+**, export a JSON file to share, and use **Other** to rename, duplicate, delete or reset. New templates stay unsaved until **Save**; switching a dirty template offers Save and switch, Discard and switch, or Cancel.

Every design keeps the same **Look / Brand / AI** fields. Edit fonts,
colors, card layout, logo, writing rules and image policy; duplicate, save, export or delete a template.
For precise team designs, **Look → Use fixed text boxes** exposes each line's position, dimensions and
alignment. Tracking and gradient properties are editable, and **Brand** accepts a PNG or SVG logo up to
96 KB. Template export writes a `card-news-template` JSON file, which **Import template** can reopen.
Team artwork stays on this computer and is not shipped in this package.

Older `kind: "layout"` JSON files are accepted and read into the common template model. Existing
`layout-templates/` and `photo-works/` files are preserved. Opening an older photo set creates a common
job copy using its text, photos, crop, format and template snapshot; its original work and Draft remain
untouched. The new engine builds a new Draft rather than reusing the old graphic parameter schema.

## Saved and installed designs

Only designs you save or import appear in the template lists. A new library starts empty;
open **Templates → +** to create a neutral design or import a team template. The app remembers
valid selections across reopening and Project changes. Built-in designs from older versions
remain available internally for existing saved card sets, without returning to the new-work list.
Existing saved design edits and card-set snapshots are preserved.

## App and template installation link

`cutback-selects://plugin/install?id=card-news-maker&pack=chosun-basic`

This uses the existing Selects catalog installer; publish this app revision and a
host with Panel UI kit 6 before distributing the link. The app receives a pinned
official pack folder, imports its validated `template.json` and opens Templates.
Existing edited designs, saved card sets and Drafts are preserved. Reopening the
link upgrades an untouched Chosun v1 default to v2 under the same template ID,
backs up v1 first, and selects that same item. An edited v1 is kept with a notice. Running work and unsaved template edits finish first.
Download errors offer an explicit retry. Installation never starts AI or export.

## Cover and body layouts in one template

The preview's existing **Cover / Card / Last card** selector chooses the layout you edit.
Fixed text boxes, gradient, font family and logo overrides follow that selection;
headline and body typography retain their existing controls. Older templates with only
common placement fields keep that placement until you edit a specific role.

The Chosun Basic pack version 2 keeps the original two-line centered feed cover and adds
three left-aligned body lines without a logo, matching the supplied card examples.
The first generated card uses the cover and subsequent cards use the body layout.
Chosun offers only **Cover / Card** in the editor; its body uses Regular 400 and the
cover keeps weight 700. Other templates retain their end-card controls.
This does not add the other numbered formats in the PDF specification.

Updating the app or plugin source alone does not deliver a template pack. After this
revision is published, reopen the same `pack=chosun-basic` installation link to update
an untouched v1 default in place; no manual JSON Import or duplicate selection is needed.
The updater compares the entire v1 default design, including its name, against the
original published 72px layout before writing the body, locale and raster-calibrated update. Saved edits are rechecked
after the download and the final write uses the existing host compare-and-replace API.
Finish editing this design in other Selects windows before updating: the host serializes
files within one renderer bridge, not other bridges or external file writers. Backups are kept under `template-backups/` and old `layout-templates/`
source files remain untouched. Existing card sets retain their saved template snapshots.
Manual Import still creates an independent copy and is intended for copying/sharing designs,
not for normal pack upgrades. Ordinary templates and newer pack versions are not migrated.
