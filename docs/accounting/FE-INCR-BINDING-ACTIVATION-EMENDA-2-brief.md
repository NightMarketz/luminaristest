# FE-INCR-BINDING-ACTIVATION — EMENDA 2 (a tela mostra o kit de setor: versão instalada e pendências da atualização)

> `sessao-planejamento`, 2026-10-14, base `origin/main` `03c51e7c`. **Emenda** ao BRIEF
> [`FE-INCR-BINDING-ACTIVATION-screen-brief.md`](FE-INCR-BINDING-ACTIVATION-screen-brief.md) e à
> [EMENDA-1](FE-INCR-BINDING-ACTIVATION-EMENDA-1-brief.md) (nó [`LAC-B`](../plano/nos/LAC-B.md)). Sem código.
> **Cada PR exige "executa" próprio** (ORCH-006).
>
> **Autorização, literal:** dono, chat, 2026-10-14: *"Planeja a emenda da tela de ativação para mostrar o kit de setor
> (versão instalada, pendências de upgrade) — sessao-planejamento, só BRIEF, sem código"*. Cobre só este documento.
> Observação: a mensagem trazia a data como o placeholder literal `<data>`; a data acima é a da sessão em que o dono
> escreveu. Se a autorização for de outra data, corrigir aqui.
>
> **Origem:** a lacuna L-3 de [D-2026-10-14-LAC-B-PR0-LACUNAS](../plano/decisoes/D-2026-10-14-LAC-B-PR0-LACUNAS.md)
> (*"Versão e pendências do kit ficam como achado, para uma emenda futura"*) e o
> [`BE-INCR-KIT-SETOR-brief.md`](BE-INCR-KIT-SETOR-brief.md) §7 (*"o BRIEF da tela precisa de emenda para mostrar o kit
> (versão, pendências) em vez de só o binding"*).
>
> **Em duas linhas:** um PR de FE lê o `GET /accounting-kit` (já em `main`) e mostra, na AccountingView, o kit da
> unidade: versão instalada, versão mais nova, pendências abertas e instalação que falhou no meio. **Risco principal:**
> o binding fica `Active` no passo 5 e a instalação pode falhar nos passos 6–7; hoje a faixa some quando há `Active`, e
> esse kit `FAILED` fica invisível na tela.
>
> **Nome:** este documento é a emenda da tela da LAC-B. O `FE-INCR-KIT-SETOR` mais amplo (editor papel→conta, decidir
> pendências, rastro) segue **não aberto** (§8).

## 0. Fatos (lidos nesta sessão, em `origin/main` `03c51e7c`)

| # | Fato | Fonte |
|---|---|---|
| F1 | `GET /api/accounting-kit?unitId=` devolve `KitInstallationView \| null`: `{kitKey, kitVersion, latestVersion, status, lastRun, openPendingCount, changelog[]}` | `server/src/routes/accounting-kit.ts`; `features/sectorKits/dtos/KitUpgradeDto.ts` (`KitInstallationViewSchema`); `KitUpgradeService.view()` |
| F2 | `GET /api/accounting-kit/pending?unitId=&status=` devolve `KitUpgradePendingView[]` (`itemKey`, `reason`, `kitValue: unknown`, `tenantValue: unknown`, `status`…) | `kitUpgradeController.ts:51-60`; `KitUpgradeDto.ts` |
| F3 | As duas leituras passam por `canManageKit`, que hoje é `!!scope.actorUserId` (todo usuário logado) | `policies/SectorKitPolicy.ts:14-16`; `KitUpgradeService.ts:108`; `KitPendingService.ts:84-110` |
| F4 | `status` do kit ∈ `INSTALLING \| INSTALLED \| FAILED`; `lastRun.status` ∈ `PLANNED \| APPLIED \| PARTIAL \| FAILED` | `models/kitInstallTypes.ts`; `models/kitUpgradeTypes.ts` |
| F5 | A view **não** expõe `steps` (último passo concluído) nem os avisos `KIT_REFERENTIAL_SKIPPED_NO_REGIME/_NO_CATALOG` | `KitUpgradeService.view()` (linhas 107-125) |
| F6 | O compile é o passo 5 de 7; os passos 6 (padrões fiscais) e 7 (referencial) rodam **depois** do `Active`. Falha neles ⇒ binding `Active` + kit `FAILED` | `kitInstallTypes.ts` (`KIT_INSTALL_STEPS`); `KitInstallService.ts:179-209` |
| F7 | `POST /accounting-binding/activate-default` com o **mesmo** setor e kit não `INSTALLED` cai no `install()`, que retoma do primeiro passo não concluído (passos idempotentes) | `BindingActivationService.ts:95-107,143-160`; `KitInstallService.ts:11-13,179` — **inferido por leitura, não executado** |
| F8 | A resposta do `activate-default` já traz `kit?: {kitKey, kitVersion, status}`, sem os avisos | `my-app/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen.ts:28-30` |
| F9 | Atualizar o kit só acontece pelo CLI `upgradeSectorKitsCli` no deploy; não há rota HTTP de upgrade | `BE-INCR-KIT-SETOR-brief.md` item 34; `routes/accounting-kit.ts` (sem POST de upgrade) |
| F10 | A faixa `AccountingActivationBanner` renderiza só com `inactive`; com `active` some (ou mostra a tira de sucesso logo após ativar) | `my-app/features/accounting/components/AccountingActivationBanner.tsx` |
| F11 | A AccountingView monta a faixa só fora do modo cliente (`!governance && unitId`), com `key={unitId}` | `AccountingView.tsx:268-278` |
| F12 | A aba Pendências do I5 **não existe** em `TABS` (13 abas, nenhuma `pendencias`); `PENDENCIAS_TAB` é `undefined` hoje | `AccountingView.tsx:51-101` |
| F13 | O FE tem os tipos gerados do kit (`KitUpgradeDto.gen.ts`, `KitInstallationDto.gen.ts`…) e **zero** chamadas a `/accounting-kit` | `my-app/types/contracts/sectorKits/`; grep em `my-app` |

## 1. Divisão em PRs

| PR | Conteúdo | Condição |
|---|---|---|
| PR-0 (BE, aditivo) | `KitInstallationView` ganha `steps` (último passo + avisos) + teste de integração da retomada pela rota (§10) | F-KA-4 → (b): **sim** |
| PR-1 (FE) | serviço, hook, aba "Kit de setor", versão, pendências só leitura, retomada, avisos | depois do PR-0 |
| PR-2 (FE) | aceitar/recusar pendência com `motivo` (§10) | F-KA-2 → (c); depois do PR-1 |

## 2. Checklist de comportamentos (cada um testável isoladamente)

### PR-0 — só se F-KA-4 → (b)

0. **`KitInstallationViewSchema` + `steps: { lastCompletedStep: number, warnings: KitInstallWarning[] }`.** O
   `KitUpgradeService.view()` lê o `steps` já gravado na `KitInstallation` (`KitInstallStepsSchema`). Aditivo, sem
   migração. Gates no mesmo PR: snapshot de shape dos DTOs (`dtoShapeSnapshot`), regeneração do
   `my-app/types/contracts/sectorKits/KitUpgradeDto.gen.ts`, doc do `docs.paths.ts` (sem rota nova, o guard de
   path-count não muda). *Teste:* falha injetada no passo 7 ⇒ a view traz `status: 'FAILED'`,
   `steps.lastCompletedStep: 6`.

### PR-1 — a tela

1. **Serviço** `my-app/lib/services/accountingKit.service.ts`: `getKit(unitId) → KitInstallationView | null` e
   `listPending(unitId, status?) → KitUpgradePendingView[]`, pelo cliente HTTP canônico dos outros serviços da pasta.
   Tipos por `import type` dos `.gen.ts` (nunca importar do backend). *Teste:* monta a URL com `unitId` e desembrulha
   `data`.
2. **Hook** `useUnitKit(unitId)` → `{ state: 'loading' | 'none' | 'loaded' | 'error', kit?, reload }`, com a regra de
   "só a última carga vale" do `useUnitAccountingActivation`. `null` do BE ⇒ `none`. *Teste:* troca de unidade descarta
   a resposta atrasada; erro ⇒ `error` e a tela segue de pé.
3. **Superfície (F-KA-1).** Na recomendação (b): componente irmão `AccountingKitStatus` montado pela AccountingView
   logo abaixo da faixa de ativação, só quando a unidade tem `KitInstallation` (`state === 'loaded'`). A faixa da LAC-B
   não muda de contrato (F-BA-1 a segue: só aparece sem `Active`). *Teste:* `none` ⇒ não renderiza; `loaded` ⇒ renderiza.
4. **Modo cliente (F-KA-6).** Na recomendação (a): fora no modo cliente, como a faixa (F11): com `governance` o
   componente não renderiza e o hook não chama a rota. *Teste:* com `governance` definido, zero chamada ao serviço.
5. **Versão.** Mostra o setor (rótulo de `ACTIVATION_SECTOR_LABELS`; chave desconhecida ⇒ a `kitKey` crua) e
   "versão `kitVersion`". *Teste:* rótulo do salão e da clínica; chave fora do registry cai na `kitKey`.
6. **Versão mais nova (F-KA-5).** Com `latestVersion > kitVersion`: texto conforme o fork, mais o `changelog` (as
   entradas das versões entre a instalada e a última) recolhido por padrão. Com `lastRun?.status === 'FAILED'`, o
   texto diz que a última atualização falhou. Com `latestVersion === kitVersion`, nada além da versão.
   *Teste:* os três casos.
7. **Pendências (F-KA-2).** `openPendingCount > 0` ⇒ contador visível. Na recomendação (b): botão "ver" expande uma
   lista **somente leitura** (`listPending(unitId, 'OPEN')`, carregada só ao expandir) com `itemKey` e o rótulo do
   `reason` (7 códigos de `CONFLICT_REASONS`, i18n). `kitValue`/`tenantValue` não são exibidos (são `unknown`).
   Nenhum botão de aceitar/recusar. *Teste:* contador 0 ⇒ sem bloco; expandir chama a rota uma vez; código de motivo
   desconhecido mostra o código cru.
8. **Instalação incompleta (F-KA-3).** `status === 'FAILED'` ⇒ aviso "a instalação do kit parou no meio" (com o passo,
   se F-KA-4 → b). Na recomendação (a): botão "Retomar instalação" com `ConfirmModal` que chama
   `accountingBindingService.activateDefault({unitId, sectorKey: kit.kitKey, installChartIfEmpty: true,
   openCurrentPeriodIfMissing: true})` (F7), depois `reload()` do kit e da ativação. Resultado `Draft` ⇒ mesma lista de
   bloqueantes da faixa (reusar o render dos bloqueantes — extrair do banner, não copiar). Erro ⇒ `resolveError`.
   `status === 'INSTALLING'` ⇒ conforme a sub-decisão do F-KA-3. *Teste:* `FAILED` ⇒ botão; confirmar chama
   `activateDefault` com o `kitKey` da instalação; `Draft` lista os bloqueantes; sucesso recarrega.
9. **Avisos do referencial (F-KA-4).** Só com (b): `steps.warnings` não vazio ⇒ aviso por código
   (`KIT_REFERENTIAL_SKIPPED_NO_REGIME`: "o referencial não foi instalado porque a empresa não tem regime definido";
   `_NO_CATALOG`: "não há referencial publicado para o ano"). Só texto, sem link (a tela do regime é outro nó).
   *Teste:* cada código vira o rótulo; lista vazia ⇒ nada.
10. **Depois de ativar.** A tira de sucesso da faixa (F10) passa a recarregar também o `useUnitKit`, para a versão
    aparecer sem trocar de aba. A tira em si não muda. *Teste:* sucesso do `activateDefault` ⇒ `reload` do kit chamado.
11. **i18n:** paridade pt/en em `public/locales/{pt,en}/accounting.json`, namespace já carregado (`accounting`), chaves
    `kit.*` (versão, mais nova, changelog, pendências, 7 motivos, falha, retomar, modal, avisos). Gate de paridade do
    `skill-audit wiring`.
12. **Testes vitest** dos itens 1–10 (shim `globalThis.React` no teste; `vi.mock` com caminho relativo ao arquivo de
    teste). Estado assíncrono assertado pelo DOM (`findBy*`), não por `toHaveBeenCalled` dentro de `waitFor`.
13. **Gates do PR-1:** `cd my-app && npx tsc --noEmit` **e** `npm run test:types`; `npm run check:arch`; tela atrás de
    `withAuth` ⇒ verificação contra **build de produção**; `neutral-*`, cards `rounded-2xl`.
14. **Runbook de sign-off de browser em branco** (`docs/operating-manual/RUNBOOK-FORMAT.md`): unidade com kit
    `INSTALLED` atual · com versão mais nova (dev.db com kit v1 e registry em v2) · com pendência aberta · com kit
    `FAILED` (falha injetada) → retomar. Evidência, desfecho e assinatura são do dono.

## 3. Camadas

Só FE no PR-1: `lib/services/` (serviço) → `features/accounting/hooks/` (hook) → `features/accounting/components/`
(componente) → `AccountingView` (montagem). Sem contexto novo. PR-0 fica no `features/sectorKits/` existente
(Service + DTO), sem rota nova.

**Reuso:** `ConfirmModal`, `notify`, `resolveError`, `useAccountingT`, `ACTIVATION_SECTOR_LABELS` e o render dos
bloqueantes da faixa (extraído para um componente compartilhado no próprio PR). Bespoke × `Alert` canônico: mesma
justificativa já registrada no banner (o `Alert` recebe só uma `message` string, sem slot para lista e botão).

## 4. Contratos esboçados

```ts
// my-app/lib/services/accountingKit.service.ts — tipos dos .gen.ts (import type)
import type { KitInstallationView, KitUpgradePendingView } from '../../types/contracts/sectorKits/KitUpgradeDto.gen';

export const accountingKitService = {
  getKit(unitId: string): Promise<KitInstallationView | null>;                 // GET /accounting-kit?unitId=
  listPending(unitId: string, status?: 'OPEN' | 'ACCEPTED' | 'REJECTED')
    : Promise<KitUpgradePendingView[]>;                                          // GET /accounting-kit/pending
};

// my-app/features/accounting/hooks/useUnitKit.ts
export type UnitKit =
  | { state: 'loading' | 'none' | 'error' }
  | { state: 'loaded'; kit: KitInstallationView };
export function useUnitKit(unitId: string, opts: { enabled: boolean }): UnitKit & { reload: () => void };

// my-app/features/accounting/components/AccountingKitStatus.tsx
export interface AccountingKitStatusProps {
  unitId: string;
  /** Recarrega a ativação da unidade depois de uma retomada (item 8). */
  onActivationChanged: () => void;
}
```

PR-0 (só F-KA-4 → b), aditivo em `KitUpgradeDto.ts`:

```ts
export const KitInstallationViewSchema = z.object({
  /* …campos atuais… */
  steps: z.object({
    lastCompletedStep: z.number().int().min(0).max(7),
    warnings: z.array(z.enum(KIT_INSTALL_WARNINGS)),
  }).strict(),
}).strict();
```

## 5. Forks — ratificados 16/10 por questionário (§10)

### F-KA-1 — Onde o kit aparece
- **(a)** A faixa da LAC-B ganha um estado `active` com a tira do kit. Um componente só; muda o contrato ratificado
  F-BA-1 (a), que diz "faixa só sem `Active`", e os testes do banner.
- **(b)** Componente irmão `AccountingKitStatus`, montado pela AccountingView abaixo da faixa, quando há
  `KitInstallation`. A faixa fica como está.
- **(c)** Aba nova "Kit de setor" em `TABS`.
- **Recomendação: (b).** Não reabre o F-BA-1 e não mexe nos testes do banner. Uma aba (c) é cerimônia demais para
  quatro informações e repete o caminho que o F-BA-3 rejeitou (só link, sem aba nova). **RATIFICADO 16/10 → (c)** (fora da recomendação; [D-2026-10-16-LAC-B-EMENDA-2-FORKS](../plano/decisoes/D-2026-10-16-LAC-B-EMENDA-2-FORKS.md)).

### F-KA-2 — Até onde vão as pendências
- **(a)** Só o contador ("3 pendências da atualização do kit").
- **(b)** Contador + lista somente leitura (`itemKey` + rótulo do motivo), carregada ao expandir.
- **(c)** Lista com aceitar/recusar e `motivo` (as rotas `POST …/accept|reject` existem).
- **Recomendação: (b).** O pedido é *mostrar* as pendências; (a) mostra só que existem. (c) é decidir, e decidir
  pendência muda binding e plano (aceitar `override` recompila; aceitar `account_deleted_by_user` restaura conta).
  Isso é o `FE-INCR-KIT-SETOR` amplo, com fluxo próprio de confirmação e de 422 (`KIT_PENDING_COMPILE_DRAFT`,
  `KIT_PENDING_FROZEN_YEAR`), fora desta autorização (regra 5). **RATIFICADO 16/10 → (c)** (fora da recomendação; vira PR-2, §10).

### F-KA-3 — Kit `FAILED` (e `INSTALLING`) com binding `Active`
- **(a)** Aviso + botão "Retomar instalação" que chama o `activate-default` com o mesmo setor (F7).
- **(b)** Só o aviso, sem ação ("procure o suporte"; a retomada fica no CLI).
- **Sub-decisão para `INSTALLING`:** (i) tratar como `FAILED` (mesmo botão); (ii) mostrar "em andamento" sem botão.
  `INSTALLING` é tanto instalação em curso quanto processo que morreu no meio; a view não distingue os dois.
- **Recomendação: (a) + (ii).** (a) usa uma rota e um caminho de retomada que já existem e são idempotentes por passo
  (F7, lido, **não executado** — o item 8 tem de provar com teste de integração do lado BE, se ainda não houver).
  (ii) porque um clique durante uma instalação em curso cairia no `begin` concorrente. O `INSTALLING` abandonado
  fica sem saída na tela (achado §8). **RATIFICADO 16/10 → (a) + (ii).**

### F-KA-4 — A view do kit expõe passo e avisos?
- **(a)** Só FE. A tela diz "parou no meio" sem dizer onde, e não mostra os avisos de referencial.
- **(b)** PR-0 BE aditivo: `steps` na `KitInstallationView` (§4).
- **Recomendação: (b).** O aviso `KIT_REFERENTIAL_SKIPPED_NO_REGIME` é o único sinal acionável que o usuário recebe da
  instalação (o referencial é o que a ECD usa) e hoje não aparece em tela nenhuma: nem na view (F5) nem na resposta do
  `activate-default` (F8). O PR-0 é pequeno e sem migração. **RATIFICADO 16/10 → (b).**

### F-KA-5 — Como dizer "há versão mais nova"
- **(a)** "Versão N instalada · versão M disponível", mais o changelog. Com `lastRun.status === 'FAILED'`: "a última
  atualização falhou".
- **(b)** Mostrar a diferença só quando `lastRun` falhou; caso contrário, esconder.
- **(c)** Não mostrar `latestVersion`.
- **Recomendação: (a).** A atualização só roda no deploy (F9). Depois de um deploy bem-sucedido as duas versões se
  igualam, então a diferença visível quase sempre significa CLI não rodado ou unidade que falhou, e as duas coisas o
  dono quer ver. O texto não promete "entra no próximo deploy", porque não há como a tela saber disso. **RATIFICADO 16/10 → (a).**

### F-KA-6 — Modo cliente (contador vendo o livro de um cliente)
- **(a)** Fora, como a faixa (F11).
- **(b)** Somente leitura para o contador delegado.
- **Recomendação: (a).** Não li o `resolveBindingScope` em modo cliente (§7.1). Se ele resolve para o silo do
  chamador, (b) mostraria o kit errado. Igual à faixa até alguém provar o contrário. **RATIFICADO 16/10 → (a).**

## 6. Pendente de validação externa

Nenhum comportamento deste BRIEF depende de regra contábil, fiscal ou legal: ele só exibe estado que o BE já calcula.
Os rótulos dos motivos (ex.: `referential_year_frozen`) são texto de produto e não decidem nada.

## 7. Insumos ausentes

1. **`resolveBindingScope` em modo cliente**: não lido nesta sessão. Condiciona o F-KA-6 (b).
2. **`install()` sobre linha `INSTALLING` abandonada**: li o laço de retomada (`KitInstallService.ts:179`), não o
   `begin` para uma linha `INSTALLING` já existente. Condiciona a sub-decisão do F-KA-3.
3. **Teste de integração que prove F7** (mesmo setor + kit `FAILED` ⇒ `activate-default` retoma): não procurado. Se
   não existir, entra no PR-1 como pré-requisito do item 8 (ou num PR-0, se F-KA-4 → b).

## 8. Achados fora de escopo (registrados, não planejados)

- **Decidir pendências na tela** (aceitar/recusar com motivo): `FE-INCR-KIT-SETOR` amplo, não aberto (F-KA-2 c).
- **Editor papel→conta** (`/accounting-kit/role-overrides`) e **rastro** (`/accounting-kit/trace`): sem UI;
  mesmo `FE-INCR-KIT-SETOR`.
- **`INSTALLING` abandonado sem saída**: nem a tela (F-KA-3 ii) nem a view distinguem instalação em curso de processo
  morto. Precisaria de `updatedAt`/heartbeat na view ou de regra de expiração no BE.
- **`canManageKit` = todo usuário logado** (F3): a leitura é ampla. As rotas de decisão (`accept/reject`) usam a mesma
  policy, o que vale olhar antes de o `FE-INCR-KIT-SETOR` expor a decisão.
- **Aba Pendências do I5 ausente** (F12): a tira de sucesso não mostra o link hoje; nada a fazer aqui.
- Já registrados em outro lugar e não repetidos: `POST /compile` e CLI sem guarda nem recarga ([[LAC-B]]).

## 9. Riscos e vieses (T8)

- **Viés de confirmação no F7:** a retomada pela rota foi lida, não executada. O F-KA-3 (a) se apoia nela; o
  insumo §7.3 existe para isso.
- **Ancoragem no banner existente:** a recomendação (b) do F-KA-1 favorece não mexer no que acabou de ser mergeado.
  O custo de (a) é real (o contrato ratificado), mas o viés existe.
- **Ruído na tela:** quatro estados novos (versão, mais nova, pendências, falha) numa área que já tem faixa, convites e
  modo cliente. O runbook do item 14 é onde o dono julga se ficou poluído.

## 10. Ratificação dos forks (16/10) e o que muda no checklist

> Dono, chat, 2026-10-16: *"Passa os forks F-KA-1..6 da EMENDA-2 por questionário"* + questionário + *"Grava + emenda o
> BRIEF"*. Respostas literais e insumos fechados em
> [D-2026-10-16-LAC-B-EMENDA-2-FORKS](../plano/decisoes/D-2026-10-16-LAC-B-EMENDA-2-FORKS.md). **Sem "executa"**: cada
> PR (0, 1, 2) exige o seu. Onde §2 e §10 divergem, vale o §10.

| Fork | Decisão |
|---|---|
| F-KA-1 | **(c)** aba nova "Kit de setor" |
| F-KA-2 | **(c)** aceitar/recusar com `motivo`, em PR-2 próprio |
| F-KA-3 | **(a) + (ii)** botão só em `FAILED`; `INSTALLING` = "em andamento" |
| F-KA-4 | **(b)** PR-0 BE com `steps` |
| F-KA-5 | **(a)** "versão N instalada · versão M disponível" |
| F-KA-6 | **(a)** fora do modo cliente |

### §7 fechado por leitura (16/10, `origin/main` `b8a8a160`, não executado)

1. `resolveBindingScope` usa o chamador como dono (`BindingScope.ts:25`) ⇒ em modo cliente o kit lido seria o do
   contador. Confirma o F-KA-6 (a).
2. `KitInstallationRepository.begin` sobre linha existente só regrava `INSTALLING`, sem trava ⇒ clique durante
   instalação em curso roda passos em paralelo. Confirma o F-KA-3 (ii).
3. Retomada provada em integração no serviço (`KitInstallService.integration.test.ts:184`), **não** pela rota
   `activate-default`. Entra no PR-0 (item 0b).

### PR-0 — acréscimo

0b. **Teste de integração da retomada pela rota:** unidade com binding `Active` e kit `FAILED` no passo 7 (falha
    injetada) ⇒ `POST /accounting-binding/activate-default` com o **mesmo** `sectorKey` devolve 2xx, kit `INSTALLED`,
    `steps.lastCompletedStep: 7`, sem segundo `Active` e sem duplicar o efeito dos passos 1–6. Se falhar, o PR-0 para e
    volta ao dono (o botão do item 8 depende disso).

### PR-1 — substituições

- **Item 3 (F-KA-1 c):** aba `kit` em `TABS` da AccountingView, rótulo "Kit de setor" (i18n), conteúdo
  `AccountingKitTab` (substitui o `AccountingKitStatus` irmão). A aba só entra na lista quando o hook devolve
  `loaded` (unidade com `KitInstallation`); `none`/`error` ⇒ sem aba. A faixa da LAC-B não muda.
  *Teste:* `none` ⇒ aba ausente; `loaded` ⇒ aba presente e conteúdo renderiza.
- **Item 4 (F-KA-6 a):** com `governance`, a aba não entra em `TABS` e o hook não chama a rota.
- **Item 7 (F-KA-2):** no PR-1 a lista é **somente leitura**, carregada ao abrir a aba (não ao expandir); os botões
  entram no PR-2. *Teste:* abrir a aba chama `listPending(unitId, 'OPEN')` uma vez.
- **Item 6 (F-KA-5 a)** e **item 9 (F-KA-4 b)** seguem como escritos em §2, agora incondicionais.
- **Item 8 (F-KA-3 a+ii):** como em §2, com o passo vindo de `steps.lastCompletedStep + 1`; `INSTALLING` ⇒ "instalação
  em andamento", sem botão.
- **Contrato:** `AccountingKitStatusProps` → `AccountingKitTabProps` (mesmos campos).

### PR-2 — decidir pendências (F-KA-2 c)

15. **Serviço:** `accountingKitService.acceptPending(id, {unitId, motivo})` e `rejectPending(id, {unitId, motivo})` →
    `KitUpgradePendingView`, tipos de `DecideKitPendingRequest` do `.gen.ts`. *Teste:* URL com `:id`, corpo com `unitId`
    e `motivo`.
16. **Ação por linha:** "Aceitar"/"Recusar" abre `ConfirmModal` com campo `motivo` (10–500 caracteres, validado no
    cliente igual ao schema; botão desabilitado fora da faixa). O modal **diz o efeito pelo `reason`** antes de
    confirmar (ex.: aceitar `override` recompila o binding; aceitar `account_deleted_by_user` restaura a conta; recusar
    mantém o valor do tenant) — texto por código em i18n; código sem texto ⇒ aviso genérico "esta decisão altera o
    plano ou o binding da unidade". *Teste:* motivo com 9 chars ⇒ confirmar desabilitado; cada `reason` mostra seu efeito.
17. **Depois de decidir:** sucesso ⇒ `notify`, recarrega a lista e o `useUnitKit` (o `openPendingCount` cai) e, se a
    decisão recompilou, a ativação da unidade. *Teste:* sucesso recarrega lista e kit.
18. **Erros pelo `code` do BE** (via `resolveError`, com texto próprio quando houver): `KIT_PENDING_NOT_OPEN` (409,
    alguém decidiu antes ⇒ recarrega a lista), `KIT_PENDING_NOT_FOUND` (404), `KIT_PENDING_FROZEN_YEAR`,
    `KIT_PENDING_COMPILE_DRAFT` (lista os bloqueantes com o mesmo render extraído no item 8), `ACCOUNT_NOT_FOUND`.
    O PR-2 confere a lista de códigos lendo `KitPendingService` e `kitUpgradeTypes.ts` antes de escrever o mapa.
    *Teste:* cada código vira a mensagem certa; 409 recarrega.
19. **Pré-condição de leitura (achado da decisão):** antes de expor os botões, ler `KitPendingService.accept/reject`
    integralmente e registrar se há gate do contador ativo (o passo 3 do install tem). Se não houver, o PR-2 segue
    (decisão no silo do próprio usuário) e a ausência vai ao GAP-MAP como lacuna — não se conserta dentro do PR-2.
20. **Gates do PR-2:** os do item 13 + i18n `kit.decide.*` com paridade pt/en + runbook do item 14 ganha a linha
    "aceitar e recusar uma pendência aberta".

### §8 atualizado

- "Decidir pendências na tela" sai dos achados fora de escopo: é o PR-2. Editor papel→conta e rastro seguem no
  `FE-INCR-KIT-SETOR` amplo, não aberto.
- Viés registrado (T8): com a aba (c), o argumento "cerimônia demais para quatro informações" do F-KA-1 perde força —
  a aba agora também carrega a decisão das pendências.
