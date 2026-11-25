import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
s = open(sys.argv[1], encoding='utf-8', errors='replace').read()
needle = sys.argv[2]
a = int(sys.argv[3]); b = int(sys.argv[4])
anc = s.find(needle)
print('anchor', anc)
seg = s[anc - a:anc + b]
# Angular view-engine text nodes: Dt(-1,null,["..."]) ; join consecutive text nodes per element
toks = re.finditer(r'Dt\(-1,null,\["((?:[^"\\]|\\.)*)"\]\)|(yi\(\d+,\d+,null,null,\d+,"(p|div|br|h\d|li|td|tr)")', seg)
line = []
for m in toks:
    if m.group(2):
        if line:
            print(''.join(line).strip()); line = []
        continue
    t = m.group(1)
    t = t.encode('latin-1', 'backslashreplace').decode('unicode_escape')
    line.append(t)
if line: print(''.join(line).strip())
