import re,sys,json,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
sql,docs=sys.argv[1],sys.argv[2]
rows={}
for line in open(sql,encoding='utf-8'):
    m=re.search(r"VALUES \('([^']+)', '(SIMPLES_ANEXO_(?:FAIXA|REPARTICAO))', '([IV]+)', '(F\d)', NULL, NULL, '(\{[^']*\})', '[^']*', '[^']*', '[^']*', '(\d{4}-\d\d-\d\d)', (NULL|'[^']*')",line)
    if m and m.group(6)=='2027-01-01':
        rows[(m.group(2),m.group(3),m.group(4))]=(json.loads(m.group(5)),m.group(1),m.group(7))
print('linhas 2027 no SQL:',len(rows))
files={'I':'D03','II':'D04','III':'D05','IV':'D06','V':'D07'}
import glob
def pct(s): return round(float(s.replace('%','').replace(',','.'))*100)
def brl(s): return 0 if s.strip() in ('-','') else round(float(s.replace('.','').replace(',','.'))*100)
bad=0;n=0
for an,d in files.items():
    t=open(glob.glob(f'{docs}/{d}_*.txt')[0],encoding='utf-8').read()
    blk=t.split('(Vigência: 1º/1/2029')[0]
    hdr=re.search(r'Percentual de Repartição dos Tributos\s*\n(.*)\n',blk).group(1).replace(' (*)','').split()
    for i in range(1,7):
        m=re.search(rf'{i}ª Faixa (?:Até|De [\d.,]+ a) ([\d.,]+) ([\d,]+%) ([\d.,]+|-)',blk)
        exp={'receitaAteCents':brl(m.group(1)),'aliquotaNominalBp':pct(m.group(2)),'parcelaDeduzirCents':brl(m.group(3))}
        got=rows.get(('SIMPLES_ANEXO_FAIXA',an,f'F{i}'))
        n+=1
        if not got or got[0]!=exp: bad+=1;print('DIVERGE FAIXA',an,i,exp,got)
        rm=re.findall(rf'^{i}ª Faixa ((?:[\d,]+%|-)(?: (?:\(\*\) )?(?:[\d,]+%|-))*)\s*$',blk,re.M)
        vals=rm[0].replace('(*) ','').split()
        exp2={h:pct(v) for h,v in zip(hdr,vals) if v!='-'}
        got2=rows.get(('SIMPLES_ANEXO_REPARTICAO',an,f'F{i}'))
        n+=1
        if not got2 or got2[0]!=exp2: bad+=1;print('DIVERGE REP',an,i,exp2,got2 and got2[0])
print('conferidas',n,'divergencias',bad)
print('vigenteAte distintos:',{v[2] for v in rows.values()})
