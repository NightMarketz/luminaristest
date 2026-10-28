# Relatório de pesquisa legal — fila-2026-10-28-indop-domicilio

**Pergunta:** Com o indOp 030102 (serviço sobre a pessoa, local = endereço do adquirente), a DPS da NFS-e nacional exige o endereço do tomador? Quais regras de validação ligam cIndOp ao endereço?
**Aberto em:** 2026-10-28T12:47:29-03:00 · **Atualizado em:** 2026-10-28T12:50:03-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **Sim: com o indOp 030102, a NFS-e exige o endereço do tomador, e a DPS sem ele é rejeitada** (regra E0234 do Anexo I v1.01 [D01]).
  - A regra vale para os emissores públicos nacionais, inclusive o emissor web: a coluna "SEFIN, WEB, APP" marca "V" (executada na recepção da DPS).
  - O grupo do tomador também é obrigatório com o 030102 (E0187). O código em `main` já manda esse grupo sempre (F-DFE-7 b).
  - Extrato das linhas em `docs/D01_rn-indop-trechos.txt`, com o SHA-256 do texto.
- **O que isso pede do Luminaris:** a emissão em `main` não preenche `toma/end`. O campo só foi previsto para ISS retido por tomador PJ (F-DFE-14) e não foi feito (`FiscalDocumentEmissionService.ts:765` e `:1188`). Um perfil de serviço com 030102 hoje passaria no Zod local (`end` é opcional no `DpsPayloadDto`) e seria rejeitado pela Sefin (grau inferido: não testado).
- **No portal (modo de hoje, D-2026-10-22):** a mesma regra roda no emissor web, então quem emite a nota de atendimento a domicílio tem de digitar o endereço da cliente.

## 2. Fundamentação
| Ponto | Regra | Fonte | Trecho literal |
|---|---|---|---|
| Endereço obrigatório | Anexo I, RN DPS_NFS-e linha 258 | [D01] | "cIndOp for igual a 030102, 050102, [...] o endereço do tomador deve ser obrigatoriamente informado. \| Obrig. \| Rej. \| E0234" |
| Grupo do tomador obrigatório | Anexo I, linha 237 | [D01] | "Se campo cIndOp for igual a 030102, [...] então o grupo toma deve ser informado. \| Obrig. \| Rej. \| E0187" |
| Localidade de incidência | Anexo I, linha 65 | [D01] | "O código da localidade de incidência informado deve estar de acordo com o código de indicador da operação." (E1521) |
| Onde fica o endereço | Leiaute DPS, linhas 152–153 | [D01] | "NFSe/infNFSe/DPS/infDPS/toma/ \| end \| G \| - \| 0-1"; "toma/end/ \| endNac \| CG \| - \| 1-1" |
| Indicador da operação | Anexo C (dossiê `fila-2026-10-28-d1f-indop`) | — | "02 \| 030102 \| Endereço do adquirente" |

## 3. Vigência conferida
- Anexo técnico do leiaute da NFS-e nacional, baixado do gov.br/nfse em 28/10 [D01]: é o `anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209` listado em "Documentação atual" (dossiê `fila-2026-10-28-d1f-indop`, D02).
- Não é norma do acervo `ctresb/leis`.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma na regra. Fica para o BRIEF: de onde vem o endereço da cliente (cadastro do cliente ou campo na venda) e o que fazer quando faltar (bloquear a emissão com faltante, como os outros códigos do perfil).

## 5. Lacunas
- A regra só dispara quando a DPS traz o `cIndOp`, que fica no grupo IBSCBS. Em `main` esse grupo só vai com `ibsCbsInformar`. Não conferi se o portal exige o indOp antes de 2027 (grau inferido).
- O ISS dos itens 6.01–6.03 continua no estabelecimento do prestador (resposta do contador de 23/09, triagem 5a); não relido neste dossiê.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx>  
  Baixado em 2026-10-28T12:47:29-03:00 · arquivo local `docs/D01_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx.html` · SHA-256 `de5bc492959eadc8bfa7540e16939995924f2188f743648eaf84d3b31e9eeb7c`

## Registro de buscas
_Nenhuma busca registrada._
