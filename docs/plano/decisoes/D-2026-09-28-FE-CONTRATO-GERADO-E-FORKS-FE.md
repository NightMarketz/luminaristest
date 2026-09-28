---
id: "D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE"
tipo: "decisao"
dominio: "plataforma"
titulo: "Contrato FE↔BE gerado do snapshot de DTOs; forks da Onda 1 de FE e do plano de pendências FE×DTO decididos sob delegação"
estado: "decided"
autorizacao: "dono, chat, 2026-09-28: \"Vamos planejar então usando a solução de snapshot\" + questionários (gerador, F-CT-4, F-CT-6) + \"Pode planejar com bastante granularidade aqui para fecharmos qualquer ponta solta e reiscos abertas, pode decidir tudo\" (delegação)"
atualizado: "2026-09-28"
---
# D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE — contrato gerado e forks de FE decididos

**Estado:** `decided`
**Autorização:** dono, chat, 2026-09-28. Decisões diretas: *"Vamos planejar então usando a solução de snapshot"*, mais
3 questionários. Delegação para o resto: *"Pode planejar com bastante granularidade aqui para fecharmos qualquer ponta
solta e reiscos abertas, pode decidir tudo"*.
**Não é "executa":** cada PR da sequência continua exigindo o "executa" do dono (ORCH-006), e o merge, o "merge" dele.

Plano que executa estas decisões: [`PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md)
(v2, com evidências G1–G19 e a sequência mestre). Spec: [`PRE-ADR-FE-CONTRACT-TYPES.md`](../../adr/PRE-ADR-FE-CONTRACT-TYPES.md).
Nó: [[FE-CONTRACT-TYPES]]. Explicação didática: https://claude.ai/artifact/QcJU1PPjWsz3PQy8vKzU6i

## Decididas pelo dono

| # | Decisão | Palavras / origem |
|---|---|---|
| 1 | Fonte do contrato FE↔BE = **tipos gerados do `dtoShapeSnapshot`**. O FE nunca importa o backend nem espelha à mão | *"Vamos planejar então usando a solução de snapshot"*; antes: *"não faz sentido vc importar coisas do backend no frontend"* (o `import type` foi rejeitado) |
| 2 | Gerador `json-schema-to-typescript` | questionário |
| 3 | Todos os services migram (F-CT-4 → b), exceto DynamicTable | questionário (**contra** a recomendação de só piloto) |
| 4 | Um JSON de snapshot por domínio (F-CT-6 → a) | questionário |

## Decididas pelo agente sob a delegação de 28/09

Todas com evidência no plano v2 (§2). A tabela completa, com motivo, está no §3 do plano.

| # | Decisão |
|---|---|
| 5 | Versão exata `15.0.4`; `format:false`; prettier stubado no próprio teste por `jest.doMock` resolvido a partir do gerador (o prettier 3 faz `import()` no `require` e derruba o Jest; provado e corrigido em 28/09) |
| 6 | Um `.gen.ts` por arquivo de DTO em `my-app/types/contracts/<domínio>/`; `<X>Schema` → `<X>Input`; `.gitattributes` com `eol=lf linguist-generated=true` |
| 7 | **Regra do mapper:** objeto aninhado sai de função com retorno declarado ou de `satisfies`. `.map` sem anotação e `...spread` de rascunho são **proibidos**, porque escapam da checagem de chave extra (medido) |
| 8 | Parse composto body + params: `Pick<XInput, chaves do body>`. Rotas com pré-processamento (só SPED): DTO completo + extensão explícita (`signerContactIds`) |
| 9 | Fora de escopo: query strings, respostas, OpenAPI gerado do Zod. `triggerQdrantInjection` (código morto, rota inexistente) é removida no PR-3 |
| 10 | GAP-MAP ganha: OpenAPI × Zod divergente [ABERTO]; `openPeriod` lê `req.body.unitId` sem Zod [ABERTO, baixa] |
| 11 | **PR-0 do worktree `ecstatic-haibt-11235f` não sobe.** Sobe o FE-FIX-SPED-ECD-SIGNERS, que o contém (F-A2 → a). Diff descartado com backup (`backup-pr0-e-limpeza-2026-09-28.patch`, sha256 `ae393be5b1cc425c…`) |
| 12 | Onda 1 (`PLANO-ONDA1-FE-2026-09-28.md` §11): F-FE-L2-1 → a · L2-2 → a · SG-1 → a · **SG-2 → (d)**: select "contador do cadastro" que envia `signerContactIds` (F-C12-4, que já existe no `spedController`), mantendo a linha manual · RV-1 → superado (#368) · RV-2..4 → a · DL-1..5 → a · BS-1..5 → a |
| 13 | `PLANO-PENDENCIAS-FE-DTO-2026-09-28.md` (sessão da varredura): F-A1 → (c) · F-A2 → (a) · F-A3 → (a) · F-B2-1 → (a) · F-B2-2 → (a). F-B3-1/2: vale a ratificação da sessão do CRM que os executa; na falta, (a)/(a). B8 superado pelo item 1; B7 absorvido pelo PR-3; B5 fechado (o `ImportExportPanel` não oferece os 2 kinds — BRIEF DELIVERY §6.2) |
| 14 | Gate de merge = CI verde + "merge" do dono. Nenhum revisor novo (CLAUDE.md §⛔) |
| 15 | Sequência mestre serial: PR-DOCS → FE-FIX → CRM Porte/Papel → contrato PR-1 → PR-2 → LALUR-PR2 → SPED-SIGNERS → REVIEW → DELIVERY → (BANK-SETTLEMENT em paralelo depois do PR-2) → contrato PR-3 |

## O que a moratória diz disto

A regra do CLAUDE.md §⛔ veta **aparato de auditoria novo** (gate, rodada, revisor) enquanto houver oráculo externo
aberto. O item 1 **estende um teste que já existe** (`dtoShapeSnapshot`, que já gera JSON Schema desde a Fase 4 do
GAP-MAP), sem passo novo de CI. Ele fecha o resíduo que o próprio teste declarava (*"comparar os dois exige codegen e
está fora"*). É o dono quem decide se isso cabe na regra, e ele decidiu em 28/09. O B8 do `PLANO-PENDENCIAS`, que dizia
"vetado", foi escrito antes dessa decisão.
