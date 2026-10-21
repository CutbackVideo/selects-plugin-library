// @name Edit preparation
// @name:ko 편집 준비
// @icon list
import React, {useEffect, useRef, useState} from "react";
// The built-in Edit preparation steps' own words, so the panel reads the same.
const STRINGS = {"en": {"description": "Choose a shoot folder, then run the steps in order from step 1.", "folder": "Shoot folder", "chooseFolder": "Choose a shoot folder", "chooseHint": "Choose a shoot folder at the top of the project, such as 0819.", "alreadyOrganized": "{{name}} is already organized.", "noProject": "Open a project to choose a shoot folder.", "noFolders": "Import a shoot folder to the top of the project to get started.", "sourceCount_one": "{{count}} source file", "sourceCount_other": "{{count}} source files", "run": "Run", "cancel": "Cancel", "analyze": {"title": "Analyze", "description": "Analyzes the selected shoot folder's media. Files already analyzed are skipped.", "progress": "{{count}} of {{total}} analyzed", "analyzing": "Analyzing…"}, "organize": {"title": "Organize folders", "description": "Organizes the selected shoot's sources into 01. camera and 02. audio and gives each source its own color.", "action": "Organize folders", "failed": "Could not organize the shoot. Check the notification."}, "classify": {"title": "Classify Main and Insert", "description": "Watch each camera video of the shoot and set it to Main or Insert, then make the Main and Insert synced timelines. Each video starts with its class in the built timelines, else the rule's. Run again, it asks first and makes the timelines over the built ones.", "action": "Classify Main and Insert", "needsOrganize": "Run step 2 first: {{name}} is not organized yet.", "needsAnalysis": "Run step 1 first: every file in this shoot needs analysis."}, "syncGroups": {"title": "Sync", "description": "Sorts the chosen Main synced timeline's clips by recording time, then lines them up by audio and speech."}, "removeGaps": {"title": "Remove empty ranges", "description": "Removes only the ranges empty on every track. Sync stays as it is."}, "groupSyncRunning": "Syncing…", "groupSyncStop": "Stop", "unsynced": {"needsReview": "Needs review", "notSynced": "Not synced", "review": "Review", "resolved": "Resolved"}, "status": {"organized": "Folders organized", "notOrganized": "Folders not organized yet", "timelines": "Timelines: {{names}}", "noTimelines": "No timelines yet", "notTranslated": "Not translated", "stored": "Translated \u00b7 {{count}} lines", "done": "Translation complete {{completedCount}}/{{totalCount}}", "stopped": "Stopped \u00b7 {{completedCount}}/{{totalCount}} translated", "running": "Translating {{completedCount}}/{{totalCount}}\u2026", "starting": "Translating\u2026"}, "timeline": {"main": "Choose a Main synced timeline", "none": {"main": "No Main synced timeline is selected."}}, "draft": {"title": "Draft", "description": "Makes a draft from one of the selected shoot's synced timelines, then translates its captions into Korean and exports them.", "choose": "Choose a synced timeline", "none": "This shoot has no synced timeline yet. Make them in step 3.", "needsDraft": "Make the draft first.", "make": "1. Make draft", "makeDescription": "Makes a draft named like the chosen synced timeline in its shoot folder under 03. main (Main) or 04. insert (Insert). Run again, it asks first and makes the draft over the earlier one.", "translate": "2. Translate", "translateDescription": "Translates every caption of the draft into Korean. The original transcript stays.", "translating": "Translating…", "translateProgress": "Translating {{completedCount}}/{{totalCount}}…", "export": "3. Export captions", "exportDescription": "Saves the draft's transcript as a text file with its translation, chapters and subchapters.", "exported": "Transcript exported.", "exportEmpty": "This draft has no transcript to export.", "exportFailed": "Could not export the transcript. Please try again.", "making": "Making the draft\u2026", "exporting": "Exporting\u2026", "noCaptions": "{{name}} has no captions to translate.", "translateFailed": "Could not translate the captions. Please try again."}}, "ko": {"description": "\ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud55c \ud6c4 1\ub2e8\uacc4\ubd80\ud130 \uc21c\uc11c\ub300\ub85c \uc2e4\ud589\ud558\uc138\uc694.", "folder": "\ucd2c\uc601 \ud3f4\ub354", "chooseFolder": "\ucd2c\uc601 \ud3f4\ub354 \uc120\ud0dd", "chooseHint": "\ud504\ub85c\uc81d\ud2b8 \ucd5c\uc0c1\ub2e8\uc5d0 \uc788\ub294 0819\uc640 \uac19\uc740 \ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\uc138\uc694.", "alreadyOrganized": "{{name}}\uc740(\ub294) \uc774\ubbf8 \uc815\ub9ac\ub418\uc5c8\uc2b5\ub2c8\ub2e4.", "noProject": "\ucd2c\uc601 \ud3f4\ub354\ub97c \uc120\ud0dd\ud558\ub824\uba74 \ud504\ub85c\uc81d\ud2b8\ub97c \uc5ec\uc138\uc694.", "noFolders": "\uc2dc\uc791\ud558\ub824\uba74 \ud504\ub85c\uc81d\ud2b8 \ucd5c\uc0c1\ub2e8\uc5d0 \ucd2c\uc601 \ud3f4\ub354\ub97c \uac00\uc838\uc624\uc138\uc694.", "sourceCount_one": "\uc6d0\ubcf8 \ud30c\uc77c {{count}}\uac1c", "sourceCount_other": "\uc6d0\ubcf8 \ud30c\uc77c {{count}}\uac1c", "run": "\uc2e4\ud589", "cancel": "\ucde8\uc18c", "analyze": {"title": "\ubd84\uc11d", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601 \ud3f4\ub354\uc758 \ubbf8\ub514\uc5b4\ub97c \ubd84\uc11d\ud569\ub2c8\ub2e4. \uc774\ubbf8 \ubd84\uc11d\ub41c \ud30c\uc77c\uc740 \uac74\ub108\ub701\ub2c8\ub2e4.", "progress": "{{count}}/{{total}} \ubd84\uc11d \uc644\ub8cc", "analyzing": "\ubd84\uc11d \uc911…"}, "organize": {"title": "\ud3f4\ub354 \uc815\ub9ac", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601\ubcf8\uc758 \uc18c\uc2a4\ub97c 01. camera\uc640 02. audio\ub85c \uc815\ub9ac\ud558\uace0 \uac01 \uc18c\uc2a4\uc5d0 \uace0\uc720\ud55c \uc0c9\uc0c1\uc744 \uc9c0\uc815\ud569\ub2c8\ub2e4.", "action": "\ud3f4\ub354 \uc815\ub9ac", "failed": "\ucd2c\uc601\ubcf8\uc744 \uc815\ub9ac\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \uc54c\ub9bc\uc744 \ud655\uc778\ud558\uc138\uc694."}, "classify": {"title": "\uba54\uc778·\uc778\uc11c\ud2b8 \ubd84\ub958", "description": "\ucd2c\uc601\ubcf8\uc758 \uce74\uba54\ub77c \uc601\uc0c1\uc744 \ud558\ub098\uc529 \ubcf4\uba74\uc11c \uba54\uc778 \ub610\ub294 \uc778\uc11c\ud2b8\ub85c \uc815\ud55c \ub2e4\uc74c, \uba54\uc778·\uc778\uc11c\ud2b8 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc744 \ub9cc\ub4ed\ub2c8\ub2e4. \uac01 \uc601\uc0c1\uc740 \uc774\ubbf8 \ub9cc\ub4e0 \ud0c0\uc784\ub77c\uc778\uc758 \ubd84\ub958\ub85c \uc2dc\uc791\ud558\uace0, \uc5c6\uc73c\uba74 \uaddc\uce59\uc744 \ub530\ub985\ub2c8\ub2e4. \ub2e4\uc2dc \uc2e4\ud589\ud558\uba74 \uba3c\uc800 \ud655\uc778\ud55c \ub4a4 \uae30\uc874 \ud0c0\uc784\ub77c\uc778\uc744 \ub36e\uc5b4\uc501\ub2c8\ub2e4.", "action": "\uba54\uc778·\uc778\uc11c\ud2b8 \ubd84\ub958", "needsOrganize": "\uba3c\uc800 2\ub2e8\uacc4\ub97c \uc2e4\ud589\ud558\uc138\uc694: {{name}}\uc774(\uac00) \uc544\uc9c1 \uc815\ub9ac\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.", "needsAnalysis": "\uba3c\uc800 1\ub2e8\uacc4\ub97c \uc2e4\ud589\ud558\uc138\uc694: \uc774 \ucd2c\uc601\ubcf8\uc758 \ubaa8\ub4e0 \ud30c\uc77c\uc5d0 \ubd84\uc11d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."}, "syncGroups": {"title": "\uc2f1\ud06c", "description": "\uc120\ud0dd\ud55c \uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc758 \ud074\ub9bd\uc744 \ub179\ud654 \uc2dc\uac04\uc21c\uc73c\ub85c \uc815\ub82c\ud55c \ub2e4\uc74c, \uc624\ub514\uc624\uc640 \uc74c\uc131\uc744 \uae30\uc900\uc73c\ub85c \uc815\ub82c\ud569\ub2c8\ub2e4."}, "removeGaps": {"title": "\ube48 \uad6c\uac04 \uc81c\uac70", "description": "\ubaa8\ub4e0 \ud2b8\ub799\uc5d0\uc11c \ube44\uc5b4 \uc788\ub294 \uad6c\uac04\ub9cc \uc81c\uac70\ud569\ub2c8\ub2e4. \uc2f1\ud06c\ub294 \uc720\uc9c0\ub429\ub2c8\ub2e4."}, "groupSyncRunning": "\uc2f1\ud06c \uc911…", "groupSyncStop": "\uc911\uc9c0", "unsynced": {"needsReview": "\uac80\ud1a0 \ud544\uc694", "notSynced": "\uc2f1\ud06c \uc548\ub428", "review": "\uac80\ud1a0", "resolved": "\ud574\uacb0\ub428"}, "status": {"organized": "\ud3f4\ub354 \uc815\ub9ac\ub428", "notOrganized": "\ud3f4\ub354 \uc815\ub9ac \uc548 \ub428", "timelines": "\ud0c0\uc784\ub77c\uc778: {{names}}", "noTimelines": "\ud0c0\uc784\ub77c\uc778 \uc5c6\uc74c", "notTranslated": "\ubc88\uc5ed \uc548 \ub428", "stored": "\ubc88\uc5ed\ub428 · {{count}}\uc904", "done": "\ubc88\uc5ed \uc644\ub8cc {{completedCount}}/{{totalCount}}", "stopped": "\uc911\ub2e8\ub428 · {{completedCount}}/{{totalCount}} \ubc88\uc5ed\ub428", "running": "\ubc88\uc5ed \uc911 {{completedCount}}/{{totalCount}}…", "starting": "\ubc88\uc5ed \uc911…"}, "timeline": {"main": "\uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778 \uc120\ud0dd", "none": {"main": "\uc120\ud0dd\ub41c \uba54\uc778 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}}, "draft": {"title": "\ub4dc\ub798\ud504\ud2b8", "description": "\uc120\ud0dd\ud55c \ucd2c\uc601\ubcf8\uc758 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc73c\ub85c \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4e0 \ub2e4\uc74c, \uc790\ub9c9\uc744 \ud55c\uad6d\uc5b4\ub85c \ubc88\uc5ed\ud558\uace0 \ub0b4\ubcf4\ub0c5\ub2c8\ub2e4.", "choose": "\uc2f1\ud06c \ud0c0\uc784\ub77c\uc778 \uc120\ud0dd", "none": "\uc774 \ucd2c\uc601\ubcf8\uc5d0\ub294 \uc544\uc9c1 \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. 3\ub2e8\uacc4\uc5d0\uc11c \ub9cc\ub4dc\uc138\uc694.", "needsDraft": "\uba3c\uc800 \ub4dc\ub798\ud504\ud2b8\ub97c \ub9cc\ub4dc\uc138\uc694.", "make": "1. \ub4dc\ub798\ud504\ud2b8 \ub9cc\ub4e4\uae30", "makeDescription": "\uc120\ud0dd\ud55c \uc2f1\ud06c \ud0c0\uc784\ub77c\uc778\uacfc \uac19\uc740 \uc774\ub984\uc758 \ub4dc\ub798\ud504\ud2b8\ub97c \ucd2c\uc601 \ud3f4\ub354\uc758 03. main(\uba54\uc778) \ub610\ub294 04. insert(\uc778\uc11c\ud2b8)\uc5d0 \ub9cc\ub4ed\ub2c8\ub2e4. \ub2e4\uc2dc \uc2e4\ud589\ud558\uba74 \uba3c\uc800 \ud655\uc778\ud55c \ub4a4 \uc774\uc804 \ub4dc\ub798\ud504\ud2b8\ub97c \ub36e\uc5b4\uc501\ub2c8\ub2e4.", "translate": "2. \ubc88\uc5ed", "translateDescription": "\ub4dc\ub798\ud504\ud2b8\uc758 \ubaa8\ub4e0 \uc790\ub9c9\uc744 \ud55c\uad6d\uc5b4\ub85c \ubc88\uc5ed\ud569\ub2c8\ub2e4. \uc6d0\ubcf8 \uc790\ub9c9\uc740 \uc720\uc9c0\ub429\ub2c8\ub2e4.", "translating": "\ubc88\uc5ed \uc911…", "translateProgress": "{{completedCount}}/{{totalCount}} \ubc88\uc5ed \uc911…", "export": "3. \uc790\ub9c9 \ub0b4\ubcf4\ub0b4\uae30", "exportDescription": "\ub4dc\ub798\ud504\ud2b8\uc758 \uc790\ub9c9\uc744 \ubc88\uc5ed, \ucc55\ud130, \ud558\uc704 \ucc55\ud130\uc640 \ud568\uaed8 \ud14d\uc2a4\ud2b8 \ud30c\uc77c\ub85c \uc800\uc7a5\ud569\ub2c8\ub2e4.", "exported": "\uc74c\uc131 \uae30\ub85d\uc774 \ub0b4\ubcf4\ub0b4\uae30\ub418\uc5c8\uc2b5\ub2c8\ub2e4.", "exportEmpty": "\uc774 Draft\uc5d0\ub294 \ub0b4\ubcf4\ub0bc \uc74c\uc131 \uae30\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", "exportFailed": "\uc74c\uc131 \uae30\ub85d\uc744 \ub0b4\ubcf4\ub0bc \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.", "making": "\ub4dc\ub798\ud504\ud2b8 \ub9cc\ub4dc\ub294 \uc911…", "exporting": "\ub0b4\ubcf4\ub0b4\ub294 \uc911…", "noCaptions": "{{name}}\uc5d0\ub294 \ubc88\uc5ed\ud560 \uc790\ub9c9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.", "translateFailed": "\uc790\ub9c9\uc744 \ubc88\uc5ed\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694."}}};

const muted = {fontSize:12,lineHeight:"16px",opacity:0.65};
const Line = ({tone = "muted", children}) => <p role={tone === "error" ? "alert" : "status"} style={{margin:0,fontSize:12,lineHeight:"16px",wordBreak:"break-word",...(tone === "error" ? {color:"var(--destructive)"} : tone === "success" ? {} : {opacity:0.65})}}>{children}</p>;
const interpolate = (value, args) => Object.entries(args).reduce((s,[key,v]) => s.replaceAll(`{{${key}}}`,String(v)),value);

// A step's number, title and its buttons on one row, as the built-in steps
// were laid out; what the step does is the title's hover text, and its Run
// button's. Below the row, the step's own controls, indented past the number.
const Step = ({number,title,description,actions,children}) => <section style={{borderTop:"1px solid var(--border)",padding:"12px 0",display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span aria-hidden="true" style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--border)",borderRadius:"50%",fontSize:12,flexShrink:0,opacity:0.8}}>{number}</span>
      <span title={description} style={{flex:1,minWidth:0,fontSize:14,fontWeight:500,lineHeight:"16px",cursor:"default"}}>{title}</span>
      <span style={{display:"inline-flex",gap:6,flexShrink:0}}>{actions}</span>
    </div>
    {children && <div style={{paddingLeft:32,display:"flex",flexDirection:"column",gap:6}}>{children}</div>}
  </section>;

export default function Preparation({sdk, context, ui}) {
  const t = STRINGS[context.language] || STRINGS.en;
  const [data, setData] = useState(null), [shootName, setShoot] = useState("");
  const [timelineId, setTimeline] = useState("");
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState("");
  // One line of feedback under the step it belongs to: an error, or why a
  // disabled button could not run (the built-in steps said so in a toast).
  const [note, setNote] = useState(null);
  const [mainId, setMain] = useState("");
  const epoch = useRef(0), pending = useRef(false), reading = useRef(false), noteTimer = useRef(null), chosenDraft = useRef("");
  const pid = context.projectId;
  const key = `selection:${pid}`;
  async function script(body, commit = false) {
    const response = await sdk.runScript({summary: context.language === "ko" ? "\ud3b8\uc9d1 \uc900\ube44" : "Edit preparation", script: `const p = selects.project(${JSON.stringify(pid)}); ${body}`, allowCommit: commit});
    if (response.isError) throw new Error(response.output);
    return response.result;
  }
  async function refresh() {
    if (!pid || reading.current || pending.current) return;
    reading.current = true;
    const generation = epoch.current;
    try {
      const result = await script(`return {state: await p.jwonder.state(), resources: await p.resources(), timelines: await p.syncedTimelines(), workflows: await p.workflows(), review: await p.jwonder.unsyncedReview()};`);
      // The translation job of the chosen draft alone; a project may hold many.
      const draftId = chosenDraft.current;
      const translation = draftId && result.state.projectDrafts.some(d => d.sequenceId === draftId)
        ? await script(`return await p.jwonder.translationStatus(${JSON.stringify({sequenceId: draftId})});`) : null;
      if (generation === epoch.current) setData({...result, translations: draftId ? {[draftId]: translation} : {}});
    } catch(e) {if (generation === epoch.current) say("top", String(e.message || e), "error");}
    finally {reading.current = false;}
  }
  useEffect(() => {
    ++epoch.current; setBusy(false); setData(null); setNote(null); setShoot(""); setTimeline("");
    const generation = epoch.current;
    sdk.storage.getItem(key).then(raw => {
      if (epoch.current !== generation) return;
      if (raw) {const s = JSON.parse(raw); setShoot(s.shoot || ""); setTimeline(s.timeline || "");}
    }).catch(e => say("top", String(e.message || e), "error"));
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => {++epoch.current; clearInterval(timer); clearTimeout(noteTimer.current);};
  }, [pid]);
  // A toast's lifetime: the line goes by itself unless it is an error.
  function say(step, text, tone = "muted") {
    clearTimeout(noteTimer.current);
    setNote({step, text, tone});
    if (tone !== "error") noteTimer.current = setTimeout(() => setNote(current => current && current.text === text ? null : current), 4000);
  }
  async function select(shoot, timeline = "") {
    setShoot(shoot); setTimeline(timeline); setNote(null);
    try {await sdk.storage.setItem(key, JSON.stringify({shoot, timeline}));} catch(e) {say("top", String(e.message || e), "error");}
  }
  async function act(step, action, failed = e => String(e.message || e), token = "") {
    if (pending.current) return;
    pending.current = true; setBusy(true); setRunning(token); setNote(null);
    const generation = epoch.current;
    try {await action();} catch(e) {
      const text = failed(e);
      if (generation === epoch.current && text) say(step, text, "error");
    }
    finally {pending.current = false; if (generation === epoch.current) {setBusy(false); setRunning(""); await refresh();}}
  }
  const shoots = data?.state.shoots || [];
  const shoot = shoots.find(s => s.name === shootName);
  const timelines = (data?.state.timelines || []).filter(s => s.shoot === shoot?.name);
  const workflows = data?.workflows || [];
  const active = workflows.filter(w => ["queued", "running", "canceling"].includes(w.status));
  const mains = timelines.filter(s => s.kind === "main");
  const main = mains.find(s => s.resourceId === mainId) || mains[0];
  const mainStored = data?.timelines.find(s => s.resourceId === main?.resourceId);
  // Step 6 chooses among every draft in the project, and the shoot's synced
  // timelines that have no draft yet (there, only making one applies).
  const projectDrafts = data?.state.projectDrafts || [];
  const shootDrafts = (data?.state.drafts || []).filter(d => d.shoot === shoot?.name);
  const unmade = timelines.filter(tl => !shootDrafts.some(d => d.name === tl.name && d.kind === tl.kind));
  const choices = [
    ...projectDrafts.map(d => ({value:`d:${d.sequenceId}`, label:d.name, draft:d})),
    ...unmade.map(tl => ({value:`t:${tl.resourceId}`, label:tl.name, timeline:tl})),
  ];
  const chosen = choices.find(c => c.value === timelineId)
    || choices.find(c => c.draft && shootDrafts.some(d => d.sequenceId === c.draft.sequenceId))
    || choices.find(c => c.timeline) || choices[0];
  const draft = chosen?.draft;
  chosenDraft.current = draft?.sequenceId || "";
  // The synced timeline a draft is made from: the chosen one, or the one the
  // chosen draft is named after. Without it, there is nothing to make.
  const source = chosen?.timeline || (draft && (data?.state.timelines || []).find(tl => tl.name === draft.name));
  const sourceStored = data?.timelines.find(s => s.resourceId === source?.resourceId);
  const sourceBusy = !!sourceStored && active.some(w => w.sequenceId === sourceStored.sequenceId);
  const translation = data?.translations[draft?.sequenceId];
  const translating = translation?.status === "running";
  const sourceIds = new Set(shoot?.resourceIds || []);
  const resources = (data?.resources || []).filter(r => sourceIds.has(r.resourceId));
  const media = resources.filter(r => String(r.type).toLowerCase() !== "image");
  const missing = media.filter(r => !r.hasAnalysis);
  const analysis = active.filter(w => sourceIds.has(w.resourceId) && w.type === "project:analyze-resource");
  const sync = active.find(w => w.sequenceId === mainStored?.sequenceId && w.type === "sequence:sync");
  // The host's review of the on-screen timeline's unsynced clips, as the
  // built-in step showed it under Sync while the chosen Main was on screen.
  const review = !sync && data?.review && data.review.sequenceId === mainStored?.sequenceId ? data.review : null;
  const reviewRows = review ? [["needsReview","#facc15"],["notSynced","#ef4444"]].filter(([group]) => review.counts[group] > 0) : [];
  // Why step 3 cannot run yet, said on a click where its button is disabled.
  const classifyBlocked = !shoot ? null : !shoot.alreadyOrganized ? "needsOrganize" : missing.length ? "needsAnalysis" : null;
  const q = JSON.stringify;
  // The host asks about overwriting built timelines, then shows its own
  // classifier; declined or closed, the request ends canceled with no writes.
  async function classify() {
    const generation = epoch.current;
    const job = await script(`return await p.jwonder.startReview({shoot:${q(shoot.name)}});`,true);
    let result = job;
    while (result.status === "running") {
      await new Promise(resolve=>setTimeout(resolve,500));
      if (generation !== epoch.current) return;
      result = await script(`return await p.jwonder.reviewStatus(${q(job.id)});`);
    }
    if(result.status === "failed") throw new Error(result.error);
    if(result.status !== "succeeded") return;
    const made = await script(`return await p.jwonder.buildTimelines(${q({shoot:shoot.name,classes:result.classes})});`,true);
    // Both new timelines open, Main last so it is the one on screen.
    for (const sequenceId of [...made.sequenceIds].reverse())
      await script(`return await selects.editor.openSyncedTimeline({projectId:${q(pid)},sequenceId:${q(sequenceId)}});`,true);
  }
  // The host asks about a draft of the same name first; declined, nothing is made.
  async function makeDraft() {
    const result = await script(`return await p.jwonder.makeDraft(${q({resourceId: source.resourceId,kind:source.kind})});`, true);
    if (!result) return;
    await select(shoot.name, `d:${result.sequenceId}`);
    await script(`return await selects.editor.openDraft(${q(result.sequenceId)});`, true);
  }
  // A running step's button asks the host before stopping, as the built-in
  // dialogs do; declined, the run goes on.
  async function stopSync() {
    if (!(await script(`return await p.jwonder.confirmStop(${q({job:"sync",name:main.name})});`))) return;
    await script(`return await p.jwonder.cancelSync(${q({sequenceId: mainStored.sequenceId})});`, true);
  }
  async function stopTranslation() {
    if (!(await script(`return await p.jwonder.confirmStop(${q({job:"translation",name:draft.name})});`))) return;
    await script(`return await p.jwonder.cancelTranslation(${q({sequenceId: draft.sequenceId})});`, true);
  }
  async function exportTranscript() {
    await script(`return await selects.export.draftTranscript(${q({projectId:pid,draftSequenceId:draft.sequenceId,includeTranslation:true,includeChapters:true,includeSubchapters:true})});`,true);
    say("draft", t.draft.exported, "success");
  }
  const exportFailure = e => {
    const message = String(e.message || e);
    if (message.includes("Canceled")) return "";
    return message.includes("draft_transcript_empty") ? t.draft.exportEmpty : t.draft.exportFailed;
  };
  const Note = ({step}) => note?.step === step ? <Line tone={note.tone}>{note.text}</Line> : null;
  // A disabled button takes no click, so it lands on this wrapper and says why.
  const Explain = ({children, why, onClick}) => <span title={why} style={{display:"inline-flex",gap:6}} onClick={onClick}>{children}</span>;
  const run = (label, disabled, onClick) => <ui.Button variant="secondary" disabled={busy || disabled} onClick={onClick}>{label}</ui.Button>;
  const sourceCount = count => interpolate(count === 1 ? t.sourceCount_one : t.sourceCount_other, {count});
  return <ui.Stack gap={4}>
    <label title={t.description} style={muted}>{t.folder}</label>
    <ui.Select label="" value={shoot?.name || null} placeholder={t.chooseFolder} options={shoots.map(s => ({value:s.name,label:s.name}))} disabled={busy || !shoots.length} onChange={s => void select(s)} />
    <Line>{!pid ? t.noProject : !shoots.length ? t.noFolders : !shoot ? t.chooseHint : sourceCount(shoot.resourceIds.length)}</Line>
    <Note step="top"/>
    <Step number={1} title={t.analyze.title} description={t.analyze.description} actions={
      <Explain why={t.analyze.description}>
        {analysis.length
          ? run(t.groupSyncStop, analysis.some(w=>w.status === "canceling"), ()=>act("analyze", async()=>{for(const w of analysis) await script(`return await p.cancelAnalysis(${q({resourceId:w.resourceId,workflowId:w.workflowId})});`,true);}))
          : run(t.run, !shoot || !missing.length, ()=>act("analyze", ()=>script(`return await p.startAnalysis({resourceIds:${q(missing.map(r=>r.resourceId))}});`,true)))}
      </Explain>}>
      {!!media.length && (analysis.length
        ? <ui.Progress label={interpolate(t.analyze.progress,{count:media.length-missing.length,total:media.length})}/>
        : <Line>{interpolate(t.analyze.progress,{count:media.length-missing.length,total:media.length})}</Line>)}
      <Note step="analyze"/>
    </Step>
    <Step number={2} title={t.organize.title} description={t.organize.description} actions={
      <Explain why={t.organize.description} onClick={()=>{if (shoot?.alreadyOrganized && !busy) say("organize", interpolate(t.alreadyOrganized,{name:shoot.name}));}}>
        {run(t.run, !shoot?.unorganizedFolderId || !!analysis.length, ()=>act("organize", ()=>script(`return await p.jwonder.organizeShoot({folderId:${q(shoot.unorganizedFolderId)}});`,true), e => `${t.organize.failed} ${e.message || e}`))}
      </Explain>}>
      <Note step="organize"/>
    </Step>
    <Step number={3} title={t.classify.title} description={t.classify.description} actions={
      <Explain why={t.classify.description} onClick={()=>{if (classifyBlocked && !busy) say("classify", interpolate(t.classify[classifyBlocked],{name:shoot.name}));}}>
        {run(t.run, !shoot || !!classifyBlocked, ()=>act("classify", classify))}
      </Explain>}>
      <Note step="classify"/>
    </Step>
    <Step number={4} title={t.syncGroups.title} description={t.syncGroups.description} actions={
      <Explain why={t.syncGroups.description} onClick={()=>{if (!main && shoot && !busy) say("sync", t.timeline.none.main);}}>
        <span style={{display:"inline-flex"}} onClick={()=>{if (sync && sync.status !== "canceling" && !busy) act("sync", stopSync);}}>
          <ui.Button variant="secondary" busy={!!sync} busyLabel={sync && typeof sync.progress === "number" ? `${t.groupSyncRunning} ${Math.round(Math.min(1, Math.max(0, sync.progress)) * 100)}%` : t.groupSyncRunning} disabled={busy || !mainStored?.sequenceId} onClick={()=>act("sync", ()=>script(`return await p.syncSyncedTimelines([{sequenceId:${q(mainStored.sequenceId)},method:"waveform",addGroupGap:true}]);`,true))}>{t.run}</ui.Button>
        </span>
      </Explain>}>
      <ui.Select label="" placeholder={t.timeline.main} value={main?.resourceId || null} options={mains.map(s=>({value:s.resourceId,label:s.name}))} disabled={busy || !!sync || !mains.length} onChange={setMain}/>
      <Explain why={t.removeGaps.description} onClick={()=>{if (!main && shoot && !busy) say("sync", t.timeline.none.main);}}>
        <ui.Button variant="secondary" disabled={busy || !mainStored?.sequenceId || !!sync} onClick={()=>act("sync", ()=>script(`return await p.syncedTimeline(${q(mainStored.sequenceId)}).removeVacantRanges();`,true))}>{t.removeGaps.title}</ui.Button>
      </Explain>
      {reviewRows.length > 0 && <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {reviewRows.map(([group,dot]) => <button key={group} type="button" disabled={busy} onClick={()=>act("sync", ()=>script(`return await p.jwonder.reviewUnsynced(${q({group})});`))}
          style={{display:"flex",alignItems:"center",gap:8,width:"100%",minHeight:28,padding:"4px 8px",border:0,borderRadius:6,background:"transparent",color:"inherit",font:"inherit",fontSize:12,textAlign:"left",cursor:busy?"default":"pointer",opacity:busy?0.5:1}}>
          <span aria-hidden="true" style={{width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0}}/><span style={{flex:1,minWidth:0}}>{t.unsynced[group]}</span><span style={{opacity:0.65,fontVariantNumeric:"tabular-nums"}}>{review.counts[group]}</span>
        </button>)}
        <ui.Row>
          <ui.Button variant="secondary" disabled={busy} onClick={()=>act("sync", ()=>script(`return await p.jwonder.reviewUnsynced();`))}>{t.unsynced.review}</ui.Button>
          <ui.Button variant="primary" disabled={busy || review.resolveDisabled} onClick={()=>act("sync", ()=>script(`return await p.jwonder.resolveUnsynced();`, true))}>{t.unsynced.resolved}</ui.Button>
        </ui.Row>
      </div>}
      <Note step="sync"/>
    </Step>
    <Step number={6} title={t.draft.title} description={t.draft.description}>
      <ui.Select label="" placeholder={t.draft.choose} value={chosen?.value || null} options={choices.map(c=>({value:c.value,label:c.label}))} disabled={busy || !choices.length} onChange={value=>void select(shoot?.name || "",value)}/>
      <Explain why={t.draft.makeDescription} onClick={()=>{if (!source && shoot && !busy) say("draft", t.draft.none);}}>
        <ui.Button variant="secondary" busy={running === "make"} busyLabel={t.draft.making} disabled={busy || !source || sourceBusy} onClick={()=>act("draft", makeDraft, undefined, "make")}>{t.draft.make}</ui.Button>
      </Explain>
      <Explain why={t.draft.translateDescription} onClick={()=>{if (!busy && !draft) say("draft", !source ? t.draft.none : t.draft.needsDraft);}}>
        <span style={{display:"inline-flex"}} onClick={()=>{if (translating && !busy) act("draft", stopTranslation);}}>
          <ui.Button variant="secondary" busy={translating} busyLabel={translating ? t.draft.translating : undefined} disabled={busy || !draft} onClick={()=>act("draft", ()=>script(`return await p.jwonder.startTranslation(${q({sequenceId: draft.sequenceId, targetLanguage:"korean"})});`,true))}>{t.draft.translate}</ui.Button>
        </span>
      </Explain>
      {draft && (translation?.status === "failed"
        ? <Line tone="error">{translation.errorCode === "caption_translation_no_captions" ? interpolate(t.draft.noCaptions,{name:draft.name}) : t.draft.translateFailed}</Line>
        : <Line tone={translation?.status === "succeeded" ? "success" : "muted"}>{!translation ? t.status.notTranslated
            : translation.status === "running" ? (translation.totalCount > 0 ? interpolate(t.status.running, translation) : t.status.starting)
            : translation.status === "succeeded" ? interpolate(t.status.done, translation)
            : translation.status === "canceled" ? interpolate(t.status.stopped, translation)
            : interpolate(t.status.stored, {count: translation.completedCount})}</Line>)}
      <Explain why={t.draft.exportDescription} onClick={()=>{if (!busy && !draft) say("draft", !source ? t.draft.none : t.draft.needsDraft);}}>
        <ui.Button variant="secondary" busy={running === "export"} busyLabel={t.draft.exporting} disabled={busy || !draft} onClick={()=>act("draft", exportTranscript, exportFailure, "export")}>{t.draft.export}</ui.Button>
      </Explain>
      <Note step="draft"/>
    </Step>
  </ui.Stack>;
}
