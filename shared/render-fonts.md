# Render fonts

`render-fonts.js` owns one render document's asynchronous font preparation and
Remotion gate. The standalone caller supplies React, stable imported
`delayRender` / `continueRender` / `cancelRender` functions, CSS-declared
`{family, style, weight, b64}` faces, optional wide text/font shorthand, and a
finite deadline (20 seconds by default). The caller keeps CSS, text limits,
metrics, layout and animation.

The hook returns readiness for the current committed request. Source descriptor,
text, font-set or host configuration changes create a new request. Returning
from prepared A through pending B back to A creates a fresh third request;
matching text alone cannot revive the retired first request.

Every committed scope owns one gate and one timer. All load promises have
rejection observers before host calls start. Success must arrive before the
monotonic deadline; then measured SVG commits before the gate is released.
Cleanup releases only that scope's handle once and ignores late replies. It
does not remove document fonts or other handles and cannot abort browser font
downloads. Missing/malformed readiness, rejection, deadline and gate release
failure cancel the render document and surface its failure.

FontFaceSet results are browser font-matching readiness, not byte attestation.
System-font requests may return an empty list; the
[CSS Font Loading algorithm](https://www.w3.org/TR/css-font-loading-3/#font-face-set-load)
matches downloadable faces without requiring a system face in the returned list.
The descriptor bytes distinguish requests but do not prove the actual CSS family
has those bytes. The caller must declare the intended CSS face.

Native preview/export must also wait for Remotion's authored handles and reject
its cancellation flag. A failed document remains failed; recovery belongs to the
existing session owner, which disposes it and creates a new document.

Managed delivery: `node tools/sync_panel_modules.mjs --check`. Only Archive title
and credit adopt this owner here. The other six surveyed candidate programs are
not migrated by this change. See `tests/archive_render_fonts.test.mjs` and
`docs/template-repair/archive-render-fonts.md` for proof and limits.
