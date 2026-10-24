# Relatório de pesquisa legal — verif-2026-10-23-ibs-cbs-vencimento

**Pergunta:** Vencimento do saldo mensal de CBS/IBS (Dec. 12.955 arts. 44-45; LC 214 art. 44) e obrigação de apuração da PJ inativa no regime regular
**Aberto em:** 2026-10-23T00:22:59-03:00 · **Atualizado em:** 2026-10-23T00:49:35-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **CBS:** o saldo a recolher vence no **último dia útil do mês seguinte** ao do período de apuração (Decreto 12.955/2026
  art. 45 caput [D02]). O dia útil é aferido no calendário do domicílio do estabelecimento matriz, com os feriados
  nacionais, estaduais e municipais (art. 45 parágrafo único [D02]). Isso responde a parte "vencimento" da P-IBS-5 para a
  CBS. O PR-5 carrega a linha `IBS_CBS/CBS/VENCIMENTO` como PUBLISHED (dono, 23/10).
- **IBS:** o regulamento do CG-IBS não foi localizado em fonte oficial. A linha `IBS_CBS/IBS/VENCIMENTO` fica DRAFT, sem valor.
- **PJ inativa no regime regular:** a apuração de cada período é entregue à RFB até o último dia útil do mês seguinte
  (art. 44 § 6º [D02]), e o texto lido não traz exceção para a PJ sem movimento. Na matriz, `IBS_CBS_APURACAO` fica
  OBRIGATORIA também para a inativa (dono, 23/10).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Vencimento do saldo | Dec. 12.955 art. 45 caput | [D02] | "deverá ser pago até o último dia útil do mês seguinte ao do período de apuração" |
| Calendário do dia útil | Dec. 12.955 art. 45 parágrafo único | [D02] | "considerados os feriados nacionais, estaduais e municipais" |
| Entrega da apuração | Dec. 12.955 art. 44 § 6º | [D02] | "realizada e entregue à RFB … até o último dia útil do mês seguinte" |
| Período mensal | Dec. 12.955 art. 43 | [D02] | "O período de apuração da CBS será mensal" |

## 3. Vigência conferida
- Alertas do acervo e como foram resolvidos: o acervo [D01] traz a versão original (alerta "não compilado"). Conferido no
  Planalto compilado [D02] em 23/10: os arts. 43, 44 e 45 não têm "Redação dada" nem "Incluído". As alterações do decreto
  (Dec. 13.075/2026 e 13.133/2026, dossiê verif-2026-10-22-ibs-cbs-split) caem em outros artigos.
- Redação atual / alterações posteriores: a do Planalto em 23/10 [D02].
- Regulamentação pendente ou norma mais específica: regulamento do IBS (CG-IBS), não localizado.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Domicílio da matriz × unidade.** O art. 45 parágrafo único usa o município da matriz. O núcleo só tem endereço
  estruturado por unidade (`FiscalProfile.codMun`). O dono decidiu em 23/10 usar o município da unidade da apuração. Numa
  PJ com várias unidades em municípios diferentes, o vencimento pode divergir do da matriz.
- **Sábado.** O PR-5 trata o sábado como dia não útil (texto aprovado pelo dono em 23/10). Pergunta ao contador, junto da
  P-IBS-5: "para o art. 45 do Decreto 12.955, o sábado conta como dia útil?"

## 5. Lacunas
- Regulamento do IBS (CG-IBS), com o prazo de pagamento do saldo do IBS.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Decreto nº 12.955 de 29/04/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/517db958cd0ae2ba36c1f0b524b3cc55fe4198c6/federal/decretos/2026/dec-12955-2026-04-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-04-29;12955> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-23T00:23:02-03:00 · arquivo local `docs/D01_dec-12955-2026-04-29.md` · SHA-256 `5527dbfe923a984a86c22b27ef1c5c0b6f4f0c2996bbe14315e8804afd08bbd9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-23T00:23:09-03:00 · arquivo local `docs/D02_d12955-htm.html` · SHA-256 `0e17368b50ec1e14a762f8830331d30c064a2de6a70e4efac59952e1066a7862`

## Registro de buscas
_Nenhuma busca registrada._
