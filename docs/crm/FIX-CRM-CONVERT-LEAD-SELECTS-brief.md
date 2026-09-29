# BRIEF — FIX-CRM-CONVERT-LEAD-SELECTS (Porte/Papel da conversão de lead × opções instaladas do tenant)

> Produzido por **sessão de planejamento** em 28/09/2026. Sem código de aplicação.
> **Forks ratificados pelo dono em 28/09/2026 (questionário em chat):** F-B3-1 → (a) registrar no GAP-MAP N3;
> F-B3-2 → (b) "BE aceita rótulos pt", precisado por F-B3-3 → (a) "a autoridade são as opções instaladas do tenant".
> **Executa (chat, 28/09):** *"Pode planejar e lançar um prompt para essa correção"*.

## 0. Cabeçalho

- **Origem:** item B3 de `docs/accounting/PLANO-PENDENCIAS-FE-DTO-2026-09-28.md` (varredura FE×DTO de 28/09).
- **Sessões:** registro no GAP-MAP → `sessao-instrumentacao` → `sessao-correcao`. BE + FE no mesmo PR: é uma lacuna
  só (o contrato entre os dois lados), não um incremento de feature.
- **Base:** `origin/main` = `7ce5fdd2`.

## 1. Fatos

| # | Fato | Evidência | Grau |
|---|---|---|---|
| F1 | `ConvertLeadSchema` fixa `account.size ∈ {Micro,Small,Medium,Large,Enterprise}` e `contact.role ∈ {Decision Maker,Influencer,Champion,Gatekeeper,User}` | `server/src/features/crm/dtos/CrmPipelineDto.ts:93,105` | lido |
| F2 | A tela manda texto livre: `LeadConvertModal.tsx:157` ("Porte") e `:187` ("Papel") são `<input type="text">`; vazio é omitido (`trim` → `undefined`, `:60-63`) | leitura | lido |
| F3 | Qualquer texto fora do enum → 400: `size:'Pequena'` → `invalid_value` em `account.size`; `role:'Decisor'` → `invalid_value` em `contact.role`; vazios omitidos → OK | sonda `ConvertLeadSchema.safeParse` 28/09 | verificado |
| F4 | `size` (crmAccounts) e `role` (crmContacts) são **`freeSelects`**: o tenant troca as opções no onboarding (`selectOverrides`, I8 c11) | `server/src/features/dynamicTables/presets/modules/registry.ts:92,106`; `dashboardModules.integration.test.ts:122` cria `crmAccounts.size = ['P','G']` com sucesso | lido |
| F5 | A DynamicTable valida `select` contra as opções **instaladas** (`z.enum(field.options)`) | `DynamicTableService.ts:1150-1155` | lido |
| F6 | O serviço repassa o valor cru para a linha: `accountData.size = input.account.size` / `contactData.role = input.contact.role` | `CrmPipelineService.ts:189,213` | lido |
| F7 | Consequência de F1+F4+F5: num tenant com opções customizadas, **nenhum** valor de Porte/Papel passa — o DTO recusa o que não é inglês, a tabela recusa o inglês | inferido de F1/F4/F5 — o guarda B-1 prova | inferido |
| F8 | O FE lista as tabelas com `schema` (`useCrmData.ts:46-50`, `DynamicTableService.getTables()`); `crmAccounts`/`crmContacts` podem não estar instaladas (submódulos CRM-2A/2B, #414) | leitura | lido |

## 2. Checklist

### Passo 0 — registro (autorizado por F-B3-1)
- **R-1** Linha nova no `docs/operating-manual/GAP-MAP.md` Nível 3, formato das vizinhas, status `[ABERTO]`: descrição com
  F1–F7 (arquivo:linha dos dois lados), origem "varredura FE×DTO 2026-09-28 / plano de pendências B3", autorização
  citando as frases do dono, comando que prova = o guarda B-1.

### Sessão A — `sessao-instrumentacao` (só arquivos de teste + a linha do GAP-MAP)
- **T-1 (BE, integração, `--runInBand`)** Tenant criado com `selectOverrides: { crmAccounts: { size: ['P','G'] },
  crmContacts: { role: ['Decisor','Usuário'] } }` (suites `crmModule` + submódulos que instalam as duas tabelas — ler
  `dashboardModules.integration.test.ts` para o helper `criar`) → lead → `POST /api/crm/pipeline/convert-lead` com
  `account.size:'P'`, `contact.role:'Decisor'` → espera 201 e a linha de `crmAccounts` com `size === 'P'`.
  Vermelho esperado: **400** do DTO (`invalid_value` em `account.size`).
- **T-2 (BE, mesmo arquivo)** Mesmo tenant, `size:'Enorme'` (fora das opções instaladas) → 400 e nenhuma conta criada.
  Declarado: **verde hoje** (o DTO já recusa) — guarda de que a correção não abre o campo para qualquer texto.
- **T-3 (FE, vitest de `LeadConvertModal`)** Com o schema instalado de `crmAccounts.size = ['P','G']` (mock de
  `DynamicTableService.getTables`), o modal oferece Porte como `<select>` com opção vazia + `P`,`G`; escolher `G` →
  `CrmService.convertLead` recebe `account.size === 'G'`. Idem Papel. Vermelho esperado: não há `<select>` (asserção de
  existência, mesma técnica do guarda `J930 no contrato do SignerSchema`).

### Sessão B — `sessao-correcao`
- **C-1 (BE)** `CrmPipelineDto.ts:93,105`: `size`/`role` → `z.string().trim().min(1).optional()`. A autoridade do valor passa a
  ser o select instalado (F5), que o `createData` do serviço já aplica dentro da mesma operação. Atualizar
  `CrmPipelineDto.test.ts` se houver caso de enum.
- **C-2 (BE)** Conferir que a recusa da tabela (T-2) sai como **400 nomeado**, não 500 — se sair 500, é achado para
  reportar (regra 3 da correção), não para "consertar junto".
- **C-3 (FE)** `crm.service.ts` `ConvertLeadPayload`: `size?`/`role?` seguem `string` (valores são do tenant).
- **C-4 (FE)** `LeadConvertModal.tsx`: Porte/Papel viram `<select>` alimentados pelas `options` do campo `size` de
  `crmAccounts` e `role` de `crmContacts` do schema instalado; opção vazia = omitir (mantém o `trim`). Tabela ausente ou
  campo sem opções → o controle não aparece (nada é enviado). **Cuidado com o envelope**: `GET /dynamic-tables/:id` devolve
  `{success, data:{schema}}` (GAP-MAP N3 "CRM — hooks leem meta.schema de envelope", #385).
- **C-5 (FE)** i18n pt/en só para rótulo/placeholder novos, se houver; os **valores** das opções não são traduzidos (são
  dado do tenant).
- **C-6** GAP-MAP: status `[CORRIGIDO <data>]` com o comando que prova.

### Gates
- `cd server && npx tsc --noEmit`; `cd server && npm run test:integration -- <arquivo do T-1>` (nunca jest cru);
  `npx jest src/features/crm/dtos`.
- `cd my-app && npx tsc --noEmit`; vitest do arquivo do T-3; paridade i18n; `npm run build`.
- Sem rota nova → sem `docs.paths`/path-count. Sem eventType novo → sem `auditCanonical`.
- Sign-off de browser (H2) = humano: linha em branco no `RUNBOOK-H2-BROWSER-SIGNOFF.md` (converter lead num tenant padrão
  e num tenant com `selectOverrides`).

## 3. Contrato

```ts
// BE — server/src/features/crm/dtos/CrmPipelineDto.ts (ConvertLeadSchema)
account: z.object({
  name: z.string().min(1),
  size: z.string().trim().min(1).optional(),   // era z.enum([...5 em inglês]); autoridade = select instalado (freeSelects)
  ...
}),
contact: z.object({
  role: z.string().trim().min(1).optional(),   // era z.enum([...5 em inglês]); idem
  ...
}).optional(),
// Validação do valor: DynamicTableService.createData → z.enum(field.options) do schema INSTALADO do tenant.

// FE — LeadConvertModal
// options(size) = schema(crmAccounts).fields.find(f => f.name === 'size')?.options ?? []
// options(role) = schema(crmContacts).fields.find(f => f.name === 'role')?.options ?? []
// payload: valor escolhido ou chave omitida
```

## 4. Forks

Todos ratificados (§ cabeçalho). Nenhum pendente. Se surgir decisão não coberta (ex.: T-1 exige helper de teste novo
fora do arquivo), a sessão para e registra.

## 5. Pendente de validação externa
- Nenhuma (regra de CRM do produto, não fiscal/contábil).

## 6. Insumos ausentes
- Qual combinação de `suiteKey`/`modules` instala `crmAccounts` **e** `crmContacts` depois do #414 (CRM-2A/2B) — ler o
  `BE-INCR-CRM-SUBMODULES-brief.md` e o helper do teste antes de escrever o T-1.

## 7. Achados fora de escopo
- Outros DTOs que fixam enum de campo `freeSelects` (se houver) — mesma classe; não varrer nesta sessão.
