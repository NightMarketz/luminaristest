# -*- coding: utf-8 -*-
"""
BE-INCR-DP-F2 PR-0R (itens 65 e 66) — gera server/prisma/data/legal_parameters_dp_regras_v1.sql.

Cada linha leva a fonte (artigo), a URL oficial e o SHA-256 do arquivo do dossiê de onde o número foi lido
(manifest.json deste dossiê e o de brief-pes4-f0-f1). `vigenteDesde` = data do ato que deu a redação vigente do
dispositivo, como o texto compilado do dossiê a cita (precedente: FGTS_APRENDIZ_BP do F1, desde a Lei 10.097/2000).
Linhas que são decisão registrada (não lei) começam em 2026-01-01, a 1ª competência com a tabela do INSS na base.

Uso: python -I pesquisas-legais/brief-pes4-f2/gerar_carga_regras.py > server/prisma/data/legal_parameters_dp_regras_v1.sql
"""
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))


def manifest(pasta):
    with open(os.path.join(AQUI, '..', pasta, 'manifest.json'), encoding='utf-8') as f:
        return {d['id']: d for d in json.load(f)['documentos']}


F2 = manifest('brief-pes4-f2')
F1 = manifest('brief-pes4-f0-f1')


def doc(m, i):
    d = m[i]
    return d.get('fonte_oficial') or d['url'], d['sha256']


CEDULA = (None, None)  # decisão registrada (fonte cita a cédula do vault); sem URL nem arquivo oficial
MOTIVO = ('BE-INCR-DP-F2 PR-0R (nó PES-4, BRIEF itens 65–66; regra de parâmetro, dono, 06/11); executa: dono, chat, '
          '2026-11-06 "Executa o F2"; dossiê pesquisas-legais/brief-pes4-f2')

# (id, tabela, chave, discriminador, valorInt, valorTexto, valorJson, fonte, (url, sha), desde, ate)
L = []


def r(id_, chave, fonte, src, desde, ate=None, i=None, t=None):
    L.append((id_, 'FOLHA_REGRA', chave, None, i, t, None, fonte, src, desde, ate))


r('dp-regra-he-adicional-1988', 'HE_ADICIONAL_BP', 'CF art. 7º XVI; CLT art. 59 § 1º (redação da Lei 13.467/2017)', doc(F2, 'D02'), '1988-10-05', i=5000)
r('dp-regra-he-repouso-1949', 'HE_REPOUSO_ADICIONAL_BP', 'Lei 605/1949 art. 9º (remuneração em dobro)', doc(F2, 'D01'), '1949-01-05', i=10000)
r('dp-regra-noturno-adicional-1946', 'NOTURNO_ADICIONAL_BP', 'CLT art. 73 caput (redação do Decreto-Lei 9.666/1946)', doc(F2, 'D02'), '1946-08-28', i=2000)
r('dp-regra-noturno-hora-1946', 'NOTURNO_HORA_SEGUNDOS', "CLT art. 73 § 1º (hora noturna de 52'30\"; redação do Decreto-Lei 9.666/1946)", doc(F2, 'D02'), '1946-08-28', i=3150)
r('dp-regra-noturno-inicio-1946', 'NOTURNO_INICIO_MIN', 'CLT art. 73 § 2º (das 22 h; redação do Decreto-Lei 9.666/1946)', doc(F2, 'D02'), '1946-08-28', i=1320)
r('dp-regra-noturno-fim-1946', 'NOTURNO_FIM_MIN', 'CLT art. 73 § 2º (até as 5 h; redação do Decreto-Lei 9.666/1946)', doc(F2, 'D02'), '1946-08-28', i=300)
r('dp-regra-afastamento-empresa-1999', 'AFASTAMENTO_DIAS_EMPRESA', 'Lei 8.213/1991 art. 60 § 3º (redação da Lei 9.876/1999)', doc(F2, 'D03'), '1999-11-26', i=15)
r('dp-regra-mensalista-base-1949', 'MENSALISTA_BASE_DIAS', 'Lei 605/1949 art. 7º § 2º; Dec. 10.854/2021 art. 157 § 2º', doc(F2, 'D01'), '1949-01-05', i=30)
r('dp-regra-semana-dsr-2021', 'SEMANA_DSR_INICIO', 'Dec. 10.854/2021 art. 158 § 4º (semana de segunda-feira a domingo)', doc(F2, 'D10'), '2021-11-10', t='SEG')
r('dp-regra-jornada-limite-1988', 'JORNADA_LIMITE_SEMANAL_MIN', 'CF art. 7º XIII, redação anterior à EC 141/2026 (44 h semanais)', doc(F1, 'D12'), '1988-10-05', '2026-12-15', i=2640)
r('dp-regra-jornada-limite-2026', 'JORNADA_LIMITE_SEMANAL_MIN', 'EC 141/2026 art. 6º I (42 h, 2 meses após a publicação no DOU de 16/10/2026)', doc(F2, 'D12'), '2026-12-16', '2027-12-15', i=2520)
r('dp-regra-jornada-limite-2027', 'JORNADA_LIMITE_SEMANAL_MIN', 'EC 141/2026 art. 6º II (40 h, 1 ano após o prazo do inciso I)', doc(F2, 'D12'), '2027-12-16', i=2400)
r('dp-regra-repouso-min-1988', 'REPOUSO_DIAS_MIN', 'CF art. 7º XV, redação anterior à EC 141/2026 (repouso semanal remunerado); Lei 605/1949 art. 1º', doc(F1, 'D12'), '1988-10-05', '2026-12-15', i=1)
r('dp-regra-repouso-min-2026', 'REPOUSO_DIAS_MIN', 'EC 141/2026 art. 1º (CF art. 7º XV: 2 dias) e art. 10 I (vigência 2 meses após a publicação)', doc(F2, 'D12'), '2026-12-16', i=2)
r('dp-regra-divisor-1943', 'SALARIO_HORA_DIVISOR', 'CLT art. 64 (30 vezes as horas da duração diária); Súmula TST 431', doc(F2, 'D02'), '1943-05-01', '2026-12-15', t='SEMANA_SEIS_DIAS')
r('dp-regra-divisor-2026', 'SALARIO_HORA_DIVISOR', 'Decisão do dono, F-DPF-1 (D-2026-11-06-DP-BRIEF-F2): divisor pela escala a partir da EC 141/2026; validação do contador pendente (BRIEF §5)', CEDULA, '2026-12-16', t='DIAS_DE_TRABALHO_DA_ESCALA')
r('dp-regra-arredondamento-inss-2026', 'ARREDONDAMENTO_INSS', 'MOS do eSocial S-1.3, S-5001 item 2.13 (trunca em cada faixa); F-DPF-3 revisto, dono, 06/11', doc(F1, 'D11'), '2026-01-01', t='TRUNCAR_POR_FAIXA')
r('dp-regra-arredondamento-2026', 'ARREDONDAMENTO', 'Decisão registrada no BRIEF BE-INCR-DP-F2 item 65 (não é lei): meio para cima ao centavo nos demais pontos declarados', CEDULA, '2026-01-01', t='MEIO_PARA_CIMA_CENTAVO')
r('dp-regra-salario-familia-idade-1991', 'SALARIO_FAMILIA_IDADE_MAX', 'Lei 8.213/1991 art. 66 (filho ou equiparado até 14 anos)', doc(F2, 'D03'), '1991-07-24', i=14)
r('dp-regra-empregado-idade-1998', 'EMPREGADO_IDADE_MIN', 'CF art. 7º XXXIII (16 anos; redação da EC 20/1998)', doc(F1, 'D12'), '1998-12-15', i=16)
r('dp-regra-aprendiz-idade-min-1998', 'APRENDIZ_IDADE_MIN', 'CF art. 7º XXXIII (aprendiz a partir de 14 anos; redação da EC 20/1998)', doc(F1, 'D12'), '1998-12-15', i=14)
r('dp-regra-aprendiz-idade-max-2005', 'APRENDIZ_IDADE_MAX', 'CLT art. 428 caput e art. 433 (menor de 24 anos; redação da Lei 11.180/2005)', doc(F1, 'D05'), '2005-09-23', i=24)
r('dp-regra-aprendiz-prazo-2000', 'APRENDIZ_PRAZO_MAX_MESES', 'CLT art. 428 § 3º (no máximo 2 anos; acrescido pela Lei 10.097/2000)', doc(F1, 'D05'), '2000-12-19', i=24)
r('dp-regra-ferias-aquisitivo-1977', 'FERIAS_AQUISITIVO_MESES', 'CLT art. 130 caput (redação do Decreto-Lei 1.535/1977)', doc(F1, 'D05'), '1977-04-13', i=12)
r('dp-regra-ferias-concessivo-1977', 'FERIAS_CONCESSIVO_MESES', 'CLT art. 134 caput (redação do Decreto-Lei 1.535/1977)', doc(F1, 'D05'), '1977-04-13', i=12)


def enc(id_, cat, inss, fgts, fonte, src, desde):
    j = json.dumps({'inss': inss, 'fgtsChave': fgts, 'irrf': True}, separators=(',', ':'))
    L.append((id_, 'DP_CATEGORIA_ENCARGO', cat, None, None, None, j, fonte, src, desde, None))


enc('dp-encargo-101-1991', '101', 'EMPREGADO', 'FGTS_BP', 'Lei 8.212/1991 art. 12 I "a" e art. 20; Lei 8.036/1990 art. 15 caput', doc(F1, 'D02'), '1991-07-24')
enc('dp-encargo-103-2000', '103', 'EMPREGADO', 'FGTS_APRENDIZ_BP', 'Lei 8.036/1990 art. 15 § 7º (incl. Lei 10.097/2000); Lei 8.212/1991 art. 12 I "a"', doc(F1, 'D04'), '2000-12-20')
enc('dp-encargo-901-2008', '901', 'NENHUM', None, 'Lei 11.788/2008 art. 12 § 2º (estagiário só como segurado facultativo; sem vínculo de emprego)', doc(F2, 'D08'), '2008-09-25')
enc('dp-encargo-723-1991', '723', 'CONTRIBUINTE_INDIVIDUAL', None, 'Lei 8.212/1991 art. 12 V "f" e art. 28 III (sócio com pró-labore, contribuinte individual)', doc(F1, 'D02'), '1991-07-24')


def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


COLS = '"id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt"'
out = []
for (id_, tab, chave, disc, vi, vt, vj, fonte, (url, sha), desde, ate) in L:
    vals = [id_, tab, chave, disc, vi, vt, vj, fonte, url, sha, desde, ate, 'PUBLISHED', None, MOTIVO, 'migracao:DP-F2-PR0R', 'migracao:DP-F2-PR0R']
    out.append(f'INSERT OR IGNORE INTO "legal_parameters" ({COLS}) VALUES ({", ".join(q(v) for v in vals)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);')
sys.stdout.reconfigure(encoding='utf-8', newline='\n')
print('\n'.join(out))
