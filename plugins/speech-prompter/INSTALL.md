# Install Speech Prompter

Requires macOS 13+, Apple Command Line Tools (xcode-select --install), Python 3, and Selects custom panels with the shell interface.

From the downloaded package run `bash install.sh`. This builds the Swift helper locally and installs the panel. Close the panel before reinstalling. Open **Plugin → Voice-Following Teleprompter** afterward.

Set OPENAI_API_KEY in the Selects shell environment for Speech mode. Start prompts for microphone permission. Fixed pace works without credentials.

Check helper availability without activating the microphone:

```sh
/usr/bin/python3 "$HOME/.selects/plugin-data/speech-prompter/bridge.py" check
```

The binary flag confirms installation; model indicates key presence only. Verify fixed-speed scrolling, then separately test live speech and Pause in Selects.

## API key settings

In Speech mode, enter your OpenAI API key in the panel and choose **Save key**. It is stored in a local owner-only file under the plugin runtime directory, separately from panel preferences. **Remove saved key** deletes it; environment keys remain available as a fallback. Saving checks local availability only; Start checks the live connection.
