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

- `DpModuloAtivacao` (`dp_modulo_ativacoes`, PR-1): ativação de submódulo opcional por instância (só `userId`, R8) e
  por competência (`competenciaInicio`/`competenciaFim` inclusiva, `null` = sem fim), com `motivo`, `motivoFim`,
  `createdById`, `endedById` e soft-delete. Encerrar grava o fim; nada se apaga.
- Cadastros de estrutura (PR-3), todos por instância e com soft-delete: `DpLotacao` (`unitId` = estabelecimento,
  `codigo` vivo único), `DpCargo` (CBO de 6 dígitos), `DpJornada` (`minutosSemanais`, `tipoJornada` do domínio
  `TP_JORNADA` do S-2200), `DpSindicato` (CNPJ vivo único), `DpConvencaoColetiva` (vigência e `fonte`) e
  `DpConvencaoParametro` (`chave` ∈ `CCT_CHAVES` = `PISO_SALARIAL_CENTS`, `discriminador` = `cargoId`, `valorInt`
  `BigInt`, `clausula`, vigência dentro da convenção e sem sobreposição). `models/cadastros.ts` tem os domínios e o
  leitor puro `parametroCctVigente`.

Registro e portas (`models/moduleRegistry.ts`, `ports/`, PR-1):

- `DP_MODULE_REGISTRY`: os 9 opcionais da spec §2 com chave `DP-<SUFIXO>` (F-DPB-2), `featureDir`, `provides` e
  `disponivel` (todos `false` no F0). `assertDpRegistryInvariants` roda no carregamento (chave/pasta únicas, sem ciclo,
  porta com no máximo um provedor). `resolveDpModuleActivation` decide se um módulo pode ser ativado na competência.
- Porta `JORNADA_APURADA` (provida por `DP-PONTO`) com `NullJornadaApurada`; `DpPortResolver` escolhe por competência a
  implementação do módulo ativo ou o nulo com o motivo nomeado. O mapa de implementações vem do `lib/factory.ts` (vazio
  no F0).

Tipos puros (`models/`, PR-0):

- `competencia.ts`: `Competencia` (`YYYY-MM`), `primeiroDia`, `ultimoDia` (calendário real), `competenciaDe`, `proxima`,
  `anterior`, `comparar`.
- `vigencia.ts`: vigência só por data de efeito (F-DP-8 → b), inclusiva, no molde do `LegalParameter` — `vigenteEm`,
  `sobrepoe`, `semSobreposicao`, `versaoVigente` (lança `VigenciaSobrepostaError`, 409 `DP_VERSAO_SOBREPOSTA`); e por
  competência (`ativaEm`, `sobrepoeCompetencia`).
- `erros.ts`: `DpErrorReason` (§3.6 do BRIEF). Os erros são `ValidationError`/`ConflictError` de `lib/errors`, com o
  `reason` no `code` da resposta (e em `details.reason` no 400).

## Layering & authorization

`Route → Controller → Service → Repository → Prisma` (+ Policy), injeção pelo `lib/factory.ts`. Escopo por instância
(`AccountingScope`, R8: instância = raiz do CNPJ = empregador; unidade = estabelecimento); o controller resolve pelo
`AccountingScopeResolver` com o `unitId` da query ou do body. Tier-0: registro de outro dono responde 404.
`DpPolicy` (`canRead`, `canManage`) é própria do DP, com a regra de hoje do `canManageFiscalProfile` (D-7).

## API (`/api/dp`)

| Method | Path | Action |
|---|---|---|
| GET | `/modules?unitId=` | Catálogo dos submódulos opcionais |
| GET | `/modules/activations?unitId=` | Ativações da instância |
| POST | `/modules/activations` | Ativa a partir de uma competência (409 indisponível/sobreposta; 400 dependência faltante) |
| POST | `/modules/activations/:id/end` | Encerra numa competência (409 com dependente ativo depois do fim) |
| GET/POST | `/{lotacoes,cargos,jornadas,sindicatos,convencoes}` | Lista (`limit` ≤ 200) / cria (409 `DP_CODIGO_DUPLICADO` em código de lotação e CNPJ) |
| GET/PATCH/DELETE | `/{lotacoes,cargos,jornadas,sindicatos,convencoes}/:id` | Lê / altera parcial / soft-delete |
| GET/POST | `/convencoes/:id/parametros` | Parâmetros da convenção (409 `DP_VERSAO_SOBREPOSTA`; 400 fora da vigência) |
| PATCH/DELETE | `/convencoes/:id/parametros/:parametroId` | Altera parcial / soft-delete |

## Invariants

- Vigência sem sobreposição: o gate é do serviço, dentro da tx; `semSobreposicao`/`sobrepoe` são o predicado.
- Ativação: resolução do item 11, sobreposição e dependente ativo checados dentro da tx; auditoria
  `dp.module_activation.created/ended` na mesma tx, sem o texto do motivo.
- Cadastros: unicidade viva e vigência do parâmetro checadas dentro da tx; auditoria `dp.<cadastro>.created/updated/
  deleted` com ids, códigos e datas (o piso em string); nome, descrição e cláusula ficam fora.
- Dinheiro em centavos `BigInt`; datas date-only em `String` validadas por `isValidDateOnly` (regex não valida
  calendário).
- PII (CPF, nome, nascimento, salário, motivo de afastamento) nunca entra no `AuditEvent` (F-DPB-3).

## Interaction with other features

- Lê, sem tabela nova, os parâmetros legais que já existem (`legalParameters`: IRRF, `ENCARGO_FOLHA`, salário mínimo).
- O sócio do pró-labore é o `Partner` da contabilidade (D-9 do BRIEF).
- O motor DynamicTable nunca é injetado aqui; a leitura de `employees` passa por porta implementada no factory (D-2).
