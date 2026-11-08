"""BE-INCR-DP-F2 PR-1 (nó PES-4, BRIEF item 13; §6 "Insumos ausentes") — gera
server/prisma/data/legal_parameters_dp_dependente_v1.sql: a Tabela 07 do eSocial (Tipos de Dependente) como
LegalParameter `ESOCIAL_TIPO_DEPENDENTE`, no padrão do D-8 do F0+F1 e da Tabela 18 do PR-6 de lá.

Fonte: o mesmo HTML oficial das tabelas do eSocial do dossiê brief-pes4-f0-f1 ([F1-D10], SHA-256 conferido). O código não
digita tipo nenhum: tudo sai do HTML. Vigência = colunas INÍCIO/TÉRMINO da tabela. Reusa o parser do gerar_carga.py de lá
(importado por caminho, sem cópia). Determinístico: rodar de novo dá o mesmo arquivo.

Uso (da raiz do repo):  python -I pesquisas-legais/brief-pes4-f2/gerar_carga_dependente.py
"""
import hashlib
import importlib.util
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'server/prisma/data/legal_parameters_dp_dependente_v1.sql'

# O gerar_carga.py do F0+F1 chama main() ao ser importado; carrega-se só as funções, com o main() trocado por nada.
_src = (RAIZ / 'pesquisas-legais/brief-pes4-f0-f1/gerar_carga.py').read_text(encoding='utf-8')
_src = re.sub(r'\nmain\(\)\s*$', '\n', _src)
f1 = type(sys)('gerar_carga_f1')
f1.__file__ = str(RAIZ / 'pesquisas-legais/brief-pes4-f0-f1/gerar_carga.py')
exec(compile(_src, f1.__file__, 'exec'), f1.__dict__)

f1.MOTIVO = 'BE-INCR-DP-F2 PR-1 (nó PES-4, BRIEF item 13; §6); executa: dono, chat, 2026-11-06 "Executa o F2"; dossiê pesquisas-legais/brief-pes4-f0-f1 [D10]'
f1.QUEM = 'migracao:DP-F2-PR1'


def main():
    h10 = f1.ler(f1.D10)
    fonte = f'{f1.VERSAO} — Tabela 07 (Tipos de Dependente)'
    for r in f1.tabela_html(h10, '07'):
        cod, desc, ini, fim = r[:4]
        f1.add(f'esoc-dep-{cod}-{f1.data(ini)}', 'ESOCIAL_TIPO_DEPENDENTE', cod, None, None, {'descricao': desc}, fonte, f1.D10, f1.data(ini), f1.data(fim))
    SAIDA.write_text('\n'.join(f1.linhas) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'ESOCIAL_TIPO_DEPENDENTE': len(f1.linhas)}))
    print('sha256 da carga:', hashlib.sha256(SAIDA.read_bytes()).hexdigest())


main()
