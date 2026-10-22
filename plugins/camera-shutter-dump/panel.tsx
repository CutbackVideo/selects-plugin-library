// @name Camera Shutter Dump
// @name:de Camera Shutter Dump
// @name:en Camera Shutter Dump
// @name:es Camera Shutter Dump
// @name:fr Camera Shutter Dump
// @name:it Camera Shutter Dump
// @name:ja Camera Shutter Dump
// @name:ko Camera Shutter Dump
// @name:pt Camera Shutter Dump
// @name:tr Camera Shutter Dump
// @name:zh Camera Shutter Dump
// @collection visual-highlights
// @icon image
import React from 'react';

const SLOTS=12;

// --- Reference plan and finishing step -----------------------------------------
// Runs in the Panel itself, so the machine needs no Node.js. A `...Source` constant
// is a function kept as source text: run_script (or an effect) receives exactly the
// code written here. tests/camera_shutter_dump.test.mjs loads everything between the two marker lines.
// @operation-start
// Semin's reference Draft "Camera shutter dump" (25 fps, 250 frames = 10 s, 720x1280),
// read back frame for frame. Each photo appears at `start` and stays until the end,
// stacked above the previous ones on black; its shutter sound starts at `sfx`, 3 frames
// earlier. `size` is the slot shape the crop cuts the photo to (3:4, or 4:3 for 11-12).
// The editor transform is the plugin's cover fit times `zoom`, centred at `position`
// (percent of the canvas height from the centre, as setClipTransform takes it): Semin
// resized and moved most tiles by hand, so these are her values, with `zoom` solved
// against her photos. Slots 11-12 carry no crop (the whole photo shows). Her crop focus
// points were picked for her own photos, so every slot starts centred (0.5) instead.
const REFERENCE_SLOTS=[
 {start:3,sfx:0,size:{width:404,height:539},zoom:1,position:{x:-0.078125,y:-0.0390625},crop:true},
 {start:22,sfx:19,size:{width:427,height:569},zoom:1.0120551405975395,position:{x:12.139075077901843,y:-29.76743053752272},crop:true},
 {start:39,sfx:36,size:{width:407,height:543},zoom:0.9721382941988951,position:{x:-13.315250908854843,y:29.380035400390625},crop:true},
 {start:58,sfx:55,size:{width:472,height:629},zoom:0.7623708267090621,position:{x:-10.50275090885484,y:-18.731689453125},crop:true},
 {start:74,sfx:71,size:{width:516,height:688},zoom:0.8370049055232558,position:{x:12.13907507790184,y:27.5054931640625},crop:true},
 {start:91,sfx:88,size:{width:436,height:582},zoom:0.8245409149484536,position:{x:-14.992801406063023,y:1.075426306342242},crop:true},
 {start:111,sfx:108,size:{width:413,height:551},zoom:0.7838376247731398,position:{x:18.606838352612684,y:-1.860809326171875},crop:true},
 {start:130,sfx:127,size:{width:397,height:529},zoom:0.9071508742911153,position:{x:-17.430475917431192,y:-34.26867271639409},crop:true},
 {start:150,sfx:147,size:{width:392,height:524},zoom:0.9158068940839695,position:{x:7.578125,y:8.75},crop:true},
 {start:165,sfx:162,size:{width:390,height:521},zoom:0.8289722288867563,position:{x:-8.337280614280015,y:-22.59445427802154},crop:true},
 {start:184,sfx:181,size:{width:402,height:302},zoom:1,position:{x:-3.9112912224644543,y:21.015625},crop:false},
 {start:201,sfx:198,size:{width:401,height:300},zoom:1,position:{x:7.079666673562742,y:-13.579559326171871},crop:false}
];
export const SLOT_COUNT=REFERENCE_SLOTS.length;
const SFX_FRAMES=11,DURATION=250,GRAPHICS_START=216;
// Semin's closing graphics over the finished collage: the app's built-in Burst (confetti)
// under its built-in Text title. The components are the exact code her Draft carries.
const BURST_CODE="import {AbsoluteFill, useCurrentFrame, useVideoConfig} from \"remotion\";\n\nconst SAFE_AREA = \"6%\";\nconst FONT_STACK = \"Inter, ui-sans-serif, system-ui, sans-serif\";\n// A chosen family is whatever the machine has installed, so the app's own stack\n// stays behind it: a project moved to a machine without that font substitutes\n// rather than rendering nothing.\nfunction fontStack(family) {\n  if (typeof family !== \"string\") return FONT_STACK;\n  const name = family.trim().replace(/\"/g, \"\");\n  if (name === \"\") return FONT_STACK;\n  return '\"' + name + '\", ' + FONT_STACK;\n}\n// The margin kept clear around an overlay, measured on the frame's longer side\n// top and bottom as well as across. A percentage padding is always a share of\n// the width, so on a vertical frame the top and bottom margins came out barely\n// half what a landscape frame keeps, and a caption sat down among the\n// platform's own buttons. A landscape or square frame keeps exactly the margin\n// it always had.\nfunction safeArea(config) {\n  if (config == null || typeof config.width !== \"number\" || typeof config.height !== \"number\") {\n    return SAFE_AREA;\n  }\n  const share = parseFloat(SAFE_AREA) / 100;\n  return (share * Math.max(config.width, config.height)) + \"px \" + (share * config.width) + \"px\";\n}\n// A scale grows the graphic from its middle, so one anchored to the bottom\n// grew down past the margin kept clear under it, and off the frame. Shifting\n// it by half of what it grows keeps the anchored edge where it was, while\n// anything a graphic adds after — a tilt, a pop — still turns about its middle.\nfunction anchoredGrowth(v, h, zoom) {\n  const half = Math.round((zoom - 1) * 50000) / 1000;\n  const x = h === \"left\" ? half : h === \"right\" ? -half : 0;\n  const y = v === \"top\" ? half : v === \"bottom\" ? -half : 0;\n  return x === 0 && y === 0 ? \"\" : \" translate(\" + x + \"%, \" + y + \"%)\";\n}\nfunction placement(d, config) {\n  const parts = (typeof d.anchor === \"string\" ? d.anchor : \"center\").split(\"-\");\n  const v = parts[0];\n  const h = parts.length > 1 ? parts[1] : \"center\";\n  const dx = typeof d.offsetX === \"number\" ? d.offsetX : 0;\n  const dy = typeof d.offsetY === \"number\" ? d.offsetY : 0;\n  const zoom =\n    typeof d.overlayScale === \"number\" && d.overlayScale > 0\n      ? d.overlayScale / 100\n      : 1;\n  // AbsoluteFill is a column, so justifyContent runs down the frame and\n  // alignItems runs across it. Reading those as horizontal and vertical is what\n  // put a \"bottom left\" overlay in the top right. The direction is stated here\n  // rather than inherited so the pairing cannot drift again.\n  return {\n    container: {\n      flexDirection: \"column\",\n      justifyContent: v === \"top\" ? \"flex-start\" : v === \"bottom\" ? \"flex-end\" : \"center\",\n      alignItems: h === \"left\" ? \"flex-start\" : h === \"right\" ? \"flex-end\" : \"center\",\n      padding: safeArea(config),\n    },\n    inner: { transform: \"translate(\" + dx + \"%, \" + dy + \"%)\" + anchoredGrowth(v, h, zoom) + \" scale(\" + zoom + \")\" },\n  };\n}\nfunction easeWith(kind, p) {\n  const t = Math.max(0, Math.min(1, p));\n  if (kind === \"linear\") return t;\n  if (kind === \"in\") return t * t;\n  if (kind === \"inOut\") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n  return 1 - Math.pow(1 - t, 2);\n}\n// An overlay is a clip: where it sits on the timeline says when it plays, how\n// long it is says how long it lasts, and the Sequence it renders inside is what\n// stops it existing outside that. So there is nothing to decide here — the\n// clip's own length is handed in. A stored in-point and duration used to say\n// the same thing a second time and could contradict the timeline: an overlay\n// whose duration was shorter than its clip left the clip sitting there showing\n// nothing, with nothing on the timeline to explain the gap.\n//\n// One caveat: an overlay trimmed at the head starts partway through, which is\n// the intent, but its clip length no longer covers the frames it is shown for,\n// so the tail of its exit is clipped. The alternative was plumbing the trim\n// through every renderer for a case the clip effects do not handle either.\nfunction timing(frame, fps, d, clipFrames) {\n  const dur = Math.max(1, Math.round(typeof clipFrames === \"number\" && clipFrames > 0 ? clipFrames : Math.round(fps * 3)));\n  const local = Math.max(0, frame);\n  // The default fade, for overlays with no in and out of their own to run.\n  const fade = Math.max(1, Math.min(Math.round(fps * 0.35), Math.floor(dur / 2)));\n  let raw = 1;\n  if (local < fade) raw = local / fade;\n  else if (local > dur - fade) raw = Math.max(0, (dur - local) / fade);\n  const kind = typeof d.ease === \"string\" ? d.ease : \"out\";\n  return {\n    local: local,\n    duration: dur,\n    // The Sequence already refuses to render outside the clip, so being here\n    // at all is what visible means.\n    visible: true,\n    progress: easeWith(kind, raw),\n    through: Math.max(0, Math.min(1, local / dur)),\n  };\n}\n// Sizes are authored against a 1080 reference and scaled to whatever the\n// composition actually is, so one preset reads the same on a 1080p cut and a\n// 4K master, and stays inside the frame when it turns vertical. The scale is\n// read at render time, so editing the draft's frame size restyles every\n// overlay with no stored values to migrate. Placement is already\n// frame-relative (percentage safe area and offsets); this does the same for\n// type and shapes.\nconst REFERENCE_HEIGHT = 1080;\nfunction frameScale(config) {\n  const c = config || {};\n  const w = typeof c.width === \"number\" && c.width > 0 ? c.width : REFERENCE_HEIGHT;\n  const h = typeof c.height === \"number\" && c.height > 0 ? c.height : REFERENCE_HEIGHT;\n  // The smaller side, not the height: scaling a landscape look by height alone\n  // would blow type up past the edges the moment the frame turns vertical.\n  return Math.min(w, h) / REFERENCE_HEIGHT;\n}\nfunction theme(d, config) {\n  const k = frameScale(config);\n  return {\n    color: typeof d.color === \"string\" ? d.color : \"#ffffff\",\n    accent: typeof d.accent === \"string\" ? d.accent : \"#008ff1\",\n    fontSize: (typeof d.fontSize === \"number\" ? d.fontSize : 64) * k,\n    fontWeight: typeof d.fontWeight === \"string\" ? d.fontWeight : \"700\",\n    fontFamily: fontStack(d.fontFamily),\n    scale: k,\n    px: function (v) { return v * k; },\n  };\n}\n\nexport default function Burst({data, rangeDurationInFrames}) {\n  const d = data ?? {};\n  const cfg = useVideoConfig();\n  const fps = cfg.fps;\n  const t = theme(d, cfg);\n  const tm = timing(useCurrentFrame(), fps, d, rangeDurationInFrames);\n  if (!tm.visible) return null;\n  const kind = typeof d.kind === \"string\" ? d.kind : \"confetti\";\n  const count = typeof d.count === \"number\" ? d.count : 40;\n  const spread = typeof d.spread === \"number\" ? d.spread : 60;\n  const pieces = [];\n  for (let i = 0; i < count; i += 1) {\n    const angle = (i / count) * Math.PI * 2;\n    const speed = 0.4 + ((i * 37) % 100) / 140;\n    const dist = tm.through * spread * speed;\n    const x = 50 + Math.cos(angle) * dist;\n    const y = 50 + Math.sin(angle) * dist + (kind === \"confetti\" ? tm.through * tm.through * 30 : 0);\n    const size = t.px(kind === \"impact\" ? 3 + (i % 4) : 6 + (i % 5));\n    pieces.push(\n      <div key={i} style={{\n        position: \"absolute\", left: x + \"%\", top: y + \"%\",\n        width: kind === \"confetti\" ? size : size * 0.5,\n        height: size * (kind === \"confetti\" ? 1.8 : 1),\n        background: i % 3 === 0 ? t.accent : t.color,\n        borderRadius: kind === \"sparkle\" ? 999 : t.px(2),\n        opacity: 1 - tm.through,\n        transform: \"rotate(\" + (i * 47 + tm.through * 360) + \"deg)\",\n      }} />\n    );\n  }\n  return <AbsoluteFill>{pieces}</AbsoluteFill>;\n}\n";
const TEXT_CODE="import {AbsoluteFill, useCurrentFrame, useVideoConfig} from \"remotion\";\n\nconst SAFE_AREA = \"6%\";\nconst FONT_STACK = \"Inter, ui-sans-serif, system-ui, sans-serif\";\n// A chosen family is whatever the machine has installed, so the app's own stack\n// stays behind it: a project moved to a machine without that font substitutes\n// rather than rendering nothing.\nfunction fontStack(family) {\n  if (typeof family !== \"string\") return FONT_STACK;\n  const name = family.trim().replace(/\"/g, \"\");\n  if (name === \"\") return FONT_STACK;\n  return '\"' + name + '\", ' + FONT_STACK;\n}\n// The margin kept clear around an overlay, measured on the frame's longer side\n// top and bottom as well as across. A percentage padding is always a share of\n// the width, so on a vertical frame the top and bottom margins came out barely\n// half what a landscape frame keeps, and a caption sat down among the\n// platform's own buttons. A landscape or square frame keeps exactly the margin\n// it always had.\nfunction safeArea(config) {\n  if (config == null || typeof config.width !== \"number\" || typeof config.height !== \"number\") {\n    return SAFE_AREA;\n  }\n  const share = parseFloat(SAFE_AREA) / 100;\n  return (share * Math.max(config.width, config.height)) + \"px \" + (share * config.width) + \"px\";\n}\n// A scale grows the graphic from its middle, so one anchored to the bottom\n// grew down past the margin kept clear under it, and off the frame. Shifting\n// it by half of what it grows keeps the anchored edge where it was, while\n// anything a graphic adds after — a tilt, a pop — still turns about its middle.\nfunction anchoredGrowth(v, h, zoom) {\n  const half = Math.round((zoom - 1) * 50000) / 1000;\n  const x = h === \"left\" ? half : h === \"right\" ? -half : 0;\n  const y = v === \"top\" ? half : v === \"bottom\" ? -half : 0;\n  return x === 0 && y === 0 ? \"\" : \" translate(\" + x + \"%, \" + y + \"%)\";\n}\nfunction placement(d, config) {\n  const parts = (typeof d.anchor === \"string\" ? d.anchor : \"center\").split(\"-\");\n  const v = parts[0];\n  const h = parts.length > 1 ? parts[1] : \"center\";\n  const dx = typeof d.offsetX === \"number\" ? d.offsetX : 0;\n  const dy = typeof d.offsetY === \"number\" ? d.offsetY : 0;\n  const zoom =\n    typeof d.overlayScale === \"number\" && d.overlayScale > 0\n      ? d.overlayScale / 100\n      : 1;\n  // AbsoluteFill is a column, so justifyContent runs down the frame and\n  // alignItems runs across it. Reading those as horizontal and vertical is what\n  // put a \"bottom left\" overlay in the top right. The direction is stated here\n  // rather than inherited so the pairing cannot drift again.\n  return {\n    container: {\n      flexDirection: \"column\",\n      justifyContent: v === \"top\" ? \"flex-start\" : v === \"bottom\" ? \"flex-end\" : \"center\",\n      alignItems: h === \"left\" ? \"flex-start\" : h === \"right\" ? \"flex-end\" : \"center\",\n      padding: safeArea(config),\n    },\n    inner: { transform: \"translate(\" + dx + \"%, \" + dy + \"%)\" + anchoredGrowth(v, h, zoom) + \" scale(\" + zoom + \")\" },\n  };\n}\nfunction easeWith(kind, p) {\n  const t = Math.max(0, Math.min(1, p));\n  if (kind === \"linear\") return t;\n  if (kind === \"in\") return t * t;\n  if (kind === \"inOut\") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n  return 1 - Math.pow(1 - t, 2);\n}\n// An overlay is a clip: where it sits on the timeline says when it plays, how\n// long it is says how long it lasts, and the Sequence it renders inside is what\n// stops it existing outside that. So there is nothing to decide here — the\n// clip's own length is handed in. A stored in-point and duration used to say\n// the same thing a second time and could contradict the timeline: an overlay\n// whose duration was shorter than its clip left the clip sitting there showing\n// nothing, with nothing on the timeline to explain the gap.\n//\n// One caveat: an overlay trimmed at the head starts partway through, which is\n// the intent, but its clip length no longer covers the frames it is shown for,\n// so the tail of its exit is clipped. The alternative was plumbing the trim\n// through every renderer for a case the clip effects do not handle either.\nfunction timing(frame, fps, d, clipFrames) {\n  const dur = Math.max(1, Math.round(typeof clipFrames === \"number\" && clipFrames > 0 ? clipFrames : Math.round(fps * 3)));\n  const local = Math.max(0, frame);\n  // The default fade, for overlays with no in and out of their own to run.\n  const fade = Math.max(1, Math.min(Math.round(fps * 0.35), Math.floor(dur / 2)));\n  let raw = 1;\n  if (local < fade) raw = local / fade;\n  else if (local > dur - fade) raw = Math.max(0, (dur - local) / fade);\n  const kind = typeof d.ease === \"string\" ? d.ease : \"out\";\n  return {\n    local: local,\n    duration: dur,\n    // The Sequence already refuses to render outside the clip, so being here\n    // at all is what visible means.\n    visible: true,\n    progress: easeWith(kind, raw),\n    through: Math.max(0, Math.min(1, local / dur)),\n  };\n}\n// Sizes are authored against a 1080 reference and scaled to whatever the\n// composition actually is, so one preset reads the same on a 1080p cut and a\n// 4K master, and stays inside the frame when it turns vertical. The scale is\n// read at render time, so editing the draft's frame size restyles every\n// overlay with no stored values to migrate. Placement is already\n// frame-relative (percentage safe area and offsets); this does the same for\n// type and shapes.\nconst REFERENCE_HEIGHT = 1080;\nfunction frameScale(config) {\n  const c = config || {};\n  const w = typeof c.width === \"number\" && c.width > 0 ? c.width : REFERENCE_HEIGHT;\n  const h = typeof c.height === \"number\" && c.height > 0 ? c.height : REFERENCE_HEIGHT;\n  // The smaller side, not the height: scaling a landscape look by height alone\n  // would blow type up past the edges the moment the frame turns vertical.\n  return Math.min(w, h) / REFERENCE_HEIGHT;\n}\nfunction theme(d, config) {\n  const k = frameScale(config);\n  return {\n    color: typeof d.color === \"string\" ? d.color : \"#ffffff\",\n    accent: typeof d.accent === \"string\" ? d.accent : \"#008ff1\",\n    fontSize: (typeof d.fontSize === \"number\" ? d.fontSize : 64) * k,\n    fontWeight: typeof d.fontWeight === \"string\" ? d.fontWeight : \"700\",\n    fontFamily: fontStack(d.fontFamily),\n    scale: k,\n    px: function (v) { return v * k; },\n  };\n}\n\n// Named for what it draws, so two pieces of type dressed alike share one\n// filter rather than fighting over an id. The region is the frame around the\n// type several times over — a glow is wide, and a region measured from the\n// type's own box would clip it square around a short word.\nfunction typeShadowFilter(layers, cfg, withSource) {\n  const text = JSON.stringify([layers, withSource !== false]);\n  let hash = 5381;\n  for (let i = 0; i < text.length; i += 1) {\n    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;\n  }\n  const id = \"cbtype\" + (hash >>> 0).toString(36);\n  const c = cfg || {};\n  const w = typeof c.width === \"number\" ? c.width : 1920;\n  const h = typeof c.height === \"number\" ? c.height : 1080;\n  // One shadow per layer: the painted type's outline, moved, softened and\n  // filled with the layer's colour. The deviation is half the radius.\n  const shadows = layers.flatMap(function (layer, i) {\n    return [\n      <feOffset key={\"o\" + i} in=\"SourceAlpha\" dx={layer.x} dy={layer.y} result={\"o\" + i} />,\n      <feGaussianBlur key={\"b\" + i} in={\"o\" + i} stdDeviation={layer.blur / 2} result={\"b\" + i} />,\n      <feFlood key={\"f\" + i} floodColor={layer.color} result={\"f\" + i} />,\n      <feComposite key={\"s\" + i} in={\"f\" + i} in2={\"b\" + i} operator=\"in\" result={\"s\" + i} />,\n    ];\n  });\n  const node = <svg key={id} aria-hidden=\"true\" width=\"0\" height=\"0\"\n    style={{ position: \"absolute\", width: 0, height: 0, pointerEvents: \"none\" }}>\n    <defs>\n      <filter id={id} filterUnits=\"userSpaceOnUse\" x={-w} y={-h} width={w * 3} height={h * 3}\n        colorInterpolationFilters=\"sRGB\">\n        {shadows}\n        <feMerge>\n          {layers.map(function (_, i) {\n            return <feMergeNode key={i} in={\"s\" + (layers.length - 1 - i)} />;\n          })}\n          {withSource === false ? null : <feMergeNode in=\"SourceGraphic\" />}\n        </feMerge>\n      </filter>\n    </defs>\n  </svg>;\n  return { id: id, node: node };\n}\n\nexport default function DefaultText({data, rangeDurationInFrames}) {\n  const d = data ?? {};\n  const cfg = useVideoConfig();\n  const t = theme(d, cfg);\n  const p = placement(d, cfg);\n  const tm = timing(useCurrentFrame(), cfg.fps, d, rangeDurationInFrames);\n  if (!tm.visible) return null;\n  const body = String(d.body == null ? \"Text\" : d.body);\n  const align = typeof d.textAlign === \"string\" ? d.textAlign : \"center\";\n  const strokeWidth = typeof d.strokeWidth === \"number\" ? Math.max(0, d.strokeWidth) : 0;\n  const glow = typeof d.glowStrength === \"number\" ? Math.max(0, d.glowStrength) : 0;\n  const pad = typeof d.backgroundPadding === \"number\" ? Math.max(0, d.backgroundPadding) : 0;\n  const radius = typeof d.backgroundRadius === \"number\" ? Math.max(0, d.backgroundRadius) : 0;\n  const glowPx = t.px(glow * 0.5);\n\n  // Arriving and leaving are asked separately, because they are: a title that\n  // rises in and simply cuts away is an ordinary thing to want. Each end runs\n  // over its own length rather than over the overlay's, so one held for ten\n  // seconds still arrives in half of one — and neither may take more than half\n  // the clip, or the two would overlap and the overlay would never be still.\n  const kind = typeof d.ease === \"string\" ? d.ease : \"out\";\n  const half = Math.max(1, Math.floor(tm.duration / 2));\n  const frames = (seconds) =>\n    Math.max(1, Math.min(Math.round((typeof seconds === \"number\" ? seconds : 0.4) * cfg.fps), half));\n  const inT = Math.max(0, Math.min(1, tm.local / frames(d.enterDuration)));\n  const outT = Math.max(0, Math.min(1, (tm.duration - tm.local) / frames(d.exitDuration)));\n  const travel = t.px(60);\n\n  // `amount` is how present the overlay is: 0 absent, 1 fully arrived. The same\n  // function reads both ends, which is what keeps Rise in and Rise out mirror\n  // images rather than two hand-written cases that drift apart.\n  function motion(style, amount, leaving) {\n    const e = easeWith(kind, amount);\n    const away = 1 - e;\n    // Arriving from below; leaving upward.\n    const dir = leaving ? -1 : 1;\n    return {\n      opacity: style === \"instant\" ? 1 : e,\n      shift: style === \"rise\" ? away * travel * dir : style === \"drop\" ? -away * travel * dir : 0,\n      zoom: style === \"pop\" ? 0.82 + 0.18 * e : 1,\n      reveal: style === \"typewriter\" ? e : 1,\n    };\n  }\n\n  const arriving = motion(typeof d.enterStyle === \"string\" ? d.enterStyle : \"dissolve\", inT, false);\n  const leaving = motion(typeof d.exitStyle === \"string\" ? d.exitStyle : \"dissolve\", outT, true);\n  const opacity = Math.min(arriving.opacity, leaving.opacity);\n  const shift = arriving.shift + leaving.shift;\n  const zoom = arriving.zoom * leaving.zoom;\n  const reveal = Math.min(arriving.reveal, leaving.reveal);\n  // Two shadows rather than one: a tight core and a wide falloff read as light\n  // coming off the letters, where a single blur reads as a flat halo behind\n  // them.\n  const glowColor = typeof d.glowColor === \"string\" ? d.glowColor : \"#ffffff\";\n  const glowShadow = glow === 0\n    ? []\n    : [\n        { x: 0, y: 0, blur: glowPx, color: glowColor },\n        { x: 0, y: 0, blur: glowPx * 2.5, color: glowColor },\n      ];\n  // A cast shadow, which is a different thing from a glow: offset and soft,\n  // rather than centred on the glyphs. Both can be on at once.\n  const shadowBlur = typeof d.shadowBlur === \"number\" ? Math.max(0, d.shadowBlur) : 0;\n  const shadowX = typeof d.shadowX === \"number\" ? d.shadowX : 0;\n  const shadowY = typeof d.shadowY === \"number\" ? d.shadowY : 0;\n  const castShadow = shadowBlur === 0 && shadowX === 0 && shadowY === 0\n    ? []\n    : [{\n        x: t.px(shadowX),\n        y: t.px(shadowY),\n        blur: t.px(shadowBlur),\n        color: typeof d.shadowColor === \"string\" ? d.shadowColor : \"#000000b3\",\n      }];\n  // The cast shadow over the glow: listed first, so it sits on top.\n  const layers = castShadow.concat(glowShadow);\n  const shadow = layers.length === 0 ? null : typeShadowFilter(layers, cfg);\n  return <AbsoluteFill style={{ ...p.container, opacity: opacity }}>\n    {shadow == null ? null : shadow.node}\n    <div style={{ ...p.inner, transform: p.inner.transform + \" translateY(\" + shift + \"px) scale(\" + zoom + \")\" }}>\n      <div style={{\n        background: typeof d.backgroundColor === \"string\" ? d.backgroundColor : \"transparent\",\n        padding: t.px(pad) + \"px \" + t.px(pad * 1.4) + \"px\",\n        borderRadius: t.px(radius),\n        // The frame's own width, not the viewport's: a Remotion composition is\n        // not the window it happens to be previewed in.\n        maxWidth: Math.round((typeof cfg.width === \"number\" ? cfg.width : 1920) * 0.88),\n      }}>\n        <div style={{\n          fontFamily: t.fontFamily,\n          fontWeight: t.fontWeight,\n          fontStyle: d.italic === true ? \"italic\" : \"normal\",\n          textDecoration: d.underline === true ? \"underline\" : \"none\",\n          fontSize: t.fontSize,\n          color: t.color,\n          textAlign: align,\n          lineHeight: 1.2,\n          // What makes the box multiline: the newlines the user typed are the\n          // line breaks, and long lines still wrap on their own.\n          whiteSpace: \"pre-wrap\",\n          filter: shadow == null ? \"none\" : \"url(#\" + shadow.id + \")\",\n          WebkitTextStrokeWidth: t.px(strokeWidth),\n          WebkitTextStrokeColor: typeof d.strokeColor === \"string\" ? d.strokeColor : \"#000000\",\n          // Puts the outline behind the fill instead of straddling the glyph\n          // edge, which would eat into the letterform as the stroke thickens.\n          paintOrder: \"stroke fill\",\n        }}>{reveal >= 1 ? body : body.slice(0, Math.max(0, Math.ceil(body.length * reveal)))}</div>\n      </div>\n    </div>\n  </AbsoluteFill>;\n}\n";
const REFERENCE_GRAPHICS=[
 {label:'Burst',presetId:'sticker-burst',tsxCode:BURST_CODE,transform:{position:{x:0,y:0},scale:{x:1.5,y:1.5}},
  parameters:{anchor:'center',overlayScale:100,kind:'confetti',count:40,spread:60,fontFamily:'',fontWeight:'700',fontSize:64,color:'#ffffff',accent:'#f472b6'}},
 {label:'Text',presetId:'text-default',titleKey:'body',tsxCode:TEXT_CODE,transform:{position:{x:0,y:-1.4016723632812518},scale:{x:1,y:1}},
  parameters:{anchor:'center',overlayScale:100,fontFamily:'Chauncy Pro',fontWeight:'700',fontSize:120,color:'#F5988A',italic:false,underline:false,textAlign:'center',enterStyle:'pop',enterDuration:0.1,exitStyle:'instant',exitDuration:0.4,ease:'out',strokeColor:'#FFFFFF',strokeWidth:15,backgroundColor:'#00000000',backgroundPadding:24,backgroundRadius:8,shadowColor:'#000000B3',shadowX:0,shadowY:0,shadowBlur:15,glowColor:'#ffffff',glowStrength:0}}
];

// Reference frames are 25 fps; a Draft at another rate gets the same times in its own frames.
export function scenePlan(fps=25){
 if(!Number.isFinite(fps)||fps<10||fps>120)throw Error('Unsupported Draft frame rate');
 const at=f=>Math.round(f*fps/25),durationFrames=at(DURATION),sfxFrames=Math.floor(SFX_FRAMES*fps/25+1e-6);
 return {fps,canvas:{width:720,height:1280},durationFrames,
  occurrences:REFERENCE_SLOTS.map((s,i)=>({slot:i+1,startFrame:at(s.start),endFrame:durationFrames,size:s.size,zoom:s.zoom,position:s.position,crop:s.crop})),
  sounds:REFERENCE_SLOTS.map((s,i)=>({slot:i+1,key:'shutter.'+(i%6+1),startFrame:at(s.sfx),endFrame:at(s.sfx)+sfxFrames})),
  graphics:REFERENCE_GRAPHICS.map(g=>({label:g.label,presetId:g.presetId,titleKey:g.titleKey??null,startFrame:at(GRAPHICS_START),endFrame:durationFrames,parameters:g.parameters,transform:g.transform}))};
}

// Crops the photo to its slot rectangle (cover) around an editable focus point.
const EFFECT_CODE=`export default function ShutterDumpCrop({Source,data}) {
 const g=data.g;
 const x=Math.max(g.mw-g.w,Math.min(0,g.mw/2-data.focusX*g.w));
 const y=Math.max(g.mh-g.h,Math.min(0,g.mh/2-data.focusY*g.h));
 return <div style={{position:'absolute',inset:0}}><div style={{position:'absolute',left:g.left,top:g.top,width:g.mw,height:g.mh,overflow:'hidden'}}><div style={{position:'absolute',left:x,top:y,width:g.w,height:g.h}}><Source /></div></div></div>;
}`;

// The closing title's text: the Project name (as Vlog Opening seeds its title), editable later
// in the Inspector; the reference Draft's own text was about Semin's trip.
export function defaultTitle(name){
 const text=typeof name==='string'?name.replace(/[\u0000-\u001f]+/gu,' ').trim().slice(0,48).replace(/[\ud800-\udbff]$/u,'').trim():'';
 return text||'Memories';
}

export function normalizeFinish(raw){
 return normalizeFinishForPlan(raw,scenePlan(raw?.fps??25),defaultTitle(raw?.title));
}
export function normalizeFinishForPlan(raw,plan,title,unsaved=false){
 const SLOT_COUNT=12;
 const keys=['mode','projectId','draftId','fps','photos','placements','framing','sounds','title'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=unsaved&&raw.draftId===null?null:clean(raw.draftId,'Draft ID',120);
 if(!Array.isArray(raw.photos)||raw.photos.length!==SLOT_COUNT)throw Error('Choose exactly '+SLOT_COUNT+' photos');
 const photos=raw.photos.map(photo=>{
  if(!photo||typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(k=>!['resourceId','width','height'].includes(k)))throw Error('Invalid Image Resource');
  if(!Number.isSafeInteger(photo.width)||photo.width<1||!Number.isSafeInteger(photo.height)||photo.height<1)throw Error('Invalid Image dimensions');
  return {resourceId:clean(photo.resourceId,'Image Resource ID'),width:photo.width,height:photo.height};
 });
 const framing=[];
 const inFraming=raw.framing??[];
 if(!Array.isArray(inFraming)||inFraming.length>SLOT_COUNT)throw Error('Invalid photo framing');
 for(let i=0;i<SLOT_COUNT;i++){const p=inFraming[i]??{x:.5,y:.5},x=p.x??.5,y=p.y??.5;if(!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('Photo framing must be between 0 and 1');framing.push({x,y});}
 if(!Array.isArray(raw.placements)||raw.placements.length!==SLOT_COUNT)throw Error('Expected '+SLOT_COUNT+' Image clips');
 raw.placements.forEach((row,i)=>{const o=plan.occurrences[i];if(!row||typeof row!=='object'||row.slot!==o.slot||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error('Image placement differs from the reference plan');});
 if(new Set(raw.placements.map(p=>p.clipId)).size!==SLOT_COUNT)throw Error('Image clips must be independent');
 const sounds={};
 for(const s of plan.sounds){const id=raw.sounds?.[s.key];sounds[s.key]=clean(id,'Shutter sound Resource ID');}
 return {projectId,draftId,fps:plan.fps,title,photos,placements:raw.placements.map(p=>({slot:p.slot,clipId:p.clipId,trackId:p.trackId,startFrame:p.startFrame,endFrame:p.endFrame})),framing,sounds};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,EFFECT_CODE,GRAPHIC_CODES,workingDraft=null,inspectGraphics=null,inspectTransforms=null,inspectAudio=null,programs=null){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=workingDraft||selects.draft(input.draftId);
  if(!workingDraft&&!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  for(const [key,id] of Object.entries(input.sounds))if(types.get(id)!=='Audio')throw Error('Shutter sound is not an Audio resource: '+key);
  const rows=await d.clips({trackScope:'all'});
  const transforms=[],programTargets=[];
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],photo=input.photos[i];
   const clip=rows.find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip||clip.startFrame!==o.startFrame||clip.endFrame!==o.endFrame||clip.resourceId!==photo.resourceId||types.get(clip.resourceId)!=='Image')throw Error('Image clip readback differs from the plan (photo '+o.slot+')');
  }
  for(const [i,o] of plan.occurrences.entries()){
   const placed=input.placements[i],photo=input.photos[i],r=o.size,w=photo.width,h=photo.height;
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId&&c.trackId===placed.trackId);
   if(!clip)throw Error('Image clip changed during authoring');
   // q: source pixels per canvas pixel after cover-cropping into the slot shape; c: the
   // editor's default fit of the whole photo into the canvas; zoom and position: the reference tile.
   const q=Math.min(w/r.width,h/r.height),c=Math.min(plan.canvas.width/w,plan.canvas.height/h);
   const g={w,h,mw:r.width*q,mh:r.height*q,left:(w-r.width*q)/2,top:(h-r.height*q)/2};
      stage='transform photo '+o.slot;
   const transform={enabled:true,scale:{x:o.zoom/(q*c),y:o.zoom/(q*c)},position:o.position,anchor:{x:0,y:0},rotation:0};
   await d.setClipTransform({clip,...transform});
   transforms.push({clipId:clip.clipId,trackId:clip.trackId,transform});
   const target={clipId:clip.clipId,trackId:clip.trackId,effects:[],graphic:null};programTargets.push(target);
   if(!o.crop)continue;
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[i];
   stage='crop photo '+o.slot;
   const effect={name:'Photo '+o.slot+' crop',tsxCode:EFFECT_CODE,parameters:{g,focusX:focus.x,focusY:focus.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]};
   await d.addVideoEffect({clip:current,label:effect.name,tsxCode:effect.tsxCode,parameters:effect.parameters,editableParameters:effect.editableParameters});
   target.effects.push(effect);
  }
  const sounds=[],soundTargets=[];
  for(const s of plan.sounds){
   stage='shutter sound '+s.slot;
   const before=workingDraft?new Set((await d.clips({trackScope:'all'})).map(c=>c.clipId)):null;
   const r=await d.overlayResource({resource:project.resource(input.sounds[s.key]),over:await d.rangeAtFrames(s.startFrame,s.endFrame)});
   sounds.push({slot:s.slot,atFrame:r.atFrame});
   if(workingDraft){
    const added=(await d.clips({trackScope:'all'})).filter(c=>!before.has(c.clipId));
    if(added.length!==1||added[0].trackKind!=='audio')throw Error('Shutter sound placement could not be confirmed.');
    soundTargets.push({clipId:added[0].clipId,trackId:added[0].trackId,trackKind:'audio',resourceId:input.sounds[s.key],startFrame:s.startFrame,endFrame:s.endFrame,audioSourceIndexes:null,source:{startSeconds:0,endSeconds:(s.endFrame-s.startFrame)/plan.fps}});
   }
  }
  const graphics=[];
  for(const g of plan.graphics){
   stage='graphic '+g.label;
   // The preset's Inspector controls when this build lists them; an empty font with a
   // font control would take the user's latest font, so that control is left out.
   let defs=[];try{defs=(await selects.effectPresets?.get(g.presetId))?.editableParameters||[];}catch{defs=[];}
   defs=defs.filter(def=>!(def.key==='fontFamily'&&g.parameters.fontFamily===''));
   const parameters=g.titleKey?{...g.parameters,[g.titleKey]:input.title}:g.parameters;
   const graphic={tsxCode:GRAPHIC_CODES[g.label],parameters,editableParameters:defs};
   const placed=await d.addMotionGraphic({label:g.label,...graphic,within:await d.rangeAtFrames(g.startFrame,g.endFrame)});
   if(placed?.startFrame!==g.startFrame||placed?.endFrame!==g.endFrame)throw Error(g.label+' landed off its frames');
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId);
   if(!clip)throw Error(g.label+' clip is missing');
   await d.setClipTransform({clip,...g.transform});
   transforms.push({clipId:clip.clipId,trackId:clip.trackId,transform:g.transform});
   graphics.push({clipId:clip.clipId,trackId:clip.trackId,startFrame:g.startFrame,endFrame:g.endFrame,parameters});
   programTargets.push({clipId:clip.clipId,trackId:clip.trackId,effects:[],graphic});
  }
  stage='readback';
  const after=await d.clips({trackScope:'all'});
  const audio=after.filter(c=>Object.values(input.sounds).includes(c.resourceId));
  if(audio.length!==plan.sounds.length)throw Error('Expected '+plan.sounds.length+' shutter sound clips, found '+audio.length);
  for(const s of plan.sounds)if(!audio.some(c=>c.startFrame===s.startFrame))throw Error('Shutter sound '+s.slot+' is not at frame '+s.startFrame);
  let verifiedTransforms,verifiedAudio,verifiedPrograms;
  if(workingDraft){await inspectGraphics(d,graphics);verifiedTransforms=await inspectTransforms(d,transforms);verifiedAudio=await inspectAudio(d,soundTargets,project);verifiedPrograms=await programs.inspect(d,programTargets);programs.confirm({graphics,transforms:verifiedTransforms,audio:verifiedAudio,programs:verifiedPrograms});}
  commitStarted=true;const saved=await d.commitAll('Finish Camera Shutter Dump Draft');
  const draftId=saved?.createdDraftId||input.draftId;
  if(!draftId||(!saved?.commitId&&!saved?.createdDraftId))throw Error('Draft save response did not include its identity');
  return {status:'saved',projectId:input.projectId,draftId,clips:input.placements,sounds,graphics,...verifiedTransforms?{transforms:verifiedTransforms,audio:verifiedAudio,programs:verifiedPrograms}:{}};
 }catch(error){return {status:commitStarted?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:input?.draftId};}
}`;

export function buildFinishScript(raw){
 const input=normalizeFinish(raw);
 return `const input=${JSON.stringify(input)};const plan=${JSON.stringify(scenePlan(input.fps))};return await (${authorFinishSource})(selects,input,plan,${JSON.stringify(EFFECT_CODE)},${JSON.stringify({Burst:BURST_CODE,Text:TEXT_CODE})});`;
}

// @operation-end

const INVENTORY=`const p=selects.project(PROJECT_ID);const resources=await p.resources();const types=new Map(resources.map(r=>[r.resourceId,r.type]));const nodes=[];const walk=tree=>{for(const n of tree||[])n.type==='dir'?walk(n.children):nodes.push(n)};const view=await p.sourceFiles();if('fileTree' in view)walk(view.fileTree);else if('folders' in view)for(const folder of view.folders){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree)}return nodes.filter(n=>n.path&&types.get(n.resourceId)===filter.type&&(!filter.paths||filter.paths.some(path=>samePath(n.path,path)))).map(n=>({resourceId:n.resourceId,type:types.get(n.resourceId),name:n.name,path:n.path}));`;
async function inventory(sdk,projectId,summary,filter){
 const scope=`const filter=JSON.parse(${JSON.stringify(JSON.stringify(filter))});const samePath=${samePath.toString()};`;
 const r=await readMediaPages(sdk, {script:scope+INVENTORY.replace('PROJECT_ID',JSON.stringify(projectId)),summary,allowCommit:false});
 if(r.isError||!Array.isArray(r.result))throw Error(r.output||'Could not read the Project files.');
 return r.result;
}
// native-sdk:start
// Read verified Project resources and place editable images through the Draft working copy.
// native-image-input:start
// Original source facts and private unsaved identity checks. Canonical input feature.
export async function nativeImageSources(selects, projectId, photos, { matchById=false }={}) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const sources=photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&(!matchById||node.resourceId===photo.resourceId)&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1||matches[0].resourceId!==photo.resourceId)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
 const fail=(code,photo,message)=>{throw Object.assign(new Error(message+': '+photo.name),{code,resourceId:photo.resourceId});};
 if(typeof selects.files?.stat!=='function'||typeof selects.files?.readRange!=='function')throw Error('This Selects version does not support original photo file checks.');
 const checked=new Set();
 for(const photo of sources){
  if(checked.has(photo.path))continue;
  let before;
  try{before=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file');}
  if(before===null)fail('image-source-missing',photo,'The original photo file is missing');
  if(!before||!Number.isSafeInteger(before.size)||before.size<0||typeof before.isDirectory!=='boolean')fail('image-source-unknown',photo,'Could not confirm the original photo file');
  if(before.isDirectory||before.size===0)fail('image-source-unreadable',photo,'The original photo file is not readable');
  let first;
  try{first=await selects.files.readRange({path:photo.path,offset:0,length:1});}catch{fail('image-source-unreadable',photo,'Could not read the original photo file');}
  if(!first||first.bytesRead!==1||typeof first.base64!=='string'||!/^[A-Za-z0-9+/]{2}==$/.test(first.base64))fail('image-source-unknown',photo,'Could not confirm reading the original photo file');
  let after;
  try{after=await selects.files.stat(photo.path);}catch{fail('image-source-unknown',photo,'Could not confirm the original photo file after reading');}
  if(!after||after.isDirectory||['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))fail('image-source-changed',photo,'The original photo file changed while reading');
  checked.add(photo.path);
 }
 return sources;
}
// Alias discovery does not carry a path. Resolve it by exact SDK identity, then
// keep the established native Image path/dimensions/file checks unchanged.
export async function nativeImageSourcesById(selects,projectId,photos) {
 const project=selects.project(projectId),nodes=[];
 const visit=items=>{for(const item of items||[]){if(!item)continue;item.type==='dir'?visit(item.children):nodes.push(item);}};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 const selected=photos.map(photo=>{
  const matches=nodes.filter(node=>node.resourceId===photo.resourceId&&typeof node.path==='string'&&node.path);
  if(matches.length!==1)throw Error('The selected Image path is missing or ambiguous in the Project: '+photo.name);
  return {...photo,path:matches[0].path};
 });
 return nativeImageSources(selects,projectId,selected,{matchById:true});
}
// A source step is dispatched once, independently of persistence permission.
export async function nativeImageRun(sdk,script,summary,allowCommit=false,fallbackMessage='Image placement could not be confirmed. Inspect the Draft before retrying.',timeoutSeconds=120) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds});
 if(response.isError||response.result==null)throw Error(response.output||fallbackMessage);
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null,byId=false,timeoutSeconds=120) {
 if(typeof byId!=='boolean')throw Error('The Image source matching mode is invalid.');
 if(byId&&(!Array.isArray(photos)||photos.some(photo=>!photo||typeof photo.resourceId!=='string'||!photo.resourceId||typeof photo.name!=='string')))throw Error('The selected Image identities are invalid.');
 const reader=byId?nativeImageSourcesById:nativeImageSources;
 const support=byId?nativeImageSources.toString()+'\n':'';
 const result=await nativeImageRun(sdk,support+`try{return {sources:await (${reader.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)})};}catch(error){const issue=Object(error);return {sourceError:{code:typeof issue.code==='string'?issue.code:'image-source-invalid',message:String(issue.message||error),resourceId:issue.resourceId??null}};}`,'Verify original Project Images',false,undefined,timeoutSeconds);
 if(result.sourceError){
  const error=Object.assign(new Error(result.sourceError.message),result.sourceError);
  if(['image-source-missing','image-source-unreadable','image-source-unknown','image-source-changed'].includes(error.code))error.publicMessage=error.message+'. Check the original file in the Project, then try again.';
  throw error;
 }
 if(!Array.isArray(result.sources))throw Error('Original Image verification returned an incomplete result.');
 if(byId&&(result.sources.length!==photos.length||result.sources.some((source,i)=>source?.resourceId!==photos[i].resourceId||source.name!==photos[i].name||typeof source.path!=='string'||!source.path||!Number.isSafeInteger(source.width)||source.width<1||!Number.isSafeInteger(source.height)||source.height<1)))throw Error('Original Image verification did not confirm the selected identities and dimensions.');
 return {sdk,projectId,sources:result.sources};
}
// Standalone inventories already hold SDK aliases. Resolve their current native
// facts by exact identity without guessing a source path or using a Draft canvas.
export async function prepareNativeImagesById(sdk,projectId,photos,options={}) {
 const {isCurrent=()=>true,timeoutMs=120000}=options??{};
 if(!Array.isArray(photos)||typeof isCurrent!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw Error('The selected Image request or scope is invalid.');
 const deadline=Date.now()+timeoutMs,issue=(code,message)=>Object.assign(Error(message),{code,publicMessage:message});
 const check=()=>{
  let live=false;try{live=isCurrent();}catch{}
  if(!live)throw issue('image-source-stopped','The template run ended before original Images were confirmed.');
  if(Date.now()>=deadline)throw issue('image-source-timeout','Original Image verification timed out.');
 };
 check();const batches=[];let batch=[];
 // A large candidate set must not become one clipped SDK request/result. Bound
 // both the row count and serialized input before starting any read.
 for(const photo of photos){
  if(!photo||typeof photo.resourceId!=='string'||!photo.resourceId||typeof photo.name!=='string')throw Error('The selected Image identities are invalid.');
  const row={resourceId:photo.resourceId,name:photo.name};
  if(new TextEncoder().encode(JSON.stringify([row])).length>16384)throw Error('The selected Image input exceeds its 16 KiB selection budget.');
  if(batch.length>=16||new TextEncoder().encode(JSON.stringify([...batch,row])).length>16384){batches.push(batch);batch=[];}
  batch.push(row);
 }
 if(batch.length)batches.push(batch);
 const sources=[];
 for(const selected of batches){
  check();const prepared=await prepareNativeImages(sdk,projectId,selected,null,true,Math.max(1,Math.ceil((deadline-Date.now())/1000)));
  check();sources.push(...prepared.sources);
 }
 check();return {sdk,projectId,sources};
}

// File contents are observations, not a filesystem lock. Keep the existing
// Image availability contract unchanged; templates opt into complete identity.
export function requireSourceFileSupport(files) {
 if(typeof files?.fingerprint!=='function'){
  const message='Update Selects to verify complete source file contents before creating this template.';
  throw Object.assign(new Error(message),{code:'source-file-unsupported',publicMessage:message});
 }
}
export async function observeSourceFiles(files,paths,expected=null) {
 const issue=(code,message,cause=null)=>Object.assign(new Error(message),{code,publicMessage:message,cause});
 if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path||path.includes('\0')))throw issue('source-file-input','The selected source paths are invalid.');
 const selected=[...new Set(paths)];
 const valid=row=>row&&typeof row.path==='string'&&Number.isSafeInteger(row.size)&&row.size>0&&typeof row.sha256==='string'&&/^[0-9a-f]{64}$/.test(row.sha256);
 if(expected!==null&&(!Array.isArray(expected)||expected.length!==selected.length||new Set(expected.map(row=>row?.path)).size!==expected.length||expected.some(row=>!valid(row)||!selected.includes(row.path))))throw issue('source-file-input','The expected source observations do not match the selection.');
 if(!selected.length)return [];
 requireSourceFileSupport(files);
 const observed=[];
 for(const path of selected){
  let fingerprint;
  try{fingerprint=await files.fingerprint(path);}catch(cause){throw issue('source-file-unknown','The selected source file could not be confirmed. Check the Project file and try again.',cause);}
  if(fingerprint===null)throw issue('source-file-missing','The selected source file is missing. Check the Project file and try again.');
  const row={...fingerprint,path};
  if(!valid(row))throw issue('source-file-unknown','The selected source file has no complete, nonempty content identity.');
  const before=expected?.find(row=>row.path===path);
  if(before&&(before.size!==row.size||before.sha256!==row.sha256))throw issue('source-file-changed','The selected source file changed. Reload the Project inputs before trying again.');
  observed.push({path,size:row.size,sha256:row.sha256});
 }
 return observed;
}

// Persistent handed IDs -> SDK aliases, observed only on private unsaved Drafts.
// Placement failures are not evidence that a source file is absent.
export async function resolveTemplateMedia(selects,projectId,files,scratchName='Template source check',options={}) {
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['includeTiming','dimensions'].includes(key))||['includeTiming','dimensions'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean'))throw Error('The source observation options are invalid.');
 if(!Array.isArray(files)||!files.length||files.length>50||files.some(file=>!file||typeof file.rid!=='string'||!file.rid||!['video','image'].includes(file.kind))||new Set(files.map(file=>file.rid)).size!==files.length)throw Error('The selected template source request is invalid.');
 const project=selects.project(projectId),resolved=[],failed=[];let shared=null;
 const text=error=>String(Object(error).message||error||'Source preparation could not be confirmed.').slice(0,300);
 const unknown=message=>Object.assign(Error(message),{code:'source-resolution-unknown'});
 for(const file of files){
  let phase='create',insertionError;
  try{
   const photo=file.kind==='image',draft=photo||Object(options).includeTiming||!shared?await project.createDraft({name:scratchName}):shared;
   if(!photo)shared=draft;
   phase='readback';const before=await draft.clips({trackScope:'main'});
   if(!Array.isArray(before)||before.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(before.map(row=>row.clipId)).size!==before.length)throw unknown('The private source check could not be observed before placement.');
   const ids=new Set(before.map(row=>row.clipId));
   const observe=async()=>{
    const rows=await draft.clips({trackScope:'main'});
    if(!Array.isArray(rows)||rows.some(row=>!Number.isSafeInteger(row?.clipId))||new Set(rows.map(row=>row.clipId)).size!==rows.length)throw unknown('The private source check returned invalid clips.');
    const added=rows.filter(row=>!ids.has(row.clipId));
    if(added.length>1||added.length===1&&(typeof added[0].resourceId!=='string'||!added[0].resourceId))throw unknown('The placed source alias could not be uniquely confirmed.');
    return added[0]??null;
   };
   phase='insert';
   try{await draft.insertResource({resourceId:file.rid,sourceRange:{startSeconds:0,endSeconds:0.5}});}catch(error){insertionError=error;}
   phase='readback';let clip=await observe();
   // Only the SDK's pre-mutation range validation authorizes the old short-file
   // fallback. An empty observation after an arbitrary transport error does not.
   if(!clip&&insertionError&&/^invalid_source_range(?::|$)/.test(text(insertionError))){
    phase='insert';insertionError=null;
    try{await draft.insertResource({resourceId:file.rid});}catch(error){insertionError=error;}
    phase='readback';clip=await observe();
   }
   if(!clip){if(insertionError){phase='insert';throw insertionError;}throw unknown('Source placement returned no confirmed clip.');}
   let size=null;
   if(photo&&Object(options).dimensions!==false){phase='dimensions';const sources=await nativeImageSourcesById(selects,projectId,[{resourceId:clip.resourceId,name:file.rid}]);size={width:sources[0].width,height:sources[0].height};}
   let timing=null;
   if(Object(options).includeTiming){phase='timing';const meta=await draft.meta();if(!Number.isFinite(meta.fps)||meta.fps<=0)throw unknown('The source frame grid could not be confirmed.');timing={insertionFps:meta.fps};}
   resolved.push({rid:file.rid,alias:clip.resourceId,size,...timing?{timing}:{}});
  }catch(error){
   const code=typeof Object(error).code==='string'?Object(error).code.slice(0,80):phase==='readback'?'source-resolution-unknown':'source-resolution-failed';
   failed.push({rid:file.rid,phase,code,error:text(error),...insertionError&&insertionError!==error?{insertionError:text(insertionError)}:{}});
  }
 }
 return {resolved,failed};
}

// A clipped or contradictory response cannot silently drop handed sources.
export function validateTemplateMediaResult(result,files) {
 const invalid=()=>{throw Object.assign(Error('The selected source resolution could not be confirmed. Check the Project inputs and try again.'),{code:'source-resolution-unknown'});};
 if(!result||!Array.isArray(result.resolved)||!Array.isArray(result.failed))invalid();
 const wanted=new Set(files.map(file=>file.rid)),rows=[...result.resolved,...result.failed];
 if(rows.length!==wanted.size||new Set(rows.map(row=>row?.rid)).size!==wanted.size||rows.some(row=>!wanted.has(row?.rid)))invalid();
 if(result.resolved.some(row=>typeof row.alias!=='string'||!row.alias||row.size!==null&&(!Number.isSafeInteger(row.size?.width)||row.size.width<1||!Number.isSafeInteger(row.size?.height)||row.size.height<1)))invalid();
 if(result.failed.some(row=>typeof row.phase!=='string'||typeof row.code!=='string'||typeof row.error!=='string'||row.error.length>300))invalid();
 return result;
}
// native-image-input:end
// native-image-authoring:start
// Bind one authoring mutation to its requested occurrence. Existing rows may
// not move or change identity; SDK array order is never a placement identity.
function bindMediaPlacement(before,rows,wanted) {
 const fail=()=>{throw Error('The media placement differs from its requested interval or source.');};
 const valid=list=>Array.isArray(list)&&list.length<=1024&&list.every(row=>row&&Number.isSafeInteger(row.clipId)&&row.clipId>=0&&typeof row.trackId==='string'&&row.trackId)&&new Set(list.map(row=>row.clipId)).size===list.length;
 if(!valid(before)||!valid(rows)||!wanted||typeof wanted.resourceId!=='string'||!wanted.resourceId)fail();
 const keys=['trackId','trackKind','resourceId','startFrame','endFrame'],ids=new Set(before.map(row=>row.clipId)),added=rows.filter(row=>!ids.has(row.clipId));
 if(rows.length!==before.length+1||added.length!==1||before.some(old=>{const current=rows.find(row=>row.clipId===old.clipId);return !current||keys.some(key=>current[key]!==old[key]);}))fail();
 const row=added[0];if(!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)fail();
 for(const key of ['resourceId','trackKind','startFrame','endFrame'])if(wanted[key]!==undefined&&row[key]!==wanted[key])fail();
 return row;
}
// Prepare editable Image occurrences in one working copy. The caller owns its
// trusted Project/Draft handle and the sole final commit.
async function placeWorkingCopyImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement){
 const project=selects.project(projectId),meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)throw Error('The Draft frame grid differs from the plan.');
 const fresh=await sourceFacts(selects,projectId,sources);
 if(fresh.length!==sources.length||fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];if(!source)throw Error('An Image occurrence has no source.');
  const before=await draft.clips({trackScope:'all'});
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=bindPlacement(before,await draft.clips({trackScope:'all'}),{resourceId:source.resourceId,trackKind:'video',startFrame:item.startFrame,endFrame:item.endFrame});
  placements.push({...item,clipId:added.clipId,trackId:added.trackId,resourceId:source.resourceId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height}))};
}
async function inspectImageGraphics(draft,expected){
 if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&same(a[key],b[key]));
 };
 const graphics=await draft.motionGraphics();
 if(!Array.isArray(graphics)||graphics.length!==expected.length)throw Error('Graphic count could not be confirmed.');
 for(const wanted of expected){
  const actual=graphics.find(g=>g.clip.clipId===wanted.clipId&&g.clip.trackId===wanted.trackId)?.clip;
  if(!actual||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Graphic placement could not be confirmed.');
  const program=await draft.motionGraphicProgram(actual);
  if(!program||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Object.entries(wanted.parameters).every(([key,value])=>Object.prototype.hasOwnProperty.call(program.parameters,key)&&same(program.parameters[key],value)))throw Error('Graphic parameters could not be confirmed.');
 }
}
async function inspectImageTransforms(draft,expected,includeMain=false){
 // Both consumers author fixed intrinsic transforms; motion belongs to their
 // separate effects. Never adopt an observed transform as the expected value.
 if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
 const rows=(await draft.clips({trackScope:'all'})).filter(clip=>clip.trackKind==='video'||includeMain&&clip.trackKind==='main'&&clip.resourceId!=null);
 if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Visual transform count could not be confirmed.');
 const same=(a,b)=>{
  // Converting domain coordinates to the SDK may introduce floating-point noise.
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const receipts=[];
 for(const wanted of expected){
  const clip=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);
  if(!clip)throw Error('Visual transform target could not be confirmed.');
  const patch=wanted.transform,transform={enabled:true,rotation:0,flipHorizontal:false,flipVertical:false,positionKeys:[],scaleKeys:[],rotationKeys:[],...patch,position:{x:0,y:0,...patch.position},scale:{x:1,y:1,...patch.scale},anchor:{x:0,y:0,...patch.anchor}};
  const actual=await draft.clipTransform(clip);
  if(!actual||!Object.entries(transform).every(([key,value])=>same(actual[key],value)))throw Error('Visual transform could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,transform});
 }
 return receipts;
}
async function inspectImageAudio(draft,expected,project,overlayOnly=false){
 const rows=(await draft.clips({trackScope:'all'})).filter(row=>row.trackKind==='audio'||!overlayOnly&&row.trackKind==='main'&&row.resourceId);
 if(!Array.isArray(expected)||rows.length!==expected.length||new Set(expected.map(row=>row.clipId)).size!==expected.length)throw Error('Audio clip count could not be confirmed.');
 if(!expected.length)return [];
 if(!('clipAudio' in draft))throw Error('Update Selects to verify Audio settings.');
 if(!('clipSourceWindow' in draft)||typeof draft.clipSourceWindow!=='function')throw Error('Update Selects to verify Audio source timing.');
 const types=new Map((await project.resources()).map(row=>[row.resourceId,row.type])),receipts=[];
 const same=(a,b)=>{
  if(typeof a==='number'||typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b));
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 for(const wanted of expected){
  const row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
  if(!row||row.trackKind!==wanted.trackKind||row.resourceId!==wanted.resourceId||row.startFrame!==wanted.startFrame||row.endFrame!==wanted.endFrame||types.get(row.resourceId)!=='Audio'||!same(row.audioSourceIndexes,wanted.audioSourceIndexes))throw Error('Audio placement or routing could not be confirmed.');
  const settings={volumeDb:0,volumeKeys:[],fadeInSeconds:0,fadeOutSeconds:0,...wanted.settings},actual=await draft.clipAudio(row);
  if(!actual||actual.clipId!==row.clipId||!Object.entries(settings).every(([key,value])=>same(actual[key],value)))throw Error('Audio volume or fades could not be confirmed.');
  if(!wanted.source||!Number.isFinite(wanted.source.startSeconds)||wanted.source.startSeconds<0||!Number.isFinite(wanted.source.endSeconds)||wanted.source.endSeconds<=wanted.source.startSeconds)throw Error('Audio source evidence is unavailable.');
  const source={startSeconds:wanted.source.startSeconds,endSeconds:wanted.source.endSeconds,playbackSpeed:{numerator:1,denominator:1},preserveAudioPitch:true,...wanted.source};
  // Time uses floating-point arithmetic noise only, not the relative tolerance
  // used for level/fades. A small changed source instant must remain detectable.
  const timeSame=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));
  let observed;try{observed=await draft.clipSourceWindow(row);}catch(cause){throw Object.assign(Error('Audio source timing could not be confirmed.'),{cause});}
  if(!observed||observed.clipId!==row.clipId||!timeSame(observed.startSeconds,source.startSeconds)||!timeSame(observed.endSeconds,source.endSeconds)||row.playbackSpeed?.numerator!==source.playbackSpeed.numerator||row.playbackSpeed?.denominator!==source.playbackSpeed.denominator||row.preserveAudioPitch!==source.preserveAudioPitch)throw Error('Audio source timing or playback policy could not be confirmed.');
  receipts.push({clipId:wanted.clipId,trackId:wanted.trackId,trackKind:wanted.trackKind,resourceId:wanted.resourceId,startFrame:wanted.startFrame,endFrame:wanted.endFrame,audioSourceIndexes:wanted.audioSourceIndexes,settings,source});
 }
 return receipts;
}
function imageProgramsFeature(selects,config=null,format=null){
 const issue=message=>Object.assign(Error(message),{code:'IMAGE_PROGRAM_INVALID',publicMessage:message});
 const guarded=fn=>async(...args)=>{try{return await fn(...args);}catch(cause){if(cause?.code==='IMAGE_PROGRAM_INVALID')throw cause;throw Object.assign(issue('Image program state could not be confirmed.'),{cause});}};
 const same=(a,b)=>{
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(b);return Object.keys(a).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(a,key)&&same(a[key],b[key]));
 };
 const normalized=program=>({tsxCode:program.tsxCode,editableParameters:program.editableParameters,parameters:{...Object.fromEntries(program.editableParameters.map(d=>[d.key,d.defaultValue])),...program.parameters}});
 const matches=(actual,wanted)=>actual&&actual.tsxCode===wanted.tsxCode&&same(actual.editableParameters,wanted.editableParameters)&&same(actual.parameters,wanted.parameters);
 // Reconcile a caller-owned program intent on Main or overlay visuals. Names
 // only locate candidates; code, values, controls, intervals and order prove a
 // match. Preflight the whole intent before the caller's optional mutation.
 const reconcile=guarded(async(draft,input,beforeApply=null)=>{
  if(!['clips','motionGraphics','motionGraphicProgram','videoEffects','videoEffectProgram','addMotionGraphic','addVideoEffect','rangeAtFrames'].every(key=>typeof draft[key]==='function'))throw issue('Update Selects to verify authored programs.');
  const text=JSON.stringify(input,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['function','bigint','symbol'].includes(typeof value))throw issue('Program intent contains an unsupported value.');return value;});
  if(!text||text.length>8*1024*1024)throw issue('Program intent exceeds its input limit.');
  const intent=JSON.parse(text),names=value=>Array.isArray(value)&&value.length<=32&&new Set(value).size===value.length&&value.every(name=>typeof name==='string'&&name.length>0&&name.length<=256);
  if(!intent||!names(intent.graphicNames)||!names(intent.effectNames)||!Array.isArray(intent.graphics)||intent.graphics.length>256||!Array.isArray(intent.clips)||intent.clips.length>256||new Set(intent.graphics.map(g=>g.name)).size!==intent.graphics.length||new Set(intent.clips.map(c=>c.clipId)).size!==intent.clips.length||beforeApply!==null&&typeof beforeApply!=='function')throw issue('Program intent is incomplete.');
  const prepare=program=>{
   if(!program||typeof program.tsxCode!=='string'||!program.tsxCode||!program.parameters||typeof program.parameters!=='object'||Array.isArray(program.parameters)||!Array.isArray(program.editableParameters)||program.editableParameters.length>256||new Set(program.editableParameters.map(d=>d?.key)).size!==program.editableParameters.length)throw issue('Program source or controls are incomplete.');
   return normalized(program);
  };
  const graphicPlans=intent.graphics.map(g=>{
   if(!g||!intent.graphicNames.includes(g.name)||!Number.isSafeInteger(g.startFrame)||g.startFrame<0||!Number.isSafeInteger(g.endFrame)||g.endFrame<=g.startFrame)throw issue('Graphic intent has an invalid interval.');
   return {...g,program:prepare(g)};
  });
  const clipPlans=intent.clips.map(c=>{
   if(!c||!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||!Array.isArray(c.effects)||c.effects.length>32||new Set(c.effects.map(e=>e.name)).size!==c.effects.length)throw issue('Effect intent has an invalid target.');
   return {...c,effects:c.effects.map(e=>{if(!e||!intent.effectNames.includes(e.name))throw issue('Effect intent has an invalid name.');return {name:e.name,program:prepare(e)};})};
  });
  const rowFor=async wanted=>{
   const rows=await draft.clips({trackScope:'all'}),row=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);
   if(!row||!['main','video'].includes(row.trackKind)||!row.resourceId)throw issue('Effect intent target could not be confirmed.');return row;
  };
  const graphicPresent=async wanted=>{
   const candidates=(await draft.motionGraphics()).filter(g=>g.name===wanted.name);
   if(candidates.length>1)throw issue('Graphic intent matches several placements.');
   if(!candidates.length)return false;
   const clip=candidates[0].clip;
   if(clip.trackKind!=='video'||clip.startFrame!==wanted.startFrame||clip.endFrame!==wanted.endFrame||!matches(await draft.motionGraphicProgram(clip),wanted.program))throw issue('Graphic program, controls or interval differ from the intended result.');
   return true;
  };
  const effectState=async(wanted,complete)=>{
   const all=await draft.videoEffects(await rowFor(wanted));
   if(!Array.isArray(all)||all.some((e,index)=>e.effectIndex!==index||e.clipId!==wanted.clipId||e.trackId!==wanted.trackId))throw issue('Effect stack target could not be confirmed.');
   const managed=all.filter(e=>intent.effectNames.includes(e.name));
   if(managed.length>wanted.effects.length||complete&&managed.length!==wanted.effects.length)throw issue('Effect intent count could not be confirmed.');
   for(const [index,e] of managed.entries()){
    const expected=wanted.effects[index];
    if(e.name!==expected.name||e.enabled!==true||!matches(await draft.videoEffectProgram(e),expected.program))throw issue('Effect program, controls or prefix order differ from the intended result.');
   }
   return {count:managed.length,stack:all.map(e=>({name:e.name,effectName:e.effectName,enabled:e.enabled}))};
  };
  for(const g of graphicPlans)g.kept=await graphicPresent(g);
  for(const c of clipPlans)c.before=await effectState(c,false);
  // Muting and other caller policy run only after every existing program was
  // checked. All targets below are reread after that edit and each addition.
  if(beforeApply)await beforeApply();
  let graphicsAdded=0,graphicsKept=0;
  const effects=Object.fromEntries(intent.effectNames.map(name=>[name,{added:0,kept:0}]));
  for(const g of graphicPlans){
   if(g.kept){graphicsKept++;continue;}
   await draft.addMotionGraphic({within:await draft.rangeAtFrames(g.startFrame,g.endFrame),label:g.name,tsxCode:g.program.tsxCode,parameters:g.program.parameters,editableParameters:g.program.editableParameters});graphicsAdded++;
  }
  for(const c of clipPlans){
   for(const [index,e] of c.effects.entries()){
    if(index<c.before.count){effects[e.name].kept++;continue;}
    await draft.addVideoEffect({clip:await rowFor(c),label:e.name,tsxCode:e.program.tsxCode,parameters:e.program.parameters,editableParameters:e.program.editableParameters});effects[e.name].added++;
   }
  }
  // Writer acknowledgements are not evidence that a program was applied.
  for(const g of graphicPlans)if(!await graphicPresent(g))throw issue('The intended graphic was not applied.');
  for(const c of clipPlans){
   const after=await effectState(c,true);
   if(!same(after.stack.slice(0,c.before.stack.length),c.before.stack))throw issue('An existing effect stack changed while applying programs.');
  }
  return {graphicsAdded,graphicsKept,effects};
 });
 const inspect=async(draft,expected)=>{
  if(!('videoEffects' in draft)||!('videoEffectProgram' in draft)||!('motionGraphicProgram' in draft))throw issue('Update Selects to verify Image programs.');
  const rows=(await draft.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  if(!Array.isArray(expected)||expected.length!==rows.length||new Set(expected.map(c=>c.clipId)).size!==expected.length)throw issue('Visual program count could not be confirmed.');
  const sources=[],clips=[];
  const pack=program=>{const p=normalized(program);let source=sources.indexOf(p.tsxCode);if(source<0){source=sources.length;sources.push(p.tsxCode);}return {source,parameters:p.parameters,editableParameters:p.editableParameters};};
  for(const wanted of expected){
   const clip=rows.find(c=>c.clipId===wanted.clipId&&c.trackId===wanted.trackId);if(!clip)throw issue('Visual program target could not be confirmed.');
   const effects=await draft.videoEffects(clip);
   if(!Array.isArray(effects)||effects.length!==wanted.effects.length)throw issue('Effect stack could not be confirmed.');
   const checked=[];
   for(const [index,entry] of wanted.effects.entries()){
    const actual=effects[index],program=normalized(entry);
    if(actual.effectIndex!==index||actual.name!==entry.name||actual.enabled!==true||!matches(await draft.videoEffectProgram(actual),program))throw issue('Effect program, order or controls could not be confirmed.');
    checked.push({name:entry.name,...pack(program)});
   }
   const graphic=await draft.motionGraphicProgram(clip);
   if(wanted.graphic?!matches(graphic,normalized(wanted.graphic)):graphic!==null)throw issue('Graphic program or controls could not be confirmed.');
   clips.push({clipId:clip.clipId,trackId:clip.trackId,effects:checked,graphic:wanted.graphic?pack(wanted.graphic):null});
  }
  return {sources,clips};
 };
 const presets=new Map();
 const preset=async id=>{
  if(!config)throw issue('Effect preset preparation requires an authoring target.');
  if(presets.has(id))return presets.get(id);
  const definition=await selects.effectPresets.get(id);
  if(definition?.id!==id||definition.kind!=='effect'||typeof definition.label!=='string'||!Array.isArray(definition.editableParameters)||!definition.parameters)throw issue('Effect preset definition could not be confirmed.');
  // The public preset definition omits effect TSX. Resolve a canonical program
  // in an isolated unsaved reference, never by adopting the target's output.
  const project=selects.project(config.projectId),probe=await project.createDraft({name:'Image preset reference'});
  await probe.insertGap({seconds:config.plan.durationFrames/config.plan.fps});await probe.setFrameSize(config.plan.canvas);
  await probe.overlayResource({resource:project.resource(config.sources[0].resourceId),over:await probe.rangeAtFrames(0,config.plan.durationFrames)});
  if(!('videoEffects' in probe)||!('videoEffectProgram' in probe))throw issue('Update Selects to verify effect presets.');
  let clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');if(clips.length!==1)throw issue('Effect preset reference could not be confirmed.');
  const applied=await probe.applyEffectPreset({clip:clips[0],presetId:id,parameters:definition.parameters});
  if(applied?.presetId!==id)throw issue('Effect preset identity could not be confirmed.');
  clips=(await probe.clips({trackScope:'all'})).filter(c=>c.trackKind==='video');
  const effects=await probe.videoEffects(clips[0]);if(effects.length!==1||effects[0].enabled!==true||effects[0].name!==definition.label)throw issue('Effect preset reference stack could not be confirmed.');
  const program=await probe.videoEffectProgram(effects[0]),expected=normalized({tsxCode:program?.tsxCode,parameters:definition.parameters,editableParameters:definition.editableParameters});
  if(typeof program?.tsxCode!=='string'||!program.tsxCode||!matches(program,expected))throw issue('Effect preset reference program could not be confirmed.');
  const value={name:definition.label,...expected};presets.set(id,value);return value;
 };
 const confirm=details=>{
  if(!config||!format)throw issue('Program receipt confirmation requires an authoring target.');
  const result={draftId:config.partialDraftId||'x'.repeat(120),fps:config.plan.fps,durationFrames:config.plan.durationFrames,frameSize:config.plan.canvas,clips:config.clips,...details};
  // Reserve more than a UUID for the post-commit identity. Check the actual
  // journal envelope and ASCII encoding before the only persistence boundary.
  try{format(config.runReceipt?{...JSON.parse(config.runReceipt.expectedText),status:'saved',result}:result);}catch(cause){throw Object.assign(issue('The Image program receipt exceeds its limit or could not be prepared.'),{cause});}
 };
 const verify=(draft,receipt)=>inspect(draft,receipt.clips.map(c=>{const expand=p=>({tsxCode:receipt.sources[p.source],parameters:p.parameters,editableParameters:p.editableParameters});return {...c,effects:c.effects.map(e=>({name:e.name,...expand(e)})),graphic:c.graphic?expand(c.graphic):null};}));
 return {inspect:guarded(inspect),preset:guarded(preset),confirm,verify:guarded(verify),reconcile};
}
async function authorAtomicImageDraft(selects,config,finish,placeImages,sourceFacts,inspectGraphics,inspectTransforms,inspectAudio,programFeature,format,bindPlacement){
 let stage='read';
 try{
  const {projectId,plan,sources,items,partialDraftId}=config,project=selects.project(projectId);
  if(partialDraftId&&!(await project.meta()).draftIds.includes(partialDraftId))throw Error('Partial Draft is not in this Project.');
  const draft=partialDraftId?selects.draft(partialDraftId):await project.createDraft({name:config.name});
  if(!('motionGraphics' in draft)||!('motionGraphicProgram' in draft))throw Error('Update Selects to verify editable graphics.');
  if(!('clipTransform' in draft))throw Error('Update Selects to verify Image transforms.');
  if(!partialDraftId){
   stage='working copy';
   if(config.main){await draft.insertResource({resourceId:config.main.resourceId,sourceRange:{startSeconds:config.main.startSeconds,endSeconds:config.main.startSeconds+plan.durationFrames/plan.fps}});}
   else await draft.insertGap({seconds:plan.durationFrames/plan.fps});
   await draft.setFrameSize(plan.canvas);
  }else{
   const rows=await draft.clips({trackScope:'all'});
   if(rows.some(row=>row.trackKind!=='main'||(config.main?row.resourceId!==config.main.resourceId:Boolean(row.resourceId)))||config.main&&rows.length!==1)throw Error('Partial Draft is not empty; inspect it before retrying.');
  }
  stage='placement';const native=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement);
  const clips=native.placements.map(({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame})=>({key,slot,appearance,clipId,trackId,resourceId,startFrame,endFrame}));
  stage='finish';const result=await finish(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programFeature(selects,{...config,clips},format));
  return {...result,fps:plan.fps,durationFrames:plan.durationFrames,frameSize:plan.canvas,clips};
 }catch(error){return {status:stage==='finish'?'outcomeUnknown':'notSaved',stage,message:String(error?.message||error),draftId:config.partialDraftId||null};}
}
function buildAtomicImageDraftScript(config,finishSource){
 const receipt=config.runReceipt?`await (${writeTemplateRunResult.toString()})(selects,config.runReceipt,result,${templateRunJSON.toString()},${templateRunBase64.toString()})`:'result';
 return `const config=${JSON.stringify(config)};const result=await (${authorAtomicImageDraft.toString()})(selects,config,${finishSource},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${inspectImageGraphics.toString()},${inspectImageTransforms.toString()},${inspectImageAudio.toString()},${imageProgramsFeature.toString()},${templateRunJSON.toString()},${bindMediaPlacement.toString()});return ${receipt};`;
}
async function verifyAtomicImageDraft(sdk,projectId,result){
 const {draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs}=result,expected={draftId,fps,durationFrames,frameSize,clips,graphics,transforms,audio,programs};
 const unverified=cause=>{const message='The saved Image Draft, graphics or sound could not be confirmed. Inspect the Draft before starting a new run.';return Object.assign(Error(message),{code:'IMAGE_SAVE_UNVERIFIED',draftId,publicMessage:message,cause});};
 if(!Array.isArray(graphics))throw Object.assign(Error('Saved graphic receipts are unavailable. Inspect the existing Draft before starting a new run.'),{code:'IMAGE_SAVE_UNVERIFIED',draftId});
 if(!Array.isArray(transforms))throw unverified('Saved transform receipts are unavailable.');
 if(!Array.isArray(audio))throw unverified('Saved Audio receipts are unavailable.');
 if(audio.some(row=>!row?.source))throw unverified('Saved Audio source evidence is unavailable.');
 if(!programs)throw unverified('Saved program receipts are unavailable.');
 let response;try{response=await sdk.runScript({summary:'Verify complete saved Image Draft',allowCommit:false,script:`const expected=${JSON.stringify(expected)};const project=selects.project(${JSON.stringify(projectId)});if(!(await project.meta()).draftIds.includes(expected.draftId))throw Error('Saved Draft is not in this Project');const draft=selects.draft(expected.draftId),meta=await draft.meta(),rows=await draft.clips({trackScope:'all'});if(meta.fps!==expected.fps||meta.durationFrames!==expected.durationFrames||meta.frameSize.width!==expected.frameSize.width||meta.frameSize.height!==expected.frameSize.height)throw Error('Saved Draft frame grid could not be confirmed');if(rows.filter(row=>row.trackKind==='video'&&row.resourceId).length!==expected.clips.length)throw Error('Saved Image count could not be confirmed');for(const wanted of expected.clips){const actual=rows.find(row=>row.clipId===wanted.clipId&&row.trackId===wanted.trackId);if(!actual||actual.resourceId!==wanted.resourceId||actual.startFrame!==wanted.startFrame||actual.endFrame!==wanted.endFrame)throw Error('Saved Image placement could not be confirmed');}await (${inspectImageGraphics.toString()})(draft,expected.graphics);await (${inspectImageTransforms.toString()})(draft,expected.transforms);await (${inspectImageAudio.toString()})(draft,expected.audio,project);await (${imageProgramsFeature.toString()})(selects).verify(draft,expected.programs);return {verified:true};`});}catch(cause){throw unverified(cause);}
 if(response?.isError||response?.result?.verified!==true)throw unverified(response?.output);
 return result;
}
async function readImageDraftFps(sdk,projectId,draftId=null){
 const response=await sdk.runScript({summary:'Read the Project frame rate',allowCommit:false,script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(draftId)};if(id&&!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=id?selects.draft(id):await p.createDraft({name:'Image frame rate check'});return {fps:(await d.meta()).fps};`});
 if(response.isError||!Number.isFinite(response.result?.fps)||response.result.fps<=0)throw Error('Could not read the Project frame rate.');
 return response.result.fps;
}
// native-image-authoring:end
// template-run:start
// Durable ownership of one app-supplied template run. Original source is embedded
// into its declared consumers; no cross-plugin runtime import is required.
function templateRunJSON(value) {
 const text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>49152)throw Error('The template run receipt exceeds the local file limit.');
 return text;
}
// SDK scripts have no browser/Node encoding globals. The JSON above is ASCII.
function templateRunBase64(text) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';
 for(let i=0;i<text.length;i+=3){
  const a=text.charCodeAt(i),b=text.charCodeAt(i+1),c=text.charCodeAt(i+2);
  out+=alphabet[a>>2]+alphabet[((a&3)<<4)|(Number.isNaN(b)?0:b>>4)]+(Number.isNaN(b)?'=':alphabet[((b&15)<<2)|(Number.isNaN(c)?0:c>>6)])+(Number.isNaN(c)?'=':alphabet[c&63]);
 }
 return out;
}
function templateRunIssue(code,message) {
 return Object.assign(Error(message),{code,publicMessage:message});
}
// A canonical, bounded JSON value for snapshots/recipes. Unlike the small run
// envelope, state can include fonts/programs; it is stored in chunked files.
function templateStateJSON(value,limit=8388608){
 const text=JSON.stringify(value,(_key,item)=>{
  if(typeof item==='number'&&!Number.isFinite(item)||['function','symbol','bigint'].includes(typeof item))throw Error('Template state contains an unsupported value.');
  return item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item;
 }).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
 if(text.length>limit)throw Error('Template state exceeds its input limit.');return text;
}
// SDK-safe state of every exposed timeline row. Read-only targets never cross
// edits or script calls; source windows, programs and sound come from SDK reads.
async function readTemplateSavedState(draft){
 const meta=await draft.meta(),graphics=await draft.motionGraphics(),rows=await draft.clips({trackScope:'all'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.durationFrames)||meta.durationFrames<1||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows)||rows.length>1024||new Set(rows.map(r=>r.clipId)).size!==rows.length||!Array.isArray(graphics))throw Error('The Draft state is incomplete.');
 const clips=[];
 for(const row of rows){
  if(!Number.isSafeInteger(row.clipId)||typeof row.trackId!=='string'||!row.trackId||!Number.isSafeInteger(row.startFrame)||row.startFrame<0||!Number.isSafeInteger(row.endFrame)||row.endFrame<=row.startFrame)throw Error('The Draft row is incomplete.');
  const graphic=graphics.find(g=>g.clip.clipId===row.clipId&&g.clip.trackId===row.trackId),media=row.resourceId!=null&&['main','video','audio'].includes(row.trackKind),visual=['main','video'].includes(row.trackKind)&&(media||!!graphic);
  const effects=[];
  if(visual)for(const effect of await draft.videoEffects(row))effects.push({effectIndex:effect.effectIndex,name:effect.name,effectName:effect.effectName,enabled:effect.enabled,program:await draft.videoEffectProgram(effect)});
  clips.push({clipId:row.clipId,trackId:row.trackId,trackKind:row.trackKind,resourceId:row.resourceId??null,startFrame:row.startFrame,endFrame:row.endFrame,videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,color:row.color??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,text:row.text??null,
   source:media?await draft.clipSourceWindow(row):null,audio:media?await draft.clipAudio(row):null,transform:visual?await draft.clipTransform(row):null,effects,graphic:graphic?{name:graphic.name,program:await draft.motionGraphicProgram(row)}:null});
 }
 clips.sort((a,b)=>a.clipId-b.clipId);
 return {fps:meta.fps,durationFrames:meta.durationFrames,frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips};
}
// SDK-safe immutable snapshot publication and comparison. Compare actual bytes
// in bounded chunks as well as their native fingerprint; no SDK encoding global
// or handwritten hash implementation is required.
async function templateStateFile(selects,path,text,encode,expected=null){
 const files=selects.files;
 if(!files||!['fingerprint','readRange','writeChunk'].every(key=>typeof files[key]==='function')||typeof text!=='string'||!text.length||text.length>8388608)throw Error('Update Selects to confirm template state files.');
 if(!expected){
  for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.writeChunk({path,offset,base64:encode(chunk),...offset===0?{mode:'exclusive'}:{}});if(reply?.bytesWritten!==chunk.length)throw Error('Template state file write was incomplete.');}
  const fingerprint=await files.fingerprint(path);
  if(!fingerprint||fingerprint.size!==text.length||typeof fingerprint.sha256!=='string'||!/^[a-f0-9]{64}$/.test(fingerprint.sha256))throw Error('Template state file could not be fingerprinted.');
  expected={path,...fingerprint};
 }
 if(expected.path!==path||expected.size!==text.length)throw Error('The saved template state has changed.');
 const before=await files.fingerprint(path);
 if(!before||before.size!==expected.size||before.sha256!==expected.sha256)throw Error('The template state file has changed.');
 for(let offset=0;offset<text.length;offset+=49152){const chunk=text.slice(offset,offset+49152),reply=await files.readRange({path,offset,length:chunk.length});if(reply?.bytesRead!==chunk.length||reply.base64!==encode(chunk))throw Error('The saved Draft differs from its owned state.');}
 const after=await files.fingerprint(path);if(!after||after.size!==expected.size||after.sha256!==expected.sha256)throw Error('The template state file changed while reading.');
 return expected;
}
function validateTemplateRun(row,scope,digest,recordPath=null) {
 const invalid=()=>templateRunIssue('TEMPLATE_RUN_INVALID','The saved run record could not be verified. Inspect the Project before starting a new run.');
 if(!row||row.version!==1||!row.scope||Object.keys(row.scope).length!==4||Object.keys(scope).some(key=>row.scope[key]!==scope[key])||row.requestDigest!==digest||
  typeof row.owner!=='string'||!/^[\da-f-]{36}$/i.test(row.owner)||!['claimed','saved','notSaved','outcomeUnknown'].includes(row.status))throw invalid();
 if(row.savedDraftId!==undefined&&(row.status!=='outcomeUnknown'||typeof row.savedDraftId!=='string'||!row.savedDraftId||row.savedDraftId.length>1024||row.savedDraftId.includes('\0')))throw invalid();
 if(row.status==='saved'){
  const r=row.result;
  if(!r||typeof r.draftId!=='string'||!r.draftId||!Number.isFinite(r.fps)||r.fps<=0||!Number.isSafeInteger(r.durationFrames)||r.durationFrames<1||
   !Number.isSafeInteger(r.frameSize?.width)||r.frameSize.width<1||!Number.isSafeInteger(r.frameSize?.height)||r.frameSize.height<1||!Array.isArray(r.clips)||!r.clips.length||r.clips.length>256||
   r.clips.some(c=>!c||!Number.isSafeInteger(c.clipId)||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame||c.endFrame>r.durationFrames))throw invalid();
  if(new Set(r.clips.map(c=>c.clipId)).size!==r.clips.length)throw invalid();
  if(r.stateFile!==undefined){const file=r.stateFile;if(!file||Object.keys(file).length!==3||typeof file.path!=='string'||!recordPath||file.path!==recordPath+'.state-'+row.owner+'.json'||typeof file.sha256!=='string'||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.size)||file.size<1||file.size>8388608)throw invalid();}
  if(r.graphics!==undefined){
   if(!Array.isArray(r.graphics)||r.graphics.length>256||r.graphics.some(g=>!g||!Number.isSafeInteger(g.clipId)||g.clipId<0||typeof g.trackId!=='string'||!g.trackId||!Number.isSafeInteger(g.startFrame)||!Number.isSafeInteger(g.endFrame)||g.startFrame<0||g.endFrame<=g.startFrame||g.endFrame>r.durationFrames||!g.parameters||typeof g.parameters!=='object'||Array.isArray(g.parameters)||'tsxCode' in g))throw invalid();
   if(new Set(r.graphics.map(g=>g.clipId)).size!==r.graphics.length||r.graphics.some(g=>r.clips.some(c=>c.clipId===g.clipId)))throw invalid();
  }
  if(r.transforms!==undefined){
   const visual=[...r.clips,...(r.graphics??[])],point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
   if(!Array.isArray(r.transforms)||r.transforms.length!==visual.length||new Set(r.transforms.map(t=>t?.clipId)).size!==r.transforms.length)throw invalid();
   for(const row of r.transforms){
    const t=row?.transform;
    if(!row||!visual.some(c=>c.clipId===row.clipId&&c.trackId===row.trackId)||Object.keys(row).length!==3||!t||Object.keys(t).length!==10||typeof t.enabled!=='boolean'||typeof t.flipHorizontal!=='boolean'||typeof t.flipVertical!=='boolean'||!point(t.position)||!point(t.scale)||t.scale.x<=0||t.scale.y<=0||!point(t.anchor)||!Number.isFinite(t.rotation))throw invalid();
    for(const key of ['positionKeys','scaleKeys','rotationKeys'])if(!Array.isArray(t[key])||t[key].length>256||t[key].some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||(key==='positionKeys'?!point(k):!Number.isFinite(k[key==='scaleKeys'?'scale':'rotation']))))throw invalid();
   }
  }
  if(r.audio!==undefined){
   if(!Array.isArray(r.audio)||r.audio.length>256||new Set(r.audio.map(a=>a?.clipId)).size!==r.audio.length)throw invalid();
   const db=value=>Number.isFinite(value)&&value>=-60&&value<=12,visual=[...r.clips,...(r.graphics??[])];
   for(const a of r.audio){
    const s=a?.settings;
    if(!a||Object.keys(a).length!==(a.source===undefined?8:9)||!Number.isSafeInteger(a.clipId)||a.clipId<0||typeof a.trackId!=='string'||!a.trackId||!['main','audio'].includes(a.trackKind)||typeof a.resourceId!=='string'||!a.resourceId||!Number.isSafeInteger(a.startFrame)||!Number.isSafeInteger(a.endFrame)||a.startFrame<0||a.endFrame<=a.startFrame||a.endFrame>r.durationFrames||visual.some(c=>c.clipId===a.clipId)||!s||Object.keys(s).length!==4)throw invalid();
    if(a.source!==undefined){
     const t=a.source,rate=t?.playbackSpeed;
     if(!t||Object.keys(t).length!==4||!Number.isFinite(t.startSeconds)||t.startSeconds<0||!Number.isFinite(t.endSeconds)||t.endSeconds<=t.startSeconds||!rate||Object.keys(rate).length!==2||!Number.isSafeInteger(rate.numerator)||rate.numerator<1||!Number.isSafeInteger(rate.denominator)||rate.denominator<1||rate.numerator/rate.denominator<.01||rate.numerator/rate.denominator>100||typeof t.preserveAudioPitch!=='boolean')throw invalid();
    }
    if(a.audioSourceIndexes!==null&&(!Array.isArray(a.audioSourceIndexes)||a.audioSourceIndexes.length>256||new Set(a.audioSourceIndexes).size!==a.audioSourceIndexes.length||a.audioSourceIndexes.some(i=>!Number.isSafeInteger(i)||i<0)))throw invalid();
    const duration=(a.endFrame-a.startFrame)/r.fps;
    if(!Array.isArray(s.volumeKeys)||s.volumeKeys.length>256||(s.volumeKeys.length?s.volumeDb!==null:!db(s.volumeDb))||s.volumeKeys.some(k=>!k||!Number.isFinite(k.atSeconds)||k.atSeconds<0||k.atSeconds>duration||!db(k.volumeDb))||!Number.isFinite(s.fadeInSeconds)||s.fadeInSeconds<0||s.fadeInSeconds>duration||!Number.isFinite(s.fadeOutSeconds)||s.fadeOutSeconds<0||s.fadeOutSeconds>duration)throw invalid();
   }
  }
  if(r.programs!==undefined){
   const p=r.programs,visual=[...r.clips,...(r.graphics??[])],used=new Set();
   if(!p||Object.keys(p).length!==2||!Array.isArray(p.sources)||p.sources.length>256||p.sources.some(s=>typeof s!=='string'||!s||s.length>49152)||new Set(p.sources).size!==p.sources.length||!Array.isArray(p.clips)||p.clips.length!==visual.length||new Set(p.clips.map(c=>c?.clipId)).size!==p.clips.length)throw invalid();
   const entry=(e,effect)=>{
    if(!e||Object.keys(e).length!==(effect?4:3)||!Number.isSafeInteger(e.source)||e.source<0||e.source>=p.sources.length||!e.parameters||typeof e.parameters!=='object'||Array.isArray(e.parameters)||!Array.isArray(e.editableParameters)||e.editableParameters.length>256||effect&&(typeof e.name!=='string'||!e.name))throw invalid();
    if(new Set(e.editableParameters.map(d=>d?.key)).size!==e.editableParameters.length||e.editableParameters.some(d=>!d||typeof d.key!=='string'||!d.key||typeof d.label!=='string'||!['text','number','color','boolean','select'].includes(d.type)||!Object.prototype.hasOwnProperty.call(e.parameters,d.key)))throw invalid();
    used.add(e.source);
   };
   for(const c of p.clips){
    if(!c||Object.keys(c).length!==4||!visual.some(v=>v.clipId===c.clipId&&v.trackId===c.trackId)||!Array.isArray(c.effects)||c.effects.length>64)throw invalid();
    c.effects.forEach(e=>entry(e,true));
    const graphic=(r.graphics??[]).some(g=>g.clipId===c.clipId);
    if(graphic)entry(c.graphic,false);else if(c.graphic!==null)throw invalid();
   }
   if(used.size!==p.sources.length)throw invalid();
  }
 }
 return row;
}
// Called inside the SAME Main SDK invocation after authoring, before the reply.
// Only the exclusive claim's owner can publish this receipt; no save is retried.
async function writeTemplateRunResult(selects,claim,result,json,encode) {
 try{
  const row=JSON.parse(claim.expectedText),status=result.status;
  if(row.status!=='claimed'||!['saved','notSaved','outcomeUnknown'].includes(status))throw Error('Invalid run receipt state');
  let saved;
  if(status==='saved'){
   if(!('fps' in result)||!('durationFrames' in result)||!('frameSize' in result)||!('clips' in result)||typeof result.draftId!=='string'||!result.draftId)throw Error('Saved run receipt is incomplete');
   saved={draftId:result.draftId,fps:result.fps,durationFrames:result.durationFrames,frameSize:result.frameSize,clips:result.clips,...'graphics' in result?{graphics:result.graphics}:{},...'transforms' in result?{transforms:result.transforms}:{},...'audio' in result?{audio:result.audio}:{},...'programs' in result?{programs:result.programs}:{},...'stateFile' in result?{stateFile:result.stateFile}:{}};
  }
  const savedDraftId=status==='outcomeUnknown'?result.draftId:null;
  if(savedDraftId!=null&&(typeof savedDraftId!=='string'||!savedDraftId||savedDraftId.length>1024||savedDraftId.includes('\0')))throw Error('Invalid saved Draft identity');
  const next=json({...row,status,...saved?{result:saved}:{},...savedDraftId?{savedDraftId}:{}});
  const reply=await selects.files.compareAndReplace({path:claim.path,expectedBase64:encode(claim.expectedText),base64:encode(next)});
  return {...result,runReceiptSaved:reply?.replaced===true};
 }catch{return {...result,runReceiptSaved:false};}
}
async function executeTemplateRun(sdk,files,scope,request,isCurrent,perform,verify,options={}) {
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!options||['existingOnly','retryNotSaved'].some(key=>options[key]!==undefined&&typeof options[key]!=='boolean')||options.existingOnly&&options.retryNotSaved)fail('TEMPLATE_RUN_INVALID','Invalid run recovery options.');
 if(!scope||!['pluginId','libraryId','projectId','runId'].every(key=>typeof scope[key]==='string'&&scope[key].length>0&&scope[key].length<=1024)||!/^[a-z0-9-]+$/.test(scope.pluginId))fail('TEMPLATE_RUN_INVALID','The template run target is incomplete. Start again from the Project.');
 scope={pluginId:scope.pluginId,libraryId:scope.libraryId,projectId:scope.projectId,runId:scope.runId};
 const targetCheck=async()=>{
  const target=await sdk.call('getProjectDraftScaffold',scope.projectId);
  if(target?.owner?.libraryId!==scope.libraryId||target.owner.projectId!==scope.projectId)fail('TEMPLATE_RUN_TARGET','The template run belongs to a different Project or library. Start again from the intended Project.');
  check();
 };
 await targetCheck();
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','compareAndReplace','mkdir'].every(key=>typeof files[key]==='function'))fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(templateRunJSON(value)))),n=>n.toString(16).padStart(2,'0')).join('');
 const key=await digest(scope),requestDigest=await digest(request);
 const directory=files.join(files.homedir(),'.selects','plugin-data',scope.pluginId,'template-runs'),path=files.join(directory,key+'.json');
 let lastReadText=null;
 const read=async()=>{
  if(!await files.exists(path))return null;
  let row;
  try{
   for(let attempt=0;attempt<3;attempt++){
   const stat=await files.stat(path);if(stat?.isDirectory===false&&stat.size===0)continue;
   if(!stat||stat.isDirectory!==false||!Number.isSafeInteger(stat.size)||stat.size<1||stat.size>49152)throw Error('Invalid record size');
   const bytes=await files.readRange(path,0,stat.size),after=await files.stat(path);
   if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]')throw Error('Invalid run record bytes');
   // A legitimate Main-side receipt may replace the claim between these reads.
   // Retry bounded observations; never parse a mixture or retry authoring.
   if(!after||['size','mtimeMs','ino'].some(key=>stat[key]!==after[key]))continue;
   if(bytes.byteLength!==stat.size)throw Error('Invalid run record bytes');
   lastReadText=new TextDecoder().decode(bytes);row=JSON.parse(lastReadText);break;
   }
   if(row===undefined)fail('TEMPLATE_RUN_PENDING','The run record is changing. Check its saved result again.');
  }catch(error){if(error?.code==='TEMPLATE_RUN_PENDING')throw error;fail('TEMPLATE_RUN_INVALID','The saved run record could not be read. Inspect the Project before starting a new run.');}
  return validateTemplateRun(row,scope,requestDigest,path);
 };
 const recover=async row=>{
  if(row.status==='saved'){await targetCheck();return verify({...row.result,status:'saved',projectId:scope.projectId});}
  if(row.status==='notSaved')fail('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.');
  if(row.status==='outcomeUnknown'&&row.savedDraftId)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The saved Draft '+row.savedDraftId+' could not be confirmed. Inspect it before starting another run.'),{draftId:row.savedDraftId});
  fail('TEMPLATE_RUN_PENDING','This run may still be saving or awaiting confirmation. Inspect the Project before starting another run.');
 };
 const existing=await read(),retryText=lastReadText;
 if(existing&&!(options.retryNotSaved&&existing.status==='notSaved'))return recover(existing);
 if(options.existingOnly)fail('TEMPLATE_RUN_MISSING','The owned assembly record is missing. Inspect the Project before starting another run.');
 if(typeof globalThis.crypto?.randomUUID!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 const capability=await sdk.runScript({summary:'Check durable template run support',allowCommit:false,script:"return {supported:'files' in selects&&typeof selects.files?.compareAndReplace==='function'&&typeof selects.files?.writeChunk==='function'};"});
 if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 await files.mkdir(directory,{recursive:true});check();
 const owner=crypto.randomUUID(),expectedText=templateRunJSON({version:1,scope,requestDigest,owner,status:'claimed'}),claim={path,expectedText};
 // Exclusive creation is a filesystem operation, including across app windows.
 // compareAndReplace alone serializes only one renderer bridge's own writes.
 if(existing){
  // Only a positive no-save is eligible. The exclusive generation lock covers
  // other renderer bridges too; a CAS alone does not provide that guarantee.
  const lock=path+'.retry-'+existing.owner;
  try{await files.writeFile(lock,owner,{flag:'wx'});}catch(cause){
   const stat=await files.stat(lock),bytes=stat?.size===owner.length?await files.readRange(lock,0,stat.size):null;
   if(!bytes||new TextDecoder().decode(bytes)!==owner)fail('TEMPLATE_RUN_PENDING','A retry of this known no-save run is awaiting confirmation.');
  }
  try{
   const replaced=await files.compareAndReplace(path,retryText,expectedText);
   if(!replaced){const row=await read();if(row?.owner!==owner)return recover(row);}
  }catch(cause){const row=await read();if(row?.owner!==owner)throw cause;}
 }else try{await files.writeFile(path,expectedText,{flag:'wx'});}catch(cause){
  const row=await read();
  if(!row)fail('TEMPLATE_RUN_STORAGE','The run could not be recorded. Nothing was dispatched. Check local file access and start a new run.');
  if(row.owner!==owner)return recover(row);
  // A lost claim ACK is safe to recover here: authoring has not been dispatched.
 }
 let dispatched=false;
 try{
  check();
  return await perform(claim,async()=>{await targetCheck();dispatched=true;});
 }catch(cause){
  if(!dispatched){
   // No authoring was dispatched. Never overwrite a later Main-side receipt.
   await files.compareAndReplace(path,expectedText,templateRunJSON({...JSON.parse(expectedText),status:'notSaved'})).catch(()=>{});
   if(cause&&typeof cause==='object')Object.assign(cause,{outcome:'notSaved'});
  }else{
   // Main may finish after the transport failed. Keep its expected claim intact
   // so the late receipt can land. A positively saved receipt permits readback.
   const row=await read();if(row?.status==='saved')return recover(row);
   if(row?.status==='notSaved')throw Object.assign(templateRunIssue('TEMPLATE_RUN_NOT_SAVED','This run stopped before saving a Draft. Start a new run to retry.'),{cause});
  }
  throw cause;
 }
}

// SDK-safe projection for an assembly receipt. Main media identity and frame
// intervals, routing, source windows, transforms and Main audio are confirmed
// here; this is not title/effect or other-track semantic approval.
async function readTemplateAssemblyState(draft){
 const meta=await draft.meta(),rows=await draft.clips({trackScope:'main'});
 if(!Number.isFinite(meta.fps)||meta.fps<=0||!Number.isSafeInteger(meta.frameSize?.width)||meta.frameSize.width<1||!Number.isSafeInteger(meta.frameSize?.height)||meta.frameSize.height<1||!Array.isArray(rows))throw Error('The assembled Draft metadata is incomplete.');
 const clips=[];
 for(const row of rows.filter(row=>row.resourceId!=null))clips.push({clipId:row.clipId,trackId:row.trackId,resourceId:row.resourceId,startFrame:row.startFrame,endFrame:row.endFrame,
  videoIndex:row.videoIndex??null,audioSourceIndexes:row.audioSourceIndexes??null,playbackSpeed:row.playbackSpeed??null,preserveAudioPitch:row.preserveAudioPitch??null,
  source:await draft.clipSourceWindow(row),transform:await draft.clipTransform(row),audio:await draft.clipAudio(row)});
 clips.sort((a,b)=>a.clipId-b.clipId);
 if(!clips.length||clips.length>256||new Set(clips.map(c=>c.clipId)).size!==clips.length||clips.some(c=>!Number.isSafeInteger(c.clipId)||c.clipId<0||typeof c.trackId!=='string'||!c.trackId||typeof c.resourceId!=='string'||!c.resourceId||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame<0||c.endFrame<=c.startFrame))throw Error('The assembled Draft clips could not be confirmed.');
 const state={fps:meta.fps,durationFrames:Math.max(...clips.map(c=>c.endFrame)),frameSize:{width:meta.frameSize.width,height:meta.frameSize.height},clips};
 JSON.stringify(state,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['bigint','function','symbol'].includes(typeof value))throw Error('The assembly returned an invalid nonfinite or unsupported value.');return value;});
 return state;
}

async function readTemplateAssemblyFacts(selects,projectId,draftId,readState){
 if(typeof draftId!=='string'||!draftId)throw Error('The assembly returned no Draft identity.');
 const ids=(await selects.project(projectId).meta()).draftIds;
 if(!Array.isArray(ids)||!ids.includes(draftId))throw Error('The assembled Draft is not in its Project.');
 return {draftId,...await readState(selects.draft(draftId))};
}

// Extend the existing durable run owner for templates whose assembly script
// commits before a separate title/look step. A name never proves ownership.
async function executeTemplateAssembly(sdk,files,scope,config,source,isCurrent,options={}){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 if(typeof isCurrent!=='function'||!scope||typeof scope.projectId!=='string'||!scope.projectId||typeof scope.runId!=='string'||!scope.runId||!config||config.projectId!==scope.projectId||typeof source!=='string'||source.split('__CONFIG__').length!==2||!source.startsWith('// @template-assembly 1\n'))fail('TEMPLATE_RUN_INVALID','The assembly request is incomplete.');
 if(typeof globalThis.TextEncoder!=='function'||typeof sdk?.call!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to save and recover template runs safely.');
 if(new TextEncoder().encode(source).length>131072)fail('TEMPLATE_RUN_INVALID','The assembly script exceeds its input limit.');
 scope={pluginId:scope.pluginId,projectId:scope.projectId,runId:scope.runId,libraryId:scope.libraryId};
 const frozen=JSON.parse(templateRunJSON(config));
 // A display label can be regenerated on remount; it is never run identity.
 const {draftName:displayName,...contentConfig}=frozen;
 const request={config:contentConfig,source};templateRunJSON(request);
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
 if(target?.owner?.projectId!==scope.projectId||typeof target.owner.libraryId!=='string'||!target.owner.libraryId||scope.libraryId!=null&&scope.libraryId!==target.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
 scope={pluginId:scope.pluginId,libraryId:target.owner.libraryId,projectId:scope.projectId,runId:scope.runId};
 const query=async script=>{check();const reply=await sdk.runScript({summary:'Confirm owned assembly Draft',allowCommit:false,script});check();if(reply.isError||!reply.result)fail('TEMPLATE_RUN_INVALID','The owned Draft could not be read back. Inspect it before starting another run.');return reply.result;};
 const verify=async receipt=>{
  if(options.receiptOnly)return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,stateFile:receipt.stateFile??null,assemblyConfirmed:false};
  check();const target=await sdk.call('getProjectDraftScaffold',scope.projectId);check();
  if(target?.owner?.projectId!==scope.projectId||target.owner.libraryId!==scope.libraryId)fail('TEMPLATE_RUN_TARGET','The assembly belongs to a different Project or library.');
  const observed=await query(`return await (${readTemplateAssemblyFacts.toString()})(selects,${JSON.stringify(scope.projectId)},${JSON.stringify(receipt.draftId)},${readTemplateAssemblyState.toString()});`);
  const expected={draftId:receipt.draftId,fps:receipt.fps,durationFrames:receipt.durationFrames,frameSize:receipt.frameSize,clips:receipt.clips};
  if(templateRunJSON(observed)!==templateRunJSON(expected))fail('TEMPLATE_RUN_INVALID','The saved Draft has changed since its assembly receipt. Inspect it before starting another run.');
  if(options.captureState&&!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','This assembly has no complete state receipt. Inspect it before finishing.');
  if(receipt.stateFile)await query(`await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}))),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)});return {verified:true};`);
  return {sequenceId:receipt.draftId,fps:receipt.fps,totalFrames:receipt.durationFrames,notes:[],assemblyConfirmed:true,...receipt.stateFile?{stateFile:receipt.stateFile}:{}};
 };
 return executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  const capability=await sdk.runScript({summary:'Check assembly recovery support',allowCommit:false,script:`const p=selects.project(${JSON.stringify(scope.projectId)});const ids=(await p.meta()).draftIds;const d=ids?.length?selects.draft(ids[0]):await p.createDraft({name:'Template recovery support check'});return {supported:typeof d.clipSourceWindow==='function'&&typeof d.clipTransform==='function'&&typeof d.clipAudio==='function'};`});
  check();if(capability.isError||capability.result?.supported!==true)fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to confirm saved assembly state before retrying.');
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateRunJSON(frozen))}),{__beforeCommit:__templateBeforeCommit})`);
  const script=`return await(async(assemble,readFacts,readState,publish,json,encode,readFull,stateJSON,stateFile)=>{
   let result,preparedState,preparedFull,snapshot,maySave=false;
   try{
    result=await assemble(async draft=>{
     if(maySave)throw Error('The assembly pre-save hook ran more than once.');
     preparedState=await readState(draft);
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState}});
     if(${options.captureState===true}){
      preparedFull=stateJSON(await readFull(draft));
      const path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
      json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:'x'.repeat(1024),...preparedState,stateFile:{path,size:preparedFull.length,sha256:'x'.repeat(64)}}});
      snapshot=await stateFile(selects,path,preparedFull,encode);
     }
     maySave=true;
    });
    if(!maySave)throw Error('The assembly skipped its pre-save confirmation.');
    const facts=await readFacts(selects,${JSON.stringify(scope.projectId)},result?.sequenceId,readState);
    const {draftId,...savedState}=facts;
    if(json(savedState)!==json(preparedState))throw Error('The saved Draft disagrees with its prepared state.');
    if(facts.fps!==result.fps||facts.durationFrames!==result.totalFrames)throw Error('The assembly result disagrees with its saved Draft.');
    if(snapshot)await stateFile(selects,snapshot.path,stateJSON(await readFull(selects.draft(facts.draftId))),encode,snapshot);
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts,...snapshot?{stateFile:snapshot}:{}},json,encode);
    if(receipt.runReceiptSaved!==true)throw Error('The assembly receipt could not be confirmed.');
    return {assembly:result,facts:{...facts,...snapshot?{stateFile:snapshot}:{}}};
   }catch(error){
    if(typeof result?.sequenceId==='string'&&result.sequenceId)await publish(selects,${templateRunJSON(claim)},{status:'outcomeUnknown',draftId:result.sequenceId},json,encode);
    else if(!maySave)await publish(selects,${templateRunJSON(claim)},{status:'notSaved'},json,encode);
    throw error;
   }
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateAssemblyFacts.toString()},${readTemplateAssemblyState.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()});`;
  if(new TextEncoder().encode(script).length>256*1024)fail('TEMPLATE_RUN_INVALID','The assembly request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Assemble template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts||!reply.result?.assembly)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The assembly response could not be confirmed. Inspect the Project before starting another run.'),{cause:Error(String(reply.output||'The SDK returned no complete assembly result.'))});
  const confirmed=await verify(reply.result.facts);
  return {...reply.result.assembly,...confirmed,notes:reply.result.assembly.notes??[]};
 },verify,{existingOnly:options.receiptOnly===true});
}

// The base assembly record proves which Draft belongs to this workflow. A phase
// receipt supersedes its earlier state for recovery; unknown outcomes never save
// again. Only positively recorded pre-save failures permit a new phase attempt.
async function executeTemplateDecoration(sdk,files,pending,config,source,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};check();
 if(!pending?.scope||!config||config.projectId!==pending.scope.projectId||typeof config.sequenceId!=='string'||!config.sequenceId||typeof source!=='string'||!source.startsWith('// @template-decoration 1\n')||source.split('__CONFIG__').length!==2)fail('TEMPLATE_RUN_INVALID','The title/look request is incomplete.');
 templateStateJSON(pending,262144);
 pending=JSON.parse(JSON.stringify(pending));
 const frozen=JSON.parse(templateStateJSON(config,262144)),recipe=templateStateJSON({config:frozen,source},262144);
 const base=await executeTemplateAssembly(sdk,files,pending.scope,pending.config,pending.source,isCurrent,{receiptOnly:true});check();
 if(base.sequenceId!==frozen.sequenceId||!base.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look target has no complete owned assembly receipt.');
 const target=await sdk.call('getProjectDraftScaffold',pending.scope.projectId);check();
 if(target?.owner?.projectId!==pending.scope.projectId||typeof target.owner.libraryId!=='string')fail('TEMPLATE_RUN_TARGET','The title/look target belongs to a different Project.');
 const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
 const rootScope={pluginId:pending.scope.pluginId,libraryId:target.owner.libraryId,projectId:pending.scope.projectId,runId:pending.scope.runId};
 const scope={...rootScope,runId:'look-'+await digest(templateRunJSON(rootScope))},request={phase:'decoration',draftId:base.sequenceId,recipeDigest:await digest(recipe),assemblyState:base.stateFile};
 const verify=async receipt=>{
  check();if(receipt.draftId!==frozen.sequenceId||!receipt.stateFile)fail('TEMPLATE_RUN_INVALID','The title/look receipt could not be verified.');
  const script=`const p=selects.project(${JSON.stringify(scope.projectId)});if(!(await p.meta()).draftIds.includes(${JSON.stringify(receipt.draftId)}))throw Error('The title/look Draft is not in its Project.');await (${templateStateFile.toString()})(selects,${JSON.stringify(receipt.stateFile.path)},(${templateStateJSON.toString()})(await (${readTemplateSavedState.toString()})(selects.draft(${JSON.stringify(receipt.draftId)}))),${templateRunBase64.toString()},${JSON.stringify(receipt.stateFile)});return {verified:true};`;
  const reply=await sdk.runScript({summary:'Confirm owned title and look',allowCommit:false,script});check();
  if(reply.isError||reply.result?.verified!==true)fail('TEMPLATE_RUN_INVALID','The saved title/look state has changed or could not be read. Inspect the Draft before another run.');
  return {sequenceId:receipt.draftId,fps:base.fps,totalFrames:base.totalFrames,decorationConfirmed:true};
 };
 const work=executeTemplateRun(sdk,files,scope,request,isCurrent,async(claim,onDispatch)=>{
  const body=source.replace('__CONFIG__',()=>`Object.assign(JSON.parse(${JSON.stringify(templateStateJSON(frozen,262144))}),{__beforeCommit:__templateBeforeCommit})`);
  const script=`return await(async(decorate,readFull,stateJSON,stateFile,publish,json,encode)=>{
   let prepared,snapshot,maySave=false,preparedOnce=false;
   try{
    const original=selects.draft(${JSON.stringify(frozen.sequenceId)});
    if(!(await selects.project(${JSON.stringify(scope.projectId)}).meta()).draftIds.includes(${JSON.stringify(frozen.sequenceId)}))throw Error('The title/look target is not in its Project.');
    await stateFile(selects,${JSON.stringify(base.stateFile.path)},stateJSON(await readFull(original)),encode,${JSON.stringify(base.stateFile)});
    const result=await decorate(async(draft,committing)=>{
     if(preparedOnce)throw Error('The title/look pre-save hook ran more than once.');preparedOnce=true;
     prepared=await readFull(draft);const text=stateJSON(prepared),path=${JSON.stringify(claim.path)}+'.state-'+JSON.parse(${templateRunJSON(claim)}.expectedText).owner+'.json';
     snapshot=await stateFile(selects,path,text,encode);
     const clips=prepared.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
     json({...JSON.parse(${templateRunJSON(claim)}.expectedText),status:'saved',result:{draftId:${JSON.stringify(frozen.sequenceId)},fps:prepared.fps,durationFrames:prepared.durationFrames,frameSize:prepared.frameSize,clips,stateFile:snapshot}});
     maySave=committing===true;
    });
    if(!preparedOnce)throw Error('The title/look operation skipped its pre-save hook.');
    const observed=await readFull(selects.draft(${JSON.stringify(frozen.sequenceId)}));
    await stateFile(selects,snapshot.path,stateJSON(observed),encode,snapshot);
    const clips=observed.clips.filter(c=>c.trackKind==='main'&&c.resourceId).map(({clipId,trackId,resourceId,startFrame,endFrame})=>({clipId,trackId,resourceId,startFrame,endFrame}));
    const facts={draftId:${JSON.stringify(frozen.sequenceId)},fps:observed.fps,durationFrames:observed.durationFrames,frameSize:observed.frameSize,clips,stateFile:snapshot};
    const receipt=await publish(selects,${templateRunJSON(claim)},{status:'saved',...facts},json,encode);if(!receipt.runReceiptSaved)throw Error('The title/look receipt could not be confirmed.');return {facts,result};
   }catch(error){await publish(selects,${templateRunJSON(claim)},{status:maySave?'outcomeUnknown':'notSaved',...maySave?{draftId:${JSON.stringify(frozen.sequenceId)}}:{}},json,encode);throw error;}
  })(async(__templateBeforeCommit)=>{${body}},${readTemplateSavedState.toString()},${templateStateJSON.toString()},${templateStateFile.toString()},${writeTemplateRunResult.toString()},${templateRunJSON.toString()},${templateRunBase64.toString()});`;
  if(new TextEncoder().encode(script).length>262144)fail('TEMPLATE_RUN_INVALID','The title/look request exceeds the SDK transport limit.');
  await onDispatch();const reply=await sdk.runScript({summary:'Decorate template with owned receipt',allowCommit:true,script});
  if(reply.isError||!reply.result?.facts)throw Object.assign(templateRunIssue('TEMPLATE_RUN_PENDING','The title/look save is awaiting confirmation. Check the same run again.'),{draftId:frozen.sequenceId,cause:Error(String(reply.output||'No complete title/look result.'))});
  return verify(reply.result.facts);
 },verify,{retryNotSaved:true});
 return work.catch(cause=>{
  check();
  const known=cause?.outcome==='notSaved'||cause?.code==='TEMPLATE_RUN_NOT_SAVED';
  const message=known?'The title/look attempt stopped before saving. Retry its original inputs.':cause?.publicMessage||'The title/look save is awaiting confirmation. Check the same run again.';
  throw Object.assign(templateRunIssue(cause?.code||'TEMPLATE_RUN_PENDING',message),{phase:'decoration',draftId:base.sequenceId,cause,...known?{outcome:'notSaved'}:{}});
 });
}

// Discover an uncertain standalone assembly after its renderer realm is gone.
// Payloads are published before their small exclusive manifest. Completed run
// tombstones prevent an old callback from republishing the same run identity.
async function openTemplateAssemblyContinuations(sdk,files,target,isCurrent){
 const fail=(code,message)=>{throw templateRunIssue(code,message);};
 const invalid=()=>fail('TEMPLATE_RUN_INVALID','The pending assembly record could not be verified. Inspect the Project before starting another run.');
 const check=()=>{if(!isCurrent())fail('TEMPLATE_RUN_DETACHED','The template run ended.');};
 check();
 if(!target||typeof target.pluginId!=='string'||!/^[a-z0-9-]+$/.test(target.pluginId)||typeof target.projectId!=='string'||!target.projectId||target.projectId.length>1024)invalid();
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:target.libraryId};
 if(!files||!['join','homedir','exists','stat','readRange','writeFile','mkdir','readdir','rm'].every(key=>typeof files[key]==='function')||typeof sdk?.call!=='function'||typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.TextEncoder!=='function'||typeof globalThis.TextDecoder!=='function')fail('TEMPLATE_RUN_UNSUPPORTED','Update Selects to find pending template runs safely.');
 const owner=await sdk.call('getProjectDraftScaffold',target.projectId);check();
 if(owner?.owner?.projectId!==target.projectId||typeof owner.owner.libraryId!=='string'||!owner.owner.libraryId||target.libraryId!=null&&target.libraryId!==owner.owner.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');
 target={pluginId:target.pluginId,projectId:target.projectId,libraryId:owner.owner.libraryId};
 const current=async()=>{check();const row=await sdk.call('getProjectDraftScaffold',target.projectId);check();if(row?.owner?.projectId!==target.projectId||row.owner.libraryId!==target.libraryId)fail('TEMPLATE_RUN_TARGET','The pending assembly belongs to a different Project or library.');};
 const json=value=>{
  let text;
  try{text=JSON.stringify(value,(_key,item)=>{if(typeof item==='number'&&!Number.isFinite(item)||['bigint','function','symbol'].includes(typeof item))throw Error('Unsupported value');return item;}).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));}catch{invalid();}
  if(text.length>262144)fail('TEMPLATE_RUN_INVALID','The pending assembly exceeds its 256 KiB input limit.');
  return text;
 };
 const hash=async text=>{const result=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');check();return result;};
 const directory=files.join(files.homedir(),'.selects','plugin-data',target.pluginId,'template-runs','assembly-pending',await hash(json(target)));
 const completed=files.join(directory,'acknowledged');
 const readText=async(path,limit)=>{
  for(let attempt=0;attempt<3;attempt++){
  check();const before=await files.stat(path);check();if(!before)return null;
  if(before.isDirectory===false&&before.size===0)continue;
  if(before.isDirectory!==false||!Number.isSafeInteger(before.size)||before.size<1||before.size>limit)invalid();
  const bytes=await files.readRange(path,0,before.size);check();const after=await files.stat(path);check();
  if(!after)return null;
  if(['size','mtimeMs','ino'].some(key=>before[key]!==after[key]))continue;
  if(Object.prototype.toString.call(bytes)!=='[object Uint8Array]'||bytes.byteLength!==before.size)invalid();
  return new TextDecoder().decode(bytes);
  }
  fail('TEMPLATE_RUN_PENDING','The pending assembly record is changing. Check it again.');
 };
 const parse=text=>{try{return JSON.parse(text);}catch{invalid();}};
 const manifest=async row=>{
  if(!row||Object.keys(row).length!==3||row.version!==1||typeof row.digest!=='string'||!/^[a-f0-9]{64}$/.test(row.digest)||!row.scope||Object.keys(row.scope).length!==4||Object.keys(target).some(key=>row.scope[key]!==target[key])||typeof row.scope.runId!=='string'||!row.scope.runId||row.scope.runId.length>1024)invalid();
  return await hash(json(row.scope));
 };
 const done=async(row,key)=>{
  const text=await readText(files.join(completed,key+'.json'),49152);if(text===null)return false;
  const end=parse(text);if(!end||!['saved','notSaved'].includes(end.status)||json(end.record)!==json(row))invalid();return true;
 };
 const validate=(value,row,kind='assembly')=>{
  if(!value||json(value.scope)!==json(row.scope)||value.config?.projectId!==target.projectId||typeof value.source!=='string'||!value.source.startsWith(kind==='look'?'// @template-decoration 1\n':'// @template-assembly 1\n')||value.source.split('__CONFIG__').length!==2)invalid();
  // Match the existing assembly adapter's request budget before any new save.
  if(kind==='look'){
   if(typeof value.config.sequenceId!=='string'||value.assembly?.sequenceId!==value.config.sequenceId)invalid();
   templateStateJSON({config:value.config,source:value.source},262144);
  }else{const {draftName,...content}=value.config;templateRunJSON({config:content,source:value.source});}
  return value;
 };
 const load=async(row,key,kind='assembly')=>{
  if(await manifest(row)!==key)invalid();
  const name=key+(kind==='look'?'.look':'')+'-'+row.digest+'.data';
  const text=await readText(files.join(directory,name),262144)??await readText(files.join(completed,name),262144);
  if(text===null)invalid();if(await hash(text)!==row.digest)invalid();
  return validate(parse(text),row,kind);
 };
 const recordOf=async(pending,kind='assembly')=>{
  if(!pending?.scope||Object.keys(target).some(key=>key==='libraryId'?pending.scope[key]!=null&&pending.scope[key]!==target[key]:pending.scope[key]!==target[key]))invalid();
  const scope={...target,runId:pending.scope.runId},text=json({...pending,scope}),row={version:1,scope,digest:await hash(text)},key=await manifest(row);
  return {row,key,text,value:validate(parse(text),row,kind)};
 };
 const store=async(pending,kind='assembly',allowCompleted=false)=>{
  pending=JSON.parse(json(pending));
  await current();const item=await recordOf(pending,kind),{row,key,text}=item,name=key+(kind==='look'?'.look':'');
  if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  await files.mkdir(directory,{recursive:true});check();
  const file=files.join(directory,name+'.json'),expected=templateRunJSON(row),prior=await readText(file,49152);
  if(prior!==null&&prior!==expected)invalid();
  const dataPath=files.join(directory,name+'-'+row.digest+'.data');
  if(await files.exists(dataPath)){if(await readText(dataPath,262144)!==text)invalid();}
  else{check();await files.writeFile(dataPath,text);check();}
  try{check();await files.writeFile(file,expected,{flag:'wx'});}catch(error){
   const actual=await readText(file,49152);if(actual===null)throw error;if(actual!==expected)invalid();
  }
  check();if(kind==='assembly'&&await done(row,key)){
   if(allowCompleted)return load(row,key);
   fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');
  }
  try{return await load(row,key,kind);}catch(error){if(kind==='assembly'&&await done(row,key))fail('TEMPLATE_RUN_COMPLETED','This assembly was already confirmed. Start a new run for another Draft.');throw error;}
 };
 const read=async(runId=null,includeCompleted=false)=>{
  if(runId!==null){
   await current();if(typeof runId!=='string'||!runId||runId.length>1024)invalid();
   const key=await hash(json({...target,runId})),text=await readText(files.join(directory,key+'.json'),49152);
   let row=text===null?null:parse(text);
   if(!row&&includeCompleted){const end=await readText(files.join(completed,key+'.json'),49152);if(end!==null){const value=parse(end);if(!['saved','notSaved'].includes(value?.status))invalid();row=value.record;}}
   if(!row)return null;if(await manifest(row)!==key)invalid();
   if(!includeCompleted&&await done(row,key))return null;
   return load(row,key);
  }
  await current();if(!await files.exists(directory)){check();return null;}
  const names=await files.readdir(directory);check();
  if(!Array.isArray(names)||names.length>4096||names.some(name=>typeof name!=='string'||name.includes('/')||name.includes('\\')))invalid();
  const entries=names.filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
  if(entries.length>64)fail('TEMPLATE_RUN_PENDING','Too many pending assemblies need inspection before another run.');
  const found=[];
  for(const name of entries.sort()){
   const text=await readText(files.join(directory,name),49152);if(text===null)continue;
   const row=parse(text),key=await manifest(row);if(name!==key+'.json')invalid();
   if(!await done(row,key)){
    try{found.push(await load(row,key));}catch(error){if(!await done(row,key))throw error;}
   }
  }
  if(found.length>1)fail('TEMPLATE_RUN_AMBIGUOUS','Several unfinished assemblies belong to this Project. Inspect their run records before starting another run.');
  return found[0]??null;
 };
 const lookFor=async pending=>{
  const {row:root,key}=await recordOf(pending);
  const text=await readText(files.join(directory,key+'.look.json'),49152)??await readText(files.join(completed,key+'.look.json'),49152);
  if(text===null)return null;const row=parse(text);if(await manifest(row)!==key||json(row.scope)!==json(root.scope))invalid();return load(row,key,'look');
 };
 const acknowledge=async(pending,status,retain=false)=>{
  await current();const {row,key,text:rootText}=await recordOf(pending);
  await files.mkdir(completed,{recursive:true});check();
  let look=null,lookRow=null;
  if(retain){
   await files.writeFile(files.join(completed,key+'-'+row.digest+'.data'),rootText);check();
   look=await lookFor(pending);
   if(look){lookRow=await recordOf(look,'look');await files.writeFile(files.join(completed,key+'.look-'+lookRow.row.digest+'.data'),lookRow.text);check();await files.writeFile(files.join(completed,key+'.look.json'),templateRunJSON(lookRow.row));check();}
  }
  const path=files.join(completed,key+'.json'),text=templateRunJSON({record:row,status});
  try{await files.writeFile(path,text,{flag:'wx'});}catch(error){if(await readText(path,49152)!==text)throw error;}
  check();
  // Only this immutable run's files are removed. Its tombstone is retained.
  await files.rm(files.join(directory,key+'.json'),{force:true}).catch(()=>{});check();
  await files.rm(files.join(directory,key+'-'+row.digest+'.data'),{force:true}).catch(()=>{});check();
  if(lookRow){await files.rm(files.join(directory,key+'.look.json'),{force:true}).catch(()=>{});check();await files.rm(files.join(directory,key+'.look-'+lookRow.row.digest+'.data'),{force:true}).catch(()=>{});check();}
 };
 const resumeAssembly=async pending=>{
  const value=await store(pending);
  let result;
  try{result=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;});}
  catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved');throw error;}
  check();if(result?.assemblyConfirmed!==true)invalid();
  await acknowledge(value,'saved');return result;
 };
 const workflow=async(pending,prepareLook,onAssembly=()=>{})=>{
  const value=await store(pending,'assembly',true);let look=await lookFor(value);
  if(!look){
   let assembly;
   try{assembly=await executeTemplateAssembly(sdk,files,value.scope,value.config,value.source,()=>{check();return true;},{captureState:true});}
   catch(error){if(error?.outcome==='notSaved'||error?.code==='TEMPLATE_RUN_NOT_SAVED')await acknowledge(value,'notSaved',true);throw error;}
   check();let prepared;
   try{prepared=await prepareLook(JSON.parse(json(value)),{...assembly});check();}catch(cause){check();throw Object.assign(templateRunIssue('TEMPLATE_LOOK_PREPARATION','The original title/look inputs could not be prepared. Check this run again.'),{phase:'decoration',draftId:assembly.sequenceId,cause});}
   look=await store({...prepared,scope:value.scope,assembly},'look');
  }
  await onAssembly(JSON.parse(json(value)),{...look.assembly});check();
  const result=await executeTemplateDecoration(sdk,files,value,look.config,look.source,()=>{check();return true;});check();
  await acknowledge(value,'saved',true);
  return {...look.assembly,...result};
 };
 return {read,store:pending=>store(pending),run:resumeAssembly,workflow};
}
// template-run:end
async function nativeImagePlacement(selects,input,placeImages,sourceFacts,bindPlacement) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const result=await placeImages(selects,projectId,draft,plan,sources,items,sourceFacts,bindPlacement);
 await draft.commitAll('Place original editable Images');
 return {...result,status:'committed'};
}
export async function placeNativeImages(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 items=plan.occurrences.map((item,index)=>({...item,source:index}));
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeImageRun(sdk,`return await (${nativeImagePlacement.toString()})(selects,${JSON.stringify(input)},${placeWorkingCopyImages.toString()},${nativeImageSources.toString()},${bindMediaPlacement.toString()});`,'Place original editable Images',true);
 // A separate script reads persisted state, rather than verifying the same working copy.
 await nativeImageRun(sdk,`const d=selects.draft(${JSON.stringify(draftId)}),clips=await d.clips({trackScope:'all'});for(const expected of ${JSON.stringify(result.placements)}){const actual=clips.find(c=>c.clipId===expected.clipId);if(!actual||actual.trackId!==expected.trackId||actual.startFrame!==expected.startFrame||actual.endFrame!==expected.endFrame)throw Error('Saved Image placement could not be read back.');}if((await d.meta()).durationFrames!==${JSON.stringify(plan.durationFrames)})throw Error('Saved Image Draft duration changed.');return {ok:true};`,'Verify saved Image placement');
 return result;
}
// native-sdk:end

// The bundled files ship base64-encoded beside the Panel. They are decoded into plugin-data through the host
// FileSystem (no shell, no Node.js), each checked against the manifest's SHA-256; a copy that already matches is
// reused. Says where each sound is.
async function unpackSounds(sdk){
 hostUseSdk(sdk);if(!hostApi('FileSystem','join','homedir','exists'))throw Error('This Selects build cannot read the plugin files. Update Selects, then try again.');
 const roots=await hostRoots(sdk,'camera-shutter-dump',hostJoin('sfx','manifest.json')).catch(()=>null);
 if(!roots)throw Error('The bundled shutter sounds are missing. Reinstall the plugin.');
 if(!roots.data)throw Error('This Selects build cannot store the shutter sounds. Update Selects, then try again.');
 const manifest=JSON.parse(await hostReadText(hostJoin(roots.plugin,'sfx','manifest.json')));
 const entries=Object.entries(manifest||{});
 if(!entries.length||entries.some(([,v])=>!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v?.file||'')||!/^[0-9a-f]{64}$/.test(v?.sha256||'')))throw Error('Invalid bundled file manifest');
 const store=hostJoin(roots.data,'sfx');
 (await hostNeed('FileSystem','mkdir').mkdir(store,{recursive:true}));
 const files={};
 for(const [key,v] of entries){
  const path=hostJoin(store,v.file);
  const have=await hostReadBytes(path).catch(()=>null);
  if(!have||await sha256Hex(have)!==v.sha256){
   const bytes=Uint8Array.from(atob((await hostReadText(hostJoin(roots.plugin,'sfx',v.file+'.b64'))).replace(/\s+/g,'')),c=>c.charCodeAt(0));
   if(await sha256Hex(bytes)!==v.sha256)throw Error('Bundled sound does not match its manifest: '+v.file);
   await hostNeed('FileSystem','writeFile').writeFile(path,bytes);
  }
  files[key]={path,duration:v.duration};
 }
 return files;
}
// Lowercase hex SHA-256 of bytes (Web Crypto: the panel's, else the app window's).
async function sha256Hex(bytes){
 let subtle=null;
 try{subtle=globalThis.crypto?.subtle||window.parent?.crypto?.subtle||null;}catch{subtle=null;}
 if(!subtle)throw Error('This Selects build cannot check the shutter sounds. Update Selects, then try again.');
 return Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
// The same host path once both are normalised: NFC, forward slashes, case-folded (Windows paths ignore case).
function samePath(a,b){
 const key=p=>String(p||'').normalize('NFC').replace(/\\/g,'/').toLowerCase();
 return key(a)===key(b);
}

// Registers the bundled shutter sounds in the Project once, reusing earlier imports by path.
async function ensureSounds(sdk,projectId,stillCurrent=()=>true){
 const files=await unpackSounds(sdk);
 const filter={type:'Audio',paths:Object.values(files).map(f=>f.path)};
 let rows=await inventory(sdk,projectId,'Find shutter sounds',filter);
 const missing=Object.values(files).map(f=>f.path).filter(p=>!rows.some(r=>samePath(r.path,p)&&r.type==='Audio'));
 if(missing.length){
  if(!stillCurrent())throw Error('The template run ended before importing sounds.');
  const r=await sdk.runScript({script:`return await selects.project(${JSON.stringify(projectId)}).importFiles({paths:${JSON.stringify(missing)}});`,summary:'Import shutter sounds',allowCommit:true});
  if(r.isError)throw Error(r.output||'Could not import the shutter sounds.');
  // importFiles skips files it cannot use (e.g. media under one second) without an error.
  if((r.result?.addedResourceIds?.length??0)<missing.length)throw Error('Selects skipped the shutter sounds when importing them.');
  rows=await inventory(sdk,projectId,'Confirm shutter sounds',filter);
 }
 const ids={};
 for(const [key,f] of Object.entries(files)){const m=rows.filter(r=>samePath(r.path,f.path)&&r.type==='Audio');if(m.length<1)throw Error('Shutter sound is not ready in the Project yet. Try again in a moment.');ids[key]=m[0].resourceId;}
 return ids;
}

// av-host:start
// Local files and media tools use the public async SDK. Paths remain host-native.
let hostSdk = null;
function hostUseSdk(sdk) { hostSdk = panelLocalClient(sdk); }
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = name === "FileSystem" ? hostSdk?.files : name === "Runtime" ? hostSdk?.media : null;
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "Update Selects to use this plugin: missing SDK " + name + "." + method, name + "." + method);
  return s;
}
// The host initializes the environment before mounting the panel.
function hostIsWindows() { return /^win/i.test(String(hostSdk?.environment?.platform || "")); }
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Cleanup is best effort; all disk operations cross the async SDK bridge.
async function hostRemove(path) {
  try { await hostNeed("FileSystem", "removeFile").removeFile({ filePath: path }); } catch { /* leftover temporary file */ }
}
async function hostRoots(sdk, id, marker) {
  hostUseSdk(sdk);
  const fs = hostNeed("FileSystem", "exists");
  const plugin = fs.join(fs.homedir(), ".selects", "skills", id);
  if (!await fs.exists(fs.join(plugin, marker))) throw hostError("not-found", "the plugin folder could not be found");
  let data = fs.join(fs.homedir(), ".selects", "plugin-data", id);
  try { await fs.mkdir(data, { recursive: true }); } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end
export const DEFAULT_DRAFT_NAME='Camera shutter dump';

// The create steps, shared by the Panel and a template run. `stillCurrent` says the
// run still belongs to its Project; await `onSeed` before dispatch, then await
// `onDraft` after the complete save, even if its observer detached. Verify saved state.
export async function createPhotoDraft(sdk,{projectId,selected,framing,name,title=null,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{},runReceipt=null,onDispatch=()=>{}}){
 const fresh=await inventory(sdk,projectId,'Confirm selected photos',{type:'Image',paths:selected.map(p=>p.path)});
 if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(sdk,projectId,selected,libraryId);
 if(!stillCurrent())throw Error('The template run ended before importing sounds.');
 if(title==null){
  let named;try{named=await sdk.runScript({summary:'Read shutter dump Project title',allowCommit:false,script:`const id=${JSON.stringify(projectId)},meta=await selects.project(id).meta();if(meta.id!==id||typeof meta.title!=='string')throw Error('Could not confirm the Project title.');return {title:(${defaultTitle.toString()})(meta.title)};`});}catch{}
  if(!named||named.isError||typeof named.result?.title!=='string'){const message='Could not confirm the Project title. Reload the Project and try again.';throw Object.assign(Error(message),{publicMessage:message});}
  title=named.result.title;
 }
 const fps=await readImageDraftFps(sdk,projectId,partialDraftId),plan=scenePlan(fps);
 if(plan.fps!==fps||plan.occurrences?.length!==SLOTS||plan.sounds?.length!==SLOTS)throw Error('The reference plan is incomplete.');
 if(!stillCurrent())throw Error('The template run ended before importing sounds.');
 say('Adding shutter sounds to the Project…');
 const sounds=await ensureSounds(sdk,projectId,stillCurrent);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 const config={projectId,name,partialDraftId,runReceipt,plan,sources:prepared.sources,items:plan.occurrences.map((item,source)=>({...item,source})),main:null,
  finishRequest:{mode:'finish',projectId,draftId:partialDraftId,fps,title:defaultTitle(title),framing,sounds}};
 const finishSource=`async function(selects,config,draft,native,inspectGraphics,inspectTransforms,inspectAudio,programs){const photos=config.sources.map(({resourceId,width,height})=>({resourceId,width,height}));const input=(${normalizeFinishForPlan.toString()})({...config.finishRequest,photos,placements:native.placements},config.plan,config.finishRequest.title,true);return await (${authorFinishSource})(selects,input,config.plan,${JSON.stringify(EFFECT_CODE)},${JSON.stringify({Burst:BURST_CODE,Text:TEXT_CODE})},draft,inspectGraphics,inspectTransforms,inspectAudio,programs);}`;
 say('Creating the complete editable Draft…');
 if(!partialDraftId)await onSeed();
 if(!stillCurrent())throw Error('The template run ended before the Draft was saved.');
 const script=buildAtomicImageDraftScript(config,finishSource);
 await onDispatch();
 const reply=await sdk.runScript({summary:'Create complete shutter dump Draft',allowCommit:true,timeoutSeconds:120,script});
 if(reply.isError||!reply.result)throw Object.assign(Error(reply.output||'Could not confirm the saved Draft. Inspect the Project before retrying.'),{seedOutput:reply.output});
 const result=reply.result;
 if(result.status!=='saved'||!result.draftId)throw Object.assign(Error(result.message||'Could not confirm the saved Draft. Inspect the Project before retrying.'),{outcome:result.status,draftId:result.draftId});
 await onDraft(result.draftId);
 return verifyAtomicImageDraft(sdk,projectId,result);
}

// A template run gets its own component, so it never touches the Panel's state.
function Panel(props){
  hostUseSdk(props.sdk);return props.context?.template?<PhotoTemplateRun {...props}/>:<PhotoPanel {...props}/>;}

function PhotoPanel({sdk,context,ui}){
  useAppUpdateGuard(sdk, context?.language, () => !!(busy || running.current));
 const empty=()=>Array(SLOTS).fill('');
 const [photos,setPhotos]=React.useState([]),[slots,setSlots]=React.useState(empty),[loadedProject,setLoadedProject]=React.useState(null);
 const [framing,setFraming]=React.useState([]),[name,setName]=React.useState(DEFAULT_DRAFT_NAME);
 const [busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[saved,setSaved]=React.useState(null),[partialDraftId,setPartialDraftId]=React.useState(null);
 const running=React.useRef(false),currentProject=React.useRef(context.projectId);currentProject.current=context.projectId;
 React.useEffect(()=>{setPhotos([]);setSlots(empty());setFraming([]);setLoadedProject(null);setSaved(null);setPartialDraftId(null);setStatus('');},[context.projectId]);
 async function load(){
  if(!context.projectId||running.current)return;running.current=true;setBusy(true);setStatus('Loading project photos…');
  try{
   const projectId=context.projectId,rows=await inventory(sdk,projectId,'List project photos',{type:'Image'});
   if(currentProject.current!==projectId)return;
   setPhotos(rows);setLoadedProject(projectId);
   // Fill empty slots in Project order; the user can change any slot.
   setSlots(old=>old.map((x,i)=>x||rows[i]?.resourceId||''));
   setStatus(rows.length>=SLOTS?'Check the order of photos 1–12.':rows.length?'This Project has '+rows.length+' photos. The format needs 12; import more or choose a photo twice on purpose.':'This Project has no photos. Import photos first.');
  }catch(error){setStatus(String(error?.message||error));}finally{running.current=false;setBusy(false);}
 }
 async function create(){
  const projectId=context.projectId;
  if(running.current||!projectId||loadedProject!==projectId||slots.some(x=>!x)||!name.trim())return;
  running.current=true;setBusy(true);setStatus('Checking photos…');
  let createdDraftId=null;
  try{
   const selected=slots.map(id=>{const m=photos.filter(p=>p.resourceId===id);if(m.length!==1)throw Error('Check the selected photos again.');return m[0];});
   const done=await createPhotoDraft(sdk,{projectId,selected,framing,name:name.trim(),partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
   setPartialDraftId(null);setSaved(done);setStatus('Saved. Each photo is its own clip; adjust the focus of photos 1–10 in their clip effect. To use a different photo in a slot, change that slot here and create another Draft — the crop is sized for the original photo.');
  }catch(error){if(createdDraftId)setPartialDraftId(createdDraftId);setStatus(String(error?.message||error)+(createdDraftId?' The partial Draft is '+createdDraftId+'; it will be checked before continuing.':''));}finally{running.current=false;setBusy(false);}
 }
 const ready=!busy&&loadedProject===context.projectId;
 return <ui.Stack gap={16}><ui.Section title="Camera Shutter Dump">
  <ui.Message>Twelve photos stack into a collage on black, one per camera shutter sound (10 s). Photos 1–10 are cropped to their slots, 11–12 show whole, and every photo stays editable.</ui.Message>
  {!context.projectId&&<ui.Message>Open a Project first.</ui.Message>}
  <ui.Button variant="secondary" onClick={load} disabled={!context.projectId||busy} busy={busy}>Load Project photos</ui.Button>
  {slots.map((value,i)=><ui.Select key={i} label={'Photo '+(i+1)+(i>=10?' (landscape slot)':'')} value={value} onChange={v=>setSlots(old=>old.map((x,j)=>j===i?v:x))} options={photos.map(p=>({value:p.resourceId,label:p.name}))} placeholder="Choose photo" disabled={!ready}/>)}
  <details><summary>Adjust photo framing (optional)</summary><ui.Message>Move the visible part of each photo inside its slot. You can also change it later in each clip's effect.</ui.Message>
   {slots.map((_,i)=>{const point=framing[i]||{x:.5,y:.5};return <div key={i}><p>{'Photo '+(i+1)}</p>{['x','y'].map(axis=><ui.Slider key={axis} label={axis==='x'?'Horizontal focus':'Vertical focus'} min={0} max={1} step={.01} value={point[axis]} onChange={value=>setFraming(old=>{const next=[...old];next[i]={...(old[i]||{x:.5,y:.5}),[axis]:value};return next;})} disabled={busy}/>)}</div>;})}
  </details>
  <ui.TextField label="Draft name" value={name} onChange={setName} disabled={busy}/>
  <ui.Actions><ui.Button variant="primary" onClick={create} disabled={!ready||slots.some(x=>!x)||!name.trim()} busy={busy}>{partialDraftId?'Inspect and continue partial Draft':saved?'Create another Draft':'Create Draft'}</ui.Button></ui.Actions>
  {status&&<ui.Message>{status}</ui.Message>}
  {saved&&<ui.Button variant="secondary" onClick={()=>sdk.runScript({script:'return await selects.editor.openDraft('+JSON.stringify(saved.draftId)+');',summary:'Open saved Draft',allowCommit:false})}>Open saved Draft</ui.Button>}
 </ui.Section></ui.Stack>;
}

// --- Template run ------------------------------------------------------------
// A built-in app can run this Panel as a template: the person picks the photos
// in the app (input `photos`, in slot order) and the app mounts the Panel out of
// sight with `context.template`. It makes a new Draft through the Panel's own
// create steps with every choice at its default, never opens it, and ends with
// one `sdk.finishTemplate`.
const TEMPLATE_FAILED='Camera Shutter Dump could not make the Draft; try again.';
const TEMPLATE_UNSUPPORTED='This version of Selects cannot place photos for Camera Shutter Dump; update Selects, then try again.';
const templatePartial=name=>'Camera Shutter Dump stopped part way, so the Draft "'+name+'" may be incomplete; check it in this Project before trying again.';
const templateUncertain=name=>'Camera Shutter Dump could not confirm whether the Draft "'+name+'" was created; check this Project\'s Drafts before trying again.';
function templateIssue(message){const error=Error(message);error.publicMessage=message;return error;}
// The run report of the step that creates the Draft: its leading JSON object.
function templateReport(output){
 const text=String(output||'');
 for(let end=text.lastIndexOf('}');end>=0;end=text.lastIndexOf('}',end-1)){try{const value=JSON.parse(text.slice(0,end+1));return value&&typeof value==='object'?value:null;}catch{}}
 return null;
}
// That step failed without a Draft id: a report with an error and no committed
// edit means nothing was saved; anything else may have saved.
function templateSeedMessage(error,name){
 if(error?.outcome==='notSaved')return 'No Draft was created. The operation stopped before saving the Draft.';
 const report=templateReport(error?.seedOutput);
 const edits=Array.isArray(report?.edits)?report.edits:[];
 if(typeof report?.error!=='string'||edits.some(edit=>edit?.committed!==false))return templateUncertain(name);
 return 'Camera Shutter Dump could not create the Draft, so nothing was saved; try again.';
}
// The library the run works in: the one the app handed over, else (an older app)
// the open Project's page or the tab on screen, read once as the run starts.
function templateLibrary(app,projectId,template){
 if(template?.libraryId)return template.libraryId;
 const match=String(app?.location?.pathname||'').match(/libraries\/([^/]+)\/projects\/([^/]+)/);
 if(match&&match[2]===projectId)return match[1];
 return null;
}
// The app hands over its own Resource ids; the Panel works from the run_script
// Image rows, so each pick is joined to its row by its original file, the same
// file prepareNativeImages later checks the Project's Image against.
// sdk-selected-media:start
// Match host Resource ids to run_script's project-scoped ids through the SDK.
// Return only the selected files so large Projects stay below the script result limit.
async function sdkSelectedMedia(sdk, projectId, picks) {
  const before = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(before)) throw Error('Could not read the Project resources.');
  const indices = picks.map(pick => before.findIndex(row => row.resourceId === pick.resourceId));
  if (indices.includes(-1)) throw Error('A picked file is missing from this Project.');
  const response = await sdk.runScript({
    summary: 'Read selected Project files', allowCommit: false,
    script: `const p=selects.project(${JSON.stringify(projectId)});
const resources=await p.resources(),indices=${JSON.stringify(indices)};
const selected=indices.map(i=>resources[i]),ids=new Set(selected.filter(Boolean).map(r=>r.resourceId));
const files=[];
const walk=nodes=>{for(const n of nodes||[])if(n.type==='dir')walk(n.children);else if(ids.has(n.resourceId))files.push(n);};
const top=await p.sourceFiles();
if(Array.isArray(top))walk(top);else if('fileTree' in top)walk(top.fileTree);
else for(const folder of top.folders||[]){const detail=await p.sourceFiles({folder:folder.name});if('fileTree' in detail)walk(detail.fileTree);}
return {count:resources.length,rows:selected.map(r=>r?{name:r.name,type:r.type,files:files.filter(f=>f.resourceId===r.resourceId).map(f=>({resourceId:f.resourceId,path:f.path}))}:null)};`
  });
  if (response.isError || !response.result || !Array.isArray(response.result.rows))
    throw Error(response.output || 'Could not read the selected Project files.');
  const result = response.result, after = await sdk.call('listProjectResources', projectId);
  if (!Array.isArray(after) || before.length !== result.count || after.length !== before.length ||
      after.some((row, i) => row.resourceId !== before[i].resourceId || row.name !== before[i].name || row.type !== before[i].type) ||
      result.rows.length !== picks.length || indices.some((index, i) =>
        result.rows[i]?.name !== before[index].name || result.rows[i]?.type !== before[index].type))
    throw Error('The selected Project files changed. Refresh your media and try again.');
  return result.rows.map((row, i) => {
    const expected = { image: 'Image', video: 'Video', audio: 'Audio' }[picks[i].kind];
    if (expected && row.type !== expected) throw Error('A picked file has the wrong media type.');
    if (row.files.length !== 1 || !row.files[0].path)
      throw Error((picks[i].name || 'A picked file') + ' is missing from this Project or matches more than one file.');
    return { ...row.files[0], resourceType: row.type };
  });
}
// sdk-selected-media:end

async function templateSelection(sdk,app,projectId,libraryId,inputs){
 const picks=Array.isArray(inputs?.photos)?inputs.photos:[];
 if(picks.length!==SLOTS||picks.some(x=>x?.kind!=='image'||!x.resourceId))throw templateIssue('Pick exactly 12 photos, then try again.');
 const pickedFiles=await sdkSelectedMedia(sdk,projectId,picks);
 const paths=pickedFiles.map(row=>row.path);
 const rows=await inventory(sdk,projectId,'List project photos',{type:'Image',paths});
 const selected=paths.map((path,i)=>{
  const matches=path?rows.filter(row=>row.path===path):[];
  if(matches.length!==1)throw templateIssue((picks[i].name||'A picked photo')+' is missing from this Project or matches more than one photo.');
  return matches[0];
 });
 return selected;
}
// One plain sentence for the person, from a failure before anything was saved.
function templateMessage(error){
 if(error?.publicMessage)return error.publicMessage;
 const said=String(error?.message||'');
 let match=said.match(/^A selected Image is not ready for editing: (.+)$/);
 if(match)return match[1]+' is not ready yet; wait for it to finish importing, then try again.';
 match=said.match(/^A selected Image is missing or ambiguous in the Project: (.+)$/);
 if(match)return match[1]+' is missing from this Project or matches more than one photo.';
 if(/^This Selects version does not support/.test(said))return TEMPLATE_UNSUPPORTED;
 if(/^The selected photos changed/.test(said))return 'The picked photos changed while the Draft was being made; try again.';
 if(/^Selects skipped the shutter sounds/.test(said))return 'This version of Selects could not add the Camera Shutter Dump sounds to this Project; update the plugin, then try again.';
 if(/not ready in the Project yet/.test(said))return 'Camera Shutter Dump is still adding its sounds to this Project; try again in a moment.';
 return TEMPLATE_FAILED;
}
// This hidden frame reports only for its pinned live run. Durable ownership
// survives a new panel realm; unknown authoring is inspected, never replayed.
function PhotoTemplateRun({sdk,context}){
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your Draft…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const projectId=context.projectId,template=context.template;
  const live=()=>alive.current&&latest.current.template?.runId===runId&&latest.current.projectId===projectId&&latest.current.template?.libraryId===template?.libraryId;
  let ended=false;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  let seeding=false,draftId=null;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a Project, then try again.');
    const app=window.parent,libraryId=templateLibrary(app,projectId,template);
    say('Finding your photos…');
    const done=await executeTemplateRun(sdk,panelLocalClient(sdk).files,{pluginId:'camera-shutter-dump',libraryId,projectId,runId},{photos:template?.inputs?.photos?.map(({resourceId,kind})=>({resourceId,kind})),framing:[],titlePolicy:'project'},live,async(runReceipt,onDispatch)=>{
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const result=await createPhotoDraft(sdk,{projectId,selected,runReceipt,onDispatch,framing:[],name:DEFAULT_DRAFT_NAME,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});return result;
    },result=>verifyAtomicImageDraft(sdk,projectId,result));
    draftId=done.draftId;
    if(!draftId||!Array.isArray(done.clips)||done.clips.length!==SLOTS)throw Error('The saved Draft did not report its id.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
    if(!draftId&&error?.draftId)draftId=error.draftId;
    console.warn('[Camera Shutter Dump] template run failed:',error?.message||String(error),{draftId,seeding});
    say('Stopped.');
    finish({error:draftId?templatePartial(DEFAULT_DRAFT_NAME):seeding?templateSeedMessage(error,DEFAULT_DRAFT_NAME):templateMessage(error)});
   }finally{
    finish({error:TEMPLATE_FAILED});
   }
  })();
 },[runId]);
 return <p role="status" style={{margin:0,fontSize:12,color:'var(--panel-muted-fg)'}}>{status}</p>;
}

// Only read-only media queries use this: keep every row without exceeding run_script's response limit.
async function readMediaPages(sdk, args) {
  let result, total;
  for (let offset = 0; ; offset += 32) {
    const script = `const value=await(async()=>{${args.script}\n})();const array=Array.isArray(value);const data=array?{rows:value}:value;const page={};let total=0;for(const key of Object.keys(data)){const rows=data[key];page[key]=Array.isArray(rows)?rows.slice(${offset},${offset + 32}):rows;if(Array.isArray(rows))total=Math.max(total,rows.length);}return {array,page,total};`;
    const reply = await sdk.runScript({ ...args, script, allowCommit: false });
    if (reply.isError || !reply.result?.page) throw new Error(reply.output || 'Could not read the Project media.');
    const batch = reply.result;
    if (total !== undefined && total !== batch.total) throw new Error('Project media changed while loading. Try again.');
    total = batch.total;
    if (offset === 0) result = batch.page;
    else for (const key of Object.keys(batch.page)) if (Array.isArray(batch.page[key])) result[key].push(...batch.page[key]);
    if (offset + 32 >= total) return { ...reply, result: batch.array ? result.rows : result };
  }
}

// local-sdk:start
/** Pure host-platform path operations; no filesystem or renderer globals. */
function panelLocalPaths(platform: string) {
  const windows = platform === "win32";
  const slash = (path: string) => {
    if (typeof path !== "string")
      throw new TypeError("A path must be a string.");
    return windows ? path.replace(/\\/g, "/") : path;
  };
  const rootOf = (path: string) => {
    if (windows) {
      const unc = path.match(/^\/\/[^/]+\/[^/]+\/?/);
      if (unc) return unc[0].replace(/\/?$/, "/");
      const drive = path.match(/^[a-z]:\/?/i);
      if (drive) return drive[0];
    }
    return path.startsWith("/") ? "/" : "";
  };
  const native = (value: string) =>
    windows ? value.replace(/\//g, "\\") : value;
  const normalize = (value: string) => {
    const path = slash(value),
      root = rootOf(path),
      absolute = root.endsWith("/");
    const segments: string[] = [];
    for (const segment of path
      .slice(Math.min(root.length, path.length))
      .split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === ".." && segments.length && segments.at(-1) !== "..")
        segments.pop();
      else if (segment !== ".." || !absolute) segments.push(segment);
    }
    let result = root + segments.join("/");
    if (!result || (windows && /^[a-z]:$/i.test(result))) result += ".";
    if (path.endsWith("/") && !result.endsWith("/")) result += "/";
    return native(result);
  };
  const basename = (value: string, extension?: string) => {
    const path = slash(value).replace(/\/+$/, "");
    const withoutDrive = windows ? path.replace(/^[a-z]:/i, "") : path;
    const name = withoutDrive.slice(withoutDrive.lastIndexOf("/") + 1);
    return extension && name.endsWith(extension)
      ? name.slice(0, -extension.length)
      : name;
  };
  return {
    normalize,
    join: (...paths: string[]) => {
      const parts = paths.map(slash).filter(Boolean);
      let joined = parts.join("/");
      if (windows && !/^\/\/[^/]/.test(parts[0] || ""))
        joined = joined.replace(/^\/{2,}/, "/");
      return normalize(joined);
    },
    dirname(value: string) {
      const path = slash(value),
        root = rootOf(path);
      const end = path.replace(/\/+$/, "").lastIndexOf("/");
      if (end < root.length) return value.slice(0, root.length) || ".";
      return value.slice(0, end);
    },
    basename,
    extname(value: string) {
      const name = basename(value),
        dot = name.lastIndexOf(".");
      return dot <= 0 || name === ".." ? "" : name.slice(dot);
    },
    isAbsolute: (value: string) => rootOf(slash(value)).endsWith("/"),
  };
}


/** Plugin-private composition of canonical SDK methods, not a public SDK surface. */
async function createPanelLocalClient(sdk: any) {
  const SCRIPT_BYTES = 256 * 1024;
  const runSource = async (script: string, write = false) => {
    if (new TextEncoder().encode(script).byteLength > SCRIPT_BYTES) throw new Error("The local file script exceeds the 256 KiB limit.");
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script,
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  // Direct arguments keep object literals contextually typed by the SDK signature.
  const run = (method: string, args: unknown[], write = false) =>
    runSource("return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");", write);
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  // Three encoded chunks occupy 192 KiB, below the Panel's default 256 KiB result
  // budget. The same script still awaits each canonical file operation in order.
  const fileBatch = async (method: "readRange" | "writeChunk", inputs: unknown[], lengths: number[]) => {
    let count = Math.min(3, inputs.length), script = "";
    while (count > 0) {
      script = "const rows=[];" + inputs.slice(0, count).map((input, index) => {
        const call = "{const result=await selects.files." + method + "(" + JSON.stringify(input) + ");";
        if (method === "writeChunk")
          return call + "if(result?.bytesWritten!==" + lengths[index] + ")throw Error('The file write returned an incomplete result. Check the file before retrying.');rows.push(result);}";
        return call + "if(!result||typeof result.base64!=='string'||!Number.isSafeInteger(result.bytesRead)||result.bytesRead<0||result.bytesRead>" + lengths[index] + ")throw Error('The file read returned an incomplete result.');rows.push(result);if(result.bytesRead<" + lengths[index] + ")return rows;}";
      }).join("") + "return rows;";
      if (new TextEncoder().encode(script).byteLength <= SCRIPT_BYTES) break;
      count--;
    }
    if (!count) throw new Error("The local file script exceeds the 256 KiB limit.");
    return { count, rows: await runSource(script, method === "writeChunk") };
  };
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const inputs = Array.from({ length: Math.min(3, Math.ceil((length - total) / CHUNK_BYTES)) }, (_, index) =>
        ({ path, offset: offset + total + index * CHUNK_BYTES, length: Math.min(CHUNK_BYTES, length - total - index * CHUNK_BYTES) }));
      const lengths = inputs.map(input => input.length);
      const { rows, count } = await fileBatch("readRange", inputs, lengths);
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > count) throw new Error("The file read returned an incomplete result.");
      let short = false;
      for (let index = 0; index < rows.length; index++) {
        const result = rows[index];
        if (!result || typeof result.base64 !== "string" || !Number.isSafeInteger(result.bytesRead) || result.bytesRead < 0 || result.bytesRead > lengths[index]) throw new Error("The file read returned an incomplete result.");
        const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
        if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
        short = bytes.length < lengths[index];
        if (short && index !== rows.length - 1) throw new Error("The file read returned invalid bytes.");
        parts.push(bytes); total += bytes.length;
      }
      if (rows.length !== count && !short) throw new Error("The file read returned an incomplete result.");
      if (short) break;
    }
    const output = new Uint8Array(total);
    let position = 0;
    for (const bytes of parts) { output.set(bytes, position); position += bytes.length; }
    return output;
  };
  const files = {
    ...paths,
    homedir: () => environment.homedir,
    getOrCreateTmpDirPath: async () => environment.tempDirectory,
    exists: (path: string) => run("files.exists", [path]),
    stat: (path: string) => run("files.stat", [path]),
    readdir: (path: string) => run("files.readdir", [path]),
    readRange,
    async readFile(path: string, encoding?: string) {
      const stat = await run("files.stat", [path]);
      if (!stat || !Number.isSafeInteger(stat.size) || stat.size < 0) throw new Error("The file is unavailable.");
      const bytes = await readRange(path, 0, stat.size);
      if (bytes.length !== stat.size) throw new Error("The file changed while it was being read.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      return encoding === "utf8" ? new TextDecoder().decode(bytes) : bytes;
    },
    async writeFile(path: string, data: string | Uint8Array, options?: string | { encoding?: string; flag?: "w" | "a" | "wx" }) {
      const encoding = typeof options === "string" ? options : options?.encoding;
      const flag = typeof options === "object" ? options.flag : undefined;
      if (flag !== undefined && !["w", "a", "wx"].includes(flag)) throw new Error("Unsupported file write flag.");
      if (encoding !== undefined && encoding !== "utf8") throw new Error("Only utf8 text encoding is supported.");
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      if ((flag === "a" || flag === "wx") && bytes.length > CHUNK_BYTES) throw new Error("Atomic append and exclusive creation are limited to 48 KiB.");
      // Each complete replacement has its own sibling file. Other panels cannot
      // overwrite one of its chunks before the final atomic rename publishes it.
      const replacement = flag !== "a" && flag !== "wx";
      const destination = replacement ? path + ".tmp-" + crypto.randomUUID() : path;
      let published = false;
      try {
        let offset = 0;
        do {
          const inputs = [], lengths = [];
          for (let index = 0; index < (replacement ? 3 : 1) && (offset + index * CHUNK_BYTES < bytes.length || index === 0); index++) {
            const position = offset + index * CHUNK_BYTES, chunk = bytes.subarray(position, position + CHUNK_BYTES);
            let binary = "";
            for (const byte of chunk) binary += String.fromCharCode(byte);
            const mode = position === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
            inputs.push({ path: destination, offset: position, base64: btoa(binary), ...(mode ? { mode } : {}) });
            lengths.push(chunk.length);
          }
          if (!replacement) {
            const result = await run("files.writeChunk", [inputs[0]], true);
            if (result?.bytesWritten !== lengths[0]) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
          } else {
            const { rows, count } = await fileBatch("writeChunk", inputs, lengths);
            if (!Array.isArray(rows) || rows.length !== count || rows.some((row, index) => row?.bytesWritten !== lengths[index])) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
            lengths.length = count;
          }
          offset += lengths.reduce((sum, size) => sum + size, 0);
        } while (offset < bytes.length);
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { recursive: false, force: true }], true).catch(() => {});
      }
    },
    async compareAndReplace(path: string, expectedText: string | null, text: string) {
      const encode = (value: string) => {
        const bytes = new TextEncoder().encode(value);
        if (bytes.length > CHUNK_BYTES) throw new Error("Atomic file values are limited to 48 KiB.");
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary);
      };
      const result = await run("files.compareAndReplace", [{path, expectedBase64: expectedText === null ? null : encode(expectedText), base64: encode(text)}], true);
      if (typeof result?.replaced !== "boolean") throw new Error("The atomic file update returned an incomplete result. Read the file before retrying.");
      return result.replaced;
    },
    mkdir: (path: string, options?: { recursive?: boolean }) => run("files.mkdir", [path, options ?? {}], true),
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, { recursive: options?.recursive ?? false, force: options?.force ?? false }], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { recursive: false, force: true }], true),
    rename: (from: string, to: string) => run("files.rename", [from, to], true),
    copyFile: (from: string, to: string) => run("files.copy", [from, to], true),
    downloadFile: (url: string, path: string) => run("files.download", [url, path], true),
    pathToLocalURL: (path: string) => run("files.localUrl", [path]),
    localURLToPath: (url: string) => run("files.pathFromLocalUrl", [url]),
  };
  const activeJobs = new Set<string>();
  let disposed = false;
  const cancel = async (jobId: string) => {
    const response = await sdk.runScript({ summary: "Cancel local media processing", allowCommit: true, script: "await selects.media.job(" + JSON.stringify(jobId) + ").cancel();" });
    if (response.isError) throw new Error(response.output || "Media cancellation failed.");
  };
  const process = async (executable: "FFmpeg" | "FFprobe", args: string[], _withoutLog?: boolean, signal?: AbortSignal, onStdout?: (text: string) => void, onStderr?: (text: string) => void) => {
    if (disposed || signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const started = await run("media.start" + executable, [{ args }], true);
    if (!started?.jobId) throw new Error("The media process did not return a job id.");
    const jobId = started.jobId;
    activeJobs.add(jobId);
    let cancellation: Promise<void> | null = null;
    const abort = () => { cancellation ??= cancel(jobId); void cancellation.catch(() => {}); };
    signal?.addEventListener("abort", abort, { once: true });
    if (disposed || signal?.aborted) abort();
    let cursor = 0, stdout = "", stderr = "";
    try {
      while (true) {
        if (cancellation) await cancellation;
        const status = await sdk.call("getLocalMediaJobStatus", jobId, { cursor });
        if (!status || !Array.isArray(status.events)) throw new Error("Media status is unavailable.");
        if (status.truncated) throw new Error("Media output was truncated; no incomplete result was accepted.");
        for (const event of status.events) {
          if (event.stream === "stdout") { stdout += event.text; onStdout?.(event.text); }
          else { stderr += event.text; onStderr?.(event.text); }
        }
        cursor = status.nextCursor;
        if (status.state !== "running" && status.events.length === 0) {
          if (status.state === "cancelled" || signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (status.state === "failed") throw new Error(status.error || stderr || "Media processing failed.");
          return { stdout, stderr };
        }
        if (status.state === "running") await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch (error) {
      await cancel(jobId).catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      activeJobs.delete(jobId);
    }
  };
  return {
    files,
    environment,
    media: {
      runFFmpeg: (args: string[], quiet?: boolean, signal?: AbortSignal, stdout?: (text: string) => void, stderr?: (text: string) => void) => process("FFmpeg", args, quiet, signal, stdout, stderr),
      runFFprobe: (args: string[], quiet?: boolean, signal?: AbortSignal) => process("FFprobe", args, quiet, signal),
    },
    dialogs: {
      pickFilePath: (filters?: Array<{ name: string; extensions: string[] }>) => run("editor.pickFile", [{ filters }]),
      pickDirectoryPath: () => run("editor.pickDirectory", []),
      pickSavePath: (defaultPath: string) => run("editor.pickSavePath", [{ defaultPath }]),
    },
    dispose() { disposed = true; for (const jobId of activeJobs) void cancel(jobId).catch(() => {}); },
  };
}

const panelLocalClients = new WeakMap<object, any>();
function panelLocalClient(sdk: any): any {
  const client = panelLocalClients.get(sdk);
  if (!client) throw new Error("Local SDK has not initialized.");
  return client;
}
function withPanelLocalClient(Component: any) {
  return function LocalSdkPanel(props: any) {
    const [state, setState] = React.useState<any>(null);
    const reported = React.useRef(new WeakMap<object, Set<string>>());
    const key = JSON.stringify([props.context?.projectId ?? null,
      props.context?.template?.libraryId ?? props.context?.libraryId ?? null,
      props.context?.template?.runId ?? null]);
    React.useEffect(() => {
      let active = true, settled = false;
      let client: any;
      const fail = (timeout: boolean, cause?: unknown) => {
        if (!active || settled) return;
        settled = true; clearTimeout(timer);
        const error = timeout
          ? "Connecting to Selects took too long. Reopen the Project and try again."
          : "Could not connect to Selects. Reopen the Project and try again; update Selects if the problem continues.";
        // Diagnostics stay private; neither the DOM nor finishTemplate receives
        // raw SDK output, paths or an exception stack.
        setState({sdk: props.sdk, key, error, cause});
      };
      // This is a read-only bootstrap observation, not a mutation retry or cancel.
      const timer = setTimeout(() => fail(true), 30000);
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active || settled) { value.dispose(); return; }
        settled = true; clearTimeout(timer);
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk, key});
      }).catch(error => fail(false, error));
      return () => {
        active = false; clearTimeout(timer);
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk, key]);
    React.useEffect(() => {
      if (!props.context?.template || state?.sdk !== props.sdk || state?.key !== key || !state?.error) return;
      if (typeof props.sdk?.finishTemplate !== "function") return;
      const seen = reported.current.get(props.sdk) ?? new Set<string>();
      if (seen.has(key)) return;
      seen.add(key); reported.current.set(props.sdk, seen);
      // A failed connection never mounts the child, so the wrapper must finish
      // a hidden app run itself. Visible standalone panels keep an alert only.
      try { Promise.resolve(props.sdk.finishTemplate({error: state.error})).catch(() => {}); }
      catch { /* Do not replay completion or expose a transport exception. */ }
    }, [props.sdk, key, state, !!props.context?.template]);
    if (state?.sdk !== props.sdk || state?.key !== key) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    return React.createElement(Component, props);
  };
}

export default withPanelLocalClient(Panel);
// local-sdk:end

// app-update-guard:start
// Shared source, inlined into portable panels by tools/sync_app_update_guards.py.
import * as AppUpdateGuardReact from 'react';

const appUpdateGuardScopes = new WeakMap<object, any>();

/** Each mounted editor contributes a live veto; the host receives one guard per SDK. */
function useAppUpdateGuard(sdk: any, language: string | undefined, readBlocked: (context: any) => boolean) {
  const live = AppUpdateGuardReact.useRef({ language, readBlocked });
  live.current = { language, readBlocked };
  AppUpdateGuardReact.useEffect(() => {
    const api = sdk?.updates;
    if (typeof api?.registerGuard !== 'function') return;
    let group = appUpdateGuardScopes.get(api);
    if (!group) {
      group = { entries: new Set(), dispose: null };
      appUpdateGuardScopes.set(api, group);
    }
    group.entries.add(live);
    if (!group.dispose) {
      group.dispose = api.registerGuard({
        async canUpdate(context: any) {
          for (const entry of group.entries) {
            // A partially initialized editor must not lose state during reload.
            let blocked = true;
            try { blocked = Boolean(entry.current.readBlocked(context)); } catch { /* fail closed */ }
            if (blocked) {
              const korean = String(entry.current.language || '').toLowerCase().startsWith('ko');
              throw new Error(korean
                ? '\uc9c4\ud589 \uc911\uc778 \uc791\uc5c5\uc744 \ub9c8\uce58\uace0 \ubcc0\uacbd\uc0ac\ud56d\uc744 \uc800\uc7a5\ud55c \ub4a4 \uc571\uc744 \uc5c5\ub370\uc774\ud2b8\ud574\uc8fc\uc138\uc694.'
                : 'Finish the current operation and save changes before updating this app.');
            }
          }
        },
      });
    }
    return () => {
      group.entries.delete(live);
      if (!group.entries.size) {
        group.dispose?.();
        appUpdateGuardScopes.delete(api);
      }
    };
  }, [sdk?.updates]);
}
// app-update-guard:end
