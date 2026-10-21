# PRE-ADR-BUILDER-VERTICAIS — Preset como manifesto serializável, verticais fora do molde "venda", camada operacional × kit contábil

- **Data:** 2026-10-21
- **Status:** **Proposed** — forks F-BV-1..7 **RATIFICAÇÃO PENDENTE** (questionário do coordenador). Sem código, sem "executa".
- **Autorização:** dono, chat, 2026-10-21: "dispara os chats A, C e F agora", sobre o escopo "Autorizo ... escrever o PRE-ADR do BUILDER-VERTICAIS — sessao-planejamento, só docs, sem código, sem 'executa'". Cobre o PRE-ADR; **não** cobre BRIEF nem código.
- **Nó:** [`docs/plano/nos/BUILDER-VERTICAIS.md`](../plano/nos/BUILDER-VERTICAIS.md) · depende de W5 (done, PRs #726–#728) e KIT-SETOR (done).
- **Respeita:** `ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md` (Accepted 14/10), `PRE-ADR-NUCLEO-KIT-DE-SETOR.md` (Accepted 07/10), `ADR-P1-binding-press.md`, `ADR-DOMAIN-MOTOR-rejected.md`, trilho T10 / rejeitada R-motor-regras.

## TLDR

O preset já é **quase dado**: os módulos são objetos literais que `createTableFromModule` clona por `JSON.parse(JSON.stringify())` — o que é código são a **composição** (`systems/*.ts`), o `MODULE_REGISTRY` (só CRM) e o vínculo com a contabilidade (pontes que acham a tabela por `internalName`). Proposta: manifesto Zod = composição + módulos por referência versionada, **sem** lógica; vertical fora do molde "venda" exige **arquétipo + ponte em código revisado** e o manifesto só pode *declarar* qual ponte usa, nunca defini-la. Risco principal: um 3º vertical antes do H3 amplia o que fica sem validação humana (Bloco A).

## 1. Objetivo (sob a letra)

Permitir que o dono (e a IA do wizard) monte um vertical novo **sem PR de código** quando o vertical cabe nas pontes existentes, e **com PR revisado** quando não cabe — deixando a fronteira entre os dois casos mecânica (validador), não de julgamento.

## 2. Evidência

### 2.1 Código (lido em 21/10, `origin/main` 7c063e39) — verificado

| Fato | Onde |
|---|---|
| Preset = objeto TS com `key`, `name`, `modules`, `aiProfile`, `tables` | `server/src/features/dynamicTables/presets/systems/AestheticClinicPreset.ts` |
| `createTableFromModule` clona o módulo por `JSON.parse(JSON.stringify(...))` e aplica `omit`/config → o módulo **já é serializável** (função seria descartada silenciosamente) | `dynamicTables/utils/TableFactory.ts:28-33` |
| `lockedByAccounting` só grava `meta.lockedBy = 'accounting'` — dado | `TableFactory.ts:61-63` |
| `MODULE_KEYS` = só CRM-0..3 (5 chaves); salão/clínica compõem tabela a tabela | `presets/modules/registry.ts:30` |
| Pontes contábeis localizam a tabela por `internalName` `sales`/`saleItems` (invariante do P2) | `accounting/sync/bridges/saleItems.ts`; plugins em `dynamicTables/rules/plugins/sales/` |
| Regras (plugins) amarradas a tabela em código | `dynamicTables/rules/plugins/**` |
| Kit contábil já é dado versionado por setor (`kits/beautySalon`, `kits/aestheticClinic`, `_shared`) | `server/src/features/sectorKits/kits/` |

### 2.2 Achados já registrados no nó (19/10) — inferido do nó, não re-medido

- Dois mecanismos para "o que instalar": módulo (CRM) × tabela por `meta`.
- Sync de preset propaga só campos, opções e `immutableAfter`; `lifecycle`, `deleteConstraints`, `noOverlap`, `compositeUnique` não chegam ao tenant instalado (GAP-MAP #397).
- E-commerce físico não tem vertical (pedido/frete/variante/devolução).

## 3. Colisões verificadas

- **ADR-PERSISTENCE-BOUNDARY §2.1:** o manifesto descreve só o mundo DynamicTable (o que o usuário desenha). Nada do núcleo Prisma entra no manifesto. ✔
- **R-motor-regras / T10:** o manifesto **não** pode carregar regra executável, expressão ou mapeamento evento→lançamento livre. A ponte é código. ✔ (vira F-BV-3)
- **KIT-SETOR:** o kit já é dado com validador e aceite do contador; o manifesto **referencia** o kit por id+versão, não o embute. ✔ (F-BV-4)

## 4. Forks — RATIFICAÇÃO PENDENTE

### F-BV-1 — Formato do manifesto (pergunta 1)
- (a) **Manifesto Zod = composição**: `{ key, version, name, aiProfile, modules[], tables{ alias: { moduleRef: 'finance/sales@1', config: IModuleConfig, meta } }, kitRef, bridges[] }`; módulos continuam TS no repo (já são dado), referenciados por id@versão.
- (b) Manifesto **autocontido**: embute o schema completo de cada tabela (snapshot do módulo).
- (c) Manter preset TS e só gerar o JSON como artefato.
- **Recomendação: (a).** Evidência: o módulo já é JSON-clonável (`TableFactory.ts:33`), então referenciar custa nada; (b) duplica módulo e reabre o drift do sync (#397); (c) não permite builder sem PR. Salão e clínica migram por geração byte-equivalente (teste de igualdade entre o preset TS e o manifesto convertido).

### F-BV-2 — Unificar módulo × tabela-por-meta (achado 19/10)
- (a) Todo agrupamento vira módulo no registro (salão/clínica ganham chaves: `VENDA`, `ESTOQUE`, `AGENDA`…); manifesto só lista módulos.
- (b) Manifesto aceita os dois (módulo e tabela solta).
- **Recomendação: (a)**, faseado — um mecanismo para "ligar depois", `freeSelects`, remoção. Custo: migração de `MODULE_KEYS` (enum Zod) e do checklist do W5 (#728). Se o dono quiser escopo menor: (b) com depreciação datada.

### F-BV-3 — Vertical fora do molde "venda" (pergunta 2)
- (a) **Arquétipo + ponte novos em código revisado**; o manifesto só *declara* `bridges: ['sales@1']` de uma lista fechada (enum no registro); validador recusa manifesto cujas tabelas não tenham os `internalName` que a ponte declarada exige.
- (b) Manifesto define o mapeamento tabela→arquétipo de forma declarativa (campo X = valor, campo Y = data).
- **Recomendação: (a).** (b) é o motor de regras rejeitado (R-motor-regras, T10) e o critério de atomicidade/lei da ADR-PERSISTENCE-BOUNDARY. Consequência: locação/obra/assinatura = PRE-ADR próprio por arquétipo (fora deste nó).

### F-BV-4 — Duas camadas (pergunta 3)
- (a) **Manifesto operacional** (tabelas, campos, telas, aiProfile) publicável com validador determinístico; **kit contábil** continua artefato separado (`sectorKits`) com aceite do contador; o manifesto só referencia `kitRef: 'beautySalon@6'` e o validador cruza `bridges` × eventos do kit.
- (b) Um manifesto único com as duas camadas.
- **Recomendação: (a).** Risco e revisor diferentes (operacional = dono; contábil = contador); o kit já tem ciclo de versão e atualização em 3 níveis (KIT-SETOR PR-4) que (b) reabriria.

### F-BV-5 — Onde o manifesto mora
- (a) Arquivo versionado no repo (`presets/manifests/<key>.json`), builder escreve e abre PR.
- (b) Tabela Prisma de plataforma (`PresetManifest`, como `SavedTableView`), editável em runtime pelo dono.
- **Recomendação: (a) agora, (b) no P5.** Sem marketplace, PR é a revisão; (b) exige trilha de versão/aprovação que só se paga com terceiros.

### F-BV-6 — Quem publica (pergunta 4 do nó)
- (a) Só o dono (catálogo interno) até o P5.
- (b) Terceiros já no formato (assinatura, isolamento, revisão).
- **Recomendação: (a).** Gargalo atual é validação humana (4/4 gates do Bloco A abertos); terceiros multiplicam o que ninguém valida.

### F-BV-7 — Upgrade de tenant instalado
- (a) Fora deste nó: manifesto versiona, mas sync continua o atual; GAP-MAP #397 segue como dívida própria.
- (b) Este nó fecha o sync completo (lifecycle, deleteConstraints, noOverlap, compositeUnique, selectOverrides).
- **Recomendação: (a)**, com o validador recusando manifesto v(n+1) que mude propriedade não sincronizável sem aviso. (b) é frente própria (ORCH-006).

## 5. Comportamentos candidatos do futuro BRIEF (esqueleto — não é checklist)

1. Schema Zod `presetManifestSchema` `.strict()` + `moduleRef` id@versão.
2. Conversor salão/clínica TS → manifesto; teste de igualdade com `createTableFromModule` atual.
3. Loader: manifesto → `PresetTableDefinition` (substitui `systems/*.ts`).
4. Validador determinístico: refs resolvem; `bridges` ⊂ enum; `internalName` exigidos presentes; `kitRef` existe e cobre os eventos das pontes.
5. (se F-BV-2 a) módulos não-CRM no registro.
6. Builder interno (IA do wizard + dono) que gera manifesto e abre PR — FE em incremento separado.

## 6. Contrato esboçado

```ts
const presetManifestSchema = z.object({
  key: z.string().regex(/^[a-z][A-Za-z0-9]+$/),
  version: z.number().int().positive(),
  name: z.string().min(1),
  aiProfile: z.object({ name: z.string(), description: z.string() }).strict(),
  modules: z.array(moduleSelectorSchema),
  tables: z.record(z.object({
    moduleRef: z.string().regex(/^[a-z]+\/[A-Za-z]+@\d+$/),
    config: moduleConfigSchema.optional(),         // omit/overrides — dado
    meta: z.object({ lockedBy: z.literal('accounting').optional() }).strict().optional(),
  }).strict()),
  kitRef: z.string().regex(/^[A-Za-z]+@\d+$/).nullable(),
  bridges: z.array(z.enum(['sales@1'])),           // fechado; nova ponte = PR de código
}).strict();
```

## 7. Pendente de validação externa

- Aceite do contador para qualquer `kitRef` novo (regra do KIT-SETOR, inalterada).
- Sign-off de browser do W5 (residual do nó W5) antes de o builder usar o checklist de módulos.

## 8. Insumos ausentes (não varridos — regra 2)

- Inventário completo de quais plugins de `rules/plugins/**` dependem de `internalName` além de `sales`/`saleItems` (necessário para o enum de `bridges` e o validador do item 4).
- Lista de consumidores de `MODULE_KEYS` no FE (impacto de F-BV-2 a).

## 9. Achados fora de escopo

- E-commerce físico, locação, obra, assinatura: cada um PRE-ADR de arquétipo próprio (F-BV-3 a).
- Sync completo de preset (GAP-MAP #397) — F-BV-7.

## Riscos (inclui vieses do autor)

- Viés de continuidade: recomendações (a) seguem o desenho já existente; a alternativa de manifesto autocontido (F-BV-1 b) foi descartada por custo de drift, não testada.
- Caso adversarial tentado: "o módulo tem função que o JSON perderia" — `TableFactory.ts:33` já serializa todo módulo em produção; se houvesse função, salão/clínica já estariam quebrados. Não refuta a existência de lógica fora do módulo (plugins), que por isso fica em código (F-BV-3).
