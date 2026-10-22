import fs from 'node:fs';
import vm from 'node:vm';
import {topLevel} from './windows_host.mjs';
const read=path=>fs.readFileSync(path,'utf8');
export function sdkFreeHelpersSource(){
 return [process.env.SDK_FREE_DRAFT_OBSERVATION_SOURCE||new URL('../shared/draft-observation.js',import.meta.url),process.env.SDK_FREE_FILE_OBSERVATION_SOURCE||new URL('../shared/file-observation.js',import.meta.url)]
  .map(file=>read(file).replace(/^export\s*\{[^}]*\};?\s*$/gm,'').replace(/^export /gm,'')).join('\n');
}
export function installSdkFreeHelpers(context){vm.runInContext(sdkFreeHelpersSource(),context);return context;}
export function vlogOperation(plugin,kind){
 const installed=read(new URL(`../plugins/${plugin}/scripts/${kind}.js`,import.meta.url)),body=read(new URL(`../plugins/${plugin}/dev/${kind}.template.js`,import.meta.url));
 const marker=kind==='verify-assembly'?'// Read-only admission of an already-owned historical assembly.':'const cfg = __CONFIG__;',at=installed.indexOf(marker);
 if(at<0)throw Error('Missing operation template marker');
 // Generated dependencies are replaced only in memory; installed files belong
 // to the parent. The source observer is SDK-safe and imported as a function.
 const observer=topLevel(sdkFreeHelpersSource(),'templateObservedSource');
 let dependencies=installed.slice(0,at);
 const authoring=read(process.env.SDK_FREE_AUTHORING_SOURCE||new URL('../shared/native-image-authoring.js',import.meta.url));
 if(dependencies.includes('function inspectImageAudio('))dependencies=dependencies.replace(topLevel(dependencies,'inspectImageAudio'),topLevel(authoring,'inspectImageAudio'));
 if(dependencies.includes('function templateObservedSource('))dependencies=dependencies.replace(topLevel(dependencies,'templateObservedSource'),observer);
 else dependencies+=observer+'\n';
 return dependencies+body;
}
export function savedSourceObservation(rows){return {revision:'fixture-observation',clips:rows.filter(r=>r.resourceId).map(r=>({clipId:r.clipId,trackId:r.trackId,trackKind:r.trackKind,resourceId:r.resourceId,startFrame:r.startFrame,endFrame:r.endFrame,source:{clipId:r.clipId,...r._source},playbackSpeed:r.playbackSpeed.numerator/r.playbackSpeed.denominator}))};}
