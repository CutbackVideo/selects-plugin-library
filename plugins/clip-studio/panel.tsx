// @name Clip Studio
// @name:ko \ud074\ub9bd \uc2a4\ud29c\ub514\uc624
// @name:en Clip Studio
// @name:de Clip Studio
// @name:es Clip Studio
// @name:fr Clip Studio
// @name:it Clip Studio
// @name:ja クリップスタジオ
// @name:pt Clip Studio
// @name:tr Clip Studio
// @name:zh 剪辑工作室
// @icon scissors
// @speaker-profiling off
// Standalone clip app. Copy this plugin folder and edit the app identity and templates below.
import React from "react";
// Customer app identity. Keep id in sync with the folder name and plugin.json.
const APP_CONFIG: any = {
  "id": "clip-studio",
  "name": "Clip Studio",
  "defaultTemplate": "standard"
};

// Neutral fallbacks for saved custom templates. Customer styles belong in BUILTIN_TEMPLATES.
const TEMPLATE_DEFAULTS: any = {
  "id": "standard",
  "version": 1,
  "names": {
    "en": "Standard",
    "ko": "\uae30\ubcf8"
  },
  "detect": {
    "keywords": [],
    "exclude": [],
    "host": ""
  },
  "layout": {
    "windowTop": 420,
    "windowBottom": 1255,
    "sourceTop": 0,
    "sourceBottom": 1080,
    "offsetX": 0,
    "headlineCenter": 250,
    "logoCenter": 1690
  },
  "background": {
    "mode": "color",
    "style": "linear-gradient(160deg,#27272A,#18181B)",
    "color": "#18181B",
    "image": "",
    "imageName": "",
    "dim": 0
  },
  "border": {
    "on": false,
    "color": "#71717A"
  },
  "headline": {
    "font": "",
    "size1": 84,
    "size2": 72,
    "color1": "#FFFFFF",
    "color2": "#FACC15",
    "box2On": false,
    "box2": "#D7263D",
    "italic": false,
    "shadow": true
  },
  "logo": {
    "mode": "none",
    "image": "",
    "imageName": "",
    "width": 432
  },
  "captions": {
    "on": true,
    "mode": "bar",
    "barHeight": 230,
    "bottom": 1198,
    "fontSize": 60,
    "fontWeight": 500,
    "boxColor": "#0000009E",
    "color": "#FFFFFF",
    "font": "",
    "lineMax": 24
  },
  "editing": {
    "removeFillers": true,
    "removeSilences": true
  },
  "prompt": {
    "role": "You are a short-form video editor. Write headlines and captions in the language of the source video unless the user requests another language.",
    "format": "An interview, conversation, presentation or other speech-led video.",
    "good": "A self-contained insight, concrete example, surprising moment or useful takeaway.",
    "bad": "Introductions, repeated points, incomplete arguments and passages that require missing context.",
    "lengthGuide": "30-75 seconds; at most 110 seconds.",
    "countGuide": "Choose only strong, distinct passages. Usually 3-4 clips for a 20-30 minute video, fewer if the material does not support them.",
    "rules": "One idea per clip. Begin with enough context and finish a complete thought. Use 1-3 source segments per clip. Do not overlap clips or change the meaning of the speaker.",
    "headline": "Two concise lines: an accurate hook, then the essential context. Fit each line in the preview. Do not invent quotes, names or claims."
  }
};

// Customer templates: copy an entry, give it a unique id, and edit its look and editorial rules.
const BUILTIN_TEMPLATES: any = [
  {
    "id": "standard",
    "version": 1,
    "names": {
      "en": "Standard",
      "ko": "\uae30\ubcf8"
    },
    "detect": {
      "keywords": [],
      "exclude": [],
      "host": ""
    },
    "layout": {
      "windowTop": 420,
      "windowBottom": 1255,
      "sourceTop": 0,
      "sourceBottom": 1080,
      "offsetX": 0,
      "headlineCenter": 250,
      "logoCenter": 1690
    },
    "background": {
      "mode": "color",
      "style": "linear-gradient(160deg,#27272A,#18181B)",
      "color": "#18181B",
      "image": "",
      "imageName": "",
      "dim": 0
    },
    "border": {
      "on": false,
      "color": "#71717A"
    },
    "headline": {
      "font": "",
      "size1": 84,
      "size2": 72,
      "color1": "#FFFFFF",
      "color2": "#FACC15",
      "box2On": false,
      "box2": "#D7263D",
      "italic": false,
      "shadow": true
    },
    "logo": {
      "mode": "none",
      "image": "",
      "imageName": "",
      "width": 432
    },
    "captions": {
      "on": true,
      "mode": "bar",
      "barHeight": 230,
      "bottom": 1198,
      "fontSize": 60,
      "fontWeight": 500,
      "boxColor": "#0000009E",
      "color": "#FFFFFF",
      "font": "",
      "lineMax": 24
    },
    "editing": {
      "removeFillers": true,
      "removeSilences": true
    },
    "prompt": {
      "role": "You are a short-form video editor. Write headlines and captions in the language of the source video unless the user requests another language.",
      "format": "An interview, conversation, presentation or other speech-led video.",
      "good": "A self-contained insight, concrete example, surprising moment or useful takeaway.",
      "bad": "Introductions, repeated points, incomplete arguments and passages that require missing context.",
      "lengthGuide": "30-75 seconds; at most 110 seconds.",
      "countGuide": "Choose only strong, distinct passages. Usually 3-4 clips for a 20-30 minute video, fewer if the material does not support them.",
      "rules": "One idea per clip. Begin with enough context and finish a complete thought. Use 1-3 source segments per clip. Do not overlap clips or change the meaning of the speaker.",
      "headline": "Two concise lines: an accurate hook, then the essential context. Fit each line in the preview. Do not invent quotes, names or claims."
    }
  }
];

const SCRIPT_BUILD: any = "// run_script body: build one series clip as an editable Draft from a template.\n// The clip parameters are injected at runtime; the frame and caption components are embedded below.\nconst P: any = __P__;\nconst FRAME_TSX: string = \"import React from 'react';\\n\\nconst FONT = \\\"'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif\\\";\\n\\nexport default function ClipFrame({ data }) {\\n  const W = 1080, H = 1920;\\n  const top = Number(data?.windowTop ?? 420);\\n  const bottom = Number(data?.windowBottom ?? 1255);\\n  const bg = String(data?.background ?? '#1E1F22');\\n  const h1 = String(data?.headline1 ?? '');\\n  const h2 = String(data?.headline2 ?? '');\\n  const size1 = Number(data?.headlineSize1 ?? 84);\\n  const size2 = Number(data?.headlineSize2 ?? size1);\\n  const color1 = String(data?.headlineColor1 ?? '#FFFFFF');\\n  const color2 = String(data?.headlineColor2 ?? '#FFFFFF');\\n  const box2 = String(data?.headline2Box ?? '');\\n  const italic = Boolean(data?.headlineItalic ?? false);\\n  const headlineCenter = Number(data?.headlineCenter ?? top / 2 + 40);\\n  const captionBar = Number(data?.captionBarHeight ?? 0);\\n  const logoCenter = Number(data?.logoCenter ?? (bottom + captionBar + H) / 2);\\n  const border = Boolean(data?.goldBorder ?? false);\\n  const shadow = String(data?.headlineShadow ?? '0 4px 10px rgba(0,0,0,.55)');\\n  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';\\n  const headFont = family === '' ? FONT : `\\\"${family}\\\", ${FONT}`;\\n  const bgImage = String(data?.backgroundImage ?? '');\\n  const bgDim = Math.max(0, Math.min(90, Number(data?.backgroundDim ?? 0)));\\n  const borderColor = String(data?.borderColor ?? '#C9A45C');\\n  const logoMode = String(data?.logoMode ?? 'none');\\n  const logoImage = String(data?.logoImage ?? '');\\n  const logoWidth = Number(data?.logoWidth ?? 600);\\n  // A background image is one 1080x1920 picture shown only where the video window is not.\\n  const band = (y, h) =>\\n    bgImage ? (\\n      <div style={{ position: 'absolute', left: 0, top: y, width: W, height: h, backgroundImage: `url(${bgImage})`, backgroundSize: `${W}px ${H}px`, backgroundPosition: `0px ${-y}px` }}>\\n        {bgDim > 0 ? <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: h, background: `rgba(0,0,0,${bgDim / 100})` }} /> : null}\\n      </div>\\n    ) : (\\n      <div style={{ position: 'absolute', left: 0, top: y, width: W, height: h, background: bg }} />\\n    );\\n  const est = (t) => Array.from(t).reduce((w, ch) => w + (/[\\\\uAC00-\\\\uD7A3\\\\u4E00-\\\\u9FFF]/.test(ch) ? 0.93 : ch === ' ' ? 0.27 : /[0-9A-Za-z%]/.test(ch) ? 0.6 : 0.4), 0);\\n  const fit = (t, size, maxW) => Math.min(size, Math.floor(maxW / Math.max(1, est(t)) - 2));\\n  const lineStyle = (size, color) => ({\\n    fontSize: size, fontWeight: 900, color, lineHeight: 1.16, letterSpacing: '-2px',\\n    fontStyle: italic ? 'italic' : 'normal', whiteSpace: 'nowrap', textShadow: shadow,\\n    WebkitTextStroke: `${Math.max(1, Math.round(size * 0.035))}px ${color}`, paintOrder: 'stroke fill',\\n  });\\n  const s1 = fit(h1, size1, 1010);\\n  const s2 = fit(h2, size2, box2 ? 970 : 1010);\\n  return (\\n    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: FONT, pointerEvents: 'none' }}>\\n      {band(0, top)}\\n      {band(bottom, H - bottom)}\\n      {captionBar > 0 ? <div style={{ position: 'absolute', left: 0, top: bottom, width: W, height: captionBar, background: '#000000' }} /> : null}\\n      {border ? (\\n        <>\\n          <div style={{ position: 'absolute', left: 22, top: 22, width: W - 44, height: top - 22, borderTop: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}` }} />\\n          <div style={{ position: 'absolute', left: 22, top: bottom, width: W - 44, height: H - bottom - 22, borderBottom: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}` }} />\\n        </>\\n      ) : null}\\n      <div style={{ position: 'absolute', left: 30, width: W - 60, top: headlineCenter, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: box2 ? 14 : 2, textAlign: 'center', fontFamily: headFont }}>\\n        {h1 ? <div style={lineStyle(s1, color1)}>{h1}</div> : null}\\n        {h2 ? (\\n          box2 ? (\\n            <div style={{ ...lineStyle(s2, color2), textShadow: 'none', background: box2, padding: '4px 18px 8px' }}>{h2}</div>\\n          ) : (\\n            <div style={lineStyle(s2, color2)}>{h2}</div>\\n          )\\n        ) : null}\\n      </div>\\n      <div style={{ position: 'absolute', left: 0, width: W, top: logoCenter, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center' }}>\\n        {logoMode === 'image' && logoImage ? (\\n          <img src={logoImage} style={{ width: logoWidth, height: 'auto', display: 'block' }} />\\n        ) : null}\\n      </div>\\n    </div>\\n  );\\n}\\n\";\nconst CAPTION_TSX: string = \"import React from 'react';\\n\\nconst FONT = \\\"'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif\\\";\\n\\nexport default function ClipCaption({ data }) {\\n  const lines = String(data?.text ?? '').split('\\\\n');\\n  const mode = String(data?.mode ?? 'bar');\\n  const size = Number(data?.fontSize ?? 66);\\n  const weight = Number(data?.fontWeight ?? 600);\\n  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';\\n  const font = family === '' ? FONT : `\\\"${family}\\\", ${FONT}`;\\n  const color = String(data?.textColor ?? '#FFFFFF');\\n  if (mode === 'bar') {\\n    const top = Number(data?.top ?? 1255);\\n    const height = Number(data?.height ?? 230);\\n    return (\\n      <div style={{ position: 'absolute', left: 40, width: 1000, top, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: font, pointerEvents: 'none' }}>\\n        {lines.map((line, i) => (\\n          <div key={i} style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.28, letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{line}</div>\\n        ))}\\n      </div>\\n    );\\n  }\\n  const bottom = Number(data?.bottom ?? 1440);\\n  const box = String(data?.boxColor ?? 'rgba(0,0,0,0.62)');\\n  return (\\n    <div style={{ position: 'absolute', left: 40, width: 1000, top: 0, height: bottom, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', fontFamily: font, pointerEvents: 'none' }}>\\n      <div style={{ background: box, padding: '10px 26px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4 }}>\\n        {lines.map((line, i) => (\\n          <div key={i} style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{line}</div>\\n        ))}\\n      </div>\\n    </div>\\n  );\\n}\\n\";\n\n// ---- Captions: one caption per thought ----\n// A caption ends where the speaker's sentence ends or another speaker starts, never in the middle of one.\n// A sentence too long for two lines is divided where a listener would pause (a comma, a breath, the end\n// of a clause), in pieces of similar length, and never between words that belong together (\"\\uac08 \\uc218 /\n// \\uc788\\uc744\\uae4c\", \"\\uadf8 / \\uac00\\uc218\", \"the / house\"). Each word is [text, startFrame, endFrame, sourceStartFrame,\n// speakerId, utteranceId].\n// Sounds a speaker makes while thinking; they are not captioned.\nconst FILLER = /^(\\uc5b4|\\uc74c|\\uc544|\\uc5d0|\\uc73c|\\ud760|uh|um|er|ah|hmm)[.,\u2026~]*$/i;\n// A word that leans on the next one: breaking after it leaves it stranded.\nconst LEANS_FORWARD =\n  /^(\\uadf8|\\uc774|\\uc800|\\ud55c|\\ub450|\\uc138|\\ub124|\\uba87|\\uc5b4\\ub5a4|\\ubb34\\uc2a8|\\uc5b4\\ub290|\\uc774\\ub7f0|\\uadf8\\ub7f0|\\uc800\\ub7f0|\\ubaa8\\ub4e0|\\uac01|\\uc0c8|\\uccab|\\ub2e4\\ub978|\\uc5ec\\ub7ec|\\uc57d|\\ub354|\\ub35c|\\uac00\\uc7a5|\\uc81c\\uc77c|\\ub108\\ubb34|\\uc544\\uc8fc|\\ub9e4\\uc6b0|\\uc815\\ub9d0|\\uc9c4\\uc9dc|\\ucc38|\\uc880|\\uc798|\\ubabb|\\uc548|\\uaf2d|\\ub2e4\\uc2dc|\\uacc4\\uc18d|\\uac70\\uc758|\\uc774\\ubbf8|\\uc544\\uc9c1|\\ubc14\\ub85c|\\uadf8\\ub0e5|\\uadf8\\ub9ac\\uace0|\\uadf8\\ub798\\uc11c|\\uadf8\\ub7ec\\uba74|\\uadf8\\ub7f0\\ub370|\\uadfc\\ub370|\\uadf8\\ub7ec\\ub2c8\\uae4c|\\uadf8\\ub7fc|\\ud558\\uc9c0\\ub9cc|\\uadf8\\ub807\\uc9c0\\ub9cc|\\uadf8\\ub7ec\\ub098|\\ub610|\\ub610\\ub294|\\ud639\\uc740|\\uc989|\\uc65c\\ub0d0\\ud558\\uba74|\\uc608\\ub97c|\\ub9cc\\uc57d|\\uc5b4\\ub5bb\\uac8c|\\uc774\\ub807\\uac8c|\\uadf8\\ub807\\uac8c|\\uc800\\ub807\\uac8c|\\uc65c|\\uc5bc\\ub9c8\\ub098|\\ub9ce\\uc774|\\ube68\\ub9ac|\\uba3c\\uc800|\\ub2e4\\uc74c|a|an|the|to|of|in|on|at|for|with|by|from|about|into|over|under|after|before|between|through|during|without|and|or|but|so|which|who|is|are|was|were|be|i|he|she|we|they|my|your|his|her|our|their|this|these|those|very|not|as|if|than)$/i;\n// A word that leans on the one before it: breaking before it cuts a phrase in two (\"\\uac08 \\uc218\", \"\\ud560 \\ub54c\\ub3c4\",\n// \"\\uc788\\ub294 \\uac78\\ub85c\", \"\\ubc15\\uc9c4\\uc601 \\uc528\", \"\\uc5d0\\ub3c4 \\ubd88\\uad6c\\ud558\\uace0\"). These are dependent nouns with at most a particle after them;\n// an ordinary noun that merely starts the same way (\"\\uc218\\uc0c1\\uc790\\uac00\", \"\\uac70\\ub9ac\") does not match.\nconst PARTICLE =\n  \"(?:\\uc774|\\uac00|\\uc740|\\ub294|\\uc744|\\ub97c|\\ub3c4|\\ub9cc|\\uc5d0|\\uc758|\\ub85c|\\uc640|\\uacfc|\\uc73c\\ub85c|\\uc5d0\\uc11c|\\uc5d0\\uac8c|\\ud55c\\ud14c|\\uae4c\\uc9c0|\\ubd80\\ud130|\\ub9c8\\ub2e4|\\ucc98\\ub7fc|\\uc774\\ub098|\\ub77c\\ub3c4|\\ubc16\\uc5d0|\\uae4c\\uc9c0\\ub294|\\uc5d0\\ub294|\\uc5d0\\ub3c4|\\ub85c\\ub294|\\ub85c\\ub3c4|\\uc5d0\\uc11c\\ub294|\\uc774\\ub791|\\ub791|\\ub791\\uc740|\\uc774\\ub77c\\uace0|\\ub77c\\uace0|\\uc774\\ub77c|\\uc57c|\\uc694|\\uc8e0|\\uc608\\uc694|\\uc774\\uc5d0\\uc694|\\uc785\\ub2c8\\ub2e4|\\uc774\\ub2e4|\\uc778\\ub370|\\uc774\\uace0|\\uc774\\uc9c0|\\uc774\\uc8e0|\\ub4e0|\\ub098|\\ub4e4)?\";\nconst LEANS_BACK = new RegExp(\n  \"^(?:(?:\\uc218|\\uac83|\\uc904|\\ub54c|\\uc801|\\ub370|\\ubc14|\\ubfd0|\\ub4ef|\\uc911|\\ub4f1|\\ub3d9\\uc548|\\uc815\\ub3c4|\\ub54c\\ubb38|\\ub9cc\\ud07c|\\uc528|\\ub2d8|\\uce21|\\ucabd)\" +\n    PARTICLE +\n    \"|(?:\\uc7a5\\uad00|\\ucc28\\uad00|\\uc758\\uc6d0|\\ub300\\ud45c|\\uc704\\uc6d0\\uc7a5|\\uc704\\uc6d0|\\ud68c\\uc7a5|\\uc0ac\\uc7a5|\\uc758\\uc7a5|\\ub300\\ud1b5\\ub839|\\ucd1d\\ub9ac|\\uad50\\uc218|\\ubc15\\uc0ac|\\uae30\\uc790|\\uac10\\ub3c5|\\uc120\\uc218|\\uc791\\uac00|\\ud300\\uc7a5|\\uc2e4\\uc7a5|\\ubd80\\uc7a5|\\uacfc\\uc7a5|\\uc774\\uc0ac|\\ud6c4\\ubcf4|\\ubcc0\\ud638\\uc0ac|\\uac80\\uc0ac|\\ud310\\uc0ac|\\uc575\\ucee4)\\ub2d8?\" +\n    PARTICLE +\n    \"|(?:\\uac70|\\uac8c|\\uac74|\\uac78)(?:\\uc608\\uc694|\\uc5d0\\uc694|\\uc8e0|\\uc57c|\\uc9c0|\\uace0|\\ub4e0\\uc694|\\ub77c|\\ub77c\\uace0|\\ub77c\\uc11c|\\ub2c8\\uae4c|\\uc796\\uc544\\uc694|\\ub2e4|\\ub294|\\ub97c|\\ub85c|\\ub3c4|\\ub098|\\ub4e0|\\ub791|\\uac00|\\uba74)?|\\uac81\\ub2c8\\ub2e4|\\uac19\\uc740|\\uac19\\uc774|\\ucc98\\ub7fc|\\ubcf4\\ub2e4|\\ub300\\ub85c|\\ub9c8\\ub2e4|\\ubc16\\uc5d0|\\ubd88\\uad6c\\ud558\\uace0|\\ubabb[\\uac00-\\ud7a3]+|\\uc544\\ub2c8[\\uac00-\\ud7a3]+\" +\n    \"|(?:\\ud558|\\ud574|\\ud588|\\ud560|\\ud55c\\ub2e4|\\ud569|\\ub418|\\ub3fc|\\ub410|\\ub420|\\ub41c\\ub2e4|\\ub429)[\\uac00-\\ud7a3]{0,4})[.,?!]*$\"\n);\nconst NOT_A_VERB = /^(\\ud558\\ub098|\\ud558\\ub298|\\ud558\\ub8e8|\\ud558\\ubc18\\uae30|\\ud558\\ub77d|\\ud558\\uc704|\\ud574\\uc678|\\ud574\\uacb0|\\ud574\\uc11d|\\ud574\\ub2f9|\\ud574\\uccb4|\\ud574\\uba85|\\ud574\\uc9c0|\\ud574\\uc124|\\ud574\\ub2f5|\\ud560\\uba38\\ub2c8|\\ud560\\uc544\\ubc84\\uc9c0|\\ud560\\uc778|\\ud569\\uc758|\\ud569\\uaca9|\\ud569\\uacc4|\\ud569\\ub958|\\ud569\\uc791|\\ub418\\ub808)/;\n// A unit that follows a number (\"200\\ub9cc \\uc6d0\", \"4\\uac1c\\uc0ac\").\nconst COUNTER = /^(\\uc6d0|\\uba85|\\uac1c|\\ubc88|\\ub144|\\uc6d4|\\uc77c|\\uc2dc|\\ubd84|\\ucd08|\\uc0b4|\\uc5b5|\\ub9cc|\\ucc9c|\\ubc31|\\ubc30|\\ud37c\\uc13c\\ud2b8|\\ud504\\ub85c|\\ub2ec\\ub7ec|\\uc704|\\ucc28|\\ud68c|\\ub300|\\uacf3|\\uac00\\uc9c0|\\uac1c\\uc0ac|\\uac1c\\uc6d4|\\uc2dc\\uac04|\\uc8fc|\\uc8fc\\uc77c)[\\uac00-\\ud7a3]{0,2}[.,?!]*$/;\n// A word describing the next one (\"\\uace0\\ubc1c\\ub420 \\ud655\\ub960\", \"\\ub2f9\\uc5f0\\ud55c \\uc758\\uc2ec\", \"\\ud558\\uace0 \\uc2f6\\uc740 \\ub9c8\\uc74c\").\nconst DESCRIBES_NEXT = /(\\ud558\\ub294|\\ub418\\ub294|\\uc788\\ub294|\\uc5c6\\ub294|\\ub77c\\ub294|\\ub2e4\\ub294|\\uc54a\\ub294|\\uac19\\uc740|\\uc2f6\\uc740|\\ub9ce\\uc740|\\uc88b\\uc740|\\ub192\\uc740|\\uc791\\uc740|\\ud070|\\ub41c|\\ub358|\\uc788\\uc744|\\uc5c6\\uc744|\\ubc1b\\uc744|\\uac19\\uc744|[\\uac00-\\ud7a3]\\ud55c|[\\ud560\\ub420\\uac08\\uc62c\\ubcfc\\uc4f8\\ub0bc\\ube84\\uafc0\\ud0ac\\ub9b4\\ub084])$/;\n// Korean words normally end in a particle or an ending; one that does not is usually the first half of a\n// compound or an adverb, and belongs with what follows (\"\\ubb38\\uccb4\\ubd80 \\uc7a5\\uad00\", \"\\ud68c\\uc0ac \\uc77c\", \"\\ub300\\uad00 \\ubd80\\uc11c\").\nconst MARKED_END = /[\\uc740\\ub294\\uc774\\uac00\\uc744\\ub97c\\uc5d0\\uc758\\ub3c4\\ub9cc\\ub85c\\uc640\\uacfc\\uc11c\\uace0\\uc694\\ub2e4\\uc8e0\\uae4c\\ub124\\ub098\\uba70\\uba74\\uc9c0\\uac8c\\ub370\\uc57c\\ub77c\\uc790\\ub2c8\\uaed8\\ub791\\ub4e0\\uc529\\uc74c\\uc784\\uc5b4\\uc544\\ud574\\ub3fc\\ub798\\ub300\\uac78\\uac74\\uc918\\ubd10\\uc6cc\\uc838\\uc5ec]$/;\nconst HANGUL = /[\\uac00-\\ud7a3]/;\nconst NUMBER_WORD = /^([0-9]+|[\\uc77c\\uc774\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed\\ubc31\\ucc9c\\ub9cc\\uc5b5]+|\\ud55c|\\ub450|\\uc138|\\ub124|\\ub2e4\\uc12f|\\uc5ec\\uc12f|\\uc77c\\uacf1|\\uc5ec\\ub35f|\\uc544\\ud649|\\uc5f4)$/;\nconst STARTS_NUMBER = /^([0-9]|[\\uc77c\\uc774\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed\\ubc31\\ucc9c\\ub9cc\\uc5b5]|\\ud55c |\\ub450 |\\uc138 |\\ub124 )/;\n// The end of a clause in Korean, or a comma: a natural place to stop.\nconst CLAUSE_END = /(\\uace0|\\uba70|\\uc11c|\\uba74|\\ub294\\ub370|\\uc740\\ub370|\\uc778\\ub370|\\ub2c8\\uae4c|\\uc9c0\\ub9cc|\\ub2e4\\uac00|\\uba74\\uc11c|\\ub824\\uace0|\\ub3c4\\ub85d|\\uac70\\ub098|\\ub354\\ub2c8|\\ub2e4\\uba74|\\ub77c\\uba74)[,]?$/;\n// \"\\uc788\\ub2e4 / \\uc5c6\\ub2e4 / \\uc54a\\ub2e4 / \\uc2f6\\ub2e4\" finish a verb phrase (\"\\uac08 \\uc218 \\uc788\\uc744\\uae4c\", \"\\uc27d\\uc9c0 \\uc54a\\uc796\\uc544\\uc694\", \"\\ud558\\uace0 \\uc2f6\\uc740\"); after a\n// plain subject (\"\\ud655\\ub960 \\uc788\\ub294\") they pull much less.\nconst FINISHES_VERB = /^(\\uc788|\\uc5c6|\\uc54a|\\uc2f6)[\\uac00-\\ud7a3]*[.,?!]*$/;\nconst OPENS_VERB = /((\\uc218|\\uc904|\\uc801|\\ub9ac|\\ud544\\uc694)(\\uac00|\\ub294|\\uc740|\\ub3c4|\\ub97c|\\uc774)?|\\uace0|\\uc9c0|\\uc5b4|\\uc544|\\uac8c|\\ud574|\\uc57c|\\uc11c|\\ub3c4)$/;\n// A word a new clause opens with: breaking before it is natural (\"\\uc544\\ud2f0\\uc2a4\\ud2b8 / \\ud639\\uc740 \\ud68c\\uc0ac\\ub4e4\\uc744\").\nconst OPENS_CLAUSE = /^(\\ud639\\uc740|\\ub610\\ub294|\\uadf8\\ub9ac\\uace0|\\ubc0f|\\uadfc\\ub370|\\uadf8\\ub7f0\\ub370|\\ud558\\uc9c0\\ub9cc|\\uadf8\\ub798\\uc11c|\\uadf8\\ub7ec\\uba74|\\uadf8\\ub7ec\\ub2c8\\uae4c|\\uc65c\\ub0d0\\ud558\\uba74|and|or|but|so|because|we|they|i|he|she|which|who|when|where|while|if|although|though|then)$/i;\nconst SENTENCE_END = /[.?!\u3002\uff1f\uff01\u2026][\"'\u201d\u2019)]?$/;\n\n// Numbers said in Korean are shown in digits when a unit follows: \"\\uc2ed\\uc77c\\uac1c\\uc6d4\\uc9f8\" -> \"11\\uac1c\\uc6d4\\uc9f8\",\n// \"\\uc774\\ucc9c\\uc0bc\\ub144\\ub3c4\\uc600\\uc5b4\\uc694\" -> \"2003\\ub144\\ub3c4\\uc600\\uc5b4\\uc694\", \"\\uce60\\uc5b5\\uc774\" -> \"7\\uc5b5\\uc774\". A numeral with no unit, or one that is also an\n// everyday word (\"\\uc774\\ubc88\", \"\\uc2ed\\ubd84\", \"\\uc0ac\\ud68c\", \"\\uc624\\ucc28\", \"\\uc774\\ucc9c\\uc2dc\"), stays as it was said.\nconst KO_ONES: any = { \\uc77c: 1, \\uc774: 2, \\uc0bc: 3, \\uc0ac: 4, \\uc624: 5, \\uc721: 6, \\uce60: 7, \\ud314: 8, \\uad6c: 9 };\nconst KO_PLACES: any = { \\uc2ed: 10, \\ubc31: 100, \\ucc9c: 1000 };\nconst KO_NUMERAL = /^[\\uc77c\\uc774\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed\\ubc31\\ucc9c\\ub9cc\\uc5b5]+/;\nconst UNIT_LONG = /^(\\uac1c\\uc6d4|\\ub144\\ub3c4|\\ub144\\ub300|\\ub144\\uac04|\\ub144\\uc9f8|\\ub144\\uc0dd|\\ub144\\ucc28|\\uc8fc\\uc77c|\\uc8fc\\ub144|\\uc8fc\\uac04|\\uc2dc\\uac04|\\ubd84\\uac04|\\ucd08\\uac04|\\ud37c\\uc13c\\ud2b8|\\ud504\\ub85c|\\ub2ec\\ub7ec|\\uc720\\ub85c|\\ud0ac\\ub85c|\\ubbf8\\ud130|\\uc13c\\ud2f0|\\uadf8\\ub7a8|\\ub9ac\\ud130|\\ud559\\ub144|\\uc138\\uae30|\\ubd84\\uae30|\\uc778\\ubd84|\\uac1c\\uad6d|\\uac1c\\uc0ac|\\uac1c\\ub144|\\ud68c\\ucc28|\\ub4f1\\uae09|\\ub2e8\\uacc4|\\uc138\\ub300)/;\nconst UNIT_SHORT = /^(\\ub144|\\uc6d4|\\uc77c|\\uc2dc|\\ubd84|\\ucd08|\\uba85|\\uac1c|\\ubc88|\\uc6d0|\\uc704|\\ub4f1|\\ucc28|\\ud68c|\\uce35|\\ud638|\\ub300|\\uc138|\\uc778|\\ubc30|\\ud3b8|\\uace1|\\uc7a5|\\uad8c|\\ud300|\\uc2b9|\\ud328|\\uace8|\\uc810|\\ud3c9|\\uac74|\\ud45c|\\uc8fc|\\uc0b4)/;\n// One-syllable numerals joined to a one-syllable unit are mostly other words (\"\\uc774\\ubc88\", \"\\uc0ac\\ud68c\", \"\\uc624\\ucc28\",\n// \"\\uc77c\\uba85\"); only these are numbers for certain.\nconst SURE_SHORT = /^([\\uc77c\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed]\\ub144|[\\uc77c\\uc0bc\\uc0ac\\uc624\\uce60\\ud314\\uad6c]\\uc6d4|[\\uc77c\\uc774\\uc0bc]\\ucc28|[\\uc77c\\uc774\\uc0bc]\\ub4f1|[\\uc77c\\uc774]\\uc704|\\uc2ed\\ub300|[\\uc77c\\uc774\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed]\\uce35|[\\uc77c\\uc0bc\\uc624\\uc2ed]\\ucd08)/;\nconst MONTH_WORD: any = { \\uc720\\uc6d4: \"6\\uc6d4\", \\uc2dc\\uc6d4: \"10\\uc6d4\" };\n\nfunction koNumber(run: string): number | null {\n  let total = 0;\n  let group = 0;\n  let ones = 0;\n  let place = 10000;\n  let big = Infinity;\n  for (const ch of run) {\n    if (KO_ONES[ch]) {\n      if (ones) return null; // two digits in a row: \"\\uc0bc\\uc0ac\", \"\\uc774\\uc77c\"\n      ones = KO_ONES[ch];\n    } else if (KO_PLACES[ch]) {\n      if (KO_PLACES[ch] >= place) return null;\n      place = KO_PLACES[ch];\n      group += (ones || 1) * place;\n      ones = 0;\n    } else {\n      const unit = ch === \"\\uc5b5\" ? 1e8 : 1e4;\n      if (unit >= big) return null;\n      big = unit;\n      total += (group + ones || 1) * unit;\n      group = 0;\n      ones = 0;\n      place = 10000;\n    }\n  }\n  return total + group + ones;\n}\n// 2003 -> \"2003\", 700000000 -> \"7\\uc5b5\", 40000000 -> \"4\\ucc9c\\ub9cc\", 35000000 -> \"3500\\ub9cc\".\nfunction koShown(n: number): string {\n  if (n < 10000) return String(n);\n  const part = (v: number, unit: string) => (v ? (v >= 1000 && v % 1000 === 0 ? v / 1000 + \"\\ucc9c\" : String(v)) + unit : \"\");\n  const rest = n % 10000;\n  return part(Math.floor(n / 1e8), \"\\uc5b5\") + part(Math.floor((n % 1e8) / 1e4), \"\\ub9cc\") + (rest ? String(rest) : \"\");\n}\n// A unit ends the number only when the word stops there or goes on with a particle or an ending; \"\\ud504\\ub85c\" in\n// \"\\ud504\\ub85c\\uc81d\\ud2b8\" and \"\\uc138\\ub300\" in \"\\uc138\\ub300\\uc8fc\" are other words.\nconst AFTER_UNIT = /^([\\uc774\\uac00\\uc740\\ub294\\uc744\\ub97c\\uc5d0\\uc758\\ub3c4\\ub9cc\\ub85c\\uc640\\uacfc\\ub098\\ubd80\\uae4c\\uc11c\\ubc16\\ub9c8\\uc9f8\\uac04\\ucbe4\\uc529\\uc9dc\\uc5ec\\uc600\\uc785\\uc608\\uc778\\ub3d9\\uc804\\ud6c4\\ub4a4\\uc815\\uc548\\ub54c\\uc0dd][\\uac00-\\ud7a3]*)?[.,?!]*$/;\nconst unitIn = (units: RegExp, text: string): string | null => {\n  const m = units.exec(text);\n  return m && AFTER_UNIT.test(text.slice(m[1].length)) ? m[1] : null;\n};\n// What may follow a number of this size: a clock has 24 hours and a year 12 months (\"\\uc774\\ucc9c\\uc2dc\" is a city).\nconst fitsUnit = (unit: string, n: number) => (unit === \"\\uc2dc\" ? n <= 24 : unit === \"\\uc6d4\" ? n <= 12 : true);\n\nfunction koDigits(word: string, next: string | null): string {\n  for (const m of Object.keys(MONTH_WORD)) if (word.startsWith(m) && !/^[\\uac00-\\ud7a3]{2,}/.test(word.slice(m.length).replace(/^(\\uc5d0|\\uc740|\\ub294|\\uc774|\\uac00|\\ub3c4|\\ubd80\\ud130|\\uae4c\\uc9c0|\\ub2ec|\\uc758|\\uc5d0\\ub294|\\uc5d0\\ub3c4)/, \"\"))) return MONTH_WORD[m] + word.slice(m.length);\n  const found = word.match(KO_NUMERAL);\n  if (!found) return word;\n  for (let len = found[0].length; len >= 1; len--) {\n    const run = found[0].slice(0, len);\n    const n = koNumber(run);\n    if (!n) continue;\n    const rest = word.slice(len);\n    const alone = /^[.,?!]*$/.test(rest);\n    // The unit is in this word (\"\\uc2ed\\uc77c\\uac1c\\uc6d4\\uc9f8\"), or it is the next word (\"\\uc774\\uc2ed \\uba85\").\n    const after = alone ? String(next || \"\") : rest;\n    const short = unitIn(UNIT_SHORT, after);\n    let ok = false;\n    if (unitIn(UNIT_LONG, after)) ok = run !== \"\\uc774\" || !alone;\n    else if (short && fitsUnit(short, n)) ok = run.length >= 2 ? !/^[\\uc5b5\\ub9cc]$/.test(run.slice(-1)) || /^(\\uc6d0|\\uba85|\\uac1c|\\ub144|\\ud3c9|\\ub300|\\uc7a5|\\uac74|\\ud45c|\\ubc30)$/.test(short) : alone ? run !== \"\\uc774\" && run !== \"\\ub9cc\" && run !== \"\\uc5b5\" : SURE_SHORT.test(run + after);\n    else if (!alone && run.length >= 2 && /\\uc5b5$/.test(run) && n >= 1e8) ok = !/^[\\uac00-\\ud7a3]{3,}/.test(rest); // \"\\uce60\\uc5b5\\uc774\", \"\\uc2ed\\uc5b5\\uc744\"\n    if (ok && alone && !rest && /^,/.test(after)) ok = false;\n    if (ok) return koShown(n) + rest;\n  }\n  return word;\n}\n\nconst shown = (t: string) => t.replace(/\\./g, \"\");\nconst width = (ws: any[], a: number, b: number) => {\n  let n = b - a - 1;\n  for (let i = a; i < b; i++) n += shown(String(ws[i][0])).length;\n  return Math.max(0, n);\n};\n\n// How bad it is to break between word i and word i + 1 (lower is better).\nfunction joint(ws: any[], i: number, fps: number): number {\n  const cur = String(ws[i][0]);\n  const next = String(ws[i + 1][0]);\n  const bare = cur.replace(/[.,?!]+$/, \"\");\n  const stop = (k: number) => {\n    const w = String(ws[k][0]);\n    const b = w.replace(/[.,?!]+$/, \"\");\n    return /,$/.test(w) || (CLAUSE_END.test(w) && !LEANS_FORWARD.test(b)) || (ws[k + 1][1] - ws[k][2]) / fps >= 0.5;\n  };\n  let s = 0;\n  const predicate = FINISHES_VERB.test(next) && !LEANS_BACK.test(next);\n  if (OPENS_CLAUSE.test(next.replace(/[.,?!]+$/, \"\"))) s -= 2;\n  else if (LEANS_FORWARD.test(bare)) s += 8;\n  else if (cur === bare && HANGUL.test(next) && !predicate) {\n    if (DESCRIBES_NEXT.test(bare)) s += 4;\n    else if (!MARKED_END.test(bare)) s += 3.5;\n  }\n  if (LEANS_BACK.test(next) && !NOT_A_VERB.test(next)) s += 6;\n  else if (predicate) s += OPENS_VERB.test(bare) ? 6 : 3;\n  if (/[0-9]/.test(bare) && (COUNTER.test(next) || /[0-9%]$/.test(bare))) s += 6;\n  const pause = (ws[i + 1][1] - ws[i][2]) / fps;\n  if (pause >= 0.3) s -= 2 + Math.min(2, pause);\n  if (NUMBER_WORD.test(bare) && STARTS_NUMBER.test(next + \" \")) s += 8;\n  else if (/,$/.test(cur)) s -= 3;\n  else if (CLAUSE_END.test(cur) && !LEANS_FORWARD.test(bare)) s -= 3;\n  // One word past a natural stop (\"\\ucd94\\uc9c4\\ud558\\ub294\\ub370 \\ucc98\\uc74c\\uc5d0\\ub294 / \\uc6b0\\ub9ac\") strands the word that opens the next clause.\n  if (i >= 1 && !stop(i) && stop(i - 1)) s += 3;\n  return s;\n}\n\n// The best place to fold words [a, b) into two lines: [index of the first word of line two, cost]. One\n// line when it fits. `at(i)` is the cost of breaking after word i.\nfunction fold(ws: any[], a: number, b: number, maxc: number, at: (i: number) => number): [number, number] {\n  if (width(ws, a, b) <= maxc || b - a < 2) return [b, 0];\n  let best: [number, number] = [b, Infinity];\n  let top = -1;\n  const all = width(ws, a, b);\n  for (let k = a + 1; k < b; k++) {\n    top += shown(String(ws[k - 1][0])).length + 1;\n    const bottom = all - top - 1;\n    const over = Math.max(0, top - maxc) + Math.max(0, bottom - maxc);\n    const c = Math.abs(top - bottom) * 0.35 + over * 6 + at(k - 1) + (top > bottom + 3 ? 1 : 0) + (Math.min(top, bottom) < 5 ? 3 : 0);\n    if (c < best[1]) best = [k, c];\n  }\n  return best;\n}\n\n// Divide one sentence into captions: [end index of each caption]. Every way of cutting it into the\n// fewest captions that fit, or one more, is scored: even lengths, natural cuts and folds, nothing too\n// short to read.\nfunction divide(ws: any[], a: number, b: number, maxc: number, fps: number): number[] {\n  const cap = maxc * 2 - 1;\n  const n = b - a;\n  const total = width(ws, a, b);\n  if (n < 2 || total <= maxc) return [b];\n  const cuts: number[] = [];\n  for (let i = a; i < b - 1; i++) cuts.push(joint(ws, i, fps));\n  const at = (i: number) => cuts[i - a];\n  const folds = new Map<number, number>();\n  const lines = (i: number, j: number) => {\n    const key = i * 100000 + j;\n    let v = folds.get(key);\n    if (v === undefined) {\n      v = fold(ws, i, j, maxc, at)[1];\n      folds.set(key, v);\n    }\n    return v;\n  };\n  // The fewest captions that can hold it, filling each as far as it goes.\n  let least = 0;\n  for (let i = a; i < b; least++) {\n    let j = i + 1;\n    while (j < b && width(ws, i, j + 1) <= cap) j++;\n    i = j;\n  }\n  let bestCost = Infinity;\n  let bestCuts: number[] = [b];\n  for (let k = least; k <= Math.min(n, least + 1); k++) {\n    const ideal = total / k;\n    // cost[p][j]: the first j words in p captions.\n    const cost: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(Infinity));\n    const from: number[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(-1));\n    cost[0][0] = 0;\n    for (let p = 1; p <= k; p++) {\n      for (let j = p; j <= n; j++) {\n        for (let i = j - 1; i >= p - 1; i--) {\n          const w = width(ws, a + i, a + j);\n          if (w > cap && j - i > 1) break;\n          if (cost[p - 1][i] === Infinity) continue;\n          const uneven = ((w - ideal) / ideal) ** 2 * 6;\n          // A caption on screen for well under a second cannot be read.\n          const seconds = ((j < n ? ws[a + j][1] : ws[b - 1][2] + 0.4 * fps) - ws[a + i][1]) / fps;\n          const stub = (w < 6 ? 8 : 0) + (seconds < 0.5 ? 12 : seconds < 0.8 ? 6 : 0);\n          const c = cost[p - 1][i] + uneven + stub + lines(a + i, a + j) + (j < n ? at(a + j - 1) : 0);\n          if (c < cost[p][j]) {\n            cost[p][j] = c;\n            from[p][j] = i;\n          }\n        }\n      }\n    }\n    // A further caption has to earn its place.\n    const c = cost[k][n] + k * 3;\n    if (c < bestCost) {\n      const ends: number[] = [];\n      for (let p = k, j = n; p > 0; p--) {\n        ends.unshift(a + j);\n        j = from[p][j];\n      }\n      bestCost = c;\n      bestCuts = ends;\n    }\n  }\n  return bestCuts;\n}\n\nfunction makeCues(words: any[], fps: number, maxc: number, total: number, fixes: any[]): [number, number, string][] {\n  const clean = (t: string) => t.replace(/[\"\u201c\u201d]/g, \"\");\n  const ws = words\n    .map((w: any) => [clean(String(w[0])), w[1], w[2], w[3], w[4] ?? null, w[5] ?? null])\n    .filter((w: any) => String(w[0]).trim().length > 0 && !FILLER.test(String(w[0]).trim()));\n  if (!ws.length) return [];\n  // Numbers in digits, including the first of a pair said together (\"\\ud55c \\uc721, \\uce60\\uc5b5\" -> \"\\ud55c 6, 7\\uc5b5\").\n  for (let i = 0; i < ws.length; i++) ws[i][0] = koDigits(String(ws[i][0]), i + 1 < ws.length ? String(ws[i + 1][0]) : null);\n  for (let i = 0; i + 1 < ws.length; i++) {\n    const pair = String(ws[i][0]).match(/^([\\uc77c\\uc774\\uc0bc\\uc0ac\\uc624\\uc721\\uce60\\ud314\\uad6c\\uc2ed]),$/);\n    if (pair && /^[0-9]/.test(String(ws[i + 1][0]))) ws[i][0] = String(koNumber(pair[1])) + \",\";\n  }\n  // 1. Sentences: a new one starts with another speaker, after a full stop, at a cut in the source, or\n  // after a long silence.\n  const starts: number[] = [0];\n  for (let i = 1; i < ws.length; i++) {\n    const prev = ws[i - 1];\n    const w = ws[i];\n    const silence = (w[1] - prev[2]) / fps;\n    const cutInSource = w[3] != null && prev[3] != null && Math.abs(w[3] - prev[3] - (w[1] - prev[1])) > fps * 3;\n    const otherSpeaker = w[4] != null && prev[4] != null && w[4] !== prev[4];\n    const otherUtterance = w[5] != null && prev[5] != null && w[5] !== prev[5] && SENTENCE_END.test(String(prev[0]));\n    if (otherSpeaker || otherUtterance || SENTENCE_END.test(String(prev[0])) || cutInSource || silence > 1.5) starts.push(i);\n  }\n  starts.push(ws.length);\n  // 2. Captions within each sentence.\n  const groups: [number, number][] = [];\n  for (let s = 0; s + 1 < starts.length; s++) {\n    let a = starts[s];\n    for (const b of divide(ws, a, starts[s + 1], maxc, fps)) {\n      groups.push([a, b]);\n      a = b;\n    }\n  }\n  // 3. A one-word reply (\"\\uc608.\", \"Right.\") gets its own caption. Only when it would be gone before it can\n  // be read does it join the caption before it; it never joins the sentence that follows.\n  const merged: [number, number][] = [];\n  const replyAt = new Map<number, number>(); // caption start -> index where a joined reply begins\n  for (let g = 0; g < groups.length; g++) {\n    const [a, b] = groups[g];\n    const nextStart = g + 1 < groups.length ? ws[groups[g + 1][0]][1] : total;\n    const onScreen = (Math.min(nextStart, ws[b - 1][2] + Math.round(0.6 * fps)) - ws[a][1]) / fps;\n    const last = merged[merged.length - 1];\n    if (last && width(ws, a, b) <= 3 && onScreen < 0.35 && width(ws, last[0], b) <= maxc * 2 - 1 && (ws[a][1] - ws[last[1] - 1][2]) / fps < 0.8) {\n      if (!replyAt.has(last[0])) replyAt.set(last[0], a);\n      last[1] = b;\n      continue;\n    }\n    merged.push([a, b]);\n  }\n  // 4. Text and timing.\n  const out: [number, number, string][] = [];\n  for (let g = 0; g < merged.length; g++) {\n    const [a, b] = merged[g];\n    let piece: any[] = ws.slice(a, b);\n    let joined = piece.map((x: any) => String(x[0])).join(\" \");\n    for (const f of fixes || []) if (f && f.from) joined = joined.split(String(f.from)).join(String(f.to ?? \"\"));\n    const fixed = joined.split(\" \").filter((t: string) => shown(t).length > 0);\n    // Fold on the words as they will be shown; timing for pauses comes from the original words when the\n    // spelling fixes kept their number, otherwise from none.\n    const timed = fixed.length === piece.length ? fixed.map((t: string, i: number) => [t, piece[i][1], piece[i][2]]) : fixed.map((t: string) => [t, 0, 0]);\n    const reply = replyAt.get(a);\n    const own = reply !== undefined && fixed.length === piece.length && width(ws, a, reply) <= maxc ? reply - a : -1;\n    const k = own > 0 ? own : fold(timed, 0, timed.length, maxc, (i: number) => joint(timed, i, fps))[0];\n    const text = k >= timed.length ? fixed.map(shown).join(\" \") : fixed.slice(0, k).map(shown).join(\" \") + \"\\n\" + fixed.slice(k).map(shown).join(\" \");\n    const start = ws[a][1];\n    let end = g + 1 < merged.length ? ws[merged[g + 1][0]][1] : total;\n    if (g + 1 < merged.length && (ws[merged[g + 1][0]][1] - ws[b - 1][2]) / fps > 1.2) end = Math.min(end, ws[b - 1][2] + Math.round(0.6 * fps));\n    out.push([Math.round(start), Math.round(end), text]);\n  }\n  for (let i = 0; i < out.length - 1; i++) {\n    const g = out[i + 1][0] - out[i][1];\n    if (g > 0 && g < 8) out[i][1] = out[i + 1][0];\n  }\n  // 5. Every caption stays long enough to read: one that would flash by borrows the time from the\n  // silence after it, or from the start of a longer caption that follows.\n  const least = Math.round(0.6 * fps);\n  for (let i = 0; i < out.length; i++) {\n    const short = least - (out[i][1] - out[i][0]);\n    if (short <= 0) continue;\n    const next = out[i + 1];\n    if (!next) {\n      out[i][1] = Math.min(total, out[i][0] + least);\n      continue;\n    }\n    const silence = next[0] - out[i][1];\n    if (silence >= short) out[i][1] += short;\n    else if (next[1] - next[0] - (short - silence) >= Math.round(1.0 * fps)) {\n      out[i][1] += short;\n      next[0] = out[i][1];\n    } else out[i][1] = next[0];\n  }\n  if (out.length && out[0][0] < 10) out[0][0] = 0;\n  return out;\n}\n\n// Resource ids are Project-scoped aliases; listing the resources first makes a saved id valid in this\n// session, and the file name finds the same video again if the alias changed.\nasync function resolveResource(project: any, id: string, name: string): Promise<string> {\n  const rows = await project.resources();\n  const hit =\n    rows.find((r: any) => r.resourceId === id && (!name || r.name === name)) ||\n    (name ? rows.find((r: any) => r.name === name) : null) ||\n    rows.find((r: any) => r.resourceId === id);\n  if (!hit) throw new Error(\"The source video is no longer in this project.\");\n  return hit.resourceId;\n}\nconst project = selects.project(P.projectId);\nconst RID = await resolveResource(project, P.resourceId, P.resourceName || \"\");\nconst src = project.resource(RID);\nconst sm = await src.meta();\nconst sfps = sm.fps;\nconst sws = (await src.words()).filter((w: any) => !w.nonSpeech && String(w.text).trim().length > 0);\nconst W: number[][] = sws.map((w: any) => [w.startFrame / sfps, w.endFrame / sfps]);\nif (!W.length) throw new Error(\"The source has no transcript words. Analyze it first.\");\n\n// Snap each requested range to whole words without catching the neighbouring word.\nfunction snap(a: number, b: number): number[] {\n  let i = 0;\n  let j = 0;\n  let bi = Infinity;\n  let bj = Infinity;\n  for (let k = 0; k < W.length; k++) {\n    const da = Math.abs(W[k][0] - a);\n    if (da < bi) {\n      bi = da;\n      i = k;\n    }\n    const db = Math.abs(W[k][1] - b);\n    if (db < bj) {\n      bj = db;\n      j = k;\n    }\n  }\n  if (j < i) j = i;\n  const prevEnd = i > 0 ? W[i - 1][1] : 0;\n  const nextStart = j + 1 < W.length ? W[j + 1][0] : W[j][1] + 1;\n  const start = Math.max(prevEnd + 0.03, W[i][0] - 0.15, 0);\n  const end = Math.min(nextStart - 0.04, W[j][1] + 0.22, sm.durationSeconds);\n  return [Math.round(start * 1000) / 1000, Math.round(end * 1000) / 1000];\n}\n\nconst segs = (P.segments as number[][]).map((s) => snap(Number(s[0]), Number(s[1]))).filter((s) => s[1] - s[0] > 0.5);\nif (!segs.length) throw new Error(\"No usable source range for this clip.\");\n\nconst d = await project.createDraft({ name: P.name });\nfor (const s of segs) {\n  await d.insertResource({ resourceId: RID, sourceRange: { startSeconds: s[0], endSeconds: s[1] } });\n}\nif (P.removeFillers) {\n  const fill = (await d.words()).filter((w: any) => w.filler && w.filler.removable);\n  if (fill.length) await d.remove(fill.map((w: any) => w.span), { tracks: \"all\" });\n}\nif (P.removeSilences) {\n  const sil = await d.silenceSpans({ preset: \"normal\" });\n  const cut = sil.flatMap((x: any) => x.cutSpans);\n  if (cut.length) await d.remove(cut, { tracks: \"all\" });\n}\nawait d.setFrameSize({ width: 1080, height: 1920 });\nconst readV = async () =>\n  (await d.clips({ trackScope: \"all\" })).filter((c: any) => c.resourceId !== null && (c.trackKind === \"main\" || c.trackKind === \"video\"));\nconst nV = (await readV()).length;\nfor (let k = 0; k < nV; k++) {\n  const c = (await readV())[k];\n  await d.setClipTransform({\n    clip: c,\n    scale: { x: P.transform.scale, y: P.transform.scale },\n    position: { x: P.transform.posX, y: P.transform.posY },\n  });\n}\nconst mainClips = await d.clips({ trackScope: \"main\" });\nconst endFrame = mainClips.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0);\nconst meta = await d.meta();\nawait d.addMotionGraphic({\n  label: \"Series frame and headline\",\n  tsxCode: FRAME_TSX,\n  parameters: P.frame,\n  editableParameters: P.editableFrame,\n  within: await d.rangeAtFrames(0, endFrame),\n});\nlet cueCount = 0;\nif (P.captions && P.caption) {\n  const words = (await d.words())\n    .filter((w: any) => !w.nonSpeech)\n    .map((w: any) => [String(w.text), w.startFrame, w.endFrame, w.sourceStartFrame, w.speakerId ?? null, w.utteranceId ?? null]);\n  const cues = makeCues(words, meta.fps, P.lineMax, endFrame, P.fixes);\n  for (let k = 0; k < cues.length; k++) {\n    const a = cues[k][0];\n    const e = Math.min(cues[k][1], endFrame);\n    if (e <= a) continue;\n    await d.addMotionGraphic({\n      label: \"Caption \" + String(k + 1).padStart(2, \"0\"),\n      tsxCode: CAPTION_TSX,\n      parameters: { ...P.caption, text: cues[k][2] },\n      editableParameters: P.editableCaption,\n      within: await d.rangeAtFrames(a, e),\n    });\n    cueCount++;\n  }\n}\nconst out: any = await d.commitAll(\"Clip: \" + P.name);\nreturn { draftId: out.createdDraftId ?? null, seconds: Math.round((endFrame / meta.fps) * 10) / 10, captions: cueCount, segments: segs };\n";
const SCRIPT_TRANSCRIPT: any = "// run_script body: return the source transcript as sentence lines with source-second timings, one page at a time.\nconst P: any = __P__;\n// Resource ids are Project-scoped aliases; listing the resources first makes a saved id valid in this\n// session, and the file name finds the same video again if the alias changed.\nasync function resolveResource(project: any, id: string, name: string): Promise<string> {\n  const rows = await project.resources();\n  const hit =\n    rows.find((r: any) => r.resourceId === id && (!name || r.name === name)) ||\n    (name ? rows.find((r: any) => r.name === name) : null) ||\n    rows.find((r: any) => r.resourceId === id);\n  if (!hit) throw new Error(\"The source video is no longer in this project.\");\n  return hit.resourceId;\n}\nconst project = selects.project(P.projectId);\nconst src = project.resource(await resolveResource(project, P.resourceId, P.resourceName || \"\"));\nconst m = await src.meta();\nconst ws = (await src.words()).filter((w: any) => !w.nonSpeech && String(w.text).trim().length > 0);\nconst lines: any[][] = [];\nlet cur: any[] = [];\nfor (const w of ws) {\n  cur.push(w);\n  if (/[.?!]$/.test(String(w.text)) || cur.length >= 28) {\n    lines.push(cur);\n    cur = [];\n  }\n}\nif (cur.length) lines.push(cur);\nconst r1 = (x: number) => Math.round(x * 10) / 10;\nconst all = lines.map((l) => [r1(l[0].startFrame / m.fps), r1(l[l.length - 1].endFrame / m.fps), l.map((w: any) => String(w.text)).join(\" \")]);\nreturn { duration: m.durationSeconds, total: all.length, lines: all.slice(P.offset, P.offset + P.limit) };\n";
const APP_ID = APP_CONFIG.id;
const PreviewFrame: any = (() => {

const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

function ClipFrame({ data }) {
  const W = 1080, H = 1920;
  const top = Number(data?.windowTop ?? 420);
  const bottom = Number(data?.windowBottom ?? 1255);
  const bg = String(data?.background ?? '#1E1F22');
  const h1 = String(data?.headline1 ?? '');
  const h2 = String(data?.headline2 ?? '');
  const size1 = Number(data?.headlineSize1 ?? 84);
  const size2 = Number(data?.headlineSize2 ?? size1);
  const color1 = String(data?.headlineColor1 ?? '#FFFFFF');
  const color2 = String(data?.headlineColor2 ?? '#FFFFFF');
  const box2 = String(data?.headline2Box ?? '');
  const italic = Boolean(data?.headlineItalic ?? false);
  const headlineCenter = Number(data?.headlineCenter ?? top / 2 + 40);
  const captionBar = Number(data?.captionBarHeight ?? 0);
  const logoCenter = Number(data?.logoCenter ?? (bottom + captionBar + H) / 2);
  const border = Boolean(data?.goldBorder ?? false);
  const shadow = String(data?.headlineShadow ?? '0 4px 10px rgba(0,0,0,.55)');
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const headFont = family === '' ? FONT : `"${family}", ${FONT}`;
  const bgImage = String(data?.backgroundImage ?? '');
  const bgDim = Math.max(0, Math.min(90, Number(data?.backgroundDim ?? 0)));
  const borderColor = String(data?.borderColor ?? '#C9A45C');
  const logoMode = String(data?.logoMode ?? 'none');
  const logoImage = String(data?.logoImage ?? '');
  const logoWidth = Number(data?.logoWidth ?? 600);
  // A background image is one 1080x1920 picture shown only where the video window is not.
  const band = (y, h) =>
    bgImage ? (
      <div style={{ position: 'absolute', left: 0, top: y, width: W, height: h, backgroundImage: `url(${bgImage})`, backgroundSize: `${W}px ${H}px`, backgroundPosition: `0px ${-y}px` }}>
        {bgDim > 0 ? <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: h, background: `rgba(0,0,0,${bgDim / 100})` }} /> : null}
      </div>
    ) : (
      <div style={{ position: 'absolute', left: 0, top: y, width: W, height: h, background: bg }} />
    );
  const est = (t) => Array.from(t).reduce((w, ch) => w + (/[\uAC00-\uD7A3\u4E00-\u9FFF]/.test(ch) ? 0.93 : ch === ' ' ? 0.27 : /[0-9A-Za-z%]/.test(ch) ? 0.6 : 0.4), 0);
  const fit = (t, size, maxW) => Math.min(size, Math.floor(maxW / Math.max(1, est(t)) - 2));
  const lineStyle = (size, color) => ({
    fontSize: size, fontWeight: 900, color, lineHeight: 1.16, letterSpacing: '-2px',
    fontStyle: italic ? 'italic' : 'normal', whiteSpace: 'nowrap', textShadow: shadow,
    WebkitTextStroke: `${Math.max(1, Math.round(size * 0.035))}px ${color}`, paintOrder: 'stroke fill',
  });
  const s1 = fit(h1, size1, 1010);
  const s2 = fit(h2, size2, box2 ? 970 : 1010);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, fontFamily: FONT, pointerEvents: 'none' }}>
      {band(0, top)}
      {band(bottom, H - bottom)}
      {captionBar > 0 ? <div style={{ position: 'absolute', left: 0, top: bottom, width: W, height: captionBar, background: '#000000' }} /> : null}
      {border ? (
        <>
          <div style={{ position: 'absolute', left: 22, top: 22, width: W - 44, height: top - 22, borderTop: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}` }} />
          <div style={{ position: 'absolute', left: 22, top: bottom, width: W - 44, height: H - bottom - 22, borderBottom: `3px solid ${borderColor}`, borderLeft: `3px solid ${borderColor}`, borderRight: `3px solid ${borderColor}` }} />
        </>
      ) : null}
      <div style={{ position: 'absolute', left: 30, width: W - 60, top: headlineCenter, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: box2 ? 14 : 2, textAlign: 'center', fontFamily: headFont }}>
        {h1 ? <div style={lineStyle(s1, color1)}>{h1}</div> : null}
        {h2 ? (
          box2 ? (
            <div style={{ ...lineStyle(s2, color2), textShadow: 'none', background: box2, padding: '4px 18px 8px' }}>{h2}</div>
          ) : (
            <div style={lineStyle(s2, color2)}>{h2}</div>
          )
        ) : null}
      </div>
      <div style={{ position: 'absolute', left: 0, width: W, top: logoCenter, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center' }}>
        {logoMode === 'image' && logoImage ? (
          <img src={logoImage} style={{ width: logoWidth, height: 'auto', display: 'block' }} />
        ) : null}
      </div>
    </div>
  );
}

return ClipFrame;
})();
const PreviewCaption: any = (() => {

const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

function ClipCaption({ data }) {
  const lines = String(data?.text ?? '').split('\n');
  const mode = String(data?.mode ?? 'bar');
  const size = Number(data?.fontSize ?? 66);
  const weight = Number(data?.fontWeight ?? 600);
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const font = family === '' ? FONT : `"${family}", ${FONT}`;
  const color = String(data?.textColor ?? '#FFFFFF');
  if (mode === 'bar') {
    const top = Number(data?.top ?? 1255);
    const height = Number(data?.height ?? 230);
    return (
      <div style={{ position: 'absolute', left: 40, width: 1000, top, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: font, pointerEvents: 'none' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.28, letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{line}</div>
        ))}
      </div>
    );
  }
  const bottom = Number(data?.bottom ?? 1440);
  const box = String(data?.boxColor ?? 'rgba(0,0,0,0.62)');
  return (
    <div style={{ position: 'absolute', left: 40, width: 1000, top: 0, height: bottom, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', fontFamily: font, pointerEvents: 'none' }}>
      <div style={{ background: box, padding: '10px 26px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, letterSpacing: '-1px', whiteSpace: 'nowrap' }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

return ClipCaption;
})();
// App UI and clip workflow.
const IS_WIN =
  typeof navigator !== "undefined" && (/^win/i.test(String(navigator.platform || "")) || /Windows/.test(String(navigator.userAgent || "")));
const YTDLP_URL = IS_WIN
  ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
  : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
const SHADOW = "0 4px 10px rgba(0,0,0,.55)";

const STRINGS: any = {
  en: {
    tabMake: "Make clips",
    tabTemplates: "Templates",
    noProject: "Open a project first.",
    source: "Source video",
    sourceKind: "Get it from",
    programPick: "Template",
    credits: "May use credits.",
    optionsSec: "Settings",
    cancel: "Cancel",
    cancelling: "Cancelling…",
    cancelled: "Cancelled. Pick it up again under Unfinished work.",
    finished: "Done",
    analyzingLeft: (m: number) => `Analyzing · about ${m} min left`,
    thisRun: "This run",
    identifying: "Identifying the program…",
    choosing: "The AI is choosing passages and writing headlines. This can take a few minutes.",
    building: (i: number, n: number) => `Building draft ${i} of ${n}…`,
    downloading: (n: number) => (n > 1 ? `Downloading the video… (attempt ${n})` : "Downloading the video…"),
    elapsed: (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`),
    secWindow: "Video window",
    secCrop: "Source crop",
    secPositions: "Headline and logo",
    preparingSource: "Getting ready to download the video…",
    fromYoutube: "YouTube link",
    fromProject: "Project video",
    url: "YouTube link",
    urlPh: "https://www.youtube.com/watch?v=...",
    pick: "Video",
    pickPh: "Choose a video in this project",
    refresh: "Refresh list",
    program: "Template",
    auto: "Detect automatically",
    count: "Number of clips",
    countAuto: "Recommended",
    countManual: "Set",
    howMany: "Clips",
    note: "Extra instructions (optional)",
    notePh: "e.g. focus on practical takeaways, under 60 seconds",
    make: "Make clips",
    making: "Making…",
    steps: ["Prepare source", "Analyze", "Identify program", "Choose passages", "Build drafts"],
    confirmCredits: "Selects is asking you to confirm the transcription credits. Approve it in the Selects window as soon as it appears; it closes by itself within about 30 seconds…",
    confirmMissed: "The credit confirmation was not approved, so transcription did not start. Selects keeps that request open for about 30 seconds. Nothing was charged.",
    waitingAnalysis: "Analyzing. This takes a few minutes depending on length.",
    detected: "Template",
    recommended: "Recommended",
    clipsUnit: (n: number) => `${n} ${n === 1 ? "clip" : "clips"}`,
    minutes: (n: number) => `${n} min`,
    seconds: (n: number) => `${n}s`,
    notAnalyzed: "not analyzed",
    open: "Open",
    result: "Drafts",
    done: (n: number) => `Made ${n} drafts. Open one below to refine it, then use Export at the top right.`,
    needUrl: "Paste a YouTube link.",
    needPick: "Choose a video.",
    unsupported: "No template matches this video. Choose the template yourself.",
    templateGone: "The template this job used was deleted. Choose another template and start again.",
    emptyTranscript: "The transcript is empty.",
    noPassage: "The agent found no passage that meets the bar.",
    noJson: "The agent did not return a usable answer. Try again.",
    analysisFailed: (s: string) => `Analysis failed (${s}).`,
    analysisSlow: "Analysis is taking too long. Try again later; finished work is kept.",
    importFailed: "Import did not add the video.",
    readLinkFailed: "Could not read the link: ",
    downloadFailed: "Download failed: ",
    downloadUnfinished: "The download did not finish. Press Resume to continue it.",
    noFileAccess: "This Selects version does not let apps save files. Update Selects and try again.",
    whyTitle: "title or file name",
    whyTranscript: "host or program named in the transcript",
    whyAI: "identified by AI",
    whyManual: "chosen by you",
    whyDefault: "default template",
    saved: "Unfinished work",
    resume: "Resume",
    dismiss: "Dismiss",
    resumeHint: "Progress is saved; press Resume to continue.",
    stage: (j: any) =>
      j.choice
        ? `${(j.built || []).filter((b: any) => b && b.draftId).length}/${j.choice.clips.length} drafts built`
        : j.key
          ? "before choosing passages"
          : j.analyzed
            ? "before identifying the program"
            : j.resourceId
              ? "before analysis"
              : "before preparing the source",
    ytdlpFailed: "Could not get the YouTube downloader: ",
    noFfmpeg: "ffmpeg was not found, so the video was downloaded at a lower quality.",
    // Templates tab
    template: "Template",
    name: "Name",
    duplicate: "Duplicate",
    reset: "Reset to default",
    del: "Delete",
    delConfirm: "Press again to delete",
    save: "Save",
    discard: "Discard changes",
    savedOk: "Saved.",
    unsaved: "Unsaved changes. Save or discard them before switching templates.",
    copyName: (n: string) => `${n} copy`,
    builtInNote: "Built-in template. Changes are saved on this computer; Reset to default restores the original.",
    modifiedNote: "Built-in template, changed on this computer.",
    customNote: "Your template.",
    tabLook: "Look",
    tabCaptions: "Captions",
    tabAI: "AI",
    preview: "Preview",
    sampleH1: "\"The strongest line here\"",
    sampleH2: "Who said it",
    sampleCaption: "Captions appear here\nin up to two lines",
    videoArea: "VIDEO",
    windowTop: "Top",
    windowBottom: "Bottom",
    sourceTop: "Top",
    sourceBottom: "Bottom",
    offsetX: "Shift sideways",
    headlineCenter: "Headline",
    logoCenter: "Logo",
    layoutHint: "Positions are pixels on the 1080×1920 canvas. The crop is rows of the 1920×1080 source; the box below shows the part that fills the video window.",
    background: "Background",
    bgMode: "Fill",
    bgStyle: "Gradient",
    bgColor: "Color",
    bgImage: "Image",
    color: "Color",
    dim: "Darken",
    imageHint: "It is cropped to 9:16 and shows above and below the video.",
    border: "Border",
    borderColor: "Border color",
    headline: "Headline",
    font: "Font",
    size1: "Line 1 size",
    size2: "Line 2 size",
    color1: "Line 1 color",
    color2: "Line 2 color",
    box2On: "Box behind line 2",
    box2: "Box color",
    italic: "Italic",
    shadow: "Shadow",
    logo: "Logo",
    logoMode: "Type",
    logoImage: "Image",
    logoNone: "None",
    logoWidth: "Width",
    captions: "Captions",
    captionsOn: "Add captions",
    captionsOffHint: "Off for programs whose video already carries its own subtitles.",
    capMode: "Style",
    capBar: "Band",
    capBox: "Box",
    barHeight: "Band height",
    capBottom: "Box bottom",
    fontSize: "Size",
    fontWeight: "Weight",
    boxColor: "Box color",
    textColor: "Text color",
    lineMax: "Characters per line",
    editing: "Editing",
    removeFillers: "Remove filler words",
    removeSilences: "Tighten pauses",
    prompt: "Passage selection",
    promptHint: "Instructions to the AI, in the language of the video. The answer format and timing rules are fixed by the app.",
    role: "Role",
    format: "What the program is",
    good: "What works",
    bad: "What to avoid",
    lengthGuide: "Clip length",
    countGuide: "How many clips",
    rules: "Selection rules",
    headlineRules: "Headline rules",
    detection: "Detection",
    keywords: "Keywords (comma-separated)",
    exclude: "Not this template if these appear",
    host: "Host",
    imageFailed: "Could not read that image. Use a PNG, JPEG or WebP file.",
    imagesTooLarge: "The template's images are too large to send to Selects. Choose a simpler background or logo image.",
    imageType: "Choose an image file.",
    invalidLayout: "Video bottom must be below video top, and the crop bottom below the crop top.",
    editable: {
      headline1: "Headline line 1",
      headline2: "Headline line 2",
      headlineColor1: "Line 1 color",
      headlineColor2: "Line 2 color",
      headlineSize1: "Line 1 size",
      headlineSize2: "Line 2 size",
      font: "Font",
      caption: "Caption",
      size: "Size",
    },
  },
  ko: {
    tabMake: "\ud074\ub9bd \ub9cc\ub4e4\uae30",
    tabTemplates: "\ud15c\ud50c\ub9bf",
    noProject: "\ud504\ub85c\uc81d\ud2b8\ub97c \uba3c\uc800 \uc5f4\uc5b4 \uc8fc\uc138\uc694.",
    source: "\uc6d0\ubcf8 \uc601\uc0c1",
    sourceKind: "\uac00\uc838\uc62c \uacf3",
    programPick: "\ud504\ub85c\uadf8\ub7a8",
    credits: "\ud06c\ub808\ub527\uc774 \uc0ac\uc6a9\ub420 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    optionsSec: "\uc124\uc815",
    cancel: "\ucde8\uc18c",
    cancelling: "\ucde8\uc18c\ud558\ub294 \uc911…",
    cancelled: "\ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4. '\uc774\uc5b4\uc11c \ud560 \uc791\uc5c5'\uc5d0\uc11c \ub2e4\uc2dc \uc774\uc5b4\uac08 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    finished: "\uc644\ub8cc",
    analyzingLeft: (m: number) => `\ubd84\uc11d \uc911\uc785\ub2c8\ub2e4 · \uc57d ${m}\ubd84 \ub0a8\uc74c`,
    thisRun: "\uc774\ubc88 \uc791\uc5c5",
    identifying: "\ud504\ub85c\uadf8\ub7a8\uc744 \ud310\ubcc4\ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4…",
    choosing: "AI\uac00 \uad6c\uac04\uc744 \uace0\ub974\uace0 \ud5e4\ub4dc\ub77c\uc778\uc744 \uc4f0\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uba87 \ubd84 \uac78\ub9b4 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    building: (i: number, n: number) => `\ucd08\uc548 ${i}/${n} \ub9cc\ub4dc\ub294 \uc911…`,
    downloading: (n: number) => (n > 1 ? `\uc601\uc0c1\uc744 \ubc1b\ub294 \uc911… (${n}\ubc88\uc9f8 \uc2dc\ub3c4)` : "\uc601\uc0c1\uc744 \ubc1b\ub294 \uc911…"),
    elapsed: (s: number) => (s >= 60 ? `${Math.floor(s / 60)}\ubd84 ${s % 60}\ucd08` : `${s}\ucd08`),
    secWindow: "\uc601\uc0c1 \ucc3d",
    secCrop: "\uc6d0\ubcf8 \uc790\ub974\uae30",
    secPositions: "\ud5e4\ub4dc\ub77c\uc778·\ub85c\uace0 \uc704\uce58",
    preparingSource: "\uc601\uc0c1\uc744 \ubc1b\uc744 \uc900\ube44\ub97c \ud558\uace0 \uc788\uc2b5\ub2c8\ub2e4…",
    fromYoutube: "\uc720\ud29c\ube0c \ub9c1\ud06c",
    fromProject: "\ud504\ub85c\uc81d\ud2b8 \uc601\uc0c1",
    url: "\uc720\ud29c\ube0c \ub9c1\ud06c",
    urlPh: "https://www.youtube.com/watch?v=...",
    pick: "\uc601\uc0c1",
    pickPh: "\ud504\ub85c\uc81d\ud2b8\uc758 \uc601\uc0c1\uc744 \uace0\ub974\uc138\uc694",
    refresh: "\ubaa9\ub85d \uc0c8\ub85c\uace0\uce68",
    program: "\ud15c\ud50c\ub9bf",
    auto: "\uc790\ub3d9 \ud310\ubcc4",
    count: "\ud074\ub9bd \uc218",
    countAuto: "\ucd94\ucc9c\ub300\ub85c",
    countManual: "\uc9c1\uc811 \uc9c0\uc815",
    howMany: "\ub9cc\ub4e4 \uac1c\uc218",
    note: "\ucd94\uac00 \uc694\uccad (\uc120\ud0dd)",
    notePh: "\uc608: \uc2e4\uc6a9\uc801\uc778 \ud301 \uc704\uc8fc\ub85c, 60\ucd08 \uc774\ub0b4",
    make: "\ud074\ub9bd \ub9cc\ub4e4\uae30",
    making: "\ub9cc\ub4dc\ub294 \uc911…",
    steps: ["\uc6d0\ubcf8 \uc900\ube44", "\ubd84\uc11d", "\ud504\ub85c\uadf8\ub7a8 \ud310\ubcc4", "\uad6c\uac04 \uc120\ud0dd", "\ucd08\uc548 \ub9cc\ub4e4\uae30"],
    confirmCredits: "Selects\uac00 \uc804\uc0ac \ud06c\ub808\ub527 \uc0ac\uc6a9 \ud655\uc778\uc744 \uc694\uccad\ud569\ub2c8\ub2e4. \ud655\uc778 \ucc3d\uc774 \ub728\uba74 \ubc14\ub85c Selects \ucc3d\uc5d0\uc11c \uc2b9\uc778\ud574 \uc8fc\uc138\uc694. \uc57d 30\ucd08 \uc548\uc5d0 \uc800\uc808\ub85c \ub2eb\ud799\ub2c8\ub2e4…",
    confirmMissed: "\ud06c\ub808\ub527 \uc0ac\uc6a9 \ud655\uc778\uc774 \uc2b9\uc778\ub418\uc9c0 \uc54a\uc544 \uc804\uc0ac\uac00 \uc2dc\uc791\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. Selects\ub294 \uc774 \ud655\uc778 \uc694\uccad\uc744 \uc57d 30\ucd08 \ub3d9\uc548\ub9cc \uc5f4\uc5b4 \ub461\ub2c8\ub2e4. \ud06c\ub808\ub527\uc740 \ucc28\uac10\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    waitingAnalysis: "\ubd84\uc11d \uc911\uc785\ub2c8\ub2e4. \uc601\uc0c1 \uae38\uc774\uc5d0 \ub530\ub77c \uba87 \ubd84 \uac78\ub9bd\ub2c8\ub2e4.",
    detected: "\ud15c\ud50c\ub9bf",
    recommended: "\ucd94\ucc9c",
    clipsUnit: (n: number) => `${n}\uac1c`,
    minutes: (n: number) => `${n}\ubd84`,
    seconds: (n: number) => `${n}\ucd08`,
    notAnalyzed: "\ubd84\uc11d \uc804",
    open: "\uc5f4\uae30",
    result: "\ub9cc\ub4e0 \ucd08\uc548",
    done: (n: number) => `\ucd08\uc548 ${n}\uac1c\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc544\ub798\uc5d0\uc11c \uc5f4\uc5b4 \ub2e4\ub4ec\uc740 \ub4a4 \uc624\ub978\ucabd \uc704 \ub0b4\ubcf4\ub0b4\uae30\ub85c \ub0b4\ubcf4\ub0b4\uc138\uc694.`,
    needUrl: "\uc720\ud29c\ube0c \ub9c1\ud06c\ub97c \ub123\uc5b4 \uc8fc\uc138\uc694.",
    needPick: "\uc601\uc0c1\uc744 \uace8\ub77c \uc8fc\uc138\uc694.",
    unsupported: "\ub9de\ub294 \ud15c\ud50c\ub9bf\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ud15c\ud50c\ub9bf\uc744 \uc9c1\uc811 \uace8\ub77c \uc8fc\uc138\uc694.",
    templateGone: "\uc774 \uc791\uc5c5\uc774 \uc4f0\ub358 \ud15c\ud50c\ub9bf\uc774 \uc0ad\uc81c\ub410\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud15c\ud50c\ub9bf\uc744 \uace8\ub77c \ub2e4\uc2dc \uc2dc\uc791\ud574 \uc8fc\uc138\uc694.",
    emptyTranscript: "\uc804\uc0ac\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.",
    noPassage: "\uae30\uc900\uc744 \ub118\ub294 \uad6c\uac04\uc744 \ucc3e\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    noJson: "AI \ub2f5\ubcc0\uc744 \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    analysisFailed: (s: string) => `\ubd84\uc11d\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4 (${s}).`,
    analysisSlow: "\ubd84\uc11d\uc774 \uc624\ub798 \uac78\ub9ac\uace0 \uc788\uc2b5\ub2c8\ub2e4. \ub098\uc911\uc5d0 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694. \ub05d\ub09c \ub2e8\uacc4\ub294 \uc800\uc7a5\ub3fc \uc788\uc2b5\ub2c8\ub2e4.",
    importFailed: "\uc601\uc0c1\uc744 \ud504\ub85c\uc81d\ud2b8\uc5d0 \uac00\uc838\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
    readLinkFailed: "\ub9c1\ud06c\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: ",
    downloadFailed: "\ub2e4\uc6b4\ub85c\ub4dc \uc2e4\ud328: ",
    downloadUnfinished: "\ub2e4\uc6b4\ub85c\ub4dc\uac00 \ub05d\ub098\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4. \"\uc774\uc5b4\uc11c \ud558\uae30\"\ub97c \ub204\ub974\uba74 \uc774\uc5b4\uc11c \ubc1b\uc2b5\ub2c8\ub2e4.",
    noFileAccess: "\uc774 \ubc84\uc804\uc758 Selects\ub294 \uc571\uc774 \ud30c\uc77c\uc744 \uc800\uc7a5\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.",
    whyTitle: "\uc81c\ubaa9·\ud30c\uc77c\uba85",
    whyTranscript: "\uc9c4\ud589\uc790·\ud504\ub85c\uadf8\ub7a8\uba85 \uc5b8\uae09(\uc804\uc0ac)",
    whyAI: "AI \ud310\ubcc4",
    whyManual: "\uc9c1\uc811 \uc120\ud0dd",
    whyDefault: "\uae30\ubcf8 \ud15c\ud50c\ub9bf",
    saved: "\uc774\uc5b4\uc11c \ud560 \uc791\uc5c5",
    resume: "\uc774\uc5b4\uc11c \ud558\uae30",
    dismiss: "\uc9c0\uc6b0\uae30",
    resumeHint: "\uc9c4\ud589 \uc0c1\ud669\uc740 \uc800\uc7a5\ub3fc \uc788\uc5b4 \"\uc774\uc5b4\uc11c \ud558\uae30\"\ub85c \ub2e4\uc2dc \uc2dc\uc791\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    stage: (j: any) =>
      j.choice
        ? `\ucd08\uc548 ${(j.built || []).filter((b: any) => b && b.draftId).length}/${j.choice.clips.length}\uac1c \uc644\ub8cc`
        : j.key
          ? "\uad6c\uac04 \uc120\ud0dd \uc804"
          : j.analyzed
            ? "\ud504\ub85c\uadf8\ub7a8 \ud310\ubcc4 \uc804"
            : j.resourceId
              ? "\ubd84\uc11d \uc804"
              : "\uc6d0\ubcf8 \uc900\ube44 \uc804",
    ytdlpFailed: "\uc720\ud29c\ube0c \ub2e4\uc6b4\ub85c\ub354\ub97c \ubc1b\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4: ",
    noFfmpeg: "ffmpeg\ub97c \ucc3e\uc9c0 \ubabb\ud574 \ub0ae\uc740 \ud654\uc9c8\ub85c \ubc1b\uc558\uc2b5\ub2c8\ub2e4.",
    template: "\ud15c\ud50c\ub9bf",
    name: "\uc774\ub984",
    duplicate: "\ubcf5\uc81c",
    reset: "\uae30\ubcf8\uac12\uc73c\ub85c",
    del: "\uc0ad\uc81c",
    delConfirm: "\ud55c \ubc88 \ub354 \ub204\ub974\uba74 \uc0ad\uc81c",
    save: "\uc800\uc7a5",
    discard: "\ubcc0\uacbd \ucde8\uc18c",
    savedOk: "\uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4.",
    unsaved: "\uc800\uc7a5\ud558\uc9c0 \uc54a\uc740 \ubcc0\uacbd\uc774 \uc788\uc2b5\ub2c8\ub2e4. \ub2e4\ub978 \ud15c\ud50c\ub9bf\uc73c\ub85c \ubc14\uafb8\uae30 \uc804\uc5d0 \uc800\uc7a5\ud558\uac70\ub098 \ucde8\uc18c\ud574 \uc8fc\uc138\uc694.",
    copyName: (n: string) => `${n} \ubcf5\uc0ac\ubcf8`,
    builtInNote: "\uae30\ubcf8 \ud15c\ud50c\ub9bf\uc785\ub2c8\ub2e4. \ubc14\uafbc \ub0b4\uc6a9\uc740 \uc774 \ucef4\ud4e8\ud130\uc5d0 \uc800\uc7a5\ub418\uace0, \"\uae30\ubcf8\uac12\uc73c\ub85c\"\ub97c \ub204\ub974\uba74 \uc6d0\ub798\ub300\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4.",
    modifiedNote: "\uae30\ubcf8 \ud15c\ud50c\ub9bf\uc744 \uc774 \ucef4\ud4e8\ud130\uc5d0\uc11c \ubc14\uafbc \uc0c1\ud0dc\uc785\ub2c8\ub2e4.",
    customNote: "\uc9c1\uc811 \ub9cc\ub4e0 \ud15c\ud50c\ub9bf\uc785\ub2c8\ub2e4.",
    tabLook: "\ud654\uba74",
    tabCaptions: "\uc790\ub9c9",
    tabAI: "AI",
    preview: "\ubbf8\ub9ac\ubcf4\uae30",
    sampleH1: "\"\uac00\uc7a5 \uc13c \ud55c\ub9c8\ub514\uac00 \uc5ec\uae30\uc5d0\"",
    sampleH2: "\ub204\uac00 \ud55c \ub9d0\uc778\uc9c0",
    sampleCaption: "\uc790\ub9c9\uc740 \uc5ec\uae30\uc5d0\n\ucd5c\ub300 \ub450 \uc904\ub85c \ub098\uc635\ub2c8\ub2e4",
    videoArea: "\uc601\uc0c1",
    windowTop: "\uc704",
    windowBottom: "\uc544\ub798",
    sourceTop: "\uc704",
    sourceBottom: "\uc544\ub798",
    offsetX: "\uc88c\uc6b0 \uc774\ub3d9",
    headlineCenter: "\ud5e4\ub4dc\ub77c\uc778",
    logoCenter: "\ub85c\uace0",
    layoutHint: "\uc704\uce58\ub294 1080×1920 \ud654\uba74 \uae30\uc900 \ud53d\uc140\uc785\ub2c8\ub2e4. \uc790\ub974\uae30\ub294 1920×1080 \uc6d0\ubcf8\uc758 \uc138\ub85c \ubc94\uc704\uc774\uba70, \uc544\ub798 \uc0c1\uc790\uac00 \uc601\uc0c1 \ucc3d\uc5d0 \ub4e4\uc5b4\uac00\ub294 \ubd80\ubd84\uc785\ub2c8\ub2e4.",
    background: "\ubc30\uacbd",
    bgMode: "\ucc44\uc6b0\uae30",
    bgStyle: "\uadf8\ub77c\ub514\uc5b8\ud2b8",
    bgColor: "\ub2e8\uc0c9",
    bgImage: "\uc774\ubbf8\uc9c0",
    color: "\uc0c9",
    dim: "\uc5b4\ub461\uac8c",
    imageHint: "9:16\uc73c\ub85c \uc798\ub824 \uc601\uc0c1 \uc704\uc544\ub798\uc5d0 \ubcf4\uc785\ub2c8\ub2e4.",
    border: "\ud14c\ub450\ub9ac",
    borderColor: "\ud14c\ub450\ub9ac \uc0c9",
    headline: "\ud5e4\ub4dc\ub77c\uc778",
    font: "\uae00\uaf34",
    size1: "1\uc904 \ud06c\uae30",
    size2: "2\uc904 \ud06c\uae30",
    color1: "1\uc904 \uc0c9",
    color2: "2\uc904 \uc0c9",
    box2On: "2\uc904 \ubc30\uacbd \uc0c1\uc790",
    box2: "\uc0c1\uc790 \uc0c9",
    italic: "\uae30\uc6b8\uc784",
    shadow: "\uadf8\ub9bc\uc790",
    logo: "\ub85c\uace0",
    logoMode: "\uc885\ub958",
    logoImage: "\uc774\ubbf8\uc9c0",
    logoNone: "\uc5c6\uc74c",
    logoWidth: "\ub108\ube44",
    captions: "\uc790\ub9c9",
    captionsOn: "\uc790\ub9c9 \ub123\uae30",
    captionsOffHint: "\uc6d0\ubcf8 \uc601\uc0c1\uc5d0 \uc790\ub9c9\uc774 \uc774\ubbf8 \uc788\ub294 \ud504\ub85c\uadf8\ub7a8\uc740 \ub055\ub2c8\ub2e4.",
    capMode: "\ubc29\uc2dd",
    capBar: "\ub760",
    capBox: "\uc0c1\uc790",
    barHeight: "\ub760 \ub192\uc774",
    capBottom: "\uc0c1\uc790 \uc544\ub798 \ub05d",
    fontSize: "\ud06c\uae30",
    fontWeight: "\uad75\uae30",
    boxColor: "\uc0c1\uc790 \uc0c9",
    textColor: "\uae00\uc790 \uc0c9",
    lineMax: "\uc904\ub2f9 \uae00\uc790 \uc218",
    editing: "\ud3b8\uc9d1",
    removeFillers: "\uad70\ub354\ub354\uae30 \ub9d0 \ube7c\uae30",
    removeSilences: "\ub9d0 \uc0ac\uc774 \uacf5\ubc31 \uc904\uc774\uae30",
    prompt: "\uad6c\uac04 \uc120\ud0dd",
    promptHint: "AI\uc5d0\uac8c \uc8fc\ub294 \uc9c0\uc2dc\ubb38\uc785\ub2c8\ub2e4. \uc601\uc0c1\uacfc \uac19\uc740 \uc5b8\uc5b4\ub85c \uc501\ub2c8\ub2e4. \ub2f5\ubcc0 \ud615\uc2dd\uacfc \uc2dc\uac04 \ub9de\ucda4 \uaddc\uce59\uc740 \uc571\uc774 \uc815\ud569\ub2c8\ub2e4.",
    role: "\uc5ed\ud560",
    format: "\ud504\ub85c\uadf8\ub7a8 \uc124\uba85",
    good: "\uc798 \ub418\ub294 \ud074\ub9bd",
    bad: "\ud53c\ud560 \ud074\ub9bd",
    lengthGuide: "\ud074\ub9bd \uae38\uc774",
    countGuide: "\ud074\ub9bd \uc218 \uae30\uc900",
    rules: "\uc120\ud0dd \uaddc\uce59",
    headlineRules: "\ud5e4\ub4dc\ub77c\uc778 \uaddc\uce59",
    detection: "\uc790\ub3d9 \ud310\ubcc4",
    keywords: "\ud0a4\uc6cc\ub4dc (\uc27c\ud45c\ub85c \uad6c\ubd84)",
    exclude: "\uc774 \ub9d0\uc774 \ub098\uc624\uba74 \uc81c\uc678",
    host: "\uc9c4\ud589\uc790",
    imageFailed: "\uc774\ubbf8\uc9c0\ub97c \uc77d\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. PNG, JPEG, WebP \ud30c\uc77c\uc744 \uc368 \uc8fc\uc138\uc694.",
    imagesTooLarge: "\ud15c\ud50c\ub9bf \uc774\ubbf8\uc9c0\uac00 \ub108\ubb34 \ucee4\uc11c Selects\ub85c \ubcf4\ub0bc \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub354 \ub2e8\uc21c\ud55c \ubc30\uacbd\uc774\ub098 \ub85c\uace0 \uc774\ubbf8\uc9c0\ub97c \uace8\ub77c \uc8fc\uc138\uc694.",
    imageType: "\uc774\ubbf8\uc9c0 \ud30c\uc77c\uc744 \uace8\ub77c \uc8fc\uc138\uc694.",
    invalidLayout: "\uc601\uc0c1 \uc544\ub798\ub294 \uc601\uc0c1 \uc704\ubcf4\ub2e4, \uc6d0\ubcf8 \uc790\ub974\uae30 \uc544\ub798\ub294 \uc790\ub974\uae30 \uc704\ubcf4\ub2e4 \ucee4\uc57c \ud569\ub2c8\ub2e4.",
    editable: {
      headline1: "\ud5e4\ub4dc\ub77c\uc778 1\uc904",
      headline2: "\ud5e4\ub4dc\ub77c\uc778 2\uc904",
      headlineColor1: "1\uc904 \uc0c9",
      headlineColor2: "2\uc904 \uc0c9",
      headlineSize1: "1\uc904 \ud06c\uae30",
      headlineSize2: "2\uc904 \ud06c\uae30",
      font: "\uae00\uaf34",
      caption: "\uc790\ub9c9",
      size: "\ud06c\uae30",
    },
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = (v: any) => JSON.parse(JSON.stringify(v));
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: any) => new TextDecoder().decode(b);
// Shell quoting. macOS runs the login shell; Windows runs the command as a cmd.exe batch file, where a
// literal percent sign is written %% and double quotes cannot be escaped (none of our arguments has one).
const pq = (s: string) => "'" + String(s).replace(/'/g, "'\\''") + "'";
const wq = (s: string) => '"' + String(s).replace(/%/g, "%%").replace(/"/g, "") + '"';
const qa = (s: string) => (IS_WIN ? wq(s) : pq(s));

function langOf(context: any): string {
  return String(context?.language || "en").toLowerCase().startsWith("ko") ? "ko" : "en";
}

function nameOf(t: any, lang: string): string {
  return (t && (t.name || t.names?.[lang] || t.names?.en || t.id)) || "";
}

function merge(base: any, over: any): any {
  if (over === undefined) return base;
  if (Array.isArray(base) || Array.isArray(over)) return over;
  if (base && over && typeof base === "object" && typeof over === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }
  return over;
}

// Custom templates inherit neutral defaults when their original base is absent.
function resolveTemplates(saved: any[]): any[] {
  const valid = saved.filter((t: any) => t && typeof t.id === "string" && /^[a-zA-Z0-9-]+$/.test(t.id));
  const byId = new Map(valid.map((t: any) => [t.id, t]));
  const list = BUILTIN_TEMPLATES.map((b: any) => byId.has(b.id)
    ? { ...merge(b, byId.get(b.id)), builtIn: true, modified: true }
    : { ...clone(b), builtIn: true });
  for (const t of valid) {
    if (BUILTIN_TEMPLATES.some((b: any) => b.id === t.id)) continue;
    const base = BUILTIN_TEMPLATES.find((b: any) => b.id === t.baseId) || TEMPLATE_DEFAULTS;
    list.push({ ...merge(base, t), builtIn: false });
  }
  return list;
}

function extractJson(text: string, S: any): any {
  const s = String(text || "");
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : s;
  const a = body.indexOf("{");
  const b = body.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error(S.noJson);
  return JSON.parse(body.slice(a, b + 1));
}

function scoreProgram(text: string, templates: any[]): string | null {
  const t = String(text || "").replace(/\s+/g, "");
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const scores: any = {};
  for (const tpl of templates) {
    let s = 0;
    for (const kw of tpl.detect?.keywords || []) {
      const k = String(kw).replace(/\s+/g, "");
      if (!k) continue;
      const m = t.match(new RegExp(esc(k), "g"));
      if (m) s += m.length * (k.length >= 4 ? 3 : 1);
    }
    for (const ex of tpl.detect?.exclude || []) {
      const k = String(ex).replace(/\s+/g, "");
      if (k && t.includes(k)) s = 0;
    }
    scores[tpl.id] = s;
  }
  const ranked = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  if (!ranked.length) return null;
  const top = ranked[0];
  const second = ranked[1];
  if (scores[top] >= 3 && scores[top] >= 2 * Math.max(1, second ? scores[second] : 0)) return top;
  return null;
}

// ---- Template → graphic parameters. The preview and Draft use the same renderer. ----
function cropTransform(L: any) {
  const FIT = 1080 / 1920;
  const s = (L.windowBottom - L.windowTop) / (L.sourceBottom - L.sourceTop);
  const cy = L.windowTop + (540 - L.sourceTop) * s;
  const r4 = (x: number) => Math.round(x * 10000) / 10000;
  return { scale: r4(s / FIT), posX: r4((Number(L.offsetX) || 0) / 1920 * 100), posY: r4(-(cy - 960) / 1920 * 100) };
}

function frameParams(t: any, h1: string, h2: string, images?: { background?: string; logo?: string }) {
  const L = t.layout, H = t.headline, C = t.captions, B = t.background;
  const bgImage = B.mode === "image" ? (images?.background ?? B.image) : "";
  const logoImage = t.logo.mode === "image" ? (images?.logo ?? t.logo.image) : "";
  return {
    windowTop: L.windowTop,
    windowBottom: L.windowBottom,
    captionBarHeight: C.on && C.mode === "bar" ? C.barHeight : 0,
    background: B.mode === "color" ? B.color : B.style,
    backgroundImage: bgImage || "",
    backgroundDim: B.mode === "image" ? B.dim : 0,
    goldBorder: !!t.border.on,
    borderColor: t.border.color,
    headlineColor1: H.color1,
    headlineColor2: H.color2,
    headlineSize1: H.size1,
    headlineSize2: H.size2,
    headline2Box: H.box2On ? H.box2 : "",
    headlineItalic: !!H.italic,
    headlineShadow: H.shadow ? SHADOW : "none",
    headlineCenter: L.headlineCenter,
    logoCenter: L.logoCenter,
    fontFamily: H.font || "",
    logoMode: t.logo.mode === "image" && logoImage ? "image" : "none",
    logoImage: logoImage || "",
    logoWidth: t.logo.width,
    headline1: h1,
    headline2: h2,
  };
}

function captionParams(t: any) {
  const C = t.captions;
  return {
    mode: C.mode,
    top: t.layout.windowBottom,
    height: C.barHeight,
    bottom: C.bottom,
    fontSize: C.fontSize,
    fontWeight: C.fontWeight,
    boxColor: C.boxColor,
    textColor: C.color,
    fontFamily: C.font || "",
  };
}

function editableFrame(S: any) {
  const E = S.editable;
  return [
    { key: "headline1", label: E.headline1, type: "text", defaultValue: "" },
    { key: "headline2", label: E.headline2, type: "text", defaultValue: "" },
    { key: "headlineColor1", label: E.headlineColor1, type: "color", defaultValue: "#FFFFFF" },
    { key: "headlineColor2", label: E.headlineColor2, type: "color", defaultValue: "#FFFFFF" },
    { key: "headlineSize1", label: E.headlineSize1, type: "number", defaultValue: 80, min: 30, max: 160, step: 1 },
    { key: "headlineSize2", label: E.headlineSize2, type: "number", defaultValue: 80, min: 30, max: 160, step: 1 },
    { key: "fontFamily", label: E.font, type: "text", defaultValue: "" },
  ];
}

function editableCaption(S: any) {
  const E = S.editable;
  return [
    { key: "text", label: E.caption, type: "text", defaultValue: "" },
    { key: "fontSize", label: E.size, type: "number", defaultValue: 60, min: 24, max: 120, step: 1 },
    { key: "fontFamily", label: E.font, type: "text", defaultValue: "" },
  ];
}

// ---- Files: only through the panel SDK ----
// The panel frame is sealed off from the Selects window and from the browser's storage, so every file goes
// through the SDK: selects.files inside sdk.runScript where this Selects has it, otherwise /bin/sh through
// sdk.runShell (macOS). Bytes travel as base64 text in bounded pieces, because Selects caps a script's
// result, a shell command (16 KB) and a shell's output (48 KB). A file is written beside its destination
// and renamed into place, so a save that fails halfway leaves the earlier file as it was.
const SDK_PIECE = 48 * 1024; // selects.files.readRange and writeChunk: 49,152 bytes at most
const SHELL_READ_PIECE = 32768; // 43,692 base64 characters, under the 48 KB output cap
const SHELL_WRITE_PIECE = 9000; // 12,000 base64 characters, under the 16 KB command cap
const SHELL_COMMAND_ROOM = 12000; // paths listed in one shell command

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as any);
  return btoa(s);
}
function fromBase64(text: string): Uint8Array {
  const bin = atob(String(text || "").replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function joinBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
// Runs fn over the items, a few at a time, and keeps their order.
async function pooled(items: any[], width: number, fn: (item: any, i: number) => Promise<any>): Promise<any[]> {
  const out: any[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(width, items.length)) }, worker));
  return out;
}
const folderOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
const tempName = () => ".tmp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// selects.files: the file service newer Selects versions give to scripts.
async function sdkFiles(sdk: any): Promise<any> {
  const J = JSON.stringify;
  const run = async (script: string, write = false) => {
    const r: any = await sdk.runScript({ script, summary: write ? "Save this app's files" : "Read this app's files", allowCommit: write });
    if (r.isError) throw new Error(String(r.output || "selects.files failed").slice(0, 600));
    return r.result;
  };
  const env = await run(`const e = await selects.files.environment(); return { platform: e.platform, home: e.homedir };`);
  if (!env || typeof env.home !== "string" || !env.home || typeof env.platform !== "string") throw new Error("selects.files is not available");
  const bytesOf = (base64: any, want: number, path: string) => {
    if (typeof base64 !== "string") throw new Error("Could not read " + path);
    const bytes = fromBase64(base64);
    if (bytes.length !== want) throw new Error(path + " changed while it was being read.");
    return bytes;
  };
  return {
    via: "sdk",
    home: env.home,
    windows: env.platform === "win32",
    readPiece: SDK_PIECE,
    width: 4,
    async stat(paths: string[]) {
      const groups: string[][] = [];
      for (let i = 0; i < paths.length; i += 100) groups.push(paths.slice(i, i + 100));
      const rows = await pooled(groups, 2, (g) =>
        run(`const out: any[] = []; for (const p of ${J(g)}) { const s = await selects.files.stat(p); out.push(s ? { size: s.size, dir: s.isDirectory, mtime: s.mtimeMs } : null); } return out;`)
      );
      const out = rows.flat();
      if (out.length !== paths.length) throw new Error("Could not look at the app's files.");
      return out;
    },
    async readdir(dir: string) {
      const names = await run(`const d = ${J(dir)}; const s = await selects.files.stat(d); return s && s.isDirectory ? await selects.files.readdir(d) : [];`);
      return Array.isArray(names) ? names.map(String) : [];
    },
    mkdir: (dir: string) => run(`await selects.files.mkdir(${J(dir)}, { recursive: true });`, true),
    async readRange(path: string, offset: number, length: number) {
      const r = await run(`return await selects.files.readRange({ path: ${J(path)}, offset: ${offset}, length: ${length} });`);
      return bytesOf(r?.base64, length, path);
    },
    async readWhole(paths: string[], sizes: number[]) {
      const r = await run(`const out: string[] = []; for (const p of ${J(paths)}) out.push((await selects.files.readRange({ path: p, offset: 0, length: ${SDK_PIECE} })).base64); return out;`);
      if (!Array.isArray(r) || r.length !== paths.length) throw new Error("Could not read the app's files.");
      return r.map((b: any, i: number) => bytesOf(b, sizes[i], paths[i]));
    },
    async write(path: string, bytes: Uint8Array) {
      const tmp = path + tempName();
      try {
        let at = 0;
        do {
          const part = bytes.subarray(at, at + SDK_PIECE);
          const last = at + part.length >= bytes.length;
          const wrote = await run(
            (at === 0 ? `await selects.files.mkdir(${J(folderOf(path))}, { recursive: true }); ` : "") +
              `const w = await selects.files.writeChunk({ path: ${J(tmp)}, offset: ${at}, base64: ${J(toBase64(part))} }); ` +
              (last ? `if (w.bytesWritten === ${part.length}) await selects.files.rename(${J(tmp)}, ${J(path)}); ` : "") +
              `return w.bytesWritten;`,
            true
          );
          if (wrote !== part.length) throw new Error("Could not save " + path);
          at += part.length;
        } while (at < bytes.length);
      } catch (e) {
        await run(`const p = ${J(tmp)}; const s = await selects.files.stat(p); if (s && !s.isDirectory) await selects.files.remove(p, { recursive: true, force: true });`, true).catch(() => {});
        throw e;
      }
    },
    // The service removes a file only when asked with both `recursive` and `force` (Selects 2.0.578 fails
    // otherwise), and that form would also take a whole folder, so the path is checked to be a file first.
    // A file that is already gone is not an error.
    remove: (path: string) => run(`const p = ${J(path)}; const s = await selects.files.stat(p); if (s && !s.isDirectory) await selects.files.remove(p, { recursive: true, force: true });`, true),
    download: (url: string, path: string) => run(`await selects.files.download(${J(url)}, ${J(path)});`, true),
  };
}

// /bin/sh through sdk.runShell, for a Selects that has no selects.files yet. The app starts the user's own
// login shell, so each command is handed to /bin/sh, and each answer line starts with "@@" so that
// anything the shell's profile prints is ignored.
async function shellFiles(sdk: any): Promise<any> {
  const sh = async (body: string, summary: string, timeoutMs = 60000) => {
    const r: any = await sdk.runShell({ summary, command: "/bin/sh -c " + pq(body), timeoutMs, maxOutputBytes: 48000 });
    if (r.isError || r.exitCode !== 0 || r.truncated) throw new Error(String(r.stderr || r.output || "The file command failed.").slice(-400));
    return String(r.stdout || "")
      .split(/\r?\n/)
      .filter((l) => l.startsWith("@@"))
      .map((l) => l.slice(2));
  };
  const UNBASE64 = `(base64 -d 2>/dev/null || base64 -D)`;
  const sizeOf = (path: string) => `printf '@@%s\\n' "$(wc -c < ${pq(path)} | tr -d ' ')"`;
  const home = (await sh(`printf '@@%s\\n' "$HOME"`, "Find this app's folder"))[0];
  if (!home || !home.startsWith("/")) throw new Error("The shell did not name a home folder.");
  // Paths for one command, as many as fit under the command cap.
  const packs = (paths: string[], most: number) => {
    const out: string[][] = [];
    let cur: string[] = [];
    let room = 0;
    for (const p of paths) {
      const cost = pq(pq(p)).length + 1;
      if (cur.length && (room + cost > SHELL_COMMAND_ROOM || cur.length >= most)) {
        out.push(cur);
        cur = [];
        room = 0;
      }
      cur.push(p);
      room += cost;
    }
    if (cur.length) out.push(cur);
    return out;
  };
  return {
    via: "shell",
    home,
    windows: false,
    readPiece: SHELL_READ_PIECE,
    width: 8,
    async stat(paths: string[]) {
      const rows = await pooled(packs(paths, 60), 4, async (g) => {
        const lines = await sh(
          `for p in ${g.map(pq).join(" ")}; do if [ -d "$p" ]; then echo @@D; elif [ -f "$p" ]; then echo "@@$(/usr/bin/stat -f '%z %m' "$p")"; else echo @@N; fi; done`,
          "Look at this app's files"
        );
        if (lines.length !== g.length) throw new Error("Could not look at the app's files.");
        return lines.map((l) => {
          if (l === "D") return { size: 0, dir: true, mtime: 0 };
          const m = l.match(/^(\d+) (\d+)$/);
          return m ? { size: Number(m[1]), dir: false, mtime: Number(m[2]) * 1000 } : null;
        });
      });
      return rows.flat();
    },
    readdir: (dir: string) => sh(`if [ -d ${pq(dir)} ]; then ls -1A ${pq(dir)} | sed 's/^/@@/'; fi`, "List this app's files"),
    async mkdir(dir: string) {
      await sh(`mkdir -p ${pq(dir)}`, "Make this app's folder");
    },
    async readRange(path: string, offset: number, length: number) {
      const lines = await sh(`printf '@@%s\\n' "$(tail -c +${offset + 1} ${pq(path)} | head -c ${length} | base64 | tr -d '\\n')"`, "Read this app's files");
      const bytes = fromBase64(lines[0] || "");
      if (bytes.length !== length) throw new Error(path + " changed while it was being read.");
      return bytes;
    },
    async readWhole(paths: string[], sizes: number[]) {
      const out: Uint8Array[] = [];
      for (const g of packs(paths, 24)) {
        const lines = await sh(`for p in ${g.map(pq).join(" ")}; do printf '@@%s\\n' "$(base64 < "$p" | tr -d '\\n')"; done`, "Read this app's files");
        if (lines.length !== g.length) throw new Error("Could not read the app's files.");
        for (const l of lines) out.push(fromBase64(l));
      }
      out.forEach((b, i) => {
        if (b.length !== sizes[i]) throw new Error(paths[i] + " changed while it was being read.");
      });
      return out;
    },
    async write(path: string, bytes: Uint8Array) {
      const tmp = path + tempName();
      const done = (lines: string[]) => {
        if (Number(lines[0]) !== bytes.length) throw new Error("Could not save " + path);
      };
      if (bytes.length <= SHELL_WRITE_PIECE) {
        done(await sh(`mkdir -p ${pq(folderOf(path))} && printf %s ${pq(toBase64(bytes))} | ${UNBASE64} > ${pq(tmp)} && mv -f ${pq(tmp)} ${pq(path)} && ${sizeOf(path)}`, "Save this app's files"));
        return;
      }
      // A larger file goes up as numbered pieces, several at a time, and is put together in one step.
      const parts = tmp + ".d";
      const offsets: number[] = [];
      for (let at = 0; at < bytes.length; at += SHELL_WRITE_PIECE) offsets.push(at);
      try {
        await sh(`mkdir -p ${pq(folderOf(path))} ${pq(parts)}`, "Save this app's files");
        await pooled(offsets, 8, (at, i) =>
          sh(`printf %s ${pq(toBase64(bytes.subarray(at, at + SHELL_WRITE_PIECE)))} | ${UNBASE64} > ${pq(parts + "/" + String(i).padStart(6, "0"))}`, "Save this app's files")
        );
        done(await sh(`cat ${pq(parts)}/* > ${pq(tmp)} && mv -f ${pq(tmp)} ${pq(path)} && rm -rf ${pq(parts)} && ${sizeOf(path)}`, "Save this app's files"));
      } catch (e) {
        await sh(`rm -rf ${pq(parts)} ${pq(tmp)}`, "Tidy this app's files").catch(() => {});
        throw e;
      }
    },
    async remove(path: string) {
      await sh(`rm -f ${pq(path)}`, "Remove one of this app's files");
    },
  };
}

// What the rest of the app uses, the same over either route.
function hostFiles(b: any) {
  const sep = b.windows ? "\\" : "/";
  const join = (...p: string[]) =>
    p
      .map((s, i) => (i ? String(s).replace(/^[\\/]+/, "") : String(s)).replace(/[\\/]+$/, ""))
      .filter((s, i) => s || !i)
      .join(sep);
  const sized = async (path: string, size: number) => {
    const offsets: number[] = [];
    for (let at = 0; at < size; at += b.readPiece) offsets.push(at);
    return joinBytes(await pooled(offsets, b.width, (at) => b.readRange(path, at, Math.min(b.readPiece, size - at))));
  };
  const readFile = async (path: string): Promise<Uint8Array> => {
    const s = (await b.stat([path]))[0];
    if (!s || s.dir) throw new Error("No such file: " + path);
    return sized(path, s.size);
  };
  // Files read as a folder with `keep` stay in memory while the panel is open and are read again only when
  // their size or date changes, because every read is many calls.
  const kept = new Map<string, { size: number; mtime: number; bytes: Uint8Array }>();
  return {
    via: b.via,
    homedir: () => b.home,
    join,
    mkdir: (dir: string) => b.mkdir(dir),
    exists: async (path: string) => {
      const s = (await b.stat([path]))[0];
      return !!s && (s.dir || s.size > 0);
    },
    readdir: (dir: string): Promise<string[]> => b.readdir(dir),
    // 0 for a missing file or a folder.
    size: async (path: string): Promise<number> => {
      const s = (await b.stat([path]))[0];
      return s && !s.dir ? s.size : 0;
    },
    readFile,
    // Every file in a folder whose name matches, and that changed after `since` when given. Small files
    // share a call and the pieces of large ones are fetched side by side; a file that cannot be read is
    // left out.
    async readFolder(dir: string, test: RegExp, opts: { since?: number; keep?: boolean } = {}): Promise<{ name: string; bytes: Uint8Array }[]> {
      const names = (await b.readdir(dir)).filter((n: string) => test.test(n));
      if (!names.length) return [];
      const paths = names.map((n: string) => join(dir, n));
      const stats = await b.stat(paths);
      const got: (Uint8Array | null)[] = names.map(() => null);
      const tasks: (() => Promise<void>)[] = [];
      const again: number[] = [];
      const pieces: { [i: number]: Uint8Array[] } = {};
      let cur: number[] = [];
      let room = 0;
      const flush = () => {
        const ix = cur;
        cur = [];
        room = 0;
        if (!ix.length) return;
        tasks.push(async () => {
          try {
            const bytes = await b.readWhole(ix.map((i) => paths[i]), ix.map((i) => stats[i].size));
            ix.forEach((i, k) => (got[i] = bytes[k]));
          } catch (e) {
            again.push(...ix);
          }
        });
      };
      names.forEach((_: string, i: number) => {
        const s = stats[i];
        if (!s || s.dir || (opts.since && s.mtime && s.mtime < opts.since)) return;
        const had = opts.keep ? kept.get(paths[i]) : undefined;
        if (had && had.size === s.size && (!had.mtime || had.mtime === s.mtime)) {
          had.mtime = s.mtime;
          got[i] = had.bytes;
          return;
        }
        if (s.size > b.readPiece / 2) {
          const parts: Uint8Array[] = (pieces[i] = []);
          for (let at = 0, k = 0; at < s.size; at += b.readPiece, k++) {
            const slot = k;
            const from = at;
            tasks.push(async () => {
              try {
                parts[slot] = await b.readRange(paths[i], from, Math.min(b.readPiece, s.size - from));
              } catch (e) {
                if (!again.includes(i)) again.push(i);
              }
            });
          }
          return;
        }
        if (cur.length && (room + s.size > b.readPiece || cur.length >= 24)) flush();
        cur.push(i);
        room += s.size;
      });
      flush();
      await pooled(tasks, b.width, (task) => task());
      for (const i of Object.keys(pieces).map(Number)) if (!again.includes(i)) got[i] = joinBytes(pieces[i]);
      // Changed or gone since the listing: read each by itself, with a fresh look at its size.
      for (const i of again) got[i] = await readFile(paths[i]).catch(() => null);
      if (opts.keep)
        names.forEach((_: string, i: number) => {
          if (got[i] && !again.includes(i)) kept.set(paths[i], { size: stats[i].size, mtime: stats[i].mtime, bytes: got[i] as Uint8Array });
        });
      return names.map((name: string, i: number) => ({ name, bytes: got[i] as Uint8Array })).filter((f: any) => f.bytes);
    },
    async writeFile(path: string, data: string | Uint8Array) {
      const bytes = typeof data === "string" ? enc(data) : data;
      kept.delete(path);
      await b.write(path, bytes);
      kept.set(path, { size: bytes.length, mtime: 0, bytes });
    },
    async remove(path: string) {
      kept.delete(path);
      await b.remove(path);
    },
    downloadFile: b.download,
  };
}

// The route is chosen once for the panel frame; null when this Selects offers neither.
let filesFound: Promise<any> | null = null;
function connectFiles(sdk: any): Promise<any> {
  if (!filesFound) {
    const found = (async () => {
      try {
        return hostFiles(await sdkFiles(sdk));
      } catch (e) {}
      if (!IS_WIN) {
        try {
          return hostFiles(await shellFiles(sdk));
        } catch (e) {}
      }
      return null;
    })();
    filesFound = found;
    found.then((f) => {
      if (!f && filesFound === found) filesFound = null;
    });
  }
  return filesFound;
}

function makeStore(files: any) {
  if (files) {
    const root = files.join(files.homedir(), ".selects", "plugin-data", APP_ID);
    const dir = (n: string) => files.join(root, n);
    return {
      fs: files,
      root,
      media: dir("media"),
      bin: dir("bin"),
      refs: dir("references"),
      join: (...p: string[]) => files.join(...p),
      ensure: (p: string): Promise<void> => files.mkdir(p),
      exists: (p: string): Promise<boolean> => files.exists(p).catch(() => false),
      async list(kind: string, since = 0) {
        const out: any[] = [];
        for (const f of await files.readFolder(dir(kind), /\.json$/, { since, keep: true })) {
          try {
            out.push(JSON.parse(dec(f.bytes)));
          } catch (e) {}
        }
        return out;
      },
      async put(kind: string, id: string, v: any) {
        await files.writeFile(files.join(dir(kind), id + ".json"), enc(JSON.stringify(v)));
      },
      async del(kind: string, id: string) {
        await files.remove(files.join(dir(kind), id + ".json"));
      },
    };
  }
  // No file access in this Selects: templates and progress are kept until the app is closed.
  const kept: any = {};
  const all = (kind: string) => kept[kind] || (kept[kind] = {});
  return {
    fs: null,
    root: null,
    media: null,
    bin: null,
    refs: null,
    join: (...p: string[]) => p.join(IS_WIN ? "\\" : "/"),
    ensure: async (_: string) => {},
    exists: async (_: string) => false,
    async list(kind: string, _since = 0) {
      return Object.values(all(kind));
    },
    async put(kind: string, id: string, v: any) {
      all(kind)[id] = clone(v);
    },
    async del(kind: string, id: string) {
      delete all(kind)[id];
    },
  };
}

// A failed script answers with a JSON report; its own words are the message, not the whole report.
function scriptError(output: any): string {
  const text = String(output || "run_script failed");
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === "string") {
      const more = Array.isArray(j.colorOps?.failures) ? j.colorOps.failures.map((f: any) => String(f).replace(/^Error:\s*/, "")) : [];
      return [j.error, ...more].join(" ").slice(0, 600);
    }
  } catch (e) {}
  return text.slice(0, 1200);
}

function useBlobUrl(dataUrl: string): string {
  const [url, setUrl] = React.useState("");
  React.useEffect(() => {
    if (!dataUrl) {
      setUrl("");
      return;
    }
    const m = String(dataUrl).match(/^data:([^;,]+);base64,(.*)$/);
    if (!m) {
      setUrl(dataUrl);
      return;
    }
    try {
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const u = URL.createObjectURL(new Blob([bytes], { type: m[1] }));
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    } catch (e) {
      setUrl("");
    }
  }, [dataUrl]);
  return url;
}

function useWidth(ref: any, fallback: number): number {
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(el.clientWidth || fallback);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}

// A scaled copy of the real series frame and caption graphics, so edits show before anything is built.
function LayoutPreview({ t, S }: any) {
  const ref = React.useRef<HTMLDivElement>(null);
  const w = useWidth(ref, 160);
  const bg = useBlobUrl(t.background.mode === "image" ? t.background.image : "");
  const logo = useBlobUrl(t.logo.mode === "image" ? t.logo.image : "");
  const scale = w / 1080;
  const L = t.layout;
  const data = frameParams(t, S.sampleH1, S.sampleH2, { background: bg, logo });
  return (
    <div ref={ref} style={{ width: "100%", maxWidth: 160, margin: "0 auto" }}>
      <div style={{ position: "relative", width: w, height: Math.round(1920 * scale), overflow: "hidden", borderRadius: 6, border: "1px solid var(--panel-border)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: "0 0", background: "#000" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: L.windowTop,
              width: 1080,
              height: Math.max(0, L.windowBottom - L.windowTop),
              background: "repeating-linear-gradient(135deg,#3A3A3A 0 48px,#474747 48px 96px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#BDBDBD",
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            {S.videoArea}
          </div>
          <PreviewFrame data={data} />
          {t.captions.on ? <PreviewCaption data={{ ...captionParams(t), text: S.sampleCaption }} /> : null}
        </div>
      </div>
    </div>
  );
}

// Which part of the 1920×1080 source lands in the video window.
function SourceCrop({ t }: any) {
  const L = t.layout;
  const s = (L.windowBottom - L.windowTop) / Math.max(1, L.sourceBottom - L.sourceTop);
  const visW = 1080 / s;
  const left = 960 - (Number(L.offsetX) || 0) / s - visW / 2;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div style={{ width: "100%", maxWidth: 240, margin: "0 auto" }}>
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#2B2B2B", borderRadius: 4, overflow: "hidden", border: "1px solid var(--panel-border)" }}>
        <div
          style={{
            position: "absolute",
            left: pct(left, 1920),
            width: pct(visW, 1920),
            top: pct(L.sourceTop, 1080),
            height: pct(L.sourceBottom - L.sourceTop, 1080),
            border: "2px solid var(--panel-accent)",
            background: "rgba(255,255,255,0.12)",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}

// Images travel inside the clip's run_script, which Selects caps at 262,144 bytes, so each picture is
// shrunk until it fits its share: about 100 KB for a background and 70 KB for a logo, as base64 WebP.
const IMAGE_BUDGET = { background: 100000, logo: 70000 };
const SCRIPT_LIMIT = 232000;

// One result or unfinished job, drawn in the theme's own border and radius.
const CARD = { border: "1px solid var(--panel-border)", borderRadius: "var(--panel-radius)", padding: 10, minWidth: 0 } as const;
const CLAMP2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;

// The downloader's own error line, without its tool prefix and video id, for a person to read.
function shortError(text: string): string {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const line = [...lines].reverse().find((l) => /^ERROR:/i.test(l)) || lines[lines.length - 1] || "";
  return line.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?([\w-]{6,}:\s*)?/i, "").slice(0, 160);
}

// A run the user cancelled. Host calls already sent keep running; the run stops waiting for them.
class RunCancelled extends Error {}

// The AI explains its count at length; the first sentence is the part worth a line.
function firstSentence(text: string): string {
  const s = String(text || "").trim().split(/(?<=[.!?])\s+/)[0] || "";
  return s.length > 90 ? s.slice(0, 90) + "…" : s;
}

async function imageToDataUrl(fs: any, path: string, kind: "background" | "logo"): Promise<string> {
  const bytes = await fs.readFile(path);
  const bmp = await createImageBitmap(new Blob([bytes]));
  const budget = IMAGE_BUDGET[kind];
  const sizes = kind === "background" ? [1080, 810, 720, 540, 450] : [900, 720, 600, 480, 360];
  const quals = [0.82, 0.72, 0.62, 0.5];
  let last = "";
  for (const size of sizes) {
    let w: number, h: number, sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    if (kind === "background") {
      w = size;
      h = Math.round((size * 16) / 9);
      const r = Math.max(w / bmp.width, h / bmp.height);
      sw = w / r;
      sh = h / r;
      sx = (bmp.width - sw) / 2;
      sy = (bmp.height - sh) / 2;
    } else {
      const r = Math.min(1, size / bmp.width);
      w = Math.max(1, Math.round(bmp.width * r));
      h = Math.max(1, Math.round(bmp.height * r));
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    for (const q of quals) {
      let url = c.toDataURL("image/webp", q);
      if (!url.startsWith("data:image/webp")) url = kind === "logo" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", q);
      last = url;
      if (url.length <= budget) return url;
    }
  }
  if (last.length <= budget * 1.5) return last;
  throw new Error("too large");
}

// ---- Template editor ----
function TemplateEditor({ ui, S, lang, templates, store, onChanged, state }: any) {
  // Selection, the working copy and the sub-tab live in the Panel, so unsaved edits survive a tab switch.
  const { selId, setSelId, edit: saved, setEdit: setSaved, baseKey, setBaseKey, sub, setSub } = state;
  const current = templates.find((t: any) => t.id === selId) || templates[0];
  const [msg, setMsg] = React.useState<any>(null);
  const [armedDelete, setArmedDelete] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fs = store.fs;

  const currentKey = React.useMemo(() => JSON.stringify(current ?? null), [current]);
  React.useEffect(() => {
    if (current && (!saved || saved.id !== current.id || baseKey !== currentKey)) {
      setSaved(clone(current));
      setBaseKey(currentKey);
    }
    setArmedDelete(false);
  }, [selId, currentKey]);

  if (!current) return null;
  // Until the stored working copy catches up with the selection, edit a fresh copy of the template.
  const fresh = !saved || saved.id !== current.id || baseKey !== currentKey;
  const edit = fresh ? JSON.parse(currentKey) : saved;
  const setEdit = (f: any) => setSaved((e: any) => (typeof f === "function" ? f(fresh || !e ? JSON.parse(currentKey) : e) : f));
  const dirty = JSON.stringify(edit) !== currentKey;
  const set = (path: string, value: any) => {
    setMsg(null);
    setEdit((e: any) => {
      const n = clone(e);
      const ks = path.split(".");
      let o = n;
      for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
      o[ks[ks.length - 1]] = value;
      return n;
    });
  };
  const num = (path: string, label: string, min: number, max: number, unit?: string) => {
    const v = path.split(".").reduce((o: any, k) => o[k], edit);
    return <ui.NumberField label={label} value={Number(v)} min={min} max={max} step={1} unit={unit} onChange={(x: number) => set(path, Math.max(min, Math.min(max, Math.round(x))))} disabled={saving} />;
  };
  const text = (path: string, label: string, multiline = true) => {
    const v = path.split(".").reduce((o: any, k) => o[k], edit);
    return <ui.TextField label={label} value={String(v ?? "")} onChange={(x: string) => set(path, x)} multiline={multiline} disabled={saving} />;
  };
  const list = (path: string, label: string) => {
    const v = path.split(".").reduce((o: any, k) => o[k], edit) || [];
    return <ui.TextField label={label} value={v.join(",")} onChange={(x: string) => set(path, x.split(/[,，]/))} disabled={saving} />;
  };
  const clean = (t: any) => {
    const { builtIn, modified, ...rest } = t;
    const tidy = (a: any) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : []);
    return { ...rest, detect: { ...rest.detect, keywords: tidy(rest.detect?.keywords), exclude: tidy(rest.detect?.exclude) } };
  };

  async function save() {
    const L = edit.layout;
    if (L.windowBottom - L.windowTop < 100 || L.sourceBottom - L.sourceTop < 100) return setMsg({ tone: "error", text: S.invalidLayout });
    setSaving(true);
    try {
      await store.put("templates", edit.id, clean(edit));
      await onChanged(edit.id);
      setMsg({ tone: "success", text: S.savedOk });
    } catch (e: any) {
      setMsg({ tone: "error", text: String(e?.message || e) });
    } finally {
      setSaving(false);
    }
  }
  async function duplicate() {
    const id = "t" + Date.now().toString(36);
    const copy = { ...clean(clone(edit)), id, baseId: current.builtIn ? current.id : current.baseId || current.id, name: S.copyName(nameOf(edit, lang)) };
    setSaving(true);
    try {
      await store.put("templates", id, copy);
      await onChanged(id);
      setSelId(id);
      setMsg(null);
    } catch (e: any) {
      setMsg({ tone: "error", text: String(e?.message || e) });
    } finally {
      setSaving(false);
    }
  }
  async function removeOrReset() {
    if (!current.builtIn && !armedDelete) return setArmedDelete(true);
    setSaving(true);
    try {
      await store.del("templates", current.id);
      await onChanged(current.builtIn ? current.id : templates[0].id);
      if (!current.builtIn) setSelId(templates[0].id);
      setMsg(null);
    } catch (e: any) {
      setMsg({ tone: "error", text: String(e?.message || e) });
    } finally {
      setSaving(false);
      setArmedDelete(false);
    }
  }
  async function pickImage(file: any, kind: "background" | "logo") {
    if (!file) {
      if (kind === "background") set("background", { ...edit.background, image: "", imageName: "" });
      else set("logo", { ...edit.logo, image: "", imageName: "" });
      return;
    }
    if (!fs) return setMsg({ tone: "error", text: S.noFileAccess });
    try {
      const url = await imageToDataUrl(fs, file.path, kind);
      if (kind === "background") set("background", { ...edit.background, mode: "image", image: url, imageName: file.name });
      else set("logo", { ...edit.logo, mode: "image", image: url, imageName: file.name });
      setMsg(null);
    } catch (e) {
      setMsg({ tone: "error", text: S.imageFailed });
    }
  }

  const note = current.builtIn ? (current.modified ? S.modifiedNote : S.builtInNote) : S.customNote;
  const B = edit.background, H = edit.headline, C = edit.captions, G = edit.logo;
  const weights = [300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: String(w), label: String(w) }));
  const look = (
    <>
      <LayoutPreview t={edit} S={S} />
      <ui.Section title={S.secWindow}>
        {num("layout.windowTop", S.windowTop, 0, 1700, "px")}
        {num("layout.windowBottom", S.windowBottom, 200, 1920, "px")}
      </ui.Section>
      <ui.Section title={S.secCrop}>
        {num("layout.sourceTop", S.sourceTop, 0, 980, "px")}
        {num("layout.sourceBottom", S.sourceBottom, 100, 1080, "px")}
        {num("layout.offsetX", S.offsetX, -960, 960, "px")}
        <small>{S.layoutHint}</small>
        <SourceCrop t={edit} />
      </ui.Section>
      <ui.Section title={S.secPositions}>
        {num("layout.headlineCenter", S.headlineCenter, 0, 1920, "px")}
        {num("layout.logoCenter", S.logoCenter, 0, 1920, "px")}
      </ui.Section>
      <ui.Section title={S.background}>
        <ui.Segmented
          label={S.bgMode}
          value={B.mode}
          onChange={(v: string) => set("background.mode", v)}
          options={[
            { value: "style", label: S.bgStyle },
            { value: "color", label: S.bgColor },
            { value: "image", label: S.bgImage },
          ]}
          disabled={saving}
        />
        {B.mode === "color" && <ui.ColorField label={S.color} value={B.color} onChange={(v: string) => set("background.color", v)} disabled={saving} />}
        {B.mode === "image" && (
          <ui.Stack gap={8}>
            <ui.FileDrop
              accept={["image"]}
              value={B.imageName ? { path: "", name: B.imageName } : null}
              onChange={(f: any) => pickImage(f, "background")}
              onReject={() => setMsg({ tone: "error", text: S.imageType })}
              disabled={saving}
            />
            <small>{S.imageHint}</small>
            <ui.Slider label={S.dim} value={Number(B.dim) || 0} min={0} max={80} step={5} unit="%" onChange={(v: number) => set("background.dim", v)} disabled={saving} />
          </ui.Stack>
        )}
        <ui.Toggle label={S.border} value={!!edit.border.on} onChange={(v: boolean) => set("border.on", v)} disabled={saving} />
        {edit.border.on && <ui.ColorField label={S.borderColor} value={edit.border.color} onChange={(v: string) => set("border.color", v)} disabled={saving} />}
      </ui.Section>
      <ui.Section title={S.headline}>
        <ui.FontField label={S.font} value={H.font || ""} onChange={(v: string) => set("headline.font", v)} disabled={saving} />
        {num("headline.size1", S.size1, 30, 160, "px")}
        <ui.ColorField label={S.color1} value={H.color1} onChange={(v: string) => set("headline.color1", v)} disabled={saving} />
        {num("headline.size2", S.size2, 30, 160, "px")}
        <ui.ColorField label={S.color2} value={H.color2} onChange={(v: string) => set("headline.color2", v)} disabled={saving} />
        <ui.Toggle label={S.box2On} value={!!H.box2On} onChange={(v: boolean) => set("headline.box2On", v)} disabled={saving} />
        {H.box2On && <ui.ColorField label={S.box2} value={H.box2} onChange={(v: string) => set("headline.box2", v)} disabled={saving} />}
        <ui.Toggle label={S.italic} value={!!H.italic} onChange={(v: boolean) => set("headline.italic", v)} disabled={saving} />
        <ui.Toggle label={S.shadow} value={!!H.shadow} onChange={(v: boolean) => set("headline.shadow", v)} disabled={saving} />
      </ui.Section>
      <ui.Section title={S.logo}>
        <ui.Segmented
          label={S.logoMode}
          value={G.mode}
          onChange={(v: string) => set("logo.mode", v)}
          options={[
            { value: "image", label: S.logoImage },
            { value: "none", label: S.logoNone },
          ]}
          disabled={saving}
        />
        {G.mode === "image" && (
          <ui.Stack gap={8}>
            <ui.FileDrop
              accept={["image"]}
              value={G.imageName ? { path: "", name: G.imageName } : null}
              onChange={(f: any) => pickImage(f, "logo")}
              onReject={() => setMsg({ tone: "error", text: S.imageType })}
              disabled={saving}
            />
            {num("logo.width", S.logoWidth, 80, 1080, "px")}
          </ui.Stack>
        )}
      </ui.Section>
    </>
  );
  const captions = (
    <>
      <LayoutPreview t={edit} S={S} />
      <ui.Section title={S.captions}>
        <ui.Toggle label={S.captionsOn} value={!!C.on} onChange={(v: boolean) => set("captions.on", v)} disabled={saving} />
        {!C.on && <small>{S.captionsOffHint}</small>}
        {C.on && (
          <ui.Stack gap={8}>
            <ui.Segmented
              label={S.capMode}
              value={C.mode}
              onChange={(v: string) => set("captions.mode", v)}
              options={[
                { value: "bar", label: S.capBar },
                { value: "box", label: S.capBox },
              ]}
              disabled={saving}
            />
            {C.mode === "bar" ? num("captions.barHeight", S.barHeight, 60, 600, "px") : num("captions.bottom", S.capBottom, 200, 1920, "px")}
            <ui.FontField label={S.font} value={C.font || ""} onChange={(v: string) => set("captions.font", v)} disabled={saving} />
            {num("captions.fontSize", S.fontSize, 24, 120, "px")}
            <ui.Select label={S.fontWeight} value={String(C.fontWeight)} onChange={(v: string) => set("captions.fontWeight", Number(v))} options={weights} disabled={saving} />
            <ui.ColorField label={S.textColor} value={C.color} onChange={(v: string) => set("captions.color", v)} disabled={saving} />
            {C.mode === "box" && <ui.ColorField label={S.boxColor} value={C.boxColor} onChange={(v: string) => set("captions.boxColor", v)} disabled={saving} />}
            {num("captions.lineMax", S.lineMax, 8, 30)}
          </ui.Stack>
        )}
      </ui.Section>
      <ui.Section title={S.editing}>
        <ui.Toggle label={S.removeFillers} value={!!edit.editing.removeFillers} onChange={(v: boolean) => set("editing.removeFillers", v)} disabled={saving} />
        <ui.Toggle label={S.removeSilences} value={!!edit.editing.removeSilences} onChange={(v: boolean) => set("editing.removeSilences", v)} disabled={saving} />
      </ui.Section>
    </>
  );
  const ai = (
    <>
      <ui.Section title={S.prompt}>
        <small>{S.promptHint}</small>
        {text("prompt.role", S.role)}
        {text("prompt.format", S.format)}
        {text("prompt.good", S.good)}
        {text("prompt.bad", S.bad)}
        {text("prompt.lengthGuide", S.lengthGuide, false)}
        {text("prompt.countGuide", S.countGuide)}
        {text("prompt.rules", S.rules)}
        {text("prompt.headline", S.headlineRules)}
      </ui.Section>
      <ui.Section title={S.detection}>
        {list("detect.keywords", S.keywords)}
        {list("detect.exclude", S.exclude)}
        {text("detect.host", S.host, false)}
      </ui.Section>
    </>
  );

  return (
    <>
      <ui.Stack gap={8}>
        <ui.Select
          label={S.template}
          value={current.id}
          onChange={(v: string) => {
            setSelId(v);
            setMsg(null);
          }}
          options={templates.map((t: any) => ({ value: t.id, label: nameOf(t, lang) }))}
          disabled={dirty || saving}
        />
        <small>{note}</small>
        <ui.TextField label={S.name} value={nameOf(edit, lang)} onChange={(v: string) => set("name", v)} disabled={saving} />
        <ui.Row gap={8}>
          <ui.Button variant="secondary" onClick={duplicate} disabled={dirty || saving}>
            {S.duplicate}
          </ui.Button>
          {current.builtIn ? (
            <ui.Button variant="ghost" onClick={removeOrReset} disabled={!current.modified || dirty || saving}>
              {S.reset}
            </ui.Button>
          ) : (
            <ui.Button variant="danger" onClick={removeOrReset} disabled={dirty || saving}>
              {armedDelete ? S.delConfirm : S.del}
            </ui.Button>
          )}
        </ui.Row>
        <ui.Tabs
          value={sub}
          onChange={setSub}
          tabs={[
            { value: "look", label: S.tabLook, content: look },
            { value: "captions", label: S.tabCaptions, content: captions },
            { value: "ai", label: S.tabAI, content: ai },
          ]}
        />
      </ui.Stack>
      <ui.Stack gap={8}>
        <ui.Actions>
          <ui.Button variant="ghost" onClick={() => setEdit(clone(current))} disabled={!dirty || saving}>
            {S.discard}
          </ui.Button>
          <ui.Button variant="primary" busy={saving} onClick={save} disabled={!dirty}>
            {S.save}
          </ui.Button>
        </ui.Actions>
        {dirty && <ui.Message>{S.unsaved}</ui.Message>}
        {msg && <ui.Message tone={msg.tone}>{msg.text}</ui.Message>}
      </ui.Stack>
    </>
  );
}

// The app itself starts once the file route is known, so its folder is in place from the first render.
export default function Panel(props: any) {
  const [files, setFiles] = React.useState<any>(undefined);
  React.useEffect(() => {
    let live = true;
    connectFiles(props.sdk).then((f) => {
      if (live) setFiles(f);
    });
    return () => {
      live = false;
    };
  }, [props.sdk]);
  if (files === undefined) return null;
  return <ClipsPanel {...props} files={files} />;
}

function ClipsPanel({ sdk, context, ui, files }: any) {
  const lang = langOf(context);
  const S = STRINGS[lang] ?? STRINGS.en;
  const projectId: string | null = context?.projectId ?? null;
  const store = React.useMemo(() => makeStore(files), [files]);
  const [tab, setTab] = React.useState<string>("make");
  const [templates, setTemplates] = React.useState<any[]>(BUILTIN_TEMPLATES.map((t: any) => ({ ...t, builtIn: true })));
  const [mode, setMode] = React.useState<string>("youtube");
  const [url, setUrl] = React.useState<string>("");
  const [resources, setResources] = React.useState<any[]>([]);
  const [pick, setPick] = React.useState<string | null>(null);
  const [program, setProgram] = React.useState<string>("auto");
  const [countMode, setCountMode] = React.useState<string>("auto");
  const [count, setCount] = React.useState<number>(4);
  const [note, setNote] = React.useState<string>("");
  const [busy, setBusy] = React.useState<boolean>(false);
  const [step, setStep] = React.useState<number>(-1);
  const [status, setStatus] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const [warn, setWarn] = React.useState<string>("");
  const [info, setInfo] = React.useState<any>(null);
  const [drafts, setDrafts] = React.useState<any[]>([]);
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [runInfo, setRunInfo] = React.useState<any>(null);
  const [now, setNow] = React.useState<number>(Date.now());
  const [sub, setSub] = React.useState<number>(0);
  const [cancelling, setCancelling] = React.useState<boolean>(false);
  const stepStarted = React.useRef<number>(Date.now());
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const [tplSel, setTplSel] = React.useState<string>(BUILTIN_TEMPLATES[0].id);
  const [tplEdit, setTplEdit] = React.useState<any>(null);
  const [tplBase, setTplBase] = React.useState<string>("");
  const [tplSub, setTplSub] = React.useState<string>("look");

  // A run shows how long its current step has taken, so a slow AI step does not look stuck.
  React.useEffect(() => {
    stepStarted.current = Date.now();
    setNow(Date.now());
    setSub(0);
  }, [step]);
  React.useEffect(() => {
    if (!busy) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [busy]);
  React.useEffect(() => {
    if (!busy && step >= 5 && drafts.length) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [busy, step, drafts.length]);

  // Resource ids are Project-scoped aliases; every script re-resolves a saved one by id and file name.
  const resolver = (resourceId: string, resourceName: string) =>
    `const project = selects.project(${JSON.stringify(projectId)}); const rows = await project.resources(); ` +
    `const res = rows.find((r: any) => r.resourceId === ${JSON.stringify(resourceId)} && (${JSON.stringify(!resourceName)} || r.name === ${JSON.stringify(resourceName)})) || rows.find((r: any) => r.name === ${JSON.stringify(resourceName)}) || rows.find((r: any) => r.resourceId === ${JSON.stringify(resourceId)}) || null; `;
  // The run in progress. Cancelling rejects its stop promise, which every host call of the run is raced against.
  const runRef = React.useRef<{ cancelled: boolean; stop: Promise<never>; cancel(): void } | null>(null);
  const guard = <T,>(p: Promise<T>): Promise<T> => {
    const run = runRef.current;
    if (!run) return p;
    if (run.cancelled) return Promise.reject(new RunCancelled());
    return Promise.race([p, run.stop]);
  };
  const script = async (code: string, summary: string, allowCommit = false) => {
    const r: any = await guard(sdk.runScript({ script: code, summary, allowCommit }));
    if (r.isError) throw new Error(scriptError(r.output));
    return r.result;
  };
  const shell = async (command: string, summary: string, timeoutMs = 120000, cwd?: string) => {
    const cmd = IS_WIN ? "@echo off\r\n" + command.replace(/\r?\n/g, "\r\n") : command;
    const r: any = await guard(sdk.runShell({ summary, command: cmd, timeoutMs, maxOutputBytes: 48000, ...(cwd ? { cwd } : {}) }));
    return { ...r, stdout: String(r.stdout || ""), stderr: String(r.stderr || ""), output: String(r.output || "") };
  };

  // ---- Templates: built-ins, overridden or extended by files saved on this computer ----
  const loadTemplates = React.useCallback(async () => {
    try {
      const list = resolveTemplates(await store.list("templates"));
      setTemplates(list);
      return list;
    } catch (e: any) {
      setError(String(e?.message || e));
      return null;
    }
  }, [store]);
  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // ---- Saved progress: each step is written to disk so a closed or reloaded panel can resume ----
  const saveJob = async (job: any) => store.put("jobs", job.id, job);
  const loadJobs = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const since = Date.now() - 14 * 24 * 3600 * 1000;
      const list = (await store.list("jobs"))
        .filter((j: any) => j && j.projectId === projectId && !j.done && !j.dismissed && Date.parse(j.updated || j.created || "") > since)
        .sort((a: any, b: any) => String(b.updated).localeCompare(String(a.updated)));
      setJobs(list);
    } catch (e) {}
  }, [projectId, store]);
  React.useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadResources = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const rows = await script(
        `return (await selects.project(${JSON.stringify(projectId)}).resources()).filter((r: any) => r.type === "Video").map((r: any) => ({ id: r.resourceId, name: r.name, analyzed: r.hasAnalysis, status: r.status, sec: Math.round(r.durationSeconds ?? 0) }));`,
        "List project videos"
      );
      setResources(rows || []);
    } catch (e: any) {
      if (!(e instanceof RunCancelled)) setError(String(e?.message || e));
    }
  }, [projectId]);
  React.useEffect(() => {
    loadResources();
  }, [loadResources]);
  React.useEffect(() => {
    if (typeof sdk?.on !== "function") return;
    const off = sdk.on("resourcesChanged", () => loadResources());
    return typeof off === "function" ? off : undefined;
  }, [projectId]);
  React.useEffect(() => {
    const eligible = resources.filter((r) => r.sec >= 120);
    if (eligible.length === 1) {
      if (pick !== eligible[0].id) setPick(eligible[0].id);
    } else if (pick && !eligible.some((r) => r.id === pick)) {
      setPick(null);
    }
  }, [resources]);

  // ---- Host programs: yt-dlp (downloaded into the app's folder when missing) and ffmpeg ----
  async function dataPaths() {
    if (store.root) return { root: store.root, media: store.media, bin: store.bin, join: store.join };
    if (IS_WIN) throw new Error(S.noFileAccess);
    const home = (await shell(`printf %s "$HOME"`, "Find home folder")).stdout.trim();
    const root = `${home}/.selects/plugin-data/${APP_ID}`;
    return { root, media: `${root}/media`, bin: `${root}/bin`, join: (...p: string[]) => p.join("/") };
  }

  async function findTools(): Promise<{ ytdlp: string | null; ffmpeg: string | null }> {
    const P = await dataPaths();
    const own = P.join(P.bin, IS_WIN ? "yt-dlp.exe" : "yt-dlp");
    let cmd: string;
    if (IS_WIN) {
      const local = store.fs ? store.join(store.fs.homedir(), "AppData", "Local", "Programs") : "";
      const bundled = local ? ["Selects", "Selects Staging"].map((a) => store.join(local, a, "resources", "app.asar.unpacked", "dist", "bin", "ffmpeg.exe")) : [];
      cmd = [
        `if exist ${wq(own)} echo Y=OWN`,
        ...bundled.map((f, i) => `if exist ${wq(f)} echo F=BUNDLED${i}`),
        `for /f "delims=" %%i in ('where yt-dlp.exe 2^>nul') do echo Y=%%i`,
        `for /f "delims=" %%i in ('where ffmpeg.exe 2^>nul') do echo F=%%i`,
        `exit /b 0`,
      ].join("\n");
    } else {
      const apps = ["Selects", "Selects Staging", "Selects Delta"].map((a) => pq(`/Applications/${a}.app/Contents/Resources/app.asar.unpacked/dist/bin/ffmpeg`)).join(" ");
      cmd =
        `for p in ${pq(own)} "$(command -v yt-dlp 2>/dev/null)" "$HOME/.local/bin/yt-dlp" /opt/homebrew/bin/yt-dlp /usr/local/bin/yt-dlp; do [ -n "$p" ] && [ -x "$p" ] && echo "Y=$p"; done; ` +
        `for p in "$(command -v ffmpeg 2>/dev/null)" /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg ${apps}; do [ -n "$p" ] && [ -x "$p" ] && echo "F=$p"; done; true`;
    }
    const r = await shell(cmd, "Find yt-dlp and ffmpeg", 60000);
    const lines = r.stdout.split(/\r?\n/).map((l: string) => l.trim());
    const first = (p: string) => {
      const l = lines.find((x: string) => x.startsWith(p + "="));
      return l ? l.slice(p.length + 1).trim() : null;
    };
    const y = first("Y");
    const f = first("F");
    const bundledPath = (i: number) => store.join(store.fs.homedir(), "AppData", "Local", "Programs", ["Selects", "Selects Staging"][i], "resources", "app.asar.unpacked", "dist", "bin", "ffmpeg.exe");
    const ff = f && /^BUNDLED\d$/.test(f) ? bundledPath(Number(f.slice(7))) : f;
    return { ytdlp: y === "OWN" ? own : y, ffmpeg: ff };
  }

  async function installYtdlp(): Promise<string> {
    const P = await dataPaths();
    const target = P.join(P.bin, IS_WIN ? "yt-dlp.exe" : "yt-dlp");
    const part = target + ".part";
    const cmd = IS_WIN
      ? [
          `if not exist ${wq(P.bin)} mkdir ${wq(P.bin)}`,
          `curl.exe -fsSL --retry 3 -o ${wq(part)} ${wq(YTDLP_URL)} || exit /b 1`,
          `move /y ${wq(part)} ${wq(target)} >nul || exit /b 1`,
          `${wq(target)} --version`,
        ].join("\n")
      : `mkdir -p ${pq(P.bin)} && curl -fsSL --retry 3 -o ${pq(part)} ${pq(YTDLP_URL)} && mv -f ${pq(part)} ${pq(target)} && chmod +x ${pq(target)} && ${pq(target)} --version`;
    const r = await shell(cmd, "Download yt-dlp", 290000);
    if (r.exitCode === 0 && /\d{4}\.\d{2}\.\d{2}/.test(r.stdout)) return target;
    // curl can be missing or blocked; Selects' own downloader is the fallback.
    const fs = store.fs;
    if (fs && typeof fs.downloadFile === "function") {
      await store.ensure(P.bin);
      await fs.downloadFile(YTDLP_URL, target);
      const v = await shell(IS_WIN ? `${wq(target)} --version` : `chmod +x ${pq(target)} && ${pq(target)} --version`, "Check yt-dlp", 120000);
      if (v.exitCode === 0) return target;
    }
    throw new Error(S.ytdlpFailed + shortError(r.stderr || r.output || ""));
  }

  // ---- Step 1: get a project resource for the source ----
  async function prepareFromYoutube(link: string): Promise<{ resourceId: string; resourceName: string; title: string }> {
    setStatus(S.preparingSource);
    const P = await dataPaths();
    let tools = await findTools();
    let refreshed = false;
    if (!tools.ytdlp) {
      tools = { ...tools, ytdlp: await installYtdlp() };
      refreshed = true;
    }
    // A failing yt-dlp is most often an old one, since YouTube changes break it: get the latest once and retry.
    // When the update itself fails, the original failure is the one worth showing.
    const refreshYtdlp = async () => {
      if (refreshed) return false;
      refreshed = true;
      setStatus(S.preparingSource);
      try {
        tools = { ...tools, ytdlp: await installYtdlp() };
        return true;
      } catch {
        return false;
      }
    };
    if (store.fs) await store.ensure(P.media);
    else await shell(`mkdir -p ${pq(P.media)}`, "Create download folder");
    const readDetails = () =>
      shell(`${qa(tools.ytdlp!)} --no-warnings --encoding utf-8 --skip-download --no-playlist --print id --print title ${qa(link)}`, "Read video details", 120000);
    const detailsOk = (r: any) => r.exitCode === 0 && r.stdout.trim().split(/\r?\n/).length >= 2;
    let metaR = await readDetails();
    if (!detailsOk(metaR) && (await refreshYtdlp())) metaR = await readDetails();
    const lines = metaR.stdout.trim().split(/\r?\n/);
    if (!detailsOk(metaR)) {
      console.warn(`[${APP_ID}] read link`, (metaR.stderr || metaR.output || "").slice(-2000));
      throw new Error(S.readLinkFailed + shortError(metaR.stderr || metaR.output));
    }
    const vid = lines[lines.length - 2].trim();
    const title = lines[lines.length - 1].trim();
    const file = P.join(P.media, `${vid}.mp4`);
    const fmt = tools.ffmpeg ? "137+140/bv*[height<=1080][vcodec^=avc1]+ba[ext=m4a]/b[height<=1080]" : "b[ext=mp4][height<=1080]/b";
    if (!tools.ffmpeg) setWarn(S.noFfmpeg);
    const base = () =>
      `${qa(tools.ytdlp!)} --no-warnings --no-progress --encoding utf-8 --no-playlist -N 4 -f ${qa(fmt)} --merge-output-format mp4 ` +
      (tools.ffmpeg ? `--ffmpeg-location ${qa(tools.ffmpeg)} ` : "") +
      `-o ${qa(P.join(P.media, "%(id)s.%(ext)s"))} ${qa(link)}`;
    const have = async () =>
      store.fs ? store.exists(file) : (await shell(`[ -s ${pq(file)} ] && echo HAVE`, "Check download")).stdout.includes("HAVE");
    let ok = await have();
    // Chrome's cookies are read only when YouTube wants a signed-in viewer, since reading them can raise a
    // macOS Keychain prompt.
    let withCookies = false;
    for (let attempt = 0; !ok && attempt < 8; attempt++) {
      setStatus(S.downloading(attempt + 1));
      const cookies = withCookies && !IS_WIN ? " --cookies-from-browser chrome" : "";
      const r = await shell(base() + cookies, "Download the YouTube video", 290000);
      ok = await have();
      const out = r.stderr || r.output || "";
      if (!ok && out) console.warn(`[${APP_ID}] download attempt`, attempt + 1, out.slice(-2000));
      if (!ok && /sign in|not a bot|confirm your age|age-restricted|login required|members-only|cookies/i.test(out)) withCookies = true;
      if (!ok && !r.timedOut && r.exitCode !== 0 && (await refreshYtdlp())) continue;
      if (!ok && !r.timedOut && r.exitCode !== 0 && attempt >= 3) throw new Error(S.downloadFailed + shortError(out));
    }
    if (!ok) throw new Error(S.downloadUnfinished);
    const existing = await script(
      `const r = (await selects.project(${JSON.stringify(projectId)}).resources()).find((r: any) => String(r.name).includes(${JSON.stringify(vid)})); return r ? { id: r.resourceId, name: r.name } : null;`,
      "Look for an earlier import"
    );
    if (existing?.id) return { resourceId: existing.id, resourceName: existing.name, title };
    const imp = await script(
      `const p = selects.project(${JSON.stringify(projectId)}); const imp = await p.importFiles({ paths: [${JSON.stringify(file)}] }); const id = imp?.addedResourceIds?.[0]; const r = id ? (await p.resources()).find((x: any) => x.resourceId === id) : null; return r ? { id, name: r.name } : null;`,
      "Import the video",
      true
    );
    if (!imp?.id) throw new Error(S.importFailed);
    return { resourceId: imp.id, resourceName: imp.name, title };
  }

  // ---- Step 2: make sure Selects has analyzed it ----
  async function ensureAnalyzed(resourceId: string, resourceName: string) {
    // The analysis run's own estimate and progress, so the wait shows how far it has got.
    const st = async () =>
      script(
        resolver(resourceId, resourceName) +
          `if (!res) return null; const w = (await project.workflows({ type: "project:analyze-resource" })).find((x) => x.resourceId === res.resourceId && (x.status === "running" || x.status === "queued")); ` +
          `return { status: res.status, has: res.hasAnalysis, wf: w ? { startedAt: w.startedAt, est: w.estimatedDurationMs ?? null, progress: w.progress ?? null } : null };`,
        "Check analysis status"
      );
    let s = await st();
    if (s?.has) return;
    if (s && ["pending", "samplingFailed", "analyzingFailed"].includes(s.status)) {
      // Selects asks the user to approve the credits in its own window and closes that request when this
      // script's 30 seconds run out. An unanswered or declined request comes back as a failed script.
      setStatus(S.confirmCredits);
      let begun: any = null;
      try {
        begun = await script(
          // `@speaker-profiling off` above opens that request with speaker profiling off: clips need words and
          // speaker ids, not speaker profiles.
          resolver(resourceId, resourceName) + `if (!res) throw new Error("The source video is no longer in this project."); return await project.startAnalysis({ resourceIds: [res.resourceId] });`,
          "Analyze the source video",
          true
        );
      } catch (e: any) {
        if (/Analysis canceled by user|confirmation deadline/i.test(String(e?.message || e))) throw new Error(S.confirmMissed);
        throw e;
      }
      if (begun?.cancelled) throw new Error(S.confirmMissed);
    }
    setStatus(S.waitingAnalysis);
    const t0 = Date.now();
    while (Date.now() - t0 < 45 * 60 * 1000) {
      await guard(sleep(10000));
      s = await st();
      if (s?.has) return;
      if (s && /Failed$/.test(s.status)) throw new Error(S.analysisFailed(s.status));
      const w = s?.wf;
      if (w) {
        const ran = w.startedAt ? Date.now() - w.startedAt : 0;
        const frac = w.progress != null ? w.progress : w.est ? ran / w.est : null;
        if (frac != null) setSub(Math.max(0, Math.min(0.95, frac)));
        const left = w.est && w.startedAt ? Math.round((w.est - ran) / 60000) : null;
        setStatus(left != null && left >= 1 ? S.analyzingLeft(left) : S.waitingAnalysis);
      }
    }
    throw new Error(S.analysisSlow);
  }

  async function readTranscript(resourceId: string, resourceName: string) {
    const lines: any[] = [];
    let duration = 0;
    for (let off = 0; off < 5000; off += 250) {
      const r = await script(SCRIPT_TRANSCRIPT.replace("const P: any = __P__;", () => "const P: any = " + JSON.stringify({ projectId, resourceId, resourceName, offset: off, limit: 250 }) + ";"), "Read the transcript");
      duration = r.duration;
      lines.push(...r.lines);
      if (off + 250 >= r.total) break;
    }
    return { lines, duration };
  }

  // ---- Step 3: identify the program ----
  async function identify(title: string, lines: any[], list: any[]) {
    const head = lines.slice(0, 120).map((l) => l[2]).join(" ");
    const all = lines.map((l) => l[2]).join(" ");
    const byTitle = scoreProgram(title, list);
    if (byTitle) return { key: byTitle, why: `${S.whyTitle}: ${title}` };
    const byText = scoreProgram(head + " " + all.slice(0, 20000), list);
    if (byText) return { key: byText, why: S.whyTranscript };
    const fallback = list.find((t) => t.id === APP_CONFIG.defaultTemplate);
    // A neutral template has no program identity to ask the model to detect.
    const candidates = list.filter((t) => t.detect?.keywords?.length || t.detect?.host?.trim());
    if (!candidates.length) return { key: fallback?.id || null, why: fallback ? S.whyDefault : "" };
    const prompt =
      `Identify which program this video belongs to. Candidates: ${candidates.map((t) => `${t.id}=${nameOf(t, lang)} (${t.detect?.host || ""})`).join(", ")}. ` +
      `Return "none" if none match. You may inspect the source video's logos with project tools. Do not edit.\n` +
      `Title/file name: ${title}\nOpening transcript: ${head.slice(0, 4000)}\n` +
      `Respond only with JSON: {"program": "<key or none>", "reason": "<one sentence>"}`;
    const r: any = await guard(sdk.askAI({ prompt, timeoutMs: 180000 }));
    const j = extractJson(r.text, S);
    if (!j.program || !candidates.some((t) => t.id === j.program)) {
      return { key: fallback?.id || null, why: fallback ? S.whyDefault : j.reason || "" };
    }
    return { key: j.program, why: `${S.whyAI}: ${j.reason || ""}` };
  }

  // ---- Step 4: recommend a count and choose passages, following the template's instructions ----
  async function choose(tpl: any, title: string, lines: any[], duration: number, cMode: string, cNum: number, cNote: string) {
    const p = tpl.prompt;
    let tx = lines.map((l) => `[${l[0]}-${l[1]}] ${l[2]}`).join("\n");
    let truncated = false;
    if (tx.length > 90000) {
      tx = tx.slice(0, 90000);
      truncated = true;
    }
    const want = cMode === "manual" ? `Make exactly ${cNum} clips.` : `Recommend a count. ${p.countGuide} Make fewer if there are not enough strong passages. Do not fill the count with weak clips.`;
    const prompt = [
      `${p.role} Choose vertical short-form clip segments from this source video (${nameOf(tpl, lang)}, ${Math.round(duration)} seconds).`,
      `Write headlines and caption corrections in the source video's language unless the template or user requests otherwise.`,
      `Title/file name: ${title}`,
      `Program format: ${p.format}`,
      `Strong clips: ${p.good}`,
      `Avoid: ${p.bad}`,
      `Rules: ${p.rules} Source duration per clip: ${p.lengthGuide}.`,
      `Two-line headline: ${p.headline}`,
      want,
      cNote ? `User instructions: ${cNote}` : "",
      `Each transcript line is [startSeconds-endSeconds] text. Align each segment start and end exactly with a transcript line boundary.` + (truncated ? " The transcript was truncated; use project tools to read the rest if needed." : ""),
      `For clear transcription errors in names, places or numbers, provide fixes as {"from": "transcribed text", "to": "correct text"}. Do not use editing tools.`,
      `Respond only with JSON: {"recommendedCount": 3, "countReason": "one or two sentences", "clips": [{"headline1": "...", "headline2": "...", "segments": [[0, 30]], "why": "one sentence"}], "fixes": [{"from": "...", "to": "..."}]}. Use actual source timings, not the example values.`,
      `Transcript:\n${tx}`,
    ].filter(Boolean).join("\n\n");
    const r: any = await guard(sdk.askAI({ prompt, timeoutMs: 600000 }));
    const j = extractJson(r.text, S);
    let clips = (j.clips || []).filter((c: any) => Array.isArray(c.segments) && c.segments.length);
    clips = clips
      .map((c: any) => ({
        ...c,
        segments: c.segments
          .map((x: any) => [Math.max(0, Number(x[0])), Math.min(duration, Number(x[1]))])
          .filter((x: any) => x[1] - x[0] > 1)
          .sort((a: any, b: any) => a[0] - b[0]),
      }))
      .filter((c: any) => c.segments.length);
    if (cMode === "manual") clips = clips.slice(0, cNum);
    return { clips, recommendedCount: j.recommendedCount ?? clips.length, countReason: j.countReason || "", fixes: Array.isArray(j.fixes) ? j.fixes : [] };
  }

  async function run(resume?: any) {
    setError("");
    setWarn("");
    setDrafts([]);
    setInfo(null);
    if (!projectId) return setError(S.noProject);
    if (!resume && mode === "youtube" && !/^https?:\/\//.test(url.trim())) return setError(S.needUrl);
    if (!resume && mode === "project" && !pick) return setError(S.needPick);
    setBusy(true);
    let rejectStop: (e: any) => void = () => {};
    const stop = new Promise<never>((_, reject) => (rejectStop = reject));
    stop.catch(() => {});
    const token = {
      cancelled: false,
      stop,
      cancel() {
        token.cancelled = true;
        rejectStop(new RunCancelled());
      },
    };
    runRef.current = token;
    let job: any = resume ?? { id: Date.now().toString(36), projectId, created: new Date().toISOString(), mode, url: url.trim(), pick, program, countMode, count, note };
    setRunInfo(job);
    const persist = async (patch: any) => {
      job = { ...job, ...patch, updated: new Date().toISOString() };
      setRunInfo(job);
      await saveJob(job);
    };
    try {
      const list = (await loadTemplates()) || templates;
      await persist({});
      setJobs((js) => js.filter((j) => j.id !== job.id));
      setStep(0);
      if (!job.resourceId) {
        if (job.mode === "youtube") {
          const r = await prepareFromYoutube(job.url);
          await persist({ resourceId: r.resourceId, resourceName: r.resourceName, title: r.title });
        } else {
          const nm = resources.find((r) => r.id === job.pick)?.name || "";
          await persist({ resourceId: job.pick, resourceName: nm, title: nm });
        }
      }
      setStep(1);
      setStatus("");
      if (!job.analyzed) {
        await ensureAnalyzed(job.resourceId, job.resourceName || "");
        await persist({ analyzed: true });
      }
      const { lines, duration } = await readTranscript(job.resourceId, job.resourceName || "");
      if (!lines.length) throw new Error(S.emptyTranscript);
      setStep(2);
      setStatus(S.identifying);
      if (!job.key) {
        let key = job.program !== "auto" && list.some((t: any) => t.id === job.program) ? job.program : null;
        let why = key ? S.whyManual : "";
        if (!key) {
          const id = await identify(job.title || "", lines, list);
          key = id.key;
          why = id.why;
        }
        if (!key) throw new Error(S.unsupported);
        await persist({ key, why });
      }
      const tpl = list.find((t: any) => t.id === job.key);
      if (!tpl) throw new Error(S.templateGone);
      setInfo({ key: job.key, why: job.why });
      setStep(3);
      setStatus(S.choosing);
      if (!job.choice) {
        const pickd = await choose(tpl, job.title || "", lines, duration, job.countMode, job.count, job.note);
        if (!pickd.clips.length) throw new Error(S.noPassage);
        // Names are fixed here so a resumed job finds the drafts it already made, whatever the app language.
        pickd.clips = pickd.clips.map((c: any, i: number) => ({
          ...c,
          name: `${nameOf(tpl, lang)} ${i + 1} · ${String(c.headline1).replace(/["“”]/g, "").slice(0, 28)} · ${job.id}`,
        }));
        await persist({ choice: pickd });
      }
      const pickd = job.choice;
      setInfo({ key: job.key, why: job.why, recommended: pickd.recommendedCount, countReason: pickd.countReason });
      setStep(4);
      const transform = cropTransform(tpl.layout);
      const made: any[] = Array.isArray(job.built) ? job.built.slice() : [];
      for (let i = 0; i < pickd.clips.length; i++) {
        const c = pickd.clips[i];
        if (made[i]?.draftId) continue;
        setStatus(S.building(i + 1, pickd.clips.length));
        setSub(i / pickd.clips.length);
        const name = c.name || `${nameOf(tpl, lang)} ${i + 1} · ${String(c.headline1).replace(/["“”]/g, "").slice(0, 28)} · ${job.id}`;
        // A draft committed just before the panel closed is found by its unique name instead of being built twice.
        const found = await script(
          `const m = await selects.project(${JSON.stringify(projectId)}).meta(); for (const id of m.draftIds) { const dm = await selects.draft(id).meta(); if (dm.name === ${JSON.stringify(name)}) return { draftId: id, seconds: Math.round(dm.durationSeconds * 10) / 10 }; } return null;`,
          "Check for an existing draft"
        );
        if (found?.draftId) {
          made[i] = { ...c, name, draftId: found.draftId, seconds: found.seconds };
        } else {
          const P = {
            projectId,
            resourceId: job.resourceId,
            resourceName: job.resourceName || "",
            name,
            segments: c.segments,
            transform,
            frame: frameParams(tpl, c.headline1, c.headline2),
            editableFrame: editableFrame(S),
            caption: tpl.captions.on ? captionParams(tpl) : null,
            editableCaption: editableCaption(S),
            captions: !!tpl.captions.on,
            removeFillers: !!tpl.editing.removeFillers,
            removeSilences: !!tpl.editing.removeSilences,
            lineMax: tpl.captions.lineMax || 16,
            fixes: pickd.fixes,
          };
          try {
            const code = SCRIPT_BUILD.replace("const P: any = __P__;", () => "const P: any = " + JSON.stringify(P) + ";");
            if (code.length > SCRIPT_LIMIT) throw new Error(S.imagesTooLarge);
            const r = await script(code, `Build ${name}`, true);
            made[i] = { ...c, name, draftId: r?.draftId, seconds: r?.seconds };
          } catch (e: any) {
            if (e instanceof RunCancelled) throw e;
            made[i] = { ...c, name, error: String(e?.message || e).slice(0, 300) };
          }
        }
        setDrafts(made.filter(Boolean));
        await persist({ built: made });
      }
      const allBuilt = made.length === pickd.clips.length && made.every((m) => m && m.draftId);
      await persist({ done: allBuilt });
      setStatus(S.done(made.filter((m) => m && m.draftId).length));
      if (!allBuilt) setError(made.filter((m) => m && m.error).map((m) => m.error).join(" / ").slice(0, 600) + " " + S.resumeHint);
      setStep(5);
      loadResources();
    } catch (e: any) {
      if (e instanceof RunCancelled) {
        setError("");
        setStatus(S.cancelled);
      } else {
        setError(String(e?.message || e) + " " + S.resumeHint);
      }
      loadJobs();
    } finally {
      if (runRef.current === token) runRef.current = null;
      setBusy(false);
      setCancelling(false);
    }
  }

  function cancelRun() {
    if (!runRef.current || runRef.current.cancelled) return;
    setCancelling(true);
    runRef.current.cancel();
  }

  async function dismissJob(job: any) {
    await saveJob({ ...job, dismissed: true, updated: new Date().toISOString() });
    loadJobs();
  }

  async function openDraft(id: string) {
    try {
      await script(`return await selects.editor.openDraft(${JSON.stringify(id)});`, "Open the draft");
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  const programOptions = [{ value: "auto", label: S.auto }, ...templates.map((t) => ({ value: t.id, label: nameOf(t, lang) }))];
  const videoOptions = resources
    .filter((r) => r.sec >= 120)
    .map((r) => ({ value: r.id, label: `${r.name} · ${S.minutes(Math.floor(r.sec / 60))}${r.analyzed ? "" : " · " + S.notAnalyzed}` }));
  const infoTpl = info ? templates.find((t) => t.id === info.key) : null;
  const resourceName = (id: string | null) => resources.find((r) => r.id === id)?.name || "";
  const templateName = (id: string) => {
    const t = templates.find((x) => x.id === id);
    return t ? nameOf(t, lang) : "";
  };

  const sourceAction =
    mode === "project" ? <ui.IconButton icon="refresh" label={S.refresh} onClick={loadResources} disabled={busy} /> : undefined;

  // While a run is going the form is locked anyway, so it folds into what is being made and the progress
  // stays in view.
  const runSummary = runInfo && (
    <ui.Section title={S.thisRun}>
      <div style={CARD}>
        <ui.Stack gap={4}>
          <strong style={CLAMP2}>
            {runInfo.mode === "youtube" ? runInfo.title || runInfo.url : runInfo.resourceName || resourceName(runInfo.pick)}
          </strong>
          <small>
            {[
              runInfo.key ? templateName(runInfo.key) : runInfo.program === "auto" ? S.auto : templateName(runInfo.program),
              runInfo.countMode === "manual" ? S.clipsUnit(runInfo.count) : S.countAuto,
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
          {runInfo.note ? <small style={CLAMP2}>{runInfo.note}</small> : null}
        </ui.Stack>
      </div>
    </ui.Section>
  );

  const countOptions = [
    { value: "auto", label: S.countAuto },
    ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: S.clipsUnit(i + 1) })),
  ];

  const form = (
    <>
      <ui.Section title={S.source} actions={sourceAction}>
        <ui.Segmented
          label={S.sourceKind}
          value={mode}
          onChange={setMode}
          options={[
            { value: "youtube", label: S.fromYoutube },
            { value: "project", label: S.fromProject },
          ]}
        />
        {mode === "youtube" ? (
          <ui.TextField label={S.url} value={url} onChange={setUrl} placeholder={S.urlPh} />
        ) : (
          <ui.Select label={S.pick} value={pick} onChange={setPick} options={videoOptions} placeholder={S.pickPh} />
        )}
      </ui.Section>
      <ui.Section title={S.optionsSec}>
        <ui.Select label={S.programPick} value={program} onChange={setProgram} options={programOptions} />
        <ui.Select
          label={S.count}
          value={countMode === "manual" ? String(count) : "auto"}
          onChange={(v: string) => {
            if (v === "auto") return setCountMode("auto");
            setCountMode("manual");
            setCount(Number(v));
          }}
          options={countOptions}
        />
        <ui.TextField label={S.note} value={note} onChange={setNote} placeholder={S.notePh} />
      </ui.Section>
    </>
  );

  const elapsed = Math.max(0, Math.floor((now - stepStarted.current) / 1000));
  const statusLine = busy && step >= 0 ? [status, S.elapsed(elapsed)].filter(Boolean).join(" · ") : status;

  const make = !projectId ? (
    <ui.Message>{S.noProject}</ui.Message>
  ) : (
    <>
      {jobs.length > 0 && !busy && (
        <ui.Section title={S.saved}>
          {jobs.slice(0, 3).map((j) => (
            <div key={j.id} style={CARD}>
              <ui.Stack gap={4}>
                <strong style={CLAMP2}>{(j.title || j.url || resourceName(j.pick) || "").slice(0, 80)}</strong>
                <small>{S.stage(j)}</small>
                <ui.Row gap={8}>
                  <ui.Button variant="secondary" onClick={() => run(j)}>
                    {S.resume}
                  </ui.Button>
                  <ui.Button variant="ghost" onClick={() => dismissJob(j)}>
                    {S.dismiss}
                  </ui.Button>
                </ui.Row>
              </ui.Stack>
            </div>
          ))}
        </ui.Section>
      )}
      {busy ? runSummary : form}
      <ui.Stack gap={8}>
        <ui.Actions>
          {busy && (
            <ui.Button variant="secondary" onClick={cancelRun} disabled={cancelling}>
              {cancelling ? S.cancelling : S.cancel}
            </ui.Button>
          )}
          <ui.Button variant="primary" busy={busy} busyLabel={S.making} onClick={() => run()}>
            {S.make}
          </ui.Button>
        </ui.Actions>
        {step >= 0 && (
          <ui.Progress
            value={step >= S.steps.length ? 1 : (step + sub) / S.steps.length}
            label={step >= S.steps.length ? S.finished : `${S.steps[step]} · ${step + 1}/${S.steps.length}`}
          />
        )}
        {statusLine && <ui.Message tone={step >= 5 && !busy ? "success" : "muted"}>{statusLine}</ui.Message>}
        {info && (
          <ui.Message>
            {S.detected}: {infoTpl ? nameOf(infoTpl, lang) : info.key}
            {info.why ? ` · ${firstSentence(info.why)}` : ""}
          </ui.Message>
        )}
        {info && info.recommended != null && (
          <ui.Message>
            {S.recommended}: {S.clipsUnit(info.recommended)}
            {info.countReason ? ` · ${firstSentence(info.countReason)}` : ""}
          </ui.Message>
        )}
        {warn && <ui.Message>{warn}</ui.Message>}
        {error && <ui.Message tone="error">{error}</ui.Message>}
      </ui.Stack>
      {drafts.length > 0 && (
        <div ref={resultsRef}>
          <ui.Section title={S.result}>
            <ui.Grid minItemWidth={200}>
              {drafts.map((d, i) => (
                <div key={i} style={CARD}>
                  <ui.Stack gap={4}>
                    <strong style={CLAMP2}>{d.headline1}</strong>
                    {d.headline2 ? <small style={CLAMP2}>{d.headline2}</small> : null}
                    {d.error ? (
                      <ui.Message tone="error">{d.error}</ui.Message>
                    ) : (
                      <small style={CLAMP2}>{[d.seconds ? S.seconds(d.seconds) : "", d.why || ""].filter(Boolean).join(" · ")}</small>
                    )}
                    {d.draftId && (
                      <ui.Button variant="secondary" onClick={() => openDraft(d.draftId)}>
                        {S.open}
                      </ui.Button>
                    )}
                  </ui.Stack>
                </div>
              ))}
            </ui.Grid>
          </ui.Section>
        </div>
      )}
    </>
  );

  return (
    <ui.Tabs
      value={tab}
      onChange={setTab}
      tabs={[
        { value: "make", label: S.tabMake, content: make },
        {
          value: "templates",
          label: S.tabTemplates,
          content: (
            <TemplateEditor
              ui={ui}
              S={S}
              lang={lang}
              templates={templates}
              store={store}
              state={{ selId: tplSel, setSelId: setTplSel, edit: tplEdit, setEdit: setTplEdit, baseKey: tplBase, setBaseKey: setTplBase, sub: tplSub, setSub: setTplSub }}
              onChanged={async (id: string) => {
                await loadTemplates();
                return id;
              }}
            />
          ),
        },
      ]}
    />
  );
}
