---
id: "D-2026-10-11-QUESTIONARIO-DONO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Questionário do dono de 11/10: 3.4 no Presumido = receita bruta (.98), certificado = PAA + PSC em nuvem, executa dos itens 1+2, 3, 4 e 5 da continuação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-11, questionário (AskUserQuestion): (b) \"Receita bruta .98 (Recomendado)\"; (a) \"PAA + PSC nuvem (Recomendado)\"; executa marcado para \"1+2 H1: referencial + ECF\", \"3 FE-INCR-TAX-ASSESSMENT\", \"5 Emendas de BRIEF\", \"4 DFE-EVENTOS PR-1\""
atualizado: "2026-10-11"
---
# D-2026-10-11-QUESTIONARIO-DONO

**Estado:** `decided`. Origem: sessão de continuação do fiscal/contábil de 11/10, sobre as pendências de
[[D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO]].

## Cédulas

| Item | Pergunta | Resposta do dono (literal) | Efeito |
|---|---|---|---|
| (b) | Em qual linha a 3.4 entra no Lucro Presumido? | "Receita bruta .98 (Recomendado)" | 3.4 → `3.01.01.01.01.98` "Outras Receitas da Atividade Geral" (Presumido e Real). Entra na receita bruta, com a presunção de serviço (32%: DL 1.598 art. 12 IV; Lei 9.249 art. 15 §1º III a, conforme a PROPOSTA-REFERENCIAL-D1 §3). Fecha a III-3 (a) e a PE-2 por delegação (D-1). BRIEF `BE-INCR-H1-REFERENCIAL-3-4` |
| (a) | F-ADN-1 / F-NFCE-E1-1: caminho do certificado | "PAA + PSC nuvem (Recomendado)" | NF-e e NFC-e assinadas pelo PAA (NT 2026.001), sem guardar o certificado do cliente. NFS-e nacional por certificado em nuvem num PSC credenciado (DOC-ICP-04 v8.3, 6.1.1.8). Exige emendar os BRIEFs `BE-INCR-DFE-ADN-EMISSOR` e `BE-INCR-NFCE-EMENDA-1` (sem 'executa' de emissão real) |
| Executa | Trabalho de agente autorizado | "1+2 H1: referencial + ECF", "3 FE-INCR-TAX-ASSESSMENT", "5 Emendas de BRIEF", "4 DFE-EVENTOS PR-1" | Em série, cada um pela sua sessão: BRIEF curto e depois feature (1+2); feature do PR-1 do FE-INCR-TAX-ASSESSMENT (3); planejamento das emendas (5); feature do PR-1 do BE-INCR-DFE-EVENTOS em modo manual (4). Merge só com OK do dono |
| F-HR-1 | Kit v2 do salão neste incremento? | "Sim, PR-2 (Recomendado)" | PR-2 do `BE-INCR-H1-REFERENCIAL-3-4` |
| F-HR-2 | Regimes do v2 | "Presumido + Real (Recomendado)" | sem bloco SIMPLES/MEI |
| F-HR-3 | Forma da 3.4 na segregação | "Campo próprio" (**contra a recomendação**) | `naoUsoCents` + linha de memória `RECEITA_NAO_USO`; base de serviço = max(0, 3.1 + 3.4) |
| F-HR-4 | 9 folhas da emenda 3.3 | "No PR-1 da emenda (Recomendado)" | kit v3 + batch no runbook no mesmo PR da emenda |

## Fora desta decisão
- O mapeamento nos escopos que já existem (dev.db do H1) é passo do RUNBOOK-H1. Quem executa é o dono, ou o agente
  sob comando dele no chat (CLAUDE.md, regra do runbook).
- O F-ADN-2..13, F-NFCE-E1-2..9, F-FE-COB-1..8, F-PES-0..13 e F-ICMS-0..14 continuam pendentes.
- Ações humanas: Portal do Simples até 15/10; assinatura do contador; perguntas ao advogado do §10.3.
