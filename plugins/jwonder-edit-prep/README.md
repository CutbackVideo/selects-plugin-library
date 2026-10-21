# JWONDER Edit preparation

Install this app, open a project and choose a shoot folder. No JWONDER account is required.

1. Analyze missing media. The host asks for credit approval.
2. Organize the selected shoot into `01. camera/<shoot>/<source>` and `02. audio/<shoot>/<source>`, one color per source. The emptied shoot folder is removed.
3. Review footage in the existing Selects classification dialog, then build `<shoot> Main` and `<shoot> Insert` in `Synced Timelines/<shoot>`. Built before, Selects asks before replacing the pair.
4. Sync Main using the existing audio and speech workflow; press the running button again to stop. Review unmatched clips with the Review control. Remove empty ranges separately.
6. Choose any draft in the project (or a synced timeline of the shoot that has no draft yet) to make a draft from its synced timeline into `03. main/<shoot>` or `04. insert/<shoot>`, translate its transcript into Korean (press again to stop), and export a readable transcript with translation and chapters. Making a draft needs its synced timeline; translation and export need the draft. A draft of the same name is asked about before it is replaced.

The steps' rules (folder layout, source naming and colors, timeline tracks and clip order, draft placement) live in this panel and run through the Selects project SDK. Selects itself provides only its screens: the classification dialog and the review of unsynced clips. Each SDK write is its own Selects Undo step, so organizing a shoot is several steps. Analysis, translation costs and exported files are not undone. Closing the panel does not stop host jobs. Reopening reads the current project and translation job; restarting Selects discards in-memory translation job status but keeps saved translations.

Insert grouping remains available through chat. This panel does not provide that button.
