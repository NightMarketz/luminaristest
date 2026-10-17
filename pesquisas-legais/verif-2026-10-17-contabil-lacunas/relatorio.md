# Relatório de pesquisa legal — verif-2026-10-17-contabil-lacunas

**Pergunta:** As lacunas do dossiê contábil/ECD de 17/10 (Res. CFC 1.590, NBC PG 01, ITG 2000 (R1), Res. CFC 1.299/CTG 2001; manual ECD jan × maio) mudam alguma conclusão?
**Aberto em:** 2026-10-17T11:12:40-03:00 · **Atualizado em:** 2026-10-17T11:14:05-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

As 4 lacunas do dossiê `verif-2026-10-17-contabil-ecd` foram fechadas. **Nenhuma muda o que o código faz.** Uma delas revelou funcionalidade nova, que fica listada e não foi implementada.

1. **Manual ECD L9: janeiro × maio/2026, comparação integral (verificado).**
   - Comparei o texto inteiro das duas edições, palavra a palavra, sem cabeçalho e rodapé: são 112 trechos diferentes.
   - **Só um muda conteúdo:** o `COD_PLAN_REF` ganhou o valor **11 – TEF – Tributação Específica do Futebol**. Isso aparece no 0000 campo 23 [D01] p. 67 e no C040 p. 92.
   - Os outros 111 trechos são:
     - numeração do sumário: a inclusão do valor 11 empurra 1 página do 0007 em diante;
     - espaços partidos pela extração do PDF ("dev erá", "Recuperad a");
     - o erro de digitação "Dispensallllldas" no sumário de maio.
   - J801, J900, J930, J932, J935 e I050 têm conteúdo idêntico. A edição de janeiro usada é o PDF fornecido pelo dono em 23/09 (sha `7ddf47755f61`), que não está mais na página oficial.
   - **Efeito no código:** `SpedEcdDto.ts:117` aceita só `1`..`10`, então um declarante com plano referencial 11 leva 400. É **funcionalidade nova** (atende só clube/SAF no regime TEF, que não é o público do produto). Fica listada; não é correção.
2. **Res. CFC 1.590/2020 (verificado).**
   - O SRE do CFC diz "em vigor: SIM". A única alteração é a Res. CFC 1.703/2023, que revoga o art. 11 (infração/penalidade).
   - O BRIEF BE-INCR-ACCOUNTANT-GOVERNANCE cita os arts. 1º a 10, nunca o 11.
   - O PDF baixado hoje tem o mesmo sha que o BRIEF registrou (`ecaa931e8404`), então o texto lido lá é o vigente.
   - Trechos conferidos:
     - art. 1º p.ú.: "comprovar a extensão e os limites da responsabilidade técnica";
     - art. 2º "c": cláusula dos serviços que o contratante executa;
     - art. 3º: carta de responsabilidade anual;
     - art. 5º: "Após aceitação formal da proposta";
     - art. 9º: devolução no distrato.
3. **NBC PG 01 (verificado).** Em vigor e nunca alterada (SRE). O sha é o mesmo do BRIEF (`cb3ca0a1aca8`). Conferi os itens 4 "r" (número de registro após a assinatura), 6 "b"/"c" e 10 (serviço executado pelo tomador, explícito na proposta e no contrato).
4. **ITG 2000 (R1) (verificado).** Em vigor e não alterada (SRE). O sha é o mesmo do BRIEF (`6b4355f83fb7`). Conferi o item 10 "a": os livros digitais são assinados digitalmente pela entidade e pelo profissional da contabilidade.
5. **Res. CFC 1.299/2010 = CTG 2001 (verificado).**
   - Em vigor, alterada pela **CTG 2001 (R1)** de 12/12/2014 (sha `ee4fb67ef88c`) e pela Res. 1.329/2011, que só trocou a sigla.
   - O item 8 da CTG 2001 (R1) diz: "O plano de contas, com todas as suas contas sintéticas e analíticas, deve conter, no mínimo, 4 (quatro) níveis". Essa é a base da `REGRA_VALIDA_NIVEL_CONTAS` do PVA, que a cita.

## 2. Fundamentação
| Ponto | Norma | Fonte | Trecho literal |
|---|---|---|---|
| Valor 11 do COD_PLAN_REF | Manual ECD L9, maio/2026, p. 67 (0000 campo 23) e p. 92 | [D01] | "11 - TEF - Tributação Específica do Futebol" |
| Contrato escrito | Res. CFC 1.590/2020 art. 1º p.ú. | SRE `RES_1590.pdf` sha `ecaa931e8404` | "comprovar a extensão e os limites da responsabilidade técnica" |
| Aceite formal | Res. CFC 1.590/2020 art. 5º | idem | "Após aceitação formal da proposta" |
| Serviço do tomador | NBC PG 01 item 10 | SRE `NBCPG01.pdf` sha `cb3ca0a1aca8` | "deve estar explicitado na proposta e no contrato" |
| Assinatura dos livros | ITG 2000 (R1) item 10 "a" | SRE `ITG2000(R1).pdf` sha `6b4355f83fb7` | "assinados digitalmente pela entidade e pelo profissional da contabilidade" |
| Plano com 4 níveis | CTG 2001 (R1) item 8 | SRE `CTG2001(R1).pdf` sha `ee4fb67ef88c` | "deve conter, no mínimo, 4 (quatro) níveis" |

## 3. Vigência conferida
- **Alertas do acervo e como os resolvi:** o acervo `ctresb/leis` só tem Res. CFC de 2025 (1.756 a 1.765) e 2026. Por isso consultei as 4 normas na página de detalhes do SRE do CFC (`detalhes_sre.aspx`), que é a fonte oficial: "Resolução em vigor: SIM" nas 4.
- **Por que as normas do CFC não têm ID D:** o `legal.py` recusa o domínio cfc.org.br (o `baixar` respondeu "RECUSADO"). Elas estão aqui por URL e sha.
- **Redação atual:**
  - 1.590: alterada só pela 1.703/2023, que revoga o art. 11.
  - NBC PG 01 e ITG 2000 (R1): sem alteração.
  - 1.299: alterada pela CTG 2001 (R1), que é o texto lido.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **"Plano com no mínimo 4 níveis" (CTG 2001 (R1) item 8).** Há duas leituras.
   - **(a) Cada conta vai até o nível 4:** as analíticas de resultado (receita/despesa, hoje no nível 3) também precisariam descer.
   - **(b) O plano como um todo chega ao nível 4:** isso o plano canônico já cumpre, pela parte patrimonial (BE-INCR-PLANO-4-NIVEIS).
   - O PVA só cobra a leitura (a) para as naturezas 01/02/03 (`REGRA_VALIDA_NIVEL_CONTAS`), e o projeto segue o PVA.
   - Leitura mais segura: manter a (b) e deixar o PVA do H1 como oráculo.
   - Pergunta ao contador: "a CTG 2001 item 8 exige analítica de resultado no nível 4, ou basta o plano ter 4 níveis?"

## 5. Lacunas
- Não há outra edição do manual entre janeiro e maio/2026 na página oficial. Não foi possível confirmar se existiu uma intermediária.
- O valor 11 (TEF) no plano referencial precisa da tabela referencial TEF, que não foi conferida porque a funcionalidade não será implementada agora.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/71/1BD273E4A9F51ED8EF01AC3A6BC15812A3481F/Manual_de_Orienta%c3%a7%c3%a3o_da_ECD_Leiaute_20_maio_2026.pdf>  
  Baixado em 2026-10-17T11:13:11-03:00 · arquivo local `docs/D01_Manual_de_Orienta-c3-a7-c3-a3o_da_ECD_Leiaute_20_maio_2026-p.pdf` · SHA-256 `bc63f0a893ce4b2262b73426717e1cb5546704db58eaf81791fb296468bacc91`

## Registro de buscas
_Nenhuma busca registrada._
