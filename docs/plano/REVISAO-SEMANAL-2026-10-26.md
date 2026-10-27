# Revisão semanal — 19 a 26/10/2026

> **Estado deste documento:** avaliação do agente, medida em `origin/main` (`4463385c`, 26/10 21:47 UTC) e no
> frontmatter do vault. **Nada aqui muda estado de nó nem autoriza nada** (ORCH-006): estado vive no frontmatter
> de cada nota; ordem vive em [[FILA-ORDEM]]. Projeções de prazo são **do agente**, não ratificadas.
> Artefato com roadmap + próximas tarefas (aba 1) e prazos + milestones (aba 2): ver "Artefato" ao fim.

## 1. Números da semana (verificados)

| Medida | 19–26/10 | Semana anterior (12–18/10) | Fonte |
|---|---|---|---|
| PRs mergeados em `main` | **107** | 139 | `gh pr list --state merged --search "merged:>=2026-10-19"` |
| Commits em `main` | 168 | — | `git log origin/main --since=2026-10-19` |
| Arquivos tocados | 947 (+512k / −12k linhas; inflado por `openapi.json`, corpus de `pesquisas-legais/` e snapshots) | — | `git diff --shortstat 4274f006..origin/main` |
| Arquivos de teste tocados | 222 | — | idem, filtro `.test.ts(x)` |
| Migrações Prisma novas | 14 | — | `server/prisma/migrations` |
| Nós fechados (`estado: done`, `atualizado` na semana) | **14** | — | frontmatter de `nos/` |
| Cédulas de decisão novas (`decisoes/D-2026-10-19..25`) | 39 | — | `ls decisoes/` |
| Régua contábil/financeiro/fiscal | **55 / 63** (contábil 21/22 · financeiro 17/19 · fiscal 17/22) | — | `_INDEX.md` gerado 26/10 |
| PRs abertos em 26/10 | **19** (todos "não mergear sem OK") | — | `gh pr list --state open` |
| CI em `main` | verde (26/10 21:47) | — | `gh run list --branch main` |

A queda de 139 → 107 PRs não é perda de ritmo: o lote de 15–16/10 foi o pico do paralelismo (ver
`docs/learnings/general.md`, 16/10), e esta semana trocou volume por **5 PRE-ADRs, 10 BRIEFs e 39 cédulas** — o
trabalho foi mais de fechar decisão do que de abrir frente.

## 2. O que fechou (nó `done` na semana)

| Nó | Fechou | PRs | O que entregou |
|---|---|---|---|
| [[X14-CAIXA]], [[FE-INCR-SIMPLES]], [[DT-ARQ-CORRECOES]], [[FIX-ESTOQUE-FINALIZE]], [[FIX-ANALYTICS-DADO]], [[FIX-ADDEDFIELDS-VAZAMENTO]], [[BE-INCR-DT-NO-CONSUMER-CALLS]] | 20/10 (fold R0) | #729/#738/#739 · #733 · #769–#772 | Código já estava em `main` desde 16–19/10; o fold entrou no #775 |
| [[I6]] | 21/10 | — (fold #796) | Onboarding: nó fechado por docs |
| [[IRRF-DISTRIBUICAO]] | 23/10 | #794 · #863 · #864 · #865 | Sócios + IRRF/TJLP, distribuição com IRRF (Lei 9.250 art. 6º-A), JCP pro rata die, lançamento + e-Lalur + DARF 5706 |
| [[IBS-CBS-2027]] | 24/10 | #812 · #826 · #829 · #833 · #842 · #861 · #868 | Tabela IBS_CBS + cClassTrib, apuração mensal, crédito/antecipação, split payment no F7, matriz + export do contador; 7 achados de revisão corrigidos |
| [[FE-INCR-BANK-SETTLEMENT-FEE]] | 24/10 | #866 | Tarifa do provedor na tela de baixas |
| [[FIX-FE-DASHBOARD]] | 24/10 | #804 · #806 · #813 · #817 · #823 · #884 | §3.5 dos achados de 19/10: itens 3–22 e 28; 19 e 20 não reproduzem |
| [[TESTE-ACOPLAMENTO-PRESET]] | 24/10 | #883 | Teste-guarda preset↔schema; 20 chaves em `KNOWN_GAPS` que viraram critério de pronto de dois nós |
| [[W1]] | 24/10 | #889 · #890 · #891 | Customização da Entrevista com IA chega ao `/dashboard/create`; gpt-3.5 → gpt-4o-mini |

## 3. O que avançou e segue `inflight`

**Fiscal — onda F1 (prazo legal 01/12/2026 e 01/01/2027)**
- [[RETENCOES-FONTE]]: PR-1 (#888) e PR-2 (#893) em `main` pelo consolidado #902; achados A1–A6 do review independente corrigidos. PR-3/PR-4 **esperam o contador** (P-RET-4, P-RET-7..9).
- [[PRESUMIDO-TETO-78MI]]: PR único #887 em `main` (teto na `TAX_ASSESSMENT`, 400 `PRESUMIDO_TETO_EXCEDIDO`) — nó fechado no fold de 26/10 (P-PT-1..3 seguem com o contador).
- [[ISS-TRANSICAO-IBS]]: PR-1 #885 em `main` (fim do ISS_LIMITE em 2032, ISS_TRANSICAO 2029–2032, IBS DRAFT). PR-2 espera P-ISS-1..3.
- [[X9]]: PR-3 #908 em `main` (PIS/Cofins no MIT, item 18); PR-4 #860 (Real anual, item 19) **aberto**.
- [[X7]]: seção Presumido do perfil fiscal (#809) em `main`; restam os oráculos humanos (P-C1, P-C5).
- [[EFD-REINF]]: forks ratificados 22/10; PR-1 #912 **aberto** (26/10).
- [[NFE-DANFE-IBSCBS]]: PR-0 #906 e PR-1 #915 **abertos** (26/10); alvo do BRIEF: 30/11.
- [[EFICIENCIA-FISCAL]]: PR-1 #913 **aberto** (26/10); PR-2 bloqueado pelo [[X10a]].
- Parâmetros legais: #870 → #877 → #879 em `main` (publish recusa linha fora do formato; discriminador IBS_CBS; formato das 4 tabelas SIMPLES_*).

**H1 — PVA em Presumido** ([[H1]])
- Tentativa 3 (22/10): ECD com 0 erros no PVA; ECF importa depois do L10 (#837, ordem P200/P400) e do Y600 (L11, #841).
- Passo 6 espera ECD **assinada** → o fechamento de ECD/ECF virou o **último passo do plano** ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] §2). Ordem nova: H1 (1–5, feitos) → H2 → M2 → 1º cliente → H1 passo 6.

**Achados de 19/10 (molde operacional, seção E da fila)**
- E1 fechado 20/10 (4 PRs). E2 [[TESTE-ACOPLAMENTO-PRESET]] fechado. E6 [[FIX-FE-DASHBOARD]] fechado.
- E3 [[FIX-PLUGINS-VENDA]]: #897 em `main` (6 chaves de `KNOWN_GAPS` zeradas); resíduo #898 aberto.
- E7 [[FIX-ANALYTICS-RESIDUO]]: #894 em `main` (14 chaves); #899 (decisão das colunas do KPI mixed) aberto.
- E4 [[FIX-AUTH-CONTA]]: lotes 1–4 em `main` (#808, #828, #831, #839). Esperam o dono: #10/#11, #20; #19 vai a BRIEF (CSRF).
- E5 [[FIX-CHAT-AGENTE]]: lotes A–C em `main` (#835, #836, #838), 22 itens instrumentados. Esperam o dono: #6 (guardar bytes), #10, #11, #16, #17, #18, #20 e a parte "COMPLETED silencioso" do #14.
- DynamicTable: datetime sem fuso → 400 (#892); agente pede ISO com offset (#902).

**Onboarding e FE**
- [[W6]] (#785/#786) em `main` — nó `human-open` (decisão de rota/remoção do painel).
- [[W3]]: BRIEF da confirmação fechado (#788); F-W3-C1..C3 pendentes.
- [[FE-INCR-KANBAN-REORDER]]: código em `main` (#824); conferência na tela **FALHOU no passo 4** (#886) → fix mínimo #895 + EMENDA 1 #896 em `main` (refetch no evento `online`); passos 5–10 não rodados. Regra nova: runbook de tela rodado pelo agente pode ter desfecho/assinatura do agente ([[D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR]]).

**Financeiro**
- [[F5]]: FE da cobrança Mercado Pago (#862) em `main`. Falta: itens 16b/16c (PR-0 de BE), chave no env do M2, fase CNAB (D6).

**Plataforma e arquitetura**
- [[OBS]]: Fases A e C em `main` (pilha #867→#880 + #872 consolidada no #882); Fase B parcial (registro de acesso NDJSON, `ALERT_WEBHOOK_URL` obrigatória no runbook M2).
- R2b: `fetch()` cru barrado fora da service layer (#780) e dívida paga 27 → 0 (#784). `openapi.json` regerado (#787). Mutation testing por diff vira o principal (#805).
- ADR-MODULE-BOUNDARIES Proposed (#781). PRE-ADRs novos: BUILDER-VERTICAIS (#791), OPEN-FINANCE-EXTRATO (#850), FECHAMENTO-ASSISTIDO (#855), VENDA-RECEBIVEL (#857), FOLHA-CONTABILIZACAO (#858). BRIEF E-1 devolução (#856) + fix do cancelamento que estorna CMV/passivo/pacote (#849).

**Plano e governança**
- Régua F (22 nós TOTVS/Salesforce/Power BI) ratificada em Q1/Q2 (20/10, [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]); lista de BRIEFs para passar o Odoo com 6 nós propostos ([[D-2026-10-22-LISTA-BRIEFS-ODOO]]) — **Q4–Q12 seguem abertas**.
- [[D5]] decidido: NFS-e do 1º cliente **pelo portal** desde 01/11, releitura pelo `ManualEmissor`; sem guarda de certificado; caminho ADN arquivado.
- Contador: pedido + triagem do pacote F1 (#801/#811), dossiê `gates-humanos-lei` (#876). [[GOV-CONTADOR]]: F-GOV-1/A7 (#904/#905) abertos.

## 4. PRs abertos em 26/10 (19) — ordem de pilha para o OK do dono

| Pilha | PRs (base → topo) | Nó | Observação |
|---|---|---|---|
| X9 | #860 | [[X9]] | PR-4, Real anual no MIT — fecha o nó |
| Plugins de venda | #897 ✅ → #898 | [[FIX-PLUGINS-VENDA]] | resíduos i18n SALE/RETURN, compra → Payable |
| Analytics | #894 ✅ → #899 | [[FIX-ANALYTICS-RESIDUO]] | só docs (colunas do KPI mixed) |
| Governança do contador | #904 · #905 | [[GOV-CONTADOR]] | só docs |
| DANFE IBS/CBS | #906 → #915 | [[NFE-DANFE-IBSCBS]] | PR-0 (docs) → PR-1 (leitor do DANFE 55) |
| ITG 2000 | #907 (draft) | — | teste-guarda vermelho (histórico do estorno/extemporâneo); nó a definir |
| X10a | #909 → #910 → #914 → #917 | [[X10a]] | PR-0 docs → NFCE na porta → IE/séries + ProductFiscalProfile → montagem 55/65 do Simples. **A nota do nó ainda diz `blocked`** — fold pendente nesses PRs |
| C8 emenda 3.2 | #911 → #918 | [[C8]] | bem ≤ R$ 1.200 na despesa → benfeitoria em imóvel de terceiro |
| EFD-Reinf | #912 | [[EFD-REINF]] | PR-1: R-1000/R-4020/R-4099 + lote |
| Eficiência fiscal | #913 | [[EFICIENCIA-FISCAL]] | PR-1: combo itemizado, alocação do desconto, piso e guarda |
| LAC-B EMENDA-2 | #916 → #919 | [[LAC-B]] | steps na view + retomada → aba "Kit de setor" |

Merge **só por número** (CLAUDE.md §Merge só com PR nomeado). Pilhas empilhadas pedem rebase do filho antes do pai
(memória `squash-merge-quebra-prs-empilhados`).

## 5. O que espera o dono (não é código)

1. **OK de merge** dos 19 PRs acima, por número.
2. **Decisões de produto** em FIX-AUTH-CONTA (#10/#11, #20), FIX-CHAT-AGENTE (#6, #10, #11, #16, #17, #18, #20, parte do #14), Kanban (alinhar tela × rebalanceio parcial; passos 5–10 do runbook), [[W6]] (rota ou remoção), W3 (F-W3-C1..C3), E8 (push do BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS`).
3. **Régua F:** Q4–Q12 (entrada dos 6 nós, ordem por ondas, instrumentar devolução/cancelamento).
4. **Contador:** P-RET-4/7..9 (destrava RETENCOES PR-3/4), P-EF-1..6, P-ISS-1..3, P-PT-1..3, D1f (cClassTrib), D2 (XML real).
5. **Gates humanos:** [[H2]] (sign-off de browser, runbooks em branco) → [[M2]] (VPS contratada; chave MP; `ALERT_WEBHOOK_URL`) → 1º cliente → [[H1]] passo 6 + assinaturas (P4). [[D7]] PNCT até 31/12.
6. **Emissão:** quem contrata PSC + e-CNPJ do Luminaris ([[D5]], resto aberto).

## 6. Riscos e inconsistências que a revisão expôs

- **Folds vencidos (corrigidos no PR desta revisão, 26/10):** sete notas diziam "sem merge" para PRs já em `main` —
  RETENCOES-FONTE (#888/#893 via #902), PRESUMIDO-TETO-78MI (#887 → `done`), ISS-TRANSICAO-IBS (#885), FIX-PLUGINS-VENDA
  (#897 → `inflight`, resíduo #898), FIX-ANALYTICS-RESIDUO (#894 → `inflight`, doc #899), OBS (#882) e
  FE-INCR-KANBAN-REORDER (#896). Causa: os merges de 24–25/10 vieram por consolidados (#902/#903), que não carregam fold.
- **Vault × PRs do fim de semana:** [[X10a]] está `blocked` no frontmatter, mas 4 PRs de código (#909–#917) foram abertos em 26/10 sob autorização que a nota não cita. O fold deve vir nesses PRs; até lá o `_INDEX` subestima a frente fiscal.
- **Concentração de PRs abertos** (19, maioria de 25–26/10): mesma classe do lote de 16/10 (conflito por frentes partindo da mesma `main`). Mitigação: mergear por pilha, base primeiro; regenerar snapshot de DTO na `main`, não no PR (memória `dto-snapshot-update-reordena-no-windows`).
- **Prazo 01/12/2026 (NT 2026.010)** depende de PR-2/PR-3 do DANFE que ainda não existem; PR-0/PR-1 abertos em 26/10. Com o ritmo da semana (3–4 PRs de feature/dia), cabe; sem OK de merge, não.
- **01/11/2026 (NFS-e nacional)** não exige código: o cliente emite no portal e o `ManualEmissor` já está em `main`. Exige o cliente saber operar o portal — fora do repo.
- **Oráculo externo continua o gargalo** (4/4 do Bloco A abertos há > 14 dias): H2, M2, contador, XML real. A régua de código já está em 55/63; dos 8 restantes, 6 dependem de gate humano ou de terceiro (X10a/X10i/X11 ← D5/PSC; F6 ← chave MP; CSLL-RESSEGURADORES ← ADE RFB; RETENCOES ← contador).

## 7. Projeção de milestones (do agente; não ratificada)

Premissas: ritmo medido da semana (107 PRs, 14 nós fechados, ~3 PRs de feature/dia); o dono dá o OK de merge em
até 2 dias; gates humanos são janelas propostas, não compromissos. Datas legais estão verificadas no vault.

| # | Milestone | Tipo | Data | Base |
|---|---|---|---|---|
| L1 | NFS-e nacional obrigatória (ME/EPP Simples) — cliente emite no portal | **legal** | 01/11/2026 | Res. CGSN 191 art. 3º I ([[D5]]) |
| L2 | DANFE com IBS/CBS em produção (NT 2026.010) e NF-e p/ não contribuinte de ICMS | **legal** | 01/12/2026 | [[NFE-DANFE-IBSCBS]]; Ato Conjunto RFB/CGIBS 4/2026 ([[D7]]) |
| L3 | PNCT — vigilância de comunicações | **legal** | 31/12/2026 | [[D7]] |
| L4 | CBS plena + IBS teste; Simples pela LC 214 | **legal** | 01/01/2027 | [[IBS-CBS-2027]] (em `main`) |
| L5 | Transição ISS → IBS | **legal** | 2029–2032 (fim LC 116 em 2033) | [[ISS-TRANSICAO-IBS]] PR-1 em `main` |
| P1 | Fila de 19 PRs zerada (merge por pilha) | projeção | 28–30/10 | depende só do OK do dono |
| P2 | DANFE PR-2/PR-3 em `main` (fecha o nó antes do L2) | projeção | 07–14/11 | alvo do BRIEF 30/11 |
| P3 | EFD-Reinf PR-2..PR-4 em `main` | projeção | 06–13/11 | PR-1 aberto; sem fork pendente |
| P4 | Onda 0 da régua F fechada (F5 FE ✅ · RETENCOES PR-1/2 ✅ · IBS-CBS PR-5 ✅ · EFD-REINF) | projeção | 13/11 | RETENCOES PR-3/4 ficam fora (contador) |
| G1 | [[H2]] sign-off de browser | gate humano | janela 27/10–07/11 | runbooks prontos; H1 1–5 feitos |
| G2 | [[M2]] host + 1º deploy | gate humano | janela 10–21/11 | VPS contratada; depende de G1 |
| G3 | 1º cliente operando (NFS-e pelo portal + releitura) | gate humano | dez/2026 | depende de G2; data do dono |
| G4 | [[H1]] passo 6 + assinaturas (ECD/ECF) | gate humano | "último do último" — após G3 | [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] |
| P5 | Onda 1 venda e recebível (8 nós: EMAIL-TRANSPORT … GORJETA) | projeção | PRE-ADR+BRIEF 2 sem. após Q10–Q12; código fim nov → meados dez | nenhum nó existe ainda em `nos/` |
| P6 | Onda 2 (3 nós) → passa o Odoo na régua de 32 (26,5) | projeção | dez/2026 → jan/2027 | [[D-2026-10-22-LISTA-BRIEFS-ODOO]] |
| P7 | Onda 3 (6 nós) → 31/32 | projeção | jan–fev/2027 | — |

## Artefato

Roadmap + próximas tarefas (aba 1) e prazos + milestones (aba 2), gerados desta revisão:
`docs/plano/artefatos/roadmap-2026-10-26.html` (cópia versionada) · publicado em <https://claude.ai/artifact/DFAx2AbkzgsdQEBrB8a7R4>
(aba 1 `#roadmap`, aba 2 `#prazos`; privado até o dono compartilhar).
