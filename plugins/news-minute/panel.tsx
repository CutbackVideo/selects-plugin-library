// @name News in One Minute
// @icon newspaper
// Turns a news article into a one-minute vertical news short: script checked against the article, editor
// review, narration, a scene per sentence from article photos and data cards, captions, in an editable Draft.

// src/Panel.tsx
import { useEffect, useRef, useState } from "react";

// src/messages.ts
var MESSAGES = {
  title: ["News in one minute", "1\uBD84 \uB274\uC2A4 \uC1FC\uCE20"],
  preset: ["Style", "\uC2A4\uD0C0\uC77C"],
  url: ["Article link", "\uAE30\uC0AC \uB9C1\uD06C"],
  orText: ["or paste the article text", "\uB610\uB294 \uAE30\uC0AC \uBCF8\uBB38 \uBD99\uC5EC\uB123\uAE30"],
  write: ["Write script", "\uB300\uBCF8 \uC4F0\uAE30"],
  fetching: ["Reading the article\u2026", "\uAE30\uC0AC\uB97C \uC77D\uACE0 \uC788\uC5B4\uC694\u2026"],
  writing: ["Writing the script\u2026", "\uB300\uBCF8\uC744 \uC4F0\uACE0 \uC788\uC5B4\uC694\u2026"],
  checking: ["Checking it against the article\u2026", "\uC6D0\uBB38\uACFC \uB300\uC870\uD558\uACE0 \uC788\uC5B4\uC694\u2026"],
  repairing: ["Fixing problems the check found\u2026", "\uAC80\uC0AC\uC5D0\uC11C \uB098\uC628 \uBB38\uC81C\uB97C \uACE0\uCE58\uACE0 \uC788\uC5B4\uC694\u2026"],
  review: ["Review the script", "\uB300\uBCF8 \uAC80\uD1A0"],
  reviewHint: ["Each line shows the article passage it comes from. Edit freely; numbers must match the article.", "\uBB38\uC7A5\uB9C8\uB2E4 \uADFC\uAC70\uAC00 \uB41C \uAE30\uC0AC \uC6D0\uBB38\uC744 \uD568\uAED8 \uBCF4\uC5EC \uC918\uC694. \uC790\uC720\uB86D\uAC8C \uACE0\uCE58\uB418 \uC22B\uC790\uB294 \uAE30\uC0AC\uC640 \uAC19\uC544\uC57C \uD574\uC694."],
  headline1: ["Headline line 1", "\uD5E4\uB4DC\uB77C\uC778 1\uC904"],
  headline2: ["Headline line 2 (yellow box)", "\uD5E4\uB4DC\uB77C\uC778 2\uC904(\uB178\uB780 \uBC15\uC2A4)"],
  accent: ["Highlight in line 1 (optional)", "1\uC904 \uAC15\uC870 \uB2E8\uC5B4(\uC120\uD0DD)"],
  source: ["Article", "\uC6D0\uBB38"],
  noSource: ["No matching passage in the article", "\uAE30\uC0AC\uC5D0\uC11C \uADFC\uAC70 \uBB38\uC7A5\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC5B4\uC694"],
  issues: ["Flagged", "\uD655\uC778 \uD544\uC694"],
  rewritten: ["Rewritten by the check", "\uAC80\uC0AC\uC5D0\uC11C \uACE0\uCCD0 \uC4F4 \uBB38\uC7A5"],
  length: ["{chars} characters \xB7 about {sec} s", "{chars}\uC790 \xB7 \uC57D {sec}\uCD08"],
  tooLong: ["Over {max} characters: the short will run past a minute.", "{max}\uC790\uB97C \uB118\uC5B4\uC694. 1\uBD84\uC744 \uB118\uAE38 \uC218 \uC788\uC5B4\uC694."],
  approve: ["Approve script", "\uB300\uBCF8 \uC2B9\uC778"],
  approved: ["Approved", "\uC2B9\uC778\uB428"],
  edit: ["Edit again", "\uB2E4\uC2DC \uACE0\uCE58\uAE30"],
  voice: ["Voice", "\uBAA9\uC18C\uB9AC"],
  credits: ["{chars} characters \xB7 about {est} credits (up to {held} held while it is made). Unlimited plans are not charged.", "{chars}\uC790 \xB7 \uC57D {est} \uD06C\uB808\uB527(\uC0DD\uC131 \uC911 \uCD5C\uB300 {held} \uD06C\uB808\uB527 \uC608\uC57D). \uBB34\uC81C\uD55C \uC694\uAE08\uC81C\uB294 \uCC28\uAC10\uB418\uC9C0 \uC54A\uC544\uC694."],
  narrate: ["Make narration", "\uB098\uB808\uC774\uC158 \uB9CC\uB4E4\uAE30"],
  narrating: ["Making the narration\u2026", "\uB098\uB808\uC774\uC158\uC744 \uB9CC\uB4E4\uACE0 \uC788\uC5B4\uC694\u2026"],
  narrated: ["Narration ready \xB7 {sec} s", "\uB098\uB808\uC774\uC158 \uC644\uB8CC \xB7 {sec}\uCD08"],
  lost: ["The previous narration request's result could not be confirmed. It may still finish and may be charged. Start a new one only if you are sure.", "\uC774\uC804 \uC74C\uC131 \uC0DD\uC131 \uACB0\uACFC\uB97C \uD655\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694. \uC544\uC9C1 \uB05D\uB098\uC9C0 \uC54A\uC558\uAC70\uB098 \uD06C\uB808\uB527\uC774 \uC4F0\uC600\uC744 \uC218 \uC788\uC5B4\uC694. \uD655\uC2E4\uD560 \uB54C\uB9CC \uC0C8\uB85C \uB9CC\uB4DC\uC138\uC694."],
  newNarration: ["New narration (uses credits again)", "\uC0C8\uB85C \uC0DD\uC131(\uD06C\uB808\uB527 \uCD94\uAC00 \uC18C\uBAA8)"],
  noCredits: ["Not enough credits for the narration.", "\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD574\uC694."],
  narrationFailed: ["The narration failed: {error}", "\uB098\uB808\uC774\uC158\uC744 \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC5B4\uC694: {error}"],
  retry: ["Try again", "\uB2E4\uC2DC \uC2DC\uB3C4"],
  build: ["Build the Draft", "Draft \uB9CC\uB4E4\uAE30"],
  photos: ["Preparing article photos\u2026", "\uAE30\uC0AC \uC0AC\uC9C4\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694\u2026"],
  timing: ["Reading the narration timing\u2026", "\uB098\uB808\uC774\uC158 \uD0C0\uC774\uBC0D\uC744 \uC77D\uACE0 \uC788\uC5B4\uC694\u2026"],
  timingRatio: ["No word timing from the voice; scenes are spaced by sentence length.", "\uBAA9\uC18C\uB9AC \uD0C0\uC774\uBC0D \uC815\uBCF4\uAC00 \uC5C6\uC5B4 \uBB38\uC7A5 \uAE38\uC774\uB85C \uC7A5\uBA74\uC744 \uB098\uB234\uC5B4\uC694."],
  planning: ["Choosing a visual for each sentence\u2026", "\uBB38\uC7A5\uB9C8\uB2E4 \uD654\uBA74\uC744 \uACE0\uB974\uACE0 \uC788\uC5B4\uC694\u2026"],
  planFallback: ["The scene plan did not pass its check; photos and text cards were used instead.", "\uC7A5\uBA74 \uACC4\uD68D\uC774 \uAC80\uC0AC\uB97C \uD1B5\uACFC\uD558\uC9C0 \uBABB\uD574 \uC0AC\uC9C4\uACFC \uAE00\uC790 \uCE74\uB4DC\uB85C \uB300\uC2E0\uD588\uC5B4\uC694."],
  plate: ["Preparing the background\u2026", "\uBC30\uACBD\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC5B4\uC694\u2026"],
  assembling: ["Building the Draft\u2026", "Draft\uB97C \uB9CC\uB4E4\uACE0 \uC788\uC5B4\uC694\u2026"],
  done: ["Done. The Draft is open in the editor.", "\uC644\uB8CC\uD588\uC5B4\uC694. \uD3B8\uC9D1\uAE30\uC5D0\uC11C Draft\uB97C \uC5F4\uC5C8\uC5B4\uC694."],
  openDraft: ["Open Draft", "Draft \uC5F4\uAE30"],
  startOver: ["New article", "\uC0C8 \uAE30\uC0AC"],
  error: ["Something went wrong: {error}", "\uBB38\uC81C\uAC00 \uC0DD\uACBC\uC5B4\uC694: {error}"],
  needProject: ["Open or create a Project first.", "\uBA3C\uC800 \uD504\uB85C\uC81D\uD2B8\uB97C \uC5F4\uAC70\uB098 \uB9CC\uB4E4\uC5B4 \uC8FC\uC138\uC694."],
  tooShort: ["The article text is too short.", "\uAE30\uC0AC \uBCF8\uBB38\uC774 \uB108\uBB34 \uC9E7\uC544\uC694."],
  noAI: ["This Selects version cannot run AI from apps. Update Selects.", "\uC774 Selects \uBC84\uC804\uC5D0\uC11C\uB294 \uC571\uC5D0\uC11C AI\uB97C \uC4F8 \uC218 \uC5C6\uC5B4\uC694. Selects\uB97C \uC5C5\uB370\uC774\uD2B8\uD574 \uC8FC\uC138\uC694."],
  noStorage: ["Update Selects to use app storage.", "\uC571 \uC800\uC7A5\uC18C\uB97C \uC4F0\uB824\uBA74 Selects\uB97C \uC5C5\uB370\uC774\uD2B8\uD574 \uC8FC\uC138\uC694."],
  tooLongAudio: ["The narration is longer than {max} s. Shorten the script.", "\uB098\uB808\uC774\uC158\uC774 {max}\uCD08\uB97C \uB118\uC5B4\uC694. \uB300\uBCF8\uC744 \uC904\uC5EC \uC8FC\uC138\uC694."],
  stepDone: ["{step}: {sec} s, {repairs} repairs, {parse} unreadable replies", "{step}: {sec}\uCD08, \uACE0\uCE68 {repairs}\uD68C, \uC77D\uC9C0 \uBABB\uD55C \uC751\uB2F5 {parse}\uD68C"],
  aiCredits: ["Writing and checking the script runs AI turns billed to your Selects credits, like chat messages.", "\uB300\uBCF8 \uC4F0\uAE30\uC640 \uC6D0\uBB38 \uB300\uC870\uB294 \uCC44\uD305\uCC98\uB7FC Selects \uD06C\uB808\uB527\uC774 \uC4F0\uC774\uB294 AI \uD638\uCD9C\uC774\uC5D0\uC694."],
  buildCredits: ["Choosing the visuals runs one more AI turn (Selects credits).", "\uD654\uBA74 \uAD6C\uC131 \uACE0\uB974\uAE30\uC5D0 AI \uD638\uCD9C\uC774 \uD55C \uBC88 \uB354 \uB4E4\uC5B4\uAC00\uC694(Selects \uD06C\uB808\uB527)."],
  record: ["Run record: {path}", "\uC2E4\uD589 \uAE30\uB85D: {path}"]
};
function t(lang, key, vars = {}) {
  const pair = MESSAGES[key];
  const text = pair ? String(lang || "").toLowerCase().startsWith("ko") ? pair[1] : pair[0] : key;
  return text.replace(/\{(\w+)\}/g, (_, k) => k in vars ? String(vars[k]) : "{" + k + "}");
}

// src/preset.ts
var PRESETS = {
  chosun: {
    id: "chosun",
    label: "Chosun Ilbo \xB7 \uC624\uB298\uC758 1\uBD84",
    background: "#21302A",
    accentColor: "#D8B66A",
    logoMain: "\uC624\uB298\uC758",
    // "today's"
    logoAccent: "1\uBD84",
    // "1 minute"
    tagline: "1\uBD84\uC73C\uB85C \uC774\uD574\uD558\uB294 \uC774\uC288",
    // "the issue in one minute"
    disclaimer: "\u203B\uC704 \uC0AC\uC9C4\uC740 \uD574\uB2F9 \uBCF4\uB3C4\uC640 \uAD00\uB828 \uC5C6\uC2B5\uB2C8\uB2E4",
    // "this image is unrelated to the report"
    scriptLanguage: "Korean",
    ttsLanguage: "ko"
  },
  generic: {
    id: "generic",
    label: "Generic news",
    background: "#1E2430",
    accentColor: "#F2C14E",
    logoMain: "NEWS",
    logoAccent: "1 MIN",
    tagline: "",
    disclaimer: "Illustration, not a photo of the event",
    scriptLanguage: "Korean",
    ttsLanguage: "ko"
  }
};
var DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

// src/pipeline/article.ts
var asObj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
var len = (s) => [...String(s ?? "")].length;
function unescapeHtml(s) {
  return String(s ?? "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}
var stripTags = (s) => unescapeHtml(String(s ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function metaTag(s, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop.replace(/[.:]/g, "\\$&")}["'][^>]*>`, "i");
  const m = re.exec(s);
  if (!m) return "";
  const c = /content=["']([^"']*)["']/i.exec(m[0]);
  return c ? unescapeHtml(c[1]).trim() : "";
}
function creditOf(e) {
  const by = Array.isArray(asObj(e.credits).by) ? e.credits.by.map((b) => String(asObj(b).name || "").trim()).filter(Boolean) : [];
  if (by.length) return by.join(", ");
  const cap = stripTags(e.caption || "");
  const m = /\/\s*([^/]{1,30})$/.exec(cap);
  return m ? m[1].trim() : "";
}
function extractArticle(url, html) {
  const s = String(html ?? "");
  const t2 = /<title>(.*?)<\/title>/s.exec(s);
  const art = {
    url,
    title: metaTag(s, "og:title") || stripTags(t2 ? t2[1] : ""),
    source: metaTag(s, "og:site_name"),
    date: metaTag(s, "article:published_time"),
    body: "",
    method: "",
    photos: []
  };
  const photos = [];
  const m = /Fusion\.globalContent\s*=\s*(\{.*?\});\s*Fusion\./s.exec(s);
  if (m) {
    let d = null;
    try {
      d = JSON.parse(m[1]);
    } catch {
      d = null;
    }
    const els = d && Array.isArray(d.content_elements) ? d.content_elements : [];
    const paras = els.filter((e) => asObj(e).type === "text").map((e) => stripTags(e.content || "")).filter(Boolean);
    if (paras.length) {
      art.body = paras.join("\n");
      art.title = asObj(d.headlines).basic || art.title;
      art.date = d.display_date || d.first_publish_date || art.date;
      art.method = "arc";
    }
    const promo = asObj(asObj(d?.promo_items).basic);
    for (const e of [promo, ...els]) {
      if (asObj(e).type !== "image" || typeof e.url !== "string" || !/^https:\/\//.test(e.url)) continue;
      if (photos.some((p) => p.url === e.url)) continue;
      photos.push({ url: e.url, caption: stripTags(e.caption || ""), credit: creditOf(e), w: Number(e.width) || 0, h: Number(e.height) || 0 });
    }
  }
  if (!art.body) {
    for (const bm of s.matchAll(/<script[^>]+application\/ld\+json[^>]*>(.*?)<\/script>/gs)) {
      let d;
      try {
        d = JSON.parse(bm[1].trim());
      } catch {
        continue;
      }
      const items = Array.isArray(d) ? d : d && typeof d === "object" ? d["@graph"] !== void 0 ? d["@graph"] : [d] : [];
      for (const it of Array.isArray(items) ? items : []) {
        if (!(it && typeof it === "object" && String(it["@type"] || "").includes("Article"))) continue;
        if (it.articleBody && !art.body) {
          art.body = stripTags(it.articleBody);
          art.title = it.headline || art.title;
          art.method = "jsonld";
        }
      }
    }
  }
  if (!art.body) {
    const sc = /<article[^>]*>(.*?)<\/article>/s.exec(s);
    const paras = [...(sc ? sc[1] : s).matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map((x) => stripTags(x[1]));
    art.body = paras.filter((p) => len(p) > 40).join("\n");
    art.method = "paragraphs";
  }
  if (!photos.length) {
    const og = metaTag(s, "og:image");
    if (/^https:\/\//.test(og)) photos.push({ url: og, caption: "", credit: "", w: 0, h: 0 });
  }
  art.body = [...art.body].slice(0, 2e4).join("");
  art.photos = photos.slice(0, 8).map((p, i) => ({ ref: `photo-${i + 1}`, ...p }));
  return art;
}
function articleFromText(text) {
  const body = String(text ?? "").trim();
  const first = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] || "";
  return { url: "", title: [...first].slice(0, 120).join(""), source: "", date: "", body: [...body].slice(0, 2e4).join(""), method: "text", photos: [] };
}
function decodeHtml(bytes) {
  let head = "";
  for (let i = 0; i < Math.min(bytes.length, 4096); i++) head += String.fromCharCode(bytes[i]);
  const m = /charset\s*=\s*["']?\s*([\w-]+)/i.exec(head);
  const cs = m ? m[1].toLowerCase() : "utf-8";
  if (/^(euc-kr|ks_c_5601-1987|cp949|x-windows-949|ms949)$/.test(cs)) {
    try {
      return new TextDecoder("euc-kr").decode(bytes);
    } catch {
    }
  }
  return new TextDecoder().decode(bytes);
}

// src/pipeline/scripts.ts
var J = (v) => JSON.stringify(v);
var PLATE_FPS = "30000/1001";
var PLATE_MAX_SECONDS = 90;
var READ_CHUNK = 49152;
var envScript = () => ({
  summary: "Read the plug-in data folder",
  allowCommit: true,
  script: `const env = await selects.files.environment();
const sep = /^win/i.test(env.platform) ? "\\\\" : "/";
const dir = [env.homedir, ".selects", "plugin-data", "news-minute"].join(sep);
await selects.files.mkdir(dir, { recursive: true });
let projectId = null;
try { const s = await selects.editor.state(); projectId = s && s.projectId ? s.projectId : null; } catch (e) { projectId = null; }
return { platform: env.platform, sep, dir, projectId };`
});
var createProjectScript = () => ({
  summary: "Create a Project for the news short",
  allowCommit: true,
  script: `const p = await selects.createProject(); return { projectId: p.id };`
});
var downloadScript = (url, path) => ({
  summary: "Download the article page",
  allowCommit: true,
  script: `await selects.files.download(${J(url)}, ${J(path)});
const st = await selects.files.stat(${J(path)});
return { size: st ? st.size : 0 };`
});
var readChunksScript = (path, offset, count) => ({
  summary: "Read a downloaded file",
  script: `const out = [];
let offset = ${J(offset)};
for (let i = 0; i < ${J(count)}; i++) {
  const r = await selects.files.readRange({ path: ${J(path)}, offset, length: ${READ_CHUNK} });
  if (!r.bytesRead) break;
  out.push(r.base64);
  offset += r.bytesRead;
  if (r.bytesRead < ${READ_CHUNK}) break;
}
return { chunks: out, offset };`
});
var writeChunkScript = (path, offset, base64) => ({
  summary: "Save the run record",
  allowCommit: true,
  script: `const r = await selects.files.writeChunk({ path: ${J(path)}, offset: ${J(offset)}, base64: ${J(base64)} }); return r.bytesWritten;`
});
var removeScript = (path) => ({
  summary: "Remove a temporary file",
  allowCommit: true,
  script: `await selects.files.remove(${J(path)}, { force: true }); return true;`
});
var ffmpegScript = (summary, args) => ({
  summary,
  allowCommit: true,
  script: `const { jobId } = await selects.media.startFFmpeg({ args: ${J(args)} }); return { jobId };`
});
var mediaJobScript = (jobId, cursor) => ({
  summary: "Check a media job",
  script: `const s = await selects.media.job(${J(jobId)}).status({ cursor: ${J(cursor)} });
return { state: s.state, events: (s.events || []).map((e) => ({ cursor: e.cursor, text: String(e.text || "").slice(-400) })), truncated: !!s.truncated };`
});
var existsScript = (path) => ({
  summary: "Check a file",
  script: `const st = await selects.files.stat(${J(path)}); return { exists: !!st, size: st ? st.size : 0 };`
});
function plateArgs(seconds, color, out) {
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x${color.replace(/^#/, "")}:s=1080x1920:r=${PLATE_FPS}`,
    "-t",
    seconds.toFixed(2),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "stillimage",
    "-pix_fmt",
    "yuv420p",
    "-an",
    out
  ];
}
var plateSeconds = (narrationSeconds) => Math.ceil((narrationSeconds + 0.5) * 2) / 2 + 0.1;
function photoArgs(src, out) {
  return ["-y", "-i", src, "-frames:v", "1", "-vf", "scale='min(1600,iw)':-2", "-q:v", "4", out];
}
var importScript = (projectId, paths) => ({
  summary: "Add media to the Project",
  allowCommit: true,
  script: `const p = selects.project(${J(projectId)});
const r = await p.importFiles({ paths: ${J(paths)} });
return { ids: r.addedResourceIds };`
});
var voicesScript = () => ({
  summary: "List narration voices",
  script: `const r = await selects.narration.voices({ limit: 50 }); return r.items.map((v) => ({ voiceId: v.voiceId, name: v.name }));`
});
var generateScript = (projectId, name, text, voiceId, language) => ({
  summary: "Generate the narration",
  allowCommit: true,
  script: `const job = await selects.narration.generate({ projectId: ${J(projectId)}, name: ${J(name)}, text: ${J(text)}, voiceId: ${J(voiceId)}, language: ${J(language)} });
return { workflowId: job.workflowId };`
});
var narrationStatusScript = (workflowId) => ({
  summary: "Check the narration",
  script: `const j = selects.narration.job(${J(workflowId)});
const s = await j.status();
const r = await j.result();
return { status: { status: s.status, step: s.step, lastErrorMessage: s.lastErrorMessage, importErrorCode: s.importErrorCode || null, resourceId: s.resourceId || null }, result: r };`
});
var resumeImportScript = (workflowId) => ({
  summary: "Finish importing the narration",
  allowCommit: true,
  script: `await selects.narration.job(${J(workflowId)}).resumeImport(); return true;`
});
var alignmentScript = (projectId, resourceId) => ({
  summary: "Read the narration timing",
  script: `const h = selects.project(${J(projectId)}).resource(${J(resourceId)});
const chars = [];
let cursor;
for (let i = 0; i < 100; i++) {
  const a = await h.speechAlignment({ cursor, limit: 1000 });
  if (!a) return null;
  for (const c of a.characters) chars.push(c);
  if (!a.nextCursor) break;
  cursor = a.nextCursor;
}
return chars;`
});
var openDraftScript = (draftId) => ({
  summary: "Open the Draft",
  script: `return await selects.editor.openDraft(${J(draftId)});`
});

// src/pipeline/host.ts
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(sdk, call) {
  const r = await sdk.runScript({ summary: call.summary, script: call.script, allowCommit: !!call.allowCommit });
  if (r.isError) throw new Error(String(r.output || "script failed"));
  return r.result;
}
var AI_TIMEOUT_MS = 18e4;
async function ask(sdk, prompt) {
  if (typeof sdk.askAI !== "function") throw new Error("askAI unavailable");
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await sdk.askAI({ prompt, timeoutMs: AI_TIMEOUT_MS });
      return String(r?.text ?? "");
    } catch (err) {
      if (attempt === 0 && /did not finish|timed? ?out/i.test(String(err?.message || err))) continue;
      throw err;
    }
  }
}
async function load(sdk, key) {
  if (!sdk.storage) throw new Error("storage unavailable");
  const raw = await sdk.storage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}
async function save(sdk, key, value) {
  if (!sdk.storage) throw new Error("storage unavailable");
  await sdk.storage.setItem(key, JSON.stringify(value));
}
async function ffmpeg(sdk, summary, args) {
  const { jobId } = await run(sdk, ffmpegScript(summary, args));
  let cursor = 0, log = "";
  for (let i = 0; i < 480; i++) {
    const s = await run(sdk, mediaJobScript(jobId, cursor));
    for (const e of s.events) {
      cursor = Math.max(cursor, e.cursor);
      log = (log + e.text).slice(-800);
    }
    if (s.state === "succeeded") return;
    if (s.state === "failed" || s.state === "cancelled") throw new Error("ffmpeg " + s.state + ": " + log.slice(-300));
    await sleep(250);
  }
  throw new Error("ffmpeg timed out");
}
var CHUNK = 49152;
async function writeText(sdk, path, text) {
  const bytes = new TextEncoder().encode(text);
  for (let at = 0; at === 0 || at < bytes.length; at += CHUNK) {
    const part = bytes.subarray(at, at + CHUNK);
    let bin = "";
    for (let i = 0; i < part.length; i += 32768) bin += String.fromCharCode(...part.subarray(i, i + 32768));
    await run(sdk, writeChunkScript(path, at, btoa(bin)));
    if (!bytes.length) break;
  }
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function readFileBytes(sdk, path, maxBytes = 8 * 1024 * 1024) {
  const parts = [];
  let offset = 0, total = 0;
  for (; ; ) {
    const r = await run(sdk, readChunksScript(path, offset, 16));
    for (const c of r.chunks) {
      const b = b64ToBytes(c);
      parts.push(b);
      total += b.length;
    }
    if (total > maxBytes) throw new Error("file too large: " + path);
    if (r.offset === offset || r.chunks.length < 16) break;
    offset = r.offset;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
async function readFileBase64(sdk, path, maxBytes) {
  const bytes = await readFileBytes(sdk, path, maxBytes);
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
}

// src/pipeline/tts.ts
var ttsKey = (projectId) => `tts:${projectId}`;
function ttsRevision(text, voiceId) {
  let h1 = 2166136261, h2 = 16777619;
  const s = voiceId + "\0" + text;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
function ttsNext(rec, revision) {
  if (!rec) return { kind: "none" };
  if (rec.revision !== revision) {
    if (rec.state === "submitting" && !rec.workflowId) return { kind: "lost" };
    return { kind: "stale" };
  }
  if (rec.state === "imported" && rec.resourceId) return { kind: "ready", resourceId: rec.resourceId, durationSeconds: rec.durationSeconds ?? 0 };
  if (rec.state === "failed") return { kind: "failed", error: rec.error || "failed" };
  if (rec.workflowId) return { kind: "poll", workflowId: rec.workflowId };
  return { kind: "lost" };
}
function applyStatus(rec, status, result2) {
  if (result2 && result2.resourceId) return { ...rec, state: "imported", resourceId: result2.resourceId, durationSeconds: result2.durationSeconds, error: void 0, at: Date.now() };
  const s = String(status?.status ?? "");
  if (s === "failed" || s === "canceled") return { ...rec, state: "failed", error: String(status?.lastErrorMessage || s), at: Date.now() };
  return { ...rec, state: "submitted", at: Date.now() };
}
var canResumeImport = (status) => status?.step === "import_failed" || status?.lastErrorMessage === "narration_import_failed";
var CREDITS_PER_CHAR = 3.6864 / 256;
var HOLD_FACTOR = 1.1;
function creditQuote(chars) {
  const estimated = chars * CREDITS_PER_CHAR;
  return { estimated: Math.round(estimated * 100) / 100, held: Math.round(estimated * HOLD_FACTOR * 100) / 100 };
}

// src/prompts/text.ts
var TTS_CHARS_PER_SEC = 6.5;
var TARGET_CHARS = { min: 340, goal: [360, 380], max: 390 };
var SENTENCE_COUNT = { min: 8, max: 14 };
var FORMAL_END = /(\uB2C8\uB2E4|\uAE4C\uC694)[.?]$/;
var SOFT_END = /\uB294\uB370\uC694[.?]$/;
var HEADLINE_MAX_CHARS = 24;
var isFormalEnding = (s) => FORMAL_END.test(s.trim()) || SOFT_END.test(s.trim());
var isSoftEnding = (s) => SOFT_END.test(s.trim());
var headlineMax = HEADLINE_MAX_CHARS;
var normalizeWs = (s) => String(s ?? "").replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D\u201F]/g, '"').replace(/\s+/g, " ").trim();
var eojeolCount = (s) => normalizeWs(s).split(" ").filter(Boolean).length;
function rawNumberTokens(s) {
  const out = String(s ?? "").match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return out.map((t2) => t2.replace(/,/g, ""));
}
var UNIT_VALUE = { "\uCC9C": 1e3, "\uB9CC": 1e4, "\uC5B5": 1e8, "\uC870": 1e12 };
var NUM = "\\d[\\d,]*(?:\\.\\d+)?";
var UNIT = "[\uCC9C\uB9CC\uC5B5\uC870]";
var AMOUNT_RE = new RegExp(`${NUM}(?:${UNIT}(?:\\s?${NUM}(?:${UNIT})?)*)?`, "g");
function numberTokens(s) {
  const out = [];
  for (const m of String(s ?? "").match(AMOUNT_RE) ?? []) {
    let total = 0;
    for (const seg of m.matchAll(new RegExp(`(${NUM})(${UNIT})?`, "g"))) {
      const n = parseFloat(seg[1].replace(/,/g, ""));
      total += n * (seg[2] ? UNIT_VALUE[seg[2]] : 1);
    }
    out.push(String(Math.round(total * 1e6) / 1e6));
  }
  return out;
}
function estimateSeconds(sentences) {
  const chars = sentences.map((x) => x.trim()).join(" ").length;
  return chars / TTS_CHARS_PER_SEC;
}
var totalChars = (sentences) => sentences.map((x) => x.trim()).join(" ").length;
function isObj(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

// src/prompts/script.ts
var NIDA = "\uC2B5\uB2C8\uB2E4";
var NEUNDEYO = "\uB294\uB370\uC694";
var NEUN_GEOMNIDA = "\uB294 \uAC81\uB2C8\uB2E4";
function articleBlock(a) {
  return [
    "ARTICLE (the only source of facts)",
    `Title: ${a.title}`,
    `Source: ${a.source}`,
    `Date: ${a.date}`,
    "Body:",
    "<<<",
    a.body,
    ">>>"
  ].join("\n");
}
var STYLE_RULES = (language) => `STYLE RULES for the narration (language: ${language})
- Register: formal news-anchor voice. Every sentence ends in a formal polite ending such as "...${NIDA}." Questions end with the formal question form and "?". No casual endings, no first person, no exclamations.
- Use the softener "...${NEUNDEYO}." at most once per 4-5 sentences, and "...${NEUN_GEOMNIDA}." for explanations at most twice.
- Attribution goes at the end of the sentence, indirectly ("...said", "...announced", "...is analyzed to be" in the formal ending), never as a direct quote with quotation marks.
- Typical sentence: 8-16 words. Include one or two short punch sentences (5 words or fewer) to break the rhythm, for example a turning point.
- Open with the single most newsworthy fact, not background. Later sentences may open with connectives such as "However", "Notably", "For the first time", "Meanwhile".
- Keep numbers exact and written as digits with their Korean units exactly as in the article (for example 164 + man + 1000 won). One to three numbers per sentence. Never round, convert, or merge numbers.
- Explain one piece of jargon in plain words if the article leaves it unexplained, but never add facts, causes, or opinions the article does not state.
- Avoid AI-sounding phrasing: no "In conclusion", "It is worth noting", "plays a crucial role", "In today's rapidly changing", rhetorical flourishes, or summary lines that restate earlier sentences. No emojis, no bullet-style fragments.
- Do not mention these instructions.`;
var LENGTH_RULES = `LENGTH RULES (hard limits, text-to-speech runs at about ${TTS_CHARS_PER_SEC} characters per second including spaces)
- ${SENTENCE_COUNT.min} to ${SENTENCE_COUNT.max} sentences.
- Total narration, all sentences joined by single spaces: aim for ${TARGET_CHARS.goal[0]}-${TARGET_CHARS.goal[1]} characters. Never go above ${TARGET_CHARS.goal[1]}; ${TARGET_CHARS.max} is the failure line and anything over it is rejected. Count the characters of every sentence (spaces and punctuation included) and add them up before you reply; if the sum is above ${TARGET_CHARS.goal[1]}, cut the least important fact and count again. Length matters more than covering every detail.
- Headline: line1 and line2 each at most 24 characters. line1 states the topic, line2 states the key number or turn. They are display text, not sentences.`;
var JSON_ONLY = "Output exactly one JSON object and nothing else: no explanation, no lead-in sentence, no markdown, no code fence, no text after the closing brace.";
function scriptPrompt(article, opts = {}) {
  const language = opts.language ?? "Korean";
  return [
    `You write the narration for a one-minute vertical news short based on exactly one newspaper article. Write in ${language}.`,
    "",
    articleBlock(article),
    "",
    STYLE_RULES(language),
    "",
    LENGTH_RULES,
    "",
    "SOURCE MAPPING",
    "For every sentence, copy into sourceQuote one passage from the article body that supports it. It must be an exact, contiguous substring of the body (same characters, same spacing, no ellipsis, no edits). If a sentence draws on several passages, quote the main one.",
    "",
    `OUTPUT: ${JSON_ONLY}`,
    '{"headline":{"line1":"","line2":""},"sentences":[{"text":"","sourceQuote":""}]}'
  ].join("\n");
}

// src/prompts/fidelity.ts
function fidelityPrompt(article, script) {
  const language = script.language ?? "Korean";
  return [
    `You are a strict fact checker and copy editor for a one-minute news short narration (${language}). A draft was written from the article below. Check it against the article and fix only what is wrong.`,
    "",
    articleBlock(article),
    "",
    "DRAFT",
    JSON.stringify({ headline: script.headline, sentences: script.sentences }, null, 1),
    "",
    "CHECK EVERY SENTENCE AND THE HEADLINE for these issue kinds:",
    '- "meaning": the draft says something different from, stronger than, or weaker than the article (changed cause, subject, direction, certainty, or attribution).',
    '- "number": a number, date, unit, rank, ratio or name differs from the article, or was rounded, converted, or invented.',
    '- "unsupported": a claim, cause, comparison or opinion that the article does not state.',
    '- "ai_tone": stock AI phrasing, filler, flourish, or a line that only restates an earlier one.',
    '- "register": not the formal news-anchor voice, or sentence too long or hard to say aloud.',
    "",
    "REWRITE RULES",
    "- If a sentence has no issue, return it unchanged with rewritten=false and issues=[].",
    "- If it has an issue, rewrite that sentence minimally so it matches the article exactly, set rewritten=true, and list each issue with a short note in English (what was wrong and what you changed). Never paraphrase the meaning away to make a sentence smoother.",
    "- A rewrite must not make the total longer: if the draft total is already above 380 characters, shorten while fixing. The final total must stay within the length rules below.",
    "- Keep the same ids in the same order. Do not add, drop, merge, or reorder sentences.",
    "- Set sourceQuote for each sentence to an exact contiguous substring of the article body that supports the final text.",
    "- The headline obeys the same checks; list its issues in headline.issues and fix it in place.",
    "",
    STYLE_RULES(language),
    "",
    LENGTH_RULES,
    "",
    `OUTPUT: ${JSON_ONLY}`,
    '{"headline":{"line1":"","line2":"","issues":[{"kind":"meaning|number|unsupported|ai_tone|register","note":""}]},"sentences":[{"id":"","text":"","sourceQuote":"","issues":[{"kind":"","note":""}],"rewritten":false}]}'
  ].join("\n");
}

// src/prompts/planner.ts
var CATALOG = `SCENE TYPES (pick one per scene; v1 subset)
1. news_photo  - a real article photo (assetRef required). params: {} plus optional "focus": "center|top|bottom|left|right". Ken Burns move is automatic. 4-8 s.
2. text_card   - key phrase on a plain card; the fallback when no photo or number fits. params: {"text": short key phrase (max ~20 chars per line, \\n allowed), "sub": optional smaller line}. No assetRef.
3. number_callout - a before-to-after value (rate, price). params: {"label": "", "from": number or text copied from the article, "to": number or text copied from the article, "unit": optional}. Optional assetRef (photo) as dimmed background. Set hideCaption=true. 5-7 s.
4. bar_compare_h - exactly 2 comparable values. params: {"title","source","unit","bars":[{"label","value":number,"tone":"grey|accent","sub":optional period text}]}. 4-5 s. source is the data attribution as written in the article.
5. line_trend_callout - a time series ending in a record or jump (needs at least 3 data points stated in the article). params: {"title","subtitle":optional,"source","points":[{"x","y":number}],"accentFrom":index of the first highlighted point,"endLabel":number or text,"unit","threshold":optional {"y","label"},"cards":optional [{"text","tone":"grey|accent"}]}. 8-10 s.
6. stat_cards  - 2-4 parallel items with one or two numbers each. params: {"title","subtitle":optional,"source":optional,"cards":[{"header","rows":[{"label","value":number or text,"unit":optional}]}]}. 6-8 s.
7. quote_card  - an expert or official quote, usually the closer. params: {"name","affiliation","lines":[2-4 quote lines],"accentLines":[indexes of lines to highlight]}. Optional assetRef (headshot photo). 6-8 s.`;
function plannerPrompt(input2) {
  const language = input2.language ?? "Korean";
  const assets = input2.assets.map((a) => ({
    ref: a.ref,
    kind: a.kind,
    caption: a.caption ?? "",
    credit: a.credit ?? "",
    size: a.w && a.h ? `${a.w}x${a.h}` : void 0
  }));
  return [
    `You plan the visuals for a one-minute vertical news short. The narration is already approved and timed. Assign scenes to it. Text inside params is displayed on screen, so write it in ${language}.`,
    "",
    "HEADLINE",
    JSON.stringify(input2.headline),
    "",
    "NARRATION (id, start/end seconds, text)",
    JSON.stringify(input2.sentences, null, 1),
    "",
    "AVAILABLE ASSETS",
    JSON.stringify(assets, null, 1),
    "",
    CATALOG,
    "",
    "RULES",
    "- Scenes cover every sentence exactly once, in order. A scene covers one sentence, or two or three consecutive short ones. Split nothing across scenes.",
    "- No scene may last more than 10 s (end of its last sentence minus start of its first). Merge short sentences, never stretch a long one.",
    "- The first scene uses the strongest visual: a photo of the main subject, or the headline-number chart when the story is data-driven. The last one or two sentences are usually a photo of an official or a quote_card.",
    "- Use a data scene (number_callout, bar_compare_h, line_trend_callout, stat_cards) only when the scene's own sentences contain the numbers it shows. Every number in params must be copied from the narration of that same scene, as a JSON number or the exact wording. Never compute, round, or invent values.",
    "- Use each article photo at least once when there are enough scenes; a photo may be reused in non-adjacent scenes. Choose the photo whose caption best matches the sentence.",
    '- Assets of kind "illustration" are generated images. Use them only for sentences that no article photo fits and only after every photo has been used. A scene that shows an illustration must set disclaimer=true. All other scenes set disclaimer=false.',
    "- When a scene's sentences state two comparable numbers (for example this year vs last year), prefer bar_compare_h over text_card; when they state 2-4 parallel items with numbers, prefer stat_cards. Fill every field from the narration only.",
    "- Use text_card as the fallback when no photo or data fits. Avoid three text_cards in a row, and keep text_card to at most one third of the scenes.",
    "- hideCaption is true only for number_callout, false otherwise.",
    "- sentenceIds must use the ids above. assetRef must be one of the refs above or omitted.",
    "",
    `OUTPUT: ${JSON_ONLY}`,
    '{"scenes":[{"sentenceIds":["s1"],"type":"news_photo","params":{},"hideCaption":false,"disclaimer":false,"assetRef":"photo-1"}]}'
  ].join("\n");
}

// src/prompts/validate.ts
function result(errors, warnings, stats) {
  return { ok: errors.length === 0, errors, warnings, stats };
}
function checkRows(rows, headline, article, errors, warnings) {
  const body = normalizeWs(article.body);
  const bodyNums = new Set(numberTokens(article.body));
  for (const k of ["line1", "line2"]) {
    const v = headline?.[k];
    if (typeof v !== "string" || !v.trim()) errors.push(`headline.${k} is missing`);
    else if (v.trim().length > headlineMax) errors.push(`headline.${k} is ${v.trim().length} chars; keep it within ${headlineMax}`);
  }
  if (rows.length < SENTENCE_COUNT.min || rows.length > SENTENCE_COUNT.max) {
    errors.push(`need ${SENTENCE_COUNT.min}-${SENTENCE_COUNT.max} sentences, got ${rows.length}`);
  }
  let softCount = 0;
  let formalCount = 0;
  for (const r of rows) {
    const t2 = String(r.text ?? "").trim();
    if (!t2) {
      errors.push(`${r.label}: empty text`);
      continue;
    }
    if (isFormalEnding(t2)) formalCount++;
    else errors.push(`${r.label}: must end with a formal polite ending (...ni-da or a ...l-kka-yo question) and a period or question mark`);
    if (isSoftEnding(t2)) softCount++;
    const ej = eojeolCount(t2);
    if (ej > 22) errors.push(`${r.label}: ${ej} words is too long for one spoken sentence (max 22); split it`);
    else if (ej < 3) warnings.push(`${r.label}: only ${ej} words`);
    const q = normalizeWs(r.sourceQuote);
    if (!q) errors.push(`${r.label}: sourceQuote is empty`);
    else if (!body.includes(q)) errors.push(`${r.label}: sourceQuote is not an exact substring of the article body; copy the source text verbatim`);
    for (const n of numberTokens(t2)) {
      if (!bodyNums.has(n)) errors.push(`${r.label}: number "${n}" does not appear in the article`);
    }
  }
  if (rows.length >= 5 && softCount > Math.ceil(rows.length / 4)) {
    warnings.push(`${softCount} sentences use the softener ending; keep it to about one in four or five`);
  }
  return { softCount, formalCount };
}
function checkLength(texts, errors) {
  const chars = totalChars(texts);
  if (chars > TARGET_CHARS.max) {
    errors.push(`narration is ${chars} chars (spaces included); the hard cap is ${TARGET_CHARS.max} (about 60 s). Shorten by at least ${chars - TARGET_CHARS.goal[1]} chars`);
  } else if (chars < TARGET_CHARS.min) {
    errors.push(`narration is only ${chars} chars; aim for ${TARGET_CHARS.goal[0]}-${TARGET_CHARS.goal[1]} (about 55-58 s)`);
  }
  return chars;
}
function validateScript(json, article) {
  const errors = [];
  const warnings = [];
  if (!isObj(json) || !isObj(json.headline) || !Array.isArray(json.sentences)) {
    return result(["reply must be an object with headline {line1,line2} and sentences[]"], [], {});
  }
  const s = json.sentences;
  if (s.some((x) => !isObj(x))) return result(["every sentence must be an object {text, sourceQuote}"], [], {});
  const rows = s.map((x, i) => ({ label: `sentence ${i + 1}`, text: x.text, sourceQuote: x.sourceQuote }));
  const { softCount } = checkRows(rows, json.headline, article, errors, warnings);
  const texts = s.map((x) => String(x.text ?? ""));
  const chars = checkLength(texts, errors);
  return result(errors, warnings, {
    sentences: s.length,
    chars,
    estSeconds: Number(estimateSeconds(texts).toFixed(1)),
    softEndings: softCount
  });
}
var ISSUE_KINDS = /* @__PURE__ */ new Set(["meaning", "number", "unsupported", "ai_tone", "register"]);
function validateFidelity(json, article, prev) {
  const errors = [];
  const warnings = [];
  if (!isObj(json) || !isObj(json.headline) || !Array.isArray(json.sentences)) {
    return result(["reply must be an object with headline {line1,line2,issues} and sentences[]"], [], {});
  }
  const out = json.sentences;
  if (out.some((x) => !isObj(x))) return result(["every sentence must be an object"], [], {});
  if (out.length !== prev.sentences.length) {
    errors.push(`sentence count changed from ${prev.sentences.length} to ${out.length}; keep every id, do not merge or drop sentences`);
  }
  let rewritten = 0;
  out.forEach((x, i) => {
    const p = prev.sentences[i];
    const label = `sentence ${p?.id ?? i + 1}`;
    if (p && x.id !== p.id) errors.push(`${label}: id must stay "${p.id}" in the same order, got "${x.id}"`);
    if (!Array.isArray(x.issues)) errors.push(`${label}: issues must be an array`);
    else {
      for (const is of x.issues) {
        if (!isObj(is) || !ISSUE_KINDS.has(is.kind)) errors.push(`${label}: issue kind must be one of ${[...ISSUE_KINDS].join("|")}`);
      }
    }
    if (typeof x.rewritten !== "boolean") errors.push(`${label}: rewritten must be true or false`);
    else if (x.rewritten) {
      rewritten++;
      if (!x.issues?.length) errors.push(`${label}: rewritten=true needs at least one issue explaining why`);
      if (p && x.text === p.text) errors.push(`${label}: rewritten=true but the text is unchanged`);
    } else if (p && x.text !== p.text) {
      errors.push(`${label}: rewritten=false but the text differs from the input; set rewritten=true and list the issue`);
    }
  });
  const rows = out.map((x, i) => ({ label: `sentence ${x.id ?? i + 1}`, text: x.text, sourceQuote: x.sourceQuote }));
  const { softCount } = checkRows(rows, json.headline, article, errors, warnings);
  const texts = out.map((x) => String(x.text ?? ""));
  const chars = checkLength(texts, errors);
  return result(errors, warnings, {
    sentences: out.length,
    rewritten,
    chars,
    estSeconds: Number(estimateSeconds(texts).toFixed(1)),
    softEndings: softCount
  });
}
var SCENE_TYPES = [
  "news_photo",
  "text_card",
  "number_callout",
  "bar_compare_h",
  "line_trend_callout",
  "stat_cards",
  "quote_card"
];
var TONES = /* @__PURE__ */ new Set(["grey", "accent"]);
var FOCUS = /* @__PURE__ */ new Set(["center", "top", "bottom", "left", "right"]);
var isStr = (x) => typeof x === "string" && x.trim().length > 0;
var isNum = (x) => typeof x === "number" && Number.isFinite(x);
var isNumOrStr = (x) => isNum(x) || isStr(x);
function traceNumbers(value, sceneNums, where, errors) {
  const text = isNum(value) ? String(value) : isStr(value) ? value : "";
  const toks = [.../* @__PURE__ */ new Set([...numberTokens(text), ...rawNumberTokens(text)])];
  for (const t2 of toks) {
    if (!sceneNums.has(t2)) errors.push(`${where}: number "${t2}" is not in this scene's narration; use only numbers from the article`);
  }
}
function checkParams(type, p, sceneNums, where, errors) {
  if (!isObj(p)) {
    errors.push(`${where}: params must be an object`);
    return;
  }
  const need = (cond, msg) => {
    if (!cond) errors.push(`${where} (${type}): ${msg}`);
  };
  switch (type) {
    case "news_photo":
      if (p.focus !== void 0) need(FOCUS.has(p.focus), "focus must be center|top|bottom|left|right");
      break;
    case "text_card":
      need(isStr(p.text), "text is required");
      break;
    case "number_callout":
      need(isStr(p.label), "label is required");
      need(isNumOrStr(p.from) && isNumOrStr(p.to), "from and to are required (number or text copied from the article)");
      traceNumbers(p.from, sceneNums, `${where}.from`, errors);
      traceNumbers(p.to, sceneNums, `${where}.to`, errors);
      break;
    case "bar_compare_h":
      need(isStr(p.title) && isStr(p.source) && isStr(p.unit), "title, source and unit are required");
      need(Array.isArray(p.bars) && p.bars.length === 2, "exactly 2 bars are required");
      (p.bars ?? []).forEach((b, i) => {
        need(isObj(b) && isStr(b.label) && isNum(b.value) && TONES.has(b.tone), `bars[${i}] needs label, numeric value, tone grey|accent`);
        if (isObj(b)) traceNumbers(b.value, sceneNums, `${where}.bars[${i}]`, errors);
      });
      break;
    case "line_trend_callout":
      need(isStr(p.title) && isStr(p.source) && isStr(p.unit), "title, source and unit are required");
      need(Array.isArray(p.points) && p.points.length >= 3, "at least 3 points {x,y} are required");
      need(isNumOrStr(p.endLabel), "endLabel is required");
      need(isNum(p.accentFrom) && p.accentFrom >= 0 && p.accentFrom < (p.points?.length ?? 0), "accentFrom must be a valid point index");
      (p.points ?? []).forEach((pt, i) => need(isObj(pt) && isNum(pt.y) && (isNum(pt.x) || isStr(pt.x)), `points[${i}] needs x and numeric y`));
      traceNumbers(p.endLabel, sceneNums, `${where}.endLabel`, errors);
      break;
    case "stat_cards":
      need(isStr(p.title), "title is required");
      need(Array.isArray(p.cards) && p.cards.length >= 2 && p.cards.length <= 4, "2-4 cards are required");
      (p.cards ?? []).forEach((c, i) => {
        need(isObj(c) && isStr(c.header) && Array.isArray(c.rows) && c.rows.length > 0, `cards[${i}] needs header and rows[]`);
        (c?.rows ?? []).forEach((r, j) => {
          need(isObj(r) && isStr(r.label) && isNumOrStr(r.value), `cards[${i}].rows[${j}] needs label and value`);
          if (isObj(r)) traceNumbers(r.value, sceneNums, `${where}.cards[${i}].rows[${j}]`, errors);
        });
      });
      break;
    case "quote_card":
      need(isStr(p.name) && isStr(p.affiliation), "name and affiliation are required");
      need(Array.isArray(p.lines) && p.lines.length >= 2 && p.lines.length <= 4 && p.lines.every(isStr), "2-4 quote lines are required");
      need(Array.isArray(p.accentLines) && p.accentLines.every((i) => Number.isInteger(i) && i >= 0 && i < (p.lines?.length ?? 0)), "accentLines must be valid line indexes");
      break;
  }
}
function validatePlan(json, sentences, assets) {
  const errors = [];
  const warnings = [];
  if (!isObj(json) || !Array.isArray(json.scenes)) return result(["reply must be an object with scenes[]"], [], {});
  const byId = new Map(sentences.map((s) => [s.id, s]));
  const assetByRef = new Map(assets.map((a) => [a.ref, a]));
  const photoRefs = assets.filter((a) => a.kind === "photo").map((a) => a.ref);
  const usedPhotos = /* @__PURE__ */ new Set();
  const seen = [];
  let maxSceneSec = 0;
  json.scenes.forEach((sc, i) => {
    const where = `scene ${i + 1}`;
    if (!isObj(sc)) {
      errors.push(`${where}: must be an object`);
      return;
    }
    const ids = Array.isArray(sc.sentenceIds) ? sc.sentenceIds : [];
    if (!ids.length) errors.push(`${where}: sentenceIds is required`);
    for (const id of ids) {
      if (!byId.has(id)) errors.push(`${where}: unknown sentence id "${id}"`);
      seen.push(id);
    }
    if (!SCENE_TYPES.includes(sc.type)) {
      errors.push(`${where}: type must be one of ${SCENE_TYPES.join("|")}`);
      return;
    }
    const sceneSentences = ids.map((id) => byId.get(id)).filter(Boolean);
    if (sceneSentences.length) {
      const dur = Math.max(...sceneSentences.map((s) => s.endSec)) - Math.min(...sceneSentences.map((s) => s.startSec));
      maxSceneSec = Math.max(maxSceneSec, dur);
      if (dur > 10.5) errors.push(`${where}: lasts ${dur.toFixed(1)} s; split it so no scene runs past 10 s`);
    }
    const sceneText = sceneSentences.map((s) => s.text).join(" ");
    const sceneNums = /* @__PURE__ */ new Set([...numberTokens(sceneText), ...rawNumberTokens(sceneText)]);
    checkParams(sc.type, sc.params ?? {}, sceneNums, where, errors);
    if (typeof sc.hideCaption !== "boolean") errors.push(`${where}: hideCaption must be true or false`);
    else if (sc.hideCaption && sc.type !== "number_callout") errors.push(`${where}: hideCaption is only allowed on number_callout`);
    if (typeof sc.disclaimer !== "boolean") errors.push(`${where}: disclaimer must be true or false`);
    const asset = sc.assetRef ? assetByRef.get(sc.assetRef) : void 0;
    if (sc.assetRef && !asset) errors.push(`${where}: assetRef "${sc.assetRef}" is not in the asset list`);
    if (sc.type === "news_photo" && !asset) errors.push(`${where}: news_photo needs an assetRef`);
    if (sc.type !== "news_photo" && sc.type !== "number_callout" && sc.type !== "quote_card" && sc.assetRef) {
      errors.push(`${where}: ${sc.type} must not carry an assetRef`);
    }
    if (asset?.kind === "photo") usedPhotos.add(asset.ref);
    const usesIllustration = asset?.kind === "illustration";
    if (usesIllustration && sc.disclaimer !== true) errors.push(`${where}: a scene that shows an illustration must set disclaimer=true`);
    if (!usesIllustration && sc.disclaimer === true) errors.push(`${where}: disclaimer=true is only for illustration scenes`);
    if (usesIllustration) {
      const unused = photoRefs.filter((r) => !usedPhotos.has(r));
      if (unused.length) errors.push(`${where}: use the article photo(s) ${unused.join(", ")} before any illustration`);
    }
  });
  const expected = sentences.map((s) => s.id);
  if (seen.join(",") !== expected.join(",")) {
    errors.push(`scenes must cover every sentence exactly once, in order; expected [${expected.join(",")}] but got [${seen.join(",")}]`);
  }
  const first = json.scenes[0];
  const textCards = json.scenes.filter((sc) => sc?.type === "text_card").length;
  if (json.scenes.length >= 6 && textCards > json.scenes.length / 3) warnings.push(`${textCards} of ${json.scenes.length} scenes are text cards; use data scenes where the narration has numbers`);
  if (first && first.type === "text_card" && photoRefs.length) warnings.push("the opening scene should use the strongest visual, not a text card");
  if (photoRefs.length && usedPhotos.size < photoRefs.length) warnings.push(`unused article photos: ${photoRefs.filter((r) => !usedPhotos.has(r)).join(", ")}`);
  return result(errors, warnings, {
    scenes: json.scenes.length,
    maxSceneSec: Number(maxSceneSec.toFixed(1)),
    photosUsed: usedPhotos.size
  });
}

// src/prompts/json.ts
function balancedObject(s, from) {
  const start = s.indexOf("{", from);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return { text: s.slice(start, i + 1), end: i + 1 };
  }
  return null;
}
function tryParse(t2) {
  for (const x of [t2, t2.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      return JSON.parse(x);
    } catch {
    }
  }
  return void 0;
}
function parseJsonLoose(text) {
  const s = String(text ?? "").replace(/^\uFEFF/, "").trim();
  const sources = [s];
  for (const m of s.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) sources.push(m[1].trim());
  for (const src of sources) {
    const whole = tryParse(src);
    if (whole && typeof whole === "object") return whole;
    let pos = 0;
    for (; ; ) {
      const found = balancedObject(src, pos);
      if (!found) break;
      const v = tryParse(found.text);
      if (v && typeof v === "object") return v;
      pos = found.end;
    }
  }
  throw new Error("No parseable JSON object in model reply");
}

// src/prompts/repair.ts
function repairPrompt(basePrompt, previous, errors) {
  const lines = ["", "YOUR PREVIOUS REPLY:", JSON.stringify(previous), "", "IT FAILED VALIDATION. Fix every problem below and change nothing else:"];
  for (const e of errors) lines.push(`- ${e}`);
  const texts = Array.isArray(previous?.sentences) ? previous.sentences.map((s) => String(s?.text ?? "")) : null;
  if (texts && errors.some((e) => e.startsWith("narration is "))) {
    const [lo, hi] = TARGET_CHARS.goal;
    const now = totalChars(texts);
    lines.push(
      "",
      `LENGTH FIX: the narration is currently ${now} characters (spaces included). Make the total land between ${lo} and ${hi} characters: not below ${lo}, not above ${hi}.` + (now > hi ? ` Cut about ${now - Math.round((lo + hi) / 2)} characters by removing the least important fact or shortening wording; do not strip more than needed.` : ` Add about ${Math.round((lo + hi) / 2) - now} characters by restoring the next most important fact from the article.`) + " Add up the characters of all sentences before replying."
    );
  }
  lines.push("", `Reply with the full corrected JSON object. ${JSON_ONLY}`);
  return `${basePrompt}
${lines.join("\n")}`;
}

// src/pipeline/timing.ts
var joinScript = (sentences) => sentences.map((s) => s.trim()).join(" ");
function sentenceRanges(sentences) {
  const out = [];
  let at = 0;
  for (const s of sentences) {
    const len2 = [...s.trim()].length;
    out.push([at, at + len2]);
    at += len2 + 1;
  }
  return out;
}
function charIndex(text, chars) {
  const t2 = [...text];
  const a = chars.map((c) => c.character);
  if (a.join("") === text) return { map: t2.map((_, i) => i), source: "alignment" };
  const tPos = [], aPos = [];
  t2.forEach((c, i) => {
    if (!/\s/.test(c)) tPos.push(i);
  });
  a.forEach((c, i) => {
    if (!/\s/.test(c)) aPos.push(i);
  });
  if (tPos.length !== aPos.length || tPos.some((p, k) => t2[p] !== a[aPos[k]])) return null;
  const map = new Array(t2.length).fill(-1);
  tPos.forEach((p, k) => {
    map[p] = aPos[k];
  });
  for (let i = t2.length - 1, next = aPos[aPos.length - 1] ?? 0; i >= 0; i--) {
    if (map[i] < 0) map[i] = next;
    else next = map[i];
  }
  return { map, source: "normalized" };
}
function sentenceTimes(sentences, chars, totalSec) {
  const text = joinScript(sentences);
  const ranges = sentenceRanges(sentences);
  const idx = chars && chars.length ? charIndex(text, chars) : null;
  if (idx && chars) {
    const times = ranges.map(([a, b]) => ({ startSec: chars[idx.map[a]].startSeconds, endSec: chars[idx.map[b - 1]].endSeconds }));
    for (let i = 0; i < times.length; i++) times[i].endSec = i + 1 < times.length ? times[i + 1].startSec : Math.max(times[i].endSec, totalSec);
    if (times.length) times[0].startSec = 0;
    return { times, source: idx.source };
  }
  return { times: ratioTimes(sentences, totalSec), source: "ratio" };
}
function ratioTimes(sentences, totalSec) {
  const lens = sentences.map((s) => [...s.trim()].length + 1);
  const sum = lens.reduce((a, b) => a + b, 0) || 1;
  const out = [];
  let t2 = 0;
  for (const n of lens) {
    const d = totalSec * n / sum;
    out.push({ startSec: t2, endSec: t2 + d });
    t2 += d;
  }
  if (out.length) out[out.length - 1].endSec = totalSec;
  return out;
}
function captionChunks(sentence, maxChars = 14) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const out = [];
  let cur = [];
  const len2 = (ws) => [...ws.join(" ")].length;
  for (const w of words) {
    if (cur.length && (cur.length >= 4 || cur.length >= 2 && len2([...cur, w]) > maxChars)) {
      out.push(cur.join(" "));
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) {
    if (cur.length === 1 && out.length && len2([out[out.length - 1], cur[0]]) <= maxChars + 6) out[out.length - 1] += " " + cur[0];
    else out.push(cur.join(" "));
  }
  return out;
}
function captionTimes(sentences, times, chars) {
  const text = joinScript(sentences);
  const idx = chars && chars.length ? charIndex(text, chars) : null;
  const ranges = sentenceRanges(sentences);
  const out = [];
  sentences.forEach((s, si) => {
    const chunks = captionChunks(s);
    const span = times[si];
    let starts;
    if (idx && chars) {
      const trimmed = s.trim();
      let from = 0;
      starts = chunks.map((c) => {
        const at = trimmed.indexOf(c, from);
        from = at + c.length;
        const offset = [...trimmed.slice(0, Math.max(0, at))].length;
        return chars[idx.map[ranges[si][0] + offset]].startSeconds;
      });
      starts[0] = span.startSec;
    } else {
      const lens = chunks.map((c) => [...c].length + 1);
      const sum = lens.reduce((a, b) => a + b, 0) || 1;
      let t2 = span.startSec;
      starts = lens.map((n) => {
        const v = t2;
        t2 += (span.endSec - span.startSec) * n / sum;
        return v;
      });
    }
    chunks.forEach((c, k) => out.push({ text: c, startSec: starts[k], endSec: k + 1 < chunks.length ? starts[k + 1] : span.endSec, sentence: si }));
  });
  return out.filter((c) => c.endSec > c.startSec);
}
function sceneWindows(firstSentence, times, totalSec, lead = 0.05) {
  return firstSentence.map((si, k) => {
    const start = k === 0 ? 0 : Math.max(0, times[si].startSec - lead);
    const nextSi = firstSentence[k + 1];
    const end = nextSi === void 0 ? totalSec : Math.max(start + 0.1, times[nextSi].startSec - lead);
    return { startSec: start, endSec: end };
  });
}

// src/templates/schemas.ts
var FONT = { key: "fontFamily", label: "Font", type: "text", defaultValue: "" };
var ACCENT = { key: "accentColor", label: "Accent", type: "color", defaultValue: "#E8502F" };
var TITLE = { key: "title", label: "Title", type: "text", defaultValue: "" };
var SOURCE = { key: "source", label: "Source", type: "text", defaultValue: "" };
var PARAM_SCHEMAS = {
  frame: [
    FONT,
    { key: "background", label: "Background", type: "color", defaultValue: "#21302A" },
    { key: "accentColor", label: "Logo accent", type: "color", defaultValue: "#D8B66A" },
    { key: "logoMain", label: "Logo text", type: "text", defaultValue: "" },
    { key: "logoAccent", label: "Logo accent text", type: "text", defaultValue: "" },
    { key: "tagline", label: "Tagline", type: "text", defaultValue: "" }
  ],
  headline: [
    FONT,
    { key: "line1", label: "Line 1", type: "text", defaultValue: "" },
    { key: "line2", label: "Line 2", type: "text", defaultValue: "" },
    { key: "accent", label: "Line 1 accent words", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 96, min: 40, max: 130, step: 1 },
    { key: "boxColor", label: "Box", type: "color", defaultValue: "#FFD700" },
    { key: "line1Color", label: "Line 1 colour", type: "color", defaultValue: "#FFFFFF" },
    { key: "line2Color", label: "Line 2 colour", type: "color", defaultValue: "#000000" }
  ],
  caption: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 54, min: 30, max: 80, step: 1 },
    { key: "textColor", label: "Text colour", type: "color", defaultValue: "#FFFFFF" }
  ],
  disclaimer: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 35, min: 20, max: 60, step: 1 }
  ],
  news_photo: [
    FONT,
    {
      key: "motion",
      label: "Motion",
      type: "select",
      defaultValue: "push_in",
      options: [
        { label: "Push in", value: "push_in" },
        { label: "Pull out", value: "pull_out" },
        { label: "Pan left", value: "pan_left" },
        { label: "Pan right", value: "pan_right" },
        { label: "Tilt up", value: "pan_up" },
        { label: "Tilt down", value: "pan_down" }
      ]
    },
    {
      key: "focus",
      label: "Focus",
      type: "select",
      defaultValue: "center",
      options: [
        { label: "Centre", value: "center" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" }
      ]
    },
    { key: "zoom", label: "Zoom", type: "number", defaultValue: 0.09, min: 0, max: 0.3, step: 0.01 },
    { key: "credit", label: "Credit", type: "text", defaultValue: "" }
  ],
  text_card: [
    FONT,
    { key: "text", label: "Text", type: "text", defaultValue: "" },
    { key: "sub", label: "Sub line", type: "text", defaultValue: "" },
    { key: "source", label: "Source", type: "text", defaultValue: "" },
    { key: "fontSize", label: "Size", type: "number", defaultValue: 84, min: 40, max: 120, step: 1 }
  ],
  number_callout: [
    FONT,
    { key: "label", label: "Label", type: "text", defaultValue: "" },
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    { key: "dim", label: "Photo dim", type: "number", defaultValue: 0.45, min: 0, max: 0.9, step: 0.05 },
    { key: "revealSec", label: "New value delay (s)", type: "number", defaultValue: 0.75, min: 0, max: 5, step: 0.05 },
    { key: "boxColor", label: "Box", type: "color", defaultValue: "#FFD700" }
  ],
  bar_compare_h: [FONT, TITLE, SOURCE, { key: "unit", label: "Unit", type: "text", defaultValue: "" }, ACCENT],
  line_trend_callout: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    { key: "unit", label: "Unit", type: "text", defaultValue: "" },
    ACCENT
  ],
  stat_cards: [
    FONT,
    TITLE,
    { key: "subtitle", label: "Subtitle", type: "text", defaultValue: "" },
    SOURCE,
    ACCENT,
    { key: "headerColor", label: "Card header", type: "color", defaultValue: "#D9705A" }
  ],
  quote_card: [
    FONT,
    { key: "name", label: "Name", type: "text", defaultValue: "" },
    { key: "affiliation", label: "Affiliation", type: "text", defaultValue: "" },
    ACCENT
  ]
};
var TIME_INDEPENDENT = {
  frame: true,
  headline: true,
  caption: true,
  disclaimer: true,
  news_photo: false,
  text_card: false,
  number_callout: false,
  bar_compare_h: false,
  line_trend_callout: false,
  stat_cards: false,
  quote_card: false
};
var LABELS = {
  frame: "News frame",
  headline: "Headline",
  caption: "Caption",
  disclaimer: "Disclaimer",
  news_photo: "Photo",
  text_card: "Text card",
  number_callout: "Number callout",
  bar_compare_h: "Bar comparison",
  line_trend_callout: "Trend line",
  stat_cards: "Stat cards",
  quote_card: "Quote"
};

// src/templates/generated.ts
var TEMPLATES = {
  "bar_compare_h": { tsxCode: "import React from 'react';\nimport { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';\n\nconst FALLBACK = \"'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif\";\n\n// Horizontal bar comparison on the white data window (2-3 bars). Each bar has a bold label, an\n// optional grey `sub` (period), grows from the left with a count-up value, and starts after the\n// previous one so the scene builds across `within`; the value fades in once the bar can hold it.\n// A dashed marker holds the first bar's end.\n// `bars: [{ label, sub?, value, tone: \"grey\" | \"accent\" }]`, values are numbers in `unit`.\nconst decimals = (v) => {\n  const s = String(v);\n  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;\n};\n// Korean graphics write 5000 but 12,500: group thousands only from five digits up.\nconst fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });\n\nexport default function BarCompareH({ data }) {\n  const frame = useCurrentFrame();\n  const { width, fps, durationInFrames } = useVideoConfig();\n  const k = width / 1080;\n  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';\n  const fontFamily = family === '' ? FALLBACK : '\"' + family + '\", ' + FALLBACK;\n  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;\n  const top = Number(data?.windowTop ?? 480);\n  const height = Number(data?.windowHeight ?? 920);\n  const accent = String(data?.accentColor ?? '#E8502F');\n  const bars = (Array.isArray(data?.bars) ? data.bars : []).slice(0, 3);\n  const unit = String(data?.unit ?? '');\n  const title = String(data?.title ?? '');\n  const source = String(data?.source ?? '');\n  const max = Math.max(1e-9, ...bars.map((b) => Math.abs(Number(b?.value) || 0)));\n  const step = bars.length > 1 ? Math.min(fps * 2, (dur * 0.45) / (bars.length - 1)) : 0;\n  const grow = Math.round(fps * 1.1);\n  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };\n  const trackL = 60, trackW = 960, barH = 148, rowH = 300;\n  const y0 = (title ? 230 : 70) + (bars.length < 3 ? 0 : -40);\n  const first = bars.length ? (Math.abs(Number(bars[0].value) || 0) / max) * 0.89 * trackW : 0;\n  const markerIn = interpolate(frame, [grow, grow + 6], [0, 1], ease);\n  return (\n    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>\n      {title ? <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{title}</div> : null}\n      {bars.map((b, i) => {\n        const v = Number(b?.value) || 0;\n        const start = Math.round(i * step);\n        const t = interpolate(frame, [start, start + grow], [0, 1], ease);\n        const appear = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], ease);\n        const hot = b?.tone === 'accent';\n        const w = (Math.abs(v) / max) * 0.89 * trackW * t;\n        const d = decimals(v);\n        const y = y0 + i * rowH;\n        return (\n          <div key={i} style={{ opacity: appear }}>\n            <div style={{ position: 'absolute', left: trackL * k, top: (y + (1 - appear) * 12) * k, display: 'flex', alignItems: 'baseline', gap: 22 * k, whiteSpace: 'nowrap' }}>\n              <div style={{ fontWeight: 900, fontSize: 56 * k, color: hot ? '#B83A22' : '#222222', letterSpacing: -1 * k }}>{String(b?.label ?? '')}</div>\n              {b?.sub ? <div style={{ fontWeight: 500, fontSize: 32 * k, color: '#8A8A8A' }}>{String(b.sub)}</div> : null}\n            </div>\n            <div style={{ position: 'absolute', left: trackL * k, top: (y + 100) * k, width: trackW * k, height: barH * k, borderRadius: 16 * k, background: '#F2F2F0' }} />\n            <div style={{ position: 'absolute', left: trackL * k, top: (y + 100) * k, width: w * k, height: barH * k, borderRadius: 16 * k, background: hot ? accent : '#AAB0AC', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>\n              <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 84 * k, letterSpacing: -1 * k, paddingRight: 26 * k, whiteSpace: 'nowrap', opacity: interpolate(w, [200, 300], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>\n                {fmt(v * t, d)}<span style={{ fontSize: 44 * k, marginLeft: 4 * k }}>{unit}</span>\n              </div>\n            </div>\n          </div>\n        );\n      })}\n      {bars.length > 1 ? (\n        <div style={{ position: 'absolute', left: (trackL + first) * k, top: (y0 + 60) * k, height: (rowH * (bars.length - 1) + barH + 80) * k, borderLeft: 3 * k + 'px dashed #555555', opacity: markerIn }} />\n      ) : null}\n      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}\n    </div>\n  );\n}\n", editableParameters: PARAM_SCHEMAS["bar_compare_h"] ?? [], timeIndependent: !!TIME_INDEPENDENT["bar_compare_h"], label: LABELS["bar_compare_h"] ?? "bar_compare_h" },
  "caption": { tsxCode: `import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// One caption chunk (2-4 words of the approved script), one line, centred at the bottom of the media
// window on a translucent black box that hugs the text. Chunks switch with a hard cut, so no animation.
export default function Caption({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  const em = [...text].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\\x21-\\x7e]/.test(c) ? 0.56 : 1), 0);
  const size = Math.min(Number(data?.fontSize ?? 54), 980 / Math.max(1, em));
  const bottom = Number(data?.bottom ?? 1385);
  const boxHeight = Number(data?.boxHeight ?? 70);
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom - boxHeight) * k, height: boxHeight * k, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ fontFamily, fontWeight: 600, fontSize: size * k, lineHeight: boxHeight * k + 'px', height: boxHeight * k, padding: '0 ' + 12 * k + 'px', background: String(data?.boxColor ?? 'rgba(0,0,0,0.44)'), color: String(data?.textColor ?? '#FFFFFF'), letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["caption"] ?? [], timeIndependent: !!TIME_INDEPENDENT["caption"], label: LABELS["caption"] ?? "caption" },
  "disclaimer": { tsxCode: `import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Per-scene notice under the logo block, placed only over scenes that show illustrative imagery.
// The sentence itself comes from the preset.
export default function Disclaimer({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const text = String(data?.text ?? '');
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.top ?? 1672) * k, height: 50 * k, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      <div style={{ fontFamily, fontWeight: 300, fontSize: Number(data?.fontSize ?? 35) * k, color: String(data?.color ?? '#FFFFFF'), whiteSpace: 'nowrap' }}>{text}</div>
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["disclaimer"] ?? [], timeIndependent: !!TIME_INDEPENDENT["disclaimer"], label: LABELS["disclaimer"] ?? "disclaimer" },
  "frame": { tsxCode: `import React from 'react';
import { Img, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const SERIF = "'Noto Serif KR','AppleMyungjo','Batang','Times New Roman',serif";

// Persistent frame: brand background above and below the 1080x920 media window (y 480-1400), plus the
// logo block under the window. The window itself stays transparent so the scene clips show through
// whatever the track order is. Brand text comes in as parameters (the preset supplies it).
export default function Frame({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const bg = String(data?.background ?? '#21302A');
  const top = Number(data?.windowTop ?? 480);
  const bottom = Number(data?.windowBottom ?? 1400);
  const gold = String(data?.accentColor ?? '#D8B66A');
  const logo = typeof data?.logo === 'string' ? data.logo : '';
  const logoMain = String(data?.logoMain ?? '');
  const logoAccent = String(data?.logoAccent ?? '');
  const tagline = String(data?.tagline ?? '');
  // \`backgroundImage\` (data URL of a clean full 1080x1920 frame, e.g. with the damask pattern) replaces the flat colour.
  const art = typeof data?.backgroundImage === 'string' ? data.backgroundImage : '';
  const band = { position: 'absolute', left: 0, width: '100%', background: art ? bg + ' url(' + art + ') no-repeat' : bg, backgroundSize: art ? width + 'px auto' : undefined };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ ...band, top: 0, height: top * k }} />
      <div style={{ ...band, top: bottom * k, bottom: 0, backgroundPosition: art ? '0 ' + -bottom * k + 'px' : undefined }} />
      {logo ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom + 20) * k, height: 240 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Img src={logo} style={{ maxHeight: 240 * k, maxWidth: 900 * k, objectFit: 'contain' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', left: 0, right: 0, top: (bottom + 12) * k, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 22 * k, height: 150 * k }}>
            {logoMain ? <div style={{ fontFamily, fontWeight: 900, fontStyle: 'italic', fontSize: 100 * k, color: '#FFFFFF', letterSpacing: -2 * k, textShadow: '0 ' + 4 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.45)' }}>{logoMain}</div> : null}
            {logoAccent ? <div style={{ fontFamily: SERIF, fontWeight: 900, fontStyle: 'italic', fontSize: 134 * k, color: gold, letterSpacing: -3 * k, textShadow: '0 ' + 4 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.45)' }}>{logoAccent}</div> : null}
          </div>
          {logoMain || logoAccent ? <div style={{ width: 486 * k, height: 3 * k, marginTop: 8 * k, background: gold }} /> : null}
          {tagline ? <div style={{ fontFamily, fontWeight: 300, fontSize: 52 * k, color: '#FFFFFF', marginTop: 16 * k, letterSpacing: -1 * k }}>{tagline}</div> : null}
        </div>
      )}
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["frame"] ?? [], timeIndependent: !!TIME_INDEPENDENT["frame"], label: LABELS["frame"] ?? "frame" },
  "headline": { tsxCode: `import React from 'react';
import { useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Fixed two-line headline above the media window, on screen for the whole video with no animation.
// Line 1: white text (an optional accent substring in the box colour). Line 2: black text on a box
// that hugs the text width. Both lines shrink to fit when they run long.
export default function Headline({ data }) {
  const { width } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const size = Number(data?.fontSize ?? 96);
  const boxColor = String(data?.boxColor ?? '#FFD700');
  const line1 = String(data?.line1 ?? '');
  const line2 = String(data?.line2 ?? '');
  const accent = String(data?.accent ?? '');
  // Hangul glyphs at this weight run close to 0.95em; digits and spaces are narrower.
  const em = (s) => [...s].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\\x21-\\x7e]/.test(c) ? 0.58 : 0.95), 0);
  const fit = (s, max) => Math.min(size, max / Math.max(1, em(s)));
  const size1 = fit(line1, 1010);
  const size2 = fit(line2, 1030);
  const at = accent && line1.includes(accent) ? line1.indexOf(accent) : -1;
  const text1 = at < 0 ? line1 : (
    <>
      {line1.slice(0, at)}
      <span style={{ color: boxColor }}>{accent}</span>
      {line1.slice(at + accent.length)}
    </>
  );
  const type = { fontFamily, fontWeight: 900, letterSpacing: -2 * k, whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {line1 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.line1Top ?? 228) * k, height: 110 * k, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ ...type, fontSize: size1 * k, lineHeight: 1, color: String(data?.line1Color ?? '#FFFFFF') }}>{text1}</div>
        </div>
      ) : null}
      {line2 ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: Number(data?.line2Top ?? 343) * k, height: 114 * k, display: 'flex', justifyContent: 'center' }}>
          <div style={{ ...type, fontSize: size2 * k, lineHeight: 114 * k + 'px', height: 114 * k, padding: '0 ' + 18 * k + 'px', maxWidth: 1050 * k, background: boxColor, color: String(data?.line2Color ?? '#000000') }}>{line2}</div>
        </div>
      ) : null}
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["headline"] ?? [], timeIndependent: !!TIME_INDEPENDENT["headline"], label: LABELS["headline"] ?? "headline" },
  "line_trend_callout": { tsxCode: `import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Time-series line on the white data window: grey history, accent segment from point \`accentFrom\`,
// light fill under the line, and a large accent callout above the last point that counts up once the
// line arrives. Optional dashed \`threshold\` and 1-2 delta \`cards\` below the chart (\`text\` may hold
// "small header\\nbold value"). \`points: [{ x, y }]\` with \`x\` as the axis label, \`y\` a number.
const decimals = (v) => {
  const s = String(v);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

export default function LineTrendCallout({ data }) {
  const frame = useCurrentFrame();
  // Unique per placement so two trend lines in one document never share a clip path.
  const clipId = 'ltc-' + String(React.useId ? React.useId() : 'reveal').replace(/[^A-Za-z0-9_-]/g, '');
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const accent = String(data?.accentColor ?? '#E8502F');
  const pts = (Array.isArray(data?.points) ? data.points : []).filter((p) => Number.isFinite(Number(p?.y)));
  const n = pts.length;
  const accentFrom = Math.max(0, Math.min(n - 1, Number(data?.accentFrom ?? n - 2)));
  const unit = String(data?.unit ?? '');
  const threshold = data?.threshold && Number.isFinite(Number(data.threshold.y)) ? data.threshold : null;
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 2);
  const ys = pts.map((p) => Number(p.y)).concat(threshold ? [Number(threshold.y)] : []);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const cx0 = 90, cx1 = 990, cy0 = 300, cy1 = cards.length ? 560 : 640;
  const X = (i) => cx0 + (n > 1 ? (i / (n - 1)) * (cx1 - cx0) : (cx1 - cx0) / 2);
  const Y = (v) => cy1 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (cy1 - cy0);
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) };
  const drawEnd = Math.max(Math.round(fps * 1.5), Math.min(Math.round(fps * 3), Math.round(dur * 0.4)));
  const draw = interpolate(frame, [Math.round(fps * 0.3), drawEnd], [0, 1], ease);
  const count = interpolate(frame, [drawEnd, drawEnd + Math.round(fps * 1.1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const headIn = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], { extrapolateRight: 'clamp' });
  const path = (a, b) => pts.slice(a, b + 1).map((p, j) => (j ? 'L' : 'M') + X(a + j).toFixed(1) + ' ' + Y(Number(p.y)).toFixed(1)).join(' ');
  const greyLen = n > 1 ? accentFrom / (n - 1) : 1;
  const greyDraw = greyLen > 0 ? Math.min(1, draw / greyLen) : 1;
  const hotDraw = greyLen < 1 ? Math.max(0, (draw - greyLen) / (1 - greyLen)) : 0;
  const last = n ? Number(pts[n - 1].y) : 0;
  const rawEnd = data?.endLabel;
  const endNum = typeof rawEnd === 'number' ? rawEnd : rawEnd == null || rawEnd === '' ? last : null;
  const endText = endNum != null ? fmt(endNum * count, decimals(endNum)) : String(rawEnd);
  const fill = n > 1 ? path(0, n - 1) + ' L' + X(n - 1) + ' ' + cy1 + ' L' + X(0) + ' ' + cy1 + ' Z' : '';
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ opacity: headIn }}>
        <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{String(data?.title ?? '')}</div>
        {data?.subtitle ? <div style={{ position: 'absolute', left: 65 * k, top: 124 * k, fontWeight: 500, fontSize: 28 * k, color: '#8A8A8A' }}>{String(data.subtitle)}</div> : null}
      </div>
      <svg width={1080 * k} height={height * k} viewBox={'0 0 1080 ' + height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <line x1={cx0} x2={cx1} y1={cy1} y2={cy1} stroke="#E4E4E2" strokeWidth="2" />
        <clipPath id={clipId}><rect x={cx0 - 10} y="0" width={(cx1 - cx0 + 20) * draw} height={height} /></clipPath>
        {fill ? <path d={fill} fill="#F0F0EE" clipPath={'url(#' + clipId + ')'} /> : null}
        {threshold ? (
          <g opacity={headIn}>
            <line x1={cx0} x2={cx1} y1={Y(Number(threshold.y))} y2={Y(Number(threshold.y))} stroke={accent} strokeWidth="3" strokeDasharray="10 8" />
            <text x={cx0} y={Y(Number(threshold.y)) - 12} fill={accent} fontSize="26" fontWeight="700" fontFamily={fontFamily}>{String(threshold.label ?? '')}</text>
          </g>
        ) : null}
        {accentFrom > 0 ? <path d={path(0, accentFrom)} fill="none" stroke="#555555" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - greyDraw} /> : null}
        {n > 1 && accentFrom < n - 1 ? <path d={path(accentFrom, n - 1)} fill="none" stroke={accent} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - hotDraw} /> : null}
        {n ? <circle cx={X(0)} cy={Y(Number(pts[0].y))} r="9" fill="#FFFFFF" stroke="#555555" strokeWidth="4" /> : null}
        {n > 1 && draw >= 1 ? <circle cx={X(n - 1)} cy={Y(last)} r="11" fill="#FFFFFF" stroke={accent} strokeWidth="5" /> : null}
        {pts.map((p, i) => (i % labelEvery === 0 || i === n - 1 ? (
          <text key={i} x={X(i)} y={cy1 + 44} textAnchor="middle" fill="#7A7A7A" fontSize="28" fontWeight="500" fontFamily={fontFamily}>{String(p.x ?? '')}</text>
        ) : null))}
      </svg>
      {n ? (
        <div style={{ position: 'absolute', right: (1080 - Math.min(cx1 + 30, X(n - 1) + 30)) * k, top: (Y(last) - 110) * k, opacity: count > 0 ? 1 : 0, color: accent, fontWeight: 900, fontSize: 76 * k, letterSpacing: -2 * k, whiteSpace: 'nowrap' }}>
          {endText}<span style={{ fontSize: 40 * k, marginLeft: 4 * k }}>{unit}</span>
        </div>
      ) : null}
      {cards.map((c, i) => {
        const start = drawEnd + Math.round(fps * (0.6 + 0.25 * i));
        const o = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const [a, b] = String(c?.text ?? '').split('\\n');
        const hot = c?.tone === 'accent';
        const w = cards.length > 1 ? 465 : 960;
        return (
          <div key={i} style={{ position: 'absolute', left: (60 + i * (w + 30)) * k, top: (650 + (1 - o) * 14) * k, width: w * k, height: 120 * k, borderRadius: 16 * k, background: hot ? '#FDEDE8' : '#F2F2F0', opacity: o, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: hot ? accent : '#222222' }}>
            {b !== undefined ? <div style={{ fontWeight: 500, fontSize: 26 * k }}>{a}</div> : null}
            <div style={{ fontWeight: 900, fontSize: 44 * k, whiteSpace: 'nowrap' }}>{b !== undefined ? b : a}</div>
          </div>
        );
      })}
      {data?.source ? <div style={{ position: 'absolute', right: 65 * k, top: 790 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{String(data.source)}</div> : null}
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["line_trend_callout"] ?? [], timeIndependent: !!TIME_INDEPENDENT["line_trend_callout"], label: LABELS["line_trend_callout"] ?? "line_trend_callout" },
  "news_photo": { tsxCode: "import React from 'react';\nimport { Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';\n\nconst FALLBACK = \"'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif\";\n\n// Article photo cover-filling the 1080x920 media window with a slow Ken Burns move over the scene:\n// push-in by `zoom` (default 9 %) plus a slight drift, or a pan. `image` is a data URL. Optional\n// source credit sits top-right inside the window.\nconst MOVES = {\n  push_in: { s: [0, 1], x: [0, -0.012], y: [0, -0.008] },\n  pull_out: { s: [1, 0], x: [0, 0], y: [0, 0] },\n  pan_left: { s: [0.6, 0.6], x: [0.03, -0.03], y: [0, 0] },\n  pan_right: { s: [0.6, 0.6], x: [-0.03, 0.03], y: [0, 0] },\n  pan_up: { s: [0.6, 0.6], x: [0, 0], y: [0.035, -0.035] },\n  pan_down: { s: [0.6, 0.6], x: [0, 0], y: [-0.035, 0.035] },\n};\nconst FOCUS = { center: '50% 50%', top: '50% 20%', bottom: '50% 80%', left: '25% 50%', right: '75% 50%' };\n\nexport default function NewsPhoto({ data }) {\n  const frame = useCurrentFrame();\n  const { width, fps, durationInFrames } = useVideoConfig();\n  const k = width / 1080;\n  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';\n  const fontFamily = family === '' ? FALLBACK : '\"' + family + '\", ' + FALLBACK;\n  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;\n  const t = interpolate(frame, [0, Math.max(1, dur - 1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.67, 1) });\n  const move = MOVES[String(data?.motion ?? 'push_in')] ?? MOVES.push_in;\n  const zoom = Number(data?.zoom ?? 0.09);\n  const scale = 1 + zoom * (move.s[0] + (move.s[1] - move.s[0]) * t);\n  const dx = (move.x[0] + (move.x[1] - move.x[0]) * t) * 1080;\n  const dy = (move.y[0] + (move.y[1] - move.y[0]) * t) * 920;\n  const top = Number(data?.windowTop ?? 480);\n  const height = Number(data?.windowHeight ?? 920);\n  const image = typeof data?.image === 'string' ? data.image : '';\n  const credit = String(data?.credit ?? '');\n  return (\n    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, overflow: 'hidden', background: '#000000', pointerEvents: 'none' }}>\n      {image ? (\n        <Img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: FOCUS[String(data?.focus ?? 'center')] ?? FOCUS.center, transform: 'translate(' + dx * k + 'px,' + dy * k + 'px) scale(' + scale + ')', transformOrigin: '50% 50%' }} />\n      ) : null}\n      {data?.dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,' + Number(data.dim) + ')' }} /> : null}\n      {credit ? (\n        <div style={{ position: 'absolute', right: 38 * k, top: 46 * k, fontFamily, fontWeight: 300, fontSize: 35 * k, color: '#FFFFFF', whiteSpace: 'nowrap', textShadow: '0 ' + 2 * k + 'px ' + 6 * k + 'px rgba(0,0,0,0.7)' }}>{credit}</div>\n      ) : null}\n    </div>\n  );\n}\n", editableParameters: PARAM_SCHEMAS["news_photo"] ?? [], timeIndependent: !!TIME_INDEPENDENT["news_photo"], label: LABELS["news_photo"] ?? "news_photo" },
  "number_callout": { tsxCode: `import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Before -> after value over a dimmed photo: small white label, large white old value and a down
// arrow, then the new value as black text on a yellow box (the headline line-2 look). Label and old
// value fade in first; arrow and new value follow \`revealSec\` later. \`from\`/\`to\` are numbers (shown
// with their own decimals plus \`unit\`) or already-formatted strings. The caption is hidden here.
const show = (v, unit) => {
  if (typeof v === 'number') {
    const s = String(v);
    const d = s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 }) + unit;
  }
  return String(v ?? '') + unit;
};

export default function NumberCallout({ data }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const image = typeof data?.image === 'string' ? data.image : '';
  const unit = String(data?.unit ?? '');
  const from = show(data?.from, unit);
  const to = show(data?.to, unit);
  const label = String(data?.label ?? '');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const late = Math.round(fps * Number(data?.revealSec ?? 0.75));
  const a = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], ease);
  const b = interpolate(frame, [late, late + Math.round(fps * 0.25)], [0, 1], ease);
  const fit = (s, size, max) => Math.min(size, max / Math.max(1, [...s].reduce((n, c) => n + (c === ' ' ? 0.3 : /[\\x21-\\x7e]/.test(c) ? 0.58 : 0.95), 0)));
  const zoom = 1 + 0.04 * interpolate(frame, [0, fps * 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, overflow: 'hidden', background: '#000000', pointerEvents: 'none' }}>
      {image ? <Img src={image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(' + zoom + ')' }} /> : null}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,' + Number(data?.dim ?? 0.45) + ')' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily, color: '#FFFFFF', textShadow: '0 ' + 3 * k + 'px ' + 10 * k + 'px rgba(0,0,0,0.5)' }}>
        <div style={{ opacity: a, transform: 'translateY(' + (1 - a) * 16 * k + 'px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {label ? <div style={{ fontWeight: 700, fontSize: fit(label, 92, 960) * k, letterSpacing: -2 * k, whiteSpace: 'nowrap' }}>{label}</div> : null}
          <div style={{ fontWeight: 800, fontSize: fit(from, 176, 1020) * k, letterSpacing: -3 * k, whiteSpace: 'nowrap', lineHeight: 1.15 }}>{from}</div>
        </div>
        <div style={{ opacity: b, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 * k }}>
          <svg width={84 * k} height={156 * k} viewBox="0 0 70 130" style={{ transform: 'translateY(' + (1 - b) * -20 * k + 'px)' }}>
            <rect x="29" y="0" width="12" height="88" fill="#FFFFFF" />
            <polygon points="0,80 70,80 35,130" fill="#FFFFFF" />
          </svg>
          <div style={{ marginTop: 34 * k, background: String(data?.boxColor ?? '#FFD700'), color: '#000000', textShadow: 'none', fontWeight: 900, fontSize: fit(to, 176, 990) * k, letterSpacing: -3 * k, lineHeight: 1.12, padding: '0 ' + 18 * k + 'px', whiteSpace: 'nowrap', transform: 'scale(' + (0.9 + 0.1 * b) + ')' }}>{to}</div>
        </div>
      </div>
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["number_callout"] ?? [], timeIndependent: !!TIME_INDEPENDENT["number_callout"], label: LABELS["number_callout"] ?? "number_callout" },
  "quote_card": { tsxCode: `import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Expert or official quote on the white data window: round headshot (optional data URL), name,
// affiliation and a divider pop in first, then the quote lines are revealed one by one across the
// scene. Lines listed in \`accentLines\` (indexes) are red with a yellow highlighter sweep.
export default function QuoteCard({ data }) {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const headshot = typeof data?.headshot === 'string' ? data.headshot : '';
  const lines = (Array.isArray(data?.lines) ? data.lines : []).map((l) => String(l)).slice(0, 5);
  const accentLines = new Set((Array.isArray(data?.accentLines) ? data.accentLines : []).map(Number));
  const accent = String(data?.accentColor ?? '#E8502F');
  const mark = String(data?.highlightColor ?? 'rgba(255,200,40,0.75)');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const head = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], ease);
  const first = Math.round(fps * 0.4);
  const step = lines.length > 1 ? Math.max(Math.round(fps * 0.3), Math.round((dur * 0.7 - first) / lines.length)) : 0;
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const size = Math.min(64, 950 / Math.max(10, longest));
  const x = headshot ? 230 : 65;
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ opacity: head, transform: 'scale(' + (0.94 + 0.06 * head) + ')', transformOrigin: '65px 120px' }}>
        {headshot ? (
          <div style={{ position: 'absolute', left: 60 * k, top: 50 * k, width: 150 * k, height: 150 * k, borderRadius: '50%', overflow: 'hidden', background: '#DDDDDD' }}>
            <Img src={headshot} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 25%' }} />
          </div>
        ) : null}
        <div style={{ position: 'absolute', left: x * k, top: 70 * k, fontWeight: 900, fontSize: 68 * k, color: '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>{String(data?.name ?? '')}</div>
        <div style={{ position: 'absolute', left: x * k, top: 156 * k, fontWeight: 500, fontSize: 34 * k, color: '#7A7A7A', whiteSpace: 'nowrap' }}>{String(data?.affiliation ?? '')}</div>
        <div style={{ position: 'absolute', left: 60 * k, right: 60 * k, top: 240 * k, height: 2 * k, background: '#E2E2E2' }} />
      </div>
      <div style={{ position: 'absolute', left: 65 * k, right: 65 * k, top: 290 * k }}>
        {lines.map((l, i) => {
          const start = first + i * step;
          const o = interpolate(frame, [start, start + Math.round(fps * 0.25)], [0, 1], ease);
          const sweep = interpolate(frame, [start + Math.round(fps * 0.2), start + Math.round(fps * 0.8)], [0, 100], ease);
          const hot = accentLines.has(i);
          return (
            <div key={i} style={{ opacity: o, transform: 'translateY(' + (1 - o) * 14 * k + 'px)', fontWeight: 800, fontSize: size * k, lineHeight: 1.45, color: hot ? accent : '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap' }}>
              <span style={hot ? { backgroundImage: 'linear-gradient(transparent 50%, ' + mark + ' 50%, ' + mark + ' 95%, transparent 95%)', backgroundRepeat: 'no-repeat', backgroundSize: sweep + '% 100%', padding: '0 ' + 4 * k + 'px' } : undefined}>{l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["quote_card"] ?? [], timeIndependent: !!TIME_INDEPENDENT["quote_card"], label: LABELS["quote_card"] ?? "quote_card" },
  "stat_cards": { tsxCode: `import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// 2-4 equal cards on the white data window, each with a coloured header and 1-2 rows of numbers.
// The first row's value is large and in the accent colour, the rest are smaller and dark. Cards rise
// in staggered and their numbers count up. \`cards: [{ header, rows: [{ label, value, unit? }] }]\`;
// a string value is shown as written (no count-up).
const decimals = (v) => {
  const s = String(v);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
// Korean graphics write 5000 but 12,500: group thousands only from five digits up.
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: Math.abs(v) >= 10000 });

export default function StatCards({ data }) {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const dur = Number(data?.durationSec) > 0 ? Math.round(Number(data.durationSec) * fps) : durationInFrames;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const accent = String(data?.accentColor ?? '#E8502F');
  const headerColor = String(data?.headerColor ?? '#D9705A');
  const cards = (Array.isArray(data?.cards) ? data.cards : []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const title = String(data?.title ?? '');
  const subtitle = String(data?.subtitle ?? '');
  const source = String(data?.source ?? '');
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const step = Math.min(Math.round(fps * 0.6), Math.round((dur * 0.4) / n));
  const gap = 24, left = 60, cardW = (960 - gap * (n - 1)) / n;
  const big = n >= 4 ? 56 : n === 3 ? 70 : 84;
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: '#FDFDFD', fontFamily, pointerEvents: 'none', overflow: 'hidden' }}>
      {title ? <div style={{ position: 'absolute', left: 65 * k, top: 60 * k, right: 65 * k, fontWeight: 800, fontSize: 46 * k, color: '#222222', letterSpacing: -1 * k }}>{title}</div> : null}
      {subtitle ? <div style={{ position: 'absolute', left: 65 * k, top: 124 * k, right: 65 * k, fontWeight: 500, fontSize: 30 * k, color: '#8A8A8A' }}>{subtitle}</div> : null}
      {cards.map((c, i) => {
        const start = i * step;
        const p = interpolate(frame, [start, start + Math.round(fps * 0.3)], [0, 1], ease);
        const count = interpolate(frame, [start, start + Math.round(fps * 1.1)], [0, 1], ease);
        const rows = Array.isArray(c?.rows) ? c.rows.slice(0, 2) : [];
        return (
          <div key={i} style={{ position: 'absolute', left: (left + i * (cardW + gap)) * k, top: (240 + (1 - p) * 30) * k, width: cardW * k, height: 470 * k, opacity: p, borderRadius: 18 * k, background: '#F4F3F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 96 * k, background: headerColor, color: '#FFFFFF', fontWeight: 800, fontSize: (n >= 4 ? 34 : 40) * k, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>{String(c?.header ?? '')}</div>
            {rows.map((r, j) => {
              const raw = r?.value;
              const num = typeof raw === 'number';
              const shown = num ? fmt(raw * count, decimals(raw)) : String(raw ?? '');
              return (
                <div key={j} style={{ marginTop: (j === 0 ? 40 : 34) * k, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, fontSize: 30 * k, color: '#7A7A7A', whiteSpace: 'nowrap' }}>{String(r?.label ?? '')}</div>
                  <div style={{ fontWeight: 900, fontSize: (j === 0 ? big : big * 0.62) * k, color: j === 0 ? accent : '#222222', letterSpacing: -1 * k, whiteSpace: 'nowrap', marginTop: 6 * k }}>
                    {shown}<span style={{ fontSize: (j === 0 ? big : big * 0.62) * 0.5 * k, marginLeft: 3 * k }}>{String(r?.unit ?? '')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["stat_cards"] ?? [], timeIndependent: !!TIME_INDEPENDENT["stat_cards"], label: LABELS["stat_cards"] ?? "stat_cards" },
  "text_card": { tsxCode: `import React from 'react';
import { interpolate, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

const FALLBACK = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";

// Fallback scene when no photo or number fits: the sentence's key phrase on a white media window
// (the data-card look), with a yellow highlighter sweeping under it and an optional grey sub line.
// Use '\\n' in \`text\` for a manual line break.
export default function TextCard({ data }) {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const k = width / 1080;
  const family = typeof data?.fontFamily === 'string' ? data.fontFamily.trim() : '';
  const fontFamily = family === '' ? FALLBACK : '"' + family + '", ' + FALLBACK;
  const top = Number(data?.windowTop ?? 480);
  const height = Number(data?.windowHeight ?? 920);
  const text = String(data?.text ?? '');
  const sub = String(data?.sub ?? '');
  const source = String(data?.source ?? '');
  const longest = Math.max(1, ...text.split('\\n').map((l) => l.length));
  const size = Math.min(Number(data?.fontSize ?? 84), 900 / Math.max(6, Math.min(longest, 12)));
  const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) };
  const rise = interpolate(frame, [0, Math.round(fps * 0.25)], [0, 1], ease);
  const sweep = interpolate(frame, [Math.round(fps * 0.3), Math.round(fps * 0.9)], [0, 100], ease);
  const subIn = interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 0.75)], [0, 1], ease);
  const mark = String(data?.highlightColor ?? 'rgba(255,215,0,0.8)');
  return (
    <div style={{ position: 'absolute', left: 0, top: top * k, width: 1080 * k, height: height * k, background: String(data?.background ?? '#FDFDFD'), pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 80 * k, right: 80 * k, top: 0, bottom: 120 * k, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: size * k, lineHeight: 1.3, letterSpacing: -2 * k, color: String(data?.textColor ?? '#222222'), whiteSpace: 'pre-line', opacity: rise, transform: 'translateY(' + (1 - rise) * 24 * k + 'px)' }}>
          <span style={{ backgroundImage: 'linear-gradient(transparent 60%, ' + mark + ' 60%, ' + mark + ' 92%, transparent 92%)', backgroundRepeat: 'no-repeat', backgroundSize: sweep + '% 100%', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', padding: '0 ' + 6 * k + 'px' }}>{text}</span>
        </div>
        {sub ? <div style={{ fontFamily, fontWeight: 500, fontSize: 40 * k, lineHeight: 1.35, color: '#6B6B6B', marginTop: 36 * k, opacity: subIn, whiteSpace: 'pre-line' }}>{sub}</div> : null}
      </div>
      {source ? <div style={{ position: 'absolute', right: 65 * k, top: 760 * k, fontFamily, fontWeight: 500, fontSize: 26 * k, color: '#8A8A8A' }}>{source}</div> : null}
    </div>
  );
}
`, editableParameters: PARAM_SCHEMAS["text_card"] ?? [], timeIndependent: !!TIME_INDEPENDENT["text_card"], label: LABELS["text_card"] ?? "text_card" }
};

// src/pipeline/plan.ts
function fallbackPlan(sentences, times, photoRefs) {
  const groups = [];
  for (let i = 0; i < sentences.length; i++) {
    const last = groups[groups.length - 1];
    const dur = (k) => times[k].endSec - times[k].startSec;
    if (last && last.length === 1 && dur(last[0]) + dur(i) < 6) last.push(i);
    else groups.push([i]);
  }
  let photo = 0;
  return groups.map((g, k) => {
    const usePhoto = photoRefs.length > 0 && (k % 2 === 0 || photo < photoRefs.length);
    if (usePhoto) {
      const ref = photoRefs[photo % photoRefs.length];
      photo++;
      return { sentenceIds: g.map((i) => sentences[i].id), type: "news_photo", params: { motion: k % 2 ? "pull_out" : "push_in" }, hideCaption: false, disclaimer: false, assetRef: ref };
    }
    const chunks = captionChunks(sentences[g[0]].text, 12);
    return { sentenceIds: g.map((i) => sentences[i].id), type: "text_card", params: { text: chunks.slice(0, 2).join("\n") }, hideCaption: false, disclaimer: false };
  });
}
function sceneClips(plan, sentences, times, totalSec, photos) {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const first = plan.map((sc) => Math.min(...sc.sentenceIds.map((id) => index.get(id) ?? Infinity)));
  if (first.some((i) => !Number.isFinite(i))) throw new Error("plan refers to an unknown sentence");
  const wins = sceneWindows(first, times, totalSec);
  const byRef = new Map(photos.map((p) => [p.ref, p]));
  const labels = TEMPLATES;
  return plan.map((sc, k) => {
    const params = { ...sc.params || {}, fontFamily: "" };
    const asset = sc.assetRef ? byRef.get(sc.assetRef) : void 0;
    if (asset) {
      if (sc.type === "quote_card") params.headshot = asset.dataUrl;
      else params.image = asset.dataUrl;
      if (sc.type === "news_photo" && asset.credit && !params.credit) params.credit = asset.credit;
    }
    const type = sc.type === "news_photo" && !asset ? "text_card" : sc.type;
    if (type === "text_card" && !params.text) params.text = captionChunks(sentences[first[k]].text, 12).slice(0, 2).join("\n");
    return { type, label: `${labels[type]?.label ?? type} ${String(k + 1).padStart(2, "0")}`, params, startSec: wins[k].startSec, endSec: wins[k].endSec, disclaimer: !!sc.disclaimer };
  });
}
function hiddenCaptionSentences(plan, sentences) {
  const index = new Map(sentences.map((s, i) => [s.id, i]));
  const out = /* @__PURE__ */ new Set();
  for (const sc of plan) if (sc.hideCaption) for (const id of sc.sentenceIds) {
    const i = index.get(id);
    if (i !== void 0) out.add(i);
  }
  return out;
}

// src/pipeline/assemble.ts
var J2 = (v) => JSON.stringify(v);
var SCENE_BATCH_BYTES = 15e5;
function tpl(type) {
  const t2 = TEMPLATES[type];
  if (!t2) throw new Error("unknown template " + type);
  return t2;
}
var PRELUDE = `const fps = 30000 / 1001;
const F = (s: number) => Math.round(s * fps);
const mainClips = await d.clips({ trackScope: "main" });
const total = mainClips.reduce((a: number, c: any) => Math.max(a, c.endFrame), 0);
const win = async (a: number, b: number) => {
  const s = Math.max(0, Math.min(total - 1, F(a))), e = Math.min(total, F(b));
  return e > s ? await d.rangeAtFrames(s, e) : null;
};
const mg = async (label: string, tsxCode: string, parameters: any, editableParameters: any, timeIndependent: boolean, a: number, b: number) => {
  const within = await win(a, b);
  if (within) await d.addMotionGraphic({ label, tsxCode, parameters, editableParameters, timeIndependent, within });
};`;
function baseDraftScript(x) {
  if (!(x.narrationSeconds > 0)) throw new Error("narration length unknown");
  if (x.plateSeconds < x.narrationSeconds) throw new Error("background plate shorter than the narration");
  const frame = tpl("frame");
  const end = Math.min(x.plateSeconds, x.narrationSeconds + 0.5);
  const frameParams = { background: x.preset.background, accentColor: x.preset.accentColor, logoMain: x.preset.logoMain, logoAccent: x.preset.logoAccent, tagline: x.preset.tagline, fontFamily: "" };
  return {
    summary: "Build the news short Draft",
    allowCommit: true,
    script: `const p = selects.project(${J2(x.projectId)});
const d = await p.createDraft({ name: ${J2(x.draftName)} });
await d.setSettings({ frameRate: "30000/1001", frameSize: { width: 1080, height: 1920 } });
await d.insertResource({ resourceId: ${J2(x.plateId)}, sourceRange: { startSeconds: 0, endSeconds: ${J2(end)} } });
${PRELUDE}
const narr = await win(0, ${J2(x.narrationSeconds)});
if (!narr) throw new Error("narration range is empty");
await d.overlayResource({ resource: p.resource(${J2(x.narrationId)}), over: narr });
await mg(${J2(frame.label)}, ${J2(frame.tsxCode)}, ${J2(frameParams)}, ${J2(frame.editableParameters)}, true, 0, total / fps);
const out: any = await d.commitAll("News short: frame and narration");
return { draftId: out.createdDraftId ?? null, frames: total };`
  };
}
function sceneScripts(draftId, scenes) {
  const batches = [];
  let cur = [], size = 0;
  for (const s of scenes) {
    const n = J2(s.params).length + tpl(s.type).tsxCode.length;
    if (cur.length && size + n > SCENE_BATCH_BYTES) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(s);
    size += n;
  }
  if (cur.length) batches.push(cur);
  return batches.map((batch, i) => {
    const types = [...new Set(batch.map((s) => s.type))];
    const codes = Object.fromEntries(types.map((t2) => [t2, { tsx: tpl(t2).tsxCode, edit: tpl(t2).editableParameters, ti: tpl(t2).timeIndependent }]));
    const rows = batch.map((s) => ({ type: s.type, label: s.label, params: s.params, a: s.startSec, b: s.endSec }));
    return {
      summary: `Add scene graphics (${i + 1}/${batches.length})`,
      allowCommit: true,
      script: `const d = selects.draft(${J2(draftId)});
${PRELUDE}
const T: any = ${J2(codes)};
for (const s of ${J2(rows)} as any[]) await mg(s.label, T[s.type].tsx, s.params, T[s.type].edit, T[s.type].ti, s.a, s.b);
await d.commitAll("News short: scenes");
return { added: ${batch.length} };`
    };
  });
}
function overlayTextScript(draftId, x) {
  const head = tpl("headline"), cap = tpl("caption"), dis = tpl("disclaimer");
  const caps = x.captions.map((c) => ({ text: c.text, a: c.startSec, b: c.endSec }));
  const disc = x.scenes.filter((s) => s.disclaimer).map((s) => ({ a: s.startSec, b: s.endSec }));
  return {
    summary: "Add headline and captions",
    allowCommit: true,
    script: `const d = selects.draft(${J2(draftId)});
${PRELUDE}
await mg(${J2(head.label)}, ${J2(head.tsxCode)}, ${J2({ line1: x.headline.line1, line2: x.headline.line2, accent: x.headline.accent || "", fontFamily: "" })}, ${J2(head.editableParameters)}, true, 0, total / fps);
const capCode = ${J2(cap.tsxCode)}, capEdit = ${J2(cap.editableParameters)};
let i = 0;
for (const c of ${J2(caps)}) { i += 1; await mg(${J2(cap.label)} + " " + String(i).padStart(2, "0"), capCode, { text: c.text, fontFamily: "" }, capEdit, true, c.a, c.b); }
for (const s of ${J2(disc)}) await mg(${J2(dis.label)}, ${J2(dis.tsxCode)}, { text: ${J2(x.preset.disclaimer)}, fontFamily: "" }, ${J2(dis.editableParameters)}, true, s.a, s.b);
await d.commitAll("News short: headline and captions");
return { captions: i };`
  };
}

// src/pipeline/flow.ts
var SESSION_KEY = "session";
var emptySession = (presetId = "chosun") => ({ presetId, voiceId: DEFAULT_VOICE, article: null, script: null, scriptErrors: [], approved: null, projectId: null, draftId: null });
var join = (env, ...parts) => [env.dir, ...parts].join(env.sep);
var promptArticle = (a) => ({ title: a.title, source: a.source, date: a.date, body: a.body });
var getEnv = (sdk) => run(sdk, envScript());
async function fetchArticle(sdk, env, url) {
  const path = join(env, "page-" + Date.now() + ".html");
  await run(sdk, downloadScript(url, path));
  try {
    const bytes = await readFileBytes(sdk, path);
    return extractArticle(url, decodeHtml(bytes));
  } finally {
    await run(sdk, removeScript(path)).catch(() => {
    });
  }
}
var newRunRecord = (preset, url) => ({ startedAt: (/* @__PURE__ */ new Date()).toISOString(), preset, url, steps: [], notes: [] });
async function askValid(sdk, step, prompt, check, log, rec, maxRepairs = 2) {
  const t0 = Date.now();
  const stat = { step, ms: 0, turns: 1, parseFailures: 0, repairs: 0, errors: [], at: (/* @__PURE__ */ new Date()).toISOString() };
  let reply = await ask(sdk, prompt);
  let json = null, errors = [];
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        json = parseJsonLoose(reply);
        const v = check(json);
        errors = v.errors;
      } catch (e) {
        json = null;
        stat.parseFailures++;
        errors = [String(e?.message || e)];
      }
      if (!errors.length || attempt >= maxRepairs) return { json, errors };
      log("repairing");
      stat.repairs++;
      stat.turns++;
      reply = await ask(sdk, repairPrompt(prompt, json ?? reply, errors));
    }
  } finally {
    stat.ms = Date.now() - t0;
    stat.errors = errors.slice(0, 20);
    rec.steps.push(stat);
    log("stepDone", { step, sec: (stat.ms / 1e3).toFixed(1), repairs: stat.repairs, parse: stat.parseFailures });
  }
}
async function saveRunRecord(sdk, env, rec) {
  const name = "run-" + rec.startedAt.replace(/[:.]/g, "-") + ".json";
  const path = join(env, name);
  try {
    await writeText(sdk, path, JSON.stringify(rec, null, 1));
    return path;
  } catch {
    return null;
  }
}
async function writeScript(sdk, article, preset, log, rec) {
  const pa = promptArticle(article);
  log("writing");
  const first = await askValid(sdk, "script", scriptPrompt(pa, { language: preset.scriptLanguage }), (j) => validateScript(j, pa), log, rec);
  if (!first.json || !Array.isArray(first.json.sentences)) throw new Error(first.errors.join("; ") || "no script");
  const draft = {
    headline: { line1: String(first.json.headline?.line1 ?? ""), line2: String(first.json.headline?.line2 ?? "") },
    sentences: first.json.sentences.map((s, i) => ({ id: "s" + (i + 1), text: String(s.text ?? "").trim(), sourceQuote: String(s.sourceQuote ?? "") }))
  };
  log("checking");
  const prev = { headline: draft.headline, sentences: draft.sentences.map((s) => ({ id: s.id, text: s.text })) };
  const fid = await askValid(sdk, "fidelity", fidelityPrompt(pa, { ...prev, language: preset.scriptLanguage }), (j) => validateFidelity(j, pa, prev), log, rec);
  if (fid.json && Array.isArray(fid.json.sentences) && fid.json.sentences.length === draft.sentences.length) {
    const script = {
      headline: { line1: String(fid.json.headline?.line1 ?? draft.headline.line1), line2: String(fid.json.headline?.line2 ?? draft.headline.line2) },
      sentences: fid.json.sentences.map((s, i) => ({
        id: draft.sentences[i].id,
        text: String(s.text ?? draft.sentences[i].text).trim(),
        sourceQuote: String(s.sourceQuote ?? draft.sentences[i].sourceQuote),
        issues: Array.isArray(s.issues) ? s.issues.map((x) => ({ kind: String(x?.kind ?? ""), note: String(x?.note ?? "") })) : [],
        rewritten: !!s.rewritten
      }))
    };
    return { script, errors: fid.errors };
  }
  return { script: { headline: draft.headline, sentences: draft.sentences.map((s) => ({ ...s, issues: [], rewritten: false })) }, errors: [...first.errors, ...fid.errors] };
}
var scriptText = (script) => joinScript(script.sentences.map((s) => s.text));
var revisionOf = (script, voiceId) => ttsRevision(script.headline.line1 + "\n" + script.headline.line2 + "\n" + scriptText(script), voiceId);
async function ensureProject(sdk, env, s) {
  if (s.projectId) return s.projectId;
  if (env.projectId) return env.projectId;
  const r = await run(sdk, createProjectScript());
  return r.projectId;
}
var readTts = (sdk, projectId) => load(sdk, ttsKey(projectId));
async function startNarration(sdk, projectId, script, voiceId, language) {
  const text = scriptText(script);
  const rec = { revision: revisionOf(script, voiceId), projectId, voiceId, text, state: "submitting", at: Date.now() };
  await save(sdk, ttsKey(projectId), rec);
  const r = await run(sdk, generateScript(projectId, "News narration", text, voiceId, language));
  const next = { ...rec, state: "submitted", workflowId: r.workflowId, at: Date.now() };
  await save(sdk, ttsKey(projectId), next);
  return next;
}
async function pollNarration(sdk, rec) {
  if (!rec.workflowId) return rec;
  const r = await run(sdk, narrationStatusScript(rec.workflowId));
  if (!r.result && r.status?.status === "failed" && canResumeImport(r.status)) {
    await run(sdk, resumeImportScript(rec.workflowId));
    return rec;
  }
  const result2 = r.result ? { resourceId: r.status?.resourceId || r.result.resourceId, durationSeconds: r.result.durationSeconds } : null;
  const next = applyStatus(rec, r.status, result2);
  if (next.state !== rec.state || next.resourceId !== rec.resourceId) await save(sdk, ttsKey(rec.projectId), next);
  return next;
}
async function prepPhotos(sdk, env, article, log) {
  if (!article.photos.length) return [];
  log("photos");
  const out = [];
  for (const p of article.photos.slice(0, 6)) {
    const stamp = Date.now();
    const src = join(env, `photo-${stamp}-${p.ref}.img`), jpg = join(env, `photo-${stamp}-${p.ref}.jpg`);
    try {
      await run(sdk, downloadScript(p.url, src));
      await ffmpeg(sdk, "Prepare an article photo", photoArgs(src, jpg));
      out.push({ ref: p.ref, dataUrl: "data:image/jpeg;base64," + await readFileBase64(sdk, jpg, 2 * 1024 * 1024), credit: p.credit });
    } catch {
    } finally {
      await run(sdk, removeScript(src)).catch(() => {
      });
      await run(sdk, removeScript(jpg)).catch(() => {
      });
    }
  }
  return out;
}
async function plate(sdk, env, projectId, seconds, color, log) {
  log("plate");
  const path = join(env, `plate-${color.replace("#", "")}-${seconds.toFixed(1)}.mp4`);
  const st = await run(sdk, existsScript(path));
  if (!st.exists || st.size < 1e3) await ffmpeg(sdk, "Make the background", plateArgs(seconds, color, path));
  const r = await run(sdk, importScript(projectId, [path]));
  if (!r.ids?.length) throw new Error("background was not added to the Project");
  return r.ids[0];
}
async function buildDraft(sdk, env, s, preset, narration, log, rec) {
  const script = s.script, article = s.article, projectId = s.projectId;
  const total = narration.durationSeconds;
  if (!(total > 0)) throw new Error("narration length unknown");
  const plateLen = plateSeconds(total);
  if (plateLen > PLATE_MAX_SECONDS) throw new Error("narration longer than " + PLATE_MAX_SECONDS + " s");
  log("timing");
  const chars = await run(sdk, alignmentScript(projectId, narration.resourceId));
  const texts = script.sentences.map((x2) => x2.text);
  const { times, source } = sentenceTimes(texts, chars, total);
  rec.notes.push("timing: " + source + (chars ? ", " + chars.length + " aligned characters" : ", no alignment"));
  if (source === "ratio") log("timingRatio");
  const photos = await prepPhotos(sdk, env, article, log);
  const sentences = script.sentences.map((x2, i) => ({ id: x2.id, text: x2.text, startSec: Number(times[i].startSec.toFixed(2)), endSec: Number(times[i].endSec.toFixed(2)) }));
  const assets = article.photos.filter((p) => photos.some((q) => q.ref === p.ref)).map((p) => ({ ref: p.ref, kind: "photo", caption: p.caption, credit: p.credit, w: p.w, h: p.h }));
  log("planning");
  let plan = null;
  try {
    const r = await askValid(sdk, "plan", plannerPrompt({ headline: script.headline, sentences, assets, language: preset.scriptLanguage }), (j) => validatePlan(j, sentences, assets), log, rec, 1);
    if (r.json && !r.errors.length) plan = r.json.scenes;
  } catch {
    plan = null;
  }
  const usedFallback = !plan;
  if (!plan) {
    rec.notes.push("plan: fallback");
    log("planFallback");
    plan = fallbackPlan(sentences, times, photos.map((p) => p.ref));
  }
  const scenes = sceneClips(plan, sentences, times, total, photos);
  const hidden = hiddenCaptionSentences(plan, sentences);
  const captions = captionTimes(texts, times, chars).filter((c) => !hidden.has(c.sentence));
  const plateId = await plate(sdk, env, projectId, plateLen, preset.background, log);
  log("assembling");
  const x = { projectId, draftName: script.headline.line1 || article.title || "News short", plateId, plateSeconds: plateLen, narrationId: narration.resourceId, narrationSeconds: total, headline: script.headline, preset, scenes, captions };
  const base = await run(sdk, baseDraftScript(x));
  if (!base.draftId) throw new Error("the Draft was not created");
  for (const call of sceneScripts(base.draftId, scenes)) await run(sdk, call);
  await run(sdk, overlayTextScript(base.draftId, x));
  rec.notes.push("draft: " + base.draftId + ", " + scenes.length + " scenes, " + captions.length + " captions, " + photos.length + " photos");
  return { draftId: base.draftId, timing: source, fallbackPlan: usedFallback };
}

// src/Panel.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var box = { border: "1px solid var(--panel-border, #3334)", borderRadius: 8, padding: 10 };
var muted = { color: "var(--panel-muted-fg, #888)", fontSize: 12 };
var input = { width: "100%", boxSizing: "border-box", padding: 6, font: "inherit" };
var MAX_CHARS = 390;
function NewsMinutePanel({ sdk, context }) {
  const lang = context?.language;
  const T = (k, v) => t(lang, k, v);
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [tts, setTts] = useState(null);
  const [voices, setVoices] = useState([]);
  const env = useRef(null);
  useAppUpdateGuard(sdk, context?.language, () => busy);
  const log = (k, v) => {
    const m = T(k, v);
    setStatus(m);
    setLines((l) => [...l.slice(-40), (/* @__PURE__ */ new Date()).toLocaleTimeString() + "  " + m]);
  };
  const finish = async (rec) => {
    const path = await saveRunRecord(sdk, env.current, rec);
    if (path) log("record", { path });
  };
  const update = async (next2) => {
    setS(next2);
    await save(sdk, SESSION_KEY, next2);
  };
  useEffect(() => {
    (async () => {
      try {
        if (!sdk.storage) throw new Error(T("noStorage"));
        env.current = await getEnv(sdk);
        const saved = await load(sdk, SESSION_KEY);
        const sess = saved ?? emptySession();
        setS(sess);
        if (sess.projectId) setTts(await readTts(sdk, sess.projectId));
        run(sdk, voicesScript()).then(setVoices).catch(() => {
        });
      } catch (e) {
        setError(String(e?.message || e));
      }
    })();
  }, []);
  const guard = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(T("error", { error: String(e?.message || e) }));
    } finally {
      setBusy(false);
      setStatus("");
    }
  };
  useEffect(() => {
    if (!tts || tts.state !== "submitted") return;
    let stop = false;
    (async () => {
      let rec = tts;
      while (!stop && rec.state === "submitted") {
        await sleep(3e3);
        if (stop) return;
        try {
          rec = await pollNarration(sdk, rec);
        } catch {
          continue;
        }
        if (!stop) setTts(rec);
      }
    })();
    return () => {
      stop = true;
    };
  }, [tts?.workflowId, tts?.state]);
  if (!s) return /* @__PURE__ */ jsx("div", { style: { padding: 12 }, children: error || "\u2026" });
  const preset = PRESETS[s.presetId] ?? PRESETS.chosun;
  const writeScript2 = () => guard(async () => {
    const e = env.current;
    let article;
    if (url.trim()) {
      log("fetching");
      article = await fetchArticle(sdk, e, url.trim());
    } else article = articleFromText(text);
    if ([...article.body].length < 200) throw new Error(T("tooShort"));
    const rec = newRunRecord(preset.id, url.trim());
    rec.notes.push("article: " + article.method + ", " + [...article.body].length + " chars, " + article.photos.length + " photos");
    let r;
    try {
      r = await writeScript(sdk, article, preset, log, rec);
    } finally {
      await finish(rec);
    }
    await update({ ...s, article, script: r.script, scriptErrors: r.errors, approved: null, draftId: null });
  });
  const setLine = (i, v) => {
    if (!s.script) return;
    const sentences = s.script.sentences.map((x, k) => k === i ? { ...x, text: v } : x);
    update({ ...s, script: { ...s.script, sentences }, approved: null });
  };
  const setHead = (k, v) => s.script && update({ ...s, script: { ...s.script, headline: { ...s.script.headline, [k]: v } }, approved: null });
  const approve = () => guard(async () => {
    const projectId = await ensureProject(sdk, env.current, s);
    await update({ ...s, projectId, approved: revisionOf(s.script, s.voiceId) });
    setTts(await readTts(sdk, projectId));
  });
  const narrate = () => guard(async () => {
    log("narrating");
    const rec = await startNarration(sdk, s.projectId, s.script, s.voiceId, preset.ttsLanguage);
    setTts(rec);
  });
  const build = () => guard(async () => {
    const next2 = ttsNext(tts, s.approved);
    if (next2.kind !== "ready") return;
    const rec = newRunRecord(preset.id, s.article?.url ?? "");
    let r;
    try {
      r = await buildDraft(sdk, env.current, s, preset, next2, log, rec);
    } catch (e) {
      rec.notes.push("error: " + String(e?.message || e));
      throw e;
    } finally {
      await finish(rec);
    }
    await update({ ...s, draftId: r.draftId });
    await run(sdk, openDraftScript(r.draftId)).catch(() => {
    });
    if (r.timing === "ratio") setError(T("timingRatio"));
    else if (r.fallbackPlan) setError(T("planFallback"));
  });
  const reset = () => guard(async () => {
    await update({ ...emptySession(s.presetId), voiceId: s.voiceId, projectId: s.projectId });
    setUrl("");
    setText("");
  });
  const sc = s.script;
  const chars = sc ? scriptText(sc).length : 0;
  const approved = !!(sc && s.approved && s.approved === revisionOf(sc, s.voiceId));
  const next = approved ? ttsNext(tts, s.approved) : null;
  const quote = creditQuote(chars);
  return /* @__PURE__ */ jsxs("div", { style: { padding: 12, display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }, children: [
    /* @__PURE__ */ jsx("strong", { children: T("title") }),
    /* @__PURE__ */ jsxs("label", { children: [
      T("preset"),
      " ",
      /* @__PURE__ */ jsx("select", { value: s.presetId, disabled: busy, onChange: (e) => update({ ...s, presetId: e.target.value }), children: Object.values(PRESETS).map((p) => /* @__PURE__ */ jsx("option", { value: p.id, children: p.label }, p.id)) })
    ] }),
    !sc ? /* @__PURE__ */ jsxs("div", { style: { ...box, display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsx("input", { style: input, placeholder: T("url"), value: url, disabled: busy, onChange: (e) => setUrl(e.target.value) }),
      /* @__PURE__ */ jsx("textarea", { style: { ...input, minHeight: 90 }, placeholder: T("orText"), value: text, disabled: busy, onChange: (e) => setText(e.target.value) }),
      /* @__PURE__ */ jsx("span", { style: muted, children: T("aiCredits") }),
      /* @__PURE__ */ jsx("button", { disabled: busy || !url.trim() && text.trim().length < 80, onClick: writeScript2, children: T("write") })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { ...box, display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsx("strong", { children: T("review") }),
      /* @__PURE__ */ jsx("span", { style: muted, children: T("reviewHint") }),
      s.scriptErrors.length ? /* @__PURE__ */ jsx("div", { style: { color: "#d9822b", fontSize: 12 }, children: s.scriptErrors.map((x, i) => /* @__PURE__ */ jsx("div", { children: "\u2022 " + x }, i)) }) : null,
      /* @__PURE__ */ jsxs("label", { children: [
        T("headline1"),
        /* @__PURE__ */ jsx("input", { style: input, value: sc.headline.line1, disabled: busy || approved, onChange: (e) => setHead("line1", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("label", { children: [
        T("headline2"),
        /* @__PURE__ */ jsx("input", { style: input, value: sc.headline.line2, disabled: busy || approved, onChange: (e) => setHead("line2", e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("label", { children: [
        T("accent"),
        /* @__PURE__ */ jsx("input", { style: input, value: sc.headline.accent ?? "", disabled: busy || approved, onChange: (e) => setHead("accent", e.target.value) })
      ] }),
      sc.sentences.map((x, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsx("textarea", { style: { ...input, minHeight: 44 }, value: x.text, disabled: busy || approved, onChange: (e) => setLine(i, e.target.value) }),
        /* @__PURE__ */ jsxs("span", { style: muted, children: [
          T("source"),
          ": ",
          x.sourceQuote ? "\u201C" + x.sourceQuote + "\u201D" : T("noSource")
        ] }),
        x.rewritten ? /* @__PURE__ */ jsx("span", { style: { ...muted, color: "#4a90d9" }, children: T("rewritten") }) : null,
        x.issues.length ? /* @__PURE__ */ jsxs("span", { style: { ...muted, color: "#d9822b" }, children: [
          T("issues"),
          ": ",
          x.issues.map((v) => v.kind + (v.note ? " \u2013 " + v.note : "")).join("; ")
        ] }) : null
      ] }, x.id)),
      /* @__PURE__ */ jsx("span", { style: muted, children: T("length", { chars, sec: Math.round(chars / 6.5) }) }),
      chars > MAX_CHARS ? /* @__PURE__ */ jsx("span", { style: { color: "#d9822b", fontSize: 12 }, children: T("tooLong", { max: MAX_CHARS }) }) : null,
      approved ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("span", { children: "\u2713 " + T("approved") }),
        /* @__PURE__ */ jsx("button", { disabled: busy || tts?.state === "submitted" || tts?.state === "submitting", onClick: () => update({ ...s, approved: null }), children: T("edit") })
      ] }) : /* @__PURE__ */ jsx("button", { disabled: busy, onClick: approve, children: T("approve") })
    ] }),
    approved && next ? /* @__PURE__ */ jsxs("div", { style: { ...box, display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("label", { children: [
        T("voice"),
        " ",
        /* @__PURE__ */ jsx("select", { value: s.voiceId, disabled: busy || next.kind === "poll" || next.kind === "ready", onChange: (e) => update({ ...s, voiceId: e.target.value, approved: revisionOf(sc, e.target.value) }), children: (voices.length ? voices : [{ voiceId: s.voiceId, name: s.voiceId }]).map((v) => /* @__PURE__ */ jsx("option", { value: v.voiceId, children: v.name }, v.voiceId)) })
      ] }),
      next.kind === "none" || next.kind === "stale" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { style: muted, children: T("credits", { chars, est: quote.estimated, held: quote.held }) }),
        /* @__PURE__ */ jsx("button", { disabled: busy, onClick: narrate, children: T("narrate") })
      ] }) : next.kind === "poll" ? /* @__PURE__ */ jsx("span", { children: T("narrating") }) : next.kind === "lost" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#d9822b" }, children: T("lost") }),
        /* @__PURE__ */ jsx("span", { style: muted, children: T("credits", { chars, est: quote.estimated, held: quote.held }) }),
        /* @__PURE__ */ jsx("button", { disabled: busy, onClick: narrate, children: T("newNarration") })
      ] }) : next.kind === "failed" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#d9822b" }, children: next.error === "insufficient_credits" ? T("noCredits") : T("narrationFailed", { error: next.error }) }),
        /* @__PURE__ */ jsx("button", { disabled: busy, onClick: narrate, children: T("retry") })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { children: "\u2713 " + T("narrated", { sec: next.durationSeconds.toFixed(1) }) }),
        /* @__PURE__ */ jsx("span", { style: muted, children: T("buildCredits") }),
        /* @__PURE__ */ jsx("button", { disabled: busy, onClick: build, children: T("build") })
      ] })
    ] }) : null,
    s.draftId ? /* @__PURE__ */ jsxs("div", { style: { ...box, display: "flex", gap: 8, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx("span", { children: T("done") }),
      /* @__PURE__ */ jsx("button", { disabled: busy, onClick: () => run(sdk, openDraftScript(s.draftId)).catch(() => {
      }), children: T("openDraft") })
    ] }) : null,
    status ? /* @__PURE__ */ jsx("span", { style: muted, children: status }) : null,
    lines.length ? /* @__PURE__ */ jsxs("details", { children: [
      /* @__PURE__ */ jsx("summary", { style: muted, children: "Log" }),
      /* @__PURE__ */ jsx("pre", { style: { ...muted, whiteSpace: "pre-wrap", margin: 0 }, children: lines.join("\n") })
    ] }) : null,
    error ? /* @__PURE__ */ jsx("span", { style: { color: "#d9822b", fontSize: 12, whiteSpace: "pre-wrap" }, children: error }) : null,
    sc ? /* @__PURE__ */ jsx("button", { disabled: busy, onClick: reset, children: T("startOver") }) : null
  ] });
}
var Panel_default = NewsMinutePanel;
export {
  Panel_default as default
};
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
