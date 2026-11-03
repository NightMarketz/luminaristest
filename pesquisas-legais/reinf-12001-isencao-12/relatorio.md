# Relatório de pesquisa legal — reinf-12001-isencao-12

**Pergunta:** Quais tiposIsencao valem para a natureza de rendimento 12001 (Lucro e Dividendo) na EFD-Reinf e desde quando? A NT 02/2026 cria o tipo 12?
**Aberto em:** 2026-10-28T12:48:48-03:00 · **Atualizado em:** 2026-10-28T12:54:24-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Para a natureza **12001 – Lucro e dividendo**, a Tabela 01 da EFD-Reinf passa a admitir o tipo de isenção **12** ("Lucros e
dividendos distribuídos nos termos do § 3º do art. 6º-A da Lei nº 9.250/1995") **com vigência a partir de 01/2026**: NT
EFD-Reinf 02/2026, item "Tabela 01" b) [D01, linha 30]. A mesma NT inclui o tipo 12 no campo `tpIsencao` do grupo
`rendIsento` do leiaute do R-4010 [D01]. Antes de 01/2026 a 12001 não tinha tributo nem tipo de isenção (Tabela 01 de
15/01/2026, dossiê `retencoes-fonte-pr1-reinf-tabelas` [D01] de lá); ela continua assim.

Efeito no dado: a linha `natrend-12001-2026-01-01` (`tiposIsencao: []`, carregada da Tabela 01 de 15/01/2026, anterior à
NT) fica substituída por `natrend-12001-2026-01-01-nt02` (`tiposIsencao: ["12"]`, mesma vigência), por `supersedesId`.

## 2. Fundamentação
- NT EFD-Reinf 02/2026 [D01]: "Inclusão do tipo de isenção “12 – Lucros e dividendos distribuídos nos termos do § 3º do
  art. 6º-A da Lei nº 9.250/1995” no código de natureza de rendimento “12001 – Lucro e dividendo” com vigência a partir de
  01/2026" (`trecho reinf-12001-isencao-12 D01 "12001"`).
- O mesmo arquivo (SHA-256 `5e39d987…f694b`) já era o [D04] do dossiê `verif-2026-10-22-efd-reinf-brief`; o hash bateu no
  download de hoje, então o texto no portal não mudou desde 22/10.

## 3. Vigência
- Fonte fora do acervo `ctresb/leis` (ato do portal SPED/RFB); baixada da fonte oficial sped.rfb.gov.br.
- Vigência declarada no próprio item: a partir de 01/2026. Mesma data da linha substituída (2026-01-01), então não há
  `vigenteAte` a pôr na linha antiga: a substituição é inteira.

## 4. Ambiguidades
Nenhuma para a 12001. O que a NT **não** decide (já registrado no dossiê de 22/10, §4 A): como informar dividendo ≤ R$ 50 mil/mês
de lucro de 2026 (só bruto, ou `rendIsento` com outro tipo). Fora desta lacuna.

## 5. Lacunas
- Item a) da mesma NT (exclusão do tipo 5 da natureza 10001 a partir de 05/2026) não se aplica à carga: a 10001 não está
  em `NATUREZA_RENDIMENTO`.
- Não conferi se o portal publicou um zip de "Tabelas" posterior a 15/01/2026 que já traga o tipo 12 na 12001. A NT é o ato
  que altera a Tabela 01, e é ela a fonte da linha nova.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Nota-20t-c3-a9cnica-20EFD-Reinf-202-2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/20/CF34CCA6DFAE45E4E000EF345534FCA35D4C0A/Nota%20t%c3%a9cnica%20EFD-Reinf%202-2026.pdf>  
  Baixado em 2026-10-28T12:48:49-03:00 · arquivo local `docs/D01_Nota-20t-c3-a9cnica-20EFD-Reinf-202-2026-pdf.pdf` · SHA-256 `5e39d987baa08ee86e1cc7969ae50242f13bbab475ccb23c1564b44aaedf694b`

## Registro de buscas
_Nenhuma busca registrada._
