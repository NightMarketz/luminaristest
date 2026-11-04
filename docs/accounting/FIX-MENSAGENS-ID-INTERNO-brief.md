# BRIEF — FIX-MENSAGENS-ID-INTERNO (nó FIX-TESTES, item 5): mensagem ao cliente nomeia o dado, não o id

> **Estado:** BRIEF de correção, 04/11/2026. Sem código e sem `executa`. Os forks estão em **RATIFICAÇÃO PENDENTE**.
> Régua: [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md), A3 ("mensagem que
> nomeia o dado, nunca id interno") e A2.

## 0. Contexto fixo

- **Autorização:** dono, chat, 04/11, questionário do PR #1075, Q4: *"Varredura de classe (Recomendado)"* e, no detalhe,
  *"Varredura, imobilizado 1º lote (Recomendado)"* ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)).
  Cobre **este BRIEF**. Cada lote pede `executa` próprio.
- **Fora daqui:** o DFE-1 (`FiscalDocumentEmissionService`) fica no PILOTO-DFE (#1067, F-PIL-5 com a opção b3). O aperto do
  teste concorrente do IMO-1 fica na sessão de correção do IMO-1 (#1053).
- **Fatos lidos (04/11, `origin/main` 66f2d5d97):**
  - O `handleApiError` (`server/src/lib/apiUtils.ts:37`) devolve `error.message` dos erros tipados ao cliente. Então todo
    `throw new ValidationError/NotFoundError/ConflictError(\`… '${id}' …\`)` chega à tela com o id. Verificado.
  - Exemplo visto na tela (vermelho do #1053): *"Ativo 'cmw28mpvi0012cisgdbnb1amz' está em status ACTIVE; só
    PENDING_ACTIVATION pode ser ativado."* Verificado.
  - **Imobilizado (1º lote), verificado por leitura:** 14 sites em `FixedAssetService.ts` (`:77`, `:85`, `:136`, `:140`,
    `:183`, `:186`, `:196`, `:203`, `:223`, `:239`, `:242`, `:254`, `:320`, `:423`) e 3 em `FixedAssetClassService.ts`
    (`:44`, `:134`, `:141`).
  - **Tamanho da classe, inferido por regex** (`Error(\`…'${…Id|id|Ref}'…`, fora de `__tests__`): **228 sites** em
    `server/src/features`. Os maiores: `LalurService` 15, `FixedAssetService` 14, `PayableService` 12,
    `AccountingReviewService` 11, `AccountingDeliveryService` 9, `ReceivableService`, `ProfitDistributionService` e
    `InterestOnEquityService` 8 cada. A regex pega também id que o próprio cliente mandou na URL (ver F-MSG-1), então o número
    é teto, não medida.

## 1. Checklist de comportamentos

Sessão por lote: **`sessao-instrumentacao`** (teste-guarda vermelho, PR "não mergear", molde #1053) → **`sessao-correcao`**
(diff mínimo só nos sites do lote).

1. **[direto] Inventário dos sites (feito uma vez, como inventário: F-RF-1 a, Q1).** Um doc
   `docs/operating-manual/MENSAGENS-ID-INTERNO-<data>.md`, com uma linha por site: arquivo:linha, o texto, o dado que o id
   representa e a classificação pelo F-MSG-1. Script no scratchpad, nada no CI.
2. **[direto] Padrão único de mensagem (F-MSG-2).** Definido no 1º lote e repetido nos seguintes: o dado nomeado pelo
   rótulo que o usuário vê (código + descrição do bem, nome da conta, nome do cliente), com o id **só** se o rótulo estiver
   vazio. O contrato `{ message: string }` não muda.
3. **[direto] Lote 1, imobilizado: teste-guarda.** Um caso por site de `FixedAssetService` e `FixedAssetClassService` que
   o F-MSG-1 classifica como "corrigir". Ele monta o estado que dispara a mensagem (A2: por exemplo, o bem já `ACTIVE` para
   `:196`) e asserta que a mensagem **contém** o código do bem (`A-CONC`, por exemplo) e **não contém** o `cuid`. A camada
   é a integração pela HTTP (`fixedAssetController.integration.test.ts`), porque o texto que importa é o que sai do
   `handleApiError`. Hoje reprova pelo motivo certo.
4. **[direto] Lote 1: correção mínima.** O serviço já tem o registro carregado nos sites de status e CAS (`current`, `asset`).
   Usa `code`/`description` dele. Nos `NotFoundError` de id que o cliente mandou, vale o F-MSG-1.
5. **[direto] Lotes seguintes, na ordem do F-MSG-3.** Cada lote tem até 8 serviços por PR (como o F-RF-2) e o mesmo par
   instrumentação → correção.
6. **[direto] Testes existentes que casam o texto antigo** (por exemplo, o `toMatch(/está em status/)`) são ajustados no PR
   da correção do mesmo lote, e só eles.

## 2. Contratos

Nenhum contrato novo. A forma da mensagem segue o F-MSG-2. Gates do diff: `tsc` do server com `tsconfig.test.json`;
`dtoShapeSnapshot` intocado (nenhum DTO muda); rodar local só os arquivos tocados, com `--runInBand` na integração.

## 3. Forks (RATIFICAÇÃO PENDENTE)

### F-MSG-1 — Que id conta como "interno"
- (a) Todo id que não seja o que o usuário digitou ou vê na tela. O id da URL que o próprio cliente mandou (`404 Ativo 'X'
  não foi encontrado`) fica, porque é eco do pedido.
- (b) Todo id, sem exceção, inclusive o eco da URL.
- **Recomendação:** (a). O eco da URL ajuda a depurar e não esconde nada do usuário. O que o usuário não reconhece é o id de
  **outro** registro (classe, conta, venda) ou o do registro que ele vê pelo código.

### F-MSG-2 — Forma da mensagem
- (a1) Só o rótulo (`Ativo 'A-CONC — Notebook' …`), com o id só se o rótulo estiver vazio. É a forma a1 do F-PIL-5.
- (a2) Rótulo + id entre parênteses.
- **Recomendação:** (a1), alinhada ao F-PIL-5 do DFE-1, para a tela ter um padrão só.

### F-MSG-3 — Ordem dos lotes depois do imobilizado
- (a) Por exposição na tela: primeiro o que o operador usa no dia (AP/AR, cobrança, venda, pacote), depois os fechamentos
  (LALUR, distribuição, JCP, revisão, entrega).
- (b) Pela contagem de sites, do maior para o menor.
- **Recomendação:** (a). O dano é a mensagem que o operador lê, não o número de `throw`.

## 4. Pendente de validação externa

Nenhum.

## 5. Insumos ausentes

- A classificação F-MSG-1 dos 228 sites é o item 1, ainda não feita.

## 6. Achados fora de escopo

- O `handleApiError` devolve `rawError` e `stack` em `details` (`apiUtils.ts:67`) num ramo que não li. Isso já foi tratado
  pelo ERRO-CRU-AO-CLIENTE (#1071), segundo o log; não se replaneja aqui.
