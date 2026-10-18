"""Build a self-contained report from evaluate.py outputs and review videos."""
import argparse,json,html,base64,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('folder');a=p.parse_args();root=Path(a.folder)
r=json.loads((root/'results.json').read_text());control=json.loads((root/'controls/results.json').read_text());models=[m['name'] for m in r['models']];esc=html.escape
name=lambda t:'파란 옷 남성' if t['camera']==2 else '분홍 옷 남성' if t['boxes'][12][0]<480 else '안경 쓴 여성'
prior={'mouse-15':'파란 옷 남성','mouse-180':'안경 쓴 여성','mouse-1180':'파란 옷 남성','mouse-1524':'안경 쓴 여성','chair-15':'파란 옷 남성','chair-380':'분홍 옷 남성','chair-1029':'안경 쓴 여성','chair-1390':'분홍 옷 남성'}
rows=[];details=[]
for c,cc in zip(r['cases'],control['cases']):
 assert c['id']==cc['id']
 winners=[]
 for model in models:
  winner=max(c['tracks'],key=lambda t:t['scores'][model]['anchorMean']);score=winner['scores'][model]['anchorMean'];winners.append(f'{name(winner)} ({score:+.2f})' if score>0 else f'판단 보류 (최고 {score:+.2f})')
 rows.append(f'<tr><td>{c["id"]}<br>{c["draftTime"]:.2f}초</td><td>{prior[c["id"]]}</td><td>{winners[0]}</td><td>{winners[1]}</td><td>{c["elapsedSeconds"]:.2f}초</td></tr>')
 trs=[]
 for t,ct in zip(c['tracks'],cc['tracks']):
  assert t['camera']==ct['camera'] and t['track']==ct['track']
  for m in models:
   vals=t['scores'][m];co=ct['controls'][m]
   trs.append(f'<tr><td>{name(t)}</td><td>{m}</td><td>{vals["anchorMean"]:+.2f}</td><td>{co["silent"]["anchorMean"]:+.2f}</td><td>{co["shifted800ms"]["anchorMean"]:+.2f}</td></tr>')
 video=base64.b64encode((root/c['id']/'comparison.mp4').read_bytes()).decode()
 details.append(f'<article><h2>{c["id"]}</h2><p>전사 맥락: {esc(c["text"])}</p><video controls preload="none" src="data:video/mp4;base64,{video}"></video><p>표시는 기본 AVA 모델 점수. 초록은 0 초과, 빨강은 0 이하입니다. 사람 이름은 결과 설명용 수동 라벨이며 모델 입력으로 주지 않았습니다.</p><table><tr><th>인물</th><th>모델</th><th>원음</th><th>무음</th><th>음성 0.8초 이동</th></tr>{"".join(trs)}</table></article>')
metrics={m:{'windowsWithPositive':sum(any(t['scores'][m]['anchorMean']>0 for t in c['tracks']) for c in r['cases']),'silentWindowsWithPositive':sum(any(t['controls'][m]['silent']['anchorMean']>0 for t in c['tracks']) for c in control['cases'])} for m in models}
summary={'windows':len(r['cases']),'meanSeconds':statistics.mean(c['elapsedSeconds'] for c in r['cases']),'totalSeconds':sum(c['elapsedSeconds'] for c in r['cases']),'metrics':metrics,'accuracy':'not measured: no independently verified audiovisual ground truth','productionIntegrated':False}
(root/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>화자 활동 탐지 실험</title><style>body{font-family:system-ui;background:#101722;color:#ebeff7;max-width:1200px;margin:auto;padding:28px;line-height:1.7}article{background:#1c2635;padding:22px;border-radius:16px;margin:24px 0}p{color:#c4d0e1}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px;border-bottom:1px solid #394656;text-align:left}video{width:100%}a{color:#91bdff}.warning{border-left:4px solid #efb05c;padding-left:18px}</style><h1>음성 + 입 움직임으로 화자 찾기</h1><p>Light-ASD · 같은 Aiden 구간의 8개 지점 · 2개 카메라 · 3초 연속 영상 · CPU</p><article><h2>결론: 기본 모델은 보조 근거 후보, 자동 정답 판정은 아직</h2><p>기본 AVA 모델은 8곳 중 7곳에 양수 발화 후보를 냈고, 무음 대조군 8곳에서는 모두 양수 후보가 없었습니다. 이는 정확도 7/8이라는 뜻이 아닙니다. 마우스 39.37초 부근은 후보를 잡지 못했습니다.</p><p>TalkSet 추가 학습 모델은 무음에서도 8곳 중 7곳에 양수 후보를 내므로 이번 적용 후보에서는 제외합니다. 음성을 0.8초 이동한 실험은 순환 이동이며, 연속 발화가 이어져 정확한 싱크 감도의 정답 시험으로 볼 수 없습니다.</p><p class="warning">앞선 리포트의 사진 기반 화자 판정은 정답 라벨로 사용할 수 없습니다. 이번 모델 결과와 여러 지점에서 충돌합니다. 이전 의자 클립의 “4개 샘플 일치”를 화자 정확도 통과로 해석하면 안 됩니다. 영상·음성 수동 대조로 독립적인 정답을 확정하기 전까지 어느 쪽의 정확도도 수치화하지 않았습니다.</p></article>'''
page+=f'<p>두 모델 포함 8곳 분석 합계 {summary["totalSeconds"]:.1f}초 · 장면당 평균 {summary["meanSeconds"]:.2f}초. 모델 설치·초기 로딩·영상 시각화·추가 대조군 실행은 제외. 기존 전체 클립 에이전트 시간과 직접 비교할 수 없습니다.</p><table><tr><th>검토 지점</th><th>기존 에이전트가 보여준 인물</th><th>기본 AVA 후보</th><th>TalkSet 후보</th><th>분석 시간</th></tr>'+''.join(rows)+'</table>'+''.join(details)
page+='''<article><h2>범위와 다음 단계</h2><p>기존 초안·프롬프트·Runtime은 변경하지 않았습니다. 실제 공개 모델을 로컬 CPU에서 실행한 별도 실험이며, 모델 점수는 확률이 아닙니다. 얼굴 추적은 3초 창 안의 위치 연결이고 카메라 간 동일 인물 연결은 구현하지 않았습니다. 두 시야의 영상 시점은 기존 실행 기록의 소스 매핑을 사용하고 카메라 1의 음성을 공유했습니다.</p><p>실서비스에 넣기 전에는 음성과 영상으로 정답을 확인한 발화 전환·동시 발화·화면 밖 화자 사례를 마련하고 기본 모델을 평가해야 합니다. 검증되면 Runtime은 발화 근거와 불확실성을 제공하고, 에이전트는 카메라·반응·분할을 결정하는 구조가 적절합니다.</p><p><a href="https://github.com/Junhua-Liao/Light-ASD">Light-ASD 공식 코드와 가중치</a> · <a href="https://openaccess.thecvf.com/content/CVPR2023/papers/Liao_A_Light_Weight_Model_for_Active_Speaker_Detection_CVPR_2023_paper.pdf">CVPR 2023 논문</a></p></article></html>'''
(root/'index.html').write_text(page)
print(json.dumps(summary,ensure_ascii=False,indent=2))
