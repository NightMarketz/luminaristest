---
id: "D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA"
tipo: "decisao"
dominio: "plataforma"
titulo: "País na borda (F-PB-1..9), CNPJ por estabelecimento, horista × faltas e 'executa' de CICLO-FISCAL, NFSE-PAULISTANA e DP-PONTE-RAZAO (dono, 24/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-24, dois questionários (AskUserQuestion) da sessão maestro que drenou a caixa de lacunas. É 'executa' só para os três BRIEFs da pergunta 'Executa' (CICLO-FISCAL, NFSE-PAULISTANA e DP-PONTE-RAZAO); as outras respostas decidem fork e não autorizam código"
atualizado: "2026-11-24"
---
# D-2026-11-24 — forks da caixa e país na borda

**Estado:** `decided`. **Autorização:** dono, chat, 24/11/2026, por dois questionários com contexto (AskUserQuestion) da
sessão maestro. As respostas abaixo são os rótulos que o dono escolheu. Cada pergunta trazia a evidência e o que cada
opção fechava; a recomendada vinha primeiro.

## 1. País na borda (PRE-ADR-PAIS-NA-BORDA §5 → §5.1)

| Fork | Resposta | Contra a recomendação? |
|---|---|---|
| F-PB-7 (dado existente) | "Migrar por fatias" → (a); com ela, F-PB-9 (b) e F-PB-3 (a) inteiro | sim (recomendada: congelar) |
| F-PB-1 (onde mora a borda) | "Pasta por país no domínio" → (a) `features/<dominio>/paises/br/**` | sim (recomendada: listar o centro) |
| F-PB-2 e F-PB-5 (dado e identificador) | "Tabela do país no novo" → F-PB-2 (c)+(a), F-PB-5 (a) no novo | não |
| F-PB-4 (nome dos conceitos) | "Centro em inglês" → (b) | sim (recomendada: português) |
| F-PB-6 e F-PB-8 (DP e primeiro corte) | "DP pela regra + razão 1º" → F-PB-6 (a), F-PB-8 (a) | não |

O detalhe e as consequências para a redação da regra estão no `docs/adr/PRE-ADR-PAIS-NA-BORDA.md` §5.1. Lacunas
que passam a seguir as fatias desta decisão: L-20261115-013829-41b5 (razão conhece compliance, F-PB-8),
L-20261114-222614-b556 (primitivas de plataforma), L-20261115-013846-1cb6 (allowlist por domínio),
L-20261115-013846-5722 (formato `cpf` no motor genérico), L-20261114-222632-0a7b (invariante sem guarda),
L-20261114-222632-675c e L-20261114-214052-b25f (vigência em código), L-20261114-222614-0d37 (plataforma de parâmetros
conhece os domínios), L-20261114-223006-d704 (slots do AccountingScope).

## 2. CNPJ por estabelecimento (L-20261121-193958-0736, PES-4)

Resposta: **"Tabela BR 1:1 da unidade"**. Uma tabela do país, ligada 1:1 à `Unit`, guarda o CNPJ do estabelecimento,
com DV validado por `lib/cnpj`. A `Unit` (centro) não ganha coluna brasileira. A folha e a CPP leem o CNPJ dessa
tabela. Segue a F-PB-2 (a) para dado novo. A implementação entra pela emenda DP-PONTE-RAZAO (§4).

## 3. Horista × faltas (L-20261122-025804-ce0a, PR #1326, achado A6)

Resposta: **"Horas contratuais + desconto"**, contra a recomendação ("só tira o DSR"). No horista, `HORAS_NORMAIS` é a
jornada contratual, e a FALTAS desconta a hora e o DSR da semana. O ponto precisa lançar a jornada cheia, não as horas
trabalhadas. A mudança cai no código do PR-4 do F2 (pilha do #1326), na sessão que o conduz.

## 4. 'Executa' dos BRIEFs ratificados

Resposta (múltipla): **CICLO-FISCAL, NFSE-PAULISTANA, DP-PONTE-RAZAO**. O INTEGRA-CONTADOR **não** foi marcado e
segue só com planejamento.

| Nó | BRIEF | Escopo do 'executa' |
|---|---|---|
| CICLO-FISCAL | `docs/accounting/BE-INCR-CICLO-FISCAL-brief.md` (PR #1322) | o BRIEF inteiro (D-2026-10-28-FLUXO-AUTONOMO) |
| NFSE-PAULISTANA | BRIEF do #1325, com o modo manual dentro do nó (F-NSP-2) | o BRIEF inteiro |
| PES-4 (emenda DP-PONTE-RAZAO) | `docs/accounting/BE-INCR-DP-PONTE-RAZAO-brief.md` (PR #1321) | o BRIEF da emenda inteiro, **depois do PR-6 do F2** (a pilha do #1326), como dizia a pergunta |

As notas dos três nós citam esta cédula no campo `autorizacao`.

## 5. Fechado sem pergunta (leitura e estado medido)

- **L-20261120-220809-7064** (prazo da opção do Simples pelo regime regular de CBS/IBS) não era fork. O "setembro e
  abril" é a redação original do § 11 do art. 13 da LC 123, dada pela LC 214. O texto compilado do Planalto mantém essa
  redação riscada logo acima da redação da LC 227. Hoje vale o § 10 (red. LC 227): opção semestral exercida "nos meses
  de setembro e março imediatamente anteriores a cada semestre". O § 11 (red. LC 227) passou a tratar do início de
  atividade. Fonte: `pesquisas-legais/parecer-salao-sp-4-pessoas/docs/D11_lcp214-htm.txt:9791-9797` (Planalto,
  compilado). O parecer (`relatorio.md:317-318`) e o simulador já usam setembro e março.
- **L-20261120-194338-0208**: a lacuna registra a decisão do dono de 21/11 (comissão devida no mês da venda), e a
  cédula `D-2026-11-21-FORKS-DA-CAIXA` a listava como pendente. Vale a decisão registrada na lacuna, e ela volta à fila.
- **L-20261121-041104-92ab** estava classificada como `gate`, mas é defeito de script (`skill-audit.mjs:323` aceita
  gate inexistente). Foi reclassificada para `defeito`.
