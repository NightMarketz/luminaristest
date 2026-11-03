# Relatório de pesquisa legal — nfe-danfe-pr1

**Pergunta:** PR-1 do NFE-DANFE-IBSCBS: caminho das tags que o leitor do DANFE lê (MOC 7.0 Anexo I e NT 2025.002 v1.52)
**Aberto em:** 2026-10-26T18:57:40-03:00 · **Atualizado em:** 2026-10-26T18:58:09-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

Fonte do **caminho das tags** que `server/src/lib/danfe/danfeModel.ts` lê (PR-1 do NFE-DANFE-IBSCBS). Os campos que o DANFE
imprime vêm das transcrições do PR-0 (`[NT10-*]`, `[MOC-DANFE-*]`); onde cada um mora no XML vem daqui:

- **IBS/CBS do item** [D01] grupo UB: `imposto/IBSCBS` (UB12) → `cClassTrib` (UB14) → `gIBSCBS` (UB15, choice) → `vBC` (UB16),
  `gIBSUF` (UB17: `pIBSUF` UB18, `gRed` UB26 com `pAliqEfet` UB28, `vIBSUF` UB35), `gIBSMun` (UB36: `pIBSMun`, `gRed` UB45,
  `vIBSMun` UB54), `gCBS` (UB55: `pCBS` UB56, `gRed` UB64, `vCBS` UB67).
- **Imposto Seletivo do item** [D01]: `imposto/IS` (UB01, 0-1) com a sequência UB04 (0-1): `vBCIS` UB05, `pIS` UB06, `vIS` UB11.
- **Compra governamental** [D01] grupo BB: `ide/gCompraGov` (BB01) — não muda a regra da alíquota impressa; o `gRed` decide.
- **Totais** [D01] W03: `total/ISTot/vIS` (W33); `total/IBSCBSTot` (W34) → `gIBS/gIBSUF/vIBSUF` (W41), `gIBS/gIBSMun/vIBSMun`
  (W46), `gCBS/vCBS` (W56), `gMono` (W57: `vIBSMono` W58, `vCBSMono` W59, `vIBSMonoReten` W59a, `vCBSMonoReten` W59b).
- **Leiaute base** [D02]: `enderEmit` C05–C16, `IEST` C18, `IM` C19, `CRT` C21 (1 Simples Nacional; 2 Simples Nacional, excesso
  sublimite de receita bruta; 3 Regime Normal), `enderDest` E05–E16, `ICMSTot` W02–W16, `ISSQNtot` W17–W20, `transp` X01–X32
  (`vol` 0-5000), `cobr` Y01–Y10 (`dup` 0-120), `infAdic` Z01–Z03 (`infAdFisco` Z02, `infCpl` Z03).
- CRT 4: [D01] *"CRT=4-MEI"*.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Alíquota efetiva | NT 2025.002 UB28 | [D01] | "pAliqEfet … Alíquota efetiva, após aplicação da redução de alíquota, incluindo o gCompraGov/pRedutor" |
| Monofasia nos totais | NT 2025.002 W57 | [D01] | "gMono Grupo total da Monofasia G W34 - 0-1" |
| IS nos totais | NT 2025.002 W33 | [D01] | "vIS Total do imposto seletivo E W31" |
| Informações do fisco | MOC 7.0 Anexo I Z02 | [D02] | "infAdFisco Informações Adicionais de Interesse do Fisco" |

## 3. Vigência conferida
- NT 2025.002 v1.52: sha256 `54ed8933…` igual ao registrado em 17/10 (`verif-2026-10-17-nfe-nfce-dfe` [P1]); é a versão vigente.
- MOC 7.0 Anexo I: sha256 `5eb4cf20…` igual ao de 26/09 e 02/10. De 01/11/2026 em diante o MOC passa a ter versão online do
  Paraná; a conferência das linhas `[MOC-DANFE-…]` é pendência do PR-2.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma nova. As três do PR-1 (opts da `readNfeTree`, gates do DANFE, `infAdFisco`) foram decididas pelo dono em 26/10
(`D-2026-10-26-NFE-DANFE-IBSCBS-PR1-LACUNAS`).

## 5. Lacunas
- Nota real autorizada com UB completo (`gRed`, IS, monofasia) segue ausente (P5 do BRIEF): os testes provam a mecânica sobre fixture.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Nota Técnica 2025.002-RTC v1.52 — Reforma Tributária na NF-e/NFC-e (grupos UB, BB e W03) — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=HXPO8VLbh4o=>  
  Baixado em 2026-10-26T17:40:00-03:00 · arquivo local `docs/D01_NT2025002-RTC-v1.52.pdf` · SHA-256 `54ed893327040a20a4a3c0562d342953542a1dc98e55d73dbe607d6c13d3d416`
- **[D02]** MOC 7.0 — Anexo I, Leiaute e Regras de Validação da NF-e e NFC-e — Portal Nacional da NF-e (ENCAT/RFB) — baixado por curl com cookie de sessão (o legal.py baixar entra em laço de 302)  
  Link oficial: <https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J%20I%20v4eN00E=>  
  Baixado em 2026-10-26T17:40:00-03:00 · arquivo local `docs/D02_MOC70-AnexoI-Leiaute.pdf` · SHA-256 `5eb4cf2010b10b0b62f78197c4eb64025f24535d4c6e61158bc7806dd008f55d`

## Registro de buscas
_Nenhuma busca registrada._
