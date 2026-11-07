#!/usr/bin/env python3
"""Rank StoryScope features by human-vs-AI distribution gap.

usage: derive_defaults.py STORYSCOPE_REPO_DIR OUT.json
(needs data/storyscope_features.parquet and data/taxonomy.json from github.com/jenna-russell/storyscope)
"""
import pandas as pd, json, sys
d=sys.argv[1]
df=pd.read_parquet(d+'/data/storyscope_features.parquet')
t=json.load(open(d+'/data/taxonomy.json'))['feature_taxonomy']
fm={}
for dk,dd in t.items():
    for ak,ad in dd['aspects'].items():
        for f in ad['features']: fm[f['id']]=dict(f,dim=dk)
ai=df[df.source!='human']; hu=df[df.source=='human']
rows=[]
for fid,f in fm.items():
    if fid not in df: continue
    def dist(s):
        if f['type']=='multi_select':
            s=s.dropna().astype(str); vals={}
            for v in f['values']: vals[v]=s.str.split('|').apply(lambda x:v in x).mean()
            return vals
        return s.astype(str).value_counts(normalize=True).to_dict()
    a=dist(ai[fid]); h=dist(hu[fid])
    keys=set(a)|set(h)
    diffs={k:a.get(k,0)-h.get(k,0) for k in keys if k not in ('nan','None','n/a')}
    if not diffs: continue
    tvd=sum(abs(v) for v in diffs.values())/2 if f['type']!='multi_select' else max(abs(v) for v in diffs.values())
    aitop=max(diffs,key=diffs.get); hutop=min(diffs,key=diffs.get)
    # per-model share of AI-top value
    per={m:(df[df.source==m][fid].astype(str).str.split('|').apply(lambda x:isinstance(x,list) and aitop in x).mean() if f['type']=='multi_select' else (df[df.source==m][fid].astype(str)==aitop).mean()) for m in ['human','claude','gpt','gemini','deepseek','kimi']}
    rows.append(dict(id=fid,dim=f['dim'],name=f['name'],q=f['question'],type=f['type'],tvd=round(tvd,3),ai_val=aitop,ai_p=round(a.get(aitop,0),2),hu_p_of_ai_val=round(h.get(aitop,0),2),hu_val=hutop,hu_p=round(h.get(hutop,0),2),ai_p_of_hu_val=round(a.get(hutop,0),2),per_model={k:round(v,2) for k,v in per.items()}))
rows.sort(key=lambda r:-r['tvd'])
json.dump(rows,open(sys.argv[2],'w'),indent=1)
for r in rows[:45]:
    print(f"{r['tvd']:.2f} {r['id']} [{r['dim']}] {r['name']} | AI→'{r['ai_val']}' {r['ai_p']} vs H {r['hu_p_of_ai_val']} | H→'{r['hu_val']}' {r['hu_p']} vs AI {r['ai_p_of_hu_val']}")
