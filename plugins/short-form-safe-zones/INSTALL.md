# Install Short Form Safe Zones

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/short-form-safe-zones/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There
   is no separate registration step.
2. Open **Short Form Safe Zones** in the Plugin list with a Draft open.
3. Turn on **Show guides**, pick a **Platform**, and adjust the grid layers
   and opacity to taste. Turn the toggle off to remove the guide clip again.

The panel only adds/removes its own labelled guide clip on the top track of
the currently open Draft; it does not modify any other clip.

## Uninstall

Turn off **Show guides** to remove the guide clip, then delete the
`short-form-safe-zones` folder from the panels root.
