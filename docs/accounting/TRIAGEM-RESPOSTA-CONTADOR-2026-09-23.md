# Triagem da resposta do contador — 2026-09-23

> Resposta ao `PEDIDO-CONTADOR-2026-09-03.md` (itens 0–13, incluindo a EMENDA de 15/09), recebida pelo dono e colada
> no chat em 23/09. Triagem feita com a skill `luminaris-contador-liaison`. **[CTD-002] Esta resposta não fecha
> gate nenhum.** Cada item vira artefato checável no trilho dele. As classes são: **dado**, **crítica** (achado de
> domínio → ADR/emenda), **confirma** (T5: nada muda) e **fora do pedido** (decisão do dono).
> Grau de cada afirmação do contador, na palavra dele: **conferido** (hoje), **lembrado** (de memória) ou
> **não verificado**.

## Resumo executivo

- **Item 0 (premissa F-Z0/Z0-a):** o contador **assina, sob condições**. As condições viram requisitos de produto
  e **não estão modeladas hoje**: aprovador com CRC por parâmetro de política, trava de período que só o contador
  reabre, e proibição de a equipe do fornecedor alterar parâmetro contábil. **Decisão do dono.**
- **3 críticas contra o código em `main`** (conferidas por leitura):
  - C-1: CST de sem-crédito decide antes do NCM.
  - C-2: faltam na lista de monofásicos as bebidas frias (Lei 13.097) e os combustíveis.
  - C-3: CST 02 com NCM comum fica sem crédito, e o contador toma o crédito pela alíquota básica.
- **13(c) — o contador está incompleto, o pedido estava certo** (verificado): 1071/2210/3130 ficam na aba
  **`PARTEB_PADRAO`** de `ecf-l12-linhas.json` (a aba começa na linha 6609; o 1071 está na 6765). É o universo do campo
  `M010.COD_PB_RFB`, já validado em `LalurDto.ts:239`. A conta da Parte B é aberta pela empresa, como ele diz, mas
  aponta para um código da tabela da RFB. A pergunta segue de pé: qual dos três ele usa. *(Correção de 23/09: a
  1ª versão desta triagem chamou isto de "crítica contra o nosso pedido"; foi erro de leitura do agente.)*
- **Requisitos novos, fora do que a fila prevê:**
  - destinação por item na entrada (revenda × insumo do serviço);
  - amortização de benfeitoria em imóvel alugado;
  - NFC-e modelo 65;
  - multa de mora × multa punitiva;
  - desconto condicional × incondicional;
  - itens novos no pacote do contador;
  - modo de fixture que pule a assinatura XML;
  - estimativa mensal com balancete de suspensão/redução.
- **O que continua aberto no D1:**
  - códigos do plano referencial: ele diz "mapeio no seu plano" e não mandou;
  - dados do declarante/signatários (**D8**: não respondido);
  - alíquota de ISS (depende do município);
  - `cClassTrib` (não respondido);
  - XMLs (ele recomenda o da própria empresa, que é o **D2**).

## Tabela de triagem

| # | Item da resposta | Classe | Grau (contador) | Trilho / quem executa |
|---|---|---|---|---|
| P1 | IPI não recuperável fora da base do crédito de PIS/COFINS (STJ Tema 1.373, operações após 20/12/2022) — regra fixa, não parâmetro | **crítica** (vs. 7b do pedido, que tratava como posição) | conferido | Emenda X6: IPI fora da base, fixo. Checagem: teste do `nfeCost` com vIPI > 0 → base sem IPI. `sessao-correcao` com autorização do dono |
| P2 | DeRE não se aplica a salão | **confirma**, retira escopo | conferido | Registrar em M5-ibs-cbs: DeRE fora. Nada a codar |
| P3 | Venda no balcão para PF = NFC-e 65, não NF-e 55 | **fora do pedido**, requisito novo | lembrado | Decisão do dono: entra no X10a (adaptador por tipo de documento) e no critério do D5 (parceiro emissor precisa emitir NFC-e) |
| P4 | Mesma tintura: revenda = monofásico/ST sem crédito; insumo do serviço = crédito básico, ICMS uso e consumo. Destinação por item na entrada | **crítica** + requisito novo | lembrado (não verificado: "convém solução de consulta") | ADR necessário (destinação por item na entrada da NF-e; afeta X6 e estoque). Antes do ADR: dono decide se aceita a leitura "monofásico como insumo dá crédito" sem solução de consulta |
| P5 | Monofásico se decide pelo **NCM**; CST divergente só gera alerta | **crítica C-1** | lembrado | Código: `classifyPisCofinsItem` (`models/pisCofinsMonofasicoNcm.ts:119-124`) testa o CST **antes** do NCM. CST 04..09 com NCM fora da lista → MONOFASICO. NCM monofásico com CST 01 já sai MONOFASICO (ok). GAP-MAP novo → `sessao-instrumentacao` → `sessao-correcao` |
| P6 | Reforma de ponto alugado = amortização pelo prazo do contrato, se menor que a vida útil | **crítica** (C8 não modela amortização) | lembrado | Emenda/ADR do C8: classe "benfeitoria em imóvel de terceiro" com prazo = min(contrato, vida útil). Dono decide se entra no C8 ou vira nó novo |
| P7 | Simples: NFS-e nacional obrigatória a partir de 01/11/2026; IBS/CBS no Simples só em 2027; ISS no DAS | **crítica** (vs. 5e, que supunha facultativa) | conferido | Registrar em D1f/X10i: sem modo facultativo. Nada a codar agora (emissão bloqueada por D5/M2) |
| P8 | Revenda de salão gera pouco crédito; o crédito vem de insumo, aluguel e energia | **fora do pedido** (expectativa de produto) | opinião profissional | Dono: calibrar a tese do produto. Aluguel/energia como base de crédito = requisito do X7/X8 |
| 0 | Assina sob condições: contrato; ele controla políticas (plano, mapeamento, taxas, posições); mudança de parâmetro com aprovação registrada; lançamento fechado imutável (estorno); trava de período só ele reabre; lançamento aponta documento de origem | **dado** (fecha a pergunta do Z0-a) + requisitos | opinião profissional | Z0-a: respondido → fold. Requisitos novos (aprovador CRC, trava reaberta só pelo contador, bloqueio do fornecedor) → BRIEF novo, decisão do dono. Imutabilidade/estorno e vínculo ao documento de origem já existem (ACC-*, SourceDocument), mas precisam de conferência |
| 0 | Linha software × serviço contábil: defaults = sugestão; aprovador com CRC; fornecedor nunca altera parâmetro; vender "com contador" exige organização contábil registrada; sugere consulta ao CRC-SP | **fora do pedido** (jurídico/negócio) | "leitura, não parecer" | Dono decide sobre a consulta ao CRC-SP |
| 1/10 | Tabela de obrigações: IRPJ/CSLL (estimativa mensal ou trimestral por cliente), EFD-Contribuições, EFD ICMS/IPI, ISS, DCTFWeb, eSocial/Reinf, Bloco H, ECD, ECF | **dado** → insumo do **X7** (ADR) | lembrado; prazos pela agenda | Destrava a abertura do ADR do X7 (F-M2: "só ADR"). Novidade: **estimativa mensal com balancete de suspensão/redução** vs. F-M8 (trimestral) → dono decide se reabre o F-M8 |
| 1/10 | Pendências que o próprio contador pede para conferir: DIRF extinta, DCTFWeb absorvendo tributos federais em 2025, GIA-SP/SAT | **dado não verificado** | lembrado | Conferir no corpus/fonte oficial antes do ADR X7 (agente pode verificar) |
| 1 | Reforma 2026: CST/cClassTrib; NBS na NFS-e; NF-e antecipada para 01/12/2026 para não contribuinte de ICMS que movimenta bens | **dado** | conferido em parte | D1f/X10i: NBS vira campo; o prazo de 01/12/2026 entra no D7/X10i |
| 2a/7a | ICMS com IE e saída tributada = crédito, fora do custo; ST sem crédito, ST no custo; ICMS fora da base de PIS/COFINS (Lei 14.592) | **confirma** (X6) + ST no custo | lembrado | Conferir se o X6 soma o ST ao custo (vICMSST); se não somar → crítica. Agente verifica |
| 2b/7b | IPI fora da base | = P1 | | |
| 2c/7c | Simples: ICMS só com pCredSN/vCredICMSSN (CSOSN 101/201); PIS/COFINS crédito integral (ADI 15/2007) — ele toma | **dado** → decide o default conservador atual | lembrado | Hoje `nfeCost.ts:111` zera o crédito de fornecedor do Simples. O parâmetro por cliente passa a ter posição do contador. Dono autoriza a mudança do default |
| 7d | Monofásicos: incluir bebidas frias (Lei 13.097) e combustíveis; capítulo 33 já coberto | **crítica C-2** | lembrado | Transcrever as leis (regra `tabela-transcrita-de-lei`: redação vigente) e ampliar a tabela. Cadeia instrumentação → correção |
| 8 | CST 02 com NCM fora das listas e saída tributada → crédito pela alíquota básica sobre o valor sem ICMS e sem IPI; alerta mantido | **crítica C-3** | lembrado | `pisCofinsMonofasicoNcm.ts:133-134` deixa sem crédito "até confirmação do contador". Confirmação chegou → correção com alerta mantido |
| 3 | XML: prefira o da própria empresa; peça também um com ST e um com CST 04 | **dado** (reforça D2/E9) | — | D2 segue aberto (dono). Critério do E9 ganha 2 casos |
| 3 | Assinatura fictícia não valida; precisa de modo fixture que pule a verificação, obrigatória em produção | **crítica / requisito** | técnico | Verificar se o parser de NF-e verifica assinatura hoje. Se não verifica, a crítica inverte: **produção não valida assinatura** → GAP-MAP |
| 5a | LC 116: 6.01 cabelo/manicure/barbearia; 6.02 estética/depilação; 6.03 massagem; ISS no estabelecimento prestador (art. 3º caput) | **dado** → D1f | lembrado | Fecha a parte "item LC 116" do D1f. A alíquota segue aberta (município) |
| 5b | 6.x fora da retenção nacional (art. 6º); lei municipal pode criar; fora da 1ª versão | **confirma** | lembrado | — |
| 5c | Pacote pré-pago: ISS na prestação; recebimento = adiantamento de cliente (passivo); receita na prestação; conferir art. 10 da LC 214 para 2027 | **confirma** + dado contábil | lembrado; art. 10 não verificado | Conferir se o pacote pré-pago lança em passivo. Art. 10 da LC 214 → agente verifica no corpus |
| 5d | IBS/CBS 2026: destaque sem escrituração; controle **extracontábil** para conciliação | **confirma** + requisito menor | lembrado | Requisito: relatório extracontábil IBS/CBS (M5-ibs-cbs) |
| 5e | Simples obrigatório em 01/11/2026 | = P7 | conferido | |
| 5f | Competência × emissão; multa municipal; PNCT exige corrigir até 31/12/2026 e manter contador responsável; **bloquear fechamento do mês com prestação sem nota** | **dado** + requisito | conferido (PNCT) | Requisito novo para D7/X10i: gate de fechamento por prestação sem NFS-e |
| 6 | Juros/multa de mora pagos = despesa financeira dedutível; multa punitiva = indedutível (adição no e-Lalur); recebidos = receita financeira (0,65% + 4%, Decreto 8.426/2015); desconto condicional = financeiro, incondicional = reduz custo/receita, cada um com conta própria | **dado** → F7 (encargo/desconto) + X4 | lembrado | Destrava a pendência de encargo/desconto do F7. Contas: "mapeio no seu plano" → códigos **não vieram**. Distinguir multa de mora × punitiva = requisito novo |
| 9 | Não dá código de linha; lista rubricas típicas de adição/exclusão; compensação de prejuízo limitada a 30% | **dado parcial** → X12 | lembrado | X12: as rubricas servem de filtro inicial; os códigos saem do `ecf-l12-linhas.json`, mapeados pelo agente e conferidos pelo contador |
| 11 | Prefere login próprio (leitura total + achados + aprovação de parâmetros), mas precisa do pacote TXT para assinar no PVA | **dado** → C11/FE-INCR-REVIEW | — | Confirma o C11 (revisão dentro do sistema) + C6b (pacote). Aprovação de parâmetros = requisito novo (ver item 0) |
| 12 | Acrescentar ao pacote: memória de cálculo IRPJ/CSLL/PIS/COFINS; créditos por nota e item com a regra; aging conciliado; ficha individual do imobilizado; inventário; conciliação apurado × contabilizado × pago; XLSX para ele, CSV para importação | **dado** → C6b / FE-INCR-DELIVERY | — | Emenda do C6b (hoje só CSV). Dono decide o escopo; parte depende de X7 |
| 13a | Anexo III: 10% / 20% / 4% / terreno 0; até R$1.200 direto na despesa; contábil = fiscal por padrão | **confirma** (C8) + 1 dado | lembrado | Conferir se o C8 tem o limite de R$1.200 para despesa direta. Se não tiver → requisito |
| 13b | Códigos do referencial: "mapeio no seu plano" | **não respondido** | — | Segue aberto em D1 |
| 13c | 1071/2210/3130 não são contas da Parte B; M010 é aberto pela empresa | **dado incompleto do contador** | lembrado | O M010 é aberto pela empresa **e** leva `COD_PB_RFB` da aba `PARTEB_PADRAO`, onde estão 1071/2210/3130 (verificado). Devolver a pergunta com essa explicação |
| 13d | CIAP fora; ICMS no custo do bem | **confirma** (C8) | lembrado | — |
| 13e | Depreciação acelerada por turnos fora | **confirma** | — | — |

## Próximos trilhos (nenhum roda sem autorização citável — ORCH-006)

1. **Instrumentação das críticas C-1/C-2/C-3 (PIS/COFINS)** → GAP-MAP + `sessao-instrumentacao` → `sessao-correcao`.
2. **ADR de destinação por item (P4)** e **amortização de benfeitoria (P6)** → `sessao-planejamento` (BRIEF com forks
   pendentes).
3. **ADR do X7 destravado** (itens 1/10; "só ADR" pelo F-M2). O F-M8 (trimestral) entra em conflito com a preferência
   do contador pela estimativa mensal.
4. **Requisitos de governança do item 0** → BRIEF (aprovador com CRC, trava de período, bloqueio do fornecedor).
5. **Verificações baratas** que o agente pode fazer:
   - DIRF, DCTFWeb e GIA/SAT;
   - art. 10 da LC 214;
   - ST no custo do X6;
   - assinatura XML no parser;
   - limite de R$1.200 no C8.
6. **Ainda pedir ao contador:**
   - códigos do referencial (itens 6/13b);
   - declarante/signatários (D8);
   - `cClassTrib`;
   - alíquota de ISS quando houver município.
