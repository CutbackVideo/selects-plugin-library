# Tetris

A playable Tetris panel for Selects: single player, or head-to-head against a
friend running the same panel in their own copy of Selects. The panel reads and
writes nothing in your projects.

## Title screen

The panel opens on a handheld drawn pixel by pixel on a canvas - grey shell,
green dot-matrix screen, d-pad, A/B buttons and SELECT/START. Nothing runs
until you start a game.

- **Pick a mode** with the d-pad, the up/down keys, or by clicking a row on the
  screen. Each row shows your best score for that mode.
- **Start** with the START pill, the A button, the Start game button, or Space.
- The screen also shows your last result and a blinking PRESS START.

Below the handheld: **Records** (best score per mode, your last games, and a
Clear records button), **Sound** (on/off and volume), and **Play a friend**.
During a game the buttons are Main menu, Pause and Restart game.

| Mode | Starting level | First fall speed | Level up |
| --- | --- | --- | --- |
| Chill | 1 | 1120 ms per row | every 12 lines |
| Normal | 1 | 800 ms | every 10 lines |
| Fast | 5 | 416 ms | every 8 lines |
| Insane | 9 | 149 ms | every 6 lines |

## Playing

| Key | Action |
| --- | --- |
| Left / Right | Move |
| Up | Rotate (picks the mode on the title screen) |
| Down | Soft drop (picks the mode on the title screen) |
| Space | Hard drop (starts a game from the title screen) |
| P | Pause |
| R | Restart |
| Esc | Back to the title screen |

On-screen buttons do the same, so the panel works docked narrow or popped out.
Standard rules: 7-bag piece order, wall-kick rotation, and a ghost preview of
where the piece lands. The playfield is in full colour; only the title screen
uses the four-shade green palette.

## Sound

Effects are synthesised with the Web Audio API - moves, rotations, locks, hard
drops, line clears, a bigger fanfare for four at once, incoming garbage, level
up, and game over. No audio files ship with the plugin, and audio starts only
after a button press, which is what browsers require. Sound and volume are in
the Sound section and are remembered.

## Two-player mode

Open **Play a friend**, press **New code**, and send the 6-character room code
to the other player. Both enter the same code and press **Connect**.

Each player has their own board. Clearing 2, 3 or 4 lines sends 1, 2 or 4
garbage rows into the other player's stack, and your own clears cancel incoming
rows before they land. Each player sees the other's board as a live miniature
with their score and lines. First to top out loses, and the result is saved to
the records list. Garbage that arrives while a player sits on the title screen
is discarded - attacks only land on a game in progress.

### How the connection works

Selects has no player-to-player channel, so the two panels talk through a
public MQTT relay (EMQX by default; HiveMQ and Mosquitto are selectable in the
panel). While connected, the panel runs a small Python helper that holds the
relay connection and exchanges messages through files in a temporary folder.
The helper stops on Disconnect, when the panel closes, or about 20 seconds
after Selects stops talking to it.

Only game state travels: board contents, score, lines and the garbage counter.
Nothing about projects, footage or accounts is sent.

## Limitations

- **The room code is the only privacy.** Rooms are topics on a public relay, so
  anyone who guessed a code could watch or interfere. Use the generated random
  codes.
- The relays are free community brokers with no uptime guarantee. If one is
  unreachable, both players switch the Relay menu to the same alternative and
  reconnect.
- Two-player mode needs `python3` and macOS or Linux on both machines.
- Measured round-trip through the relay was about 140 ms, which suits this
  separate-boards design; it is not frame-synchronised play.
