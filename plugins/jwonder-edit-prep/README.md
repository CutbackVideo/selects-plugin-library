# JWONDER Edit preparation

Install this app, open a project and choose a shoot folder. No JWONDER account is required.

1. Analyze missing media. The host asks for credit approval.
2. Organize the selected shoot into camera/recorder folders and colors.
3. Review footage in the existing Selects classification dialog and build the timelines. Confirm before replacing an existing pair.
4. Sync Main using the existing audio and speech workflow. Review unmatched clips with the timeline Review control. Remove empty ranges separately.
6. Choose any draft in the project (or a synced timeline of the shoot that has no draft yet) to make a draft from its synced timeline, translate its transcript into Korean, and export a readable transcript with translation and chapters. Making a draft needs its synced timeline; translation and export need the draft.

Organization, timeline replacement and draft creation are separate Selects Undo/Redo steps. Replacement preserves earlier history. Failed writes attempt restoration; if restoration fails, inspect current project state before retrying. Analysis, translation costs and exported files are not undone. Closing the panel does not stop host jobs. Reopening reads the current project and translation job; restarting Selects discards in-memory translation job status but keeps saved translations.

Insert grouping remains available through chat. This panel does not provide that button.
