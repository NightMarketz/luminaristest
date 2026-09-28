---
id: "D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM"
tipo: "decisao"
dominio: "plataforma"
titulo: "CRC no formato do CFC (GAP-MAP 15, F-1..F-4), seed com unidade real (F-S*, F-P*) e ordem de execução até o M2"
estado: "decided"
autorizacao: "questionários e chat do dono em 2026-09-28; F-P1..F-P7 e a ordem por delegação explícita (\"Pesquise e decida as pendentes…\"; \"Pode organizar ao plano central e decidir qual ordem seguir no plano central\")"
atualizado: "2026-09-28"
---
# D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM — decisões de 28/09 e ordem até o M2

**Estado:** `decided`
**Autorização:** questionários e chat do dono em 2026-09-28; F-P1..F-P7 e a ordem por delegação explícita ("Pesquise e decida as pendentes…"; "Pode organizar ao plano central e decidir qual ordem seguir no plano central")

## Decisões

| # | Decisão | Palavras do dono (28/09) | Efeito |
|---|---|---|---|
| 1 | UF do CRC de registro transferido/secundário = a de origem **ou** a do sufixo | "Origem OU destino (Recommended)" (questionário) | [[CRC-CFC]] — GAP-MAP 15 |
| 2 | F-1 (só tipo `O`), F-2 (provisório com motivo próprio), F-3 (grafia compacta) → (a) | "Sim, todas (a)" | [[CRC-CFC]] |
| 3 | F-4 → (a): máscara CFC também no 0930 da ECF, depois da pesquisa no Manual ECF L12 | "Pesquisa qual o padrão e a regra" → "Mesma máscara da ECD" | [[CRC-CFC]] |
| 4 | F-S1b (salão inteiro), F-S1c (re-semear), F-S2 e F-S3 (a) | respostas do questionário | [[SEED-UNITS]] |
| 5 | F-S1 → (a1): serviço extraído do controller, usado pelo onboarding e pelo seed | "Pode seguir planejando de acordo com a recomendação a" | [[SEED-UNITS]]; emenda de LOCAL do F-I1-1 de [[I1]] (propriedades ratificadas intactas) |
| 6 | F-P1..F-P7 — decididos pelo agente | **delegação:** "Pesquise e decida as pendentes, mas pesquise a fundo as consequencias" | [[SEED-UNITS]]; F-P6 → (b): **não** ratifica o F-RK-2 do [[I1b]] |
| 7 | Validação do contador ativo no CFC: só pesquisa e plano | "Validar CRC no cadastro do CFC" (escopo marcado no questionário) | [[GOV-CONTADOR]] — 4 forks pendentes; recomendação: depois do [[M2]] |
| 8 | Ordem de execução abaixo — decidida pelo agente | **delegação:** "Pode organizar ao plano central e decidir qual ordem seguir no plano central" | arestas `depende_de` de [[H1]], [[H2]], [[SEED-UNITS]], [[I1b]] |
| 9 | Revisão independente do #426 **antes** do merge — exceção pontual à suspensão do revisor (CLAUDE.md §⛔), só para este PR | "Resolve esse problema antes de mergear … Sem revisão independente" | agente `revisor-independente` em worktree isolado: PASS nos 5 requisitos; achados de guarda e de superfície corrigidos no próprio PR, cada teste novo conferido vermelho sob sabotagem |

## Ordem decidida (até o M2)

Parte da ordem do dono já registrada: **[[H1]] → [[H2]] → [[M2]]**. O teste de browser de 28/09 mostrou que o H1
**não roda pela tela** hoje; as ondas abaixo tiram os bloqueios na ordem que menos gera conflito.

| Onda | O quê | Por que nesta posição | Quem |
|---|---|---|---|
| 1 | Integrar o que já está pronto: **FE-FIX-SPED-ECD-SIGNERS** (✅ mergeado no #427 em 28/09; fold em [[FE-INCR-SPED-SIGNERS]]) → **[[CRC-CFC]]** (este worktree) → **seletor de unidade** (sessão aberta 28/09: a Contabilidade escolhe `productUnits` no lugar de `units`) → **mensagens do 400** (`resolveError` — ✅ mergeado no #422 em 28/09) | Código já escrito; nenhum depende do outro para funcionar. Merge **serial** com rebase: FE-FIX e CRC-CFC mexem no mesmo `SpedGenerationPanel.tsx` (partes ECD × ECF) e os quatro somam linhas no GAP-MAP. **Helper do 0930 — resolvido antes do merge (pedido do dono):** um símbolo só, `toEcfSignerPayload` por signatário (#426), par do `toEcdSignerPayload` do #427; o PR de mappers tipados da sessão FE **edita essa função no lugar** (confirmado pela sessão em 28/09) — uma 2ª definição no mesmo módulo não compila (TS2393), e a omissão do `indCrc` vazio fica (com a máscara no 0930, `''` vira 400) | agente, com pedido de commit/PR do dono |
| 2 | **[[SEED-UNITS]]** (Partes A–D) | Precisa do CRC-CFC mergeado (os dois editam o RUNBOOK-H1). E o seletor de unidade precisa estar corrigido ANTES de usar o seed novo: o salão inteiro instala `productUnits`, e o bug escolheria essa tabela | agente, com 'executa' |
| 3 | Re-semear o `dev.db` real + ativar os bindings dos `unitId` novos; colar a evidência do [[P4]] | Operação sobre dado real e evidência: só o dono | dono |
| 4 | **[[H1]]** — RUNBOOK-H1 pela tela | Todos os bloqueios de tela resolvidos nas ondas 1–3 | dono |
| 5 | **[[H1b]]** (2ª passada Lucro Real) com [[FE-INCR-LALUR-PR2]] antes, e preparo do **[[H2]]** ([[LAC-B]], sign-off do item 6 do [[I1]]) | H1b é obrigatório antes de operar cliente real; o LALUR-PR2 é pré-requisito dele e pode rodar em paralelo às ondas 1–4 se o dono der 'executa' | agente + dono |
| 6 | **[[H2]]** → **[[M2]]** | Ordem do dono | dono |

**Em paralelo, sem bloquear o caminho acima:** re-decidir o F-RK-2 do [[I1b]] com a premissa nova (depois da onda 2);
ratificar os forks do [[GOV-CONTADOR]] e das telas (Fase 4 do plano-mãe). **Depois do M2:** validação do contador no CFC.

## Registro de viés (T8)

A ordem prioriza destravar o H1 pela tela (é o gargalo registrado: oráculo externo aberto há mais de 14 dias) e
serializa merges para evitar conflito — custa paralelismo. As decisões delegadas pendem para seguir o contrato à
risca (mais diff). O dono pode inverter qualquer onda que não tenha dependência técnica (1a–1d entre si; 5 × 6
fora do H1b).
