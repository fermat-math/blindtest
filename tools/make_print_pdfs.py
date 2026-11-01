#!/usr/bin/env python3
"""시험지마다 학생이 내려받아 프린트할 문제지 PDF(exams/<id>/print.pdf)를 만들고 state.json에 pdf 경로를 적어요.
정답은 넣지 않아요. 문제 이미지가 바뀐 시험지만 다시 만들어요.
사용법: python3 tools/make_print_pdfs.py tools/state.json"""
import json, os, subprocess, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sf = sys.argv[1]; st = json.load(open(sf, encoding='utf8')); changed = False
for ex in st['exams']:
    d = os.path.join(ROOT, 'exams', ex['id']); imgs = sorted(glob.glob(d + '/[0-9][0-9].jpg'))
    if ex.get('pageLabel') != '문제' or not imgs: continue
    out = os.path.join(d, 'print.pdf')
    if not os.path.exists(out) or os.path.getmtime(out) < max(os.path.getmtime(i) for i in imgs):
        tmp = os.path.join(d, '.print'); os.makedirs(tmp, exist_ok=True)
        for f in glob.glob(tmp + '/*'): os.remove(f)
        for i in imgs: os.symlink(i, os.path.join(tmp, os.path.basename(i)))
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools/exam_style/make_exam_pdf.py'), '--images', tmp, '--out', out,
                        '--title', ex['title'], '--sub', '블라인드 테스트', '--label', '시험대비', '--start', str(ex.get('start') or 1)], check=True)
        for f in glob.glob(tmp + '/*'): os.remove(f)
        os.rmdir(tmp)
    rel = f"exams/{ex['id']}/print.pdf"
    if ex.get('pdf') != rel: ex['pdf'] = rel; changed = True
if changed: json.dump(st, open(sf, 'w', encoding='utf8'), ensure_ascii=False)
