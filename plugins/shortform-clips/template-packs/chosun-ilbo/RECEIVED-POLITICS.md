# Politics originals received 2026-10-22

Pack 1.4.3 uses byte-identical customer artwork. The renderer in Shortform Clips
0.6.2 retains the full transparent canvas and applies explicit background-band
placements and horizontal logo offsets. Comparison images, videos, Premiere
projects and font files remain in the local regression workspace.

| Template | New project evidence | Applied change |
| --- | --- | --- |
| Heukbaek | Text 477: 60/65px, scale 113.43522644043%, tracking -72; point text at (542,274.130859375) | Effective sizes 68.061135864258/73.7328971862795, separate tracking; first line #FFFFFF, second line #FF29B8; ChosunBg for the Han run; baseline-derived title placement |
| Heukbaek | Caption 374 with group 373 translated +15px | First baseline 1344.90234375; 75px Rg and -3.3px tracking retained |
| Heukbaek | Logo Motion 475: 17.871431350708%, position (550,1715) | Original 3049×3049 PNG at 544.899942px wide, including transparent margins |
| Heukbaek | Background Motion 363/360 | Original 1920×1080 JPEG placed separately at 120% / 100% for upper/lower bands, instead of stretching a portrait legacy image |
| Panilgi | Title 2894/group 2893 and caption 2795 are unchanged from the earlier project | Existing calibrated title/caption values retained |
| Panilgi | Logo 2895: 37.5%, parent group 112%, local y=1954, parent y=574 | Original 1920×1080 PNG at 806.4px canvas width, center y=1687.28; solid black background |
| Jeongjwippul | Bumper 1585/1595 etc.: scale 40%, center y=1379.000015 | Original 1920×1080 bumper at 768px canvas width; no raster Short crop |

Jeongjwippul contains headline variants: standard 95/95.1684px with -40 tracking,
manual tighter tracking (-55/-59), and the four-name list at 76.56218px/-70.
The reusable default retains the standard variant; a comparison using the four-name
fixture is not a claim that every episode has the same manually fitted size.

## Remaining verification and inputs

- This Mac has the Hv/Rg and Omni Gothic M faces, but not SDMyeongjo-cBd,
  SDMyeongjo-bMd, ChosunBg, or the optional Panilgi end-card face SDDolTTF-aLt.
  Requested face names are preserved. Current Jeongjwippul and Han glyph previews
  therefore use fallback fonts and are not typographically approved.
- Original episode media and matching completed MP4s were not supplied. Comparison
  stills use previously downloaded official footage, not the same scene as every
  supplied project. Published Shorts are comparison references, never parameter sources.
- Heukbaek's project still points to a differently named JPEG. The supplied
  `black board` JPEG is the requested replacement, not a verified hash match to that
  missing path. Impact Crop's rounded edge/filter rasterization and the complete
  new-project output need a native Premiere render check. Band crops currently use
  the existing 421/1488 boundaries, close to the extracted 420.624/1487.16 edges.
- Jeongjwippul's separate logo has no SubClip. All 20 caption-length guide components
  are bypassed. These missing files do not block the reusable template or bumper.
- Music/effects were archived locally; this artwork update does not embed or auto-play them.

## Headline color correction verified in Premiere

The received Heukbaek project displays a white first line and pink second line in Premiere. Text 477 has a separate fourth style run for the second line. Its fill table omits the default red channel (255), while green=41 and blue=184 are explicit. The audit reader incorrectly treated the omitted channel as an absent color, then fell back to white. The template now preserves #FF29B8; this is project evidence, not a sampled YouTube color. Premiere screenshot evidence is stored in the local comparison report. Missing underlying media does not prevent checking this generated text.
