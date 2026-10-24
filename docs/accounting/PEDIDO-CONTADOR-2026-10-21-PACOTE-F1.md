# PEDIDO AO CONTADOR — 2026-10-21 (pacote único F1: IBS/CBS, retenções, EFD-Reinf, eficiência fiscal)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> Pedido do dono (chat, 21/10): "sim, monta o pacote único".
> Fonte das perguntas: §9 dos ADRs `ADR-INCR-IBS-CBS-2027` (P-IBS-2..4), `ADR-INCR-RETENCOES-FONTE` (P-RET-1..5),
> `ADR-INCR-EFD-REINF` (P-REINF-2..4) e `ADR-INCR-EFICIENCIA-FISCAL` (P-EF-1..10); forks ratificados em 21/10 (PR #792).
>
> **Sobreposição com rascunhos anteriores (sem registro de envio):**
> - P-IBS-2 (cClassTrib) = item **II-1** do [`PEDIDO-CONTADOR-2026-10-10-UNICO.md`](PEDIDO-CONTADOR-2026-10-10-UNICO.md).
> - P-RET-1 (Simples tomador retém IRRF?) encosta no **III-8** do mesmo pedido.
> - P-RET-4 / P-IBS-4 (contas do referencial) encostam no **II-2** dele.
> - **Se o pedido único de 10/10 ainda não saiu, mande os dois juntos e corte daqui as perguntas 1, 4 e 7** (marcadas ⓘ).
> - P-IBS-1 já foi respondida (triagem de 21/10) — **não** está aqui. A5 (piso de 2% do ISS) voltou ao dono — **não** está aqui.

---

## Mensagem ao contador

Olá, [nome do contador],

Estamos fechando quatro frentes do sistema para 2027: IBS/CBS, retenções na fonte, EFD-Reinf e um módulo que **sugere**
economia tributária lícita (e bloqueia o que seria simulação). Não precisamos de documento — só da sua leitura e, se
tiver, da base legal. Pode responder por número, curto ("sim", "não, porque…").

**A. IBS/CBS a partir de 2027**

1. ⓘ Qual **cClassTrib** e **CST** do IBS/CBS você usaria para (a) serviço de cabeleireiro/estética do salão, (b) procedimento
   estético feito por médico na clínica, (c) consulta médica? E que itens de **uso ou consumo pessoal** (LC 214 art. 57)
   você **não** deixaria creditar num salão/clínica (ex.: alimentação, veículo)?
2. **Pacote pré-pago de sessões:** a LC 214 art. 10 § 4º exige recolher o IBS/CBS **na data de cada parcela paga**, antes da
   sessão. Você aplica isso ao pacote do salão? Conhece alguma regra no regulamento do IBS que dê prazo de 5 dias?
3. No Lucro Presumido/Real, o IBS/CBS destacado na nota entra na contabilidade como **dedução da receita bruta** (como
   PIS/Cofins hoje) ou fica **fora do resultado** (receita já líquida)? Quais contas do plano referencial?

**B. Retenções na fonte (o salão/clínica como pagador e como prestador)**

4. ⓘ O salão **optante pelo Simples**, quando contrata outra PJ (ex.: serviço profissional), retém o **IRRF de 1,5%**
   (RIR art. 714)? E se o fornecedor também for optante?
5. O limite de **R$ 10** para não reter (Lei 9.430 art. 67) vale para o **IRRF de PJ**? O texto fala de pessoa física — tem
   outra base?
6. Confirma o momento de cada retenção: **IRRF** no pagamento ou crédito, **CSRF** no pagamento (proporcional em pagamento
   parcelado), **INSS 11%** na emissão da nota?
7. ⓘ Contas do plano referencial para IRRF, CSRF, INSS e ISS **a recolher** (retidos de terceiros) e **a compensar**
   (retidos de nós). O **ISS retido** pelo cliente na nossa nota compensa no município ou quita o próprio ISS devido?
8. Dos serviços que o salão/clínica contrata (limpeza, vigilância, manutenção, recepcionista terceirizada), quais você trata
   como **cessão de mão de obra** (INSS 11%)? E quais o município do cliente obriga a reter ISS?

**C. EFD-Reinf**

9. Que **natureza do rendimento** (Tabela 01 da Reinf) e código de receita você usa para os pagamentos típicos do salão/
   clínica a PJ (serviço profissional, limpeza, comissão)?
10. O Simples que retém só IRRF (sem CSRF) declara o **R-4020** do mesmo jeito?

**D. Economia tributária — o que vocês aceitam**

11. **Combo serviço + produto:** vocês aceitam o desconto do combo **alocado ao item mais tributado até o preço de custo**
    (custo médio do estoque), com teto no preço de catálogo dos demais e tudo **destacado na nota** como desconto
    incondicional? Que evidência de custo querem que guardemos? Para **serviço**, que piso defendem: custo de mão de obra
    informado ou preço mínimo publicado?
12. No **Simples**, a receita de cada item para segregar (monofásico × serviço) é o preço **líquido do desconto**
    alocado a esse item? Alocar por carga tributária e alocar proporcional ao catálogo são ambos aceitáveis no PGDAS-D?
13. Produto **aplicado** durante o serviço é acessório do serviço (LC 214 art. 7º), e produto **entregue** ao cliente é
    revenda com NCM própria? **Kit fechado** (ex.: "kit home care"): um bem só (NCM do kit) ou explode por item?
14. **Procedimento estético por médico:** em 2027, entra na redução de 60% da saúde (Anexo III da LC 214) ou alíquota cheia?
    E no Simples hoje, a clínica estética vai pelo CNAE de medicina ou de estética?
15. Para atingir o **fator r de 28%**, é seguro elevar o **pró-labore** no mês, efetivamente pago e com INSS recolhido? Há
    piso/teto que recomendam para não parecer remuneração "de papel"?
16. **ICMS-ST** de cosméticos/perfumaria no estado do cliente: qual protocolo/convênio e quais NCM vocês usam para segregar
    no PGDAS-D? Têm a tabela?
17. Na clínica, quais procedimentos vocês classificam como **Atribuição 4 da RDC Anvisa 50** para o 8%/12% no Presumido?
    Algum estético (toxina, preenchimento, laser) entra?
18. A clínica é limitada em SP: pleiteariam o **ISS fixo de sociedade uniprofissional** (STJ Tema 1.323) ou mantêm o ISS
    sobre o faturamento? Qual o valor por profissional em 2026?
19. Aceitam a parcela de **aluguel** da cota do salão-parceiro como locação de bem móvel (Anexo III sem ISS)? Que cláusula
    do contrato querem ver separando aluguel de gestão?
20. Com uma esteticista (ou médico) no quadro, a presunção de **16%** da Lei 9.250 art. 40 deixa de valer para toda a
    empresa?

Se alguma pergunta não se aplica aos seus clientes, é só dizer "n/a". Obrigado!

---

## Mapa interno (não vai no texto) — critério de aceite por item

| Nº | Item | Fork / nó | Critério de aceite NOSSO |
|---|---|---|---|
| 1 | P-IBS-2 | F-IBS-4, F-IBS-10 | códigos existem na tabela cClassTrib vigente (conferir em fonte oficial antes de virar linha); lista de uso/consumo vira `legal_parameters` versionada |
| 2 | P-IBS-3 | F-IBS-5 | "aplica" ⇒ mantém `ANTECIPACAO_ART10`; "não aplica" ⇒ emenda do BRIEF; regra dos 5 dias só com artigo citável |
| 3 | P-IBS-4 | F-IBS-8 | resposta (a)/(c) + código referencial ⇒ remove o provisório (a) do BRIEF |
| 4 | P-RET-1 | D4 / F-RET-5 | sim/não por caso (fornecedor optante × não optante), com base; conferir IN SRF 459 em fonte oficial |
| 5 | P-RET-2 | F-RET-6 | base legal citável ⇒ linha `DRAFT` vira vigente; sem base ⇒ fica "reter >0" |
| 6 | P-RET-3 | D2 | confirmação ⇒ "confirma, nada muda" |
| 7 | P-RET-4 | F-RET-9, D7 | códigos referenciais por conta; compensação do ISS decide o provisório do F-RET-9 |
| 8 | P-RET-5 / P-REINF-4 | F-RET-3, R-2010 | lista de serviços × cessão; subitens municipais com lei citada |
| 9 | P-REINF-2 | F-REINF-5 | códigos conferidos contra a Tabela 01 oficial antes de sair do DRAFT |
| 10 | P-REINF-3 | D1 Reinf | sim/não |
| 11 | P-EF-1 | F-EF-1, I-3 | aceite da regra + evidência de custo nomeada (vira campo/anexo) |
| 12 | P-EF-2 | item 9 | confirmação dos dois critérios |
| 13 | P-EF-3 | F-EF-4 | regra por caso (aplicado × entregue; kit) |
| 14 | P-EF-4 | F-EF-8 | enquadramento + CNAE; mantém aviso "não confirmado" até resposta |
| 15 | P-EF-5 | aviso I-5 | texto do aviso |
| 16 | P-EF-6 | `ICMS_ST_NCM_UF` | tabela com protocolo citado ⇒ linhas DRAFT conferidas em fonte oficial |
| 17 | P-EF-7 | F-EF-10, F-EF-11 | lista de procedimentos por Atribuição 4 com fundamento |
| 18 | P-EF-8 | F-EF-12 | decisão + valor 2026 (conferir na lei SP) |
| 19 | P-EF-9 | X14 | confirmação do X14 + cláusula |
| 20 | P-EF-10 | item 30 | confirmação |

**Anonimização:** nenhuma pergunta pede documento do cliente; se o contador mandar nota, contrato ou tabela com CNPJ/nome,
não commitar — trocar CNPJ, nomes e IE antes (CTD-003).

**O que NÃO estamos pedindo:** P-IBS-1 (respondida 21/10), P-IBS-5 (fonte oficial: Res. Senado/Decreto), P-IBS-6 e
P-REINF-1 (gates humanos), P-IBS-7 (dono + doc do Mercado Pago), P-REINF-5 (leitura do e-CAC pelo dono), A5 (volta ao
dono antes), XMLs de NF-e (X1, pedido próprio).

**Quando a resposta chegar:** "triagem do que o contador mandou".
