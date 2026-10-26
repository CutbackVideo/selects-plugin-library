# RGB color-filter surface

useColorFilter owns the rendering surface shared by Archive, Mini and THE END.
The caller supplies React, AbsoluteFill, Source or children, an id prefix, enabled
state and a synchronous render(input, output) callback. The callback returns SVG
primitives that read the supplied input and name their last result with output.
The caller retains its color curves, masks and numeric defaults. The owner creates a stable unique id per mounted instance, using React useId or a crypto.getRandomValues fallback for older React.
colorInput and colorOutput are reserved names within this filter.

The source always occupies the same inner AbsoluteFill, including when disabled.
Changing strength does not replace the original media element. Replacing Source
or unmounting its real owner still cleans that source normally. No file, SDK,
network, timer, global mutable cache or asynchronous render gate is introduced.

RGB arithmetic is evaluated on an opaque copy, then composited through the
original coverage. Restoring alpha only at the end of the old graph is insufficient:
arithmetic additions can already change premultiplied RGB inside that graph.
This surface is for pointwise RGB grades, not grain, light leaks, blur or overlays
that intentionally paint outside the original coverage.

Canonical delivery is declared in panel-modules.json and checked by
sync_panel_modules.mjs. Template components remain independently installable.

Validation interprets the actual emitted SVG primitives with the
[Filter Effects rules](https://www.w3.org/TR/filter-effects-1/): every 8-bit alpha,
eight colors, four strengths, Archive's warmth bounds and Source/children lifetime.
Actual isolated Chromium evidence separately checks transparent PNGs, normal
opaque colors and strength toggles. Installed playback/export remains separate.
