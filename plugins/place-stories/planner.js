// Pure planning: source paths remain canonical across SDK sessions.
function planStory(story) {
  const pace = {quick:2.6, balanced:3.5, unhurried:4.5}[story.settings.pace] || 3.5;
  const places = story.places.filter(p => p.included);
  if (!places.length || places.length > 20) throw Error('Choose between 1 and 20 places.');
  const windows = places.map(p => p.picks.map(q => {
    const file = p.files.find(f => f.path === q.path);
    if (!file || !Number.isFinite(q.start) || !Number.isFinite(q.end) || q.start < 0 || q.end <= q.start || q.end > file.duration + 0.002) throw Error('A selected clip is outside its source range.');
    return {...q, available:q.end-q.start};
  }));
  const segments = []; let opening = null;
  if (story.settings.intro) {
    const total = windows[0].reduce((n,w) => n+w.available, 0);
    const candidate = windows[0].find(w => w.available >= 2.4 && total - 2.4 >= Math.min(pace,total));
    if (candidate) {
      opening = {path:candidate.path,start:candidate.end-2.4,end:candidate.end,place:-1,cropX:candidate.cropX??0.5,cropY:candidate.cropY??0.5};
      segments.push(opening);
      candidate.end -= 2.4;candidate.available -= 2.4;
    }
  }
  places.forEach((place,index) => {
    const pool = windows[index].filter(w => w.available >= 0.2);
    const total = pool.reduce((n,w) => n+w.available,0);
    let remaining = Math.min(pace,total);
    if (remaining < 1) throw Error('Each place needs at least one second of selected footage.');
    let cutsLeft = Math.min(2,pool.length);
    for (const w of pool) {
      if (remaining < 0.001) break;
      const take = Math.min(w.available, remaining / Math.max(1,cutsLeft));
      if (take > 0.01) segments.push({path:w.path,start:w.start,end:w.start+take,place:index,cropX:w.cropX??0.5,cropY:w.cropY??0.5});
      remaining -= take;cutsLeft = Math.max(1,cutsLeft-1);
    }
    if (remaining > 0.03) throw Error('There is not enough selected footage for a place.');
  });
  return {segments,places:places.map(p=>({id:p.id,name:p.name,description:p.description})),opening:!!opening,openingSkipped:!!story.settings.intro&&!opening,seconds:segments.reduce((n,s)=>n+s.end-s.start,0)};
}
