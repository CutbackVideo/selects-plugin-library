# Motion fallback effect controls

The actual full pipeline using two genuinely analysed 12-second landscape replacements reached Motion's whole-cue fallback. At 59.94 fps its first hero lasted 719 frames; the desk treatment calculated `holdFrames: 633`. Its fixed editable maximum was 400, so the existing SDK rejected the effect definition before styling could finish.

Only the numeric control bounds now expand to include the calculated defaults. The effect values, graphics code, scene search, fallback planning, reference treatment, Funny Quotes and manual panel remain unchanged. Beat control bounds also include valid generated beats outside the reference range.

Validation:
- The dedicated regression fails against the previous panel for the real 633-frame hold, slow beats and fast beats; four cases pass after the change.
- Existing reference timelines and 18 orientation cases pass unchanged (23 reported test entries total).
- The same actual analysed sources were rerun through production `runTemplate`, real `Source.meta` and scene search, assembly, styling, canonical save, independent SDK readback and native FHD export. Motion saved `daa75312-c4e1-4022-90c2-e3e27c8064a2`, 3851 frames at 59.94005994 fps, 1920×1080; export succeeded. Whip independently saved/exported landscape as well.

This sparse replacement footage invokes the existing whole-cue fallback (about 64–66 seconds), so this validates the reported orientation and style failure. It does not establish the 12–22-second reference's semantic or visual fidelity. The nonvisual host uses actual file/media/analysis calls and a private copy of plugin assets; installed-gallery rendering and interactive playback remain separate checks.

Detailed original/replacement identities, scripts and receipts are retained under `repro-20261023/reported-cases/round3/vlog/` in the local analysis workspace.
