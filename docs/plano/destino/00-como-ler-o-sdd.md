---
tipo: "destino"
secao_sdd: "cabeçalho"
titulo: "Como ler o SDD: partes, selos, verificação"
---
# Como ler o SDD — partes, selos e verificação de 23/09

> **PLANO ÚNICO DO PROJETO desde 2026-09-23** (decisão do dono: "Atualiza e unifica todos os planos do projeto pra
> esse aqui"; forks da unificação respondidos no mesmo dia — o SDD **absorve** o master map; planos antigos ganham
> banner **SUPERSEDIDO** e ficam como histórico no mesmo caminho).
>
> **Como este documento se organiza e quem manda em quê:**
>
> | Parte | Conteúdo | Origem | Autoridade |
> |---|---|---|---|
> | **I — Destino** | visão, catálogo de ~140 capacidades, arquitetura, IA, Brasil fiscal, invariantes, grafo de ondas | SDD v2 estendida (dono, 23/09) **com as correções do revisor independente** marcadas `⟨corr⟩` | descreve o alvo; **não autoriza nada** (ORCH-006) |
> | **II — Estado e decisões ratificadas** | trilhos travados, rejeitadas, diferidos, **fila ratificada §M5.1 (Blocos A/B)**, régua §M7.1 | ex-`docs/accounting/ACCOUNTING-MASTER-MAP.md` §1–§8, migrado **verbatim** | **fonte de verdade do estado e da fila** — vence a Parte I quando divergem |
> | **III — Fila executável** | ordem de execução por passo, grafo nó a nó, CADEIA-A (C8) | ex-`PROXIMOS-PASSOS-2026-09-17.md`, `GRAFO-DEPENDENCIAS-2026-09-14.md`, `CADEIA-A.md`, `ORQUESTRADOR-PASSOS-9-13.md` | a sequência de hoje; cada passo ainda exige autorização citável |
> | **IV — Horizonte** | fases P1–P5 e P-i18n, degraus 0–2, gap do CRM vs Salesforce | ex-`ROADMAP-PLATAFORMA.md`, `PLANO-MODULO-COMPLETO-REPLICAVEL.md`, `crm/CRM_REMEDIATION_AND_ROADMAP.md` | definição de pronto e gatilhos; não é fila |
> | **Apêndice** | mapa dos documentos supersedidos → onde o conteúdo vivo foi parar | esta unificação | — |
>
> **Âncoras estáveis.** A Parte II preserva a numeração do antigo master map com prefixo `M`: **`§M5.1` = antigo
> "master map §5.1"**, `§M1` = §1 travadas, `§M4` = §4 rejeitadas, `§M7.1` = régua por módulo. As ~150 citações
> "master map §N" e as 136 "Bloco A" espalhadas em ADRs, briefs e skills continuam válidas lidas assim. O arquivo
> `ACCOUNTING-MASTER-MAP.md` fica **congelado** como histórico (inclusive as citações por número de linha).
>
> **Como manter (fold):** a cada incremento fechado, atualize **este arquivo** — Parte II (§M5.1 estado do nó,
> §M7.1 régua, banner de estado) e Parte III (coluna Estado). Não se atualiza mais o master map nem um
> `PROXIMOS-PASSOS-*` novo. Proposta nova: cheque §M1 (travadas) e §M4 (rejeitadas) primeiro — se colidir, é ADR.
>
> **Selos:** **DECIDIDO** existe em `main` ou foi ratificado (Parte II, ADRs, cédulas) · **DECIDIDO (em fila)**
> ratificado, sem código ainda · **GATILHO** previsto, entra por demanda nomeada (P3/P4/P-i18n/P5) · **PROPOSTO**
> extensão deste SDD para chegar ao nível de mercado — **não é decisão**; precisa de PRE-ADR → ratificação antes de
> virar nó na §M5.1.
>
> **Verificação (23/09):** revisor independente conferiu os selos de estado e as arestas do §18 contra `origin/main`
> `634adab8`: **29 confirmados, 15 divergentes, 7 sem evidência**. Os divergentes foram corrigidos no texto
> (`⟨corr⟩` + fonte); os que mudam decisão do dono estão em **§18.4 Divergências abertas** — não foram decididos aqui.

**Estado hoje (fold 2026-09-22):** régua **46/57** — contábil 20/22 · financeiro 17/19 · fiscal 9/16 (leitura
alternativa declarada 47/57, §M7.1). 16 domínios de módulo no estado completo · ~140 capacidades catalogadas ·
referências de mercado: Salesforce SMB · TOTVS Protheus.

---
