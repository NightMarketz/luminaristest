# Triagem da resposta ao PEDIDO-CONTADOR-2026-10-10 (v3) — 10/10/2026

> Skill `luminaris-contador-liaison`, Phase 3. A resposta veio colada pelo dono no chat em 10/10, com o recado: **"o
> contador disse que o resto é vc que decide"**.
> **[CTD-002]** A resposta é dado externo. Nenhum item vira sign-off, e nenhum gate fecha por ela.

**Em duas linhas:** a resposta confirma 4 pontos de lei e dá um dado útil (a correlação NBS/cClassTrib). Recusa todos os
fatos do cliente e toda a prática do escritório, e não confirma nenhuma das leituras que destravariam decisão. **Risco
principal:** a resposta não tem a forma de uma resposta de contador. Ela diz não conhecer "as rotinas internas do
escritório", que seriam as dele, e usa linguagem de pesquisa ("nesta verificação", "fontes consultadas"). Por isso a
tratamos como **pesquisa de terceiro**, não como palavra do oráculo. O H1, o D1 e o D1f continuam abertos.

## 1. Proveniência (registrar antes de usar)
- As Partes I (fatos do salão) e II (prática do escritório) voltaram **sem resposta**: "ficam sem resposta factual até eu
  conferir os registros e explicar minha própria rotina".
- Sinais de que o texto não é do contador falando da própria prática:
  - diz não ter recebido o plano de contas, quando ele mesmo deveria ser a fonte;
  - diz não conhecer as rotinas do escritório;
  - usa marcas de assistente de pesquisa.
- **Consequência:** confirmações aqui contam como **fonte secundária** (grau "pesquisa de terceiro"). Elas não promovem
  nenhum item a "confirmado pelo contador".
- O pedido continua aberto para as Partes I e II. Elas exigem documentos do cliente e a resposta do contador sobre a
  própria rotina.
- **Ação do dono:** confirmar quem escreveu a resposta. Se foi o contador com ajuda de ferramenta, perguntar se ele assina
  as partes que confirmou.

## 2. Classificação item a item

| Item | Classe | O que veio | Trilho |
|---|---|---|---|
| Msg 1 | **dado** | Já optante que fica no DAS: não faz nova opção pelo Simples nem opção pelo regime regular. Recomenda **verificar no Portal do Simples** se há pendência, exclusão ou evento | **Ação do dono antes de 15/10:** conferir a situação no Portal do Simples (gate humano; o agente não acessa) |
| I-1..I-6 | **fora do pedido / devolvido** | "Devem ser respondidos com documentos e dados da empresa" | Seguem abertos e vêm do cadastro do cliente (onboarding, X13). Não se perguntam de novo ao contador sem documento |
| I-1 / II-1 | **dado** (a conferir na fonte) | Tabela nacional de correlação da NFS-e: 6.01 → NBS 1.2602.10.00 (cabeleireiro) e 1.2602.20.00 (manicure); 6.02 → 1.2602.20.00 / 1.2602.30.00 / 1.2602.90.00; 6.03 → 1.2602.30.00; **cClassTrib 000001** ("tributadas integralmente pelo IBS e CBS"); **indOp 030101** (prestação onerosa presencial). Escolher por serviço real | Default do `serviceFiscalDefaults` do kit, por serviço e editável. **Conferir a tabela oficial antes do PR do kit** (grau: secundária) |
| II-2..II-10 | **devolvido** | Sem resposta factual | Ver §3, D-1 (decisão por delegação) |
| ECD | **confirmação** | O Simples é dispensado da ECD (entrega facultativa), e o gate do sistema pode ser mais rígido que a lei | Reforça o achado §10.2.1 do documento de perguntas (gate da ECD); decisão do dono |
| III-1 | **crítica** | **Não confirma** "sem ISS/NFS-e" no vencido; recomenda consulta formal à SF/SP | §3, D-2: mantém o F-PV-9 (b) e abre consulta formal |
| III-2 | não confirmado | Exige contrato e redação integral da Res. 190 | §3, D-2 |
| III-3 | (a) não confirmado · (b) **confirmação parcial** | A LC 214 dá suporte ao cancelamento do débito antecipado | (b) entra no PRE-ADR IBS/CBS |
| III-4 | **confirmação** com ressalva | 5% e códigos nacionais conferem; retenção "depende do caso", não é absoluta | §3, D-3 |
| III-5 | **não confirmado** | Há base para desconto do contribuinte individual, mas não universaliza 11%/dia 20/sem CPP/eSocial | F-PES-6: parceiro PF segue bloqueado até L-PES-1 |
| III-6 | confirmação parcial | MEI e ME têm tratamento diferente; o parceiro com CNPJ emite pela própria cota | PRE-ADR pessoal (F-PES-6) |
| III-7 | confirmação parcial | 16% só no IRPJ, CSLL a 32%: **confirma**. Esteticista, estouro e ano de início: não confirma | §3, D-4 |
| III-8 | **confirmação** | Retém IRRF 1,5% salvo prestador do Simples (IN 765) e dispensa por valor mínimo | Regra do AP (futuro BRIEF de retenções); achado do AP bruto × líquido |
| III-9 | **confirmação** | PER/DCOMP de saldo negativo só depois da ECF (IN RFB 2.055) | Aviso no fluxo de caixa (X7) |
| III-10 | confirmação parcial | **CST 02 não é exclusivo de monofásico: confirma.** Monofásico como insumo: não confirma | §3, D-5 |
| III-11 | não confirmado | (a) a transição do caixa é controvertida; (c) a Res. 190 inclui juros e multas no §4º VI, e a pesquisa já registrava a tensão com o §5º II | §3, D-6 |
| III-12 | **dado** (recomendação) | Pró-labore compatível com o trabalho, lucros documentados, **alerta de ausência**, sem mínimo automático | §3, D-7 |
| III-13 | (a) não concluído · (b) **dado** | (a) não aceita ser indicado sem consentimento. (b) LC 214: desfeito **depois** do fornecimento é devolução; **antes**, é cancelamento | (b) entra no PRE-ADR IBS/CBS e no X11 |
| III-14 | não confirmado | Exige cálculo e texto completo | Fica para o oráculo (1ª importação no MIT, PVA); baixa relevância (receita acima de R$ 5 mi) |

## 3. Decisões por delegação ("o resto é vc que decide")

**Critério:**
- Só entra o que **não reverte decisão ratificada** pelo dono.
- Na dúvida, o produto fica com o comportamento que **não reduz imposto** e deixa configurável.
- Fork que mudaria decisão ratificada vai ao dono.
- Precedente de decisão por delegação: F-EM-7 e FLAG-3.2-A..D, de 02/10.
- Nenhuma decisão aqui escreve código. Cada uma entra no BRIEF do nó quando ele for executado, com "executa" do dono.

| # | Decisão | Base | Reversível por |
|---|---|---|---|
| **D-1** | Os **códigos referenciais** (II-2 da 3.4, II-3, II-4) e as **contas** (II-5..II-7) passam a ser propostos pelo agente a partir do catálogo RFB 2025 importado (X2). Em cada código, preferir a conta mais específica e analítica, e registrar como "delegação do contador via dono, 10/10". **Fica pendente** até o dono ratificar esta delegação (ver §5), porque mexe no H1 | catálogo X2; Manual ECD item 1.17 | revisão do contador quando houver |
| **D-2** | **Pacote vencido:** **mantém o F-PV-9 (b)** (NFS-e no vencimento, com ISS). Para o Simples, mantém o vencido como receita no mês do vencimento. A tese "sem ISS" vira **consulta formal à SF/SP** (advogado, Lei SP 14.107 arts. 73–78). Só se a consulta disser "sem ISS" o fork volta ao dono | o contador não confirmou a tese; o conservador é tributar | resposta da SF |
| **D-3** | ISS em SP: alíquota padrão de 5% para 6.01–6.03 (fora do Simples). **Retenção configurável por nota** (default sem retenção), sem afirmar "nenhum tomador retém" | Lei SP 13.701 art. 16 IV; ressalva do terceiro | lei municipal nova |
| **D-4** | **16%:** só IRPJ (CSLL a 32%), opção do contribuinte. **Bloqueado por padrão quando o tenant tem serviço 6.02 de esteticista** (conservador; Lei 13.643/2018), com desbloqueio explícito pelo usuário. No **ano de início**, limite de R$ 120 mil **proporcional aos meses** (conservador, porque a lei é silente). **Estouro:** recolher a diferença postergada dos trimestres anteriores (já previsto no P-B6) | Lei 9.250 art. 40; IN 1.700 arts. 33 e 215 | Solução de Consulta Cosit |
| **D-5** | **Monofásico como insumo:** mantém o **F-ID-4 em (c), sem crédito** (conservador), com a leitura da IN 2.121 art. 160/534 registrada como tese. CST 02 recebe a regra geral com aviso | o terceiro não confirmou; a CBS substitui em 2027 (vida curta) | consulta à RFB, se o cliente quiser |
| **D-6** | **Virada de 2027 no Simples:** (a) a inclusão dos valores a receber de 2026 **não é automatizada**: alerta e lançamento manual em dez/2026. (c) Juros e multas de mora em 2027: **não automatizar a exclusão**; o produto mostra a tensão §4º VI × §5º II da Res. 190 e pede a classificação a quem lança | texto ambíguo; o terceiro não confirmou | regulamentação ou manual do PGDAS-D 2027 |
| **D-7** | **Pró-labore:** **alerta de ausência** (sem mínimo automático) mais registro separado de distribuição de lucros. Entra no PRE-ADR pessoal como recomendação do F-PES-7 | recomendação do terceiro + Lei 8.212 art. 12 V f | — |
| **D-8** | **IRRF como tomador:** reter 1,5% (RIR art. 714) salvo prestador do Simples (IN 765) ou IR até R$ 10. Vai para o BRIEF de retenções no AP (achado: hoje o AP registra o bruto como líquido) | confirmado pelo terceiro e pela pesquisa | — |
| **D-9** | **Saldo negativo:** aviso de que o PER/DCOMP só é aceito depois da ECF (IN 2.055), no fluxo de caixa projetado | confirmado | — |
| **D-10** | **Devolução × cancelamento (IBS/CBS):** antes do fornecimento é cancelamento; depois, devolução (LC 214). Entra no PRE-ADR IBS/CBS e no X11 | dado | — |

## 4. O que segue aberto
- **Do cliente** (cadastro e documentos): serviços reais e se há esteticista, contrato de parceria e natureza dos
  parceiros, empregados, caixa × competência em 2026, laudo e turnos, norma contábil.
- **Do contador**, só se ele quiser revisar o que o agente propôs em D-1: códigos e contas.
- **Consulta formal à SF/SP** sobre o pacote vencido (advogado).
- **Oráculos:** PVA (H1), 1ª importação no MIT (III-14 c), DAS real (Simples).
- **Ação do dono antes de 15/10:** conferir no Portal do Simples se há pendência ou exclusão.

## 4.1 Jurisprudência (10/10, depois da ratificação)
Ver [`pesquisa-juris-2026-10-10/README.md`](pesquisa-juris-2026-10-10/README.md):
- **Reforçam:** D-2 (SC SF/DEJUG 11/2020 item 9.4.1), D-7 e F-ADN-1 (TJSP: o titular responde pelas notas do terceiro).
- **Refina:** D-4 (o impedimento do 16% atinge a PJ inteira).
- **Mudam a base:** D-5 (SC Cosit 496/2017: o insumo monofásico dá crédito) e D-6 (c) (SC Cosit 59/2026: juros e multa de
  mora entram em 2027).
- **D-5 e D-6 voltam ao dono.** **RATIFICADO (dono, chat, 10/10, questionário):**
  - **D-5 → "Configurável por cliente".** Padrão: sem crédito. O contador do cliente liga o crédito do insumo monofásico
    pela SC Cosit 496/2017.
  - **D-6 (c) → "Incluir com alerta".** A partir de 2027, juros e multa de mora entram na receita bruta do Simples
    (SC Cosit 59/2026), com alerta da tensão §4º VI × §5º II da Res. 190.

## 5. RATIFICAÇÃO (dono, chat, 10/10, questionário)
- **D-1:** "Sim, proponha". O agente propõe os códigos referenciais e as contas pelo catálogo, como delegação do contador.
- **D-2..D-10:** "Aceito todas".
- **Gate da ECD:** "Manter o gate e mapear". O gate de cobertura não muda; a 3.4 entra pelo mapeamento do D-1.
- **Proveniência:** "O contador, com ferramenta". As confirmações (III-4, III-7a, III-8, III-9, III-10 CST 02) são dele,
  **ainda sem assinatura**. Pedir ao contador que assine essas partes.

### Perguntas originais

1. **D-1:** o agente propõe os códigos referenciais e as contas pelo catálogo, sob delegação do contador? Isso destrava o
   H1 sem esperar o contador.
2. **D-2..D-10:** aceita as decisões conservadoras acima?
3. **Gate de cobertura da ECD** (achado §10.2.1): afrouxar só na ECD, porque o mapeamento é facultativo pela lei?
4. **Proveniência:** quem escreveu a resposta? O contador assina as confirmações (III-4, III-7a, III-8, III-9, III-10
   CST 02)?
