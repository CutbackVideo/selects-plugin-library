# Install

Install the plug-in from the Selects library; the panel appears under Apps.
AI work requires the Selects release containing `sdk.aiProviders()` and
`sdk.askAI({ provider })`. General in-place graphic editing additionally uses
`DraftHandle.setMotionGraphicProgram()`. Hosts without that setter retain the
existing plan-feedback workflow and build a separate candidate without replacing
the current draft or regenerating narration. Deploy the new host API before
advertising arbitrary graphic-code editing. The manifest minimum, **2.0.798**,
is the installation floor: the Staging 2.0.797 host shipped without
`sdk.aiProviders()`. Version numbers are per channel, so the panel still checks
for that API at run time; confirm the actual host release when publishing this
plug-in update.

All LLM stages require that support. If the AI chooser asks for an update,
update Selects first. Connect ChatGPT or Claude in Settings > Connectors and
refresh the connection status in the panel. Sign in and use editing mode if all
three providers are unavailable. ElevenLabs narration uses Selects credits.

Provider routing has been checked with simulated hosts. Live Staging subscription
verification and Windows verification are still pending.
