import {Graph,parameters,choice,f32,number,xml} from './graph.mjs';

// Postcard's foreground media already carries the prepared alpha. Its previous
// CSS mask applied that matte a second time; preserve those soft-edge alphas.
export function postcardMatte(data=null){data=data||{};const g=new Graph(data),p=parameters(data,{sourceStartSeconds:0,maskFps:30,count:1});const white=choice(p,data,'white',{true:1,false:0},false);g.pass(`let i=round((uniforms.clock.z+${p.refs.sourceStartSeconds})*${p.refs.maskFps});if(i<0.0||i>=${p.refs.count}){return vec4f(0.0);}let c=source(uv);let alpha=c.a*c.a;return select(c*c.a,vec4f(vec3f(alpha),alpha),${white}>.5);`,p);return g.finish();}

export function imageMatte(data=null){data=data||{};if(typeof data.maskDataUrl!=='string'||!/^data:image\/(png|avif);base64,[a-zA-Z0-9+/=]+$/.test(data.maskDataUrl))throw Error('Missing embedded matte');const g=new Graph(data);const image=g.image(`<svg xmlns="http://www.w3.org/2000/svg" width="${number(data.width,1)}" height="${number(data.height,1)}"><image width="100%" height="100%" preserveAspectRatio="none" href="${xml(data.maskDataUrl)}"/></svg>`);g.pass('let mask=textureSampleLevel(input1,linearSampler,uv,0.0);return source(uv)*dot(mask.rgb,vec3f(.2126,.7152,.0722));',{inputs:['source',image]});return g.finish();}

export function alphaForeground(data=null){data=data||{};const g=new Graph(data),p=parameters(data,{opacity:1});g.pass(`return source(uv)*sat(${p.refs.opacity});`,p);return g.finish();}

// A packed source is [original RGB | luminance mask], with both halves on the
// same video clock. Clamp each half independently to prevent seam interpolation.
export function packedMatte(data=null){data=data||{};const g=new Graph(data),p=parameters(data,{opacity:1});g.pass(`let size=vec2f(textureDimensions(input0));let left=clamp(vec2f(uv.x*.5,uv.y),.5/size,vec2f(.5-.5/size.x,1.0-.5/size.y));let right=clamp(vec2f(.5+uv.x*.5,uv.y),vec2f(.5+.5/size.x,.5/size.y),1.0-.5/size);let c=textureSampleLevel(input0,linearSampler,left,0.0);let mask=textureSampleLevel(input0,linearSampler,right,0.0);return c*sat(dot(straight(mask).rgb,vec3f(.2126,.7152,.0722)))*sat(${p.refs.opacity});`,p);return g.finish();}
