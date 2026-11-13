# Voice-Following Teleprompter

Paste a script and follow it with voice tracking or fixed-speed scrolling. Includes Korean and English UI, text size, line spacing, and mirrored display.

macOS 13+ only. See [INSTALL.md](INSTALL.md) for setup. Open **Plugin → Voice-Following Teleprompter**, paste a script, select Speech or Fixed pace, then Open prompter → Start. Pause stops the microphone. Click a word or use arrow keys to reposition.

Speech mode sends microphone audio to OpenAI Realtime transcription using your OPENAI_API_KEY and may incur API charges. The bridge also accepts literal key assignments in ~/.zshrc or ~/.zprofile. Never put credentials in this package. Fixed pace needs no key or microphone.

Runtime state and transcript excerpts are stored locally under ~/.selects/plugin-data/speech-prompter; normal stop clears the excerpt. Live microphone recognition requires separate end-to-end verification.

## API key settings

In Speech mode, enter your OpenAI API key in the panel and choose **Save key**. It is stored in a local owner-only file under the plugin runtime directory, separately from panel preferences. **Remove saved key** deletes it; environment keys remain available as a fallback. Saving checks local availability only; Start checks the live connection.
