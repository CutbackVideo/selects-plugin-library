"""Representative DOAC Style compile jobs: every approved template, plain
captions (short, one line, two lines), five frame rates, and error cases.
The ci-* jobs (faster speech, so fewer frames) are the ones
tests/doac_style_parity.test.mjs replays against Python goldens.

    python make_jobs.py <out dir>"""
import json, sys, os

def job(name, fps, scenes, gap=2, speed=1.0):
    words, editorial, t = [], [], 6
    fps_words = fps * speed
    for sc in scenes:
        kind = sc[0]
        if kind == 'plain':
            toks = sc[1].split()
            a = len(words)
            for w in toks:
                dur = max(4, round(fps_words * (0.12 + 0.045 * len(w))))
                words.append(dict(text=w, start=t, end=t + dur)); t += dur + gap
            editorial.append(dict(words=[a, len(words) - 1], kind='plain'))
        else:
            _, tid, groups = sc[:3]
            texts = sc[3] if len(sc) > 3 else None
            a = len(words)
            spans = []
            for g in groups:
                toks = g.split()
                s = len(words)
                for w in toks:
                    dur = max(5, round(fps_words * (0.16 + 0.05 * len(w))))
                    words.append(dict(text=w, start=t, end=t + dur)); t += dur + gap
                spans.append([s, len(words) - 1])
            order = sc[4] if len(sc) > 4 else list(range(len(groups)))
            slots = [spans[i] for i in order]
            e = dict(words=[a, len(words) - 1], kind='emphasis', template=tid, slots=slots, focusSlot=0)
            if texts: e['texts'] = texts
            editorial.append(e)
        t += 3
    return dict(name=name, input=dict(fps=fps, frames=t + 12, words=words), editorial=editorial)

FPS = [30, 24, 30000 / 1001, 25, 60]
TPL = [
    ('06', ['kids', 'with', 'bigger', 'dreams', 'of', 'new', 'worlds']),
    ('09', ['and', 'they', 'just', 'signed', 'a', 'deal']),
    ('11', ['and', 'would', 'you', 'be', 'dreaming', 'about']),
    ('13', ['are', 'watching', 'you.']),
    ('19', ['why', 'does', 'this', 'happen', 'now?']),
    ('21', ['this looks', 'like a', 'big win']),
    ('22', ['and', 'if', 'you', 'own', 'a', 'small', 'company']),
    ('23', ['that', 'achieves', 'nothing', 'except']),
    ('24', ['so', "let's", 'talk', 'about', 'that'], None, [1, 0, 2, 3, 4]),
    ('33', ['people', 'call', 'him', 'brilliant']),
    ('38', ['delay', 'the', 'launch']),
    ('40', ['money']),
    ('05', ['three', 'things', 'you', 'should never', 'do'], ['3', 'things', 'you', 'should never', '2', 'do'], [0, 1, 2, 3, 0, 4]),
]
J = []
for k, t in enumerate(TPL):
    J.append(job('t%s' % t[0], FPS[k % len(FPS)], [('plain', 'So here is the thing'), ('tpl',) + t, ('plain', 'Okay.')]))
# Short and long phrases in the same templates.
J.append(job('t13-short', 30, [('tpl', '13', ['go', 'now', 'ok'])]))
J.append(job('t13-fits', 30, [('tpl', '13', ['are', 'controlling', 'you'])]))
J.append(job('t13-fits2', 24, [('plain', 'they'), ('tpl', '13', ['are', 'destroying', 'you'])]))
J.append(job('t21-long', 24, [('tpl', '21', ['this honestly looks', 'like such a', 'very big win'])]))
J.append(job('t38-long', 30, [('tpl', '38', ['never', 'ever', 'surrender'])]))
J.append(job('t40-short', 25, [('plain', 'and then'), ('tpl', '40', ['A']), ('plain', 'happened')]))
J.append(job('t05-nine', 30, [('tpl', '05', ['nine', 'reasons', 'people', 'quit', 'jobs'], ['9', 'reasons', 'people', 'quit', '8', 'jobs'], [0, 1, 2, 3, 0, 4])]))
J.append(job('plain-mix', 30000 / 1001, [
    ('plain', 'Listen carefully'),
    ('plain', 'It is not about the money, it is about 3.5 percent'),
    ('plain', 'and that is why we keep going every single day'),
    ('plain', '"Really?" she said.'),
]))
# Error cases: Python and JS must refuse the same way.
J.append(job('err-dense', 30, [('tpl', '06', ['incredibly', 'talented', 'engineers', 'building', 'remarkable', 'software', 'everywhere'])]))
J.append(job('err-one-word', 30, [('plain', 'supercalifragilisticexpialidocious-and-beyond-everything-else-entirely-forever')]))
J.append(job('err-two-lines', 25, [('plain', 'Honestly the most important lesson I have learned in business is that consistency beats intensity')]))
J.append(job('err-hierarchy', 30, [('tpl', '11', ['and', 'would', 'you', 'be', 'dreaming', 'about absolutely everything'])]))
J.append(job('err-mismatch', 30, [('tpl', '13', ['are', 'watching', 'you'])]))
J[-1]['editorial'][0]['texts'] = ['are', 'seeing', 'you']
# CI: every template that fits, the plain caption and two refusals, at half the speech length.
CI = {k: v for k, v in ((t[0], t) for t in TPL)}
J.append(job('ci-legacy', 30, [('plain', 'Listen'), ('tpl',) + CI['19'], ('tpl',) + CI['05'], ('tpl',) + CI['06'], ('tpl',) + CI['21'], ('tpl',) + CI['33']], speed=0.5))
J.append(job('ci-modern', 24, [('tpl',) + CI['11'], ('tpl',) + CI['40'], ('tpl',) + CI['24'], ('tpl',) + CI['09'], ('plain', 'and so')], speed=0.5))
J.append(job('ci-modern2', 30000 / 1001, [('tpl',) + CI['22'], ('tpl',) + CI['23'], ('tpl',) + CI['38'], ('plain', 'It is not about the money, it is about 3.5 percent')], speed=0.5))
J.append(job('ci-err-hierarchy', 30, [('tpl', '13', ['go', 'now', 'ok'])], speed=0.5))
J.append(job('ci-err-one-word', 25, [('plain', 'supercalifragilisticexpialidocious-and-beyond-everything-else-entirely-forever')], speed=0.5))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for j in J:
    d = os.path.join(out, j['name']); os.makedirs(d, exist_ok=True)
    json.dump(dict(input=j['input'], editorial=j['editorial']), open(os.path.join(d, 'job.json'), 'w'), indent=1)
print(len(J))
