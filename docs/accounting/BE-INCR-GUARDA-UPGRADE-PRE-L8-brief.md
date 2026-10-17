# BE-INCR-GUARDA-UPGRADE-PRE-L8 — BRIEF

**Item:** lacuna registrada no relatório do PR #691 (BE-INCR-PLANO-4-NIVEIS, L8 do H1 — `docs/plano/gates/H1.md`):
nada impede o `upgradeSectorKitsCli` / `KitUpgradeService` de levar uma unidade em v1–v5 (plano de 3 níveis) direto
ao v6 (plano de 4 níveis) se rodar ANTES do `migratePlano4NiveisCli`. O resultado seria criar contas e binding do
plano novo num plano velho, e o compile daria Draft com os aditivos já gravados.

**Autorização:** dono em chat, 15/10/2026: "Autorizo a guarda" (pergunta: guarda que recusa o salto v1–v5 → v6 e manda
rodar o `migratePlano4NiveisCli` antes; PR "não mergear sem OK"). Escopo = só a guarda.

**Insumos (fato consumado):** `server/src/jobs/migratePlano4NiveisCli.ts` (F-L8-12 a: upgrade real até o v5 com o
registro preso em `kitVersion <= ULTIMA_VERSAO_KIT_PRE_L8`, depois renomeação e `advanceVersion` ao v6, fora do
`upgrade`); `server/src/features/sectorKits/services/KitUpgradeService.ts` (`upgrade`); `upgradeSectorKitsCli.ts`
(erro da unidade → falha contada, segue as outras, exit ≠ 0).

## Checklist

1. `ULTIMA_VERSAO_KIT_PRE_L8 = 5` passa a morar em `sectorKits/models/kitUpgradeTypes.ts` (o serviço não importa de
   `jobs/`); `migratePlano4NiveisCli` importa de lá e re-exporta o nome (consumidores atuais intactos).
2. `KitUpgradePreL8MigrationRequiredError` (AppError 409, código `KIT_UPGRADE_REQUIRES_PLANO_4_NIVEIS_MIGRATION`) com
   mensagem que manda rodar o `migratePlano4NiveisCli` (com o comando) antes do upgrade.
3. `KitUpgradeService.upgrade`: instalado ≤ 5 e alvo ≥ 6 ⇒ lança o erro do item 2 ANTES de qualquer escrita
   (dry-run e apply; nenhum `KitUpgradeRun` gravado). Instalado ≤ 5 com alvo ≤ 5 continua permitido (a migração usa).
4. `upgradeSectorKitsCli` não muda: o erro vira falha da unidade, mensagem no stderr, as outras seguem, exit 1.
5. Teste-guarda (integração, registro real com v6): unidade v1 → `runUpgrade` DRY_RUN e APPLY saem 1, a mensagem cita
   `migratePlano4NiveisCli`, versão segue 1, nenhum `KitUpgradeRun`, nenhuma conta nova. Vermelho sem o item 3.

## Contratos

```ts
export const ULTIMA_VERSAO_KIT_PRE_L8 = 5;
class KitUpgradePreL8MigrationRequiredError extends AppError { // 409
  constructor(unitId: string, from: number, to: number) }
// code: 'KIT_UPGRADE_REQUIRES_PLANO_4_NIVEIS_MIGRATION'
```

## Forks

- **F-G1** onde mora a guarda — (a) no `KitUpgradeService` (cobre qualquer chamador) · (b) só no CLI.
  **RATIFICADO (a)** — dono em chat, 15/10.
- **F-G2** forma da recusa — (a) erro próprio 409 no molde do `KitUpgradeDryRunRequiredError` · (b) `ValidationError`
  com prefixo. **RATIFICADO (a)** — dono em chat, 15/10.

## Pendente de validação externa
Nenhuma (regra operacional, não contábil/fiscal).

## Insumos ausentes
Nenhum.

## Achados fora de escopo
Nenhum.
