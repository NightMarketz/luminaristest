"""RETENCOES-FONTE PR-1 (BRIEF itens 1, 2, 3 e 7; Emenda 22/10 item 1) — gera
server/prisma/data/legal_parameters_retencoes_v1.sql a partir do zip OFICIAL "EFD-REINF - Tabelas 15012026.zip" [D01]
(SHA-256 conferido abaixo) e das normas lidas no dossiê. Determinístico: rodar de novo dá o mesmo arquivo.

Uso (da raiz do repo):  python -I pesquisas-legais/retencoes-fonte-pr1-reinf-tabelas/gerar_carga.py
Requer openpyxl.
"""
import hashlib
import io
import json
import pathlib
import sys
import zipfile

import openpyxl

RAIZ = pathlib.Path(__file__).resolve().parents[2]
ZIP = RAIZ / 'pesquisas-legais/retencoes-fonte-pr1-reinf-tabelas/docs/D01_EFD-REINF-20-20Tabelas-2015012026-zip.html'
SAIDA = RAIZ / 'server/prisma/data/legal_parameters_retencoes_v1.sql'
SHA_ZIP = '31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7'
URL_ZIP = 'http://sped.rfb.gov.br/estatico/56/02690B8D5DE8904DFAB98799195B016052E4F5/EFD-REINF%20-%20Tabelas%2015012026.zip'
MOTIVO = 'BE-INCR-RETENCOES-FONTE PR-1 (itens 1, 2, 3 e 7; Emenda 22/10; F-RET-16/17/19 ratificados 22/10); executa: dono, chat, 2026-10-24'
QUEM = 'migracao:RETENCOES-FONTE-PR1'

COLS = '"id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt"'

# Fontes das normas (dossiês brief-2026-10-22-retencoes-fonte e retencoes-fonte-pr1-reinf-tabelas).
L10833 = ('Lei 10.833/2003', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-12-29;10833', 'fa0d994627d9e1476d625a9f0b588e596181735b922bdcdf9c1c0336fd06b9fc')
LC214 = ('LC 214/2025', 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm', '6f7a703e66995ebc9564b868e2867cb59820b52a9094274062510cfb00a99141')  # [D05] do manifesto
RIR = ('Decreto 9.580/2018 (RIR/2018)', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm', '99577ff589f6e346588214958e91f358bd9bebe835a4f8d2e5962b680e18d9f1')
L8212 = ('Lei 8.212/1991', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212', '6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7')
L9430 = ('Lei 9.430/1996', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-27;9430', '6e8e20371d0e7796244402441b7e3fc72df83a7bbe640029d4919359a6115bcc')
L11482 = ('Lei 11.482/2007', 'https://normas.leg.br/?urn=urn:lex:br:federal:lei:2007-05-31;11482', '0c2aeb0a857f68c5c325b2eef940461ffd5cd422422692c1057de35af96256bf')
L9250 = ('Lei 9.250/1995', 'https://www.planalto.gov.br/ccivil_03/leis/l9250.htm', '10d108312d807f2a09f5f773eac7805e09c7f71140439d94e77b768c0fe54717')


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


linhas = []


def add(id_, tabela, chave, disc, vint, vtexto, vjson, fonte, url, sha, desde, ate, status='PUBLISHED'):
    publicado = status == 'PUBLISHED'
    vals = [id_, tabela, chave, disc, vint, vtexto, None if vjson is None else json.dumps(vjson, ensure_ascii=False, separators=(',', ':')),
            fonte, url, sha, desde, ate, status, None, MOTIVO, QUEM, QUEM if publicado else None]
    linhas.append('INSERT OR IGNORE INTO "legal_parameters" (' + COLS + ') VALUES (' + ', '.join(q(v) for v in vals)
                  + (', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);' if publicado else ', NULL, CURRENT_TIMESTAMP);'))


def main():
    bruto = ZIP.read_bytes()
    sha = hashlib.sha256(bruto).hexdigest()
    if sha != SHA_ZIP:
        sys.exit(f'zip com SHA-256 {sha}, esperado {SHA_ZIP}')
    lc214 = LC214
    z = zipfile.ZipFile(io.BytesIO(bruto))

    def planilha(nome):
        ws = openpyxl.load_workbook(io.BytesIO(z.read(nome)), data_only=True).worksheets[0]
        it = ws.iter_rows(values_only=True)
        next(it)
        return [r for r in it if r[0] is not None]

    def data(br):
        if br is None or str(br).strip() == '':
            return None
        if hasattr(br, 'strftime'):
            return br.strftime('%Y-%m-%d')
        d, m, a = str(br).strip().split('/')
        return f'{a}-{m}-{d}'

    # ── Item 1 — RETENCAO ───────────────────────────────────────────────────────────────────────────────────────────
    # Vigência: a CSRF de 4,65% pelo BRIEF (2004-02-01 a 2026-12-31); as demais desde 2025-01-01, o 1º ano apurável
    # (emenda §9 L-10 do LEGAL-PARAMS: tabela sem vigência em código começa no 1º ano apurável).
    f, u, s = L10833
    add('ret-csrf-csll-2004', 'RETENCAO', 'CSRF', 'CSLL', 100, None, None, f + ' arts. 30–31', u, s, '2004-02-01', '2026-12-31')
    add('ret-csrf-cofins-2004', 'RETENCAO', 'CSRF', 'COFINS', 300, None, None, f + ' arts. 30–31', u, s, '2004-02-01', '2026-12-31')
    add('ret-csrf-pis-2004', 'RETENCAO', 'CSRF', 'PIS', 65, None, None, f + ' arts. 30–31', u, s, '2004-02-01', '2026-12-31')
    add('ret-csrf-csll-2027', 'RETENCAO', 'CSRF', 'CSLL', 100, None, None, 'LC 214/2025 art. 509 (Lei 10.833 art. 31 novo; efeitos art. 544 III)', lc214[1], lc214[2], '2027-01-01', None)
    f, u, s = RIR
    add('ret-irrf-servico-profissional', 'RETENCAO', 'IRRF', 'SERVICO_PROFISSIONAL', 150, None, None, f + ' art. 714', u, s, '2025-01-01', None)
    add('ret-irrf-limpeza-conservacao', 'RETENCAO', 'IRRF', 'LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO', 100, None, None, f + ' art. 716', u, s, '2025-01-01', None)
    add('ret-irrf-comissao-propaganda', 'RETENCAO', 'IRRF', 'COMISSAO_PROPAGANDA', 150, None, None, f + ' art. 718', u, s, '2025-01-01', None)
    f, u, s = L8212
    add('ret-inss-cessao', 'RETENCAO', 'INSS', 'CESSAO_MAO_DE_OBRA', 1100, None, None, f + ' art. 31', u, s, '2025-01-01', None)
    add('ret-inss-cprb', 'RETENCAO', 'INSS', 'CPRB', None, None, None, 'Retenção de 3,5% do prestador na CPRB — base legal NÃO lida (P-RET-8, contador + fonte oficial)', u, s, '2025-01-01', None, 'DRAFT')
    f, u, s = L10833
    add('ret-minimo-csrf', 'RETENCAO', 'MINIMO', 'CSRF', 1000, None, None, f + ' art. 31 § 3º', u, s, '2004-02-01', None)
    f, u, s = RIR
    for reg in ('REAL', 'PRESUMIDO', 'ARBITRADO', 'PF'):
        add(f'ret-minimo-irrf-{reg.lower()}', 'RETENCAO', 'MINIMO', f'IRRF_{reg}', 1000, None, None, f + (' art. 785 I' if reg == 'PF' else ' art. 785 II'), u, s, '2025-01-01', None)
    f, u, s = L9430
    add('ret-minimo-darf', 'RETENCAO', 'MINIMO', 'DARF', 1000, None, None, f + ' art. 68', u, s, '2025-01-01', None)

    # ── Item 7 — NATUREZA_RENDIMENTO (Tabela 01): grupo 15 inteiro, 12001 (duas vigências) e 12016 ─────────────────────
    fonte01 = 'EFD-Reinf Tabela 01 (Tabelas de 15/01/2026)'
    trib = {'IR': 'IR', 'CSLL': 'CSLL', 'COFINS': 'COFINS', 'PP': 'PP', 'AGREGADO': 'AGREGADO'}
    for r in planilha('EFD-REINF - Tabela 01.xlsx'):
        grupo, cod, desc, _fci, _13, _rra, _ded, isento, _pfx, _pjx, declarante, tributos, ini, fim = r[:14]
        cod = str(cod).strip()
        if not (cod.startswith('15') or cod in ('12001', '12016')):
            continue
        desde, ate = data(ini), data(fim)
        valor = {
            'descricao': ' '.join(str(desc).split()),
            'grupo': int(str(grupo).split()[1]),
            'declarante': str(declarante).strip(),
            'tributos': [trib[t.strip()] for t in str(tributos or '').split(',') if t.strip()],
            'tiposIsencao': [t.strip() for t in str(isento or '').split(',') if t.strip()],
        }
        add(f'natrend-{cod}-{desde}', 'NATUREZA_RENDIMENTO', cod, None, None, None, valor, fonte01, URL_ZIP, SHA_ZIP, desde, ate)

    # ── Item 2 — RETENCAO_CODIGO: "R-4020" (PJ) e "R-4010" (PF), residência no Brasil ───────────────────────────────────
    # A chave não tem residência: as linhas de beneficiário no exterior ficam fora (EXTERIOR ⇒ 400 neste nó). 10002 fica
    # fora pela Emenda 22/10 item 1 (condição F-REINF-9 a / F-RET-17 a).
    disc_de = {'IRPJ': 'IRPJ', 'IRPF': 'IRPF', 'CSLL': 'CSLL', 'COFINS': 'COFINS', 'PIS/PASEP': 'PIS', 'AGREGADO': 'AGREGADO'}
    per_de = {'Mensal': 'MENSAL', 'Decendial': 'DECENDIAL', 'Quinzenal': 'QUINZENAL', 'Diário': 'DIARIO'}

    def codigos(nome, fonte, ci_trib, ci_cod, ci_per, ci_ini, ci_fim):
        for r in planilha(nome):
            cod = str(r[0]).strip()
            if not (cod.startswith('15') or cod in ('12001', '12016')) or str(r[2]).strip() != 'Não':
                continue
            disc = disc_de.get(str(r[ci_trib]).strip())
            if disc is None:
                continue
            desde, ate = data(r[ci_ini]), data(r[ci_fim])
            add(f'retcod-{cod}-{disc.lower()}-{desde}', 'RETENCAO_CODIGO', cod, disc, None, str(r[ci_cod]).strip().zfill(6),
                {'periodicidade': per_de[str(r[ci_per]).strip()]}, fonte, URL_ZIP, SHA_ZIP, desde, ate)

    codigos('EFD-REINF - Tabela R-4020.xlsx', 'EFD-Reinf Tabela "R-4020" (Tabelas de 15/01/2026)', 3, 5, 6, 7, 8)
    codigos('EFD-REINF - Tabela R-4010.xlsx', 'EFD-Reinf Tabela "R-4010" (Tabelas de 15/01/2026)', 3, 4, 5, 6, 7)
    add('retcod-inss-cessao', 'RETENCAO_CODIGO', 'CESSAO_MAO_DE_OBRA', 'INSS', None, None, None,
        'Código GPS/DCTFWeb do INSS retido (Lei 8.212 art. 31) — tabela NÃO lida (P-RET-6; o ADR cita 2631, grau I)', L8212[1], L8212[2], '2025-01-01', None, 'DRAFT')

    # ── Item 3 — IRRF_PF_MENSAL (Lei 11.482 art. 1º XII; Lei 9.250 arts. 3º-A e 4º) ─────────────────────────────────────
    f, u, s = L11482
    faixas = [(242880, 0, 0), (282665, 750, 18216), (375105, 1500, 39416), (466468, 2250, 67549), (None, 2750, 90873)]
    for i, (ate, bp, ded) in enumerate(faixas, 1):
        add(f'irrfpf-faixa-{i}-2025-05', 'IRRF_PF_MENSAL', f'FAIXA_{i}', None, None, None, {'ateCents': ate, 'aliquotaBp': bp, 'deduzirCents': ded},
            f + ' art. 1º XII (incl. Lei 15.191/2025)', u, s, '2025-05-01', None)
    f, u, s = L9250
    add('irrfpf-reducao-art3a-2026', 'IRRF_PF_MENSAL', 'REDUCAO_ART3A', None, None, None,
        {'limiteZeroCents': 500000, 'tetoCents': 735000, 'constanteCents': 97862, 'coeficienteMilionesimos': 133145},
        f + ' art. 3º-A (incl. Lei 15.270/2025)', u, s, '2026-01-01', None)
    add('irrfpf-dependente-2015-04', 'IRRF_PF_MENSAL', 'DEPENDENTE', None, 18959, None, None, f + ' art. 4º III "i"', u, s, '2015-04-01', None)
    add('irrfpf-desconto-simplificado', 'IRRF_PF_MENSAL', 'DESCONTO_SIMPLIFICADO_BP', None, 2500, None, None, f + ' art. 4º § 2º (red. Lei 14.663/2023)', u, s, '2025-01-01', None)

    SAIDA.write_text('\n'.join(linhas) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(linhas)} linhas em {SAIDA.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
