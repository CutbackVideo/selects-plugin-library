# Install

Install the plug-in from the Selects library; the panel appears under Apps.
This update requires the Selects release containing `sdk.aiProviders()`,
`sdk.askAI({ provider })`, and `DraftHandle.setMotionGraphicProgram()` support.
Scene editing checks for the new API before modifying a draft. The manifest minimum, **2.0.797**, is the
current release candidate; maintainers must confirm or update it against the
actual app release before publishing this plug-in update.

All LLM stages require that support. If the AI chooser asks for an update,
update Selects first. Connect ChatGPT or Claude in Settings > Connectors and
refresh the connection status in the panel. Sign in and use editing mode if all
three providers are unavailable. ElevenLabs narration uses Selects credits.

Provider routing has been checked with simulated hosts. Live Staging subscription
verification and Windows verification are still pending.
