# Relatório de pesquisa legal — i250-hist-tamanho

**Pergunta:** O histórico mais longo gerado pelo ITG 2000 itens 32/36 (#907 + C4) cabe no campo HIST do registro I250 do leiaute da ECD?
**Aberto em:** 2026-11-04T00:38:09-03:00 · **Atualizado em:** 2026-11-04T00:38:56-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Cabe, com folga.** O campo 08 (HIST) do registro I250 é do tipo `C` com tamanho **65535** [D01, Manual de Orientação
do Leiaute 9 da ECD, p. 149, tabela do registro I250]. A parte fixa mais longa que o #907 + C4 acrescentam ao histórico
soma **253 caracteres** (pior caso: estorno com número e id da origem + sufixo do extemporâneo + razão automática com
`sourceType` de 40 caracteres). O resto do histórico é texto digitado (descrição, motivo do estorno, razão do
extemporâneo), que nenhum DTO limita (`z.string().min(1)`, sem `max`). Então o HIST só passaria de 65535 se a pessoa
digitasse dezenas de milhares de caracteres. O risco é teórico e não vem do #907. Grau: **verificado** (leiaute lido na
fonte oficial; comprimentos medidos com os textos literais do `PostingService`).

Medição (node, textos do código): estorno fixo `Estorno do lançamento 2026/0001 (id <cuid de 25>) de dd/mm/aaaa —
motivo: ` = 87; sufixo `— registro extemporâneo; ocorrência em dd/mm/aaaa; razão: ` = 59; razão automática sem o
`sourceType` = 67 (o maior `sourceType` hoje é `service.subscription.billed`, 27; a importação deixou de ser automática
no C4). 87 + 59 + 67 + 40 = 253.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Tamanho do HIST | Manual da ECD, leiaute 9, registro I250, campo 08 | [D01] p. 149 | "08 HIST Histórico completo da partida ou histórico complementar. [...] C 65535 - - Não" |
| O histórico extemporâneo deve trazer motivo, data e número da origem | idem, observação do campo 08 (remete ao item 32 da ITG 2000 (R1)) | [D01] p. 149 | "o histórico do lançamento extemporâneo deve especificar o motivo da correção, a data e o número do lançamento de origem" |

## 3. Vigência conferida
- Alertas do acervo e como foram resolvidos: o Manual (anexo ao ADE Cofis nº 01/2026) não está no acervo `ctresb/leis`
  com título consultável (os atos da RFB estão por id do SIJUT; a busca de código do GitHub voltou vazia). Baixado da
  fonte oficial em 04/11/2026: o link estável `sped.rfb.gov.br/arquivo/download/7990` serve o mesmo arquivo do [D09] do
  dossiê `gates-humanos-lei` (24/10), SHA-256 `bc63f0a8…` idêntico.
- Redação atual / alterações posteriores: leiaute 9, "Atualização: maio de 2026". Nenhum leiaute mais novo no link oficial.
- Regulamentação pendente ou norma mais específica: nenhuma para o tamanho do campo.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma sobre o tamanho. Achado vizinho, fora da pergunta (registrado no PR do C4 como follow-up): o mesmo leiaute
traz no I200 o `IND_LCTO = "X"` (lançamento extemporâneo) e o campo 06 `DT_LCTO_EXT` (data de ocorrência dos fatos)
[D01] p. 143–144, mas a coluna "Valores Válidos" do campo 05 lista só `["N", "E"]`. O gerador (`lib/sped.ts`) emite
`N` ou `E`. Saber se o lançamento num período reaberto deve sair como `X` com `DT_LCTO_EXT` depende de ler as regras
`REGRA_DT_LCTO_EXT_*` e a seção de retificação do Manual; não foi feito aqui.

## 5. Lacunas
Nenhuma para a pergunta. A codificação do arquivo (Latin-1, `lib/sped.ts`) não muda a conta: os caracteres do sufixo
são todos Latin-1 depois da transliteração do "—" para "-".
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/71/1BD273E4A9F51ED8EF01AC3A6BC15812A3481F/Manual_de_Orienta%c3%a7%c3%a3o_da_ECD_Leiaute_20_maio_2026.pdf>  
  Baixado em 2026-11-04T00:38:17-03:00 · arquivo local `docs/D01_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p.pdf` · SHA-256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`

## Registro de buscas
_Nenhuma busca registrada._
