# Install Tetris

1. Copy this package's `panel.tsx` unchanged to
   `SELECTS_USER_PANELS_ROOT/tetris/panel.tsx`, using the environment-provided
   panels root. Create that directory if needed. There is no separate
   registration step.
2. Open **Tetris** in the Plugin list, pick a mode on the handheld screen and
   press **START**. Single player needs nothing else.
3. For two-player mode only: `python3` must be on `PATH`, and the machine needs
   outbound access on TCP port 1883. Pressing **Connect** starts a small Python
   helper that holds the relay connection; it exits on **Disconnect**, when the
   panel closes, or about 20 seconds after Selects stops talking to it.

The panel reads and writes nothing in the user's projects. Scores and
preferences are kept in the app's local storage; two-player mode writes only to
a temporary folder at `/tmp/selects-tetris/<room code>`.

## Uninstall

Delete the `tetris` folder from the panels root.
