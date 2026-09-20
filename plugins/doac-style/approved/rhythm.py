"""Editorial warnings: attention balance is reviewed, never a quota that overrides meaning."""
import json
from pathlib import Path
K=Path(__file__).resolve().parent

def analyze(records):
 profiles={p['id']:p for p in json.loads((K/'template-energy.json').read_text())}
 segments=[dict(id=p['id'],start=p['start'],end=p['end'],text=' '.join(s['text'] for s in p['slots']),score=profiles[p['id']]['score'] if p['id'] in profiles else 1) for p in records]
 strong=[s for s in segments if s['score']>=4];warnings=[]
 if segments[0]['score']<2.5:warnings.append('Consider emphasis for the first meaningful phrase.')
 if not strong:warnings.append('No strong effect selected. Review meaningful turns for stronger emphasis.')
 for a,b in zip(segments,segments[1:]):
  if a['score']>=4 and b['score']>=4:warnings.append('Consecutive strong effects: check whether escalation is intentional.')
 counts={i:sum(s['id']==i for s in segments) for i in set(s['id'] for s in segments) if i in profiles}
 if counts and max(counts.values())/sum(counts.values())>.35:warnings.append('One template exceeds 35% of emphasis scenes. Review whether repetition serves meaning.')
 total=segments[-1]['end']-segments[0]['start'];dur={label:round(sum(s['end']-s['start'] for s in segments if test(s['score']))/total*100,1) for label,test in [('low',lambda x:x<2.5),('medium',lambda x:2.5<=x<4),('high',lambda x:x>=4)]}
 return dict(segments=segments,durationPercent=dur,strongCount=len(strong),warnings=warnings)
if __name__=='__main__':
 result=analyze(json.loads((K/'examples/problem/output/plan.json').read_text()));(K/'rhythm-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='segments'},ensure_ascii=False))
