// A no-generation observation pass on the open Draft. No Draft edits or paid media operations.
import React, {useEffect,useRef,useState} from "react";
import {dataRoot,fs,requireSharedAiHost} from "./pipeline/host";
import {readReel} from "./pipeline/reel";
import {trackFaces,reelShots} from "./pipeline/faces";
import {cancelFaceJobs,newFacePass} from "./pipeline/sharedFaceJobs";

export default function FaceStage({sdk,context,ui:U}:any) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const scope=useRef<any>(null),active=useRef<any>(null),running=useRef(false);
  const projectId=context?.projectId,sequenceId=context?.sequenceId;
  const dir=()=>fs().join(dataRoot(),"face-passes",projectId,sequenceId);
  useEffect(()=>{
    const token={projectId,sequenceId};scope.current=token;
    running.current=false;setBusy(false);setMessage("");setError("");
    return ()=>{ if(scope.current===token)scope.current=null; active.current?.abort(); };
  },[projectId,sequenceId]);
  const run=async(fresh=false)=>{
    if(running.current||!projectId||!sequenceId)return;
    running.current=true;
    const token=scope.current,ac=new AbortController();active.current=ac;
    const current=()=>scope.current===token;
    setBusy(true);setError("");
    try {
      requireSharedAiHost();
      const folder=dir();fs().mkdirSync(folder,{recursive:true});
      if(fresh)await newFacePass(folder,ac.signal);
      const reel=await readReel(sdk,projectId,sequenceId);
      if(!reel.clips.some(c=>c.path&&c.srcStart>=0))throw new Error("This Draft has no direct video Main clip with a known source in-point. Analyze its transcript first.");
      const faces=await trackFaces(sdk,projectId,folder,reel.clips,reel.fps,s=>current()&&setMessage(s),ac.signal);
      const shots=reelShots(1080,1920,reel.fps,reel.clips,faces);
      if(current())setMessage("Face pass complete: "+shots.filter(s=>s.face).length+"/"+shots.length+" shots have a speaker. Shot tracking, source color and framing results are saved. No Draft edits were committed.");
    }catch(e:any){if(current())setError(String(e?.message||e));}
    finally{if(active.current===ac)active.current=null;if(current()){running.current=false;setBusy(false);}}
  };
  const cancel=async()=>{
    const token=scope.current;
    try{requireSharedAiHost();await cancelFaceJobs(sdk,dir(),projectId);if(scope.current===token)setMessage("Saved face jobs canceled. Start a new face pass to retry.");}
    catch(e:any){if(scope.current===token)setError(String(e?.message||e));}
  };
  if(!U)return null;
  return <U.Section title="Shared face tracking"><U.Stack gap={8}>
    <U.Message>Run only the existing face, shot and source-color stage on this Draft. It uses the installed shared AI runtime and does not generate paid media. Closing the panel detaches observation; recover the same saved pass when reopening.</U.Message>
    <U.Actions><U.Button disabled={busy||!projectId||!sequenceId} busy={busy} onClick={()=>run(false)}>Run or recover face pass</U.Button>
      <U.Button variant="secondary" disabled={busy||!projectId||!sequenceId} onClick={()=>run(true)}>Start new face pass</U.Button>
      <U.Button variant="secondary" disabled={!projectId||!sequenceId} onClick={cancel}>Cancel saved face jobs</U.Button></U.Actions>
    {message&&<U.Message>{message}</U.Message>}{error&&<U.Message tone="destructive">{error}</U.Message>}
  </U.Stack></U.Section>;
}
