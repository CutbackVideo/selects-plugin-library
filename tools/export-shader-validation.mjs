// JSON input for the native shader validator. Run after build-plugin-shaders.mjs.
import {cases} from '../shared/shader-effects/validation-cases.mjs';
import {xml} from '../shared/shader-effects/graph.mjs';
const rows=[];
for(const [index,{id,kind,data}] of cases.entries()){
 const {PLUGIN_SHADER_OPTIONS}=await import(`../shared/shader-effects/generated/${id}.mjs`);
 const options=Function('return '+PLUGIN_SHADER_OPTIONS)();
 const shader=options(kind,{parameters:data},{fps:30}).shader;
 const graph=structuredClone(shader.graph);
 for(const image of graph.images||[]){const bindings=new Map((shader.svgParameters||[]).filter(b=>b.image===image.id).map(b=>[b.token,xml(data[b.parameter])]));if(image.svg)image.svg=image.svg.replace(/__PARAM_[A-Z0-9_]+?__/g,token=>bindings.get(token)??token);}
 rows.push({name:`${id}/${kind}/${index}`,graph,frames:[0,1,2,15,30,59,90,118,119]});
}
process.stdout.write(JSON.stringify(rows));
