# Limite `MAX_CENTS`

## O que é

> **Emenda 2026-11-24 (dono, chat, questionário, F-W2B-2 → b):** `MAX_CENTS` passou de `2_147_483_647` para
> `2^43−1` = `8_796_093_022_207` (≈ R$ 87,96 bi por perna). O texto abaixo descreve o teto ANTIGO (R$ 21,47 mi) e
> fica como histórico; a decisão de 2026-08-31 de manter o teto foi substituída por esta. O dono pediu "perto de
> 2^53−1"; o valor exato (2^53−1) foi descartado porque um lançamento no teto + qualquer outro na mesma conta
> estoura `centsFromDb` no `_sum` e o balancete responde 500 — o teto é `⌊(2^53−1)/1024⌋`, com folga para ~1.000
> pernas no teto numa conta. Subir mais = uma linha em `models/money.ts` + `__dto-shapes__.json` + `openapi.json`.
> Guardas que seguram o número honesto: `centsFromDb` (recusa BigInt fora do intervalo seguro na leitura) e
> `PostingService.assertCentsAndBalance` (recusa o lançamento cuja SOMA de pernas deixa de ser inteira segura).
> Prova: `ExerciseClosingService.maxCents.integration.test.ts` (receita anual de R$ 78 mi posta, encerra e gera
> I350/I355).

`MAX_CENTS = 2_147_483_647` centavos = **R$ 21.474.836,47** (valor ANTIGO). Teto aplicado a todo campo
`*Cents` de entrada da contabilidade (`debitCents`, `creditCents`, `amountCents`,
`totalValueCents`, saldos de conciliação). Definido em
`server/src/features/accounting/models/money.ts:20`.

## Onde é aplicado

- **DTOs de entrada** (Zod `.max(MAX_CENTS)`):
  - `dtos/PostingDto.ts:62-63` — `debitCents`/`creditCents` (não-negativo, 0..MAX_CENTS).
  - `dtos/PayableDto.ts:16-20` — `amountCents` (positivo, 1..MAX_CENTS).
  - `dtos/ReceivableDto.ts:14-18` — `amountCents` (positivo, 1..MAX_CENTS).
  - `dtos/ReconciliationDto.ts:20-24` — `openingBalanceCents`/`closingBalanceCents`,
    **assinado** (-MAX_CENTS..MAX_CENTS — saldo pode ser negativo, a descoberto).
  - `dtos/InventoryDto.ts:19-23` — `totalValueCents` (0..MAX_CENTS); sem superfície HTTP nesta
    rodada (F-INV2 adiado), então não aparece no OpenAPI ainda.
- **Choke-point do posting** — `services/PostingService.ts:204-228`
  (`assertCentsAndBalance`, Council 1.5/ACC-014): reprova qualquer perna acima do teto antes de
  balancear/persistir, mesmo se algo escapar do DTO.
- **Validadores de import** — `services/dataExchangeValidators.ts:153-154` e `:219-220`
  (`DEBIT_TOO_LARGE`/`CREDIT_TOO_LARGE`): rejeita na pré-visualização, não deixa estourar tarde
  num `POST_FAILED` opaco no commit (ACC-INCR6-J-001).
- Guardas derivadas na mesma disciplina: `ExerciseClosingService.ts:118-124`,
  `InventoryService.ts:575-576`, `ReconciliationService.ts:212-213`,
  `sync/bridges/CrmReceivableBridge.ts:248`, `sync/mappers/SaleCogsMapper.ts:47`.

## Por que existe HOJE (e por que o número é esse)

**NÃO é mais limite técnico.** `2_147_483_647` é `2^31 - 1`, o teto de `Int` 32-bit assinado —
o tipo Prisma que TODAS as 13 colunas `*Cents` usavam antes do PR #245 (`0bea6755`,
BE-INCR-MONEY-BIGINT): um valor acima envenenava a leitura/escrita (ACC-INCR6-J-001). O #245
migrou as colunas para `BigInt` — a persistência não tem mais teto de 32 bits — mas `MAX_CENTS`
foi **mantido por decisão explícita do dono**, não por inércia (ver `money.ts:1-19`), como
**teto de POLÍTICA/sanidade**: acima dele a API responde 400 por decisão de negócio, não por
limitação de armazenamento.

## Como mudar

Alterar `MAX_CENTS` é **decisão de produto, não de engenharia** — sem migração de schema (a
coluna já é `BigInt`). Para subir o teto: mudar a const em `money.ts`, varrer os pontos acima
(DTOs + choke-point + import) e as anotações OpenAPI correspondentes. Teto real do outro lado:
`Number.MAX_SAFE_INTEGER` (2^53-1 centavos ≈ R$ 90 trilhões num único valor) — acima disso
`centsFromDb` (`money.ts:36-44`) falha ruidoso por desenho, nunca trunca em silêncio.

## Decisão

Ratificada pelo dono em 2026-08-31: manter `MAX_CENTS` como teto de política. **Superada em 2026-11-24** (emenda no
topo): o dono subiu o teto para 2^53−1 porque a receita anual de uma PJ no Presumido (até R$ 78 mi) já passava do
teto antigo.

---

**Nota de manutenção:** `docs/accounting/ACCOUNTING-MASTER-MAP.md` (T4, linha ~256) ainda
descreve o teto como "Int32 compartilhado" com upgrade a `BigInt` pendente — isso já aconteceu
no #245. Correção do master map é fold de governança à parte, fora do escopo desta tarefa.
