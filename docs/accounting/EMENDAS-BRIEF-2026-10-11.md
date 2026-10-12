# Emendas de BRIEF exigidas pela pesquisa de 10/10. 2026-10-11

> **Sessão:** `sessao-planejamento`. **Sem código.** Cada seção emenda um BRIEF existente. O BRIEF alvo ganha uma linha
> no topo apontando para cá, e o texto original fica como está.
>
> **Autorização:** dono, chat, 2026-10-11, questionário: "executa" marcado para "5 Emendas de BRIEF". A opção marcada
> dizia: *"sessao-planejamento: X7-A (CSLL R$3,75 mi), PRESUMIDO-16, NFC-e 30 min, PAYMENT-PROVIDER (2%/dias não úteis),
> X14 2027, X8 D-5, retenções no AP. Só documentos."* ([[D-2026-10-11-QUESTIONARIO-DONO]]). A §8 registra a
> consequência da decisão (a) do mesmo questionário (certificado: PAA + PSC) nos BRIEFs ADN e NFC-e.
>
> **Código:** cada emenda exige "executa" próprio, por PR. **Forks novos: todos com RATIFICAÇÃO PENDENTE.**
>
> **Em duas linhas:** são 8 emendas, com 31 itens e 14 forks novos. A de maior risco é a §1: a apuração da CSLL de 2026
> pode estar contando o limite da LC 224 a mais (R$ 5 mi em vez de R$ 3,75 mi), e isso é **inferido por leitura**. Antes
> de corrigir, o item E1-1 pede o teste que falha.

Fontes comuns:
- [`PERGUNTAS-DE-LEI-2026-10-10.md`](../plano/PERGUNTAS-DE-LEI-2026-10-10.md) §10;
- [`pesquisa-lei-2026-10-10/`](pesquisa-lei-2026-10-10/);
- [`pesquisa-juris-2026-10-10/README.md`](pesquisa-juris-2026-10-10/README.md);
- [`D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO`](../plano/decisoes/D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO.md) (D-1..D-10).

---

## 1. X7-A: limite da CSLL de R$ 3,75 mi em 2026 (`BE-INCR-TAX-ASSESSMENT-A-brief.md`, P-2 e item 9)

**Origem.** P&R LC 224 v5, item 13: *"o limite anual será de R$ 3.750.000,00 … o equivalente a ¾"*. LC 224 art. 3º II:
a CSLL só a partir de 01/04/2026 (`pesquisa-lei-2026-10-10/irpj-sped.md:51-52`). SC Disit/SRRF10 10010/2026
(pesquisa-juris 3.3). É orientação da Receita, não lei.

**Estado do código (inferido por leitura, não executado).**
- A semente tem uma linha só, `LC224_LIMITE_TRIMESTRE_CENTS = 125000000` desde 2026-01-01, que serve aos dois tributos
  (`migrations/20261007150000_add_legal_parameters/migration.sql:49`).
- O acréscimo da CSLL é zero até 31/03, mas o limite e a sobra do T01 entram na conta da CSLL como entram na do IRPJ.
- Efeito provável: a CSLL de 2026 leva R$ 1,25 mi a mais de limite (sobra do T01 → T02 e limite anual de R$ 5 mi no
  §5º), e a parcela excedente fica menor que a devida.

**Itens.**
- **E1-1 [instrumentação]** Teste-guarda que falha hoje. PJ com receita de R$ 1,5 mi por trimestre em 2026: a CSLL do
  T02 tem de ter `LC224_LIMITE_TRIMESTRE` sem a sobra do T01, e a CSLL do T04 tem de ter limite anual de R$ 3,75 mi.
  Passa a `sessao-instrumentacao` → `sessao-correcao`.
- **E1-2 [cond: F-E1-1]** A correção, no caminho que o fork escolher.
- **E1-3 [direto]** A memória da CSLL de 2026 cita a fonte nova (P&R LC 224 v5 item 13; SC 10010/2026) na linha do
  limite.

**F-E1-1: como a CSLL de 2026 conta o limite.** **RATIFICADO (a)**: dono, chat, 2026-10-11, *"Pode ratificar e resolver"*; implementado no #634 (`59f2dec5`).
- (a) A CSLL de 2026 trata o T01 como "fora de atividade" para a LC 224: reusa o §9 (trimestres em atividade), a sobra
  do T01 não passa e o limite anual é de 3 × 1,25 mi. A receita do T01 fica fora da acumulada da CSLL.
- (b) Parâmetro novo `LC224_LIMITE_ANUAL_CSLL_2026_CENTS = 375000000` só para o §5º, mantendo o trimestral.
- (c) Esperar a resposta do contador.

**Recomendação: (a).** Reusa uma regra que já existe e tem teste (§9), e dá ¾ por construção. (b) corrige o anual, mas
deixa a sobra do T01 inflar o T02. Insumo ausente: o texto integral do item 13 do P&R não diz se a receita do T01 entra
na acumulada da CSLL. Se o contador disser que entra, (a) muda só nesse ponto.

---

## 2. PRESUMIDO-16: esteticista, estouro e ano de início (`BE-INCR-TAX-PRESUMIDO-16-brief.md`)

**Origem.**
- D-4 (triagem 10/10).
- Pesquisa-juris 3.1: esteticista é profissão regulamentada (Lei 13.643/2018). Pelo critério da Receita (PN CST
  15/1983), o impedimento atinge **toda** a receita da PJ (SC Disit/SRRF06 25/2013 e 37/2013). A pesquisa externa
  inverteu essa regra, e por isso não é usada.
- Pesquisa-juris 3.2: estouro = diferença sem acréscimos no mês seguinte (CARF 1003-000.186). Ano de início sem fonte.

**Estado do código (verificado por leitura).**
- `regra16` (`taxAssessmentCalc.ts`) já cobra a diferença postergada no 1º trimestre acima do limite, sem acréscimos,
  com vencimento no mês seguinte. O estouro já está coberto e a emenda só cita a fonte nova.
- O limite é `RECEITA_LIMITE_REDUZIDA_ANO_CENTS` cheio, sem proporção por início de atividade.

**Itens.**
- **E2-1 [direto]** O texto da confirmação `declaraNaoProfissaoRegulamentada` (mensagem do 400 e ajuda do FE) passa a
  nomear a esteticista: *"…nem tem esteticista (Lei 13.643/2018) ou outro profissional de profissão regulamentada: um só
  basta para perder o 16% em toda a receita"*. Fonte: SC Disit 25/37/2013.
- **E2-2 [cond: F-E2-1]** Detecção.
- **E2-3 [cond: F-E2-2]** Ano de início proporcional (D-4, "conservador, sem fonte"). O limite do ano de início é
  `120.000 × meses em atividade / 12`, com os meses lidos de `inicioAtividadeEm`. Vale para o trimestral (Presumido) e
  para a estimativa (Real).
- **E2-4 [direto]** A fonte do estouro na memória ganha "CARF 1003-000.186" ao lado do §11.

**F-E2-1: como o sistema sabe que há esteticista.** RATIFICAÇÃO PENDENTE.
- (a) Só a declaração (E2-1). O dono responde.
- (b) A declaração mais um alerta automático quando o catálogo de serviços da PJ tiver serviço de estética (cTribNac do
  grupo 06.02 no perfil fiscal do serviço, ou kit `aestheticClinic` instalado).
- (c) Bloqueio automático (400) nesse caso.

**Recomendação: (b).** O alerta pega o caso comum (salão que também faz estética) sem fingir certeza. A atividade real
depende de quem trabalha, e o código de serviço não prova isso. (c) erraria com salão que tem o serviço cadastrado e
nunca o vendeu.

**F-E2-2: aplicar o proporcional do ano de início.** RATIFICAÇÃO PENDENTE.
- (a) Sim, como D-4 decidiu: é conservador e reduz o risco de autuação.
- (b) Não. Limite cheio até haver fonte.

**Recomendação: (a)**, por ser a decisão D-4 ratificada. O fork existe só porque a regra não tem fonte, e a memória
precisa dizer "decisão do dono D-4, sem fonte legal".

---

## 3. NFC-e: cancelamento em 30 minutos, campo em minutos (`BE-INCR-NFCE-brief.md` e `BE-INCR-NFCE-EMENDA-1-brief.md`)

**Origem.** Ajuste SINIEF 19/16, cláusula 15ª: 30 minutos desde 01/10/2018 (`pesquisa-lei-2026-10-10/piscofins-icms.md`).
A errata de 10/10 marcou o "24 h" do `[NFE-CANC-PRAZO]` como errado para a NFC-e.

**Itens.**
- **E3-1 [direto]** O campo do perfil `nfceCancelPrazoHoras` passa a ser **`nfceCancelPrazoMinutos`**. `null` ⇒ **30**.
  A NF-e 55 fica em horas (`nfeCancelPrazoHoras`, `null` ⇒ 24).
- **E3-2 [direto]** A janela de cancelamento da NFC-e (409 `OUT_OF_WINDOW`) é calculada em minutos sobre `dhRecbto`.
  Teste: 29 min passa; 31 min dá 409.
- **E3-3 [direto]** A substituição por cancelamento extemporâneo (evento 110112, até 168 h) continua como no BRIEF
  original. Só a janela do 110111 muda.
- **E3-4 [direto]** O texto da tela (FE-INCR-DFE) diz "até 30 minutos depois da autorização".

Sem fork. O ponto de SP (exceção estadual) segue em `BE-INCR-NFCE-EMENDA-1-brief.md:286`. O 30 min é teto nacional do
Ajuste e só fica menor se a UF reduzir.

---

## 4. Cobrança (FE-INCR-PAYMENT-PROVIDER): multa de 2% para consumidor e dias não úteis (`FE-INCR-PAYMENT-PROVIDER-brief.md`)

**Origem.**
- Pesquisa-juris 5.1: CDC art. 52 §1º vale para serviço (STJ REsp 436.224-DF; REsp 1.090.044-SP; há um TJSP de 2026
  contra).
- Pesquisa-juris 5.2: CC art. 132. Vencimento em sábado, domingo ou feriado nacional, estadual ou municipal prorroga para
  o dia útil seguinte (STJ REsp 1.954.924-SE).
- Se a Lei 7.089 alcança instituição de pagamento é (c): vai ao advogado (§10.3 C-4).

**Estado.**
- O FE de hoje não cobra encargo (L-COB-2: o MP não tem campo de juros nem de multa).
- O boleto do MP empurra o fim de semana (W1), mas não sabe de feriado estadual ou municipal.
- O sistema só tem feriado nacional (`packages/models/validity.ts`). Isso é inferido pelo grep "feriado", que achou só
  esse módulo e os parâmetros legais.

**Itens.**
- **E4-1 [direto]** L-COB-2 ganha a resposta parcial: o teto de multa para consumidor PF é **2%** (CDC 52 §1º, leitura
  ampla do STJ). Continua sem campo de encargo na reemissão. Encargo é BE novo (ADR F-PP-10) e fica fora deste BRIEF.
- **E4-2 [cond: F-E4-1]** Prazo exibido no modal "Cobrar título" (item 12): quando o vencimento cai em dia não útil, a
  tela mostra a data prorrogada com a nota "prorrogado para o próximo dia útil (CC art. 132)".
- **E4-3 [cond: F-E4-1]** Status `PENDING` com `expiresAt` no passado (F-FE-COB-7) não vira "vencido" se o vencimento
  original caiu em dia não útil e o pagamento veio no dia útil seguinte.

**F-E4-1: calendário de feriados estadual e municipal.** RATIFICAÇÃO PENDENTE.
- (a) Tabela de feriados por UF e município em `legal_parameters` (publicada pelo dono, como as outras), mais um helper
  `proximoDiaUtil(data, uf, codMun)` que estende o de hoje (nacional).
- (b) Só nacional e fim de semana. O estadual e o municipal ficam como aviso de texto.
- (c) Usar o calendário que o MP aplicar no boleto, sem calendário próprio.

**Recomendação: (a)** para SP capital (1º cliente: feriados estaduais e municipais de SP), com o resto como linha de
tabela. (c) não serve porque o MP não documenta feriado local. Insumo ausente: a lista oficial de feriados de SP
(estadual e municipal) em fonte primária.

---

## 5. X14: as viradas de 2027 no Simples (`BE-INCR-SIMPLES-NACIONAL-brief.md`)

**Origem.**
- LC 214 art. 517 e Res. CGSN 190: o MEI emite documento fiscal em **toda** venda, inclusive para PF, a partir de 2027.
- Res. 190 revoga os arts. 19 e 20 da Res. 140: o regime de caixa acaba em 2027.
- A DEFIS acaba em 2027 e vira bloco anual do PGDAS-D (`pesquisa-lei-2026-10-10/simples-nfse.md`).
- D-6 (c), após a SC Cosit 59/2026: juros e multa de mora entram na receita bruta do Simples em 2027, **com alerta**.

**Estado (verificado por leitura).**
- O perfil tem `SIMPLES_REGIMES_APURACAO = ['COMPETENCIA','CAIXA']` (`CompanyFiscalProfileDto.ts:71`).
- A conferência de NFS-e lê o regime (`SimplesApuracaoService.ts:429`).

**Itens.**
- **E5-1 [direto]** `CAIXA` com `anoCalendario ≥ 2027` ⇒ 400 no PUT do perfil (Res. 190). A mensagem cita a revogação.
- **E5-2 [cond: F-E5-1]** Virada de 2026 para 2027 com perfil em CAIXA.
- **E5-3 [direto]** MEI em 2027: o alerta `NFSE_DIVERGE_RECEITA` deixa de ser informativo para o MEI e vira
  severidade acima de `INFO` (hoje é `INFO` com `motivoInformativo`, `SimplesApuracaoService.ts:693-695`). A partir de
  2027 toda receita do MEI deve ter documento (LC 214 art. 517).
- **E5-4 [direto, D-6 c]** Competência ≥ 2027-01: juros e multa de mora recebidos (contas 3.5.1 e 3.5.2 da emenda 3.3,
  quando existirem) entram na receita bruta do PGDAS-D, com alerta `ENCARGO_MORA_NA_RECEITA` citando a SC Cosit 59/2026.
  Antes de 2027, ficam fora.
- **E5-5 [direto]** DEFIS: a obrigação `DEFIS` na matriz de obrigações tem `vigenteAte = 2026` (última DEFIS, do ano
  2026, entregue em 2027). A partir do ano-calendário 2027 sai da matriz, e o PGDAS-D anual entra no lugar quando o
  leiaute sair.
- **E5-6 [direto]** DASN-SIMEI continua (o MEI não muda). A nota do FE-INCR-TAX-ASSESSMENT (item 3 da fila) registra
  que DASN-SIMEI e DEFIS não têm tela.

**F-E5-1: perfil em CAIXA na virada.** RATIFICAÇÃO PENDENTE.
- (a) Alerta no fim de 2026 e oferta de "levar o saldo a receber para dez/2026", sem automatizar (D-6 a).
- (b) Lançar o saldo a receber em dez/2026 automaticamente.

**Recomendação: (a)**, por D-6 (a) ratificado: "virada do caixa não automatizada". As transições anteriores apoiam
oferecer o saldo em dez/2026 (pesquisa-juris 4.4, média-baixa).

---

## 6. X8 / ITEM-DESTINATION: crédito do monofásico usado como insumo, configurável (`BE-INCR-ITEM-DESTINATION-brief.md` F-ID-4; `BE-INCR-PIS-COFINS-brief.md`)

**Origem.**
- D-5, revisto: configurável por cliente; o padrão é sem crédito e o contador liga.
- SC Cosit 496/2017 (vigente): dá crédito ao insumo monofásico, inclusive comprado de revendedor (pesquisa-juris 4.1,
  alta, administrativo).
- IN 2.121 art. 160 II b e art. 534 §1º II.
- A errata de 10/10 trocou a SC 4.024 pela 496/2017 nos BRIEFs.

**Itens.**
- **E6-1 [direto]** Flag `creditaInsumoMonofasico` (boolean, default `false`) no `FiscalProfile` da unidade, com
  auditoria (eventType novo na allowlist do `auditCanonical.ts` na mesma mudança). Só tem efeito no não cumulativo.
- **E6-2 [direto]** Linha `INSUMO_SERVICO × MONOFASICO` da tabela do F-ID-4:
  - flag `false` ⇒ crédito 0 com warning "sem crédito por política do cliente (D-5)";
  - flag `true` ⇒ base × 9,25% (1,65% + 7,6%) com fonte "SC Cosit 496/2017; IN 2.121 art. 160 II b".
- **E6-3 [direto]** Teste: mesma NF-e de insumo monofásico com a flag nos dois valores. Cumulativo e Simples sem efeito.

**F-E6-1: quem pode ligar a flag.** RATIFICAÇÃO PENDENTE.
- (a) Só o contador ativo, pela política versionada (GOV-CONTADOR: proposta do dono e aprovação do contador).
- (b) O dono direto.

**Recomendação: (a).** D-5 diz "o contador liga", e o caminho da política versionada já existe (#517/#604).

---

## 7. Retenções no AP: IRRF de 1,5% como tomador e "bruto como líquido" (BRIEF novo: `BE-INCR-AP-RETENCOES`)

**Origem.**
- D-8: o tomador retém IRRF de 1,5% (RIR art. 714), salvo prestador do Simples (IN SRF 765/2007) ou IR ≤ R$ 10.
- Achado do PRE-ADR folha (`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md:514`): o AP que paga com retenção registra o bruto
  como líquido.
- III-8 do pedido único ao contador, ainda sem assinatura.

**Esta seção não emenda um BRIEF existente.** Não há BRIEF de retenções no AP, e por isso ela abre o esqueleto do
`BE-INCR-AP-RETENCOES` (só o esqueleto). O BRIEF completo exige ler o `PayableService` e o fluxo de baixa, que ficam como
insumo ausente aqui.

**Itens.**
- **E7-0 [instrumentação, primeiro]** Teste-guarda do achado: título de AP de R$ 1.000,00 com IRRF de R$ 15,00 pago
  R$ 985,00 ⇒ hoje o fornecedor fica com saldo errado. Prova a lacuna antes de desenhar
  (`sessao-instrumentacao`).
- **E7-1** Retenção no título: `retencoes[]` (IRRF, PIS, COFINS, CSLL, ISS, INSS) com valor e base, e o líquido =
  bruto − Σ retenções.
- **E7-2** Lançamento: D despesa (bruto) / C fornecedor (bruto). Na baixa: D fornecedor (bruto) / C banco (líquido)
  / C "IRRF a recolher" (retido). Conta canônica nova ou configurável: F-E7-1.
- **E7-3** Regra D-8 como sugestão. O IRRF é sugerido a 1,5% quando o prestador **não** é do Simples e o IR é maior
  que R$ 10. Abaixo disso, 0 com nota "IR ≤ R$ 10 (dispensa)".
- **E7-4** DARF: o retido entra no X9/MIT como débito de IRRF (código 1708) do mês do pagamento. Fica dependente do X9
  PR-2.

**F-E7-1: conta do IRRF a recolher.** RATIFICAÇÃO PENDENTE.
- (a) Folha canônica nova `2.1.x IRRF a Recolher`, com referencial `2.01.01.09.28` "Outros Tributos a Recolher", no
  mesmo PR e no kit (lição da §1.2 da PROPOSTA-REFERENCIAL).
- (b) Conta configurável no `FiscalProfile`.

**Recomendação: (a)**, pelo mesmo motivo do F-ENC-1 (a): conta resolvida por código não trava em runtime.

**F-E7-2: como se sabe que o prestador é do Simples.** RATIFICAÇÃO PENDENTE.
- (a) Campo no cadastro do fornecedor (declaração do prestador, IN 765 art. 1º).
- (b) Consulta ao Portal do Simples por CNPJ.

**Recomendação: (a).** A IN 765 pede a declaração do prestador, e (b) é integração nova sem API pública documentada
(insumo ausente).

---

## 8. Consequência da decisão (a) de 11/10 nos BRIEFs ADN e NFC-e (`BE-INCR-DFE-ADN-EMISSOR-brief.md` F-ADN-1; `BE-INCR-NFCE-EMENDA-1-brief.md` F-NFCE-E1-1)

> **Estado em 12/10 (leia antes do resto desta seção).** A metade "PAA" foi **superada** pelo #635
> (`BE-INCR-DFE-ASSINATURA-PLANEJAMENTO-2026-10-11.md` §5): nenhum PAA homologado atende o salão, e o **F-E8-1R = (a)**
> foi ratificado — certificado em nuvem num PSC para **NFS-e, NF-e e NFC-e**. Logo: o **F-E8-1** abaixo está superado;
> os itens **E8-1** e **E8-3** valem com "PSC" no lugar de "PAA"; o **F-E8-3 = (a)** (qualquer PSC da LPSC, um adaptador
> na API v0 do ITI) está ratificado. O **F-E8-2 continua RATIFICAÇÃO PENDENTE** — é o único fork do §8 em aberto.

**Decisão.** Dono, 11/10: *"PAA + PSC nuvem (Recomendado)"*:
- NF-e e NFC-e assinadas pelo PAA (NT 2026.001), sem guardar o certificado do cliente;
- NFS-e nacional por certificado em nuvem num PSC credenciado (DOC-ICP-04 v8.3, 6.1.1.8).

**Efeito nos forks de 10/10.**
- **F-ADN-1** fica **superado**. As duas opções dele supunham guardar o A1 (registrar ou não a reabertura da decisão 2).
  A decisão 2 de 26/09 ("o Luminaris nunca guarda A1") **volta a valer**, agora com fundamento legal (MP 2.200-2 art. 6º
  p.ú.; DOC-ICP-04 6.1.1.8).
- **F-ADN-2** (onde mora o A1) e **F-ADN-3** (chave da cifra do A1) ficam **sem objeto**. O que se guarda passa a ser a
  credencial de acesso ao PSC (F-E8-2).
- **F-NFCE-E1-1** é respondido por um caminho que não estava entre as opções: emissor próprio (a), com assinatura e
  autorização pelo PAA em vez de certificado próprio.

**Itens.**
- **E8-1 [direto]** O ADR-DFE §12 ganha uma emenda: o emissor próprio não guarda certificado. A NFS-e assina por PSC
  (assinatura remota), e a NF-e/NFC-e pelo PAA.
- **E8-2 [cond: F-E8-2]** Contrato do adaptador ADN: `AssinadorRemoto.assinar(xml, credencialPsc) → xmlAssinado`.
- **E8-3 [cond: F-E8-1]** O X10a passa a usar o PAA no lugar do `SefazNfeEmissor` com certificado.

**F-E8-1: o PAA é o próprio Luminaris (homologado no ENCAT) ou um terceiro?** RATIFICAÇÃO PENDENTE.
- (a) O Luminaris como PAA. Exige homologação no ENCAT e requisitos da NT 2026.001, que não foram lidos na íntegra
  (insumo ausente).
- (b) Um PAA terceiro já homologado, com o Luminaris como cliente.

**Recomendação: (b)** para o 1º cliente. Prazo: a NFC-e já é obrigatória em SP e (a) depende de uma homologação sem
prazo conhecido. Pela regra de "Focus = referência, não fornecedor" (07/10), isso **reabre a escolha de fornecedor**, e
o dono decide sabendo disso.

**F-E8-2: PSC da NFS-e.** RATIFICAÇÃO PENDENTE.
- (a) O cliente contrata o PSC e entrega ao Luminaris uma credencial de assinatura com escopo (BYOK).
- (b) O Luminaris contrata o PSC e revende.

**Recomendação: (a).** Mantém "o titular controla a chave" (MP 2.200-2), e o TJSP responsabiliza o titular de qualquer
forma. Pergunta ao advogado (§10.3): o regresso contra o Luminaris se o PSC for usado indevidamente pelo sistema.

---

## Pendente de validação externa
- §1: o item 13 do P&R não diz se a receita do T01 entra na acumulada da CSLL (contador).
- §2: a proporção do ano de início não tem fonte (D-4, só decisão).
- §4: se a Lei 7.089 alcança instituição de pagamento (advogado, C-4); lista oficial de feriados de SP.
- §7: III-8 sem assinatura do contador.
- §8: NT 2026.001 na íntegra; SE-S como assinatura de DPS/NF-e (advogado, F-3/F-4).

## Insumos ausentes
- §1: texto integral do P&R LC 224 v5 item 13.
- §7: `PayableService` e o fluxo de baixa do AP (não lidos).
- §8: requisitos de homologação de PAA no ENCAT.

## Achados fora de escopo
- O §10.1 de `PERGUNTAS-DE-LEI-2026-10-10.md` ainda diz "pacote vencido sem ISS e sem NFS-e" pela letra, mas a
  jurisprudência (SC SF/DEJUG 11/2020 item 9.4.1) e a D-2 mantêm NFS-e e ISS. Precisa de uma linha de errata (sessão de
  errata, com pedido próprio).

## Grau
- **Verificado:** fontes citadas pelos arquivos de pesquisa de 10/10 (não relidas na fonte primária nesta sessão).
  Código citado como "verificado por leitura" foi lido nesta sessão.
- **Inferido:** o efeito da §1 sobre a CSLL. Vem da leitura do parâmetro único e não foi executado, e por isso E1-1 é
  instrumentação antes de correção.
- **Caso adversarial:** a §8 poderia ser lida como "F-ADN-1 ratificado (a)". Não é: as duas opções supunham guarda, e a
  decisão do dono a afasta. Por isso a seção marca o F-ADN-1 como superado, e não como ratificado.
