# BE-INCR-EFD-REINF — BRIEF (nó EFD-REINF, metade Reinf do PES-2)

> **Sessão:** `sessao-planejamento` (agente). Saída = este documento + o dossiê legal `verif-2026-10-22-efd-reinf-brief` + o
> fold da nota do nó. **Sem código, sem `executa`, sem merge.**
> **Base:** `origin/main` `882cd0fb` (22/10). O PRE-ADR `ADR-INCR-EFD-REINF` (D1–D9, §6, §7) e a cédula
> `D-2026-10-21-FORKS-EFD-REINF` (F-REINF-1..5) estão em `main`.

> **EMENDA 22/10: cruzamento com o BRIEF de retenções** (`BE-INCR-RETENCOES-FONTE-brief.md`, PR #843, branch
> `claude/brief-retencoes-fonte-a93e46`, §5.4 = contrato de saída). Aprovação do dono (chat, 2026-10-22), relayed pela sessão
> de origem: *"Manda as correções para as sessões de retenções e da Reinf: tabela única com dono no RETENCOES-FONTE carregada
> com a leitura oficial da Reinf, porta de leitura no backend, código AGREGADO nas 3 linhas da CSRF, filtro de tributo na
> invariante 4 e o R-4010 de PF por serviço como lacuna até o nó de pes[soal]"*. Escopo: este BRIEF e a nota do nó. Não ratifica
> fork. O que mudou:
> 1. **Tabela única (item 1).** A Reinf não cria tabela. Ela **consome** `NATUREZA_RENDIMENTO` e `RETENCAO_CODIGO`, que nascem no
>    PR-1 do RETENCOES-FONTE carregadas com a leitura oficial deste dossiê (grupo 15, 12001, 12016; `fonteSha256` do zip [D02]),
>    `PUBLISHED`. O PR-1 daqui passa a depender do PR-1 de retenções (§3). O vocabulário do discriminador de tributo (`IRRF` ×
>    `IRPJ`/`IRPF` da tabela oficial) é fixado lá. Aqui fica a dependência.
> 2. **Porta de leitura no backend (item 7, §5.1).** As retenções são lidas por uma porta de serviço que o RETENCOES-FONTE declara
>    (forma `WithholdingLineViewSchema` + `settlementId`/`originSettlementId`), não pelas rotas HTTP nem pelo Prisma direto. E1,
>    E2, E3 e E6 ficam **resolvidos contra o §5.4**.
> 3. **CSRF (F-REINF-8).** Fato do contrato: até 2026-12-31 as 3 linhas da CSRF chegam com `codigoReceita` = código `AGREGADO`.
>    O F-REINF-8 (a) decide pelo código da linha, que nesse período leva ao agregado. O fork segue pendente.
> 4. **Invariante 4 (§11)** soma só as linhas `MADE` `ACTIVE` com `tributo` ∈ {IRRF, CSLL, COFINS, PIS}. O INSS vai ao R-2010
>    (invariante 13 nova). O ISS não entra na Reinf.
> 5. **R-4010 de PF por serviço (item 19, E5) vira lacuna até o nó de pessoal.** O §5.4 entrega só a quantidade e o valor de
>    dependentes, não `cpfDep`/`relDep`. F-REINF-9 ~~continua PENDENTE~~ foi ratificado (a) em 22/10/2026, com a lacuna citada na linha dele.

> **RATIFICAÇÃO 22/10/2026** ([[D-2026-10-22-EFD-REINF-FORKS]]; dono, chat, 2026-10-22: "Dispara 1 pra ratificar os forks", respostas no
> AskUserQuestion): **F-REINF-6..13 todos (a)**, a recomendação do BRIEF; inclui a devDependency `xmllint-wasm`
> (F-REINF-7). F-REINF-8/9 foram perguntados em par com F-RET-16/18. **Não é `executa`.**

## Emenda 28/10 — fila de pesquisa de 27/10 (bloco 2; dossiê `pesquisas-legais/fila-2026-10-27-bloco2-reinf`)

> **Pedido do dono** (chat, 2026-10-28): *"Faz o fold dos achados da fila de pesquisa de 27/10 (blocos 1 a 6) no vault e
> nos BRIEFs, junto com os 7 dossiês, num PR sem merge."* Escopo: este BRIEF e a nota do nó. **Só fato de fonte oficial:
> nenhum fork é ratificado, e não é `executa`.** Resumo da fila: [[PESQUISA-FILA-2026-10-27]].

1. **P-REINF-7: `classTrib` 01.** Salão e clínica do Simples tributados pelos Anexos III ou V (CPP dentro do DAS) informam
   **01**, "Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária substituída"; **02** é
   só para quem tem atividade do Anexo IV; **03**, para quem tem as duas; **99**, "Pessoas jurídicas em geral", para
   Presumido e Real (leiaute 2.1.2, Anexo I, Tabela 08, extraída com pypdf em `docs/D07_anexo-I-tabelas.txt` [D07]).
   **Efeito:** o item 4 deriva o valor do perfil fiscal (regime e anexo), sem pergunta a ninguém.
2. **P-REINF-5: sim.** O portal web da Reinf no e-CAC gera e transmite os eventos a partir de formulários (MOU 2.1.2.1
   item 7.2 [D01]); o FAQ diz que ele "estará apto a recepcionar todos os eventos" (6.1 [D05]); o menu "Rendimentos
   Pagos/Creditados (Série R-4000)" tem R-4010 e R-4020 (página do SPED de 27/11/2025 [D04]). Limite de 100 notas por
   evento no portal (FAQ 2.3.19). Na fase 1, o relatório do produto pode ser digitado à mão no portal.
3. **P-REINF-2: mapa pronto; o contador só confirma, uma vez.** Pela Tabela 01 de 15/01/2026 [D03], a mesma da carga do
   PR-1 do RETENCOES-FONTE: contabilidade 15015 · advocacia 15004 · limpeza 15043 · conservação e manutenção, exceto
   reforma, 15044 · segurança e vigilância 15045 · locação de mão de obra (ex.: recepcionista terceirizada) 15046 ·
   fisioterapia 15022 · fonoaudiologia 15023 · medicina, exceto hospital, ambulatório, pronto-socorro e afins, 15026 ·
   nutrição 15027 · odontologia 15028 · psicologia 15034 · biomedicina 15012 · análise clínica laboratorial 15005 ·
   radiologia 15036 · terapia ocupacional 15039 · prótese 15033 · ensino e treinamento 15020 · consultoria 15014 ·
   assessoria técnica 15008 · programação (TI) 15032 · assessoria mercadológica, gestão de crédito, cobrança e contas a
   pagar e a receber 15047 · demais serviços técnicos ou administrativos 15099. Reforma e obra não têm natureza no grupo
   15 (a 15019 exclui "construção de estradas, pontes, prédios e obras assemelhadas"): só INSS (R-2010). O aviso
   `NATUREZA_NAO_CONFERIDA` (item 23) continua até a confirmação.
4. **P-REINF-4 (= P-RET-5): regra mais dado do tenant.** A IN RFB 2.110 (arts. 108–115) decide quais serviços são cessão;
   se o salão contrata limpeza ou vigilância por cessão é dado do cadastro do fornecedor e do onboarding, não pergunta ao
   contador (BRIEF do RETENCOES-FONTE, Emenda 28/10 item 3).
5. **P-REINF-8 (= P-RET-9): vira confirmação.** "Como regra geral, rendimentos do trabalho devem ser informados apenas no
   eSocial" (MOU item 11 [D01]); com relação de trabalho, "a informação sobre o pagamento deve ser prestada no ambiente do
   eSocial" (FAQ 1.17 [D05]). É o que o item 19 já assume (`PF_SERVICO_FORA_DA_REINF`). Resta a ambiguidade da natureza
   10002, que a Tabela 01 mantém: a leitura segura é não gerar R-4010 de autônomo que já está no eSocial.
6. **O que vai ao contador:** P-REINF-3 e P-REINF-6, como estão, mais as confirmações de sim ou não do mapa da P-REINF-2 e
   da P-REINF-8.
7. **Lacunas:** as notas técnicas 1, 2 e 3 de 2026 não foram relidas para a Tabela 08; o grupo 20 da Tabela 01
   (comissões, propaganda) não foi mapeado.

## TLDR (2 linhas)

Quatro PRs geram a EFD-Reinf do tenant a partir das retenções que ele **fez**: **PR-1** monta o serializer `lib/reinf.ts` (R-1000,
R-4020, R-4099, lote), lê as tabelas de natureza do rendimento do RETENCOES-FONTE e grava o `ReinfBatch` imutável com rotas;
**PR-2** traz R-4010 (dividendos e JCP; PF de serviço é lacuna até o nó de pessoal) e R-2010/R-2099; **PR-3** liga a matriz de obrigações, o relatório de
conferência e o pacote do contador; **PR-4** (condicionado, F-REINF-2 a) assina e transmite.
**Risco principal:** o leiaute oficial **2.1.2b** foi lido hoje e mostra que o XSD **exige** a assinatura e que o R-4020 é **por
pagamento** (`dtFG`, natureza, bruto), não por código de receita. O "resumo mensal D8" do RETENCOES-FONTE **não basta**. Depois da
emenda de 22/10, os contratos de entrada E1, E2, E3 e E6 estão resolvidos contra o §5.4 do BRIEF de retenções (PR #843). E4
(dividendos/JCP) espera o código do IRRF-DISTRIBUICAO, e E5 (PF de serviço) é lacuna. 8 forks novos ~~ficam PENDENTES~~ **ratificados em 22/10/2026** (quadro acima).

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `EFD-REINF`, nota `docs/plano/nos/EFD-REINF.md` (régua F, seção F1; âncora SDD §M5 · §M7.1).
- **Autorização:** dono, chat, 2026-10-22, relayed pela sessão de origem: *"Precisamos agora de sessões para a falta de brief"*.
  Limite: só o BRIEF (sessao-planejamento), só docs, sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** cobre exatamente o BRIEF deste nó. O campo `autorizacao` da nota ainda cita só a Q2 (a) de 20/10
    ("só o PRE-ADR e esta nota"), e a cédula de 21/10 diz "o BRIEF precisa de pedido próprio": **este é o pedido próprio**. O fold
    (§10) acrescenta a citação de 22/10 ao `estado_detalhe` sem trocar o campo `autorizacao`, que continua sem autorizar código.
- **Insumos (fato consumado):** `docs/adr/ADR-INCR-EFD-REINF.md`; `docs/plano/decisoes/D-2026-10-21-FORKS-EFD-REINF.md`;
  `docs/adr/ADR-INCR-RETENCOES-FONTE.md` e `D-2026-10-21-FORKS-RETENCOES-FONTE.md` (contratos de entrada);
  `BE-INCR-IRRF-DISTRIBUICAO-brief.md` (dividendos e JCP); dossiê de 20/10 `verif-2026-10-20-f1-retencoes-reinf-ibscbs` (IN RFB
  2.043 no Sijut); **dossiê novo de 22/10 `pesquisas-legais/verif-2026-10-22-efd-reinf-brief/relatorio.md`** (leiaute 2.1.2b,
  XSD, tabelas, MOU 2.1.2.1, NT 01–03/2026, Lei 9.250 art. 6º-A); molde `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md`.
- **Nós vizinhos:** consome [[RETENCOES-FONTE]] (`TaxWithholding` MADE; BRIEF no PR #843, §5.4 = contrato de saída), [[IRRF-DISTRIBUICAO]] (`Partner` em
  `main`; `ProfitDistributionEvent` e JCP **ainda não** em `main`), X10i (`FiscalCertificate`, em `main`), X13/LEGAL-PARAMS
  (`OBRIGACAO_REGIME`, `FERIADO_NACIONAL`, em `main`), C6b (pacote do contador). É consumido por [[X9]] (DCTFWeb lê os totais da
  Reinf, fora daqui) e AGENDA-FISCAL (F4, mostra o prazo).

**Fronteira (STOP do CLAUDE.md):** obrigação que a lei desenha igual para todos, registro imutável de lote ⇒ **Prisma
first-class** (ADR-PERSISTENCE-BOUNDARY; PRE-ADR §4). O serializer é lib pura sem Prisma (molde ECD D2). Nada toca
`DynamicTableService`, `RuleContext` ou plugin; a leitura das retenções é por repositório/serviço nomeado.

**Código lido (CBM-001, confirmado no arquivo):** `grep -ri reinf server/src` = só um comentário em
`ibsCbsParams.test.ts`; `lib/nfeSignature.ts` usa `xml-crypto` 6.3.2 + `@xmldom/xmldom` (XMLDSig já no repo) e
`test/helpers/nfeSignature.ts` assina fixtures com chave de teste; **não há validador de XSD** no `package.json`;
`FiscalCertificate` é único por `(userId, unitId)` (`schema.prisma:3140-3159`); `MitExport` (`schema.prisma:2881-2894`) é o molde do
lote; `ObrigacaoSped` não tem `REINF` e a matriz mora na tabela `OBRIGACAO_REGIME` (`models/obrigacoesPorRegime.ts:21,53`);
`FERIADO_NACIONAL` existe em `legalParameters/models/legalParameter.ts`; `Partner { taxId (DV validado), tipoPessoa,
residenteBrasil }` em `schema.prisma:1802`.

## 1. Forks ratificados que este BRIEF aplica

| Fork | Ratificado | Efeito no checklist |
|---|---|---|
| F-REINF-1 | (a) XML + relatório + `ReinfBatch` | itens 4–14, 22. **Conflito com o XSD (assinatura obrigatória): F-REINF-6** |
| F-REINF-2 | (a) porta já; adaptador só no PR-4, condicionado | item 12 (porta); itens 25–28 (PR-4) |
| F-REINF-3 | (a) 4 PRs, R-4020 primeiro | §2 |
| F-REINF-4 | (a) informar os dividendos isentos | item 16; **forma de informar = P-REINF-6** |
| F-REINF-5 | (a) tabela em `legal_parameters`, `DRAFT` até leitura oficial | item 1. **A Tabela 01 oficial foi lida hoje [D02].** Pela emenda de 22/10, a tabela é `NATUREZA_RENDIMENTO` do RETENCOES-FONTE, carregada com esta leitura em `PUBLISHED`. O `natRend` de cada serviço vem do `WithholdingProfile` (F-RET-16 a), conferido pelo contador (P-REINF-2) |
| F-RET-7 (RETENCOES-FONTE) | **(b) incluir PF** (contra a recomendação) | reabre o D1 do PRE-ADR ("outras retenções de PF ficam fora"): **F-REINF-9** |
| F-RET-2/3/4 | 4 PRs; escopo completo (IRRF + CSRF + INSS + ISS); CSRF proporcional por baixa | R-4020 recebe IRRF e CSRF de várias baixas (itens 6–7); R-2010 tem fonte (itens 17–18) |
| F-PES-4 / F-PES-5 (b) | fase 1 sem transmissão; eventos R-1000, R-4010, R-4020, R-4099, R-2010/R-2099 | escopo de eventos (item 3) |

## 2. O que a leitura oficial de 22/10 muda no PRE-ADR (fato, não decisão)

O PRE-ADR foi escrito com o leiaute **não lido** (§10 dele). Hoje o portal SPED respondeu e o dossiê de 22/10 leu o leiaute,
o XSD e as tabelas. Correções que este BRIEF já incorpora (sem fork, porque é o texto oficial):

| # | PRE-ADR dizia | Leiaute oficial diz | Fonte | Onde entra |
|---|---|---|---|---|
| L1 | `EVENTOS_NAO_APLICAVEIS` com 10 eventos | são **23 tipos**; faltavam **R-1050** (entidades ligadas) e **R-2098** (reabertura R-2000) | [L01] sumário; [D06] | item 3 |
| L2 | R-4020 "agrupado por beneficiário × natureza × `codigoReceita`" | evento por **estabelecimento × beneficiário**; dentro, `idePgto` por `natRend` (1..100) e `infoPgto` por `dtFG` (1..999). O código de receita **não vai no XML** | [D06] XSD R-4020; [D01] p. 106 item 2 | itens 6–7 |
| L3 | XML "não assinado" | `ds:Signature` **obrigatório** em todo evento (`minOccurs` padrão = 1) | [D06] | F-REINF-6 |
| L4 | retificação = próximo lote com `indRetif = 2` ou R-9000 | antes, o período fechado precisa ser **reaberto** (R-4099 `fechRet` de reabertura; R-2098) | [L01] Anexo II `REGRA_EVE_PERMITE_EXCLUSAO` | item 13; F-REINF-10 |
| L5 | `cnpjRaiz` no R-1000 | `nrInsc` = **raiz de 8 posições** (14 só para administração pública direta federal) | [L01] R-1000 campo 10 | item 4 |
| L6 | R-4010 de dividendos "com `codigoReceita = null` (isento)" | desde 01/2026 a natureza 12001 tem IR (1841-01, mensal); dividendo sem retenção se informa só pelo bruto (MOU item 9); a NT 02/2026 cria o tipo de isenção 12 só para o § 3º do art. 6º-A (transição) | [D02] tabela R-4010; [D01] p. 109; [D04]; [D08] | item 16; P-REINF-6 |
| L7 | `dtFG` não citado | `dtFG` segue o fato gerador **de cada tributo**: IR no crédito com o bruto do documento; CSLL/Cofins/PIS no pagamento com o bruto da parcela | [D01] p. 108 item 6 f | itens 6–7 |
| L8 | Id do evento não citado | `ID` + `tpInsc` + inscrição com 14 posições (raiz completada com zeros à direita) + `AAAAMMDDHHMMSS` + sequencial de 5 = 36 caracteres | [L01] Anexo II `REGRA_VALIDA_ID_EVENTO` | item 5 |

## 3. Fatiamento (F-REINF-3 a): cada PR com `executa` próprio

| PR | Conteúdo | Itens | Depende de |
|---|---|---|---|
| **PR-1** serializer, R-4020 e lote | leitura das tabelas de retenções, `lib/reinf.ts` (R-1000, R-4020, R-4099, lote), cobertura, `montarReinf` só R-4020, `ReinfBatch`, rotas, relatório mínimo, porta nomeada | 1–14 | RETENCOES-FONTE **PR-1** (tabelas `NATUREZA_RENDIMENTO`/`RETENCAO_CODIGO`; emenda 22/10) e **PR-2** (retenções feitas gravadas + porta de leitura) em `main`; F-REINF-6, 7, 8, 11 ratificados |
| **PR-2** R-4010 e R-2010 | R-4010 de dividendos e JCP, R-2010/R-2099; item 19 (PF de serviço) só registra o aviso da lacuna | 15–19 | IRRF-DISTRIBUICAO PR-2/PR-4 em `main`; RETENCOES-FONTE PR-2 (INSS + porta) |
| **PR-3** matriz e superfície | linha `REINF` da matriz, prazo, relatório completo, `EXPORT_REINF`, `defasado` + marcação `REABRIR/RETIFICAR` | 20–24 | PR-1 (PR-2 para o relatório completo) |
| **PR-4** transmissão (F-REINF-2 a) | assinatura com `FiscalCertificate`, lote assíncrono, consulta, recibos, R-9000, reabertura | 25–28 | condições do F-REINF-2: Manual do Desenvolvedor lido + tenant real que retenha; F-REINF-10 ratificado |

## 4. Checklist numerado (cada item = ≥ 1 teste)

### PR-1: serializer, R-4020 e lote

1. **Tabelas oficiais: consumidas, não criadas (emenda 22/10; F-REINF-5 a).** A Reinf **não** tem migração de dado. Ela lê
   `NATUREZA_RENDIMENTO` (chave = `natRend`, 5 dígitos) e `RETENCAO_CODIGO` (chave = `natRend`, discriminador = tributo,
   `valorTexto` = código de 6 dígitos), que nascem no **PR-1 do RETENCOES-FONTE** (itens 2 e 7 daquele BRIEF). Essas tabelas são
   carregadas com a leitura oficial deste dossiê em `PUBLISHED`: grupo 15 (15001–15099), 12001 (até 2025-12-31 sem tributo;
   desde 2026-01-01 com IR), 12016, `fonte` = Tabela 01 e tabelas "R-4020"/"R-4010" de 15/01/2026, `fonteSha256` do zip [D02].
   - **Dependência:** o vocabulário do discriminador de tributo (`IRRF` no BRIEF de retenções × `IRPJ`/`IRPF` nas tabelas oficiais
     [D02]) é fixado no BRIEF de RETENCOES-FONTE. O builder daqui usa o que estiver lá.
   - **O código de receita só serve ao relatório (item 14).** O XML não leva código (L2). O `natRend` de cada linha vem pronto
     da porta (§5.1 E2).
   - Teste (contra as tabelas de lá, com a fotografia de `legal_parameters` do teste): 15022 × IRRF = `170806`, × AGREGADO =
     `595207`; 15052 só IRRF `804506`; 12016 = `570602` (decendial); 12001 em 2026-03 = `184101`. Uma linha cujo `natRend` não
     existe em `NATUREZA_RENDIMENTO` `PUBLISHED` ⇒ 400 `NATUREZA_RENDIMENTO_SEM_MAPA` com o `natRend` e o id da linha.
   - Os códigos da carga (10002 entra só se F-REINF-9 for (a) e o nó de pessoal fechar a lacuna) são decididos no BRIEF de
     retenções.
2. **`lib/reinf.ts`: base pura.** Sem Prisma, sem `Date.now()` implícito (relógio injetado). Funções: `idEvento(cnpjRaiz, agora,
   seq)` (L8), `ideContri(cnpjRaiz)` (`tpInsc = 1`, `nrInsc` = 8 dígitos, L5), escape XML, montagem com namespace por evento
   (`http://www.reinf.esocial.gov.br/schemas/<evt>/v2_01_02`), `tpAmb` vindo da configuração (`1` produção, `2` produção
   restrita), `procEmi = 1`, `verProc` = versão do app. Valores monetários em centavos (`bigint`) formatados com vírgula decimal
   conforme o tipo do XSD. `__selfCheck()` no molde do `lib/ecf.ts`. Teste: id com 36 caracteres e raiz completada com zeros.
3. **Cobertura de eventos (gate).** `EVENTOS_SUPORTADOS` (fase 1: R-1000, R-4020, R-4099; PR-2 soma R-4010, R-2010, R-2099; PR-4
   soma R-9000 e, se F-REINF-10 (a), R-2098) e `EVENTOS_NAO_APLICAVEIS` com fonte para os demais **dos 23 tipos** do pacote XSD
   (L1): R-1050 (sem SCP/fundo ligado), R-1070 (sem processo cadastrado), R-2020, R-2030, R-2040, R-2050, R-2055, R-2060, R-3010,
   R-4040, R-4080; retornos R-9001, R-9005, R-9011, R-9015 são `RETORNO` (lidos, nunca gerados). Teste lista os nomes de arquivo
   do pacote XSD [D06] e exige que cada tipo esteja em exatamente um conjunto.
4. **`buildR1000(contribuinte, operacao, periodo)`.** `inclusao` com `iniValid` = 1ª competência com fato; `alteracao` quando o
   hash do `ContribuinteR1000` muda; `classTrib` vindo do regime (Tabela 08: Simples 01/02/03 conforme a CPP, MEI 04, demais 99
   — **valor do Simples = P-REINF-7**), `indEscrituracao` (1 = obrigada à ECD; vem da matriz de obrigações), `indDesoneracao = 0`,
   `indAcordoIsenMulta = 0`, `contato` = `AccountingContact` do perfil (`nmCtt`, `cpfCtt`, fone, e-mail), `softHouse` opcional
   (F-REINF-12 lista se entra). Sem contato com CPF ⇒ 400 nomeado `REINF_SEM_CONTATO`.
5. **Validação contra o XSD oficial (F-REINF-6, F-REINF-7).** Os XSD do pacote [D06] entram em `server/src/lib/reinf/xsd/`
   (cópia byte a byte, com o sha256 do zip num README). Teste por evento: o XML gerado, assinado com a chave de teste do helper
   existente (`test/helpers/nfeSignature.ts`, se F-REINF-6 a), valida no XSD. Um teste negativo: XML sem `ds:Signature` **falha**
   no XSD (prova que o validador lê a regra que motivou o fork).
6. **`buildR4020(contribuinte, estab, beneficiario, pagamentos, periodo, retifica?)`: um evento por beneficiário (L2).** Agrupa
   por `natRend` (≤ 100) e, dentro, uma `infoPgto` por `dtFG` (≤ 999). Cada `infoPgto`: `dtFG`, `vlrBruto` e o grupo `retencoes`
   com `vlrBaseIR/vlrIR`, CSRF **agregada** (`vlrBaseAgreg/vlrAgreg`) ou separada (`vlrBaseCSLL/vlrCSLL`, `vlrBaseCofins/vlrCofins`,
   `vlrBasePP/vlrPP`) **conforme F-REINF-8**. `isenImun` fica fora do PR-1: o §5.4 de retenções não traz isenção do beneficiário (a dispensa por optante aparece como `dispensa`, sem valor retido, e a linha não entra no R-4020).
   Teste (tabela): 1 beneficiário com IRRF no reconhecimento (dtFG = `issueDate`, bruto = documento) + CSRF em 2 baixas (dtFG =
   cada `paidAt`, bruto = parcela) ⇒ 3 `infoPgto` (L7); 2 beneficiários ⇒ 2 eventos; 101 naturezas ⇒ 400 nomeado.
7. **`montarReinf(userId, competencia)` só R-4020 no PR-1.** Lê as retenções pela **porta de leitura de backend** que o
   RETENCOES-FONTE declara (emenda 22/10; forma `WithholdingLineViewSchema` do §5.4 de lá + `settlementId`/`originSettlementId`).
   Não lê pelas rotas HTTP nem pelo Prisma direto. Filtra `MADE`, `ACTIVE`, `tributo` ∈ {IRRF, CSLL, COFINS, PIS}, beneficiário
   `kind = CNPJ`. O `dtFG` é `dataFatoGerador` da linha (E1). O `natRend` é o da linha (E2), conferido contra a tabela do item 1.
   Agrupa por beneficiário. Valida o DV do
   CNPJ do beneficiário **antes** de montar (PRE-ADR D8; `Counterparty.taxId` não tem DV): inválido ⇒ 400 nomeado com o
   `counterpartyId`. Natureza sem mapa `PUBLISHED` ⇒ 400 `NATUREZA_RENDIMENTO_SEM_MAPA` com a chave. Teste com retenções gravadas
   pelo serviço real do RETENCOES-FONTE (memória "sintético ≠ formato real"), não com SQL cru.
8. **Período sem fato ⇒ 422 (PRE-ADR D6).** Nenhuma retenção `MADE` nem dividendo/JCP ⇒ 422 `REINF_SEM_FATO` ("a Reinf é
   dispensada sem fato", IN 2.043 art. 4º, dossiê 20/10). Regime Simples/MEI **não** recusa (difere do X9 D10). Teste com perfil
   `SIMPLES`.
9. **`buildR4099(contribuinte, periodo, fechRet, respInf?)`.** Fechamento (`fechRet` = fechamento) no fim de cada lote com
   R-40xx. `ideRespInf` opcional (F-REINF-12). Teste: lote com R-4020 termina com R-4099 do mesmo `perApur`.
10. **`serializeLote(eventos)` e `ReinfBatch` (PRE-ADR D4).** O lote do download é o envelope `Reinf/loteEventos` do
    `envioLoteEventosAssincrono-v1_00_00.xsd` [D06] (mesmo formato que o PR-4 enviará), ordem R-1000 → periódicos → fechamento.
    Grava `ReinfBatch` com `competencia`, `eventos[]` (`tipo`, `idEvento`, `sha256`, `origemIds[]`, `beneficiarioRef` = id interno,
    nunca CPF/CNPJ), `sha256` do lote, `status = GERADO`. O XML **não** é persistido (PRE-ADR D8). Teste: mesmo dado ⇒ mesmo
    `sha256` dos eventos (com relógio fixo).
11. **Rotas em 2 toques (`Route → Controller → Service → Repository → Prisma` + Policy).** `POST /accounting/reinf/batches`
    (`{ competencia }` → `{ batchId, xml, relatorio }`), `GET /accounting/reinf/batches?competencia=` (lista com `defasado`),
    `GET /accounting/reinf/batches/:id` (sem o XML). Policy `canManageData` da PJ (molde do X9). DTO Zod `.strict()`;
    `competencia` não pode ser maior que o mês corrente (regra do `perApur` [L01]) ⇒ 400.
12. **Porta `ReinfTransmissorPort` nomeada (F-REINF-2 a), sem adaptador.** Tipo + função pura de mapeamento de retorno, no molde
    X7 D11 / R5. Nenhuma rota de envio no PR-1. Teste de tipo apenas.
13. **`defasado` na leitura (PRE-ADR D4, D5 com L4).** `GET` marca `defasado = true` quando alguma `origemId` foi estornada depois
    do `createdAt` do lote. O relatório do próximo lote lista o evento a `RETIFICAR` e, se o lote anterior estava `TRANSMITIDO`/
    `ACEITO`, a `REABRIR` antes (L4). Teste: estorno depois do lote ⇒ `defasado`; antes ⇒ não.
14. **Relatório de conferência mínimo (F-REINF-1 a).** JSON e CSV por evento: tipo, beneficiário **mascarado** (`**.***.***/0001-**`),
    natureza, `dtFG`, bruto, base e retido por tributo, código de receita derivado (item 1), vencimento do DARF (do resumo D8 do
    RETENCOES-FONTE) e prazo da Reinf (item 21). Soma por código bate com o resumo D8 (invariante 4). Teste de máscara.

### PR-2: R-4010 e R-2010

15. **`buildR4010(contribuinte, estab, beneficiarioPF, pagamentos, periodo, retifica?)`.** Mesma quebra do R-4020 (um evento por
    CPF; `idePgto` por `natRend`; `infoPgto` por `dtFG`), com `vlrRendBruto`, `vlrRendTrib`, `vlrIR`. CPF com DV inválido ⇒ 400.
16. **Dividendos e JCP (F-REINF-4 a; L6).** Fonte: `ProfitDistributionEvent` `POSTED` (dtFG = `dataEvento`, bruto = `brutoCents`,
    IR = `irrfCents`, natureza 12001) e alocações de JCP (natureza 12016, código 5706-02 decendial) do IRRF-DISTRIBUICAO, sócio
    `Partner` PF residente. **Contrato de entrada a confirmar** (esses models ainda não estão em `main`; §5.1 E4). Dividendo sem
    retenção (≤ R$ 50 mil no mês): só `vlrRendBruto` na 12001 (MOU item 9) **até P-REINF-6 responder**; dividendo `TRANSICAO`
    (art. 6º-A § 3º): `rendIsento` com `tpIsencao = 12` (NT 02/2026 [D04]). Sócio PJ (dividendo ou JCP) vai ao R-4020 com a
    natureza 12016 (JCP). Prazo dos isentos: trimestral (IN 2.043 art. 6º § 3º; item 21). Teste: 3 sócios (49k, 60k, 30k de
    transição) ⇒ 3 eventos, um com IR, um só bruto, um com isenção 12.
17. **`buildR2010(contribuinte, estabObra, prestador, nfs, periodo, retifica?)`.** Um evento por prestador (CNPJ): `indObra = 0`,
    `indCPRB` do prestador, totais (`vlrTotalBruto`, `vlrTotalBaseRet`, `vlrTotalRetPrinc`) e `nfs[]` com `serie`, `numDocto`,
    `dtEmissaoNF`, `vlrBruto`, `infoTpServ[]` (`tpServico` da Tabela 06 [L01], `vlrBaseRet`, `vlrRetencao`). Fonte: retenções `MADE`
    `tributo = INSS` do RETENCOES-FONTE. Série, tipo de serviço e CPRB vêm da porta (E3, resolvido na
    emenda 22/10): `titulo.documentoSerie`, `inss.tpServico`, `inss.cprb`. Qualquer um `null` ⇒ 400 nomeado com o id da linha, sem inventar valor.
18. **`buildR2099(contribuinte, periodo, flags)`.** Fechamento da série R-2000 com os 7 indicadores `S/N` do `infoFech`
    (`evtServTm = S` quando houver R-2010; os demais `N`). Teste.
19. **R-4010 de PF por serviço: LACUNA até o nó de pessoal (emenda 22/10).** Fica fora do PR-2. O §5.4 do RETENCOES-FONTE
    entrega em `pf` só a quantidade de dependentes e os valores de dedução. O XSD R-4010 exige `ideDep/cpfDep` e `relDep` por
    dependente [D06], e esses dados não existem em nenhum nó planejado. Sem eles, o evento não valida. Quando o nó de pessoal
    trouxer o cadastro de dependentes, este item vira: natureza 10002 (código 0588-07), `ideDep`/`detDed` da porta, condicionado a
    F-REINF-9 (a) e a P-REINF-8 (sobreposição com o eSocial S-1210). Até lá, `montarReinf` lista as linhas `MADE` de beneficiário
    `CPF` no relatório com o aviso `PF_SERVICO_FORA_DA_REINF` ("declarar fora do sistema"), sem gerar evento. Teste do aviso.

### PR-3: matriz e superfície

20. **Matriz: `REINF` em `OBRIGACAO_REGIME` (PRE-ADR D7).** `ObrigacaoSped` ganha `'REINF'`; `ORDEM_OBRIGACOES` inclui no fim.
    Linhas de dado para MEI/SIMPLES/PRESUMIDO/REAL: `statusBase = CONDICIONAL`, `perguntaBase` = "Houve retenção de IR/CSRF,
    pagamento de dividendos/JCP ou contratação de cessão de mão de obra no mês?" (molde DCTFWEB do MEI), `fonte` IN 2.043 arts. 3º
    I e VIII, § 1º I e 4º (dossiê 20/10), `inativa = NAO_SE_APLICA`. Teste da matriz por regime.
21. **Prazo.** `prazoReinf(competencia)` = dia 15 do mês seguinte, **postergado ao 1º dia útil seguinte** (IN 2.043 art. 6º § 2º)
    com `FERIADO_NACIONAL`; dividendos isentos: dia 15 do 2º mês após o trimestre (§ 3º). Atenção: o vencimento do DARF do
    IRRF-DISTRIBUICAO **recua** ao dia útil anterior; o da Reinf **avança** — duas funções, não um parâmetro. Teste: competência
    com dia 15 num sábado ⇒ segunda; trimestre 2026-T1 ⇒ 2026-05-15.
22. **Relatório completo + `EXPORT_REINF` no pacote do contador (C6b).** XML do lote + relatório do item 14, todos os eventos.
    Teste: o pacote contém os dois artefatos e o `sha256` do `ReinfBatch`.
23. **Avisos do relatório.** `PERFIL_SEM_NATUREZA`, `CONTATO_SEM_CPF`, `DEFASADO_RETIFICAR`, `REABRIR_ANTES` (L4),
    `NATUREZA_NAO_CONFERIDA` (`natRend` do perfil ainda não conferido pelo contador, P-REINF-2), `PF_SERVICO_FORA_DA_REINF` (item 19). i18n pt/en.
24. **Gates do PR-3.** Paridade i18n; snapshot dos DTOs novos; openapi path-count (rotas novas do PR-1 contadas lá).

### PR-4: transmissão (só com F-REINF-2 a cumprido)

25. **Assinatura XMLDSig com o `FiscalCertificate`** (reuso de `xml-crypto` como em `lib/nfeSignature.ts`; algoritmo e transform
    pelo Manual do Desenvolvedor 2.7, **não lido** — insumo 1). Escolha da unidade cujo certificado assina = F-REINF-13.
26. **Adaptador do webservice** (lote assíncrono: envio → protocolo → consulta → recibos por evento), job interno síncrono (T11),
    `ReinfBatch.status` `TRANSMITIDO → ACEITO|REJEITADO`, `nrRecibo` por evento em `eventos[]`.
27. **Retificação e reabertura** (L4, F-REINF-10): para período fechado, lote com R-4099 de reabertura (e R-2098 para a R-2000),
    depois o evento com `indRetif = 2` e `nrRecibo`, depois novo fechamento. **R-9000** para excluir evento cuja origem sumiu.
28. **Oráculo P-REINF-1** (runbook humano): 1º lote aceito na produção restrita.

### Gates que o diff aciona (em todo PR que tocar)

- snapshot de shape dos DTOs (`dtoShapeSnapshot.test.ts`); allowlist do `auditCanonical.ts` com `tax.reinf_batch.generated` (PR-1)
  e `tax.reinf_batch.transmitted` (PR-4): `batchId`, `competencia`, `sha256`, contagem por tipo — **sem CPF/CNPJ**; openapi
  path-count (`routes/docs/accounting.reinf.paths.ts`); i18n pt/en; `check:arch` (lib pura sem import de `features/`);
  `resetDb` limpa `reinf_batches` (`test/helpers/db.ts`); `tsc` dos dois lados.

## 5. Contratos esboçados

### 5.1 Contratos de entrada: **conferidos contra o §5.4 do BRIEF de RETENCOES-FONTE** (emenda 22/10)

A Reinf lê as retenções pela **porta de leitura de backend** que o RETENCOES-FONTE declara. A forma é a do
`WithholdingLineViewSchema` (§5.4 de lá) mais `settlementId`/`originSettlementId`. Não lê pelas rotas HTTP
(`GET /accounting/withholdings…`, que servem à tela) nem pelo Prisma direto. O nome e a assinatura da porta são fixados naquele
BRIEF. Aqui só se usa a forma. A nota de 22/10 na pasta compartilhada (`efd-reinf-para-retencoes-fonte.md`) originou o §5.4.

| # | O que a Reinf lê | Campo no §5.4 de retenções | Estado |
|---|---|---|---|
| E1 | linhas `MADE`/`ACTIVE` da competência, por pagamento | `id`, `tributo`, `event`, `dataFatoGerador` (dtFG), `competencia`, `brutoCents` (bruto do documento no IR, da parcela na CSRF), `baseCents`, `amountCents`, `dispensa`, `codigoReceita`, + `settlementId`/`originSettlementId` | **resolvido** |
| E2 | natureza do rendimento | `natRend` (5 dígitos) por linha, vindo do `WithholdingProfile.natRend` (F-RET-16 a) | **resolvido** (`null` ⇒ 400 do item 1) |
| E3 | INSS 11% (R-2010) por NF | `titulo.documentNumber`, `titulo.documentoSerie`, `titulo.issueDate`, `inss.tpServico`, `inss.cprb` | **resolvido** (`null` em `documentoSerie`/`tpServico`/`cprb` ⇒ 400 nomeado no item 17) |
| E4 | dividendos e JCP | BRIEF IRRF-DISTRIBUICAO itens 10, 21, 31 (models fora de `main`) | **a confirmar** contra o código do IRRF-DISTRIBUICAO quando o PR-2 dele estiver em `main` |
| E5 | PF de serviço (F-RET-7 b) | `pf { dependentes (quantidade), deducaoDependentesCents, previdenciaCents, pensaoCents, descontoSimplificadoCents, reducaoArt3ACents }` | **lacuna até o nó de pessoal:** faltam `cpfDep`/`relDep` por dependente (item 19) |
| E6 | beneficiário | `beneficiario { counterpartyId, nome, taxId, kind CPF\|CNPJ, regime }` | **resolvido** (o DV é validado aqui, item 7) |

### 5.2 Prisma (PR-1)

```prisma
model ReinfBatch {
  id          String   @id @default(cuid())
  userId      String   // a PJ (R8: CNPJ raiz)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)  // como MitExport
  competencia String   // YYYY-MM (perApur)
  tpAmb       Int      // 1 produção | 2 produção restrita
  eventos     Json     // [{ tipo, idEvento, sha256, origemIds: string[], beneficiarioRef?: string, retificaRecibo?: string, nrRecibo?: string }]
  sha256      String   // do lote; o XML NÃO é persistido (D8)
  status      String   // GERADO | TRANSMITIDO | ACEITO | REJEITADO
  protocolo   String?  // PR-4
  geradoPorId String
  createdAt   DateTime @default(now())
  @@index([userId, competencia])
  @@map("reinf_batches")
}
```

Imutável por construção: o repositório só expõe `create` e (PR-4) `marcarStatus` com CAS de `status`. Sem soft-delete: é
registro de entrega (molde `MitExport`/`AccountingDeliveryLog`).

### 5.3 Zod / TS

```ts
// lib/reinf.ts — tipos puros; centavos em bigint; datas date-only
export type ReinfEvento = 'R-1000' | 'R-2010' | 'R-2098' | 'R-2099' | 'R-4010' | 'R-4020' | 'R-4099' | 'R-9000';
export const EVENTOS_NAO_APLICAVEIS: Readonly<Record<string, string>>; // R-1050, R-1070, R-2020…R-2060, R-3010, R-4040, R-4080 com fonte
export const EVENTOS_RETORNO = ['R-9001', 'R-9005', 'R-9011', 'R-9015'] as const;

export interface ContribuinteR1000 {
  cnpjRaiz: string;                 // 8 dígitos (L5)
  classTrib: string;                // Tabela 08 — P-REINF-7
  indEscrituracao: 0 | 1;
  contato: { nome: string; cpf: string; foneFixo?: string; foneCel?: string; email?: string };
}
export interface PagamentoPJ {      // uma infoPgto
  dtFG: string; vlrBrutoCents: bigint;
  ir?: { baseCents: bigint; valorCents: bigint };
  agregado?: { baseCents: bigint; valorCents: bigint };              // F-REINF-8
  csll?: { baseCents: bigint; valorCents: bigint }; cofins?: { baseCents: bigint; valorCents: bigint }; pis?: { baseCents: bigint; valorCents: bigint };
  origemIds: string[];
}
export interface BeneficiarioPJ { cnpj: string; nome: string; ref: string /* counterpartyId */; porNatureza: Record<string, PagamentoPJ[]> }
export interface PagamentoPF { dtFG: string; vlrRendBrutoCents: bigint; vlrRendTribCents?: bigint; vlrIRCents?: bigint; isencao?: { tpIsencao: number; valorCents: bigint }; origemIds: string[] }
export interface BeneficiarioPF { cpf: string; nome: string; ref: string /* partnerId | counterpartyId */; porNatureza: Record<string, PagamentoPF[]> }
export interface NfServicoTomado { serie: string; numDocto: string; dtEmissaoNF: string; vlrBrutoCents: bigint; tiposServico: { tpServico: string; baseCents: bigint; retencaoCents: bigint }[] }

export interface CabecalhoEvento { tpAmb: 1 | 2; verProc: string; agora: string /* AAAAMMDDHHMMSS */; seq: number }
export function buildR1000(h: CabecalhoEvento, c: ContribuinteR1000, op: 'inclusao' | 'alteracao', iniValid: string): string;
export function buildR4020(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, b: BeneficiarioPJ, perApur: string, retifica?: string): string;
export function buildR4010(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, b: BeneficiarioPF, perApur: string, retifica?: string): string;
export function buildR2010(h: CabecalhoEvento, c: ContribuinteR1000, estabCnpj: string, prestador: { cnpj: string; indCPRB: 0 | 1 }, nfs: NfServicoTomado[], perApur: string, retifica?: string): string;
export function buildR2099(h: CabecalhoEvento, c: ContribuinteR1000, perApur: string, flags: { servTomados: boolean }): string;
export function buildR4099(h: CabecalhoEvento, c: ContribuinteR1000, perApur: string, fechRet: 'FECHAMENTO' | 'REABERTURA'): string;
export function buildR9000(h: CabecalhoEvento, c: ContribuinteR1000, tpEvento: ReinfEvento, nrRecEvt: string, perApur: string): string; // PR-4
export function serializeLote(eventos: { id: string; xml: string }[]): { xml: string; sha256: string };
export function __selfCheck(): void;

// Porta (PR-1 só o tipo; adaptador no PR-4)
export interface ReinfTransmissorPort {
  enviarLote(xmlAssinado: string): Promise<{ protocolo: string }>;
  consultar(protocolo: string): Promise<{ status: 'EM_PROCESSAMENTO' | 'ACEITO' | 'REJEITADO'; recibos: { idEvento: string; nrRecibo?: string; erros?: string[] }[] }>;
}

// dtos/ReinfDto.ts
export const ReinfBatchRequestSchema = z.object({
  competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),   // ≤ mês corrente (refine; perApur [L01])
}).strict();
export const ReinfBatchView = z.object({
  id: z.string(), competencia: z.string(), sha256: z.string(), status: z.enum(['GERADO', 'TRANSMITIDO', 'ACEITO', 'REJEITADO']),
  eventos: z.array(z.object({ tipo: z.string(), idEvento: z.string(), sha256: z.string(), origemIds: z.array(z.string()) })),
  defasado: z.boolean(), prazo: z.string(), createdAt: z.string(),
});
```

### 5.4 Rotas

| Rota | Item | Policy |
|---|---|---|
| `POST /api/accounting/reinf/batches` | 10–11 | `canManageData` da PJ |
| `GET /api/accounting/reinf/batches?competencia=` | 11, 13 | idem |
| `GET /api/accounting/reinf/batches/:id` | 11 | idem |
| (PR-4) `POST /api/accounting/reinf/batches/:id/transmit` | 26 | idem + certificado vigente |

## 6. Forks novos: **RATIFICADOS em 22/10/2026** ([[D-2026-10-22-EFD-REINF-FORKS]])

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-REINF-6** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Assinatura × XSD (L3). O F-REINF-1 (a) diz "XML não assinado testado contra o XSD", mas o XSD exige `ds:Signature` | **(a)** o download da fase 1 sai **sem** assinatura (como ratificado); o **teste** assina o XML com a chave de teste do helper existente e valida no XSD oficial · (b) validar contra uma cópia do XSD com `Signature` opcional (XSD alterado no repo) · (c) assinar já na fase 1 com o `FiscalCertificate` (XML pronto para um transmissor de terceiro, sem transmitir) | **(a).** Mantém a letra do F-REINF-1 (a saída não é assinada) e o objetivo dele (prova contra o XSD **oficial**, sem alterar). (b) testa contra um esquema que não é o da RFB. (c) antecipa o uso do certificado, que o F-REINF-2 deixou para o PR-4 | médio em (b): falso verde |
| **F-REINF-7** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Como validar XSD no Node | **(a)** devDependency `xmllint-wasm` (libxml2 em WebAssembly, sem build nativo), só nos testes · (b) `libxmljs2` (binding nativo; `node-gyp` no Windows) · (c) sem XSD: só asserções estruturais com `fast-xml-parser` | **(a).** Dependência só de teste, sem compilação nativa no Windows do dono; (c) não prova o leiaute (é o "teste prova o lido" do PRE-ADR §12). Dependência nova pede o OK do dono (ADR-ARCH-BOUNDARIES não cobre devDependency, mas é decisão) | médio em (c) |
| **F-REINF-8** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · CSRF no R-4020: agregada × separada | **(a)** até 31/12/2026, CSRF em `vlrBaseAgreg/vlrAgreg` (código 5952-07) quando a retenção foi feita pelo código agregado; separada quando o RETENCOES-FONTE gravar códigos separados (5987/5960/5979); 2027: só CSLL separada (LC 214 art. 509) · (b) sempre separada · (c) sempre agregada | **(a).** O MOU (item 7 e) diz que "empresas em geral" informam o agregado **sem** o IR, e o D3 das retenções já fala em 5952; o XML espelha o DARF recolhido, e a DCTFWeb confere os dois. **Fato do contrato (emenda 22/10, §5.4 de retenções):** até 2026-12-31 as 3 linhas da CSRF (CSLL/COFINS/PIS) chegam com `codigoReceita` = código `AGREGADO` (5952 + variação). Com (a), a regra "decide pelo código da linha" leva ao agregado em 2026. Desde 2027 há só a linha CSLL, separada. Ratificado (a) em 22/10/2026 | médio: divergência DARF × Reinf na DCTFWeb |
| **F-REINF-9** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · R-4010 de PF por serviço, depois de F-RET-7 (b) | **(a)** o R-4010 também declara as retenções de PF do RETENCOES-FONTE (natureza 10002, dependentes e deduções), no PR-2, **condicionado** a P-REINF-8 · (b) o R-4010 fica só com dividendos/JCP (D1 do PRE-ADR); a retenção de PF é declarada fora do sistema | **(a).** F-RET-7 (b) pôs o dado no sistema; sem (a) o tenant retém e não declara (IN 2.043 art. 3º VIII). A condição evita declarar em dobro se o autônomo for do eSocial S-1210. **Lacuna (emenda 22/10):** mesmo com (a), o R-4010 de PF por serviço só sai quando o nó de pessoal trouxer `cpfDep`/`relDep`, porque o §5.4 de retenções entrega só a quantidade de dependentes e o XSD exige CPF e relação (item 19) | alto em (b): retenção sem declaração |
| **F-REINF-10** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Reabertura (L4) | **(a)** R-4099 de reabertura e R-2098 entram em `EVENTOS_SUPORTADOS` no PR-4, junto da retificação; na fase 1 o relatório marca `REABRIR_ANTES` · (b) fora; o operador reabre e retifica na Reinf Web | **(a).** Sem reabertura o retificador do PR-4 é rejeitado pela regra `REGRA_EVE_PERMITE_EXCLUSAO`; custa um builder | médio em (b): PR-4 não retifica |
| **F-REINF-11** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Estabelecimento (`ideEstab`) | **(a)** centralizado: `nrInscEstab` = CNPJ completo da matriz (`CompanyFiscalProfile.declarante.cnpj`) para todas as unidades · (b) descentralizado: um evento por unidade com CNPJ próprio | **(a).** O MOU permite os dois (p. 106 item 2); as unidades do Luminaris não têm CNPJ próprio garantido, e (a) dá um evento por beneficiário, como o MOU recomenda | baixo |
| **F-REINF-12** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Campos opcionais de identificação | **(a)** `softHouse` (CNPJ do Luminaris) no R-1000 e `ideRespInf` (contador) no R-2099/R-4099 só quando houver dado cadastrado · (b) nunca · (c) sempre, com 400 se faltar | **(a).** São opcionais no XSD; (c) bloqueia o lote por dado que a RFB não exige | baixo |
| **F-REINF-13** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-EFD-REINF-FORKS]]) · Qual certificado assina (PR-4) | **(a)** o `FiscalCertificate` da unidade escolhida no envio (o modelo é 1 por unidade), exigindo CNPJ raiz do certificado = raiz do contribuinte · (b) certificado próprio da PJ (model novo, sem unidade) | **(a).** Reusa o que existe; a raiz do CNPJ confere a titularidade, como no `nfeSignature` | baixo; decide só no PR-4 |

## 7. Pendente de validação externa (contador / fonte oficial / runbook — não são forks)

| # | Pergunta | Trava | Quem |
|---|---|---|---|
| **P-REINF-1** | Oráculo do leiaute: 1º lote aceito na produção restrita (ou a Reinf Web conferindo o relatório) | aceite × leitura | runbook humano (`RUNBOOK-FORMAT`); agente prepara, não assina |
| **P-REINF-2** | Natureza do rendimento (Tabela 01) de cada serviço que o salão/clínica contrata de PJ. **27/10: mapa de 23 serviços pronto pela Tabela 01 oficial (Emenda 28/10 item 3); o contador confirma o mapa uma vez** | `natRend` de cada `WithholdingProfile` (F-RET-16 a) conferido; a tabela já é oficial (item 1) | contador (confirmação) |
| **P-REINF-3** | O Simples tomador que retém só IRRF declara R-4020 do mesmo jeito? (ambiguidade A do RETENCOES-FONTE) | item 8 (há fato?) | contador |
| **P-REINF-4** | ~~O salão contrata limpeza/vigilância por cessão de mão de obra?~~ **27/10: a regra é da IN 2.110 (arts. 108–115); o fato é dado do fornecedor/tenant** (Emenda 28/10 item 4) | PR-2 itens 17–18 | usuário (cadastro) |
| **P-REINF-5** | ~~A Reinf Web permite digitar os eventos R-4000 na fase 1?~~ **Resolvida 27/10: sim**, até 100 notas por evento (Emenda 28/10 item 2) | uso do relatório | — |
| **P-REINF-6** | Dividendo ≤ R$ 50 mil/mês de lucro de 2026: no R-4010 vai **só o bruto** na 12001 (MOU item 9) ou em `rendIsento` com algum tipo? (ambiguidade A do dossiê 22/10) | item 16 | contador |
| **P-REINF-7** | ~~`classTrib` do salão/clínica no R-1000~~ **Resolvida 27/10: 01** no Simples com CPP substituída (Anexos III e V); 99 fora do Simples (Tabela 08; Emenda 28/10 item 1) | item 4 | — |
| **P-REINF-8** | IRRF de autônomo PF sem vínculo vai no R-4010 (natureza 10002) ou só no eSocial S-1210? **27/10: manual (item 11) e FAQ (1.17) mandam ao eSocial; vira confirmação de sim ou não** (Emenda 28/10 item 5) | F-REINF-9 | contador (confirmação) |
| **P-REINF-9** | Tabela de códigos de 2027: Cofins/PIS retidos deixam de existir (LC 214 art. 509), mas a tabela de 15/01/2026 não encerra as linhas | invariante 5; tabela do item 1 | fonte oficial (nova tabela SPED) |

## 8. Insumos ausentes

1. **Manual de Orientação ao Desenvolvedor 2.7** e o XSD de retorno do lote assíncrono: não lidos em detalhe (só para o PR-4).
2. **Porta de leitura de backend do RETENCOES-FONTE:** a forma está no §5.4 do BRIEF de lá (PR #843). O nome e a assinatura da porta
   são fixados lá (emenda 22/10). **Cadastro de dependentes PF** (`cpfDep`/`relDep`): não existe em nó planejado, fica para o nó de
   pessoal (item 19).
3. **Models do IRRF-DISTRIBUICAO** (`ProfitDistributionEvent`, JCP) fora de `main`: o PR-2 cita o BRIEF daquele nó, não o código.
4. Leiaute 2.1.2b em PDF com colunas desalinhadas na Tabela 08 (classificação tributária): a leitura do código do Simples
   foi conferida pelo texto da descrição, não pela tabela formatada; a P-REINF-7 decide o valor. **28/10:** decidido pela
   Tabela 08 extraída com pypdf (Emenda 28/10 item 1).

## 9. Achados fora de escopo (registrados, não planejados)

1. **Acervo `ctresb/leis` desatualizado:** a Lei 9.250 "compilada" de 13/10 não traz o art. 6º-A (Lei 15.270/2025). Outros
   artigos inseridos por leis recentes podem faltar em cópias "compiladas"; vale avisar o mantenedor do acervo.
2. `legal.py baixar` quebra em arquivo `.zip` (tenta extrair texto como HTML): o leiaute [L01] ficou fora do manifesto e foi
   registrado à mão no relatório. Correção é na ferramenta, não aqui.
3. `Counterparty.taxId` sem DV: a validação entra aqui só como bloqueio do evento (item 7); a correção na origem é emenda do
   COUNTERPARTY (já anotado no PRE-ADR §11).
4. O PRE-ADR `ADR-INCR-EFD-REINF` §5 D1/D5, §7 e §13 ficam desatualizados pelas correções L1–L8 (§2). A emenda do ADR é do fold
   que o tornar `Accepted`, não deste BRIEF.
5. A DCTFWeb (X9) passa a ter débitos vindos da Reinf (R-9005/R-9015 de retorno); a leitura desses totais é do X9.

## 10. Fold desta sessão

`docs/plano/nos/EFD-REINF.md`: `estado` continua `planned`; `estado_detalhe` ganha a entrada de 22/10 (BRIEF escrito, PR deste
BRIEF, leiaute 2.1.2b lido em fonte oficial, forks F-REINF-6..13 pendentes, próximo = ratificação dos forks novos e espera do BRIEF
de RETENCOES-FONTE); "Docs" aponta para este arquivo e para o dossiê de 22/10; "O que espera o dono" troca "ler o leiaute" pelos
forks novos. `autorizacao` não muda.

## 11. Invariantes (cada uma vira teste; ADR §13 corrigido pelas L1–L8)

1. Período sem retenção `MADE` e sem dividendo/JCP ⇒ 422; com fato ⇒ R-1000 de `inclusao` no 1º lote do tenant.
2. Cada um dos 23 tipos do pacote XSD está em exatamente um conjunto: suportados, não aplicáveis (com fonte) ou retorno.
3. R-4020 só com CNPJ de DV válido; R-4010 só com CPF de DV válido; inválido ⇒ 400 nomeado com o id da contraparte/sócio.
4. Σ (`vlrIR` + `vlrAgreg` + `vlrCSLL` + `vlrCofins` + `vlrPP`) do R-4020 do período = Σ `amountCents` das linhas `MADE`
   `ACTIVE` com `tributo` ∈ {IRRF, CSLL, COFINS, PIS} e beneficiário CNPJ da competência (emenda 22/10). INSS e ISS ficam fora
   dessa soma. Σ por código derivado = resumo D8 por `codigoReceita`.
5. Competência ≥ 2027-01 ⇒ nenhum `vlrCofins`/`vlrPP`/`vlrAgreg` no R-4020 (só IR e CSLL; RETENCOES-FONTE invariante 1).
6. Um evento R-4020/R-4010 por beneficiário e estabelecimento no lote; `infoPgto` com `dtFG` do fato gerador de cada tributo (L7).
7. Todo evento gerado, assinado com a chave de teste, valida no XSD oficial [D06]; sem `ds:Signature` não valida (F-REINF-6 a).
8. Lote gerado ⇒ `ReinfBatch` com `sha256` e `origemIds`; XML não persistido; auditoria e `eventos[]` sem CPF/CNPJ.
9. Estorno de retenção de origem depois do lote ⇒ `defasado = true`; se o lote foi transmitido, o relatório pede `REABRIR_ANTES`.
10. Prazo = dia 15 do mês seguinte, **avançado** ao dia útil seguinte; isentos de dividendos = dia 15 do 2º mês após o trimestre.
11. Matriz: `REINF` = `CONDICIONAL` em MEI/SIMPLES/PRESUMIDO/REAL; inativa `NAO_SE_APLICA`.
12. Id do evento com 36 caracteres no formato `REGRA_VALIDA_ID_EVENTO`; `nrInsc` com 8 dígitos.
13. (emenda 22/10) Σ `vlrTotalRetPrinc` dos R-2010 do período = Σ `amountCents` das linhas `MADE` `ACTIVE` com `tributo = INSS`
    da competência. Nenhuma linha `tributo = ISS` aparece em evento algum da Reinf.

## 12. Riscos e caso adversarial (T8)

- **Risco: BRIEF irmão diverge.** Fechado na emenda de 22/10: o §5.4 de retenções entrega linha por pagamento com `dataFatoGerador`
  e `natRend`. Resta a dependência de ordem: o PR-1 daqui só depois dos PR-1 e PR-2 de lá.
- **Risco: leiaute aceito ≠ lido.** O XSD prova forma, não regra de negócio do validador da RFB (ex.: `REGRA_EXISTE_INFO_CONTRIBUINTE`,
  `REGRA_DTFG_12001`). Só o P-REINF-1 fecha.
- **Viés: herdar o PRE-ADR.** O PRE-ADR foi escrito sem o leiaute; tratei cada contrato dele como hipótese e corrigi 8 pontos
  contra o texto oficial (§2).
- **Caso adversarial tentado contra "um evento R-4020 por código de receita" (o desenho do PRE-ADR):** um fornecedor de
  fisioterapia com IRRF no reconhecimento (1708) e CSRF em duas baixas (5952). Pelo PRE-ADR seriam 2 grupos (1708 e 5952) num
  evento sem data; pelo XSD é **1 evento** (o beneficiário), **1 `idePgto`** (natureza 15022) e **3 `infoPgto`** (dtFG da nota com o IR;
  dtFG de cada baixa com a CSRF). A checagem que teria falhado se eu estivesse errado: o XSD R-4020 não tem campo de código de
  receita (`grep` dos nomes de elemento em [D06]) — confirmado, não tem.

## 13. Fontes

| Documento | Origem | Observação |
|---|---|---|
| Dossiê de 22/10 `verif-2026-10-22-efd-reinf-brief` | `pesquisas-legais/verif-2026-10-22-efd-reinf-brief/relatorio.md` | [L01] leiaute 2.1.2b (sha256 `d08ad69c…`), [D01] MOU 2.1.2.1, [D02] Tabelas 15/01/2026, [D03–D05] NT 01–03/2026, [D06] XSD v2.1.2 CNPJ alfanumérico, [D07] Lei 9.250 (acervo, sem o art. 6º-A), [D08] Lei 9.250 (Planalto) |
| Dossiê de 20/10 `verif-2026-10-20-f1-retencoes-reinf-ibscbs` | `pesquisas-legais/…/relatorio.md` | IN RFB 2.043 arts. 1º–10 (Sijut, visão vigente); Lei 10.833, LC 214 art. 509 |
| PRE-ADR e cédula | `docs/adr/ADR-INCR-EFD-REINF.md`; `docs/plano/decisoes/D-2026-10-21-FORKS-EFD-REINF.md` | D1–D9; F-REINF-1..5 |
| Retenções | `docs/adr/ADR-INCR-RETENCOES-FONTE.md`; `D-2026-10-21-FORKS-RETENCOES-FONTE.md` | contratos de entrada E1–E6 (§5.4 do BRIEF `BE-INCR-RETENCOES-FONTE-brief.md`, PR #843) |
