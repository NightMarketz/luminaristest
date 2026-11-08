# Relatório de pesquisa legal — retencoes-inss-cprb-pr-dado

**Pergunta:** Antes de gravar: a redação vigente da Lei 12.546 art. 7º § 6º e art. 9º-A (retenção 3,5% na CPRB até 2027; 11% desde 2028) e da Lei 8.212 art. 31 (11%, recolhimento mensal até o dia 20) continua a de 27/10?
**Aberto em:** 2026-10-29T03:27:36-03:00 · **Atualizado em:** 2026-10-29T03:33:52-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **A redação que sustenta o PR de dado é a mesma de 27/10.** Lei 12.546 art. 7º § 6º manda reter **3,5%** do bruto da NF
  de prestador na CPRB em cessão de mão de obra [D01 art. 7º § 6º]; o art. 9º-A mantém a CPRB "nos exercícios de 2025 a
  2027" [D01 art. 9º-A]; a Lei 8.212 art. 31 manda reter **11%** e recolher "até o dia 20 (vinte) do mês subsequente" [D02
  art. 31 caput]. Fora da CPRB (e, para todos, a partir de 01/01/2028), vale o art. 31: 11%.
- **Efeito gravado** (`prisma/data/legal_parameters_retencoes_v3.sql`): `RETENCAO INSS/CPRB` 350 bp de 2025-01-01 a
  2027-12-31 e 1100 bp desde 2028-01-01; `RETENCAO_CODIGO INSS` = **116201**, mensal (código do manual da EFD-Reinf
  2.1.2.1, já conferido no dossiê `fila-2026-10-27-p-ret-6-8` [D03] de 27/10, mesmo SHA-256 da cópia de 22/10).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| 3,5% na CPRB | Lei 12.546 art. 7º § 6º | [D01] | "a empresa contratante deverá reter 3,5% (três inteiros e cinco décimos por cento) do valor bruto da nota fiscal ou da fatura" |
| CPRB de 2025 a 2027 | Lei 12.546 art. 9º-A | [D01] | "Nos exercícios de 2025 a 2027, as empresas referidas nos arts. 7º e 8º desta Lei poderão contribuir sobre o valor da receita bruta" |
| 11% e prazo | Lei 8.212 art. 31 caput | [D02] | "deverá reter 11% (onze por cento) do valor bruto da nota fiscal ou fatura" · "até o dia 20 (vinte) do mês subsequente" |

## 3. Vigência conferida
- Alertas do acervo: nenhum. [D01] e [D02] são compiladas (texto vigente), cópias de 13/10/2026 (16 dias), com os mesmos
  SHA-256 do dossiê de 27/10 (`ae4a2cb3…` e `6ace8967…`): o acervo não mudou desde então.
- Redação atual: o art. 7º caput tem a redação da Lei 14.973/2024 ("Até 31 de dezembro de 2024") e o art. 9º-A foi acrescido
  por ela; o § 6º tem a redação da Lei 12.995/2014. Nenhuma marca "(Redação dada por …)" posterior a 2024 nos trechos usados.
- O art. 31 tem o caput da Lei 11.933/2009; sem alteração posterior no trecho.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma nova. A leitura de que o § 6º (que fala das empresas do art. 7º caput, "até 31/12/2024") continua de 2025 a 2027
  pela transição do art. 9º-A é a da Receita na SC Cosit 153/2026 (ementa lida no SIJUT em 27/10, dossiê
  `fila-2026-10-27-p-ret-6-8` [D02]); é a leitura adotada e citada na `fonte` da linha.

## 5. Lacunas
- As mesmas de 27/10: texto integral da SC Cosit 153/2026 e da IN RFB 2.053/2021 (arts. 2º-A e 11); a tabela de códigos da
  própria DCTFWeb (o código vem do manual da Reinf, que gera o débito).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 12.546 de 14/12/2011 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2011/lei-12546-2011-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2011-12-14;12546> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T03:27:37-03:00 · arquivo local `docs/D01_lei-12546-2011-12-14.md` · SHA-256 `ae4a2cb31093920893030d91f9460b536c801ba7c5400d2a77ce857b8d644ab1`
- **[D02]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T03:27:37-03:00 · arquivo local `docs/D02_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`

## Registro de buscas
_Nenhuma busca registrada._
