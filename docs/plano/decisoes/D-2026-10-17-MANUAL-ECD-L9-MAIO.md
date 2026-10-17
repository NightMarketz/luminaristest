---
id: "D-2026-10-17-MANUAL-ECD-L9-MAIO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Manual ECD Leiaute 9 vigente = atualização de maio/2026 (substitui D-2026-09-23)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-17: \"Já dispara as correções que ainda não começaram\" (correções do consolidado de verificação legal de 17/10)"
atualizado: "2026-10-17"
---
# D-2026-10-17-MANUAL-ECD-L9-MAIO — Manual ECD Leiaute 9 vigente = atualização de maio/2026

**Estado:** `decided`  
**Autorização:** dono, chat, 2026-10-17 (correções do consolidado de verificação legal)  
**Substitui:** [[D-2026-09-23-MANUAL-ECD-L9-VIGENTE]]  
**Depende de:** —  
**Desbloqueia:** —  

## Decisão

O manual de referência da ECD é o **Manual de Orientação do Leiaute 9 da ECD, anexo ao ADE Cofis nº 01/2026,
"Atualização: maio de 2026"**, 236 pp., sha256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`.
O leiaute continua 9 (`I010.COD_VER_LC = 9.00`).

## Por quê

Em 17/10/2026 a página oficial de manuais do SPED (<http://sped.rfb.gov.br/pasta/show/1569>) lista só a
"Atualização – maio/2026" (dossiê `pesquisas-legais/verif-2026-10-17-contabil-ecd/relatorio.md` §1 item 3, [D07]).
A edição de janeiro/2026 (sha `7ddf47755f61`), fixada pela D-2026-09-23, deixou de ser a publicada.

## Efeito no código (só citação de página; nenhuma regra mudou)

Conferido em 17/10 no PDF de maio baixado da URL oficial (sha confere):

- J930, J801, J932 e `REGRA_VALIDA_NIVEL_CONTAS` têm o mesmo conteúdo que o código implementa (dossiê §1 item 3).
- As páginas citadas no `server/src` foram trocadas pelas da edição de maio (em geral 1 página adiante):
  I050/`REGRA_VALIDA_NIVEL_CONTAS` p. 120 · 0000 campo 07 / Tabela de UF p. 69 · 0007 pp. 77-78 · I030 p. 114 ·
  J150/DRE nível 1 p. 181, `REGRA_SOMA_NIVEIS_DRE` p. 184 · J801 pp. 193-195 (`COD_MOT_SUBS` e `ARQ_RTF` p. 194,
  regra do RTF p. 195) · J900 p. 196 · J930 pp. 198-203 (campos pp. 200-201, Tabela de Qualificação pp. 201-202,
  regras pp. 202-203, exemplo p. 203) · J932 pp. 204-206.
- Já estavam na numeração de maio e ficaram: `spedQualifAssinante.ts` (pp. 200-203) e `0000.COD_PLAN_REF` nota 21 (p. 63).

## Lacuna

O PDF de janeiro não está no worktree; diferenças entre as duas edições fora dos registros acima não foram comparadas.
