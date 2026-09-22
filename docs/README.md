# `docs/` — mapa da árvore (índice, 2026-09-14)

> **O que este arquivo é:** o índice de leitura de `docs/`. Diz **qual doc é fonte de verdade** em cada
> assunto, qual é histórico e por onde começar segundo o papel. **O que não é:** não decide nada — toda
> decisão citável vive numa cédula, ADR ou runbook assinado. Pasta a pasta abaixo; a pasta de contabilidade
> (~130 arquivos na raiz + 3 subpastas) tem índice próprio em [`accounting/README.md`](accounting/README.md).
>
> **Regra de manutenção:** doc novo em `docs/accounting/` entra na tabela do índice de lá na mesma PR;
> doc que virar histórico ganha banner `⚠️ SUPERSEDED/HISTÓRICO` **no topo do próprio arquivo**, apontando o
> sucessor — o índice aponta, o banner prova.

## Por onde começar (por papel)

| Papel | Leia nesta ordem |
|---|---|
| **Dono** (decidir / assinar) | [`accounting/PROXIMOS-PASSOS-2026-09-17.md`](accounting/PROXIMOS-PASSOS-2026-09-17.md) (o que está em voo e onde há stop humano) → [`accounting/GRAFO-DEPENDENCIAS-2026-09-14.md`](accounting/GRAFO-DEPENDENCIAS-2026-09-14.md) §4 → runbooks em branco (`accounting/RUNBOOK-*.md`) → [`operating-manual/PLAYBOOK.md`](operating-manual/PLAYBOOK.md) |
| **Orquestrador de agente** | `CLAUDE.md` (raiz) → [`accounting/ACCOUNTING-MASTER-MAP.md`](accounting/ACCOUNTING-MASTER-MAP.md) §1/§4 (travadas/rejeitadas) → grafo 14/09 → plano 14/09 §Detalhamento → [`operating-manual/GAP-MAP.md`](operating-manual/GAP-MAP.md) |
| **Sessão de feature / correção** | BRIEF do nó (índice em `accounting/README.md`) → ADR citado no BRIEF ([`adr/INDEX.md`](adr/INDEX.md)) → [`claude-skills/GENERATION_CONTRACTS.md`](claude-skills/GENERATION_CONTRACTS.md) → `server/CLAUDE.md` / `my-app/CLAUDE.md` |
| **Revisor independente** | PR + BRIEF + [`operating-manual/CONTRATO-DE-RETORNO.md`](operating-manual/CONTRATO-DE-RETORNO.md) + [`operating-manual/REPORTE-HUMANO-FORMAT.md`](operating-manual/REPORTE-HUMANO-FORMAT.md) |
| **Contador / parceiro** (via dono) | [`accounting/PEDIDO-CONTADOR-2026-09-03.md`](accounting/PEDIDO-CONTADOR-2026-09-03.md) · [`adr/ADR-CONTADOR-DELIVERY.md`](adr/ADR-CONTADOR-DELIVERY.md) · [`adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) |

## Fonte de verdade por assunto (uma linha cada)

| Assunto | Doc vigente | Sucessão / observação |
|---|---|---|
| Roadmap contábil (nós, estados, régua) | `accounting/ACCOUNTING-MASTER-MAP.md` | fold no topo a cada merge; §5.1 fila; §7.1 régua **44/57** (fold 17/09) |
| Dependências e próximo nó | `accounting/GRAFO-DEPENDENCIAS-2026-09-14.md` | supersede 09-11 e 09-07 |
| Ordem de execução + detalhamento por passo | `accounting/PROXIMOS-PASSOS-2026-09-17.md` | supersede 09-14 (11/12 ✅) /09-02/09-01/08-31/08-28 |
| Decisões do dono (citáveis) | `accounting/CEDULA-DECISAO-*.md` (7) | a de **14/09 forks-ratificações prevalece** onde diverge da de 14/09 gates-humanos |
| Decisões de arquitetura | `adr/` (43 ADRs + pareceres/ratificações, [`adr/INDEX.md`](adr/INDEX.md)) | ADR emendado ganha bloco `EMENDA <data>` no corpo, nunca arquivo novo; primeiro ADR `Rejected` = `ADR-DOMAIN-MOTOR-rejected.md` (2026-09-21) |
| Gates humanos | `accounting/RUNBOOK-{B4,X2,H1,H2,H2-WIZARD,H3,M2}.md` | **todos em branco** (0 desfecho marcado em 14/09); formato em `operating-manual/RUNBOOK-FORMAT.md` |
| Horizonte de plataforma (fábrica de verticais) | `ROADMAP-PLATAFORMA.md` | camada de horizonte; não é fila |
| Sequência executável dos 3 degraus | `PLANO-MODULO-COMPLETO-REPLICAVEL.md` | ponteiro de estado 14/09 no topo; vale como definição de pronto |
| Lacunas × instrumentos (medido) | `operating-manual/GAP-MAP.md` | coluna Status derivada de comando — não edite à mão |
| Disciplina operacional | `operating-manual/{PORTABLE-GUIDE,REASONING-TRAITS,MODEL-TUNING,PLAYBOOK}.md` | detalhe das regras do `CLAUDE.md`; `ORACLE-DEFICIT.md` explica por que a bancada foi desligada (09/08) |
| Scaffolding por camada | `claude-skills/GENERATION_CONTRACTS.md` (+ `ATOM_REGISTRY`, `SKILL_MATRIX`) | contrato de qualidade em `.claude/skills/_ARCHITECTURE-CONTRACT.md` |
| CRM | `crm/CRM_REMEDIATION_AND_ROADMAP.md` + `crm/BE-INCR-CRM-MODULE-COMPOSITION-brief.md` | councils de 20/07 = histórico de decisão |
| Deploy / operação | `runbooks/DEPLOYMENT.md`, `runbooks/accounting-sync-reconciliation.md` | M2 (1º deploy) segue gate humano em branco |
| Dívida técnica registrada | `tech-debt/avoidable-any-remediation.md`, `tech-debt/rag-vector-store-reanalysis.md` | a 2ª é ponto de re-análise de IA/RAG, **não** autorização |
| Aprendizados / wiki | `learnings/accounting-buildout.md` → `wiki/index.md` (ingest log em `wiki/log.md`) | memória de agente fora do repo é outra coisa (`~/.claude/projects/.../memory`) |

## Pasta a pasta

| Pasta | Conteúdo | Vigente? |
|---|---|---|
| `accounting/` | ~130 arquivos na raiz: master map, grafos, próximos passos, cédulas, BRIEFs BE/FE, runbooks, smoke-gates, dossiês P1/P2, validações antigas | índice em [`accounting/README.md`](accounting/README.md) |
| `accounting/fontes-oficiais/` | corpus de 23 normas (Manual ECD/ECF, IN 1.700 + anexos, LC 116, CNAB 240, NFS-e) — `MANIFEST.md` com sha256 | ✅ em `main` desde #311 (D3b) |
| `accounting/fixtures/incr6-validation/` | fixtures da validação funcional do INCR-6 (import/export) | histórico, ainda usado por testes |
| `accounting/pr-bodies/` | corpos de PR do lote paralelo de 07/2026 (PR 1–7) | histórico |
| `adr/` | 43 ADRs + 5 pareceres do `luminaris-accounting-architect` + 2 ratificações D0 (51 arquivos) | `INDEX.md` |
| `architecture/` | `lint-layer-gate.md` (gate de camadas no CI — **parcial**, não é prova) | vigente |
| `claude-skills/` | contratos de geração, registro de átomos, matriz de skills, relatório de auditoria de skills, `SKILLS_GUIDE.html` | vigente (auditoria via `skill-audit`) |
| `crm/` | roadmap/remediação, councils de 07/2026, kit de validação D6, `specs/` (Parte B P0 fatias 1–6 + Fases 0–2) | roadmap vigente; specs = histórico executado |
| `learnings/` | ledger de aprendizados do buildout contábil (skill `learning-log`) | vigente (append-only) |
| `operating-manual/` | gates OPS, guia portável, traços, tuning por modelo, GAP-MAP, formatos de runbook/reporte/contrato de retorno, bancada RS (spec **não montada**) | vigente |
| `runbooks/` | deploy + reconcile job | vigente |
| `system-test/` | rodadas 2–3 de teste de sistema do pipeline de agentes (07/2026) | histórico |
| `tech-debt/` | `any` evitáveis; RAG/Qdrant | vigente |
| `wiki/` | índice de conceitos + log de ingest | vigente |
| raiz | `ROADMAP-PLATAFORMA.md`, `PLANO-MODULO-COMPLETO-REPLICAVEL.md` (vigentes); `RESUME-PROMPTS.md`, `VALIDATION_STATUS.md`, `RELATORIO-CONSOLIDADO.html` (**históricos**, 06–07/2026, banner no topo) | — |

## Convenções que os docs seguem

- **Datas no nome** (`*-2026-09-14.md`) = snapshot; o mais novo vale, o anterior recebe banner.
- **BRIEF** = saída de `sessao-planejamento`: checklist numerado + contratos esboçados + forks `PENDENTE`.
  Ratificação vira `RATIFICADO (x)` **no cabeçalho do próprio BRIEF** e na cédula do dia.
- **Cédula** = registro citável (ORCH-006) de decisão do dono por questionário. Duas cédulas no mesmo dia
  → a tabela de reconciliação diz qual prevalece.
- **Runbook** = evidência colada, desfecho em 3 estados, assinatura humana. Agente prepara em branco.
- **Fold** = parágrafo no topo do master map + linhas de §5.1/§7.1 após cada merge; o grafo ganha sucessor
  datado quando muda estado de nó.
- **Régua** = 1 nó = 1 ciclo SDD; nó que só cresce não vira nó novo (regra 2 do §7.1). Hoje **44/57** (fold 17/09).
