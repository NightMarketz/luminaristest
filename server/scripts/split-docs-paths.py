"""USO ÚNICO (16/10) — refaz a divisão sobre a main final antes do merge; depois pode ser apagado.
Divide server/src/routes/docs.paths.ts em src/routes/docs/<feature>.paths.ts.

Uso: python -I split_docs.py <server_dir>
- tags/components ficam em docs.paths.ts (blocos sem paths).
- cada entrada de path vai para o arquivo da feature: /api/<A>/... -> <A>.paths.ts;
  /api/accounting/<B>/... -> accounting.<B>.paths.ts (accounting tem 112 paths).
- a prosa antes do marcador de cada bloco segue para o primeiro arquivo que recebe paths do bloco.
"""
import os
import re
import sys
from collections import OrderedDict

server = sys.argv[1]
src = os.path.join(server, 'src', 'routes', 'docs.paths.ts')
outdir = os.path.join(server, 'src', 'routes', 'docs')
text = open(src, encoding='utf-8').read().replace('\r\n', '\n')
TAG = '@' + 'openapi'

blocks = re.findall(r'/\*\*\n(.*?)\n \*/', text, re.S)
TOP = re.compile(r'^ \* ([A-Za-z]+):\s*$')
PATH = re.compile(r'^ \*   (/api/[^ ]*):\s*$')


def feature(path):
    seg = path.split('/')
    a = seg[2]
    if a == 'accounting' and len(seg) > 3 and seg[3] and not seg[3].startswith('{'):
        return 'accounting.' + seg[3]
    return a


common = []          # blocos (prosa, linhas não-paths)
files = OrderedDict()  # feature -> lista de blocos [(prosa, [linhas])]
total_paths = 0

for b in blocks:
    lines = b.split('\n')
    i = lines.index(' * ' + TAG)
    prose = lines[:i]
    body = lines[i + 1:]
    nonpaths, cur_key = [], None
    entries, pending, cur = [], [], None  # entries: (feature, [linhas])
    for ln in body:
        m = TOP.match(ln)
        if m:
            cur_key = m.group(1)
            if cur_key != 'paths':
                nonpaths.append(ln)
            continue
        if cur_key != 'paths':
            nonpaths.append(ln)
            continue
        p = PATH.match(ln)
        if p:
            total_paths += 1
            cur = (feature(p.group(1)), pending + [ln])
            entries.append(cur)
            pending = []
        elif re.match(r'^ \*   #', ln) or cur is None:
            pending.append(ln)       # cabeçalho de seção: vai com a próxima entrada
        else:
            cur[1].append(ln)
    if nonpaths:
        common.append((prose, nonpaths))
        prose = []
    seen = OrderedDict()
    for f, ls in entries:
        seen.setdefault(f, []).extend(ls)
    for n, (f, ls) in enumerate(seen.items()):
        while ls and ls[-1].strip() == '*':
            ls.pop()
        files.setdefault(f, []).append((prose if n == 0 else [], ls))

HEAD = ' * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo\n' \
       ' * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.'


def render(blocks_, paths=True):
    out = []
    for prose, ls in blocks_:
        out.append('/**')
        out.extend(prose)
        out.append(' * ' + TAG)
        if paths:
            out.append(' * paths:')
        out.extend(ls)
        out.append(' */')
    return '\n'.join(out) + '\nexport {};\n'


os.makedirs(outdir, exist_ok=True)
for f, bl in files.items():
    first_prose, ls = bl[0]
    bl[0] = ([' * OpenAPI de ' + ('/api/accounting/' + f.split('.', 1)[1] if f.startswith('accounting.') else '/api/' + f) + '.', HEAD]
             + ([' *'] + first_prose if first_prose else []), ls)
    open(os.path.join(outdir, f + '.paths.ts'), 'w', encoding='utf-8', newline='\n').write(render(bl))

common_txt = render([(p, ls) for p, ls in common], paths=False)
assert '*/' not in ''.join(HEAD), 'prosa não pode fechar o comentário'
common_txt = ('// Tags e components do OpenAPI. Os paths moram em ./docs/<feature>.paths.ts (um arquivo por feature).\n'
              + common_txt)
open(src, 'w', encoding='utf-8', newline='\n').write(common_txt)
print(f'{total_paths} paths em {len(files)} arquivos; {len(common)} blocos comuns ficaram em docs.paths.ts')
