# Dossiê de decisões — 29/09/2026 (âncora para a entrevista)

> Pesquisa pedida pelo dono em chat, 29/09: *"Pesquisa a fundo para ancorar as decisões que vamos tomar antes de
> entrevistar"*. **Não ratifica nada** e **não autoriza código** (ORCH-006). Base: `origin/main` = `7c050670`.
> Fontes: 5 frentes de pesquisa (3 de código, só leitura; 2 de fonte oficial, lidas em 29/09), mais uma amostra de
> cada frente conferida de novo pela sessão principal. Grau: **V** = verificado (lido no código ou na fonte
> oficial) · **I** = inferido · **NV** = não verificado.
>
> Ordem: urgência primeiro, depois o que só integra trabalho pronto, depois por domínio. Cada decisão diz **quem
> decide**. "Delegável" significa que o dono já delegou decisões desse tipo ("pode decidir tudo", 28/09); mesmo
> assim vão na entrevista, com recomendação.

---

## 0. Urgente (data legal)

### U1 — Opção do Simples pelo regime regular de IBS/CBS: a janela fecha **amanhã, 30/09**
- **Fato (V):** notícia do CGSN de 17/04/2026 (www8.receita.fazenda.gov.br/simplesnacional, id `c739e03c…`).
  A escolha é feita em setembro de 2026 e vale de jan a jun de 2027. Há nova oportunidade em março de 2027 para o 2º
  semestre.
- **Se ninguém escolher (I):** o IBS/CBS continua dentro do DAS. A notícia não diz isso; é inferência.
- **Quem decide:** o dono e o contador. Não é decisão de software, e só importa se o 1º cliente for do Simples.

### U2 — Quem é o 1º cliente: município, regime e inscrição estadual
Essas três respostas mudam a prioridade de metade da fila.

| Se… | Então… | Fonte |
|---|---|---|
| Regime normal (Presumido/Real) em município com sistema próprio de NFS-e (ex.: SP capital → NFS-e Paulistana) | A nota **não** sai no portal nacional. O modo manual do DFE-MANUAL e a tela FE-INCR-DFE **não servem** a esse cliente; o caminho é o parceiro (Focus, emissão municipal) | P&R NFS-e v1.00 (08/09/2026), perguntas 1.2 e 5.3; prefeitura de SP, 15/12/2025 (V) |
| Simples Nacional | Emissor Nacional (web ou API) é **obrigatório e exclusivo** a partir de **01/11/2026** (Res. CGSN 191/2026, art. 3º I). Campos de IBS/CBS a partir de **01/01/2027** (Ato 4 § 1º). As duas datas valem, em cronogramas independentes (P&R 20.4). A FE-INCR-DFE passa a ser o caminho legal | V |
| Salão com IE que vende produto no balcão em SP | NFC-e 65: o CF-e-SAT está vedado desde **01/01/2026** (Portaria SRE 79/2024, art. 34-D). O X10a vira obrigação **atual**, não da onda 3 | V |
| Salão sem IE | Não emite NFC-e. A NF-e 55 só é exigida quando movimenta bem, a partir de **01/12/2026** (Ato 4 § 4º; NT 2026.007) | § 4º V; efeito no salão I |
| Regime normal, qualquer município | Os campos de IBS/CBS na NFS-e valem desde **01/10/2026**, mas a nota sem eles não é rejeitada até 31/12/2026: fica "em desconformidade" (CGNFS-e, 07/08/2026) | V |

- **Quem decide:** o dono (é fato do cliente). Vira insumo do D1f e do D5.

---

## 1. Integrar trabalho pronto e não commitado (`sessao-integracao`)

As duas "sessões fantasma" da 2ª varredura **existem**. O trabalho está pronto e sem commit em worktrees.

### D-1 — Seletor de unidade da Contabilidade (worktree `exciting-bun-b8f404`)
- **Situação (V):**
  - O diff tem 3 linhas em `useAccountingData.ts`, mais o teste-guarda `useAccountingData.unitsTable.test.ts` e a linha no GAP-MAP.
  - Foi autorizado em 28/09 pelo questionário ("Registra, instrumenta e corrige").
  - `git apply --check` sobre `main` passa limpo.
  - O cache do vitest mostra 61/61 depois da correção.
  - O vermelho antes da correção não é mais verificável (NV).
- **Por que importa:** a ordem de 28/09 exige essa correção **antes** do SEED-UNITS → H1.
- **Recomendação:** integrar já, num PR próprio.
- **Quem decide:** o dono ("pode integrar").

### D-2 — CRM Porte/Papel na conversão de lead (worktree `elegant-tharp-e03e84`)
- **Situação (V):**
  - Cumpre o checklist dos 2 BRIEFs (T-1..T-3, C-1..C-6, achados 1–7).
  - Aplica limpo em 14 de 15 arquivos; o GAP-MAP pede resolução mecânica.
  - O front está verde (cache do vitest 62/62). O backend foi rodado, mas não há artefato (NV).
- **Fora dos BRIEFs:**
  - **`GenericFilterBar`/`GenericRow`/`GenericTable`:** passam a filtrar por campo select em **toda** tela GenericTabbedView. A única autorização citada está dentro da própria linha do GAP-MAP ("Registrar e corrigir", NV).
  - **`server/test/helpers/db.ts` e mais 3 testes:** truncam o banco em vez de apagá-lo. O diagnóstico **contradiz** o #424, que já está em `main` (lá a causa era o client desconectado; 90/90, 776/776).
- **Opções:**
  - (a) integrar tudo;
  - (b) PR do CRM + GAP-MAP agora, e os Generic* e o `db.ts` cada um em PR próprio, com evidência;
  - (c) só o CRM, descartando o resto.
- **Recomendação:** **(b)**. O `db.ts` só entra se o EBUSY voltar em `main` com o #424.
- **Quem decide:** o dono.

---

## 2. Régua — a dúvida D-2 (X10a / X11 / X12)

O fold de 18/09 ("materializaram dentro do X10b") cita forks que tratam de outra coisa. O F-DFE-12 é o webhook, não
eventos (`BE-INCR-DFE-brief.md:652`, V). Resultado por nó:

| Nó | Estado real | Recomendação |
|---|---|---|
| **X11** eventos com prazo | **Aberto.** Só o cancelamento e101101, **sem calcular janela**: o 409 depende de um `OUT_OF_WINDOW` que nenhum adaptador devolve. Não há substituição e105102 nem eventos da NF-e (V) | Manter aberto. Escopo: substituição da NFS-e, mais o prazo vindo do parceiro (X10i); eventos da NF-e/NFC-e vão com o X10a |
| **X10a** adaptador por tipo | **Aberto.** A seleção lê `DFE_PARTNER` e ignora o `kind` (`selectDfeEmissor.ts:23-43`, V). Não há `NFCE`, `ProductFiscalProfile`, inutilização de numeração nem transcrição do modelo 65. O "por documento" do #405 é base reaproveitável | Manter aberto. BRIEF depois do D5, com prioridade conforme a U2 (em SP é obrigação atual) |
| **X12** catálogo de adições/exclusões | **Materializado em grande parte** pelo X4 e pelo FE-LALUR: fixture oficial da L12, com 374 linhas E no M300A, 342 no M350A, PARTEB_PADRAO etc., sha conferido (V). Faltam: vínculo com a IN 1.700 (lista não exaustiva), variantes R/B/C (outros tipos de PJ, I) e ajuste automático | Fechar com nota. O ajuste automático já é a emenda 3.3 (D-11) |

- **Quem decide:** o dono. Muda o denominador fiscal: com X10a e X11 abertos e X12 fechado, a régua fiscal fica 13/20 (I).

---

## 3. Financeiro

### D-3 — F5/F6 com o Mercado Pago (o dono decidiu "MP agora" em 26/09; as notas ainda falam de CNAB)

| Capacidade | O MP faz? | Fonte (developers MP, lida em 29/09) |
|---|---|---|
| Cobrança por boleto e Pix na conta do cliente | **Sim**, OAuth por vendedor (token 180 dias, refresh de 6 meses) | V |
| Webhook assinado | **Sim**, HMAC-SHA256 no `x-signature`; retentativa a cada 15 min; sem janela de replay (o Luminaris cria a sua) | V |
| Relatórios de conciliação (liberação e settlement) | **Sim**, por API, CSV/XLSX. **Fuso padrão GMT-04** (classe de bug date-only). Em conta de teste o relatório sai vazio | V |
| Registro bancário, protesto, juros/multa no boleto, vencimento acima de 30 dias | **Não**. Boleto pago depois do vencimento é estornado | V |
| Pix de saída (Payouts) | **Existe**, mas a produção exige chave ed25519 aprovada pelo time do MP, e não há OAuth documentado para operar em nome de terceiro | existência V; liberação para lojista comum NV |

- **Opções:**
  - (a) re-escopar o F5 como "cobrança por provedor de pagamento", com o MP como 1º adaptador e o CNAB depois; o F6 fica bloqueado por um gate externo novo (liberação do Payouts pelo MP);
  - (b) nó novo "MP", mantendo F5/F6 bancários;
  - (c) F5 e F6 inteiros no MP.
- **Recomendação:** **(a)**. O token por cliente exige **cifra em repouso**, que é pré-requisito do M2.
- **Autorização existente:** F-M3, "só ADR".
- **Quem decide:** o dono.

---

## 4. Fiscal e tributos

### D-4 — V4 FECHADA (V, fonte oficial)
- **DIRF:** extinta para fatos a partir de 01/01/2025 (IN RFB 2.181/2024). Vai para Reinf R-4000, eSocial S-1210 e S-2501.
- **DCTF mensal → DCTFWeb + MIT:** vale desde a competência de jan/2025 (IN RFB 2.237/2024, arts. 8º e 9º; prazo até o último dia útil do mês seguinte). O Simples não informa o que está no DAS.
- **GIA-SP:** dispensada desde 01/01/2026 (Portaria SRE 2/2025).
- **Consequência:** o X9 passa a ser só "DCTFWeb + MIT". Nenhum nó para DIRF nem GIA.
- **Aresta desatualizada:** a dependência X7 → D1 está velha. A tabela de obrigações chegou em 23/09 e a triagem já dizia "destrava a abertura do ADR do X7" (V). **Delegável:** corrigir o `depende_de`.

### D-5 — F-X7-1: reabrir o F-M8 (estimativa mensal além do trimestral)?
- **Lei (V):**
  - No Lucro Real, a opção anual com estimativa e balancete de suspensão/redução é **irretratável por ano**, por PJ, e é feita pelo pagamento de janeiro (Lei 9.430 arts. 1º–3º; Lei 8.981 art. 35; RIR 217–229; IN 1.700 arts. 47–54).
  - No Presumido, só trimestral.
- **Código (V):** o trimestral está fixo em cerca de 10 lugares, incluindo `SpedEcfRealDto.ts:46` `formaApur: z.enum(['T'])`. **Não há motor de cálculo nem para o trimestral.** O Manual da ECF L12 já prevê FORMA_APUR=A, A01..A12, MES_BAL_RED e N620/N660.
- **Recomendação:** **(a)**, reabrir no **ADR** (desenho, sem custo de código). A implementação vem em fases: motor trimestral primeiro, estimativa depois.
- **Insumo novo para o X7 (V):** LC 224/2025, art. 4º § 4º VII — no Presumido, a presunção sobe 10% sobre a receita acima de R$ 5 milhões por ano, desde 01/01/2026 para o IRPJ. O efeito na CSLL é NV.
- **Quem decide:** o dono.

> **Errata (29/09, sessão do ADR do X7, PR #446 — fontes primárias no ADR §3/§15):**
> - **D-4:** o prazo da DCTFWeb é o **art. 6º** da IN 2.237 (os arts. 8º–9º são tributos e MIT). A DIRF foi
>   "substituída" (IN 2.181 art. 1º).
> - **D-5:** a LC 224 põe o limite de R$ 5 mi no **§ 5º** do art. 4º, com rateio. Pela IN 2.305/2025 (red. 2.306/2026),
>   o efeito na CSLL começa em **01/04/2026** (era NV). A estimativa do Real não é atingida.
> - **D-5, Manual ECF L12 (jul/2026):** `MES_BAL_RED` tem 12 posições `[0;E;B]` (p.74); o período anual é `A00`
>   (p.128); o `E` de `FORMA_TRIB_PER` só vale no caso REFIS (p.73).
> - **Nota de grau:** as leis de D-5 (Lei 9.430, 8.981, RIR) foram relidas no Planalto e confirmam o texto acima.

### D-6 — Follow-up ao contador: de 5 perguntas para 3, mais 4 fatos do cliente
Quatro das perguntas do rascunho de 26/09 (`PEDIDO-CONTADOR-2026-09-23-followup.md`) a lei responde:

| Pergunta | O que a pesquisa achou | Vira |
|---|---|---|
| 1. COD_PB_RFB do M010 | Na planilha oficial L12, 1071/2210/3130 são todos "depreciação contábil × fiscal". 1071 = contábil maior que a fiscal; 2210 = fiscal maior (RIR 321); **3130 = petróleo e gás, nunca para o salão** (V; o sentido dos blocos é I) | Confirmação: "1071 e 2210, conforme o sentido?" |
| 2. Códigos do referencial | Não achado | Mantém |
| 3b. cClassTrib 6.01/6.02/6.03 | Tabela oficial da SVRS (164 códigos, 22/06/2026) → **CST 000 / cClassTrib 000001**, sem redução (a tabela é V; o mapeamento é I, por falta de regime específico) | Confirmação: "000001?" |
| 4. Monofásico usado como insumo | A RFB **nega** o crédito na compra a alíquota zero, ou seja, comprada do revendedor (IN 2.121 art. 160 I; SC SRRF04 4.024/2021; Lei 10.147 art. 2º). Comprada do fabricante ou importador, dá crédito (V; a aplicação ao salão é I) | Pergunta reformulada, citando a norma |
| 5. Data do Simples | **Respondida:** as duas datas valem (ver U2) | Sai |
| **novas** | Município · regime · IE · opção de IBS/CBS no Simples (U1) | Entram |

- **Recomendação:** enviar a versão reduzida **hoje**, por causa da U1.
- **Quem decide:** o dono envia. A skill `luminaris-contador-liaison` só rascunha.

### D-7 — Qual PRE-ADR da onda 3 abrir primeiro
- **Lei (V):**
  - LC 214: em 2026, CBS 0,9% e IBS 0,1%, com recolhimento dispensado para quem cumpre as obrigações acessórias (art. 348 § 1º).
  - Em 2027, CBS cheia (alíquota de referência menos 0,1 ponto) e IBS de 0,05% + 0,05%.
  - **PIS/COFINS revogados a partir de 01/01/2027** (art. 542).
  - O split payment não tem data em lei. A Fase 1 é "B2B opcional", **cartões fora** (Manual de Operações CGIBS v1.0.1).
- **Recomendação:** **"IBS/CBS 2027: tabela com vigência"** primeiro, porque é a única frente da onda 3 com data fixa que atinge o salão.
  - A NFC-e **sai da onda 3** e vai para o X10a (é obrigação atual em SP).
  - O split payment fica por último: o salão é B2C e recebe em cartão.
  - Esse PRE-ADR absorve o fork da V5 (abaixo).
- **Fork novo da V5 (interpretação):** o pacote pré-pago cai no art. 10 § 4º (antecipação a cada parcela, com acerto no fornecimento), ou no § 3º, redação nova ("execução continuada ou fracionada")? Pesa em 2027–2033 porque muda qual alíquota vale.
- **Quem decide:** o dono.

---

## 5. Emissão: pré-condições do BRIEF da FE-INCR-DFE

Fatos (V):
- Não existe tela de perfil fiscal nem de perfil fiscal de serviço, então **nenhuma venda emite** pela tela.
- A releitura detalhada só vem na resposta do upload; depois de recarregar, a tela só sabe "houve divergência".
- A view do documento não traz os ids do XML/PDF, então não dá para baixar.
- Não existe componente de arrastar e soltar. O padrão reaproveitável é o `NfePanel.tsx` (`input file` + `postMultipart`).
- As linhas 60/61/105 do GAP-MAP **não afetam o modo manual**, só o caminho do parceiro.
- O ambiente (F-AMB-5) sai de `FiscalDocumentView.ambiente`, sem mudar o backend.
- Construir antes do ANEXO-PENDENTE **não gera retrabalho**; basta uma regra: depois de qualquer erro, reler `GET /documents/:id` (hoje uma falha de anexo pós-autorização volta 500 com o documento já AUTHORIZED).

| Fork provável do BRIEF | Recomendação |
|---|---|
| F-DFE-FE-1 Telas de perfil fiscal (unidade + serviço) | Dentro do BRIEF, como PR-0, porque sem elas a tela não emite |
| F-DFE-FE-2 Releitura persistida e ids de anexo na view | Toque pequeno no backend, no mesmo BRIEF |
| F-DFE-FE-3 Onde fica o botão | `SaleDetailPanel` (ao lado de Finalizar/Pagar) |
| F-DFE-FE-4 Upload | `input file` no padrão do `NfePanel` (sem componente novo de arrastar) |
| F-DFE-FE-5 Ambiente na ficha | Derivar da view e avisar quando divergir do `GET /status` |

- **Prioridade:** depende da U2 (serve ao cliente do Simples e ao de município que usa o Emissor Nacional).
- **Quem decide:** o dono aprova o BRIEF; forks delegáveis.

### D-8 — Downloads (permissão do dono; nada foi baixado)

| Arquivo | URL | Tamanho | Para |
|---|---|---|---|
| Guia do Emissor Público Nacional Web v1.2 | gov.br/nfse/…/guia-emissorpubliconacionalweb_snnfse-ern-v12.pdf | 4.849.267 bytes | C.1 da FE-INCR-DFE |
| Anexo IV do ADN | gov.br/nfse/… `anexo_iv-adn-snnfse-v1-00-20251216.xlsx` | 26.231 bytes | X10i |
| NT 2025.002 v1.51 (IBS/CBS na NF-e) | Portal NF-e `conteudo=AKD/muSmiIY=` | 2.182.361 bytes | PRE-ADR IBS/CBS, X10a |
| NT 2026.006 / NT 2026.007 | Portal NF-e | 767.681 / 733.482 bytes | split / NF-e sem IE |

- O **MOC 7.0 já está no MANIFEST** desde 26/09, com tamanhos que conferem byte a byte. A linha F.3 do plano de emissão ("fora do corpus") está errada: falta a **transcrição** de saída, não o manual.

---

## 6. Onboarding e wizard (onda 2)

### D-9 — Nós perdidos na migração para o vault
Estado real (V):

| Nó | Estado | Forks |
|---|---|---|
| **I2** marco T0 | **Feito**, #320 | F-I2-1 já decidido (R7) |
| **I3** activate-default + período | **Feito**, #389; não tem outro fork | — |
| I6 unitId × tabela units | Não iniciado; bloqueado pelo I1b | F-I6-1 **cria um 4xx novo** em rota existente |
| I7 reset consistente | Parcial: não limpa a contabilidade nem o cache de KPI; sem teste | F-I7-1 **D3+** (204 → 409); mais a questão do T0 depois de reset |
| I11 agente de chat | Não iniciado; o agente grava proposta sem `canManageData` | F-I11-1 |
| W1 customização → create | Não iniciado; o esboço do BRIEF envelheceu (DTO `.strict()`, módulos) | F-W1-1, F-W1-2 **D3+** |
| W2 `isCore` real | Não iniciado; parcialmente superado pelas regras por módulo do I8 | F-W2-1, a reformular |
| W3 gates determinísticos | Não iniciado | F-W3-1/2 |
| W4 sessão persistida | Não iniciado (`Map` em memória) | F-W4-1, F-W4-2 (muda resposta) |
| W5 KB multi-preset | Parcial (clínica sim, CRM não) | F-W5-1 |
| **W6 `CustomizeFields`** | **Rota inexistente, 404 na tela do wizard** (`AIChatMode.tsx:110,176`) | F-W6-1 |
| W7 higiene do FE | Botão Debug, textos fixos, `gray-*` | — |

- **Recomendação:**
  - Criar os nós com estado honesto (delegável).
  - Fold do I2 e do I3 → `done`.
  - Levar à entrevista só os D3+ (F-I7-1, F-W1-2, F-W4-2, F-I6-1) e o F-W6-1. Para o F-W6-1 a recomendação é **(a)**: esconder o modo IA, porque hoje é um 404 visível.
- **Incidente em aberto (V, registro de 14/09, G-9):** uma chave OpenAI colada no chat, antes do H2-wizard. Conferir se foi rotacionada.

### D-10 — I4 e I5 (pais já prontos: I1, I3)
- **F-I4-1 → (a)**, a chamada fica no controller.
- **F-I4-3 → (a)**, preset sem binding → `not-applicable`.
- **F-I4-2 (D3+):** o BRIEF recomenda **(b)**, ou seja, o tenant nasce e a resposta traz a contabilidade em Draft com os bloqueios. Mas os passos irmãos (unidade e fiscal) hoje compensam e respondem 500. A recomendação continua (b): a ativação contábil falhar não deve apagar o sistema do cliente. O dono decide sabendo da assimetria.
- **I5 (a premissa mudou com o #296):** a marca d'água já avança e as falhas viram `reconcile_pending_items`.
  - O F-I5-1 (a) agora exige um valor novo no enum `ReconcilePendingReasonCode`, o que muda o contrato gerado.
  - O F-I5-2 (b), linha visível na UI, ficou barato: a tabela e a rota já existem, falta só a tela.
  - **Recomendação:** F-I5-1 (a) + F-I5-2 (b).
- **Autorização:** falta para I4 e I5.

---

## 7. CRM

### D-11 — Moeda no construtor de relatórios (CRM-RB)
- **Fatos (V):**
  - Os valores são float no JSON.
  - A moeda é um select BRL/USD/EUR por linha em `leads`, `leadProposals` e `crmOpportunities`.
  - Não há câmbio em lugar nenhum.
  - Os dois somadores atuais (`useCrmData.ts:55-75` e `CrmConversionProcessor` + `CrmAnalyticsService`) ignoram a moeda e **divergem também** pela tabela de origem e pelo filtro de status.
  - O BRIEF do CRM-RB não trata moeda e **cita campos que não existem** (`leads.value`, `proposals`…).
- **Opções:**
  - (A) moeda única por tenant;
  - **(B) somar por moeda, sem nunca misturar**, com 400 no `sum` sem dimensão de moeda;
  - (C) câmbio;
  - (D) só a moeda base + "N fora do total".
- **Recomendação:** **(B)**, mais a correção dos nomes de campo no BRIEF antes do "executa".
- **Decisão ortogonal:** a fonte do "valor de pipeline" (a visão geral não acompanhou a decisão de 25/09).

---

## 8. Emendas pós-contador (Fase 3) — ancoradas

| Emenda | O que a pesquisa fixou | Recomendação |
|---|---|---|
| **3.2 C8** | **R$1.200 por unidade funcional**, não por nota nem por linha (RIR 313 § 1º; IN 1.700 art. 120; PN CST 100/78 itens 13, 14 e 20: escolha no lançamento, sem reverter depois; exceção para conjunto). Benfeitoria: amortiza pelo **prazo restante do contrato** (RIR 331 III, 333; V). A regra "min(contrato, vida útil)" é **NV**. Achado lateral: o **Bloco F do C8 foi pausado** (`depreciationParteBAccountId` sem leitor, commit `0548d19a`), e o 1071/2210 (D-6) destrava | BRIEF da emenda C8 com esses critérios, mais retomar o Bloco F |
| **3.3 F7/X4** | São **4 classes** de encargo, não 2: juros de mora e multa de mora (dedutíveis); multa de ofício (punitiva) e multa não tributária (indedutíveis) (Lei 8.981 art. 41 § 5º; RIR 352; P&R 2021 Q034–37). Desconto **incondicional = está na nota na emissão** (reduz a receita); condicional = receita financeira (RIR 397). **0,65%/4% só no Lucro Real e só até 31/12/2026** (V). Hoje há um único "encargo" somado, e o X4 não gera adição automática | BRIEF da emenda com as 4 classes; adição automática só para o Real |
| **3.4 C6b** | **XLSX já existe** (`exceljs` em `server/package.json:48`); a triagem estava errada. Faltam: rota de inventário, export da ficha do imobilizado, export do aging; a memória de cálculo depende do X7 | Fatiar: o que dá para fazer agora × o que vem depois do X7 |

- **Autorização que falta:** "planeja a Fase 3".

### D-12 — GOV-CONTADOR (forks com recomendação do PRE-ADR e do BRIEF CRC-CFC)
- **F-GOV-1 (a)**, consultar o CRC-SP: é do dono, fora do código.
- F-GOV-2 (a) · F-GOV-3 (a) · F-GOV-4 (a) · F-GOV-5 (a) · F-GOV-6 (b).
- F-V1 (c) até o M2 · F-V2 (a) · F-V3 (b) · F-V4 (a).
- **Achados que o PRE-ADR não cobre (V):**
  - `openPeriod` é um **2º caminho de reabertura** (SOFT_CLOSED → OPEN).
  - As configurações contábeis e o imobilizado também usam `canClosePeriod`.
  - A citação `PeriodService.ts:34` do PRE-ADR está errada.

---

## 9. Defeitos novos e erratas (fora das decisões acima)

| # | Achado | Grau | Encaminhamento |
|---|---|---|---|
| E-1 | **Cancelar ou devolver uma venda de pacote contabiliza errado.** O `SaleReversalBridge` só estorna `sale.finalized` e `sale.settled`, e o pacote lança `sale.package.sold`. O passivo 2.1.1 e o a receber 1.1.2 ficam no balanço. A devolução lança "Devoluções" (redutora de receita) contra uma receita que nunca existiu. O saldo de pacote do cliente sobrevive. Nenhum teste de pacote no bridge | leitura V; defeito I (só o teste-guarda prova) | **Autorizar** a instrumentação e depois a correção |
| E-2 | Pacote sem vencimento nem baixa por não uso: o passivo fica aberto para sempre | V | Decisão de produto (prazo de validade?) |
| E-3 | A transcrição da LC 214 art. 10 no corpus usa o **§ 5º revogado** e omite o § 6º. A redação da LC 227/2026 é "regras aplicáveis ao cancelamento" | V (HTML do Planalto relido pela sessão principal) | Correção pontual do doc (delegável) |
| E-4 | Erratas de plano: "MOC 7.0 fora do corpus" (F.3); "NF-e antecipada" (D7/X10i); "hoje só CSV" (triagem); citação de linha no PRE-ADR GOV; nota "Planalto reeditou" no MANIFEST (provável falso positivo: um token antirrobô muda o sha) | V/I | Fold (delegável) |
| E-5 | Vault desatualizado: REVIEW, DELIVERY, BANK-SETTLEMENT, SPED-SIGNERS, CRC-CFC, I2 e I3 feitos, mas ainda `inflight`/`planned` | V | Fold (delegável). **Cuidado:** há uma sessão paralela ativa com o mesmo tema ("Lacunas de granularidade no planejamento de ondas") |

---

## 10. Onde este dossiê é fraco (declarado)
- **Fonte secundária:** conteúdo das NTs 2026.007 e 2025.002 v1.51; datas 2027/2028 do split; estimativa da alíquota da CBS.
- **Não verificado:** PN CST 210/73 e 104/75 (regra "min"); efeito da LC 224 na CSLL; liberação do Payouts do MP para lojista comum. ~~O que acontece se ninguém escolher no Simples (U1)~~ → **resolvido em 29/09 (tarde)**: o regime regular é facultativo e semestral, e sem opção o IBS/CBS fica no DAS (LC 123 art. 13 §§ 9º–10, red. LC 214 art. 517). Ver o adendo da `D-2026-09-29` e o `PRE-ADR-SIMPLES-NACIONAL-CALCULO`.
- **Viés:** as frentes legais tendem a confirmar o contador onde a norma é silenciosa. O cClassTrib 000001, o sentido dos blocos da Parte B e o monofásico são **inferências**, por isso viraram perguntas de confirmação, não fatos.
