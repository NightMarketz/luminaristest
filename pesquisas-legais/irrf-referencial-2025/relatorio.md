# Referencial RFB 2025 das folhas novas do IRRF-DISTRIBUICAO (item 6)

Pergunta: qual é o código do plano referencial RFB 2025 (leiaute ECD/ECF) de cada folha nova do item 6 do
BE-INCR-IRRF-DISTRIBUICAO?

**Fonte:** catálogo oficial importado em `referential_accounts` (`layoutVersion = '2025'`), lido numa cópia do `dev.db` real
(`server/prisma/prisma/dev.db`). SHA-256 da cópia em 2026-10-21: `4bfcdbfcdbda08d6167de7cfada72b5faf9a51689d01029ca451032f7a20bdbe`.
É a mesma tabela de onde saíram os referenciais já publicados (`referencial2025Canonico.ts`, PROPOSTA-REFERENCIAL-D1 §0).
O acervo ctresb/leis não tem tabela do plano referencial (é tabela do SPED, não norma).
**Conferido em 2026-10-21 contra a tabela dinâmica oficial da ECF (leiaute 12, AC 2025): os 6 códigos batem. Ver o dossiê [`irrf-referencial-sped`](../irrf-referencial-sped/relatorio.md) [D01].**

## Linhas do catálogo (2025)
| Código | Analítica | Nome oficial |
|---|---|---|
| 2.01.01.17.13.10 | sim | Dividendos a Pagar – Circulante - Brasil |
| 2.01.01.17.13.20 | sim | Dividendos a Pagar – Circulante - Exterior |
| 2.01.01.17.12.10 | sim | Juros sobre o Capital Próprio a Pagar - Circulante - Brasil |
| 2.01.01.17.12.20 | sim | Juros sobre o Capital Próprio a Pagar - Circulante - Exterior |
| 2.01.01.09.01 | sim | IRRF a Recolher – Circulante |
| 2.01.01.09.12 | sim | Tributos Retidos a Recolher – Circulante |
| 2.03.01.01.01 | sim | Capital Subscrito de Domiciliados e Residentes no País |
| 2.03.01.02.01 | sim | Capital Subscrito de Domiciliados e Residentes no Exterior |
| 2.03.02.03.01 | sim | Reserva Legal |
| 3.01.01.09.01.04 | sim | (-) Despesas de Juros sobre o Capital Próprio (atividade geral) |
| 3.11.01.09.01.04 | sim | (-) Despesas de Juros sobre o Capital Próprio (atividade rural) |

## Leitura por folha
| Folha | Código | Grau |
|---|---|---|
| 2.1.7.01 Dividendos a pagar | 2.01.01.17.13.10 | leitura única: o escopo é só residente (F-IRD-7), "Exterior" fica fora |
| 2.1.7.02 JCP a pagar | 2.01.01.17.12.10 | leitura única, mesmo motivo |
| 2.1.7.03 IRRF a recolher | 2.01.01.09.01 | leitura única: a linha específica de IRRF vence a genérica "Tributos Retidos" |
| 2.3.3.01 Reserva legal | 2.03.02.03.01 | leitura única |
| 4.3.4 Juros sobre o capital próprio | 3.01.01.09.01.04 | leitura única: 3.11 é a atividade rural, e os mapeamentos existentes usam 3.01 em Presumido e Real |
| 2.3.2.01 Capital social integralizado | **AMBÍGUO** | 2.03.01.01.01 (sócios residentes no país) **ou** 2.03.01.02.01 (residentes no exterior). O cadastro de sócios aceita não residente (F-IRD-7), e a conta é uma só para a PJ |

## Lacuna estrutural (fora da tabela)
A prontidão da ECD exige que toda folha esteja mapeada (`ReferentialMappingService.coverage`: `ready = unmapped == 0`). O único
veículo que grava mapeamento nos escopos é a instalação/upgrade de kit (`KitInstallService`, `kit.referential`), e os kits v6
não se editam. Folha nova no plano padrão sem kit novo deixa todo escopo existente "não pronto" para a ECD.
