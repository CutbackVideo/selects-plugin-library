import {createHash} from 'node:crypto';
// Independent Node oracle for the published media-content v2 byte contract.
export function mediaFingerprint(bytes) {
 const size=bytes.length,sample=256*1024,scheme='cutback.media-content.v2';
 const ranges=size<=sample*3?[[0,size]]:[[0,sample],[Math.floor((size-sample)/2),sample],[size-sample,sample]];
 const hash=createHash('sha256').update(`${scheme}:${size}:`);
 for(const [offset,length] of ranges)hash.update(bytes.subarray(offset,offset+length));
 return {size,scheme,digest:hash.digest('hex')};
}
