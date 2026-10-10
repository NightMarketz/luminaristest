# PEDIDO ÚNICO AO CONTADOR — 2026-10-10 (v3)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> **Decisão do dono (chat, 10/10):** "Acato a sugestão. Devemos montar um pedido único."
> **Histórico:**
> - **v2:** assertivo, depois da pesquisa em fonte primária ([`pesquisa-lei-2026-10-10/`](pesquisa-lei-2026-10-10/)).
> - **v3:** aplica a revisão que o dono colou no chat em 10/10. Cada ponto foi conferido antes de entrar (tabela "Revisão
>   aplicada", no fim).
>
> **Substitui** (sem registro de envio em nenhum): follow-up de 23/09, `PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE`
> (PE-1..5), "#331", "passo 11 (h)", "lista de 29/09" e "junto do D8".

São **duas mensagens**. A 1ª tem prazo fiscal em 15/10 e vai **hoje**, sozinha. A 2ª vem dividida em três partes, para o
contador saber sobre quem está respondendo:
- **Parte I:** o seu cliente.
- **Parte II:** a sua prática como contador.
- **Parte III:** regras gerais que o sistema vai aplicar a todos os clientes.

---

## Mensagem 1 — enviar HOJE, separada

---

Olá, [nome do contador],

Uma pergunta rápida, com prazo: o [salão] já é optante do Simples e decidimos que ele fica no DAS para o IBS/CBS
em 2027. Pela Res. CGSN 186 (alterada pela 194), a opção pelo Simples para 2027 vai até **15/10** e a opção pelo regime
regular de IBS/CBS até **30/10**. **Confirma que ele não precisa fazer nada em nenhum dos dois prazos?** Se precisar,
o que e até quando?

Obrigado!

---

## Mensagem 2 — o pedido completo

---

Olá, [nome do contador],

Juntamos num pedido só tudo o que estava pendente com você. Os pedidos de 23/09 e 02/10 ficam substituídos por este.
Lemos a legislação antes: na Parte III trazemos a nossa leitura com a norma, e você só confirma ou corrige, indicando a
norma.

Prazo: **o que tem data fiscal é a nota de serviço** (NFS-e nacional obrigatória para o Simples em 01/11/2026, Res. CGSN
191). Por isso os itens **I-1, II-1 e III-1** são os primeiros. Os códigos referenciais (II-2 a II-4) são urgentes para o
nosso sistema, não para o fisco. O resto pode chegar depois.

### Parte I — sobre o [salão] (fatos da empresa)

**I-1. Serviços.** Quais serviços o salão presta hoje e em quais subitens: só 6.01 (cabeleireiro, manicure etc.), também
6.02 (esteticista) ou 6.03? Alguém da equipe é **esteticista**? Isso decide o código da nota e o direito aos 16% (III-6).
O salão informa os percentuais do IBPT na nota?

**I-2. Profissional-parceiro.** O salão tem **contrato de parceria homologado** (Lei 12.592 art. 1º-A §8º)? Os parceiros
são **pessoa física, MEI ou ME**? Qual é a cota-parte do salão? Tem empregado CLT? Quem faz a folha?

**I-3. Sócios.** Os sócios trabalham no salão? Como são as retiradas hoje: pró-labore fixo, lucro, ou sem separação? Vale
ver o III-12 junto.

**I-4. Regime de 2026.** O salão apura o Simples pelo **caixa** ou pela **competência** em 2026?

**I-5. Imobilizado.** A empresa usa as taxas do Anexo III da IN 1.700 ou laudo? Trabalha em mais de um turno?

**I-6. Norma contábil.** A empresa segue o CPC 47, o CPC PME (NBC TG 1000) ou a NBC TG 1002 (microentidade)?

### Parte II — sobre a sua prática (contas e forma de trabalho)

**II-1. Serviços 6.01 / 6.02 / 6.03 na nota.** Qual o **cClassTrib** (IBS/CBS) e o **NBS** que você usa em cada um?

**II-2. Conta "receita por não uso de pacote".** Quando um pacote pré-pago vence com saldo, o saldo sai do passivo e vira
receita numa conta própria (a nossa 3.4). Qual o **código do plano referencial** (ECF; PJ em geral) e em que **linha da
DRE** ela fica? Para comparar: serviços = 3.01.01.01.01.06; revenda = 3.01.01.01.01.05.

**II-3. Códigos referenciais das contas novas** (Presumido e Real), para:
a) juros de mora pagos · b) multa de mora paga · c) multa punitiva paga · d) juros recebidos · e) descontos condicionais
concedidos · f) descontos condicionais obtidos · g) descontos incondicionais concedidos · h) descontos incondicionais
obtidos · i) imobilizado e depreciação acumulada · j) provisões de IRPJ/CSLL, PIS/Cofins e DAS · k) IRPJ/CSLL a compensar.

**II-4. Parte B do e-Lalur (M010).** Qual código da tabela PARTEB_PADRAO você usa para cada conta de Parte B (prejuízo
fiscal, base negativa de CSLL, adições/exclusões temporárias, diferença de depreciação)?

**II-5. Imobilizado e DAS.**
- (a) Quais contas usa para imobilizado por classe, depreciação acumulada, despesa e ganho/perda na baixa?
- (b) Em que contas lança a provisão do DAS?
- (c) A CPP dentro do DAS vai como dedução da receita ou como despesa?

**II-6. Encargos.**
- (a) Multa de mora como despesa financeira ou operacional?
- (b) Um grupo "Multas indedutíveis" com as multas **fiscais e as não fiscais** (Procon, trânsito, trabalhistas) é
  aceitável para você?
- (c) Tarifa bancária e taxa do provedor de pagamento ficam como despesa operacional dedutível, fora do e-Lalur?

**II-7. Mercado Pago.**
- (a) Em que conta fica o saldo? "A liberar" e "disponível" ficam separados?
- (b) A baixa do título vai na data do pagamento ou na da liberação?
- (c) Em que conta vai a taxa? O valor "impostos" do relatório é retenção recuperável?
- (d) Como contabiliza estorno e chargeback?

**II-8. Pacote pré-pago.**
- (a) O saldo vencido vira receita de uma vez no vencimento ou proporcionalmente ao uso? A competência é o dia seguinte
  ao último dia válido?
- (b) Pacote novo pago com o saldo de outro: é uso do saldo ou renovação?

**II-9. PIS/Cofins** (só para períodos até dez/2026, porque a CBS substitui em 2027).
- (a) O saldo credor anterior já está no saldo de abertura do "a recuperar"?
- (b) "Retenções a conciliar" até a compensação está certo?
- (c) Quais exclusões do art. 26 você usa?

**II-10. Forma de trabalho.**
- (a) Em quais casos você entrega ECD para Simples e Presumido? Pode mandar o texto da tabela de obrigações de 23/09?
- (b) No pacote que mandamos: que demonstrativos além de ECD e ECF? Livro de Inventário? Faixas do aging? Que arquivos
  importa e quais só lê? Campos extras na ficha do imobilizado? Quais linhas M300 seus clientes usam?
- (c) A assinatura interna mais o histórico de alterações atendem ao que você pediu para assinar? Quais parâmetros
  exigem sua aprovação? Prefere revisar dentro do sistema ou por fora?
- (d) Com CRC transferido, que UF declara no SPED?

### Parte III — regras gerais (confirme ou corrija com a norma)

**III-1. Pacote vencido e ISS (São Paulo).** Pela LC 116 art. 1º, Lei SP 13.701 arts. 1º e 6º, RISS art. 81 e SC SF/DEJUG
06/2018, entendemos que:
- (a) o valor que **vence sem nenhuma sessão prestada não tem fato gerador de ISS** e **não leva NFS-e**;
- (b) a NFS-e de ISS sai **a cada sessão**, e não na venda do pacote.

**Ressalva:** isso vale para o ISS. No **regime regular de IBS/CBS a partir de 2027**, o pagamento antecipado já gera
débito (LC 214 art. 10), então "nota só na sessão" não cobre esse caso (ver III-3 b). Confirma (a) e (b)? Sabemos que a
sua confirmação não vincula a Prefeitura; se você concordar, faremos consulta formal à SF.

**III-2. Pacote vencido no Simples.** Pela Res. CGSN 140 art. 2º II e §§ 8º, 9º e 9º-A, entendemos que o saldo vencido:
- (a) é receita da atividade, Anexo III, no mês do vencimento;
- (b) não é indenização do § 5º V.

Confirma? Se a resposta do III-1 for "sem nota", como ele entra no PGDAS-D em 2027, quando a receita passa a seguir a
emissão do documento (Res. 190)?

**III-3. Pacote vencido em outros regimes.**
- (a) No Presumido/Real, entra como receita bruta (Lei 9.430 art. 25 I) ou como demais receitas (art. 25 II)?
- (b) Pela LC 214 art. 10 §5º (red. LC 227) e pelo Decreto 12.955 art. 57, entendemos que em 2027 o pacote vencido sem
  uso segue o cancelamento: o débito de IBS/CBS antecipado é estornado. Confirma?

**III-4. Alíquota de ISS.** Pela Lei SP 13.701 art. 16 IV, a alíquota em SP para 6.01/6.02/6.03 é 5%, sem benefício
municipal. Nenhum tomador retém esse ISS. No Simples vale a alíquota efetiva do DAS. Os códigos de tributação nacional
são 060101/060201/060301. Confirma?

**III-5. Parceiro pessoa física.** Pela Lei 10.666 art. 4º e pela IN RFB 2.110 arts. 37 II a, 41 I e 165 I, entendemos
que o salão:
- desconta 11% de INSS e recolhe até o dia 20, sem 20% patronal à parte (receita da parceria no Anexo III, Res. 140 art.
  25 §18);
- retém IRRF pela tabela;
- informa no eSocial (S-1200/S-1210), e não na Reinf.

Pela Res. 140 art. 2º §5º VI, entendemos também que **só a cota do parceiro com CNPJ sai da receita do salão**: a do
parceiro PF entra. Confirma? E o ISS da cota do parceiro PF em SP?

**III-6. Parceiro MEI/ME.** Pela Res. 140 art. 59 §§2º e 3º, o salão emite uma nota ao consumidor separando as cotas, com
o CNPJ do parceiro, e o parceiro emite nota ao salão pela cota dele, sem retenção federal e sem ISS retido do MEI (art.
27 IV). Confirma?

**III-7. 16% do prestador** (Lei 9.250 art. 40 p.ú.; IN 1.700 art. 33 §7º e art. 215 §10). Entendemos que:
- (a) vale **só para o IRPJ**; a CSLL segue com base de 32%;
- (b) salão só de cabeleireiro, manicure ou maquiador pode usar, se exclusivamente prestador e com receita até R$ 120
  mil no ano; **esteticista é profissão regulamentada (Lei 13.643/2018) e não pode**;
- (c) é opção do contribuinte;
- (d) se passar de R$ 120 mil no ano, a diferença dos trimestres anteriores é recolhida retroativamente (imposto
  postergado);
- (e) no ano de início o limite vale inteiro.

Confirma (a) a (e)? Conhece Solução de Consulta Cosit que diga outra coisa?

**III-8. Retenção do salão como tomador.** Pela Lei 10.833 art. 30 §2º, o salão do Simples **não retém CSRF**. Mas, pelo
RIR art. 714, entendemos que ele **retém o IRRF de 1,5%** quando paga a PJ por serviço profissional da lista do §1º,
**salvo se o prestador for do Simples** (IN RFB 765/2007) ou se o IR ficar em até R$ 10. Confirma?

**III-9. Saldo negativo de IRPJ/CSLL.** Pela Lei 9.430 arts. 6º e 74, a retenção acima do devido no trimestre vira saldo
negativo daquele trimestre, recuperável só por PER/DCOMP. Entendemos que o PER/DCOMP só é aceito **depois de transmitida a
ECF** (IN RFB 2.055/2021), e por isso o crédito fica parado até o ano seguinte. Confirma? Com IRRF/CSLL retidos, as
deduções vão no P300/P500?

**III-10. PIS/Cofins até dez/2026.** Entendemos que:
- (a) o crédito entra no **mês da entrada** da mercadoria;
- (b) na clínica, **só o ato médico** vai para o cumulativo (Lei 10.833 art. 10 XIII a; IN 2.121 art. 126 IX a); a
  estética fica no não cumulativo;
- (c) produto monofásico **usado como insumo** dá crédito básico quando comprado do fabricante ou importador, e não dá
  quando comprado de revendedor (IN 2.121 art. 160 I e II b; art. 534 §1º II);
- (d) CST 02 não é só de monofásico: aplicamos a regra geral com aviso.

Confirma? Multa recebida entra na base do não cumulativo?

**III-11. Virada de 2027 no Simples.** Entendemos que:
- (a) quem está no **caixa em 2026** inclui no PA de dezembro/2026 todos os valores a receber, porque o caixa acaba em
  2027 (Res. 140 art. 20 II b; Res. 190);
- (b) o PGDAS-D não eleva o ISS a 2%: só bloqueia isenção e limita a redução municipal (Manual itens 6.6.8–6.6.9; Res.
  140 art. 31 p.ú.);
- (c) em 2027 os juros embutidos no preço entram na receita bruta, e os juros e multas de mora ficam fora (Res. 190).

Confirma?

**III-12. Pró-labore.** A lei (Lei 8.212 art. 12 V f) só cobra INSS sobre a remuneração pelo trabalho. Mas a Receita
(SC Cosit 120/2016, pelo que nos foi indicado) trata como remuneração ao menos parte das retiradas do sócio que trabalha,
e, sem separação entre lucro e pró-labore na escrituração, tudo pode virar base de INSS. Para o sócio que trabalha no
salão:
- qual o **valor mínimo de pró-labore** que você considera defensável?
- o sistema deve **exigir** o pró-labore, ou só avisar?

**III-13. PNCT e devolução.**
- (a) Pelo Ato Conjunto RFB/CGIBS 5/2026 e pela LC 214 art. 348 III c, o PNCT de 2026 só cobra campos de IBS/CBS e não
  alcança o salão do Simples. Confirma? Para clientes do regime regular, você aceita ser indicado como responsável?
- (b) Reembolsar sessão já faturada exige cancelar ou substituir a NFS-e, porque não existe "NFS-e de devolução".
  Confirma? No Simples, o valor devolvido sai do PGDAS-D do mês da devolução?

**III-14. Para clientes maiores (pode responder por último).**
- (a) **LC 224** (só importa para receita acima de R$ 5 milhões no ano). Pela orientação da Receita (P&R v5, item 13), o
  limite da CSLL em 2026 é R$ 3,75 milhões. Pela LC 224 art. 4º §2º II a, a estimativa mensal do Lucro Real não leva o
  acréscimo de 10%. Confirma?
- (b) **Estimativa:** pela Lei 9.249 art. 3º §1º, a empresa aberta em 15/03 conta março como mês inteiro no limite do
  adicional. Confirma?
- (c) **DCTFWeb/MIT:** o débito é líquido das retenções ou bruto? Débito zero se declara? O trimestral vai no último mês?
  Mês só com suspensão é "sem movimento"?

Obrigado!

---

## Critério de aceite interno (não vai no texto)

Regra geral:
- **"Confirma"** registra "confirma, nada muda" (T5).
- **"Não, pela norma X"** vira crítica: o agente confere a norma, e depois vira fork ou emenda.
- **"Não"** sem norma volta ao contador.
- Nenhuma resposta é sign-off (CTD-002).
- Nos itens **III-1 e III-3**, o "confirma" do contador **não vincula o fisco**. A proteção vem da consulta formal à SF/SP
  (advogado, §10.3 do documento de perguntas).

| Item | Aceite / o que move | Origem |
|---|---|---|
| Msg 1 | "nada a fazer" → registra; senão alerta ao dono antes de 15/10 | pesquisa Simples (Res. 186/194) |
| I-1 | Subitens + sim/não esteticista → `ServiceFiscalProfile`; flag 16% | D1f · alínea j |
| I-2/I-3 | Fatos, **sem o contrato (PII)** → F-SN-12, F-PES-0/6 | SN §8.4 · L-PES |
| I-4/I-5/I-6 | Fato nomeado | F-SN-7 · FA 11(h) · PE-1(iv) |
| II-1 | cClassTrib na tabela vigente + NBS de 9 dígitos → D1f · X10b/X10i | item 1b · DFE p8 |
| II-2 | Código existente e analítico no catálogo 2025 + linha DRE. **Destrava o H1/P5** (o 400 vem do nosso gate de cobertura; ver nota abaixo) | PE-1(ii)/3b |
| II-3/II-4 | Códigos conferidos no catálogo do X2 / PARTEB_PADRAO em `LalurDto.ts:239` | follow-up 1/2 · ENC |
| II-5..II-10 | Respostas por subitem | FA · SN §8.6 · ENC · MP P1–P4 · PE-1 · PE-VP-1 · X8 · OBP · EMENDA-3-4 · GOV |
| III-1 | Confirma → **crítica contra o F-PV-9 (b) e o modo `VENDA`**, fork ao dono + consulta formal à SF | PE-4 |
| III-2/III-3 | Confirma/corrige | PE-3 · PE-2 · PE-5 |
| III-4..III-6 | Confirma → registra; III-5 decide F-PES-6 e a receita do Simples | pesquisa ISS · parceria |
| III-7 | Confirma → flag 16% bloqueia esteticista; regra de estouro e CSLL a 32% no PRESUMIDO-16 | alínea j · P-B5/B6 |
| III-8 | Confirma → regra de retenção no AP (achado: o AP hoje registra bruto como líquido) | L-PES-4 |
| III-9 | Confirma → aviso de prazo do PER/DCOMP no fluxo de caixa | P-12 |
| III-10 | Confirma (c) → corrigir a citação SC 4.024/2021 (DOSSIE e ITEM-DESTINATION) e fechar F-ID-4 | PC-4/6/7/13 |
| III-11..III-14 | Confirma/corrige | pesquisa Simples · IRPJ · ISS |

**Nota sobre II-2:** pelo Manual da ECD (item 1.17), o mapeamento referencial é **facultativo na ECD** e necessário na
ECF. O 400 `unmappedAccounts:[3.4]` da nossa ECD vem do **gate de cobertura do Luminaris**, que é mais rígido que a lei.
Afrouxar esse gate na ECD é decisão do dono, e vai como achado no relatório desta sessão. O código continua necessário
para a ECF do H1.

## Revisão aplicada na v3 (o dono colou no chat em 10/10; conferida antes de aplicar)

| Ponto da revisão | Conferência | Aplicado |
|---|---|---|
| F4: o tomador do Simples retém IRRF de 1,5% salvo prestador do Simples | **Confere**: a própria pesquisa dizia "retém" (`parceria-consumidor-a1.md:141`); a v2 inverteu por erro do agente | III-8 |
| F5: pró-labore subestimado; SC Cosit 120/2016 | Risco confere com a pesquisa (IN 2.110 art. 33); **SC Cosit 120/2016 não conferida** | III-12, citada como "indicada", não verificada |
| D3(b): CSLL com alíquota nova não se aplica a salão | **Confere**: a mudança é só para os códigos 7/8, financeiras e IP (`irpj-sped.md:92-98`); a PJ geral segue em 9% | removido |
| D2: 16% só no IRPJ; estouro retroativo | Coerente com a Lei 9.250 art. 40 (base do IRPJ) e com o "imposto postergado" já registrado no P-B6; não relido nesta rodada | III-7 (a)(d), como assertiva |
| D4: PER/DCOMP só depois da ECF (IN 2.055) | **Não conferida** | III-9, como assertiva para o contador confirmar |
| B3(b): incluir multas não fiscais | Coerente com a indedutibilidade geral das multas punitivas | II-6 (b) |
| A4(b): ressalva do IBS/CBS antecipado em 2027 | **Confere** com a LC 214 art. 10 lida na pesquisa (`parceria-consumidor-a1.md`, D-1) | III-1, ressalva |
| E1(d) urgente e separado | Prazo 15/10 verificado (Res. 186/194) | Mensagem 1 |
| A urgência do Bloco A é do desenvolvimento; I051 facultativo na ECD | **Confere**: Manual ECD item 1.17 (`irpj-sped.md:288`); o prazo fiscal real é a NFS-e em 01/11 | prioridades reescritas; nota II-2 |
| D6 vida curta (CBS em 2027); D1 só acima de R$ 5 mi | Coerente com a LC 214 (CBS substitui PIS/Cofins em 2027) e com o limite da LC 224 | II-9/III-10 "até dez/2026"; III-14 "pode por último" |
| Separar fatos do cliente × regras gerais | — | Partes I/II/III |
| O "confirma" não vincula em A4/C5; consulta formal à SF | Coerente com a pesquisa ISS (Lei SP 14.107 arts. 73–78) | nota no III-1 e no aceite |

## O que NÃO estamos pedindo (a lei já respondeu; base em `pesquisa-lei-2026-10-10/`)

- **NFS-e e obrigações do Simples:**
  - data da NFS-e do Simples: **01/11/2026** (Res. CGSN 191 art. 3º I);
  - DEFIS extinta em 2027;
  - Anexo XX: 14,92537%;
  - receita financeira fora da receita bruta do Simples.
- **IRPJ/CSLL e SPED:**
  - acréscimo da LC 224 é multiplicativo;
  - balancete de suspensão deduz o devido;
  - multa indedutível: RIR art. 352 §5º;
  - trava de 30%: Lei 9.065;
  - Leiaute 13 da ECF ainda não publicado;
  - código 2089-02 no MIT.
- **NFC-e e ICMS:**
  - cancelamento da NFC-e em 30 minutos;
  - SAT vedado em SP;
  - FCP de SP só sobre cerveja, chope e fumo;
  - SP fora do Protocolo 3/11;
  - CFOP do insumo de serviço: 1.128/2.128.
- **Fora deste pedido:**
  - ICMS/DIFAL (gatilho não disparou; o DIFAL de revenda vai ao advogado);
  - já fechados: D8, item LC 116, combustíveis, XML real, PE-6;
  - advogado, CRC-SP e órgãos (§2, §3 e §10.3 do documento de perguntas).

## Quando a resposta chegar

Chame o agente com "triagem do que o contador mandou".
