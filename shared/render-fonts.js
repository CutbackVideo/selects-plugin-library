// Render-document font readiness, independent of panel/file/media job lifetimes.
// React and the render gate are supplied by the standalone program's host.
function useRenderFonts(React, options){
 const {fonts=[],wideText='',wideFont='',label='graphic fonts',delayRender,continueRender,cancelRender,timeoutMs=20000}=options??{};
 if(!Array.isArray(fonts)||typeof wideText!=='string'||typeof wideFont!=='string'||typeof label!=='string'||
  !Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>2147483647||[delayRender,continueRender,cancelRender].some(fn=>typeof fn!=='function'))throw Error('The graphic font preparation request is invalid.');
 const faces=fonts.map(face=>{
  if(!face||typeof face.family!=='string'||!face.family||typeof face.b64!=='string'||!face.b64||!['string','number'].includes(typeof face.weight)||face.style!==undefined&&typeof face.style!=='string')throw Error('The graphic font source is invalid.');
  return {family:face.family,weight:face.weight,style:face.style||'normal',b64:face.b64};
 });
 const key=JSON.stringify([faces,wideText,wideText?wideFont:'']);
 const needed=faces.length>0||!!wideText;
 const fontSet=typeof document!=='undefined'?document.fonts:null;
 const request=React.useMemo(()=>Object({key}),[key,fontSet,label,timeoutMs,delayRender,continueRender,cancelRender]);
 const [result,setResult]=React.useState(null),owner=React.useRef(null);
 // Allocate only after commit. StrictMode/discarded renders must not leak gates.
 React.useLayoutEffect(()=>{
  if(!needed)return;
  const scope=Object({live:true,settled:false,released:false,handle:null,timer:null,release:null});
  owner.current=scope;
  const issue=(message,cause)=>Object.assign(Error(message),cause?{cause}:{});
  const cancel=error=>{try{cancelRender(error);}catch{/* Remotion records cancellation before throwing. */}};
  const fail=error=>{
   if(!scope.live||scope.settled)return;
   scope.settled=true;clearTimeout(scope.timer);
   cancel(error);setResult({request,error});
  };
  scope.release=()=>{
   if(scope.released||scope.handle===null)return;
   scope.released=true;
   try{continueRender(scope.handle);}catch(cause){const error=issue('The graphic font render gate could not be released.',cause);cancel(error);if(scope.live)setResult({request,error});}
  };
  try{
   const handle=delayRender(label);
   if(typeof handle!=='number'||!Number.isFinite(handle))throw issue('The graphic font render gate is unavailable.');
   scope.handle=handle;
   const load=fontSet?.load;
   if(typeof load!=='function')throw issue('This renderer cannot confirm graphic font readiness.');
   const expires=performance.now()+timeoutMs,expired=()=>issue('The graphic fonts took too long to prepare.');
   scope.timer=setTimeout(()=>fail(expired()),timeoutMs);
   const specs=faces.map(face=>[face.style+' '+face.weight+' 100px "'+face.family+'"']);
   if(wideText)specs.push([wideFont,wideText]);
   // Attach rejection handlers before invoking a host API that can throw.
   const loads=specs.map(args=>Promise.resolve().then(()=>{
    if(!scope.live||scope.settled)return;
    return load.apply(fontSet,args);
   }));
   Promise.all(loads).then(results=>{
    if(!scope.live||scope.settled)return;
    if(performance.now()>=expires){fail(expired());return;}
    if(results.some(value=>!Array.isArray(value)))throw issue('The graphic font readiness result is invalid.');
    scope.settled=true;clearTimeout(scope.timer);setResult({request,error:null});
   }).catch(cause=>fail(issue('The graphic fonts could not be prepared.',cause)));
  }catch(error){fail(error);}
  return ()=>{
   scope.live=false;clearTimeout(scope.timer);scope.release();
   if(owner.current===scope)owner.current=null;
  };
 },[request]);
 const current=result?.request===request?result:null,ready=!needed||!!current&&!current.error;
 // Release after the ready layout/measurement has committed, never on load ack.
 React.useLayoutEffect(()=>{
  if(ready)owner.current?.release();
 },[ready,request]);
 if(current?.error)throw current.error;
 return ready;
}
