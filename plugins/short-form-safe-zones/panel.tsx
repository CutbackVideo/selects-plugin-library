// @name Short Form Safe Zones
// @name:de Sicherheitszonen für Kurzvideos
// @name:es Zonas Seguras para Videos Cortos
// @name:fr Zones de Sécurité Format Court
// @name:it Zone Sicure per i Video Brevi
// @name:ja ショート動画セーフゾーン
// @name:pt Zonas Seguras para Vídeos Curtos
// @name:tr Kısa Video Güvenli Alanları
// @name:zh 短视频安全区
// @icon eye
// Shows platform safe zones (where TikTok, Reels, Shorts, Stories and LinkedIn
// buttons cover the video) and composition grids in the main preview. One
// switch places the guides as a single clip on the top track of the open
// Draft, and switching it off removes that clip again. The guide clip is
// coloured fuchsia and carries a "remove before export" label.

import { useState, useEffect, useCallback } from "react";

// The graphic that draws the guides. It reads the Draft's own size, so the
// same clip works on 9:16 and 16:9 Drafts.
const GUIDES_TSX = "import React from \"react\";\nimport { AbsoluteFill, useVideoConfig } from \"remotion\";\n\n// Safe-zone guides drawn over the whole Draft. Reference frames: 1080x1920\n// (vertical) and 1920x1080 (horizontal). m = [top, bottom, left, right].\n// The safe area is an L-shape: a thin right margin at the top, then a step\n// inwards where the like / comment / share buttons start (x, y = top-left\n// corner of the button column, measured from real iPhone screenshots,\n// with some padding).\nconst TT = { x: 900, y: 680 };\nconst IG = { x: 880, y: 880 };\nconst YT = { x: 880, y: 950 };\nconst LI = { x: 915, y: 990 };\nconst V = {\n  tiktok: { m: [160, 484, 60, 60], rails: [TT], name: \"TikTok\" },\n  tiktokAd: { m: [160, 672, 60, 60], rails: [TT], name: \"TikTok ad\" },\n  reels: { m: [250, 450, 65, 65], rails: [IG], name: \"Instagram Reels\" },\n  reelsAd: { m: [269, 672, 65, 65], rails: [IG], name: \"Reels ad\" },\n  stories: { m: [269, 384, 65, 65], rails: [], name: \"Stories\" },\n  shorts: { m: [288, 672, 65, 65], rails: [YT], name: \"YouTube Shorts\" },\n  linkedin: { m: [108, 320, 60, 60], rails: [LI], name: \"LinkedIn\" },\n};\nconst PINK = \"rgba(255,64,118,0.32)\";\nconst PINK_LINE = \"rgba(255,64,118,0.95)\";\nconst GREEN = \"#2BD4A4\";\nconst GRID = \"rgba(255,255,255,0.55)\";\nconst CENTRE = \"rgba(120,180,255,0.9)\";\nconst CROP = \"#F0B23A\";\n\nfunction zone(platform) {\n  const list = platform === \"universal\" || !V[platform] ? Object.values(V) : [V[platform]];\n  const m = [0, 0, 0, 0];\n  list.forEach((p) => p.m.forEach((v, i) => (m[i] = Math.max(m[i], v))));\n  const box = { x1: m[2], y1: m[0], x2: 1080 - m[3], y2: 1920 - m[1] };\n  let rails = [];\n  list.forEach((p) =>\n    p.rails.forEach((r) => {\n      if (r.x < box.x2 && r.y < box.y2 && !rails.some((q) => q.x === r.x && q.y === r.y)) rails.push(r);\n    })\n  );\n  rails = rails.filter((r) => !rails.some((q) => q !== r && q.x <= r.x && q.y <= r.y));\n  // Universal: one clean step using the strictest button column.\n  if (rails.length > 1) {\n    rails = [{ x: Math.min(...rails.map((r) => r.x)), y: Math.min(...rails.map((r) => r.y)) }];\n  }\n  return { box, rails, name: platform === \"universal\" || !V[platform] ? \"Universal\" : V[platform].name };\n}\n\nfunction polygon(box, rails) {\n  const pts = [[box.x1, box.y1], [box.x2, box.y1]];\n  rails.slice().sort((a, b) => a.y - b.y).forEach((r) => {\n    const lastX = pts[pts.length - 1][0];\n    if (r.x < lastX) { pts.push([lastX, r.y]); pts.push([r.x, r.y]); }\n  });\n  pts.push([pts[pts.length - 1][0], box.y2]);\n  pts.push([box.x1, box.y2]);\n  return pts.map((p) => p.join(\",\")).join(\" \");\n}\n\n\n// ---- App UI mockup: generic icons and placeholder text at each app's typical\n// positions (no real logos). Coordinates on the 1080 x 1920 reference frame.\nconst ICON = {\n  heart: \"M50 88 L14 52 A20 20 0 0 1 50 22 A20 20 0 0 1 86 52 Z\",\n  comment: \"M50 14 C74 14 92 29 92 48 C92 67 74 82 50 82 C44 82 38 81 33 79 L16 88 L21 72 C12 65 8 57 8 48 C8 29 26 14 50 14 Z\",\n  share: \"M58 18 L92 50 L58 82 L58 62 C36 62 20 70 8 86 C12 58 28 40 58 36 Z\",\n  bookmark: \"M24 10 H76 V90 L50 70 L24 90 Z\",\n  send: \"M8 46 L92 12 L66 90 L50 58 Z\",\n  like: \"M30 44 L48 12 C56 12 60 18 58 28 L54 42 H84 C90 42 94 48 92 54 L84 84 C82 88 78 90 74 90 H30 Z M8 44 H24 V90 H8 Z\",\n  note: \"M36 20 L84 10 V66 A12 12 0 1 1 72 56 V28 L48 33 V74 A12 12 0 1 1 36 64 Z\",\n  repost: \"M20 40 V30 H72 V16 L92 36 L72 56 V42 H28 V40 Z M80 60 V70 H28 V84 L8 64 L28 44 V58 H72 V60 Z\",\n};\nconst UI_FILL = \"rgba(255,255,255,0.92)\";\nconst UI_SHADOW = \"rgba(0,0,0,0.45)\";\n\nfunction Icon({ name, cx, cy, s = 76, flip = false }) {\n  const k = s / 100;\n  const tf = `translate(${cx - s / 2} ${cy - s / 2}) scale(${k})` + (flip ? \" translate(100 100) rotate(180)\" : \"\");\n  return <path d={ICON[name]} transform={tf} fill={UI_FILL} stroke={UI_SHADOW} strokeWidth={3 / k} />;\n}\nfunction Txt({ x, y, size = 34, weight = 400, children, anchor = \"start\", fill = UI_FILL }) {\n  return <text x={x} y={y} fontSize={size} fontWeight={weight} fontFamily=\"sans-serif\" textAnchor={anchor} fill={fill} stroke={UI_SHADOW} strokeWidth={1}>{children}</text>;\n}\nfunction Count({ cx, y, children }) {\n  return <Txt x={cx} y={y} size={26} weight={600} anchor=\"middle\">{children}</Txt>;\n}\nfunction Avatar({ cx, cy, r = 40, plus = false }) {\n  return (\n    <g>\n      <circle cx={cx} cy={cy} r={r} fill=\"rgba(200,200,210,0.85)\" stroke={UI_FILL} strokeWidth={4} />\n      {plus && <circle cx={cx} cy={cy + r} r={16} fill=\"rgba(255,64,118,0.95)\" />}\n      {plus && <path d={`M${cx - 8} ${cy + r} H${cx + 8} M${cx} ${cy + r - 8} V${cy + r + 8}`} stroke=\"white\" strokeWidth={4} />}\n    </g>\n  );\n}\nfunction Pill({ x, y, w, h = 56, label, filled = false }) {\n  return (\n    <g>\n      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={filled ? UI_FILL : \"rgba(0,0,0,0.25)\"} stroke={UI_FILL} strokeWidth={3} />\n      <Txt x={x + w / 2} y={y + h / 2 + 11} size={28} weight={700} anchor=\"middle\" fill={filled ? \"#111\" : UI_FILL}>{label}</Txt>\n    </g>\n  );\n}\nfunction Search({ cx, cy }) {\n  return (\n    <g stroke={UI_FILL} strokeWidth={7} fill=\"none\">\n      <circle cx={cx - 6} cy={cy - 6} r={20} />\n      <line x1={cx + 9} y1={cy + 9} x2={cx + 26} y2={cy + 26} strokeLinecap=\"round\" />\n    </g>\n  );\n}\nfunction Dots({ cx, cy, vertical = false }) {\n  return (\n    <g fill={UI_FILL}>\n      {[-18, 0, 18].map((o) => (\n        <circle key={o} cx={vertical ? cx : cx + o} cy={vertical ? cy + o : cy} r={6} />\n      ))}\n    </g>\n  );\n}\n\n// Measured from real iPhone screenshots (1125 x 2436, 23 Sep 2026). Each app's\n// UI is drawn in the phone's own screen pixels, then mapped onto the 1080 x 1920\n// video: k = video pixels per screen pixel, tx/ty = where the video sits on screen.\n// Reels and Shorts fill the taller screen, so ~46 px of each side is cut off.\nconst SCREEN = {\n  tiktok: { k: 1 / 1.0609, tx: 10.4, ty: -150, edge: [10, 1070] },\n  reels: { k: 1 / 1.1391, tx: 52.6, ty: 0, edge: [46, 1034] },\n  shorts: { k: 1 / 1.1401, tx: 53.2, ty: 0, edge: [47, 1033] },\n  stories: { k: 1 / 1.0417, tx: 0, ty: -150, edge: null },\n  linkedin: { k: 1 / 1.0417, tx: 0, ty: -243, edge: null },\n};\nconst DIM = \"rgba(255,255,255,0.62)\";\n\nfunction Label({ x, y, children, size = 36 }) {\n  return <Txt x={x} y={y} size={size} weight={700} anchor=\"middle\">{children}</Txt>;\n}\n\nfunction TikTokScreen({ ad }) {\n  return (\n    <g>\n      <Txt x={122} y={238} size={48} weight={600} fill={DIM}>Community</Txt>\n      <Txt x={447} y={238} size={48} weight={600} fill={DIM}>Following</Txt>\n      <Txt x={714} y={238} size={48} weight={800}>For You</Txt>\n      <rect x={765} y={268} width={70} height={6} rx={3} fill={UI_FILL} />\n      <Search cx={1040} cy={216} />\n      <Avatar cx={1033} cy={960} r={64} />\n      <circle cx={1033} cy={1035} r={30} fill=\"#FE2C55\" />\n      <path d=\"M1019 1035 H1047 M1033 1021 V1049\" stroke=\"white\" strokeWidth={6} />\n      <Icon name=\"heart\" cx={1033} cy={1173} s={88} /><Label x={1033} y={1253}>535.8K</Label>\n      <Icon name=\"comment\" cx={1033} cy={1367} s={84} /><Label x={1033} y={1448}>823</Label>\n      <Icon name=\"bookmark\" cx={1033} cy={1560} s={70} /><Label x={1033} y={1643}>30.1K</Label>\n      <Icon name=\"share\" cx={1031} cy={1757} s={80} /><Label x={1033} y={1838}>11.9K</Label>\n      <circle cx={1033} cy={1975} r={60} fill=\"rgba(30,30,30,0.9)\" stroke={UI_FILL} strokeWidth={8} />\n      {ad && <Pill x={38} y={1560} w={700} h={76} label=\"Learn more\" filled />}\n      {ad && <Txt x={40} y={1668} size={32} fill={DIM}>Sponsored</Txt>}\n      <Txt x={38} y={1736} size={46} weight={700}>username</Txt>\n      <Txt x={40} y={1829} size={42}>Caption text goes here, first line</Txt>\n      <Txt x={40} y={1880} size={42}>#hashtag #fyp \u2026 more</Txt>\n      <Icon name=\"note\" cx={56} cy={2015} s={38} />\n      <Txt x={90} y={2035} size={40}>@username Original Sound</Txt>\n      <rect x={0} y={2077} width={1125} height={110} fill=\"rgba(30,30,30,0.55)\" />\n      <Txt x={97} y={2151} size={42}>Playlist \u00b7 1M+</Txt>\n    </g>\n  );\n}\n\nfunction ReelsScreen({ ad }) {\n  return (\n    <g>\n      <path d=\"M100 195 L72 225 L100 255\" fill=\"none\" stroke={UI_FILL} strokeWidth={7} strokeLinecap=\"round\" />\n      <Txt x={240} y={250} size={58} weight={800}>Reels</Txt>\n      <Txt x={473} y={250} size={58} weight={800} fill={DIM}>Friends</Txt>\n      {[762, 812, 858].map((cx) => <circle key={cx} cx={cx} cy={225} r={24} fill=\"rgba(200,200,210,0.85)\" stroke={UI_FILL} strokeWidth={3} />)}\n      <Icon name=\"heart\" cx={1033} cy={1086} s={76} /><Label x={1033} y={1189}>62</Label>\n      <Icon name=\"comment\" cx={1033} cy={1298} s={72} /><Label x={1033} y={1399}>13</Label>\n      <Icon name=\"repost\" cx={1033} cy={1517} s={70} /><Label x={1033} y={1630}>1</Label>\n      <Icon name=\"send\" cx={1033} cy={1742} s={70} /><Label x={1033} y={1840}>13</Label>\n      <Dots cx={1033} cy={1943} />\n      <rect x={988} y={2034} width={89} height={89} rx={16} fill=\"rgba(200,200,210,0.85)\" stroke={UI_FILL} strokeWidth={6} />\n      {ad && <Pill x={52} y={1790} w={800} h={80} label=\"Learn more\" filled />}\n      {ad && <Txt x={206} y={1935} size={32} fill={DIM}>Sponsored</Txt>}\n      <circle cx={113} cy={1970} r={62} fill=\"rgba(200,200,210,0.85)\" stroke=\"#E1306C\" strokeWidth={7} />\n      <Txt x={206} y={1991} size={42} weight={700}>username</Txt>\n      <Txt x={52} y={2116} size={42}>Caption text goes here\u2026</Txt>\n      <rect x={0} y={2180} width={1125} height={6} fill=\"rgba(255,255,255,0.3)\" />\n      <rect x={0} y={2180} width={277} height={6} fill={UI_FILL} />\n    </g>\n  );\n}\n\nfunction ShortsScreen() {\n  return (\n    <g>\n      <Search cx={891} cy={221} />\n      <Dots cx={1035} cy={221} vertical />\n      <Icon name=\"heart\" cx={1028} cy={1162} s={66} /><Label x={1028} y={1241}>1.2K</Label>\n      <Icon name=\"comment\" cx={1028} cy={1340} s={60} /><Label x={1028} y={1421}>27</Label>\n      <Icon name=\"bookmark\" cx={1028} cy={1520} s={56} /><Label x={1028} y={1601}>Save</Label>\n      <Icon name=\"share\" cx={1028} cy={1700} s={60} /><Label x={1028} y={1781}>Share</Label>\n      <Icon name=\"repost\" cx={1028} cy={1880} s={60} /><Label x={1028} y={1961}>Remix</Label>\n      <rect x={981} y={2034} width={95} height={95} rx={16} fill=\"rgba(200,200,210,0.85)\" stroke={UI_FILL} strokeWidth={6} />\n      <Avatar cx={97} cy={1908} r={48} />\n      <Txt x={171} y={1925} size={42} weight={700}>@channel</Txt>\n      <rect x={372} y={1860} width={251} height={95} rx={47} fill={UI_FILL} />\n      <Txt x={497} y={1922} size={38} weight={700} anchor=\"middle\" fill=\"#111\">Subscribe</Txt>\n      <Txt x={52} y={2028} size={40}>Video title goes here\u2026</Txt>\n      <rect x={50} y={2065} width={883} height={70} rx={35} fill=\"rgba(255,255,255,0.25)\" />\n      <path d=\"M83 2085 L105 2101 L83 2117 Z\" fill={UI_FILL} />\n      <Txt x={125} y={2117} size={36} weight={700}>Related video title\u2026</Txt>\n    </g>\n  );\n}\n\nfunction StoriesScreen() {\n  return (\n    <g>\n      <rect x={24} y={174} width={1076} height={6} rx={3} fill=\"rgba(255,255,255,0.45)\" />\n      <rect x={24} y={174} width={268} height={6} rx={3} fill={UI_FILL} />\n      <Avatar cx={83} cy={258} r={48} />\n      <Txt x={170} y={243} size={42} weight={700}>username</Txt>\n      <Txt x={560} y={243} size={42} fill={DIM}>3h</Txt>\n      <circle cx={186} cy={275} r={14} fill={UI_FILL} />\n      <Txt x={222} y={290} size={36}>See translation \u203a</Txt>\n      <path d=\"M915 238 H975 M915 262 H975\" stroke={UI_FILL} strokeWidth={6} strokeLinecap=\"round\" />\n      <path d=\"M1037 222 L1093 278 M1093 222 L1037 278\" stroke={UI_FILL} strokeWidth={6} strokeLinecap=\"round\" />\n    </g>\n  );\n}\n\nfunction LinkedInScreen() {\n  return (\n    <g>\n      <Icon name=\"like\" cx={1028} cy={1343} s={66} /><Label x={1028} y={1444} size={34}>1</Label>\n      <Icon name=\"comment\" cx={1028} cy={1565} s={70} /><Label x={1028} y={1663} size={34}>1</Label>\n      <Icon name=\"repost\" cx={1028} cy={1793} s={66} />\n      <Icon name=\"send\" cx={1029} cy={1972} s={68} />\n      <Dots cx={1028} cy={2153} />\n      <Avatar cx={96} cy={1995} r={58} />\n      <Txt x={182} y={2000} size={44} weight={700}>Full Name</Txt>\n      <Txt x={184} y={2064} size={32} fill={DIM}>Headline goes here\u2026</Txt>\n      <Txt x={40} y={2163} size={40}>Caption text goes here, first line</Txt>\n      <Txt x={40} y={2215} size={40} fill={DIM}>\u2026more</Txt>\n    </g>\n  );\n}\n\nfunction AppUI({ platform }) {\n  const ad = platform === \"tiktokAd\" || platform === \"reelsAd\";\n  const base =\n    platform === \"tiktokAd\" || platform === \"universal\" ? \"tiktok\" : platform === \"reelsAd\" ? \"reels\" : platform;\n  const m = SCREEN[base];\n  if (!m) return null;\n  const body =\n    base === \"tiktok\" ? <TikTokScreen ad={ad} /> :\n    base === \"reels\" ? <ReelsScreen ad={ad} /> :\n    base === \"shorts\" ? <ShortsScreen /> :\n    base === \"stories\" ? <StoriesScreen /> : <LinkedInScreen />;\n  return (\n    <g>\n      <g transform={`scale(${m.k}) translate(${m.tx} ${m.ty})`}>{body}</g>\n      {m.edge && m.edge.map((x, i) => (\n        <line key={i} x1={x} y1={0} x2={x} y2={1920} stroke=\"rgba(255,255,255,0.5)\" strokeWidth={3} strokeDasharray=\"10 10\" />\n      ))}\n    </g>\n  );\n}\n\nfunction YouTubeUI() {\n  return (\n    <g>\n      <Txt x={40} y={60} size={34} weight={600}>Video title goes here</Txt>\n      <Dots cx={1870} cy={48} vertical />\n      <rect x={24} y={1000} width={1872} height={8} rx={4} fill=\"rgba(255,255,255,0.35)\" />\n      <rect x={24} y={1000} width={620} height={8} rx={4} fill=\"rgba(255,64,118,0.95)\" />\n      <circle cx={644} cy={1004} r={12} fill=\"rgba(255,64,118,0.95)\" />\n      <path d=\"M40 1025 L40 1065 L72 1045 Z\" fill={UI_FILL} />\n      <path d=\"M100 1030 H112 L128 1018 V1072 L112 1060 H100 Z\" fill={UI_FILL} />\n      <Txt x={160} y={1058} size={28}>3:24 / 10:05</Txt>\n      <circle cx={1720} cy={1045} r={16} fill=\"none\" stroke={UI_FILL} strokeWidth={5} />\n      <rect x={1776} y={1030} width={36} height={28} rx={3} fill=\"none\" stroke={UI_FILL} strokeWidth={5} />\n      <path d=\"M1840 1030 H1852 M1840 1030 V1042 M1880 1030 H1868 M1880 1030 V1042 M1840 1062 H1852 M1840 1062 V1050 M1880 1062 H1868 M1880 1062 V1050\" stroke={UI_FILL} strokeWidth={5} />\n      <circle cx={1764} cy={912} r={48} fill=\"rgba(200,200,210,0.6)\" stroke={UI_FILL} strokeWidth={3} />\n    </g>\n  );\n}\n\nexport default function SafeZoneGuides({ data }) {\n  const { width, height } = useVideoConfig();\n  const d = data || {};\n  const vertical = height > width;\n  const W = vertical ? 1080 : 1920;\n  const H = vertical ? 1920 : 1080;\n  const opacity = typeof d.opacity === \"number\" ? d.opacity / 100 : 1;\n  const show = (k, dflt) => (typeof d[k] === \"boolean\" ? d[k] : dflt);\n  const parts = [];\n  let label = \"\";\n\n  if (show(\"zones\", true)) {\n    if (vertical) {\n      const { box, rails, name } = zone(d.platform || \"universal\");\n      label = name;\n      parts.push(\n        <rect key=\"t\" x={0} y={0} width={W} height={box.y1} fill={PINK} />,\n        <rect key=\"b\" x={0} y={box.y2} width={W} height={H - box.y2} fill={PINK} />,\n        <rect key=\"l\" x={0} y={box.y1} width={box.x1} height={box.y2 - box.y1} fill={PINK} />,\n        <rect key=\"r\" x={box.x2} y={box.y1} width={W - box.x2} height={box.y2 - box.y1} fill={PINK} />\n      );\n      rails.forEach((r, i) =>\n        parts.push(<rect key={\"rail\" + i} x={r.x} y={r.y} width={box.x2 - r.x} height={box.y2 - r.y} fill={PINK} stroke={PINK_LINE} strokeWidth={4} strokeDasharray=\"14 10\" />)\n      );\n      parts.push(<polygon key=\"safe\" points={polygon(box, rails)} fill=\"none\" stroke={GREEN} strokeWidth={6} />);\n    } else {\n      label = \"YouTube\";\n      [[0, 0, 1920, 108], [0, 972, 1920, 108], [1680, 130, 200, 70], [1704, 852, 120, 120]].forEach(([x, y, w, h], i) =>\n        parts.push(<rect key={\"yb\" + i} x={x} y={y} width={w} height={h} fill={PINK} />)\n      );\n      parts.push(<rect key=\"ysafe\" x={96} y={108} width={1728} height={864} fill=\"none\" stroke={GREEN} strokeWidth={5} />);\n      if (show(\"safeBoxes\", true)) {\n        parts.push(\n          <rect key=\"ts\" x={96} y={54} width={1728} height={972} fill=\"none\" stroke=\"rgba(255,255,255,0.8)\" strokeWidth={3} />,\n          <rect key=\"as\" x={67} y={38} width={1786} height={1004} fill=\"none\" stroke=\"rgba(255,255,255,0.5)\" strokeWidth={3} strokeDasharray=\"8 8\" />\n        );\n      }\n    }\n  }\n  if (show(\"ui\", true)) {\n    parts.push(vertical ? <AppUI key=\"ui\" platform={d.platform || \"universal\"} /> : <YouTubeUI key=\"ui\" />);\n  }\n  if (show(\"thirds\", true)) {\n    [W / 3, (2 * W) / 3].forEach((x, i) => parts.push(<line key={\"tx\" + i} x1={x} y1={0} x2={x} y2={H} stroke={GRID} strokeWidth={2} />));\n    [H / 3, (2 * H) / 3].forEach((y, i) => parts.push(<line key={\"ty\" + i} x1={0} y1={y} x2={W} y2={y} stroke={GRID} strokeWidth={2} />));\n  }\n  if (show(\"centre\", false)) {\n    parts.push(\n      <line key=\"cx\" x1={W / 2} y1={0} x2={W / 2} y2={H} stroke={CENTRE} strokeWidth={3} strokeDasharray=\"6 12\" />,\n      <line key=\"cy\" x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={CENTRE} strokeWidth={3} strokeDasharray=\"6 12\" />\n    );\n  }\n  if (show(\"crops\", false)) {\n    if (vertical) {\n      [[240, 1680, \"3:4 grid\"], [285, 1635, \"4:5 feed\"], [420, 1500, \"1:1\"]].forEach(([a, b, l], i) => {\n        parts.push(\n          <line key={\"ca\" + i} x1={0} y1={a} x2={W} y2={a} stroke={CROP} strokeWidth={4} strokeDasharray=\"22 14\" />,\n          <line key={\"cb\" + i} x1={0} y1={b} x2={W} y2={b} stroke={CROP} strokeWidth={4} strokeDasharray=\"22 14\" />,\n          <text key={\"cl\" + i} x={W - 16} y={i === 1 ? b + 40 : a - 12} textAnchor=\"end\" fontSize={32} fontFamily=\"sans-serif\" fill={CROP}>{l}</text>\n        );\n      });\n    } else {\n      [420, 1500].forEach((x, i) => parts.push(<line key={\"hx\" + i} x1={x} y1={0} x2={x} y2={H} stroke={CROP} strokeWidth={4} strokeDasharray=\"22 14\" />));\n      [97, 983].forEach((y, i) => parts.push(<line key={\"hy\" + i} x1={0} y1={y} x2={W} y2={y} stroke={CROP} strokeWidth={4} strokeDasharray=\"22 14\" />));\n    }\n  }\n  // A reminder baked into the guides, so a forgotten clip is obvious in any export.\n  parts.push(\n    <text key=\"tag\" x={24} y={vertical ? 44 : 34} fontSize={vertical ? 28 : 24} fontFamily=\"sans-serif\" fontWeight={700} fill=\"rgba(255,255,255,0.95)\" stroke=\"rgba(0,0,0,0.6)\" strokeWidth={1}>\n      {\"SAFE ZONES\" + (label ? \" \u00b7 \" + label : \"\") + \" \u2014 remove before export\"}\n    </text>\n  );\n\n  return (\n    <AbsoluteFill style={{ pointerEvents: \"none\", opacity }}>\n      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio=\"none\" style={{ width: \"100%\", height: \"100%\" }}>\n        {parts}\n      </svg>\n    </AbsoluteFill>\n  );\n}\n";

const GUIDE_LABEL = "SAFE ZONES – remove before export";
const GUIDE_COLOR = "fuchsia";

// Values in pixels on 1080 x 1920, shown in the info table only.
const MARGINS = {
  universal: [288, 672, 65, 65],
  tiktok: [160, 484, 60, 60],
  tiktokAd: [160, 672, 60, 60],
  reels: [250, 450, 65, 65],
  reelsAd: [269, 672, 65, 65],
  stories: [269, 384, 65, 65],
  shorts: [288, 672, 65, 65],
  linkedin: [108, 320, 60, 60],
};
// Button column on the right: [width from the right edge, starts at y].
const BUTTONS = {
  universal: [200, 680],
  tiktok: [180, 680],
  tiktokAd: [180, 680],
  reels: [200, 880],
  reelsAd: [200, 880],
  stories: null,
  shorts: [200, 950],
  linkedin: [165, 990],
};
const CONF = {
  universal: "universalNote",
  tiktok: "estimate",
  tiktokAd: "estimate",
  reels: "estimate",
  reelsAd: "official",
  stories: "official",
  shorts: "measured",
  linkedin: "estimate",
};
const PLATFORM_IDS = ["universal", "tiktok", "tiktokAd", "reels", "reelsAd", "stories", "shorts", "linkedin"];

const STRINGS = {
  en: {
    show: "Show guides in preview",
    onNote: "The guides are a fuchsia clip on the top track. Switch this off before you export, or they'll be in your video.",
    offNote: "Switch on to see the safe zones and grids in the main preview while you add text and graphics.",
    working: "Updating the timeline…",
    noDraft: "Open a Draft to use the guides.",
    error: "Couldn't update the guides",
    platform: "Platform",
    platformNote: "Used for 9:16 Drafts. 16:9 Drafts get YouTube long-form guides automatically.",
    universal: "Universal (all platforms)",
    tiktok: "TikTok",
    tiktokAd: "TikTok ad",
    reels: "Instagram Reels",
    reelsAd: "Reels ad (Instagram + Facebook)",
    stories: "Stories",
    shorts: "YouTube Shorts",
    linkedin: "LinkedIn",
    grids: "Grids",
    zones: "Safe zone overlay",
    ui: "App buttons and text (mockup)",
    thirds: "Rule of thirds",
    centre: "Centre lines",
    crops: "Crop lines (3:4, 4:5, 1:1)",
    safeBoxes: "Title and action safe (16:9)",
    opacity: "Opacity",
    info: "About this platform",
    keepClear: "Keep clear T / B / L / R",
    buttons: "Button column (right)",
    buttonsValue: (w, y) => `${w} px wide, from y ${y} down`,
    source: "Confidence",
    official: "Official (Meta)",
    measured: "Measured from Google's template",
    estimate: "Community estimate",
    universalNote: "Strictest edge from every platform",
    tip: "Tip: you can also change these on the guide clip in Adjust.",
    disclaimer: "Apps update their buttons and layout often, so the app mockup may not match the latest version exactly. The safe zones stay much more constant, so use them as your main guide.",
  },
};

// One script for reading, adding and removing, so the panel and chat agent
// share the same behaviour. mode: "read" | "add" | "remove".
function buildScript(sequenceId, mode, params, t) {
  const editable = [
    {
      key: "platform",
      label: t.platform,
      type: "select",
      defaultValue: "universal",
      options: PLATFORM_IDS.map((id) => ({ label: t[id], value: id })),
    },
    { key: "zones", label: t.zones, type: "boolean", defaultValue: true },
    { key: "ui", label: t.ui, type: "boolean", defaultValue: true },
    { key: "thirds", label: t.thirds, type: "boolean", defaultValue: true },
    { key: "centre", label: t.centre, type: "boolean", defaultValue: false },
    { key: "crops", label: t.crops, type: "boolean", defaultValue: false },
    { key: "safeBoxes", label: t.safeBoxes, type: "boolean", defaultValue: true },
    { key: "opacity", label: t.opacity, type: "number", defaultValue: 100, min: 10, max: 100, step: 5 },
  ];
  return `
const draft = selects.draft(${JSON.stringify(sequenceId)});
const MODE: string = ${JSON.stringify(mode)};
const isGuide = (c: ClipInfo) => c.trackKind === "video" && c.resourceId == null && c.color === ${JSON.stringify(GUIDE_COLOR)};
let clips = await draft.clips({ trackScope: "all" });
const old = clips.filter(isGuide);
if (MODE === "read") return { count: old.length };
if (MODE === "remove" && old.length === 0) return { count: 0, changed: false };
if (old.length) await draft.removeClips(old);
if (MODE === "add") {
  clips = await draft.clips({ trackScope: "all" });
  const end = Math.max(0, ...clips.filter((c) => c.trackKind !== "chapter" && c.trackKind !== "subchapter").map((c) => c.endFrame));
  if (end <= 0) throw new Error("This Draft is empty.");
  const PARAMS: Record<string, JsonValue> = ${JSON.stringify(params)};
  const EDITABLE: EditableParameterDefinition[] = ${JSON.stringify(editable)};
  const opts = {
    label: ${JSON.stringify(GUIDE_LABEL)},
    tsxCode: ${JSON.stringify(GUIDES_TSX)},
    parameters: PARAMS,
    editableParameters: EDITABLE,
  };
  let r = await draft.addMotionGraphic({ ...opts, within: await draft.rangeAtFrames(0, end) });
  const full = r.diff.afterDurationFrames;
  if (full > r.endFrame) {
    let span: Span | null = null;
    try { span = await draft.rangeAtFrames(0, full); } catch (e) { span = null; }
    const first = (await draft.clips({ trackScope: "all" })).find((c) => c.clipId === r.clipId);
    if (span && first) {
      await draft.removeClips(first);
      r = await draft.addMotionGraphic({ ...opts, within: span });
    }
  }
  const mine = (await draft.clips({ trackScope: "all" })).find((c) => c.clipId === r.clipId);
  if (!mine) throw new Error("The guide clip was not created.");
  await draft.setClipColor({ clips: mine, color: ${JSON.stringify(GUIDE_COLOR)} });
}
const out = await draft.commitAll(MODE === "add" ? "Show safe-zone guides" : "Remove safe-zone guides");
return { count: MODE === "add" ? 1 : 0, changed: true, commitId: out.commitId };
`;
}

export default function Panel({ sdk, context, ui }) {
  const t = STRINGS[context.language] ?? STRINGS.en;
  const sequenceId = context.sequenceId;

  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    platform: "universal",
    zones: true,
    ui: true,
    thirds: true,
    centre: false,
    crops: false,
    safeBoxes: true,
    opacity: 100,
  });

  const run = useCallback(
    async (mode, p) => {
      if (!sequenceId) return null;
      setBusy(true);
      setError(null);
      try {
        const res = await sdk.runScript({
          script: buildScript(sequenceId, mode, p ?? params, t),
          summary: mode === "add" ? "Show safe-zone guides" : mode === "remove" ? "Remove safe-zone guides" : "Check safe-zone guides",
          allowCommit: mode !== "read",
        });
        if (res.isError) throw new Error(res.output || "Script failed");
        const result = res.result ?? {};
        setOn((result.count ?? 0) > 0);
        return result;
      } catch (e) {
        setError(String((e && e.message) || e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [sdk, sequenceId, params, t]
  );

  // Read-only check when the panel opens or the Draft changes.
  useEffect(() => {
    setOn(false);
    setError(null);
    if (sequenceId) run("read");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId]);

  const toggle = (value) => {
    if (busy) return;
    run(value ? "add" : "remove");
  };

  // Changing a setting while the guides are shown replaces the guide clip.
  const change = (key) => (value) => {
    const next = { ...params, [key]: value };
    setParams(next);
    if (on && !busy) run("add", next);
  };

  const m = MARGINS[params.platform];

  if (!sequenceId) {
    return <ui.Message tone="muted">{t.noDraft}</ui.Message>;
  }

  return (
    <ui.Stack gap={16}>
      <ui.Toggle label={t.show} value={on} onChange={toggle} disabled={busy} />
      {busy ? (
        <ui.Progress label={t.working} />
      ) : on ? (
        <ui.Message tone="muted">{t.onNote}</ui.Message>
      ) : (
        <ui.Message tone="muted">{t.offNote}</ui.Message>
      )}
      {error && <ui.Message tone="error">{t.error}: {error}</ui.Message>}

      <ui.Section title={t.platform}>
        <ui.Select
          label={t.platform}
          value={params.platform}
          onChange={change("platform")}
          options={PLATFORM_IDS.map((id) => ({ value: id, label: t[id] }))}
          disabled={busy}
        />
        <small>{t.platformNote}</small>
      </ui.Section>

      <ui.Section title={t.grids}>
        <ui.Toggle label={t.zones} value={params.zones} onChange={change("zones")} disabled={busy} />
        <ui.Toggle label={t.ui} value={params.ui} onChange={change("ui")} disabled={busy} />
        <ui.Toggle label={t.thirds} value={params.thirds} onChange={change("thirds")} disabled={busy} />
        <ui.Toggle label={t.centre} value={params.centre} onChange={change("centre")} disabled={busy} />
        <ui.Toggle label={t.crops} value={params.crops} onChange={change("crops")} disabled={busy} />
        <ui.Toggle label={t.safeBoxes} value={params.safeBoxes} onChange={change("safeBoxes")} disabled={busy} />
        <ui.Slider label={t.opacity} unit="%" min={10} max={100} step={5} value={params.opacity} onChange={change("opacity")} disabled={busy} />
      </ui.Section>

      <ui.Section title={t.info}>
        <table>
          <tbody>
            <tr>
              <td>{t.keepClear}</td>
              <td>{m.join(" / ")}</td>
            </tr>
            {BUTTONS[params.platform] && (
              <tr>
                <td>{t.buttons}</td>
                <td>{t.buttonsValue(BUTTONS[params.platform][0], BUTTONS[params.platform][1])}</td>
              </tr>
            )}
          </tbody>
        </table>
        <small>1080 × 1920 px · {t.tip}</small>
        <ui.Message tone="muted">{t.disclaimer}</ui.Message>
      </ui.Section>
    </ui.Stack>
  );
}
