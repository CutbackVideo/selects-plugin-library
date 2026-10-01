#!/usr/bin/env python3
"""Prepare a fixed-style Selects photo edit; block poor sticker masks."""
import argparse, json, subprocess, hashlib, random, shutil
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageStat, ImageChops

W,H=1080,1920
BASE=15
BASE_EDGES=(0,40,72,104,140,196,220,235,267,283,307,337,371,401,436,478)
REFERENCE_EDGES=(0,40,72,104,140,156,196,220,235,243,267,283,307,337,347,371,401,411,436,478)
STICKERS=11
STYLES=("clean","handdrawn","offset","none")
# General edit, measured frame by frame on the approved reference (30 fps, 478 frames).
# Photos change only at these frames; stickers land on the photo already on screen.
PHOTO_EDGES=(0,40,72,104,140,196,220,235,243,283,307,337,347,371,411,478)
# The first four stickers are the people of the NEXT scene photo, entering at their own
# position; the cut then reveals that photo, which keeps the same outline.
INTRO_CUES=((29,40,"up","clean"),(61,72,"right","handdrawn"),(93,104,"left","offset"),(132,140,"down","clean"))
# The same "next photo's people arrive first" move, reused mid-video so that no more than
# two photos pass without a sticker: (scene slot the photo is revealed in, start, end, direction, style).
PREVIEW_CUES=((7,227,235,"left","clean"),(13,363,371,"up","handdrawn"))
# Later stickers come from separate photos. Box = target area (left, top, right, bottom) as
# fractions of the frame, read from the reference. Listed bottom layer first.
LATE_CUES=((156,166,"instant",(.05,.27,.92,.99),1),
           (166,196,"instant",(.47,.15,.98,.52),1),
           (166,196,"instant",(.03,.32,.66,.99),2),
           (177,196,"instant",(.42,.40,.98,.99),3),
           (267,283,"instant",(.07,.53,.77,.99),4),
           (324,337,"instant",(.15,.42,.84,.87),5),
           (401,411,"instant",(.14,.50,.70,.97),6),
           (436,457,"up",(.02,.53,.98,.99),7),
           (457,478,"fade",(.12,.20,.88,.99),8))
LATE_STYLES=("offset","clean","clean","clean","none","clean","clean","none")
INDEPENDENT=8
# Scenes (1-based) that never carry a sticker over their own photo; close-ups go here.
PLAIN_SLOTS=(6,10,12)

def place(layer,box):
    """Scale and move a full-frame sticker so its subject fills the target box (bottom-anchored when the box reaches the floor)."""
    bx0,by0,bx1,by1=layer.getchannel("A").point(lambda v:255 if v>=128 else 0).getbbox() or (0,0,W,H)
    tx0,ty0,tx1,ty1=box[0]*W,box[1]*H,box[2]*W,box[3]*H
    s=max(.3,min(1.3,min((tx1-tx0)/max(1,bx1-bx0),(ty1-ty0)/max(1,by1-by0))))
    x=(tx0+tx1)/2-W/2-s*((bx0+bx1)/2-W/2)
    y=(ty1-H/2-s*(by1-H/2)) if box[3]>=.97 else ((ty0+ty1)/2-H/2-s*((by0+by1)/2-H/2))
    return round(x),round(y),round(s,3)

def run(args):
    r=subprocess.run(args,capture_output=True,text=True)
    if r.returncode: raise RuntimeError((r.stderr or r.stdout).strip())

def photo_fingerprint(frame):
    gray=ImageOps.grayscale(frame).resize((9,8),Image.Resampling.LANCZOS)
    pix=list(gray.getdata())
    bits=sum(1<<i for i in range(64) if pix[(i//8)*9+i%8]>pix[(i//8)*9+i%8+1])
    tiny=frame.resize((32,32),Image.Resampling.BILINEAR)
    return bits,tiny

def near_duplicate(fingerprint,previous):
    bits,tiny=fingerprint
    for old_bits,old_tiny in previous:
        if bin(bits^old_bits).count('1')>3:continue
        difference=ImageStat.Stat(ImageChops.difference(tiny,old_tiny)).mean
        if sum(difference)/len(difference)<12:return True
    return False

def quality(mask):
    m=mask.point(lambda v: 255 if v>=128 else 0)
    stat=lambda box: ImageStat.Stat(m.crop(box)).mean[0]/255
    area=stat((0,0,W,H))
    left=stat((0,0,9,H)); right=stat((W-9,0,W,H)); top=stat((0,0,W,9))
    corner=max(stat(b) for b in [(0,0,60,60),(W-60,0,W,60),(0,H-60,60,H),(W-60,H-60,W,H)])
    box=m.getbbox() or (0,0,W,H)
    return .045<=area<=.82 and max(left,right)<.035 and top<.025 and corner<.04, dict(area=round(area,3),left=round(left,3),right=round(right,3),top=round(top,3),corner=round(corner,3),box=[round(box[0]/W,3),round(box[1]/H,3),round(box[2]/W,3),round(box[3]/H,3)])

def handdrawn_edge(mask):
    # A cut-paper silhouette: uneven width, but a fully opaque, crisp edge.
    # Seeding from the mask keeps re-renders of the same photo identical.
    seed=int.from_bytes(hashlib.sha256(mask.resize((64,64)).tobytes()).digest()[:8],"big")
    rng=random.Random(seed)
    coarse=Image.frombytes("L",(64,114),rng.randbytes(64*114))
    coarse=coarse.resize((W,H),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(5))
    medium=coarse.point(lambda v: max(0,min(255,(v-90)*8)))
    wide=coarse.point(lambda v: max(0,min(255,(v-145)*8)))
    solid=mask.point(lambda v: 255 if v>=128 else 0)
    narrow=solid.filter(ImageFilter.MaxFilter(11))
    normal=solid.filter(ImageFilter.MaxFilter(17))
    broad=solid.filter(ImageFilter.MaxFilter(23))
    edge=Image.composite(broad,normal,wide)
    edge=Image.composite(edge,narrow,medium)
    return edge.point(lambda v: 255 if v>=128 else 0)

def paper_color(edge):
    seed=int.from_bytes(hashlib.sha256(edge.resize((64,64)).tobytes()).digest()[:8],"big")
    rng=random.Random(seed)
    grain=Image.frombytes("L",(540,960),bytes(245+b%11 for b in rng.randbytes(540*960)))
    grain=grain.resize((W,H),Image.Resampling.BILINEAR)
    return Image.merge("RGBA",(grain,grain,grain.point(lambda v: v-5),edge))

def compose(frame,mask,style):
    result=Image.new("RGBA",(W,H),(0,0,0,0))
    if style!="none":
        edge=handdrawn_edge(mask) if style=="handdrawn" else mask.filter(ImageFilter.MaxFilter(23))
        if style=="offset":
            edge=ImageChops.offset(edge,-7,-2)
            edge.paste(0,(W-8,0,W,H)); edge.paste(0,(0,H-3,W,H))
        white=paper_color(edge) if style=="handdrawn" else Image.new("RGBA",(W,H),(255,255,255,0))
        if style!="handdrawn": white.putalpha(edge)
        result.alpha_composite(white)
    person=frame.convert("RGBA"); person.putalpha(mask.filter(ImageFilter.GaussianBlur(.7)))
    result.alpha_composite(person)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",action="append",required=True)
    p.add_argument("--sticker",action="append",default=[])
    p.add_argument("--output",required=True)
    p.add_argument("--masker",required=True)
    p.add_argument("--bgm",required=True)
    p.add_argument("--reference-master")
    p.add_argument("--reference-manifest")
    a=p.parse_args()
    reference=bool(a.sticker)
    out=Path(a.output).resolve(); out.mkdir(parents=True,exist_ok=False)
    if reference and a.reference_master and a.reference_manifest:
        manifest=json.loads(Path(a.reference_manifest).read_text())
        supplied={Path(path).name:hashlib.sha256(Path(path).read_bytes()).hexdigest()
                  for path in a.input+a.sticker}
        if supplied!=manifest:
            raise ValueError("The reference photo and sticker set differs from the approved one. Use other photos through the general edit.")
        master=Path(a.reference_master).resolve()
        if not master.is_file(): raise FileNotFoundError(master)
        exact=out/"approved-output.mp4"
        shutil.copyfile(master,exact)
        editable=out/(out.name+"-editable")
        run(["python3",str(Path(__file__).with_name("editable_reference.py")),
             "--master",str(master),
             "--assets",str(Path(__file__).with_name("approved-assets")),
             "--out",str(editable)])
        print(json.dumps(dict(ready=True,exactReference=True,outputDir=str(out),
                              outputVideo=str(exact),editableDir=str(editable),editableFolder=editable.name,
                              base=len(a.input),stickers=len(a.sticker)),ensure_ascii=False))
        return
    photos=[]; rejected=[]; seen=set(); fingerprints=[]
    for path in a.input:
        src=Path(path).resolve()
        try:
            digest=hashlib.sha256(src.read_bytes()).hexdigest()
            if digest in seen and not reference: raise ValueError("duplicate photo")
            seen.add(digest)
            with Image.open(src) as im:
                im=ImageOps.exif_transpose(im)
                if im.height<=im.width: raise ValueError("landscape photo")
                if im.width<640 or im.height<900: raise ValueError("resolution too low")
                frame=ImageOps.fit(im.convert("RGB"),(W,H),method=Image.Resampling.LANCZOS)
            if not reference:
                fingerprint=photo_fingerprint(frame)
                if near_duplicate(fingerprint,fingerprints):raise ValueError("near-duplicate photo")
                fingerprints.append(fingerprint)
            photos.append((src,frame))
        except Exception as e: rejected.append(dict(name=src.name,reason=str(e)[:120]))
    if len(photos)<BASE:
        print(json.dumps(dict(ready=False,base=len(photos),stickers=0,needBase=BASE,needStickers=STICKERS,rejected=rejected),ensure_ascii=False)); return
    if reference and (len(photos)!=19 or len(a.sticker)!=12):
        raise ValueError("Reference set needs 19 scene photos and 12 approved sticker layers")
    good=[]; rows=[]
    for i,(src,frame) in enumerate(photos,1):
        base=out/f"{i:02d}-base.jpg"; frame.save(base,quality=93)
        if reference:
            rows.append(dict(index=i,name=src.name,stickerReady=False,approvedLayer=True))
            continue
        maskfile=out/f".{i:02d}-mask.png"
        try:
            run([a.masker,str(base),str(maskfile)])
            with Image.open(maskfile) as im: mask=im.convert("L").resize((W,H),Image.Resampling.BICUBIC)
            ok,metrics=quality(mask)
            if ok: good.append((i,frame,mask))
            rows.append(dict(index=i,name=src.name,stickerReady=ok,**metrics))
        except Exception as e: rows.append(dict(index=i,name=src.name,stickerReady=False,reason=str(e)[:120]))
        finally: maskfile.unlink(missing_ok=True)
    if not reference:
        good_ids=[item[0] for item in good]; by_id={item[0]:item for item in good}
        # The closing fade-in sticker is the one optional layer: with one clean cutout short,
        # the sticker before it simply stays to the end.
        independent_n=INDEPENDENT-(1 if len(good_ids)==len(INTRO_CUES)+len(PREVIEW_CUES)+INDEPENDENT-1 else 0)
        late_cues=LATE_CUES if independent_n==INDEPENDENT else tuple(
            (a,478 if n==INDEPENDENT-1 else b,d,box,n) for a,b,d,box,n in LATE_CUES if n<INDEPENDENT)
        need_good=len(INTRO_CUES)+len(PREVIEW_CUES)+independent_n; need_total=BASE+independent_n
        if len(good_ids)<need_good or len(photos)<need_total:
            print(json.dumps(dict(ready=False,base=len(photos),stickers=len(good_ids),needBase=need_total,needStickers=need_good,rejected=rejected,rows=rows),ensure_ascii=False)); return
        independent=good_ids[-independent_n:]
        pool=[i for i in good_ids if i not in independent]
        intro=pool[:len(INTRO_CUES)]
        previews=pool[len(INTRO_CUES):len(INTRO_CUES)+len(PREVIEW_CUES)]
        others=[i for i in range(1,len(photos)+1) if i not in independent and i not in intro and i not in previews]
        area=lambda i: next((r.get("area",1) for r in rows if r["index"]==i),1)
        plain=sorted(others[1:],key=area,reverse=True)[:len(PLAIN_SLOTS)]
        rest=[i for i in others if i not in plain]
        base_ids=[None]*BASE
        for k,i in enumerate(intro): base_ids[k+1]=i                         # slots 2-5
        for (slot,*_),i in zip(PREVIEW_CUES,previews): base_ids[slot]=i      # revealed in the slot after
        for slot,i in zip(PLAIN_SLOTS,plain): base_ids[slot-1]=i
        fill=iter(rest)
        base_ids=[i if i is not None else next(fill) for i in base_ids]
        layers={}
        def outline(i,style):
            _,frame,mask=by_id[i]
            layers[i]=compose(frame,mask,style)
            # The revealed photo keeps the outline its sticker arrived with.
            shown=frame.convert("RGBA"); shown.alpha_composite(layers[i])
            shown.convert("RGB").save(out/f"{i:02d}-base.jpg",quality=93)
        for k,i in enumerate(intro): outline(i,INTRO_CUES[k][3])
        for (slot,start,end,direction,style),i in zip(PREVIEW_CUES,previews): outline(i,style)
        cues=[]; files=[]
        for k,i in enumerate(intro):
            name=f"{len(files)+1:02d}-sticker.mov"; files.append((name,layers[i],i))
            start,end,direction,_=INTRO_CUES[k]
            cues.append(dict(start=start,end=end,dir=direction,x=0,y=0,s=1,file=name))
        for (slot,start,end,direction,_),i in zip(PREVIEW_CUES,previews):
            name=f"{len(files)+1:02d}-sticker.mov"; files.append((name,layers[i],i))
            cues.append(dict(start=start,end=end,dir=direction,x=0,y=0,s=1,file=name))
        late_files={}
        for n,i in enumerate(independent,1):
            _,frame,mask=by_id[i]
            layer=compose(frame,mask,LATE_STYLES[n-1])
            name=f"{len(files)+1:02d}-sticker.mov"; files.append((name,layer,i)); late_files[n]=(name,layer)
        for start,end,direction,box,n in late_cues:
            name,layer=late_files[n]; x,y,scale=place(layer,box)
            cues.append(dict(start=start,end=end,dir=direction,x=x,y=y,s=scale,file=name))
        for j,(name,layer,i) in enumerate(files,1):
            png=out/f".{j:02d}-sticker.png"; layer.save(png)
            # ProRes 4444: Selects ignores VP9 WebM alpha and shows black behind the sticker.
            run(["ffmpeg","-y","-v","error","-loop","1","-framerate","30","-i",str(png),"-t","2","-an","-c:v","prores_ks","-profile:v","4444","-pix_fmt","yuva444p10le","-alpha_bits","16",str(out/name)])
            png.unlink()
            rows[i-1]["stickerNumber"]=j
        for slot,i in enumerate(base_ids):
            frames=PHOTO_EDGES[slot+1]-PHOTO_EDGES[slot]+(8 if slot==BASE-1 else 0)
            run(["ffmpeg","-y","-v","error","-loop","1","-framerate","30","-i",str(out/f"{i:02d}-base.jpg"),"-frames:v",str(frames),"-an","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart","-f","mp4",str(out/f"{slot+1:02d}-base.mp4.tmp")])
            rows[i-1]["baseSlot"]=slot+1
        for i in range(1,len(photos)+1): (out/f"{i:02d}-base.jpg").unlink(missing_ok=True)
        for tmp in out.glob("*-base.mp4.tmp"): tmp.rename(tmp.with_suffix(""))
        bgm=Path(a.bgm).resolve()
        if not bgm.is_file(): raise FileNotFoundError(bgm)
        (out/"fixed-bgm.mp3").write_bytes(bgm.read_bytes())
        spot=dict(x=.5,y=.33)
        r6=next((r for r in rows if r["index"]==base_ids[5]),{})
        if r6.get("box"): bx0,by0,bx1,by1=r6["box"]; spot=dict(x=round((bx0+bx1)/2,3),y=round(by0+(by1-by0)*.16,3))
        print(json.dumps(dict(ready=True,outputDir=str(out),folder=out.name,base=BASE,stickers=len(files),approvedStickers=False,cues=cues,spot=spot,rows=rows,rejected=rejected),ensure_ascii=False))
        return
    # A sticker cut from its own background photo creates a duplicate subject, so
    # stickers and scenes use different photos. Stickers may come from any photo
    # that cuts out cleanly (latest first); scenes take the remaining photos in order.
    if reference:
        sticker_candidates=good
        base_ids=list(range(1,len(photos)+1))
    else:
        sticker_ids=set(sorted((item[0] for item in good),reverse=True)[:STICKERS])
        sticker_candidates=[item for item in good if item[0] in sticker_ids]
        base_ids=[i for i in range(1,len(photos)+1) if i not in sticker_ids][:BASE]
        if len(sticker_candidates)<STICKERS or len(base_ids)<BASE:
            print(json.dumps(dict(ready=False,base=len(base_ids),stickers=len(sticker_candidates),needBase=BASE,needStickers=STICKERS,rejected=rejected,rows=rows),ensure_ascii=False)); return
    edges=REFERENCE_EDGES if reference else BASE_EDGES
    for slot,i in enumerate(base_ids):
        jpg=out/f"{i:02d}-base.jpg"
        mp4=out/f"{slot+1:02d}-base.mp4.tmp"
        frames=edges[slot+1]-edges[slot]+(8 if slot==len(edges)-2 else 0)
        run(["ffmpeg","-y","-v","error","-loop","1","-framerate","30","-i",str(jpg),"-frames:v",str(frames),"-an","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart","-f","mp4",str(mp4)])
        if not reference: rows[i-1]["baseSlot"]=slot+1
    for i in range(1,len(photos)+1): (out/f"{i:02d}-base.jpg").unlink(missing_ok=True)
    for tmp in out.glob("*-base.mp4.tmp"): tmp.rename(tmp.with_suffix(""))
    sticker_count=len(a.sticker) if reference else STICKERS
    for j in range(1,sticker_count+1):
        png=out/f".{j:02d}-sticker.png"
        if reference:
            with Image.open(a.sticker[j-1]) as im:
                if im.mode!='RGBA' or im.getchannel('A').getextrema()[0]!=0:
                    raise ValueError(f"Approved sticker {j} needs transparency")
                im.resize((W,H),Image.Resampling.LANCZOS).save(png)
        else:
            idx,frame,mask=sticker_candidates[j-1]
            style=STYLES[(j-1)%4]
            compose(frame,mask,style).save(png)
        # ProRes 4444: Selects ignores VP9 WebM alpha and shows black behind the sticker.
        movie=out/f"{j:02d}-sticker.mov"
        run(["ffmpeg","-y","-v","error","-loop","1","-framerate","30","-i",str(png),"-t","2","-an","-c:v","prores_ks","-profile:v","4444","-pix_fmt","yuva444p10le","-alpha_bits","16",str(movie)])
        png.unlink()
        if not reference: rows[idx-1]["stickerNumber"]=j; rows[idx-1]["style"]=style
    bgm=Path(a.bgm).resolve()
    if not bgm.is_file(): raise FileNotFoundError(bgm)
    (out/"fixed-bgm.mp3").write_bytes(bgm.read_bytes())
    print(json.dumps(dict(ready=True,outputDir=str(out),folder=out.name,base=len(photos) if reference else BASE,stickers=sticker_count,approvedStickers=reference,rows=rows,rejected=rejected),ensure_ascii=False))
if __name__=="__main__": main()
