# dp — Departamento Pessoal (núcleo)

Núcleo first-class em Prisma do Departamento Pessoal (folha + eSocial), nó `PES-4` do vault. Decisões em
[`PRE-ADR-DP-DEPARTAMENTO-PESSOAL`](../../../../docs/adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) (F-DP-1..14) e spec de
execução em [`BE-INCR-DP-F0-F1-brief.md`](../../../../docs/accounting/BE-INCR-DP-F0-F1-brief.md).

- **O núcleo existe em toda instância, sem ativação** (F-DP-6, dono, 02/11: *"Isso, núcleo sempre ligado"*), como a
  contabilidade. Serve o mínimo legal de qualquer empregador, inclusive a empresa só com sócio de pró-labore (F-DP-11).
- **O que é núcleo:** cadastros, folha, eSocial, guias, fechamento, ponte contábil e SST (F-DP-13). Tudo mora nesta
  feature (D-1 do BRIEF, precedente `features/accounting/`).
- **Opcional é feature própria `features/dp<Nome>/`** (por exemplo `dpPonto`), ligada por instância e por competência,
  sem deploy. Desligado, o núcleo usa o adaptador nulo da porta, com o motivo nomeado.
- **Regra `D1` do `check:arch`** (F-DP-10): nada em `features/dp/` importa `features/dp<Nome>/`. Só o `lib/factory.ts`
  monta as implementações dos opcionais. Emenda em `docs/adr/ADR-ARCH-BOUNDARIES.md` §1.1.

## Model

Até o PR-0 só há tipos puros (`models/`):

- `competencia.ts`: `Competencia` (`YYYY-MM`), `primeiroDia`, `ultimoDia` (calendário real), `competenciaDe`, `proxima`,
  `anterior`, `comparar`.
- `vigencia.ts`: vigência só por data de efeito (F-DP-8 → b), inclusiva, no molde do `LegalParameter` — `vigenteEm`,
  `sobrepoe`, `semSobreposicao`, `versaoVigente` (lança `VigenciaSobrepostaError`, 409 `DP_VERSAO_SOBREPOSTA`); e por
  competência (`ativaEm`, `sobrepoeCompetencia`).
- `erros.ts`: `DpErrorReason` (§3.6 do BRIEF). Os erros são `ValidationError`/`ConflictError` de `lib/errors`, com o
  `reason` no `code` da resposta (e em `details.reason` no 400).

## Layering & authorization

`Route → Controller → Service → Repository → Prisma` (+ Policy), injeção pelo `lib/factory.ts`. Escopo por instância
(`AccountingScope`, R8: instância = raiz do CNPJ = empregador; unidade = estabelecimento). Tier-0: registro de outro dono
responde 404.

## API

Nenhuma rota até o PR-0. Todas nascem sob `/api/dp` (§3.5 do BRIEF).

## Invariants

- Vigência sem sobreposição: o gate é do serviço, dentro da tx; `semSobreposicao`/`sobrepoe` são o predicado.
- Dinheiro em centavos `BigInt`; datas date-only em `String` validadas por `isValidDateOnly` (regex não valida
  calendário).
- PII (CPF, nome, nascimento, salário, motivo de afastamento) nunca entra no `AuditEvent` (F-DPB-3).

## Interaction with other features

- Lê, sem tabela nova, os parâmetros legais que já existem (`legalParameters`: IRRF, `ENCARGO_FOLHA`, salário mínimo).
- O sócio do pró-labore é o `Partner` da contabilidade (D-9 do BRIEF).
- O motor DynamicTable nunca é injetado aqui; a leitura de `employees` passa por porta implementada no factory (D-2).
