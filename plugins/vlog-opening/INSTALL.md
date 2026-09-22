# Install Vlog Opening

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/vlog-opening/panel.tsx`, using the
   environment-provided panels root. Create that directory if needed. There is
   no separate registration step.
2. Open **Vlog Opening** in the Plugin list with a Project open, pick a style
   and press **Build opening**.

The panel reads the open Project's resources, analysis and transcript, and
writes only by creating a new Draft in that Project. It never modifies an
existing Draft or any source file. `ffmpeg` is used, through the app's shell,
to sample colours for the motion style and to make music previews; both degrade
gracefully when it is missing.

A first build scans the footage once per role, which takes a couple of minutes
on a large Project; scans are cached for the session, so changing style or
length afterwards is fast.

## Uninstall

Delete the `vlog-opening` folder from the panels root.
