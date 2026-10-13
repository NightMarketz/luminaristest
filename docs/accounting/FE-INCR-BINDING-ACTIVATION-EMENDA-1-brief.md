# FE-INCR-BINDING-ACTIVATION — EMENDA 1 (F-BA-2 → b: a rota da tela recarrega os mappers)

> `sessao-planejamento`, 2026-10-13, base `origin/main` `9f6477d8`. **Emenda** ao BRIEF
> [`FE-INCR-BINDING-ACTIVATION-screen-brief.md`](FE-INCR-BINDING-ACTIVATION-screen-brief.md) (nó
> [`LAC-B`](../plano/nos/LAC-B.md)). Sem código. **Cada PR exige "executa" próprio** (ORCH-006).
>
> **Autorização, literal:** dono, chat, 2026-10-13: *"Grava as decisões e abre as 4 emendas"*, sobre a cédula F-BA-2
> *"(b) Recarga própria na tela"* e a F-I4-4 *"(a) Recarga no onboarding"*
> ([[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]]). Cobre só este documento.
>
> **Em duas linhas:** o PR-0 (BE) ganha um item: depois de `Active`, o `activateDefaultBinding` recarrega os mappers
> pela **mesma** função serializada do item 13 do I4, sem cópia. Com isso a tela entrega um `Active` que lança sem
> reiniciar. **Risco principal:** com recarga em runtime, a colisão de setor (F-BA-5) passa a estourar na recarga, e
> por isso a guarda do item 0 tem de rodar **antes**.

## 0. Fatos (lidos nesta sessão)

| # | Fato | Fonte |
|---|---|---|
| F1 | A rota é `POST /accounting-binding/activate-default` → `accountingBindingController.activateDefaultBinding` | `routes/accounting-binding.ts:24`; `features/accountingBinding/controllers/accountingBindingController.ts:118` |
| F2 | A recarga existe e é pública: `ApplicationFactory.initializeAccountingSyncFromBindings()` | `lib/factory.ts:1764`; chamada no boot em `server.ts:40` |
| F3 | O item 13 do BRIEF I4/I5 (F-I4-4 a, ratificado 13/10) põe a mesma chamada no controller do onboarding, serializada por uma cadeia de `Promise` | `BE-INCR-ONBOARDING-ACTIVATION-brief.md:216-226` |
| F4 | F-I4-4 = (a), **não** (a′): `POST /compile` e o CLI continuam sem recarga | decisão de 13/10 |

## 1. O que muda no BRIEF

- **Item 7 do PR-1** passa a dizer: a recarga é do BE (item 0b abaixo); a tela não faz nada além do item 6. O texto
  condicional ao F-I4-4 (a′) e ao F-BA-2 (c) cai.
- **PR-0 deixa de ser condicional só ao F-BA-5:** ele existe também pelo item 0b.

## 2. Checklist (acréscimo ao PR-0)

0b. **Recarga depois de `Active` na rota da tela.** Em `activateDefaultBinding`, depois de `status: 'Active'` (e **não**
    em `already-active`), chamar a recarga serializada. **Uma só implementação:** a função
    `reloadAccountingMappersSerialized()` (nome sugerido) mora num módulo próprio (ex.:
    `features/accountingBinding/runtime/mapperReload.ts`) com a cadeia de `Promise`; o controller do onboarding (I4
    item 13) e este controller a importam. **Quem chegar primeiro em `main` cria o módulo; o outro só importa** — mesma
    regra do F-ADN-9. Isso fecha o "dois donos da mesma recarga" que o F-BA-2 (b) trazia.
    - Falha na recarga ⇒ `logger.error` e resposta `Draft` com `blocking:[{ code:'ACCOUNTING_SYNC_RELOAD_FAILED' }]`
      (mesmo código do I4 item 13; entra no contrato de erro da rota).
    - **Ordem:** guarda do item 0 (409 `BINDING_SECTOR_CONFLICT`) → `compile()` → `Active` → recarga. A guarda antes
      impede que a colisão de setor chegue à recarga.
    - *Teste de integração (a prova):* `POST /activate-default` (salão) numa unidade nova → venda finalizada pelo
      caminho normal **sem reiniciar** → existe `JournalEntry` com `sourceType:'sale.finalized'` e `sourceId` da venda.
      *Teste de unidade:* duas ativações simultâneas ⇒ duas recargas em série (a segunda espera a primeira).
    - *Teste do helper:* a cadeia não morre depois de uma recarga rejeitada (a próxima chamada roda).

## 3. Contrato

```ts
// features/accountingBinding/runtime/mapperReload.ts (dono: o 1º PR que chegar — este PR-0 ou o I4 PR-2)
export function reloadAccountingMappersSerialized(): Promise<void>; // encadeia ApplicationFactory.initializeAccountingSyncFromBindings()
// ActivateDefaultBindingResult (já gerado): blocking[].code ganha 'ACCOUNTING_SYNC_RELOAD_FAILED' (aditivo)
```

## 4. Forks

Nenhum novo. A regra "quem chegar primeiro cria o módulo" é direta: as duas outras saídas (cópia ou módulo fixo num
PR que talvez não venha primeiro) violam o critério de reuso ou travam a ordem.

## 5. Pendente de validação externa

- Segurança da troca de referência sob tráfego (I, herdado do BRIEF I4/I5 §"Pendente", item 1).

## 6. Achados fora de escopo

- `POST /compile` e o CLI seguem sem recarga (consequência do F-I4-4 a, não do F-BA-2). Quem ativar por esses
  caminhos ainda precisa reiniciar. Registrar no GAP-MAP numa sessão própria.
