// Pure planning: source paths remain canonical across SDK sessions.
// Every length is a whole number of beats of the theme music (92 BPM), so
// place cuts land on its beats: the opening and a Quick-pace place are one
// bar each, and the cuts inside a place fall on beats too.
const PLAN_BPM = 92;
const PLAN_BEAT = 60 / PLAN_BPM;
const PLAN_BAR = 4 * PLAN_BEAT;
const PLACE_BEATS = {quick:4, balanced:6, unhurried:7};
const CUT_BEATS = {quick:[1,1,2], balanced:[2,4], unhurried:[3,4]};

// Clips (in their chosen order) and slot lengths that fit together: the
// pattern's own order first, then its other orders, then other clips of the
// place. Falls back to the first clips when nothing fits.
function fitSlots(pool, pattern) {
  const orders = list => list.length <= 1 ? [list] : list.flatMap((x,i) => orders([...list.slice(0,i), ...list.slice(i+1)]).map(rest => [x, ...rest]));
  const choose = (list, k) => k === 0 ? [[]] : list.flatMap((x,i) => choose(list.slice(i+1), k-1).map(rest => [x, ...rest]));
  const fits = (clips, slots) => clips.every((w,i) => w.available + 0.001 >= slots[i] * PLAN_BEAT);
  for (const clips of choose(pool, pattern.length))
    for (const slots of orders(pattern))
      if (fits(clips, slots)) return {clips:[...clips, ...pool.filter(w => !clips.includes(w))], slots};
  return {clips:pool, slots:pattern};
}

function planStory(story) {
  const fail = message => typeof issue === 'function' ? issue(message) : Error(message);
  const pace = story.settings.pace in PLACE_BEATS ? story.settings.pace : 'balanced';
  const places = story.places.filter(p => p.included);
  if (!places.length || places.length > 20) throw fail('Choose between 1 and 20 places.');
  const windows = places.map(p => p.picks.map(q => {
    const file = p.files.find(f => f.path === q.path);
    if (!file || !Number.isFinite(q.start) || !Number.isFinite(q.end) || q.start < 0 || q.end <= q.start || q.end > file.duration + 0.002) throw fail('A selected clip is outside its source range.');
    return {...q, available:q.end-q.start};
  }));
  const segments = []; let opening = null;
  if (story.settings.intro) {
    const first = windows[0];
    const candidates = first.map((w,i) => ({w,i})).filter(({w,i}) => w.available >= PLAN_BAR && first.some((other,j) => j !== i && other.path !== w.path && other.available >= 1));
    const chosen = candidates[candidates.length - 1];
    if (chosen) {
      const candidate = chosen.w;
      opening = {path:candidate.path,start:candidate.end-PLAN_BAR,end:candidate.end,place:-1,cropX:candidate.cropX??0.5,cropY:candidate.cropY??0.5};
      segments.push(opening);
      windows[0] = first.filter((_,i) => i !== chosen.i);
    }
  }
  places.forEach((place,index) => {
    const pool = windows[index].filter(w => w.available >= 0.2);
    const total = pool.reduce((n,w) => n+w.available,0);
    // A place short of footage keeps whole beats, so it stays on the grid.
    const beats = Math.min(PLACE_BEATS[pace], Math.floor((total + 0.001) / PLAN_BEAT));
    if (beats * PLAN_BEAT < 1) throw fail('Each place needs at least one second of selected footage.');
    // One slot per available clip, up to the pace's pattern; fewer clips share
    // the beats evenly, the last taking any remainder.
    const pattern = CUT_BEATS[pace], count = Math.min(pattern.length, pool.length);
    const base = count === pattern.length && beats === PLACE_BEATS[pace]
      ? pattern
      : Array.from({length:count}, (_,i) => i < count - 1 ? Math.floor(beats / count) : beats - Math.floor(beats / count) * (count - 1));
    // A clip shorter than its slot would leave a sliver for another clip and
    // pull the next cut off the beat. Reorder the slots, or pick other clips
    // from this place, so each chosen clip holds its whole slot.
    const {clips, slots} = fitSlots(pool, base);
    // A clip too short for its slot hands the rest on to the next one.
    let carry = 0, remaining = beats * PLAN_BEAT;
    clips.forEach((w,i) => {
      if (remaining < 0.001) return;
      const want = Math.min(remaining, (i < slots.length ? slots[i] * PLAN_BEAT : 0) + carry);
      const take = Math.min(w.available, want);
      if (take > 0.01) segments.push({path:w.path,start:w.start,end:w.start+take,place:index,cropX:w.cropX??0.5,cropY:w.cropY??0.5});
      carry = want - take; remaining -= take;
    });
    if (remaining > 0.03) throw fail('There is not enough selected footage for a place.');
  });
  return {segments,places:places.map(p=>({id:p.id,name:p.name,description:p.description})),opening:!!opening,openingSkipped:!!story.settings.intro&&!opening,seconds:segments.reduce((n,s)=>n+s.end-s.start,0)};
}
