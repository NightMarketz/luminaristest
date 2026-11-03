---
id: "D-2026-10-29-FE-ECF-Y600-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "FE da ECF com Y600: forks F-FE-Y600-1..6 ratificados na recomendação; entram a rota de leitura (PR-0) e o cadastro de sócios (PR-2)"
estado: "decided"
autorizacao: "dono, questionário da sessão de planejamento, 2026-10-29: \"Rota da ECF\" (F-FE-Y600-1), \"Sim, como PR-2\" (F-FE-Y600-2), \"Ratifico 3a, 4a, 6a\" (F-FE-Y600-3/4/6), \"Aba Perfil fiscal\" (F-FE-Y600-5) — decide os forks do BRIEF; sem 'executa'"
atualizado: "2026-10-29"
---
# D-2026-10-29-FE-ECF-Y600-FORKS — forks do BRIEF do FE da ECF com Y600

**Estado:** `decided`. **Autorização:** dono, questionário da sessão de planejamento, 29/10/2026. Todas as respostas
foram na recomendação.
**Não dá `executa`:** a implementação (`sessao-feature`) exige autorização própria. Nó: [[FE-INCR-ECF-Y600]].
BRIEF: [`FE-INCR-ECF-Y600-brief.md`](../../accounting/FE-INCR-ECF-Y600-brief.md) §4.

## Contexto apresentado ao dono

O passo 14 do [[H2]] falhou em 29/10 (PR #982) porque os painéis da ECF mandam `socios: []` fixo. O BRIEF achou duas
lacunas além do painel:
- o `my-app` não tem tela nem service de sócios;
- `GET /accounting/partners` só lista quem está vigente numa data, enquanto o `montarY600` exige todas as vigências que
  cruzam o ano.

## Cédulas

| # | Ponto | Escolha do dono | Diverge da recomendação? |
|---|---|---|---|
| F-FE-Y600-1 | De onde vêm as vigências do ano | (b) rota de leitura da ECF pela mesma função do `montarY600` (PR-0, toca `server/`) | não |
| F-FE-Y600-2 | Cadastro de sócios na tela | (a) PR-2 deste nó | não (amplia o item, com OK do dono) |
| F-FE-Y600-3 | Dirigentes | (a) editor manual, sem importar de `company-signers` | não |
| F-FE-Y600-4 | Select de QUALIF por caso | (a) filtra no FE pela tabela da p. 574 | não |
| F-FE-Y600-5 | Onde fica a seção Sócios | (a) aba Perfil fiscal | não |
| F-FE-Y600-6 | O complemento persiste? | (a) não, vive só na tela (D4) | não |

## O que segue aberto

- Execução: `sessao-feature` do BRIEF (PR-0 → PR-1 → PR-2), com "executa" próprio do dono.
- Insumo ausente: a descrição dos códigos QUALIF e QUALIF_REP_LEG ([D01] pp. 572–573), que a sessão de feature transcreve.
- Oráculo real: reexecutar o passo 14 do RUNBOOK-H2 em build de produção (gate humano).
