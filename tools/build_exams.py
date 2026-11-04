import json,glob,os,sys,hashlib,random,string,subprocess,unicodedata
from PIL import Image
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=sys.argv[1]  # 작업 폴더: <S>/<dir>/img_<pdfid>/ 에 pdfimages 결과
# 분석 원본(정답 포함)은 공개 저장소에 올리지 않아요: tools/analysis/<id>.txt (gitignore) — 원본은 claude.ai 프로젝트 '시험대비 링크'의 claude/blindtest-analysis/ 에 보관
# 분석 파일이 없는 기존 시험은 state.json의 기존 항목(해시·잠금)을 그대로 유지해요.
C='①②③④⑤'
THREE=['7유클리드|김송현','7유클리드|김민정','7유클리드|김민하']
def parse(k):
    if all(ch in C+',' for ch in k):
        ns=[str(C.index(ch)+1) for ch in k if ch in C]
        return ('mcm' if len(ns)>1 else 'mc', [','.join(ns)])
    return ('sa', k.split('|'))
sets=[
 ('wf','e1298759','2-2-final-1','2-2 기말대비1',8,'③ ④ ④ ② 10cm² ④ 25 234 ② ② ⑤ ③ 5 ③ ③ ③ ② ② ④ ④ ⑤ ⑤ ④ ① 1/3',{}),
 ('wf','251a526f','2-2-final-2','2-2 기말대비2',8,'② ③ ① ④ 144cm² ⑤ 48cm ③ 100cm² ② ③ 16cm ⑤ ⑤ ② ③ ③ ③ ② ④ ⑤ ① ④ ④ 1/3',{}),
 ('wf','dfa1aa95','2-2-final-3','2-2 기말대비3',8,'③ ④ ④ ③ 15cm² ⑤ ③ ④ ④ ③ 416 8π ④ ① ② ① ① ③ ⑤ ④ ⑤ 9/10 1/2 ② ①',{}),
 ('wf','0ec81e7c','2-2-final-4','2-2 기말대비4(고난도)',8,'④ ② ② ⑤ ⑤ 21m 5 7/5cm ⑤ ④ ③ ⑤ 9 ② ⑤ ③ 19 ④ ③ ⑤ ③ ④ ② ① ①',{}),
 ('wf','ed2dd74e','2-2-final-5','2-2 기말대비5(고난도)',8,'② ③ ④ ③ ① ① 6 16/5cm 80/17cm ④ 6 200cm² ④ ② ④ ④ ⑤ ① ③ ③ ① ② ⑤ 4:3 ①',{}),
 ('w3','0994cb9f','1-2-plane-1','1-2 평면도형의 성질1',7,'① ②,⑤ ③ ⑤ ③ ③ ④ ① ⑤ ③ ① ④ ② ② ② ④ ② ③ ③ ② 61° 12 60° 3cm 52',{'who':THREE}),
 ('w3','22c40cd8','1-2-plane-2','1-2 평면도형의 성질2',7,'⑤ ③ ① ④ ④ ⑤ ④ ④ ③ ⑤ ② ⑤ ③ ③ ③ ③ ⑤ ⑤ ③ ③ 66° 36° 10cm 32cm² 32cm',{'who':THREE}),
 ('w3','5b41323b','1-2-plane-3','1-2 평면도형의 성질3(고난도)',7,'⑤ ④ ③ ⑤ ④ ②,⑤ ③ ④ ④ ③ ① ③ ⑤ ④ ③ ③ ④ ④ ② ① 60° 14 54 96° 125',{'who':THREE}),
 ('w3','e6d6cb0c','1-2-mid-1','1-2 중간대비1',7,'③ ⑤ ②,④ SAS합동|SAS ④ ① ① ㄱ,ㄴ,ㄷ|ㄱㄴㄷ ③ 360° ④ ① ④ ④ (6π+18)cm|(18+6π)cm|6π+18|18+6π|6π+18cm|18+6πcm|6(π+3)|6(3+π)|6(π+3)cm|6(3+π)cm|6파이+18|18+6파이|(6파이+18)cm|(18+6파이)cm 36πcm² ④ ② ③ 42 ② 18 GH|HG|선분GH|선분HG|모서리GH|모서리HG|변GH|변HG ③,⑤ 삼각형|정삼각형',{'who':THREE}),
 ('w3','4f23cd52','1-2-mid-2','1-2 중간대비2',7,'SSS합동|SSS ⑤ 1440° ⑤ ④ ③ 28 ③ ④ ①,⑤ ㄱ,ㄴ|ㄱㄴ|ㄴ,ㄱ ④ ② ④ ③ ② ⑤ (48+4π)cm²|48+4π|4π+48 ④ ⑤ ①,④ ① ④ ⑤ ④',{'who':THREE}),
 ('w7','33cc56d4','1-2-final-1','1-2 기말대비1',7,'②,⑤ ③ ⑤ ② 원뿔,ㄴ|ㄴ,원뿔 ⑤ ④ ④ 6cm ⑤ ④ 400cm³ ③ ⑤ ① ② 9명 ② ③ ③ ① 남학생 ⑤ ③ ③',{'hideFor':THREE,'fields':{'4':['','']}}),
 ('w7','94202532','1-2-final-2','1-2 기말대비2',7,'⑤ ⑤ 정십이면체 ② ① ① ③ 32πcm² ③ ③ ① 9cm ⑤ ② ① ③ ③ ④,⑤ 25% ④ ⑤ 16.5 ④ ① ②',{'hideFor':THREE}),
 ('w7','ed0c9dfe','1-2-final-3','1-2 기말대비3',7,'④ ④ ① ⑤ ⑤ 0 ③ ⑤ ④ 3cm ② 230cm³ ① ② ③ ③ 16,4 ⑤ ④ ② 80점 ② ① ② ㄴ',{'hideFor':THREE,'fields':{'16':['a','b']}}),
 ('w7','2780e582','1-2-final-4','1-2 기말대비4(고난도)',7,'③ 10 ⑤ ⑤ ④,⑤ ②,⑤ ④ 228cm² ④ ① ④ ② ③ 17/2cm ④ ④ ④ ④ ④ 4시간 ④ ⑤ ⑤ 15명 ③',{'hideFor':THREE}),
 ('w7','27e0b9ee','1-2-final-5','1-2 기말대비5(고난도)',7,'⑤ ⑤ ③ 42 ⑤ ④ ④,⑤ 6개 ③ ④ ③ ⑤ ② ⑤ 84πcm² ② ④ ③ 30명 ② ② ④ ⑤ 4:3 ⑤',{'hideFor':THREE}),
]
norm=lambda s:unicodedata.normalize('NFKC',s).replace('−','-').replace('–','-').replace(' ','').lower()
sha=lambda t:hashlib.sha256(t.encode()).hexdigest()
st=json.load(open(f'{R}/tools/state.json'))
old={e['id']:e for e in st['exams']}
st['exams']=[e for e in st['exams'] if e['id'] not in ('emvnzczkt','sample1') and not e['id'].startswith(('2-2-final','1-2-'))]
pages={}
def parse_an(slug,alts):
    qs=[]
    for line in open(f'{R}/tools/analysis/{slug}.txt',encoding='utf8').read().strip().split('\n'):
        no,concept,sol,tip,mis=line.split('|',4)
        ms=[]
        for m in mis.split(';;'):
            a,t,r=m.split('=',2); ms.append({'answer':a,'type':t,'reason':r})
        qs.append({'no':int(no),'concept':concept,'solution':sol,'tip':tip,'mistakes':ms})
    assert len(qs)==25 and [q['no'] for q in qs]==list(range(1,26)),slug
    return {'questions':qs}
jobs=[]
for d,f,slug,title,g,key,extra in sets:
    if not os.path.exists(f'{R}/tools/analysis/{slug}.txt') and slug in old and old[slug].get('lock'):
        ex=dict(old[slug]);[ex.__setitem__(k,v) for k,v in extra.items() if k in ('who','hideFor','fields')];st['exams'].append(ex);pages[slug+'.html']={'id':slug,'grade':g};continue
    ks=key.split(); assert len(ks)==25,(slug,len(ks))
    fs=sorted(glob.glob(f'{S}/{d}/img_{f}/i-*.png'))
    fs=fs[2:] if f in('e6d6cb0c','4f23cd52') else [x for x in fs if Image.open(x).width>200]
    assert len(fs)==25
    os.makedirs(f'{R}/exams/{slug}',exist_ok=True); imgs=[]
    for i,x in enumerate(fs):
        out=f'{R}/exams/{slug}/{i+1:02d}.jpg'
        if not os.path.exists(out): Image.open(x).convert('RGB').save(out,quality=78,optimize=True)
        imgs.append(f'https://fermat-math.github.io/blindtest/exams/{slug}/{i+1:02d}.jpg')
    salt=old.get(slug,{}).get('salt') or ''.join(random.choice(string.ascii_lowercase+string.digits) for _ in range(8))
    types=[];hashes=[];alts=[]
    for i,k in enumerate(ks):
        t,a=parse(k);types.append(t);alts.append(a);hashes.append([sha(f'{salt}:{i}:{norm(x)}') for x in a])
    ex={'id':slug,'title':title,'salt':salt,'hashes':hashes,'images':imgs,'types':types,'grade':g,'pageLabel':'문제'}
    for k in ('who','hideFor','fields'):
        if k in extra: ex[k]=extra[k]
    st['exams'].append(ex); pages[slug+'.html']={'id':slug,'grade':g}
    jobs.append({'id':slug,'salt':salt,'alts':alts,'analysis':parse_an(slug,alts)})
json.dump(jobs,open(f'{S}/lockjobs.json','w'),ensure_ascii=False)
locks=json.loads(subprocess.check_output(['node','-e',"""
const {lock,unlock}=require(process.argv[2]);const jobs=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const out={};
for(const j of jobs){const L=lock(j.salt,j.alts,j.analysis);const back=unlock(L,j.salt,j.alts,j.alts.map(a=>a[a.length-1]));if(back.questions.length!==25)throw j.id;out[j.id]=L}
console.log(JSON.stringify(out))""",f'{S}/lockjobs.json',f'{R}/tools/lock.js']))
for ex in st['exams']:
    if ex['id'] in locks: ex['lock']=locks[ex['id']]
json.dump(st,open(f'{R}/tools/state.json','w'),ensure_ascii=False)
json.dump(pages,open(f'{R}/tools/pages.json','w'),ensure_ascii=False,indent=0)
json.dump({j['id']:j['alts'] for j in jobs},open(f'{S}/final_keys.json','w'),ensure_ascii=False)
print('ok',len(st['exams']),[e['id'] for e in st['exams']])
