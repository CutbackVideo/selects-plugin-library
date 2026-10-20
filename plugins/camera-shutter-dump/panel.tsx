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
 const text=typeof name==='string'?name.replace(/[\u0000-\u001f]+/gu,' ').trim().slice(0,48).trim():'';
 return text||'Memories';
}

export function normalizeFinish(raw){
 const keys=['mode','projectId','draftId','fps','photos','placements','framing','sounds','title'];
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!keys.includes(k))||raw.mode!=='finish')throw Error('Unsupported request');
 const clean=(value,label,max=1000)=>{if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u001f]/u.test(value))throw Error(label+' is required');return value;};
 const projectId=clean(raw.projectId,'Project ID'),draftId=clean(raw.draftId,'Draft ID',120);
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
 const plan=scenePlan(raw.fps??25);
 if(!Array.isArray(raw.placements)||raw.placements.length!==SLOT_COUNT)throw Error('Expected '+SLOT_COUNT+' Image clips');
 raw.placements.forEach((row,i)=>{const o=plan.occurrences[i];if(!row||typeof row!=='object'||row.slot!==o.slot||!Number.isSafeInteger(row.clipId)||row.clipId<0||typeof row.trackId!=='string'||!row.trackId||row.startFrame!==o.startFrame||row.endFrame!==o.endFrame)throw Error('Image placement differs from the reference plan');});
 if(new Set(raw.placements.map(p=>p.clipId)).size!==SLOT_COUNT)throw Error('Image clips must be independent');
 const sounds={};
 for(const s of plan.sounds){const id=raw.sounds?.[s.key];sounds[s.key]=clean(id,'Shutter sound Resource ID');}
 const title=defaultTitle(raw.title);
 return {projectId,draftId,fps:plan.fps,title,photos,placements:raw.placements.map(p=>({slot:p.slot,clipId:p.clipId,trackId:p.trackId,startFrame:p.startFrame,endFrame:p.endFrame})),framing,sounds};
}

export const authorFinishSource=String.raw`async function authorFinish(selects,input,plan,EFFECT_CODE,GRAPHIC_CODES){
 let commitStarted=false,stage='read';
 try{
  const project=selects.project(input.projectId),d=selects.draft(input.draftId);
  if(!(await project.meta()).draftIds?.includes(input.draftId))throw Error('Draft is not in the selected Project');
  const meta=await d.meta();
  if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||meta.frameSize?.width!==plan.canvas.width||meta.frameSize?.height!==plan.canvas.height)throw Error('Draft frame grid changed');
  const types=new Map((await project.resources()).map(r=>[r.resourceId,r.type]));
  for(const [key,id] of Object.entries(input.sounds))if(types.get(id)!=='Audio')throw Error('Shutter sound is not an Audio resource: '+key);
  const rows=await d.clips({trackScope:'all'});
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
   await d.setClipTransform({clip,enabled:true,scale:{x:o.zoom/(q*c),y:o.zoom/(q*c)},position:o.position,anchor:{x:0,y:0},rotation:0});
   if(!o.crop)continue;
   const current=(await d.clips({trackScope:'all'})).find(c=>c.clipId===clip.clipId&&c.trackId===clip.trackId);
   const focus=input.framing[i];
   stage='crop photo '+o.slot;
   await d.addVideoEffect({clip:current,label:'Photo '+o.slot+' crop',tsxCode:EFFECT_CODE,parameters:{g,focusX:focus.x,focusY:focus.y},editableParameters:[{key:'focusX',label:'Horizontal focus',type:'number',defaultValue:focus.x,min:0,max:1,step:.01},{key:'focusY',label:'Vertical focus',type:'number',defaultValue:focus.y,min:0,max:1,step:.01}]});
  }
  const sounds=[];
  for(const s of plan.sounds){
   stage='shutter sound '+s.slot;
   const r=await d.overlayResource({resource:project.resource(input.sounds[s.key]),over:await d.rangeAtFrames(s.startFrame,s.endFrame)});
   sounds.push({slot:s.slot,atFrame:r.atFrame});
  }
  for(const g of plan.graphics){
   stage='graphic '+g.label;
   // The preset's Inspector controls when this build lists them; an empty font with a
   // font control would take the user's latest font, so that control is left out.
   let defs=[];try{defs=(await selects.effectPresets?.get(g.presetId))?.editableParameters||[];}catch{defs=[];}
   defs=defs.filter(def=>!(def.key==='fontFamily'&&g.parameters.fontFamily===''));
   const placed=await d.addMotionGraphic({label:g.label,tsxCode:GRAPHIC_CODES[g.label],parameters:g.titleKey?{...g.parameters,[g.titleKey]:input.title}:g.parameters,editableParameters:defs,within:await d.rangeAtFrames(g.startFrame,g.endFrame)});
   if(placed?.startFrame!==g.startFrame||placed?.endFrame!==g.endFrame)throw Error(g.label+' landed off its frames');
   const clip=(await d.clips({trackScope:'all'})).find(c=>c.clipId===placed.clipId);
   if(!clip)throw Error(g.label+' clip is missing');
   await d.setClipTransform({clip,...g.transform});
  }
  stage='readback';
  const after=await d.clips({trackScope:'all'});
  const audio=after.filter(c=>Object.values(input.sounds).includes(c.resourceId));
  if(audio.length!==plan.sounds.length)throw Error('Expected '+plan.sounds.length+' shutter sound clips, found '+audio.length);
  for(const s of plan.sounds)if(!audio.some(c=>c.startFrame===s.startFrame))throw Error('Shutter sound '+s.slot+' is not at frame '+s.startFrame);
  commitStarted=true;const saved=await d.commitAll('Finish Camera Shutter Dump Draft');
  if(!saved?.commitId)throw Error('Draft save response did not include its commit ID');
  return {status:'saved',projectId:input.projectId,draftId:input.draftId,clips:input.placements,sounds};
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
async function nativeImageSources(selects, projectId, photos) {
 const project=selects.project(projectId), resources=await project.resources(), nodes=[];
 const visit=items=>{for(const item of items||[])item.type==='dir'?visit(item.children):nodes.push(item);};
 const overview=await project.sourceFiles();
 if('fileTree' in overview)visit(overview.fileTree);
 else for(const folder of overview.folders||[]){const detail=await project.sourceFiles({folder:folder.name});if('fileTree' in detail)visit(detail.fileTree);}
 return photos.map(photo=>{
  const matches=nodes.filter(node=>node.path===photo.path&&resources.some(resource=>resource.resourceId===node.resourceId&&resource.type==='Image'));
  if(matches.length!==1)throw Error('A selected Image is missing or ambiguous in the Project: '+photo.name);
  const row=matches[0],size=row.frameSize;
  if(!Number.isSafeInteger(size?.width)||size.width<1||!Number.isSafeInteger(size?.height)||size.height<1)throw Error('A selected Image has no verified native dimensions: '+photo.name);
  return {resourceId:row.resourceId,path:row.path,name:photo.name,width:size.width,height:size.height};
 });
}
async function nativeImageRun(sdk,script,summary,allowCommit=false) {
 const response=await sdk.runScript({script,summary,allowCommit,timeoutSeconds:120});
 if(response.isError||response.result==null)throw Error(response.output||'Image placement could not be confirmed. Inspect the Draft before retrying.');
 return response.result;
}
export async function prepareNativeImages(sdk,projectId,photos,knownLibraryId=null) {
 const sources=await nativeImageRun(sdk,`return await (${nativeImageSources.toString()})(selects,${JSON.stringify(projectId)},${JSON.stringify(photos)});`,'Verify original Project Images');
 return {sdk,projectId,sources};
}
async function nativeImagePlacement(selects,input) {
 const {projectId,draftId,plan,items,sources}=input,project=selects.project(projectId),draft=selects.draft(draftId);
 if(!(await project.meta()).draftIds.includes(draftId))throw Error('The Draft is not owned by the selected Project.');
 const meta=await draft.meta();
 if(meta.fps!==plan.fps||meta.durationFrames!==plan.durationFrames||(plan.canvas&&(meta.frameSize.width!==plan.canvas.width||meta.frameSize.height!==plan.canvas.height)))throw Error('The Draft frame grid differs from the plan.');
 const fresh=await nativeImageSources(selects,projectId,sources);
 if(fresh.some((source,index)=>source.resourceId!==sources[index].resourceId||source.width!==sources[index].width||source.height!==sources[index].height))throw Error('A selected Image changed. Prepare the Images again.');
 const placements=[];
 for(const item of items){
  const source=fresh[item.source];
  if(!source)throw Error('An Image occurrence has no source.');
  const before=new Set((await draft.clips({trackScope:'all'})).map(clip=>clip.clipId));
  await draft.overlayResource({resource:project.resource(source.resourceId),over:await draft.rangeAtFrames(item.startFrame,item.endFrame)});
  const added=(await draft.clips({trackScope:'all'})).filter(clip=>!before.has(clip.clipId));
  if(added.length!==1||added[0].resourceId!==source.resourceId||added[0].startFrame!==item.startFrame||added[0].endFrame!==item.endFrame)throw Error('The Image interval changed during placement.');
  placements.push({...item,clipId:added[0].clipId,trackId:added[0].trackId});
 }
 if((await draft.meta()).durationFrames!==plan.durationFrames)throw Error('Image placement changed the Draft duration.');
 await draft.commitAll('Place original editable Images');
 return {placements,photos:fresh.map(source=>({width:source.width,height:source.height})),status:'committed'};
}
export async function placeNativeImages(prepared,draftId,plan,items,label) {
 const {sdk,projectId,sources}=prepared;
 items=plan.occurrences.map((item,index)=>({...item,source:index}));
 const input={projectId,draftId,plan,items,sources};
 const result=await nativeImageRun(sdk,`const nativeImageSources=${nativeImageSources.toString()};return await (${nativeImagePlacement.toString()})(selects,${JSON.stringify(input)});`,'Place original editable Images',true);
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
async function ensureSounds(sdk,projectId){
 const files=await unpackSounds(sdk);
 const filter={type:'Audio',paths:Object.values(files).map(f=>f.path)};
 let rows=await inventory(sdk,projectId,'Find shutter sounds',filter);
 const missing=Object.values(files).map(f=>f.path).filter(p=>!rows.some(r=>samePath(r.path,p)&&r.type==='Audio'));
 if(missing.length){
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
// run still belongs to its Project; `onSeed` runs just before the first save and
// `onDraft` with the Draft the later steps fill. Returns the saved result.
export async function createPhotoDraft(sdk,{projectId,selected,framing,name,title=null,partialDraftId=null,libraryId=null,stillCurrent,say,onSeed=()=>{},onDraft=_id=>{}}){
 const fresh=await inventory(sdk,projectId,'Confirm selected photos',{type:'Image',paths:selected.map(p=>p.path)});
 if(selected.some(p=>fresh.filter(r=>r.resourceId===p.resourceId&&r.path===p.path&&r.type==='Image').length!==1))throw Error('The selected photos changed. Reload the Project photos.');
 const prepared=await prepareNativeImages(sdk,projectId,selected,libraryId);
 say('Adding shutter sounds to the Project…');
 const sounds=await ensureSounds(sdk,projectId);
 if(!stillCurrent())throw Error('The Project changed. Start again in the selected Project.');
 say('Creating the Draft…');
 // New Drafts take the app's default frame rate; the plan is converted to it.
 const grid=`const m=await d.meta(),want=Math.round(250*m.fps/25);if(m.durationFrames!==want||m.frameSize?.width!==720||m.frameSize?.height!==1280)throw Error('Draft frame grid differs from the reference.');`;
 let draftId,fps;
 if(partialDraftId){
  const check=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)}),id=${JSON.stringify(partialDraftId)};if(!(await p.meta()).draftIds.includes(id))throw Error('Partial Draft is not in this Project.');const d=selects.draft(id);${grid}if((await d.clips({trackScope:'all'})).some(x=>x.resourceId))throw Error('Partial Draft is not empty; inspect it before retrying.');return {draftId:id,fps:m.fps};`,summary:'Inspect partial Draft',allowCommit:false});
  if(check.isError||check.result?.draftId!==partialDraftId)throw Error(check.output||'The partial Draft cannot be safely continued.');
  ({draftId,fps}=check.result);
 }else{
  onSeed();
  const seed=await sdk.runScript({script:`const p=selects.project(${JSON.stringify(projectId)});const d=await p.createDraft({name:${JSON.stringify(name)}});await d.insertGap({seconds:10});await d.setFrameSize({width:720,height:1280});${grid}const saved=await d.commitAll('Start Camera Shutter Dump Draft');return {draftId:saved.createdDraftId,fps:m.fps};`,summary:'Create shutter dump Draft',allowCommit:true});
  if(seed.isError||!seed.result?.draftId){const error=Error(seed.output||'Could not create the Draft. Check the Project before retrying.');error.seedOutput=seed.output;throw error;}
  ({draftId,fps}=seed.result);
 }
 const plan=scenePlan(fps);
 if(plan.fps!==fps||plan.occurrences?.length!==SLOTS||plan.sounds?.length!==SLOTS)throw Error('The reference plan is incomplete.');
 onDraft(draftId);
 say('Placing 12 photos…');
 const native=await placeNativeImages(prepared,draftId,plan);
 const request={mode:'finish',projectId,draftId,fps,title:defaultTitle(title),photos:selected.map((p,i)=>({resourceId:p.resourceId,width:native.photos[i].width,height:native.photos[i].height})),placements:native.placements,framing:Array.from({length:SLOTS},(_,i)=>framing[i]||{x:.5,y:.5}),sounds};
 const script=buildFinishScript(request);
 say('Cropping photos and adding shutter sounds…');
 const result=await sdk.runScript({script,summary:'Finish shutter dump Draft',allowCommit:true,timeoutSeconds:120});
 if(result.isError||!result.result)throw Error(result.output||'Could not confirm the save. Check the Project before retrying.');
 if(result.result.status==='outcomeUnknown')throw Error('Save outcome is unknown. Check the Project Draft list before retrying.');
 if(result.result.status!=='saved')throw Error(result.result.message||'Could not save the Draft.');
 return result.result;
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
   const done=await createPhotoDraft(sdk,{projectId,selected,framing,name:name.trim(),title:context.projectName,partialDraftId,stillCurrent:()=>currentProject.current===projectId,say:setStatus,onDraft:id=>{createdDraftId=id;}});
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
// Nobody sees this frame, so it shows one status line. It starts once per run
// id and reports once, unless a newer run replaced it; a save that began is
// reported as a possibly incomplete Draft and never retried.
function PhotoTemplateRun({sdk,context}){
  useAppUpdateGuard(sdk, context?.language, () => !!(true));
 const runId=context.template?.runId,[status,setStatus]=React.useState('Making your Draft…');
 const started=React.useRef(null),alive=React.useRef(true),latest=React.useRef(context);latest.current=context;
 React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 React.useEffect(()=>{
  if(!runId||started.current===runId)return;started.current=runId;
  const live=()=>alive.current&&latest.current.template?.runId===runId;
  let ended=false;
  const finish=result=>{if(ended)return;ended=true;if(!live())return;try{sdk.finishTemplate(result);}catch{}};
  const say=text=>{if(live())setStatus(text);};
  const projectId=context.projectId,template=context.template;
  let seeding=false,draftId=null;
  (async()=>{
   try{
    if(!projectId)throw templateIssue('Open a Project, then try again.');
    const app=window.parent,libraryId=templateLibrary(app,projectId,template);
    say('Finding your photos…');
    const selected=await templateSelection(sdk,app,projectId,libraryId,template?.inputs);
    if(!live())throw Error('The template run ended before the Draft was made.');
    const done=await createPhotoDraft(sdk,{projectId,selected,framing:[],name:DEFAULT_DRAFT_NAME,title:context?.projectName,libraryId,stillCurrent:live,say,
     onSeed:()=>{if(!live())throw Error('The template run ended before the Draft was made.');seeding=true;},onDraft:id=>{draftId=id;}});
    if(!done?.draftId||done.draftId!==draftId)throw Error('The saved Draft did not report its id.');
    say('Done.');
    finish({sequenceId:done.draftId});
   }catch(error){
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
  const run = async (method: string, args: unknown[], write = false) => {
    // method names below are fixed implementation constants; values always use JSON encoding.
    // Direct arguments keep object literals contextually typed by the SDK signature.
    const response = await sdk.runScript({
      summary: "Use local media workspace",
      allowCommit: write,
      script: "return await selects." + method + "(" + JSON.stringify(args).slice(1, -1) + ");",
    });
    if (response.isError) throw new Error(response.output || "Local SDK operation failed.");
    // A clipped report has no result. Every read returning data rejects that case below.
    return response.result;
  };
  const environment = await run("files.environment", []);
  if (!environment || typeof environment.platform !== "string" || !environment.homedir)
    throw new Error("Update Selects to use this plugin's local media workspace.");
  const paths = panelLocalPaths(environment.platform);
  const CHUNK_BYTES = 48 * 1024;
  const readRange = async (path: string, offset: number, length: number) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    while (total < length) {
      const result = await run("files.readRange", [{ path, offset: offset + total, length: Math.min(CHUNK_BYTES, length - total) }]);
      if (!result || typeof result.base64 !== "string" || !Number.isInteger(result.bytesRead)) throw new Error("The file read returned an incomplete result.");
      const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
      if (bytes.length !== result.bytesRead) throw new Error("The file read returned invalid bytes.");
      parts.push(bytes); total += bytes.length;
      if (bytes.length < Math.min(CHUNK_BYTES, length - (total - bytes.length))) break;
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
        for (let offset = 0; offset < bytes.length || offset === 0; offset += CHUNK_BYTES) {
          const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
          let binary = "";
          for (const byte of chunk) binary += String.fromCharCode(byte);
          const mode = offset === 0 ? (flag === "a" ? "append" : "exclusive") : undefined;
          const result = await run("files.writeChunk", [{ path: destination, offset, base64: btoa(binary), ...(mode ? { mode } : {}) }], true);
          if (result?.bytesWritten !== chunk.length) throw new Error("The file write returned an incomplete result. Check the file before retrying.");
        }
        if (replacement) await run("files.rename", [destination, path], true);
        published = true;
      } finally {
        if (replacement && !published) await run("files.remove", [destination, { force: true }], true).catch(() => {});
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
    rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => run("files.remove", [path, options ?? {}], true),
    removeFile: ({ filePath }: { filePath: string }) => run("files.remove", [filePath, { force: true }], true),
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
    React.useEffect(() => {
      let active = true;
      let client: any;
      createPanelLocalClient(props.sdk).then(value => {
        client = {...props.sdk, ...value};
        if (!active) { value.dispose(); return; }
        panelLocalClients.set(props.sdk, client);
        setState({sdk: props.sdk});
      }).catch(error => { if (active) setState({error: String(error?.message || error)}); });
      return () => {
        active = false;
        if (client) {
          if (panelLocalClients.get(props.sdk) === client) panelLocalClients.delete(props.sdk);
          client.dispose();
        }
      };
    }, [props.sdk]);
    if (state?.error) return React.createElement("div", {role: "alert"}, state.error);
    if (state?.sdk !== props.sdk) return React.createElement("div", {role: "status"}, "Connecting to Selects…");
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
