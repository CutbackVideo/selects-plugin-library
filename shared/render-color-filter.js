// RGB-only grades share a stable source surface and preserve original coverage.
// The caller owns its color policy and supplies a graph from input to output.
function useColorFilter(React,{AbsoluteFill,Source,children,idPrefix,enabled,render}){
 // React's document identity is independent of settings and compiled programs.
 // Older React callers retain an entropy-backed per-mount fallback, not a module
 // counter that can restart when a second independently compiled program loads.
 const token=typeof React.useId==='function'?React.useId():React.useMemo(()=>{
  if(!globalThis.crypto?.getRandomValues)throw Error('Color filter identity is unavailable.');
  return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
 },[]);
 const id=idPrefix+'-'+Array.from(token,c=>c.codePointAt(0).toString(16)).join('-');
 const h=React.createElement,input='colorInput',output='colorOutput';
 return h(AbsoluteFill,null,
  h('svg',{width:0,height:0,'aria-hidden':true,style:{position:'absolute',width:0,height:0}},
   h('defs',null,enabled?h('filter',{id,x:0,y:0,width:'100%',height:'100%',colorInterpolationFilters:'sRGB'},
    // Color matrices read unpremultiplied RGB. Grade an opaque copy so arithmetic
    // additions cannot multiply the source alpha or darken translucent colors.
    h('feColorMatrix',{in:'SourceGraphic',type:'matrix',values:'1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1',result:input}),
    render(input,output),
    h('feComposite',{in:output,in2:'SourceGraphic',operator:'in'})
   ):null)),
  // Keep both container positions even when disabled. Only the filter changes;
  // the original Source/children stay mounted until their real owner retires.
  h(AbsoluteFill,{style:enabled?{filter:'url(#'+id+')'}:undefined},Source?h(Source):children)
 );
}
