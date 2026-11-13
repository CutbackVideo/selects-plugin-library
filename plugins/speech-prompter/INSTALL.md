# Install Speech Prompter

Requires macOS 13+, Apple Command Line Tools (xcode-select --install), Python 3, and Selects custom panels with the shell interface.

From the downloaded package run `bash install.sh`. This builds the Swift helper locally and installs the panel. Close the panel before reinstalling. Open **Plugin → Voice-Following Teleprompter** afterward.

Set OPENAI_API_KEY in the Selects shell environment for Speech mode. Start prompts for microphone permission. Fixed pace works without credentials.

Check helper availability without activating the microphone:

```sh
/usr/bin/python3 "$HOME/.selects/plugin-data/speech-prompter/bridge.py" check
```

The binary flag confirms installation; model indicates key presence only. Verify fixed-speed scrolling, then separately test live speech and Pause in Selects.
