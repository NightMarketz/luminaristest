# Follow-up ao contador — 2ª rodada (Fase 0.8 do PLANO-POS-CONTADOR-2026-09-23)

> **Rascunho do agente** (skill `luminaris-contador-liaison`), montado em 2026-09-26 por autorização do dono em
> chat ("Não enviei; monta o rascunho"). **[CTD-001] O envio é do dono.** Resposta chega → "triagem do que o
> contador mandou". O item (c) original do 0.8 (D8, declarante/signatários) **saiu**: fechado em 24/09
> (`TRIAGEM-RESPOSTA-CONTADOR-2026-09-24-D8.md`). **Item 5 acrescentado em 27/09** (data do Simples — o ato oficial,
> lido no PDF, diz outra data).

## Texto para enviar (copiar daqui até a linha)

---

Olá! Obrigado pelas respostas de 23/09 — já corrigimos a classificação de PIS/COFINS monofásico pelo NCM e o
crédito do CST 02 com base nelas. Ficaram 5 pontos em aberto:

**1. Parte B do e-Lalur (M010).** Entendemos que a conta da Parte B é aberta pela empresa. Mas no leiaute da
ECF o M010 também leva o campo **COD_PB_RFB**, preenchido com um código da tabela **PARTEB_PADRAO** da Receita —
é nela que estão 1071, 2210 e 3130. Para cada conta de Parte B que você costuma abrir (prejuízo fiscal a
compensar, base negativa de CSLL, adições/exclusões temporárias), **qual código da PARTEB_PADRAO você usa?**

**2. Contas para encargos e descontos.** Você indicou o tratamento (juros e multa de mora pagos = despesa
financeira; multa punitiva = indedutível; juros recebidos = receita financeira; desconto condicional =
financeiro; incondicional = reduz custo/receita). Precisamos dos **códigos do plano referencial da RFB**
(Lucro Presumido e Lucro Real) para cada uma destas contas:
   a) juros de mora pagos · b) multa de mora paga · c) multa punitiva paga · d) juros recebidos ·
   e) descontos condicionais concedidos · f) descontos condicionais obtidos · g) descontos incondicionais
   concedidos · h) descontos incondicionais obtidos · i) imobilizado (bens em uso e depreciação acumulada).

**3. Serviços (NFS-e).** Para os itens 6.01 / 6.02 / 6.03 da LC 116:
   a) **alíquota de ISS** no município de ______________ (preencher: município do prestador);
   b) **cClassTrib** (Reforma Tributária — IBS/CBS) que você usaria para cada um dos três.

**4. Produto monofásico usado como insumo do serviço.** Ex.: tintura comprada e aplicada no cliente (não
revendida). Você indicou crédito básico de PIS/COFINS nesse caso e mencionou que convém solução de consulta.
**Você aceita que o sistema aplique essa leitura já, sem solução de consulta,** deixando um alerta visível no
item? Ou prefere que, até haver a consulta, o sistema **não** tome o crédito?

**5. Data da NFS-e para o Simples.** Você indicou NFS-e nacional obrigatória para o Simples a partir de
**01/11/2026**. O Ato Conjunto RFB/CGIBS nº 4/2026 (§ 1º do art. 1º) fixa **01/01/2027** para os optantes do
Simples, para todos os documentos do artigo. **Qual norma traz o 01/11/2026?** Se for outra (por exemplo, uma
resolução do CGSN sobre o padrão nacional da NFS-e), entendemos que são obrigações diferentes e que as duas valem —
é isso?

Pode responder item a item, do jeito que for mais fácil.

---

## Critério de aceite interno (não vai no texto)

| Item | Aceite | Trilho que destrava |
|---|---|---|
| 1 | Um código PARTEB_PADRAO por tipo de conta de Parte B, presente na tabela (validada em `LalurDto.ts:239`) | X4 / H1b (2ª passada Lucro Real) |
| 2 | 9 códigos referenciais, cada um existente no catálogo RFB 2025 importado no X2 (1.123 contas) — conferir por consulta, não por olho | F7 (encargo/desconto) + X4 (adição da multa punitiva) + C8 |
| 3a | Alíquota numérica (2%–5%, LC 116 art. 8º/8º-A) + nome do município | D1f · X10b/X10i |
| 3b | 3 códigos cClassTrib que existem na tabela oficial vigente (corpus) | D1f · X10i |
| 4 | Resposta binária (aplica com alerta / não credita) | Fork do ADR [[ITEM-DESTINATION]] (Fase 3.1) |
| 5 | Norma citada com número e dispositivo (ou "é a mesma do Ato 4" ⇒ vale 01/01/2027) | D7 · X10i (prazos) — ADR-INCR-DFE-EMISSAO-PARCEIRO §11.3 |

**Resposta que não cumpre o aceite** (ex.: "mapeio no seu plano" sem código, como em 23/09) → registra
"incompleto" e devolve a pergunta; não vira sign-off (CTD-002).

## O que NÃO estamos pedindo (não re-pedir)

- D8 (declarante/signatários/livro) — fechado 24/09.
- Item LC 116 dos serviços — recebido 23/09 (6.01/6.02/6.03).
- Combustíveis monofásicos — a correspondência NCM veio da Tabela 4.3.10 da EFD-Contribuições (nota do X6).
- XML de NF-e real — sem XML até o 1º cliente (decisão do dono, 26/09); não é pedido ao contador.
- Escopo do pacote ao contador (item 12 da resposta de 23/09) — decisão do dono, não do contador.
