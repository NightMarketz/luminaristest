---
id: "SIMULACAO-CENARIO"
tipo: "regua-f"
dominio: "fiscal"
titulo: "Simulação contábil e fiscal completa de 12 meses sobre um cenário informado pelo usuário (entrada em camadas, padrão realista com fonte, faixa), no motor do produto; salão de SP capital primeiro"
estado: "planned"
estado_detalhe: "21/11 (planejamento): PRE-ADR-SIMULACAO-COMPLETA-12-MESES RATIFICADO pelo dono com F-SIM-1..8 (motor do produto, página como protótipo; sem persistência; camadas; 2027 com 2026 histórico; núcleo neutro, SP primeiro; padrão por pesquisa + kit; faixa; congelar a página depois da rodada de texto). BRIEF do PR-0 escrito (BE-INCR-SIMULACAO-CENARIO-PR0-brief.md: emenda à D8 do ADR-INCR-EFICIENCIA-FISCAL + contrato do cenário em Zod + snapshot, sem lógica; 19 itens) com forks novos F-SIM-9..15 PENDENTES. Sem 'executa'. Posição na régua F não decidida pelo dono. PR-1..6 e FE-INCR sem BRIEF"
depende_de: ["[[EFICIENCIA-FISCAL]]", "[[LEGAL-PARAMS]]"]
autorizacao: "dono, chat, 2026-11-21: \"Autorizo\", em resposta a \"Autoriza a nota do nó e o BRIEF do PR-0 numa sessão nova?\" — cobre só esta nota e o BRIEF do PR-0: sem código, sem editar o artefato do simulador, sem commit, branch ou PR. PRE-ADR ratificado no mesmo dia (\"Ratifico\"); a ratificação não autoriza código (ORCH-006)"
ancora_sdd: "—"
atualizado: "2026-11-21"
prs: []
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "PR-0: 7 forks novos pendentes (F-SIM-9 unidade do Valor, F-SIM-10 forma da fonte, F-SIM-11 sinal e teto do dinheiro, F-SIM-12 ano aceito, F-SIM-13 país na borda, F-SIM-14 campo sem motor, F-SIM-15 sentido da sazonalidade); depois deles: opus-baixo (1 DTO Zod novo, refines com teste, snapshot + .gen.ts, texto da emenda no ADR; sem rota nem serviço). PR-1..6 sem BRIEF"
write_set: ["docs/adr/ADR-INCR-EFICIENCIA-FISCAL.md", "server/src/features/accounting/dtos/CenarioSimulacaoDto.ts", "server/src/features/accounting/dtos/__tests__/CenarioSimulacaoDto.test.ts", "server/src/features/accounting/dtos/__tests__/fixtures/cenarioSalaoMinimo.ts", "server/src/features/accounting/models/taxSimulation.ts", "server/src/features/accounting/models/cenarioSimulacao*.ts", "server/src/features/accounting/services/CenarioSimulacaoService.ts", "server/src/controllers/cenarioSimulacaoController.ts", "server/src/features/accounting/models/__tests__/cenarioSimulacao*", "server/src/features/accounting/services/__tests__/CenarioSimulacaoService*", "server/src/controllers/__tests__/cenarioSimulacao*"]
registros: ["server/src/features/accounting/dtos/__tests__/__dto-shapes__.json", "my-app/types/contracts/accounting/CenarioSimulacaoDto.gen.ts", "server/src/lib/factory.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.tax-simulation.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json"]
---
# SIMULACAO-CENARIO — Simulação completa de 12 meses sobre um cenário informado

**Estado:** `planned` — 21/11 (planejamento): PRE-ADR-SIMULACAO-COMPLETA-12-MESES RATIFICADO pelo dono com F-SIM-1..8. BRIEF do PR-0 escrito, com forks novos F-SIM-9..15 PENDENTES. Sem 'executa'. PR-1..6 e FE-INCR sem BRIEF.  
**Autorização:** dono, chat, 2026-11-21: "Autorizo", em resposta a "Autoriza a nota do nó e o BRIEF do PR-0 numa sessão nova?" — cobre só esta nota e o BRIEF do PR-0 (sem código, sem editar o artefato, sem commit, branch ou PR). O PRE-ADR foi ratificado no mesmo dia ("Ratifico") e a ratificação não autoriza código (ORCH-006).  
**Depende de:** [[EFICIENCIA-FISCAL]] (dono da D8 que o PR-0 emenda: "simuladores são funções puras sobre o razão/subrazão" passa a aceitar o cenário informado; `simularRegimeAno`, `TaxSimulationDto`), [[LEGAL-PARAMS]] (`LinhaLegal` com vigência: o cenário nunca traz número de lei)  
**Desbloqueia:** `FE-INCR` da tela do cenário (nó posterior, sem nota), que substitui a página-protótipo; o cenário como ponto de partida do onboarding (PRE-ADR F-SIM-1, I)  
**Âncora no SDD consolidado:** —  
**Régua:** régua F, **posição PENDENTE** — a ordem na régua F é decisão do dono (PRE-ADR, "Próximo passo" 3). `FILA-ORDEM` não foi tocada.

## Escopo (PRE-ADR §3 e §6)

- **Onde vive (F-SIM-1 c):** no motor do produto (`features/accounting`, `features/dp`). A página
  `pesquisas-legais/parecer-salao-sp-4-pessoas/artefatos/simulador-tributario-salao.html` (artefato `4T2JYWqnJXm9e6p2aUfDLu`)
  fica como protótipo e oráculo de regressão; congela depois da rodada de texto em curso (F-SIM-8).
- **Sem estado (F-SIM-2 a):** o cenário é entrada de requisição; nada é gravado, nem sugestão. O `module-boundary-selector`
  roda antes da etapa que precisar guardar.
- **Entrada em camadas (F-SIM-3 c):** mês típico + sazonalidade → mês a mês → evento; toda camada nasce com padrão.
- **Anos (F-SIM-4 b):** 2027, com 2026 como histórico (RBT12, ano anterior, abertura).
- **Alcance (F-SIM-5 b):** núcleo neutro, município/UF/convenção/setor na borda; salão de SP capital primeiro.
- **Padrão realista (F-SIM-6 a + b, F-SIM-7 a):** cada padrão de mercado com fonte citável, data e faixa; o kit setorial
  carrega campos e valores; resultado em faixa quando campo de peso alto é padrão.
- **Sequência (PRE-ADR §6):** PR-0 contrato · PR-1 motor de 12 meses (Simples, Presumido, Real com saldos transportados) ·
  PR-2 folha por pessoa e encargos · PR-3 revenda fora do Simples e créditos · PR-4 caixa e patrimônio em memória ·
  PR-5 camadas, padrões, proveniência, sensibilidade, faixa · PR-6 importação de documentos · FE-INCR tela.

## Gatilho

- Pedido do dono, 21/11: *"O que queremos é que fique uma simulação completa, os dados realmente vão ser todos entregues pelo
  usuário"*, e *"melhor pedir, mas deixar um valor padrão realista"*.
- Dois motores divergentes: a página calcula um mês típico repetido (DAS de 2026 no centavo dos exemplos 2 e 8 do manual do
  PGDAS-D); o `simularRegimeAno` lê só o razão real e se declara aproximado no Real e no Presumido
  (`server/src/features/accounting/models/taxSimulation.ts:364-385`).
- Lacunas de origem: `L-20261121-181921-ea2b` (o que o modelo não representa) e `L-20261121-181428-60ca` (padrão realista).
- Registradas no planejamento do PR-0: `L-20261121-194911-ffd3` (`LOCACAO_MOVEL`, retenções e deduções sem origem no cenário),
  `L-20261121-194911-d4b1` (status do ADR-INCR-EFICIENCIA-FISCAL desatualizado), `L-20261121-194913-57da` (ratificação dos
  F-SIM sem cédula em `decisoes/`).

## Docs

- [`PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md`](../../adr/PRE-ADR-SIMULACAO-COMPLETA-12-MESES.md) — **RATIFICADO (21/11)**: fatos (§1),
  F-SIM-1..8 com as respostas do dono (§2), checklist candidato de 17 itens (§3), pendências externas (§4), esboço do
  contrato (§5), sequência PR-0..6 (§6), insumos ausentes (§7), destino das lacunas do simulador (§8), write-set (§10)
- [`BE-INCR-SIMULACAO-CENARIO-PR0-brief.md`](../../accounting/BE-INCR-SIMULACAO-CENARIO-PR0-brief.md) — **BRIEF do PR-0 (21/11)**:
  emenda à D8 e à I-5 redigida (item 1), rastreio campo a campo do que o motor lê (§2), 19 itens, contrato esboçado (§4),
  forks novos F-SIM-9..15 PENDENTES (§5), write-set do PR-0 (§9.1)
- [`ADR-INCR-EFICIENCIA-FISCAL.md`](../../adr/ADR-INCR-EFICIENCIA-FISCAL.md) — D8 (linhas 222–225) e I-5 (linha 561), que o PR-0 emenda
- Oráculo: `pesquisas-legais/parecer-salao-sp-4-pessoas/artefatos/conferencia-pgdas-manual.js` (22 valores oficiais do manual do
  PGDAS-D de 2026)

## O que espera o dono

- **Posição na régua F** (não decidida).
- **F-SIM-9..15** (BRIEF §5): unidade do `Valor` (rec. família tipada), forma da fonte (rec. objeto com tipo, referência e
  data), sinal e teto do dinheiro (rec. não negativo até `MAX_CENTS`, sinal só no caixa), ano aceito (rec. só 2027),
  país na borda (rec. jurisdição discriminada por país, só BR), campo sem motor (rec. contrato inteiro, 400 nomeado até o PR
  que der motor ao campo), sentido da sazonalidade (rec. fator livre sobre o mês típico, com proveniência por mês).
- Depois: `executa` do PR-0; BRIEF próprio para cada PR-1..6.

## Evidência

- `server/src/features/accounting/models/taxSimulation.ts:151-180` — `MesRegimeEntrada` e `EntradaRegime`, o seam que o cenário
  vai alimentar; `:360-387` — `simularRegimeAno` e os avisos de aproximação.
- `server/src/features/accounting/services/TaxSimulationService.ts:190-286` — o razão montando a `EntradaRegime`; `:451-463` —
  padrões do perfil (`perfilSimulado`).
- `server/src/features/accounting/models/simplesCalc.ts:56-108` — `ApuracaoInputSchema` (`cTribNac` `^\d{6}$`, naturezas).
- `server/src/features/accounting/dtos/TaxSimulationDto.ts:9-13` — convenção de centavos dos DTOs de simulação.
- `server/src/features/sectorKits/kits/_shared/catalogoServicosFiscais.ts` — o kit do salão só traz códigos, sem valor de mercado.
