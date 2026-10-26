# Relatório de pesquisa legal — crc-sp-consulta-opcional

**Pergunta:** A consulta ao CRC-SP (F-GOV-1) é obrigatória? Base: Res. CFC 1.640/2021 art. 3º VIII e Res. CFC 1.708 art. 1º; o que resta perguntar
**Aberto em:** 2026-10-26T15:44:35-03:00 · **Atualizado em:** 2026-10-26T15:48:29-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**A consulta ao CRC-SP deixa de ser pré-requisito e passa a ser opcional.** Das 5 perguntas aprovadas em 10/10, três
são respondidas pela própria norma. Duas ficam abertas, e nenhuma lei obriga a perguntar ao CRC-SP antes de vender.

| Pergunta de 10/10 | Status | Base |
|---|---|---|
| 1. Software × serviço contábil | **respondida pela norma, com uma condição** | Só precisa de registro no CRC a PJ "constituída para exploração das atividades contábeis, em qualquer modalidade" [D02] art. 1º. Uma empresa de software não se encaixa nisso **se** o contador for contratado e pago pelo cliente (ver §4) |
| 2. Contador assina o que o cliente registrou | **aberta** (vira a pergunta 1 da v2) | A escrituração é "procedimento executado exclusivamente pelo profissional da contabilidade" [D03] art. 3º VIII. A NBC PG 01 item 10 admite que o cliente execute parte do serviço se a proposta e o contrato disserem. Fica aberto se as duas regras se conciliam no nosso desenho |
| 3. Reabertura pelo empresário | **aberta** (vira a pergunta 2 da v2) | Nenhuma norma lida responde. É a condição que o contador pôs em 23/09, contra o F-GOV-11 (a) |
| 4. Contador ou técnico | **respondida pela norma** | "Revisões de [...] registros contábeis" (XX) é privativa de **contador** [D03] art. 3º XX c/c §1º. A escrituração (VIII) cabe também ao técnico |
| 5. Assinatura dentro do sistema | **respondida pela norma** | O profissional deve "apor sua assinatura, física ou digital, categoria profissional e número de registro no CRC" em todo trabalho [D03] art. 4º. O aceite interno é atestado, e para o CRC vale a assinatura com categoria e registro. O BRIEF já trata o aceite assim |

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Quem precisa de registro | Res. CFC 1.708/2023 art. 1º | [D02] | "constituídas para exploração das atividades contábeis, em qualquer modalidade" |
| Escrituração é do profissional | Res. CFC 1.640/2021 art. 3º VIII | [D03] (= [D01]) | "procedimento executado exclusivamente pelo profissional da contabilidade" |
| Revisão é privativa de contador | Res. CFC 1.640/2021 art. 3º XX e §1º | [D03] | "revisões de quaisquer demonstrações [...] ou de registros contábeis" |
| Parametrizar regras no software | Res. CFC 1.640/2021 art. 3º XXX | [D03] | "parametrização e/ou para configuração de todas as regras fiscais e contábeis em qualquer tipo de software" |
| Assinatura com categoria e registro | Res. CFC 1.640/2021 art. 4º | [D03] | "apor sua assinatura, física ou digital, categoria profissional e número de registro" |
| Cliente executa parte, se o contrato disser | NBC PG 01 item 10 | dossiê `verif-2026-10-17-contabil-lacunas` (conferido 17/10, citado no BRIEF GOV-CONTADOR linha 8) | não relido aqui |

## 3. Vigência conferida
- O acervo [D01] traz a 1.640 em "publicação original". Conferi no SRE do CFC [D03], que serve o texto vigente: os incisos VIII, XX, XXX, o §1º e o art. 4º estão iguais, sem nota de alteração. A busca na web não achou norma que altere ou revogue a 1.640.
- A 1.708/2023 não está no acervo. Baixei do SRE do CFC [D02]. Ela entrou em vigor em 1º/01/2024 (art. 27) e revogou a 1.555/2018 (art. 28).
- A ferramenta `legal.py` recusava `cfc.org.br`. Incluí o domínio na lista oficial em 26/10, porque o CFC é o regulador que o método manda usar.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **"Com contador incluso" × art. 1º da 1.708.** Se o cliente contrata e paga o contador direto, e a Luminaris só indica,
   a Luminaris vende software e fica fora do art. 1º. Se a Luminaris **cobra pelo serviço do contador** dentro da
   assinatura, ou subcontrata o contador, ela pode ser lida como PJ que explora atividade contábil "em qualquer
   modalidade" e precisaria de registro, com sócio contador majoritário (art. 3º §3º). **Leitura mais segura:** o cliente
   contrata e paga o contador; a Luminaris indica e cobra só o software. Se o modelo comercial for o outro, aí a consulta
   ao CRC-SP volta a fazer sentido, com esta pergunta.
2. **Art. 3º XXX (parametrização de regras fiscais e contábeis em software).** Este ponto é novo e não estava na consulta
   de 10/10. Quem define o plano de contas padrão, as regras de lançamento e as regras fiscais do Luminaris? Pela 1.640, é
   atribuição de profissional da contabilidade. A resolução regula o exercício da profissão e não é norma dirigida a
   software. Mesmo assim, a leitura mais segura é que as regras padrão tenham um contador responsável que as valide, por
   exemplo o contador parceiro, com registro disso. Não é pergunta obrigatória ao CRC-SP. É risco a aceitar ou a cobrir.

## 5. Lacunas
- Nenhuma norma lida diz se a reabertura pelo empresário, depois de encerrada a relação com o contador, compromete o contador
  que assinou. É a pergunta 2 da v2.
- O item 36 da ITG 2000 (lançamento extemporâneo), citado pelo dono em 10/10, continua sem conferência na fonte.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** RESOLUÇÃO CFC Nº 1.640, DE 18 DE NOVEMBRO DE 2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/207390262912b4e7e8c1cbbf6c700ce9a2f13ca3/reguladores/cfc/resolucoes/2021/resolucao-cfc-n-1.640-de-18-de-novembro-de-2021-367541982.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cfc-n-1.640-de-18-de-novembro-de-2021-367541982> · versao_texto: publicação original · cópia de 2026-10-21  
  Lido em 2026-10-26T15:44:37-03:00 · arquivo local `docs/D01_resolucao-cfc-n-1-640-de-18-de-novembro-de-2021-367541982.md` · SHA-256 `d397214b5b94ac96da0d37c3456313998b9a2a98f689fb8e741ef1b2b25042fa`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** PROC — Conselho Federal de Contabilidade (SRE: resoluções e NBC)  
  Link oficial: <https://www1.cfc.org.br/sisweb/SRE/docs/RES_1708.pdf>  
  Baixado em 2026-10-26T15:47:10-03:00 · arquivo local `docs/D02_RES_1708-pdf.pdf` · SHA-256 `b7714fc8681cdebeba5760ceb46d8bc3cfdc798c9edfe374a23d2654ac53a170`
- **[D03]** D03_RES_1640-pdf — Conselho Federal de Contabilidade (SRE: resoluções e NBC)  
  Link oficial: <https://www1.cfc.org.br/sisweb/SRE/docs/RES_1640.pdf>  
  Baixado em 2026-10-26T15:47:10-03:00 · arquivo local `docs/D03_RES_1640-pdf.pdf` · SHA-256 `ef3edd4ce422c8c32be33b8e7f7722dc99737145892e2c853b984b81cbe4cefa`

## Registro de buscas
_Nenhuma busca registrada._
