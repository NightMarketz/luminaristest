---
id: "FE-CONTRACT-TYPES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Tipos de payload do FE gerados do snapshot de DTOs (fim do espelho à mão)"
estado: "inflight"
prs: ["#428"]
estado_detalhe: "PRE-ADR ratificado 28/09 (F-CT-1 snapshot, gerador json-schema-to-typescript 15.0.4, F-CT-4 b, F-CT-6 a) + decisões delegadas; plano v2 com 3 PRs seriais (gerador+contábil+piloto SPED → 9 services contábil/financeiro → todos os domínios + 7 services); gerador provado no Jest real (258 schemas, 17 domínios, 0 falhas). FE-FIX em main (#427); PR-1 (gerador + 43 contábeis + piloto SPED) MERGEADO #428 `354bc78c`; PR-2 (9 services contábil/financeiro) aberto; PR-3 pendente (depende do CRM Porte/Papel); decisão nova do dono 28/09: maxItems:-1, mantém mínimo (arrays .min(n) viram tupla; FE usa nonEmpty/atLeastTwo)"
autorizacao: "dono, chat, 2026-09-28: \"Vamos planejar então usando a solução de snapshot\" + questionários + \"pode decidir tudo\" (delegação) — plano e decisões; EXECUTA: \"Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui\" (lançamento da sessão de execução) + \"Pode criar pr e comittar\""
ancora_sdd: "fora do SDD consolidado (nó de 28/09)"
atualizado: "2026-09-28"
---
# FE-CONTRACT-TYPES — Tipos de payload do FE gerados do snapshot de DTOs (fim do espelho à mão)

**Estado:** `inflight` — PRE-ADR ratificado 28/09 (F-CT-1 snapshot, gerador json-schema-to-typescript 15.0.4, F-CT-4 b, F-CT-6 a) + decisões delegadas; plano v2 com 3 PRs seriais (gerador+contábil+piloto SPED → 9 services contábil/financeiro → todos os domínios + 7 services); gerador provado no Jest real (258 schemas, 17 domínios, 0 falhas). FE-FIX em main (#427); PR-1 (gerador + 43 contábeis + piloto SPED) MERGEADO #428 `354bc78c`; PR-2 (9 services contábil/financeiro) aberto; PR-3 pendente (depende do CRM Porte/Papel); decisão nova do dono 28/09: maxItems:-1, mantém mínimo (arrays .min(n) viram tupla; FE usa nonEmpty/atLeastTwo)  
**Autorização:** dono, chat, 2026-09-28: "Vamos planejar então usando a solução de snapshot" + questionários + "pode decidir tudo" (delegação) — plano e decisões; EXECUTA: "Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui" (lançamento da sessão de execução) + "Pode criar pr e comittar"  
**PRs:** #428  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** fora do SDD consolidado (nó de 28/09)

## Docs

- [`docs/adr/PRE-ADR-FE-CONTRACT-TYPES.md`](../../adr/PRE-ADR-FE-CONTRACT-TYPES.md) — spec e forks (§10 pesquisa, §11 ratificação)
- [`docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md) — plano v2 (evidências G1–G19, decisões D1–D18, sequência mestre, PR-1 passo a passo)
- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]
- Explicação didática: https://claude.ai/artifact/QcJU1PPjWsz3PQy8vKzU6i

## O que é

O FE espelhava à mão, em `my-app/lib/services/*.service.ts`, os corpos que o servidor valida com Zod `.strict()`. Em
20/09, o #353 mudou o signatário J930 e a cópia do FE não acompanhou: a ECD pela tela deu 400 por 8 dias, sem nenhum
teste vermelho. A correção estrutural: o teste `dtoShapeSnapshot`, que já converte cada DTO em JSON Schema, passa a
gerar `my-app/types/contracts/<domínio>/<Dto>.gen.ts` e reprova se o arquivo comitado divergir. O FE importa só da
própria pasta, e o `tsc` do FE quebra no mesmo PR que muda o DTO.

## Evidência

- Sondas de 28/09 (plano v2 §2):
  - 184/184 schemas contábeis e 258/258 em todos os domínios compilam, sem `any` na contabilidade;
  - saída determinística em LF;
  - tipos gerados passam no `tsc` e no `lint:gate` do my-app;
  - o tipo gerado barra o `identQualif` do PR-0 (TS2353) e o código fora da tabela (TS2322).
- 28/09 (execução): o gerador emite **tupla** para `minItems`/`maxItems` (`FiscalDocumentDto.gen.ts` com 681 linhas de uniões; `signers: drafts.map(toX)` dava TS2322). Dono, questionário: *"maxItems:-1, mantém mínimo"* → 2.463 → 1.807 linhas; `.min(1)`/`.min(2)` seguem tupla, montadas por `nonEmpty()`/`atLeastTwo()` (`my-app/lib/utils/nonEmpty.ts`).
- #427 (`0eb0799d`): FE-FIX-SPED-ECD-SIGNERS em `main` — pré-requisito do PR-1 cumprido.
- #428 (`354bc78c`, 28/09): PR-1 em `main` — 43 `.gen.ts`, snapshot 89/89, SPED tipado, 4 mordidas do §6.3 coladas no PR (a iv prova que `.map` sem anotação passa verde).
