---
id: "FE-CONTRACT-TYPES"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Tipos de payload do FE gerados do snapshot de DTOs (fim do espelho à mão)"
estado: "planned"
estado_detalhe: "PRE-ADR ratificado 28/09 (F-CT-1 snapshot, gerador json-schema-to-typescript 15.0.4, F-CT-4 b, F-CT-6 a) + decisões delegadas; plano v2 com 3 PRs seriais (gerador+contábil+piloto SPED → 9 services contábil/financeiro → todos os domínios + 7 services); gerador provado no Jest real (258 schemas, 17 domínios, 0 falhas); começa depois do FE-FIX-SPED-ECD-SIGNERS em main; falta 'executa'"
autorizacao: "dono, chat, 2026-09-28: \"Vamos planejar então usando a solução de snapshot\" + questionários + \"pode decidir tudo\" (delegação) — plano e decisões; sem 'executa'"
ancora_sdd: "fora do SDD consolidado (nó de 28/09)"
atualizado: "2026-09-28"
---
# FE-CONTRACT-TYPES — Tipos de payload do FE gerados do snapshot de DTOs (fim do espelho à mão)

**Estado:** `planned` — PRE-ADR ratificado 28/09 (F-CT-1 snapshot, gerador json-schema-to-typescript 15.0.4, F-CT-4 b, F-CT-6 a) + decisões delegadas; plano v2 com 3 PRs seriais (gerador+contábil+piloto SPED → 9 services contábil/financeiro → todos os domínios + 7 services); gerador provado no Jest real (258 schemas, 17 domínios, 0 falhas); começa depois do FE-FIX-SPED-ECD-SIGNERS em main; falta 'executa'  
**Autorização:** dono, chat, 2026-09-28: "Vamos planejar então usando a solução de snapshot" + questionários + "pode decidir tudo" (delegação) — plano e decisões; sem 'executa'  
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
