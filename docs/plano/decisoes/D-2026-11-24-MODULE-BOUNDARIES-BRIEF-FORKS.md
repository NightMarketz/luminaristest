---
id: "D-2026-11-24-MODULE-BOUNDARIES-BRIEF-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks do BRIEF de execução do ADR-MODULE-BOUNDARIES (F-MBE-1..12) e critério components × features — questionário do dono em 24/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Sim, abrir forks\"; questionário (AskUserQuestion) em 5 blocos. Respostas literais: F-MBE-1 → \"Branch de integração\"; F-MBE-2 → \"Um PR por feature (Recommended)\"; F-MBE-3 → \"Regra nova M3 (Recommended)\"; F-MBE-4 → \"D2-domain-is-pure (Recommended)\"; F-MBE-5 → \"Camada dentro do país (Recommended)\"; F-MBE-6 → \"Um movimento: paises/br/domain/ (Recommended)\"; F-MBE-7 → \"Reader com inTx(tx) (Recommended)\"; F-MBE-8 → \"features/chat/widgets/ (Recommended)\"; F-MBE-9 → \"Aqui na realidade eu me confundi, precisamos separar o que são components do que são as features\" e, na pergunta refeita, \"Vai para features/shell/\"; critério components × features → \"Components deveriam ser o visual e em feature a lógica de frontend não?\" e, na confirmação, \"Sempre divide em dois\"; F-MBE-10 → \"Lint com tipo (Recommended)\"; F-MBE-11 → \"O renome primeiro (Recommended)\"; F-MBE-12 → \"Backend e frontend separados\". Escopo: ratificar os forks do BRIEF. Não é 'executa'."
atualizado: "2026-11-24"
---
# D-2026-11-24-MODULE-BOUNDARIES-BRIEF-FORKS — forks do BRIEF de execução do ADR-MODULE-BOUNDARIES

**Estado:** `decided`
**Autorização:** dono, 2026-11-24, questionário (respostas literais no cabeçalho). Escopo: **ratificar os forks do BRIEF**.
Não autoriza código: ligar regra e mover pasta continuam pedindo "executa".

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §7 (forks F-MBE-1..11, nascidos da medida de
24/11 na `main` `d3f3a201c`) e o F-MBE-12, que nasceu da resposta ao F-MBE-1. Nó: [[MODULE-BOUNDARIES]].

> "F-MBE" = forks de **e**xecução do ADR-MODULE-BOUNDARIES. Não confundir com F-MB-1..12 (a ratificação do ADR, na decisão
> `D-2026-11-24-MODULE-BOUNDARIES-FORKS`, PR #1366) nem com os F-MB de [[D-2026-10-31-MODULOS-BASE-SUBMODULOS]].

## Forks

| Fork | Decisão | Recomendação seguida? |
|---|---|---|
| F-MBE-1 onde os PRs entram | **(b)** branch de integração | não (rec. era direto na `main`) |
| F-MBE-2 tamanho do PR que liga a `M2` | **(c)** um PR por feature: cada PR move as pastas de uma feature e acrescenta a feature à regra | sim |
| F-MBE-3 `public/` cega as regras de camada | **(a)** regra nova `M3`: `public/` não importa `repositories/`; `L5`/`L6` tratam `public/` de outra feature como camada executável, salvo `*.types.ts`; `export *` e import por efeito colateral em `public/` barrados no lint | sim |
| F-MBE-4 nome da regra de pureza | **(a)** `D2-domain-is-pure` (o nome `D1` segue com a regra do DP) | sim |
| F-MBE-5 `M2` × `paises/<cc>/` | **(a)** sem exceção: dentro de `paises/<cc>/` valem as pastas de camada | sim |
| F-MBE-6 destino de `accounting/fixtures/` | **(a)** um movimento só, para `accounting/paises/br/domain/` | sim |
| F-MBE-7 `DynamicTableReader` × transação | **(a)** o reader tem `inTx(tx)`; o re-check do `convertLead` segue dentro da transação | sim |
| F-MBE-8 widget de chat no frontend | **(a)** `features/chat/widgets/`, pelo critério abaixo (a parte visual fica em `components/`) | sim |
| F-MBE-9 feature do `Navbar` | `features/shell/` (mantém o F-MB-10 b), pelo critério abaixo | sim (da pergunta original; na refeita a rec. era deixar em `components/`) |
| F-MBE-10 como a regra de posse reconhece o Prisma | **(b)** lint com informação de tipo; o PR mede o tempo do job | sim |
| F-MBE-11 branches `modulos-base-pr5/pr6` × renome de `presets/` | **(a)** o renome de `dynamicTables` entra primeiro; as branches rebaseiam por cima | sim |
| F-MBE-12 como a integração chega à `main` (novo) | duas integrações: uma para todo o backend, outra para o frontend | não (rec. era uma integração por etapa) |

## Critério components × features (my-app)

Palavras do dono: *"Components deveriam ser o visual e em feature a lógica de frontend não?"* Na confirmação, sobre a peça
que hoje mistura os dois: *"Sempre divide em dois"*.

Regra que fica:

- `components/` = **só o visual**. Recebe dado e ação por props ou contexto. Nunca chama `lib/services/`.
- `features/<x>/` = **a lógica de frontend**. Chama serviço, guarda estado de domínio e renderiza o visual.
- Peça mista **sempre se divide**: a parte visual fica em `components/` recebendo props; o container com a lógica nasce
  na feature.

```
// antes
components/widgets/crm-report/CrmReportWidget.tsx   (desenha + chama crmReports.service)
// depois
components/widgets/crm-report/CrmReportView.tsx     (só desenha; recebe { data, onRefresh })
features/crm/widgets/CrmReportWidget.tsx            (chama crmReports.service e renderiza <CrmReportView … />)
```

Leitura do agente (não é palavra do dono): aplicado ao `Navbar`, as duas respostas ("Vai para features/shell/" e "Sempre
divide em dois") dão a parte visual em `components/layout/` e o container com `useAuth()` e `updatePreferences` em
`features/shell/`. Se o dono quis o `Navbar` inteiro em `features/shell/`, a correção é uma linha no BRIEF.

## Consequências que a combinação das respostas cria

1. **F-MBE-1 (b) + F-MBE-12:** duas branches, `integration/module-boundaries-be` (P0, P1, ligação, renome, reader,
   `RuleDataAccess`, posse, `J1`, `M1a`) e `integration/module-boundaries-fe` (frontend). A trava do server só chega à
   `main` quando o backend inteiro fechar. Até lá o F-MB-8 (a) ("tudo ligado já") vale dentro da integração, e a `main`
   segue sem a regra: sem trava, a `M1` cresceu de 264 para 393 arestas em 35 dias. O PR de fechamento mede de novo e o
   baseline gravado é o do dia do fechamento.
2. **F-MBE-1 (b) + F-MBE-2 (c):** o renome vive na branch de integração. A janela "sem PR paralelo na pasta" do BRIEF §3.3
   deixa de ser por PR e passa a ser a do fechamento: a integração absorve a `main` (merge) antes de cada PR de renome e
   antes de fechar, e move para o destino os arquivos que a `main` criou na pasta antiga nesse intervalo.
3. **F-MBE-3 (a) + F-MBE-4 (a)** são regra a mais e nome diferente do que o ADR escreveu: entram como emenda datada ao
   `ADR-MODULE-BOUNDARIES.md` no PR que ligar as regras.
4. **F-MBE-3 (a) no P0:** com a forma da `public/` decidida, o P0 já nasce com
   `accountingBinding/public/bindingScope.types.ts` (o tipo, para as policies) e `public/bindingScope.ts` (as duas
   funções), e os 13 imports de `sectorKits` apontam para lá.
5. **F-MBE-6 (a):** o centro (`PostingService`) importa o `ChartOfAccountsFixture`, e a `P1` do ADR-PAIS-NA-BORDA proíbe o
   centro importar `paises/`. O movimento pede a porta que o F-PBF1-7 do BRIEF da F1 do país na borda discute; enquanto
   ela não existir, `accounting/fixtures/` fica no baseline da `M2` como etapa declarada.
6. **O critério components × features** dá destino aos 11 casos da `U8` e revê o texto do ADR §3 ("widget de domínio mora
   em `features/<x>/widgets/`"): mora lá a lógica; o visual fica em `components/`.

## O que esta decisão não faz

- Não liga regra, não move arquivo, não cria branch de integração. O código espera "executa".
- Não emenda o `ADR-MODULE-BOUNDARIES.md` neste PR: o texto Accepted ainda está no PR #1366. As emendas (itens 3 e 6)
  entram no PR que ligar as regras.
