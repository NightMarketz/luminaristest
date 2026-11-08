# Relatório de pesquisa legal — fila-2026-10-28-d1f-indop

**Pergunta:** D1f: o indOp 030101 informado pelo contador em 10/10 para o salão está na tabela oficial vigente (Anexo C da NFS-e nacional)?
**Aberto em:** 2026-10-28T04:59:57-03:00 · **Atualizado em:** 2026-10-28T05:01:41-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **O indOp que o contador deu em 10/10 está certo para o salão: 030101.** É a linha do art. 11, III, da LC 214 no Anexo C oficial da NFS-e nacional [D01]:
  - tipo de operação: "Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física";
  - local do fornecimento a identificar no DF-e: "Estabelecimento do fornecedor".
  - Extrato das 37 linhas da planilha em `docs/D01_indop-trechos.txt`, com o SHA-256 do texto.
- **Versão vigente:** a página "Documentação atual" do gov.br/nfse (atualizada em 15/08/2026) lista só o `ANEXO_C-INDOP_IBSCBS-SNNFSe-v1.01` [D02]. O arquivo baixado hoje tem o mesmo SHA-256 (`f59f066c…`) da cópia do corpus de 10/09 (`docs/accounting/fontes-oficiais/MANIFEST.md`, id `nfse-anexo-c`).
- **Já está no código:** `server/src/features/accounting/models/indOp.ts` foi gerado desse mesmo arquivo no #348 (BE-INCR-DFE PR-1), com `IND_OP_DEFAULT_SALAO = '030101'` e teste em `lc116IndOp.test.ts`. A nota do D1f registrava o indOp como "não conferido" porque não cruzou com essa transcrição.
- **Efeito:** os três itens do D1f (item da LC 116, alíquota do ISS, cClassTrib + indOp) têm resposta conferida em fonte oficial. Fechar o gate é decisão do dono.

## 2. Fundamentação
| Ponto | Norma | Fonte | Trecho literal |
|---|---|---|---|
| Código do salão | Anexo C INDOP v1.01, linha 5 | [D01] | "Inc. III \| Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física \| o local da prestação do serviço \| [...] \| 0301 \| 01 \| 030101 \| Estabelecimento do fornecedor" |
| Atendimento fora do salão | Anexo C, linhas 6 a 8 | [D01] | "02 \| 030102 \| Endereço do adquirente"; "03 \| 030103 \| Endereço do destinatário"; "04 \| 030104 \| Endereço diverso [...]" |
| Base legal | LC 214, art. 11, III | dossiê `fila-2026-10-27-bloco4-draft` [D03] | "serviço prestado fisicamente sobre a pessoa física ou fruído presencialmente por pessoa física, o local da prestação do serviço" |
| Versão em vigor | Documentação atual da NFS-e | [D02] | "ANEXO_C-INDOP_IBSCBS-SNNFSe-v1.01" |

## 3. Vigência conferida
- Não é norma do acervo: é anexo técnico do leiaute da NFS-e nacional, lido direto no gov.br/nfse [D01].
- Redação atual: v1.01 é a única listada em "Documentação atual" [D02], e o hash não mudou desde 10/09.
- A LC 214 foi lida na redação compilada com a LC 227/2026 (dossiê do bloco 4, [D03]); o art. 11, III, não traz marca de alteração.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma para o salão que atende no próprio endereço.
- **Atendimento a domicílio** (cabeleireira ou manicure na casa da cliente): o código passa a ser 030102, endereço do adquirente.
  - No código, o indOp fica no perfil de cada serviço: `ServiceFiscalProfile.cIndOp`, validado contra o Anexo C (`ServiceFiscalProfileDto.ts:23`), com 030101 como padrão. A emissão usa o valor do perfil (`FiscalDocumentEmissionService.ts:1337`); só o pacote sem serviço usa o 030101 fixo (`:1112`, decisão L8 do dono, 03/10).
  - Não existe escolha por nota. Um serviço feito às vezes no salão e às vezes na casa da cliente pede dois perfis ou um campo por nota. É desenho de produto, não pergunta ao contador.

## 5. Lacunas
- A nota (2) do Anexo C remete ao "art. 11, §4º" para o serviço do inciso III prestado parcialmente à distância. Na redação compilada da LC 214, essa regra está no § 5º; o § 4º trata de aquisição centralizada [D03 do bloco 4]. A remissão do anexo parece velha. Não afeta o serviço presencial do salão.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_anexo-c-indop-ibscbs-snnfse-v1-01-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo-c-indop-ibscbs-snnfse-v1-01.xlsx>  
  Baixado em 2026-10-28T04:59:57-03:00 · arquivo local `docs/D01_anexo-c-indop-ibscbs-snnfse-v1-01-xlsx.html` · SHA-256 `f59f066c5c3584ac26cc07d9b23f9fb6713e4bc9212b5e37fededf9244f29d15`
- **[D02]** Documentação Atual — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual>  
  Baixado em 2026-10-28T04:59:58-03:00 · arquivo local `docs/D02_documentacao-atual.html` · SHA-256 `dca11da6c3df7d6ba0fa210145c90cfb316822af5a4019eba7231903001bc706`

## Registro de buscas
_Nenhuma busca registrada._
