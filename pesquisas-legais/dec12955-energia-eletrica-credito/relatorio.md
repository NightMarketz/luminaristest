# Relatório de pesquisa legal — dec12955-energia-eletrica-credito

**Pergunta:** O que dizem os artigos do Decreto 12.955/2026 sobre energia elétrica (recolhimento, crédito de CBS) e se confirmam ou corrigem a regra geral do art. 47 da LC 214 para o crédito do salão no regime regular?
**Aberto em:** 2026-11-24T01:20:28-03:00 · **Atualizado em:** 2026-11-24T01:41:45-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **O Decreto 12.955 confirma o crédito pela regra geral do art. 47 da LC 214.** Para o salão no regime regular que compra energia da distribuidora (ambiente regulado, baixa tensão), o crédito é o da regra geral. O decreto não traz vedação nem limite próprio para energia elétrica. Grau: **verificado**, com a leitura integral dos artigos com "energia" no decreto compilado [D02] (lista no §2).
  - **Quem recolhe:** a CBS da energia no ambiente de contratação regulada é recolhida "exclusivamente" pela **distribuidora** [D02 art. 22 I; D03 LC 214 art. 28 I, red. LC 227/2026]. O recolhimento ocorre "somente no fornecimento" para consumo, ou para contribuinte fora do regime regular [D02 art. 22 § 1º].
  - **Crédito do salão:** "poderá apropriar créditos da CBS quando ocorrer a extinção ... dos débitos relativos às operações em que seja adquirente, excetuadas exclusivamente aquelas consideradas de uso ou consumo pessoal e as demais hipóteses previstas neste Regulamento" [D02 art. 47; D03 art. 47]. Duas condições se somam:
    - documento fiscal eletrônico idôneo, que para a energia é a **NF3e, modelo 66** [D02 art. 113 IX];
    - débito destacado e extinto [D02 art. 47 §§ 1º e 2º].
  - **Energia não é uso ou consumo pessoal.** A lista do art. 62 do decreto [D02] e do art. 57 da LC [D03] não cita energia: joias, arte, bebida alcoólica, tabaco, armas, bens e serviços recreativos, esportivos e estéticos, e o que se relaciona a eles. A única vedação expressa é a do uso ou consumo pessoal [D02 art. 64]. A outra vedação geral é a das operações imunes, isentas, com alíquota zero, diferimento ou suspensão [D02 art. 50], e nenhuma dessas é o fornecimento de energia ao consumidor.
  - **Local e momento:** o local da operação é o da entrega ou disponibilização [D02 art. 12 § 7º I]. O fato gerador segue a regra geral da execução continuada: exigibilidade da parcela, considerada na data de emissão da fatura, ou o pagamento, o que vier primeiro [D02 art. 11 §§ 3º e 4º]. O crédito nasce no mês da conta (NF3e) **e** depende de o débito estar extinto (art. 47).
- **IBS: mesma regra.** O Regulamento do IBS repete o recolhimento pela distribuidora [D04 Res. CGIBS 6/2026 art. 22 I] e a regra do crédito [D04 art. 47]. Grau: **verificado** quanto ao art. 22 e ao caput do art. 47. Os demais artigos do Regulamento do IBS não foram lidos um a um.
- **Para o simulador:** a premissa do dossiê `salao-2027-premissas-fora-simples` (PR #1336), "energia elétrica em 2027 dá crédito", fica **confirmada** e sobe de grau, de inferido para **verificado**. A regra específica de energia (arts. 12, 22 e 113 IX do decreto) não cria exceção ao art. 47. A lacuna bfa2 fica resolvida.
- **Achado lateral sobre o insumo estético** (fora da pergunta, mas é o mesmo artigo). Os "bens e serviços ... estéticos" são uso ou consumo pessoal (art. 62 VI), mas **não** quando:
  - o **bem** é utilizado "exclusivamente em estabelecimento físico pelos seus clientes" (parágrafo único III "b");
  - o **serviço** é adquirido por quem tem "atividade preponderante" na prestação desses mesmos serviços (parágrafo único IV "a") [D02 art. 62].

  O salão de beleza se encaixa nessas ressalvas e credita o insumo estético. Grau: **inferido**.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Recolhimento pela distribuidora | Dec. 12.955 art. 22 I | [D02] | "pela distribuidora de energia elétrica, nas hipóteses de fornecimento para adquirente atendido no ambiente de contratação regulada" |
| Idem na LC (red. LC 227) | LC 214 art. 28 I | [D03] | idem, "(Redação dada pela Lei Complementar nº 227, de 2026)" |
| Recolhe só no fornecimento final | Dec. 12.955 art. 22 § 1º | [D02] | "ocorrerá somente no fornecimento: I - para consumo; ou II - para contribuinte não sujeito ao regime regular" |
| Crédito: regra geral | Dec. 12.955 art. 47 | [D02] | "poderá apropriar créditos da CBS quando ocorrer a extinção ... excetuadas exclusivamente aquelas consideradas de uso ou consumo pessoal e as demais hipóteses previstas neste Regulamento" |
| Idem na LC | LC 214 art. 47 caput | [D03] | "poderá apropriar créditos do IBS e da CBS quando ocorrer a extinção ... excetuadas exclusivamente aquelas consideradas de uso ou consumo pessoal" |
| Uso e consumo pessoal (lista) | Dec. 12.955 art. 62; LC 214 art. 57 | [D02], [D03] | "VI - bens e serviços recreativos, esportivos e estéticos"; sem energia |
| Vedação só no uso pessoal | Dec. 12.955 art. 64 | [D02] | "Fica vedada a apropriação de créditos decorrentes da aquisição de bens e serviços de uso ou consumo pessoal" |
| Vedação geral | Dec. 12.955 art. 50 | [D02] | "As operações imunes, isentas ou sujeitas à alíquota zero, a diferimento ou a suspensão não permitirão a apropriação de créditos" |
| Documento | Dec. 12.955 art. 113 IX | [D02] | "Nota Fiscal de Energia Elétrica Eletrônica – NF3e, modelo 66" |
| Local | Dec. 12.955 art. 12 § 7º I | [D02] | "o local da entrega ou disponibilização, nas operações destinadas a consumo" |
| Momento | Dec. 12.955 art. 11 §§ 3º e 4º | [D02] | "considera-se exigível a parte da contraprestação ... na data da respectiva emissão" |
| IBS: distribuidora | Res. CGIBS 6/2026 art. 22 I | [D04] | "o recolhimento do IBS ... será realizado exclusivamente: ... I - pela distribuidora de energia elétrica" |
| Insumo estético não é uso pessoal do salão | Dec. 12.955 art. 62 par. único III "b" e IV "a" | [D02] | "sejam utilizados exclusivamente em estabelecimento físico pelos seus clientes"; "adquiridos por contribuintes cuja atividade preponderante seja a prestação desses mesmos serviços" |

**Artigos do Dec. 12.955 com "energia" [D02], todos lidos:**
- art. 2º § 1º: energias equiparadas a bens materiais;
- art. 11 §§ 3º e 4º: fato gerador por regra geral;
- art. 12 §§ 7º e 8º: local;
- art. 13 § 8º: base na compra multilateral na CCEE;
- art. 15: exclusão da energia compensada da Lei 14.300;
- art. 22: recolhimento;
- art. 113 IX: NF3e;
- art. 161: drawback;
- art. 180 §§ 3º e 4º: ZPE;
- art. 366 XI: informação das concessionárias;
- arts. 495, 503 I e 511: cashback;
- art. 518: veículos elétricos.

Nenhum cria vedação ou limite de crédito para o adquirente.

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** o Dec. 12.955 do acervo [D01] é a versão original. Foi lido o compilado do Planalto [D02]. Os arts. 11, 12, 13, 15, 22, 47, 50 e 62 a 64 têm o mesmo texto nos dois. As alterações dos Decretos 13.075, 13.133 e 13.140/2026 tocam outros artigos.
- **LC 214:** compilado do Planalto [D03]. O art. 28 tem redação da LC 227/2026, e o texto citado é o da linha "(Redação dada pela LC 227)". O art. 47 caput e os §§ 1º a 3º não têm alteração.
- **Regulamento do IBS:** Res. CGIBS 6/2026 [D04], de PDF. A versão 2 não está publicada (dossiê `regulamento-ibs-v2-art45` deste PR).

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma para a energia.

## 5. Lacunas
- O Regulamento do IBS [D04] foi conferido nos arts. 22 e 47. Os artigos de local, fato gerador e documento de energia do IBS não foram lidos um a um.
- O achado lateral do insumo estético (art. 62 par. único) não foi cruzado com o tratamento do insumo no simulador. Fica para o motor (nó SIMULACAO-CENARIO), registrado na caixa de lacunas.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Decreto nº 12.955 de 29/04/2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/517db958cd0ae2ba36c1f0b524b3cc55fe4198c6/federal/decretos/2026/dec-12955-2026-04-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-04-29;12955> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-11-24T01:24:34-03:00 · arquivo local `docs/D01_dec-12955-2026-04-29.md` · SHA-256 `5527dbfe923a984a86c22b27ef1c5c0b6f4f0c2996bbe14315e8804afd08bbd9`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-11-24T01:24:45-03:00 · arquivo local `docs/D02_d12955-htm.html` · SHA-256 `5e94d3cf7568bc2b8cd5b5c548c00cfa46324dc5d7833f3ffa4d8a21ad78d63a`
- **[D03]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-11-24T01:24:49-03:00 · arquivo local `docs/D03_lcp214-htm.html` · SHA-256 `5591db15aa6347ea50d579825c064af68ab527211361eb1cc9be7e80727446c7`
- **[D04]** D04_30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf>  
  Baixado em 2026-11-24T01:41:03-03:00 · arquivo local `docs/D04_30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs-pdf.pdf` · SHA-256 `9ed7032ef9c25bbee51bdb5e90f60e1ad01a2bf56cb41a28221c3db7f61d419a`

## Registro de buscas
_Nenhuma busca registrada._
