---
id: "D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO"
tipo: "decisao"
dominio: "financeiro"
titulo: "Triagem da resposta do jurídico ao PE-6 (PACOTE-VALIDADE) + 6 forks reabertos/decididos por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-04: \"Triagem da resposta do jurídico ao PE-6 do PACOTE-VALIDADE\" (skill luminaris-contador-liaison, modo triagem; forks reabertos por AskUserQuestion). Fora: merge do #483, deploy, código"
atualizado: "2026-10-04"
---
# D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO — triagem do PE-6

**Estado:** `decided` (6/6 perguntas triadas; 6 forks ao dono, 1 contra a recomendação)
**Autorização:** dono, chat, 04/10/2026: *"Triagem da resposta do jurídico ao PE-6 do PACOTE-VALIDADE (...) Forks
reabertos vão para mim por questionário (...) Fora: merge do #483, deploy, código. A triagem destrava o merge só com
o meu OK depois; o deploy continua esperando o M2. O parecer não é sign-off do incremento."*
**Não é "executa"** (ORCH-006): o delta do #483 (§Delta) precisa de autorização própria para a sessão que o aplicar.

Evidência: [`RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md`](../../accounting/RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md)
(na íntegra). Gabarito: tabela "critério de aceite INTERNO" do
[pedido](../../accounting/PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md). Nó: [[PACOTE-VALIDADE]]. Forks anteriores:
[[D-2026-10-02-PACOTE-VALIDADE-FORKS]].

## Natureza da resposta (lida antes de classificar)

O texto se declara **dossiê de pesquisa**, não parecer: *"Não substitui parecer de advogado."* A seção 6 lista 7 pontos
"O que falta conferir antes de citar" (inteiro teor dos REsp não lido; número do processo do TJRS ausente; art. 884
"de memória"; TRF1 sem pesquisa de recurso). O agente recomendou não fechar o PE-6 com ele; **o dono fechou** (F-JUR-0,
contra a recomendação).

## Premissa falsa da versão de 02/10

O jurídico recebeu o texto anterior à "Correção 03/10", com *"O sistema mostra a validade na consulta do saldo"*
(falso: só a API devolve `expiresAt`; nenhuma tela nem comprovante mostra). Conferido no texto da resposta: a palavra
"consulta" só aparece no título da seção 5 ("Precedentes para consulta"), e **nenhuma resposta se apoia na
visibilidade do saldo**. Pergunta 4 responde sobre a compra; pergunta 5 responde que não há dever legal de aviso e
desloca o requisito para a informação na compra. **Nenhuma das duas foi respondida sobre a premissa falsa; as
conclusões ficam de pé sem ela.** O que a premissa verdadeira muda é a consequência da pergunta 4 (F-JUR-4): como hoje
nada mostra a validade, o requisito que ela nomeia não é cumprido por nenhuma tela.

## Triagem pergunta a pergunta

| # | Classe | Trecho literal | Gabarito | O que a resposta move |
|---|---|---|---|---|
| 1 | **DADO** | *"Nenhuma lei proíbe o prazo, e há precedente que o trata como decadência convencional válida. O limite é a razoabilidade"*; *"Noventa dias fica longe desse parâmetro; quanto mais próximo dele, mais defensável."* | sim + "não há prazo mínimo legal" | O nó não volta ao dono (decisão 18 de 29/09 fica). Parâmetro de 12 meses vira orientação de cadastro (F-JUR-1) |
| 2 | **CRÍTICA** | *"Aplicar prazo a quem comprou sem prazo é modificação unilateral do contrato, e o aviso não supre o consentimento"*; *"manter esses saldos sem validade ou migrar só com aceite expresso"* | não pode (ou só com aceite) | Reabre o F-PV-3 (b). Decidido F-JUR-2 = sem retroatividade → **delta D1 no #483** |
| 3 | **CRÍTICA** | *"a retenção de 100% é o ponto mais frágil"*; mas *"os dois casos são de desistência do consumidor em pacote turístico, não de vencimento de prazo. O TJRS (seção 1) não viu enriquecimento ilícito na expiração de vale-presente."* | não deu %: só o análogo de 20% | Fork reaberto. Decidido F-JUR-3 = mantém 100% e mitiga (informação + prazo longo) → código não muda; item 13 fica |
| 4 | **DADO** | *"A lei exige informação prévia, ostensiva e com destaque sobre o prazo"*; *"cabe ao salão provar que informou; daí a importância do aceite registrado."* | requisito nomeado: destaque (54 § 4º), fonte ≥ corpo 12 (54 § 3º), aceite registrado (prova, 6º VIII) | Pré-requisito do nó FE vizinho **promovido a pré-condição do deploy** (F-JUR-4) |
| 5 | **CONFIRMAÇÃO** | *"Aviso antes de vencer — Não encontrei dispositivo que obrigue."* | não | F-PV-11 (a) fica. Confirma, nada muda (T5). Premissa: ver seção acima |
| 6 | **CRÍTICA** | *"A ressalva 'salvo disposição convencional em contrário' está no caput, não no § 1º. Combinada com o art. 47 do CDC, uma cláusula que afaste a prorrogação em feriado tende a ser lida contra o salão."* | precisa calendário | Reabre o sub-ponto do F-PV-1. Decidido F-JUR-6 = feriados nacionais → **delta D2 no #483** |

Sem resposta: nenhuma. Fora do pedido: a seção 6 do dossiê (7 conferências pendentes), registrada como risco residual.

## Cédulas (AskUserQuestion, 04/10)

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-JUR-0 | O dossiê (que diz não ser parecer) fecha o PE-6? | não fecha; PE-6 aberto até parecer assinado sobre 2, 3 e 6 | *"Fecha com esta rodada"* | **sim** |
| F-JUR-2 | Backfill dos saldos antigos | sem retroatividade (volta ao F-PV-3 a) | *"Sem retroatividade (Recommended)"* | não |
| F-JUR-3 | Retenção de 100% | 100% + mitigar | *"100% + mitigar (Recommended)"* | não |
| F-JUR-4 | Informação na compra vira pré-condição de deploy? | deploy só com o FE | *"Deploy só com o FE (Recommended)"* | não |
| F-JUR-6 | Feriado no último dia | feriados nacionais | *"Feriados nacionais (Recommended)"* | não |
| F-JUR-1 | Piso de prazo no catálogo | sem piso; orientação | *"Sem piso; orientação (Recommended)"* | não |

## Consequências

- **F-JUR-0 (contra a recomendação):** o PE-6 está **fechado** e a trava do F-PV-3d cai. Risco declarado: os 7 pontos
  da seção 6 do dossiê ficam sem conferência; os precedentes não estão prontos para citar em contrato ou defesa (o do
  TJRS não tem número). O deploy agora espera: delta D1+D2 aplicado no #483, OK do dono para o merge, o nó FE
  (F-JUR-4) e o M2.
- **F-JUR-2:** supersede o F-PV-3 (b), 3b, 3c, 3d e 3e de [[D-2026-10-02-PACOTE-VALIDADE-FORKS]]. Volta o F-PV-3 (a):
  saldo vendido antes do deploy fica `expiresAt null`. Some o motivo da retenção do #483 em
  [[D-2026-10-03-INTEGRACAO-REKEY-ECF-X7]] §3 (o boot gravava prazos em qualquer ambiente): **depois do D1**, o merge
  não escreve nada no 1º boot. O merge segue dependendo do OK do dono.
- **F-JUR-3:** o "vence → 100% receita" da decisão 18 fica. Mitigação é de processo: informação com destaque
  (F-JUR-4) e prazo próximo de 12 meses (F-JUR-1). Se um advogado for consultado no futuro, a pergunta 3 é a que vai.
- **F-JUR-4:** o nó FE vizinho (BRIEF §8, "mostrar a validade no cadastro do pacote, na venda e no saldo") ganha
  requisito nomeado e vira **bloqueador do deploy**: validade em destaque na venda e no comprovante, fonte ≥ corpo 12,
  e **registro de aceite** (quem, quando, texto mostrado). Onde o aceite mora (coluna na venda ou no saldo) é fork do
  BRIEF do nó FE. Nó ainda não aberto.
- **F-JUR-6:** substitui o sub-ponto do F-PV-1 ("cláusula 'dias corridos' afasta o § 1º"). Ver D2.
- **F-JUR-1:** orientação no BRIEF §6: "validade ≥ 12 meses é a mais defensável (TJRS, vale-presente); 90 dias fica
  longe". Código não muda (`validityDays` segue `minValue: 0`).
- **PE-1..PE-5** (contador) seguem abertos. Nada aqui é sign-off do incremento (CTD-002).

## Delta do #483 (não aplicado; lista para a sessão que o aplicar)

- **D1 (F-JUR-2): sai o backfill.** Remover `server/src/jobs/packageValidityBackfill.job.ts`,
  `server/src/jobs/__tests__/packageValidityBackfill.test.ts` e a chamada `runPackageValidityBackfillOnBoot()` em
  `server/src/server.ts` (lidos no `origin/feat/be-incr-pacote-validade` nesta sessão). Volta o teste do item 1/2 "saldo
  legado `null` continua `null`" (BRIEF §5.2: o item que tinha saído). Nenhuma marca `package-validity-backfill` no
  `JobWatermark`. Conferir outros chamadores antes de apagar (não feito nesta sessão).
- **D2 (F-JUR-6): feriado nacional empurra o último dia.** `lastValidDay` (`server/src/features/packages/models/validity.ts`):
  se `saleDate + N` cair em feriado nacional, o último dia válido passa ao dia útil seguinte (CC art. 132 § 1º). O
  resto (`isExpiredForConsumption`, `isDueForExpiry`, `expiryCompetence`) deriva de `expiresOn` e segue sem mudança.
  O comentário "Feriado NÃO empurra o vencimento" sai.
  - Lista de feriados nacionais **transcrita da lei vigente** na sessão que aplicar (memória
    `tabela-transcrita-de-lei-conferir-redacao-vigente`). Não conferida nesta sessão. Inferido: Lei 662/1949,
    Lei 6.802/1980 (12/10) e Lei 14.759/2023 (20/11). Sexta-feira Santa e Corpus Christi parecem ser feriados
    religiosos declarados pelo município (Lei 9.093/1995), e o Carnaval não é feriado federal. **Conferir.** A
    pergunta ao dono falou em "móveis da Páscoa"; se a lei confirmar que eles não são nacionais, ficam fora.
  - "Dia útil" (assumido): o próximo dia que não é feriado nacional nem domingo. Declarar no código.
  - Teto com `ponytail:`: feriados estaduais e municipais ficam fora; o upgrade é o calendário por unidade.
  - Testes: vencimento que cai em 25/12 vai para 26/12; um que cai num feriado seguido de domingo; um dia comum fica igual.
- **Sem delta:** F-JUR-1, 3, 4 e 5. O aceite registrado (F-JUR-4) é do nó FE, não do #483.
- **Quem aplica:** emenda ao spec já implementado no branch do #483 → `sessao-feature` sobre `feat/be-incr-pacote-validade`,
  com autorização citável do dono para o delta. Depois disso: review, OK do dono e merge.
