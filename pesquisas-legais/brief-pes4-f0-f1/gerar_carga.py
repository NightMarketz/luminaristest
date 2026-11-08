"""BE-INCR-DP-F0-F1 PR-2 (nó PES-4, BRIEF itens 20–23) — gera server/prisma/data/legal_parameters_dp_v1.sql a partir dos
arquivos OFICIAIS do dossiê (SHA-256 conferido abaixo). Determinístico: rodar de novo dá o mesmo arquivo.

- INSS_EMPREGADO 2026 ......... tabela oficial do INSS [D07] (EC 103/2019 art. 28 I–IV e § 1º [D06])
- ENCARGO_FOLHA/FGTS_APRENDIZ .. Lei 8.036/1990 art. 15 § 7º [D04], incl. pela Lei 10.097/2000 (DOU 20/12/2000 [D14])
- ESOCIAL_CATEGORIA ............ Tabela 01 [D10]; `evento` pela REGRA_COMPATIB_CATEG_EVENTO dos leiautes [D09]
- ESOCIAL_NATUREZA_RUBRICA ..... Tabela 03 [D10]
- ESOCIAL_INCIDENCIA_RUBRICA ... CP/FGTS: domínios de codIncCP e codIncFGTS do S-1010 [D09]; IRRF: Tabela 21 [D10]
- ESOCIAL_MOTIVO_AFASTAMENTO ... Tabela 18 [D10]

O BRIEF não digita código nenhum das tabelas do eSocial: tudo sai do HTML oficial. Vigência = colunas INÍCIO/TÉRMINO da
tabela; os domínios do S-1010 não têm vigência na fonte e começam em 2025-01-01 (L-10 do BE-INCR-LEGAL-PARAMS, dono
07/10: "2025-01-01 como no PR-1" para tabela-lista sem vigência). Quando a tabela agrupa linhas sob um título (Tabela 21
e os domínios do S-1010), a `descricao` leva o título antes do item ("<título>: <item>"), senão "Mensal" do 31 de CP e do
11 de CP ficariam iguais.

Uso (da raiz do repo):  python -I pesquisas-legais/brief-pes4-f0-f1/gerar_carga.py
"""
import hashlib
import html
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
DOCS = RAIZ / 'pesquisas-legais/brief-pes4-f0-f1/docs'
SAIDA = RAIZ / 'server/prisma/data/legal_parameters_dp_v1.sql'
MOTIVO = 'BE-INCR-DP-F0-F1 PR-2 (nó PES-4, BRIEF itens 20–23); executa: dono, chat, 2026-11-03 "Executa PR-0 a PR-6"; dossiê pesquisas-legais/brief-pes4-f0-f1'
QUEM = 'migracao:DP-F0-F1-PR2'

# (arquivo, url oficial, sha256) — manifest.json do dossiê.
D04 = ('D04_lei-8036-1990-05-11.md', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-05-11;8036', '2306b761562d936ac63fd74447e2def11fe8f71d86910d324d83ea5614f2bd22')
D07 = ('D07_tabela-de-contribuicao-mensal.html', 'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal', '10048cc43744e44a290665d685b27d82ad38161d9f7da2edc5fecf35197240e2')
D09 = ('D09_index-html.html', 'https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-07-2026-rev-20-10-2026/index.html', '25ffc2061fab32043d62be331db2da16590008bcb89ecc8de0f5276ddeca6425')
D10 = ('D10_tabelas-html.html', 'https://www.gov.br/esocial/pt-br/documentacao-tecnica/leiautes-esocial-versao-s-1-3-nt-07-2026-rev-20-10-2026/tabelas.html', '19abfe05f6823c7b6428d7c7cfb35f8e06f39b20e585ee5eb8c5079a607c2347')
VERSAO = 'eSocial S-1.3 (cons. até NT 07/2026 rev. 20/10/2026)'
DESDE_SEM_VIGENCIA = '2025-01-01'  # L-10 do BE-INCR-LEGAL-PARAMS

COLS = '"id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt"'


def ler(doc):
    nome, _url, sha = doc
    # O manifest tem o hash do arquivo como baixado: o INSS e a lei vieram em LF, os HTML do eSocial em CRLF. O git guarda
    # LF e o checkout (core.autocrlf) pode devolver qualquer um dos dois; confere nas duas formas.
    lf = (DOCS / nome).read_bytes().replace(b'\r\n', b'\n')
    formas = {hashlib.sha256(b).hexdigest() for b in (lf, lf.replace(b'\n', b'\r\n'))}
    if sha not in formas:
        sys.exit(f'{nome}: SHA-256 {sorted(formas)}, esperado {sha}')
    return lf.decode('utf-8')


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


linhas = []
ids = set()


def add(id_, tabela, chave, disc, vint, vjson, fonte, doc, desde, ate):
    if id_ in ids:
        sys.exit(f'id repetido: {id_}')
    ids.add(id_)
    vals = [id_, tabela, chave, disc, vint, None, None if vjson is None else json.dumps(vjson, ensure_ascii=False, separators=(',', ':')),
            fonte, doc[1], doc[2], desde, ate, 'PUBLISHED', None, MOTIVO, QUEM, QUEM]
    linhas.append('INSERT OR IGNORE INTO "legal_parameters" (' + COLS + ') VALUES (' + ', '.join(q(v) for v in vals) + ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);')


def limpo(s):
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return ' '.join(html.unescape(s).split())


def data(br):
    br = br.strip()
    if br in ('', '-'):
        return None
    d, m, a = br.split('/')
    return f'{a}-{m}-{d}'


def tabela_html(h, tid):
    """Linhas do <tbody> da tabela `tid` como listas de células, com rowspan propagado. Título de grupo (uma célula
    com colspan = largura) vira ('TITULO', texto)."""
    i = h.index(f'<table id="{tid}"')
    corpo = h[h.index('<tbody>', i):h.index('</table>', i)]
    pendentes = {}  # coluna -> [texto, linhas restantes]
    out = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', corpo, re.S):
        celulas = re.findall(r'<td([^>]*)>(.*?)</td>', tr, re.S)
        if len(celulas) == 1 and 'colspan' in celulas[0][0]:
            out.append(('TITULO', limpo(celulas[0][1]).rstrip(':')))
            continue
        linha, col, it = [], 0, iter(celulas)
        while True:
            if col in pendentes:
                texto, resta = pendentes[col]
                linha.append(texto)
                if resta == 1:
                    del pendentes[col]
                else:
                    pendentes[col][1] = resta - 1
                col += 1
                continue
            try:
                attrs, conteudo = next(it)
            except StopIteration:
                break
            texto = limpo(conteudo)
            m = re.search(r'rowspan="(\d+)"', attrs)
            if m and int(m.group(1)) > 1:
                pendentes[col] = [texto, int(m.group(1)) - 1]
            linha.append(texto)
            col += 1
        out.append(linha)
    return out


def dominio_s1010(h09, campo):
    """Itens `<strong>NN</strong> - descrição` do campo `campo` do S-1010 (inclusão), com o título de grupo antes."""
    i = h09.index(f'id="1010_infoRubrica_inclusao_dadosRubrica_{campo}"')
    celula = h09[i:h09.index('</td>\n</tr>', i)]
    celula = celula[celula.index('Valores v'):]
    celula = celula.split('<strong>Valida')[0]
    titulo, out = None, []
    for parte in re.split(r'<br\s*/?>', celula)[1:]:
        m = re.match(r'\s*<strong>(\d+)</strong>\s*-\s*(.*)$', parte, re.S)
        if m:
            desc = limpo(m.group(2))
            out.append((m.group(1), f'{titulo}: {desc}' if titulo else desc))
        elif limpo(parte):
            titulo = limpo(parte).rstrip(':')
    return out


def main():
    h07, h09, h10 = ler(D07), ler(D09), ler(D10)
    ler(D04)

    # ── Item 20/21 — INSS_EMPREGADO 2026 [D07] ─────────────────────────────────────────────────────────────────────────
    # A página traz "TABELAS VÁLIDAS A PARTIR DA COMPETÊNCIA JANEIRO DE 2026" e as 4 faixas; o script confere o texto e
    # grava os limites em centavos (a última faixa vai "até o limite do salário de contribuição" = TETO_RGPS_CENTS).
    texto07 = limpo(h07)
    assert 'TABELAS VÁLIDAS A PARTIR DA COMPETÊNCIA JANEIRO DE 2026' in texto07, 'D07 sem o título de 2026'
    faixas = [
        ('FAIXA_1', 162100, 750, 'Até R$ 1.621,00 7,5%'),
        ('FAIXA_2', 290284, 900, 'De R$ 1.621,01 a R$ 2.902,84 9%'),
        ('FAIXA_3', 435427, 1200, 'De R$ 2.902,85 até R$ 4.354,27 12%'),
        ('FAIXA_4', None, 1400, 'De R$ 4.354,28 até R$ 8.475,55 14%'),
    ]
    fonte_inss = 'Portaria Interministerial MPS/MF nº 13/2026 (EC 103/2019 art. 28 I–IV e § 1º) — tabela oficial do INSS'
    for chave, ate, bp, trecho in faixas:
        assert trecho in texto07, f'D07 sem "{trecho}"'
        add(f'dp-inss-empregado-{chave.lower().replace("_", "-")}-2026', 'INSS_EMPREGADO', chave, None, None,
            {'ateCents': ate, 'aliquotaBp': bp}, fonte_inss, D07, '2026-01-01', None)

    # ── Item 22 — FGTS do aprendiz [D04 art. 15 § 7º; D14 DOU de 20/12/2000] ─────────────────────────────────────────
    assert 'terão a alíquota a que se refere o *caput* deste artigo reduzida para 2% (dois por cento)' in ler(D04)
    add('lp-encargo-fgts-aprendiz-bp', 'ENCARGO_FOLHA', 'FGTS_APRENDIZ_BP', None, 200, None,
        'Lei 8.036/1990 art. 15 § 7º (incl. Lei 10.097/2000)', D04, '2000-12-20', None)

    # ── Item 23 — tabelas do eSocial ──────────────────────────────────────────────────────────────────────────────
    regra = limpo(h09[h09.index('A utilização do evento S-2200'):][:2000])
    s2200 = set(re.search(r'S-2200 só é permitida para as categorias de trabalhadores \[([\d, ]+)\]', regra).group(1).split(', '))
    s2300 = set(re.search(r'S-2300 é permitido apenas para as categorias de trabalhadores \[([\d, ]+)\]', regra).group(1).split(', '))

    fonte = f'{VERSAO} — Tabela 01 (Categorias de Trabalhadores); evento pela REGRA_COMPATIB_CATEG_EVENTO dos leiautes'
    for r in tabela_html(h10, '01'):
        grupo, cod, desc, ini, fim = r
        evento = 'S-2200' if cod in s2200 else 'S-2300' if cod in s2300 else None
        add(f'esoc-cat-{cod}-{data(ini)}', 'ESOCIAL_CATEGORIA', cod, None, None, {'grupo': grupo, 'descricao': desc, 'evento': evento}, fonte, D10, data(ini), data(fim))

    fonte = f'{VERSAO} — Tabela 03 (Natureza das Rubricas da Folha de Pagamento)'
    for r in tabela_html(h10, '03'):
        cod, nome, desc, ini, fim = r[:5]
        add(f'esoc-nat-{cod}-{data(ini)}', 'ESOCIAL_NATUREZA_RUBRICA', cod, None, None, {'nome': nome, 'descricao': desc}, fonte, D10, data(ini), data(fim))

    for disc, campo in (('CP', 'codIncCP'), ('FGTS', 'codIncFGTS')):
        fonte = f'{VERSAO} — leiaute S-1010, domínio de {campo} (sem vigência na fonte: desde 2025-01-01, L-10)'
        for cod, desc in dominio_s1010(h09, campo):
            add(f'esoc-inc-{disc.lower()}-{cod}-{DESDE_SEM_VIGENCIA}', 'ESOCIAL_INCIDENCIA_RUBRICA', cod, disc, None, {'descricao': desc}, fonte, D09, DESDE_SEM_VIGENCIA, None)

    fonte = f'{VERSAO} — Tabela 21 (Códigos de Incidência Tributária da Rubrica para o IRRF)'
    titulo = None
    for r in tabela_html(h10, '21'):
        if r[0] == 'TITULO':
            titulo = r[1]
            continue
        cod, desc, ini, fim = r
        add(f'esoc-inc-irrf-{cod}-{data(ini)}', 'ESOCIAL_INCIDENCIA_RUBRICA', cod, 'IRRF', None,
            {'descricao': f'{titulo}: {desc}' if titulo else desc}, fonte, D10, data(ini), data(fim))

    fonte = f'{VERSAO} — Tabela 18 (Motivos de Afastamento)'
    for r in tabela_html(h10, '18'):
        cod, desc, ini, fim = r[:4]
        add(f'esoc-afast-{cod}-{data(ini)}', 'ESOCIAL_MOTIVO_AFASTAMENTO', cod, None, None, {'descricao': desc}, fonte, D10, data(ini), data(fim))

    SAIDA.write_text('\n'.join(linhas) + '\n', encoding='utf-8', newline='\n')
    contagem = {}
    for l in linhas:
        m = re.search(r"VALUES \('[^']*', '([A-Z_]+)', '[^']*', (NULL|'([A-Z]+)')", l)
        k = m.group(1) + (f'/{m.group(3)}' if m.group(3) else '')
        contagem[k] = contagem.get(k, 0) + 1
    print(json.dumps(contagem, indent=1, ensure_ascii=False))
    print('sha256 da carga:', hashlib.sha256(SAIDA.read_bytes()).hexdigest())


main()
