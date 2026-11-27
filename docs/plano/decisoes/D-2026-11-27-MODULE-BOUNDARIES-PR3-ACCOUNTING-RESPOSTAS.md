---
id: "D-2026-11-27-MODULE-BOUNDARIES-PR3-ACCOUNTING-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono no renome da accounting (última feature da tabela §5.3 do BRIEF MODULE-BOUNDARIES) — questionário de 27/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Executa o BRIEF inteiro\" (fork novo para o nó e vira pergunta). Questionário (AskUserQuestion) da sessão de feature do renome da accounting, respondido em 2026-11-27, respostas literais: onde entram os commits, com o #1422 fora do draft e com CI verde → \"PR novo sobre o #1422 (Recommended)\"; o que fazer com accounting/fixtures/, sem a porta do F-PBF1-7 → \"Fica, isenção nomeada (Recommended)\"; destino dos arquivos que a tabela §5.3 não nomeia (sync/bridges/, resolveAccountingScopeInternal.ts e os arquivos do dfe/ que não são Port nem cliente) → \"Destinos propostos (Recommended)\"; colisão com o #1428 do PAIS-NA-BORDA (paises/br/legalParameters/ fora de pasta de camada; LEGADO_BR cita accounting/dfe/) → \"Caixa e sigo (Recommended)\""
atualizado: "2026-11-27"
---
# D-2026-11-27-MODULE-BOUNDARIES-PR3-ACCOUNTING-RESPOSTAS — renome da `accounting`

**Estado:** `decided`
**Autorização:** dono, 2026-11-27, questionário da sessão de feature (respostas literais no cabeçalho), sobre o
`executa` do BRIEF inteiro de 24/11. Escopo: os quatro pontos abaixo, no renome da `accounting`. Não cobre o PR-4.

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §5.3 e §13.5,
[`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.10 e
[`ADR-ARCH-BOUNDARIES.md`](../../adr/ADR-ARCH-BOUNDARIES.md) §8.6. Nó: [[MODULE-BOUNDARIES]]. Respostas da fase
anterior: [[D-2026-11-25-MODULE-BOUNDARIES-PR3-INTERVIEW-CRM-FX-BINDING-RESPOSTAS]].

## Respostas

| # | Ponto | Resposta literal | Efeito | Opção recusada |
|---|---|---|---|---|
| 1 | O #1422 (PR de fase do renome) saiu do draft em 26/11, com CI verde, e entra na revisão da noite. Onde entram os commits da `accounting`? | "PR novo sobre o #1422 (Recommended)" | PR de fase próprio, em draft, com base `claude/mb-pr-3b-renome-fase`. A cabeça revisada do #1422 não muda | Commits no #1422 |
| 2 | `accounting/fixtures/` vai para `accounting/paises/br/domain/` (F-MBE-6 a), mas `PostingService` e `ExerciseClosingService` (núcleo da `C1`) e mais 23 módulos da `accounting` fora de `paises/` importam o `ChartOfAccountsFixture.ts`, a porta do F-PBF1-7 não existe (`PAIS-NA-BORDA` F1 está `planned`) e o #1428 traz a `P1` (centro não importa `paises/`) nascendo em 0 | "Fica, isenção nomeada (Recommended)" | A pasta fica onde está. A `M2` fecha em `[^/]+` com o arquivo `accounting/fixtures/ChartOfAccountsFixture.ts` isento por nome (`M2_DECLARED_STEP`), mede 0 sem baseline, e a lacuna `L-20261127-122628-dabb` aponta a porta do F-PBF1-7: a F1 do país na borda move a pasta e apaga a isenção e a entrada `fixtures/` da `LEDGER_CORE_ALLOWED` | 53 arestas `M2` no baseline (quebra o "nasce em 0"); mover já (caminho de `paises/` na lista fechada da `C1` e 26 arestas para a `P1`: os 25 da `accounting` e o DTO do `sectorKits`); `accounting/domain/` agora e `paises/br/` depois (reabre o F-MBE-6) |
| 3 | A tabela §5.3 não nomeia 11 arquivos: `sync/bridges/` (7), `scope/resolveAccountingScopeInternal.ts` e, no `dfe/`, o que não é `*Port` nem cliente (`selectDfe*`, `resolveEmissor`, `sefazConfig`, `nfceQrCode`, `splitCents`) | "Destinos propostos (Recommended)" | `sync/bridges/` → `services/bridges/` (importam `lib/factory` e repositórios; a `D2` as barraria em `domain/`); `resolveAccountingScopeInternal.ts` → `models/` (função pura, só depende do tipo); no `dfe/`, tudo que não é `*Port` → `adapters/dfe/` com as subpastas `sefaz/`, `psc/` e `local/`, e só `splitCents.ts` (pura, sem import) → `domain/` | Só os dois baldes da tabela (`splitCents` em `adapters/dfe/`, `resolveAccountingScopeInternal` em `services/`) |
| 4 | O #1428 (`integration/pais-na-borda-f3`) cria `accounting/paises/br/legalParameters/*.ts` (7 arquivos), pasta que não é de camada, e a `M2` em `[^/]+` os reprova quando as duas integrações se encontrarem; a `LEGADO_BR` dele cita `accounting/dfe/` por caminho, que este renome move | "Caixa e sigo (Recommended)" | A `M2` fecha como o BRIEF escreve. A colisão está na caixa como fork (`L-20261127-122629-0d42`), com os dois ajustes que quem chegar depois faz | Isentar `paises/<cc>/legalParameters/` já nesta `M2` (antecipa decisão do BRIEF da F3 do país na borda); parar o renome até o #1428 entrar |

## Decidido pela classe de um precedente, sem pergunta nova

- **28 entradas `M1` do baseline que trocariam de chave foram pagas por porta em `accounting/public/`**, e não
  regravadas: 25 para `scope/` (`accountingScope.types.ts`, `accountingScope.ts`, `resolveAccountingScopeInternal.ts`) e
  3 para `sync/bridges/` (`saleItems.ts`, `saleSettlementBridge.ts`, `saleReversalBridge.ts`). Mesma classe de "Pagar
  as 29" e "Pagar as 14" ([[D-2026-11-25-MODULE-BOUNDARIES-PR3-ANALYTICS-SECTORKITS-RESPOSTAS]] e a decisão da fase
  anterior). A 29ª entrada que a medição listou (`sectorKits/dtos/SectorKitDto.ts → accounting/fixtures/…`) não trocou
  de chave, porque a pasta ficou.
- **A entrada `scope/` da `LEDGER_CORE_ALLOWED` (`C1`) virou `models/AccountingScope.ts`**, e não os três arquivos da
  pasta antiga: as 19 arestas do núcleo vão todas para esse arquivo. A lista fechada ficou mais estreita do que era. O
  dono pode reverter no lote.
- **A porta `public/resolveAccountingScopeInternal.ts` é arquivo próprio e entra no `to` da `I6`**, para que controller
  HTTP não alcance a função pela porta.
- **A isenção da etapa declarada é do arquivo, não da pasta:** `fixtures/` tem um só `.ts` de produção, e arquivo novo
  ali reprova na `M2`.

## Consequências

- **`M2_FEATURES` é `[^/]+`:** a regra vale para toda feature, inclusive as que ainda vão nascer. Baseline do server
  332 → 304, só remoção.
- **Quem está aberto contra a `main` nas pastas movidas rebaseia depois do fechamento da integração** (BRIEF §3.4):
  #1146, #1412, #1409, #1427, #1438, #1425 e #1428 em 27/11.
- **A `C1` não ganhou caminho de `paises/`**; o resíduo `fixtures/ChartOfAccountsFixture.ts` segue declarado nela.

## O que esta decisão não faz

- Não move `accounting/fixtures/` nem cria a porta do F-PBF1-7 (é da F1 do `PAIS-NA-BORDA`, com BRIEF e `executa`
  próprios).
- Não decide o destino de `paises/br/legalParameters/` (é do BRIEF da F3 do país na borda).
- Não paga as outras entradas `M1` entre `accounting` e as demais features (não trocaram de chave).
- Não começa o PR-4 (`DynamicTableReader`).
