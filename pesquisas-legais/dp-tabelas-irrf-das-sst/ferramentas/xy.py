import sys,io,pypdf,glob
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
f,needle=sys.argv[1],sys.argv[2]
r=pypdf.PdfReader(f)
pages=[i for i,p in enumerate(r.pages) if needle in (p.extract_text() or '')]
for pi in pages[-int(sys.argv[3]) if len(sys.argv)>3 else -1:]:
    items=[]
    def v(t,cm,tm,fd,fs):
        if t.strip():
            m=pypdf.mult(tm,cm); items.append((round(m[5]),round(m[4]),t.strip()))
    r.pages[pi].extract_text(visitor_text=v)
    print('=== page',pi+1)
    rows={}
    for y,x,t in items: rows.setdefault(y,[]).append((x,t))
    for y in sorted(rows,reverse=True):
        print(y,' | '.join(f'{x}:{t}' for x,t in sorted(rows[y])))
