# Transcrição — LC 214/2025 art. 10 (fato gerador de IBS/CBS) × pacote pré-pago (2026-09-27)

> **Verificação V5** da Fase 0 do [`PLANO-POS-CONTADOR-2026-09-23`](../PLANO-POS-CONTADOR-2026-09-23.md),
> autorizada pelo dono em 27/09 ("tem que rodar o quanto antes"). Transcrição da **redação vigente**
> (versão compilada do Planalto, que já traz as alterações da **LC 227/2026**), pela regra da memória
> `tabela-transcrita-de-lei-conferir-redacao-vigente`. **Não é decisão** — a leitura vai rotulada.
>
> Fonte: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>, baixada 2026-09-27, 5.402.213 bytes,
> sha256 `ddeafec2054c…`. **Não commitada** (5,4 MB); o MANIFEST registra a origem e este arquivo carrega o
> trecho. Para reconferir: baixar a URL e procurar "Art. 10".

## 1. O que o art. 10 diz (literal, redação vigente)

**Caput.** "Considera-se ocorrido o fato gerador do IBS e da CBS no momento do fornecimento nas operações com
bens ou com serviços, ainda que de execução continuada ou fracionada."

**§ 1º III** — "considera-se ocorrido o fornecimento no momento: … III - do término do fornecimento, no caso
dos demais serviços".

**§ 3º (redação da LC 227/2026)** — "Nas operações de execução continuada ou fracionada, considera-se ocorrido
o fato gerador na primeira entre as seguintes ocorrências: I - quando se torna exigível a parte da
contraprestação correspondente a cada pagamento; ou II - pagamento da obrigação decorrente do fornecimento."
*(A redação anterior — água, gás, telecom, energia — continua no compilado, marcada como substituída.)*

**§ 4º — o dispositivo que responde à V5.** "caso ocorra pagamento, integral ou parcial, antes do fornecimento:
**I - na data de pagamento de cada parcela:** a) serão exigidas **antecipações** dos tributos, calculadas da
seguinte forma: 1. a base de cálculo corresponderá ao valor de cada parcela paga; 2. as alíquotas serão as
[vigentes] … na data do pagamento, o que ocorrer primeiro; b) as antecipações … constarão como **débitos na
apuração**; **II - na data do fornecimento:** a) os valores **definitivos** … 1. a base de cálculo será o valor
total da operação, **incluindo as parcelas pagas antecipadamente**; 2. as alíquotas serão aquelas vigentes na
data do fornecimento; b) caso os valores das antecipações sejam **inferiores** aos definitivos, as diferenças
constarão como **débitos**; e c) caso sejam **superiores**, observar-se-ão as regras do pagamento indevido ou a
maior (redação da LC 227/2026; a redação anterior mandava apropriar como **créditos**)."

**§ 5º** — não ocorrendo o fornecimento, "inclusive em decorrência de distrato, o fornecedor poderá apropriar
créditos com base no valor das parcelas das antecipações devolvidas".

**§ 7º (LC 227/2026)** — "O regulamento estabelecerá hipóteses em que, observado o prazo máximo de **5 (cinco)
dias** entre o pagamento antecipado e a data do fornecimento, as antecipações … poderão constar como débitos no
período de apuração do **fornecimento**."

## 2. Leitura — **INFERIDA**, não ratificada

O pacote pré-pago do salão é exatamente a hipótese do § 4º: o cliente paga hoje, o serviço é prestado depois.
Sob a LC 214 vigente isso implicaria, a partir da entrada em vigor do IBS/CBS:

1. **débito de antecipação na venda do pacote** (base = valor pago), não na prestação;
2. **acerto na prestação de cada sessão** (base = valor total da operação; diferença a maior vira débito, a
   menor segue a regra do pagamento indevido);
3. **crédito na devolução** se o pacote for cancelado sem uso (§ 5º);
4. a janela de 5 dias do § 7º **não** cobre o pacote típico (sessões ao longo de meses).

**Grau:** inferido — da leitura do texto para o caso do salão, sem confirmação de contador e sem o regulamento
do § 7º, que ainda não existe. Não vira requisito nem nó de trabalho por conta desta transcrição.

## 3. O que isto muda hoje: **nada no razão**

A V7 (mesma rodada) mediu o outro lado, no código: o pacote pré-pago **já é passivo**, não receita —
`SalePackageSoldMapper` emite **D 1.1.2 (A Receber) / C 2.1.1 (Pacotes Pré-pagos)** na venda
(`server/src/features/accounting/sync/mappers/SalePackageSoldMapper.ts:11,52-53`), e o consumo **debita o
passivo** pelo `SaleSettledMapper`, com guarda dura quando o binding não resolve a conta
(`blocked_missing_prepaid_liability_account`, `SaleSettledMapper.ts:83-87`; papel `passivo-adiantamento` em
`accountingBinding/interpreter/interpret.ts:341-370`). Ou seja: o **diferimento de receita** está correto e é
o mesmo diferimento que o § 4º pressupõe.

**O que falta é fiscal, não contábil:** não existe apuração de IBS/CBS no produto ([[M5-ibs-cbs]], diferido), e
é lá — não no razão — que a antecipação do § 4º precisaria aparecer quando o regime entrar. Registrado como
insumo do ADR daquele nó; **nenhum código nasce desta verificação**.
