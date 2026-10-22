# JWONDER Edit preparation

Install this app, open a project and choose a shoot folder. No JWONDER account is required.

1. Analyze missing media. The host asks for credit approval.
2. Organize the selected shoot into `01. camera/<shoot>/<source>` and `02. audio/<shoot>/<source>`, one color per source. The emptied shoot folder is removed.
3. Classify Main and Insert: the panel's own classifier opens in a window of its own (where Selects can open one): each camera video the rule cannot settle, with its class in the latest timelines, else the rule's, playing on the right; 1 and 2 (or the buttons) set a class, Up and Down move. Make timelines builds `<shoot> Main` and `<shoot> Insert` in `Synced Timelines/<shoot>`. Built before, Selects asks before replacing the pair.
4. Sync Main using the existing audio and speech workflow; press the running button again to stop. Clips the sync left unsynced are counted under the step, and Review in the Sync tool opens Selects' own Sync tool on that timeline, where they are reviewed and resolved. Remove empty ranges separately.
6. Choose any draft in the project (or a synced timeline of the shoot that has no draft yet) to make a draft from its synced timeline into `03. main/<shoot>` or `04. insert/<shoot>`, translate its transcript into Korean (press again to stop), and export a readable transcript with translation and chapters. Making a draft needs its synced timeline; translation and export need the draft. A draft of the same name is asked about before it is replaced.

The steps' rules (folder layout, source naming and colors, timeline tracks and clip order, draft placement) and screens live in this panel and run through the Selects project SDK. Selects itself provides one read: the Main / Insert rule over an organized shoot (`project.jwonder.shootReview`), which needs its transcripts and sync text matcher. Each SDK write is its own Selects Undo step, so organizing a shoot is several steps. Analysis, translation costs and exported files are not undone. Closing the panel does not stop host jobs. Reopening reads the current project and translation job; restarting Selects discards in-memory translation job status but keeps saved translations.

Insert grouping remains available through chat. This panel does not provide that button.
