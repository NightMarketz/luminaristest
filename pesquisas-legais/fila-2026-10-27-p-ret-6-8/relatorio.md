# Relatório de pesquisa legal — fila-2026-10-27-p-ret-6-8

**Pergunta:** P-RET-6 e P-RET-8: qual o código de recolhimento (DCTFWeb/GPS) da retenção de 11% (Lei 8.212 art. 31) e o prestador na CPRB sofre retenção de 3,5% em vez de 11%? Vigência em 2026 e 2027
**Aberto em:** 2026-10-27T02:18:54-03:00 · **Atualizado em:** 2026-10-27T02:33:30-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **P-RET-6, código de recolhimento: 116201.** Com a DCTFWeb, a retenção do art. 31 da Lei 8.212 sai com o código de receita **116201**, e o adicional de retenção (aposentadoria especial, IN 2.110 art. 131) com **114106**. A EFD-Reinf devolve esses códigos no retorno do R-2010 e os envia à DCTFWeb [D03, MOU 2.1.2.1, totalizador da série R-2000, item 1.1]. O mesmo código vale para 11% e para 3,5%. O GPS 2631 citado no ADR é do regime anterior à DCTFWeb e não deve ir para a linha `INSS` da `RETENCAO_CODIGO`.
- **P-RET-8, prestador na CPRB: 3,5% até 2027, 11% a partir de 2028.** A retenção é de 3,5% quando a contratada é optante pela CPRB e presta serviço das atividades do caput do art. 7º da Lei 12.546: TI e TIC, call center, transporte rodoviário coletivo de passageiros, construção civil nos grupos CNAE 412, 432, 433 e 439 [D01 art. 7º § 6º]. A Lei 14.973/2024 encerrou o art. 7º em 31/12/2024 e criou a substituição parcial de 2025 a 2027 [D01 art. 9º-A]; a Receita entende que os 3,5% continuam nesse período e viram 11% em 01/01/2028 [D02, SC Cosit 153/2026]. Sem opção pela CPRB, 11%.
- **Efeito no produto:** a linha `INSS/CPRB` sai de DRAFT com 350 bp de 2025-01-01 a 2027-12-31 e 1100 bp desde 2028-01-01; a linha de código `INSS` sai de DRAFT com `116201` (e `114106` para o adicional, se um dia houver). Para salão e clínica, o caso prático é reforma feita por construtora na CPRB, ou TI e call center em cessão.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| 3,5% na CPRB | Lei 12.546 art. 7º § 6º | [D01] | "a empresa contratante deverá reter 3,5% (três inteiros e cinco décimos por cento) do valor bruto da nota fiscal ou da fatura" |
| Fim do art. 7º | Lei 12.546 art. 7º caput (red. Lei 14.973/2024) | [D01] | "Até 31 de dezembro de 2024, poderão contribuir" |
| Transição | Lei 12.546 art. 9º-A | [D01] | "Nos exercícios de 2025 a 2027, as empresas referidas nos arts. 7º e 8º desta Lei poderão contribuir sobre o valor da receita bruta" |
| 3,5% até 2027 | SC Cosit 153/2026 (ementa) | [D02] | "Durante o período de transição de reoneração da folha de pagamento previsto para os exercícios de 2025 a 2027, é de 3,5%" |
| 11% em 2028 | SC Cosit 153/2026 (ementa) | [D02] | "A partir de 1º de janeiro de 2028, será de 11 % (onze por cento)" |
| Código da retenção | MOU EFD-Reinf 2.1.2.1, retorno do R-2010 | [D03] | "116201 – Retenção de que trata o art. 31 da Lei 8.212/91" |
| Código do adicional | idem | [D03] | "114106 – Adicional de retenção de que trata o art. 31 da Lei 8.212/91" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** [D01] compilada, cópia de 13/10/2026, sem alerta. Traz o art. 7º caput com a redação da Lei 14.973/2024 e o art. 9º-A acrescido por ela; nenhuma redação posterior nos trechos usados.
- [D02] não está no acervo: a pasta `reguladores/rfb/solucoes-de-consulta/2026` tem a SC nº 154, de 20/08/2026, mas não a 153. Lida no SIJUT oficial, só a ementa e os dispositivos (`docs/D02_sc-cosit-153-2026-ementa-navegador.txt`); o download [D02] é a casca JS.
- [D03] tem o mesmo SHA-256 da cópia de 22/10 (`563e771c…`): nenhuma versão nova do manual publicada desde então.
- **Norma mais específica não lida:** IN RFB 2.053/2021, arts. 2º-A e 11, citados pela SC.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma de lei. Saber se o prestador é optante pela CPRB é dado do fornecedor (destaque na nota), já previsto no BRIEF como `inssCprb`.

## 5. Lacunas
- Texto integral da SC Cosit 153/2026 e da IN RFB 2.053/2021 (arts. 2º-A e 11).
- A tabela de códigos de receita da própria DCTFWeb não foi lida; o código vem do manual da Reinf, que é o que gera o débito.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 12.546 de 14/12/2011 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/4fbb5d105ae40e82c1f5afc2d01ca728f47e5e66/federal/leis-ordinarias/2011/lei-12546-2011-12-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2011-12-14;12546> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-27T02:18:57-03:00 · arquivo local `docs/D01_lei-12546-2011-12-14.md` · SHA-256 `ae4a2cb31093920893030d91f9460b536c801ba7c5400d2a77ce857b8d644ab1`
- **[D02]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?facetsExistentes=&orgaosSelecionados=Cosit&tiposAtosSelecionados=72&numero_ato=153&ano_ato=2026&termoBusca=>  
  Baixado em 2026-10-27T02:31:04-03:00 · arquivo local `docs/D02_consulta-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`
- **[D03]** D03_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/28/40FAAC1C636CC110D4C12D2790B43C641C6BCA/Manual%20da%20EFD-Reinf%20vers%c3%a3o%202.1.2.1.pdf>  
  Baixado em 2026-10-27T02:31:09-03:00 · arquivo local `docs/D03_Manual-20da-20EFD-Reinf-20vers-c3-a3o-202-1-2-1-pdf.pdf` · SHA-256 `563e771cf0b48dec156c44bc3582a469c8a7203b2e415a89da7bba1ee27f5977`

## Registro de buscas
_Nenhuma busca registrada._
