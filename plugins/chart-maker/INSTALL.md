# Install Chart Maker

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/chart-maker/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. The package has no other runtime files and no `SKILL.md`, so it is not
   listed as a Skill.
3. Open **Chart Maker** in the Plugin list with a Project open.

Saved settings are kept in the app's own storage. **AI design** needs Selects
credits or a model connected in chat; everything else works without AI.

## Uninstall

Delete the `chart-maker` folder from the panels root. Charts already added to
Drafts stay in those Drafts.
