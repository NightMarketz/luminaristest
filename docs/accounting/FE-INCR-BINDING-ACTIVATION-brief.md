# BRIEF — FE-INCR-BINDING-ACTIVATION (LAC-B) — item DIFERIDO na fila

> Produzido em sessão de planejamento, 2026-09-02, sob a autorização "planeja todos os LAC".
> **A posição da LAC-B na fila permanece DIFERIDA** (ratificação de 2026-09-01): este BRIEF
> destrava a execução FUTURA — nenhuma sessão de feature deve executá-lo antes de o dono ativar o
> item (gatilho registrado: onboarding self-service ou P2). **FORKS RATIFICADOS 2026-09-02**
> ("ratifico todas as recomendações dos forks") — a ratificação fixa os caminhos, NÃO ativa o item.

## Contexto fixo

- **Item:** LAC-B — ativação da Prensa de binding sem CLI. `ACCOUNTING-MASTER-MAP.md` §5.1, linha
  **LAC-B** (⚫ DIFERIDO 2026-09-01); `PROXIMOS-PASSOS-2026-09-01.md` §1 ("permanece diferida").
- **Autorização:** dono, 2026-09-02 ("planeja todos os LAC") — cobre ESCREVER este BRIEF; **não**
  cobre executá-lo (divergência reportada na abertura da sessão).
- **Insumos existentes:**
  - `POST /api/accounting-binding/compile` exige payload que nenhum formulário simples fornece:
    `unitId`, `sectorKey`, `operationalSchema` (snapshot do preset), `chart` (snapshot integral) e
    `eventBindings` (matriz papel→conta com `accountCode` literal por roleSlot). Ativação = efeito
    do compile sem bloqueante (não há rota activate separada).
  - CLI `activateAccountingBindingCli.ts`: pré-check idempotente (Active ⇒ NO-OP), pré-condição
    dura de chart (0 contas ⇒ exit 1), compile com a fixture embutida (`SALE_BINDING_V1` +
    `SALE_OPERATIONAL_SCHEMA_SNAPSHOT`), flag `--sector-key` já parametrizada.
  - Boot: `initializeAccountingSyncFromBindings()` antes do `listen()`; zero binding Active ⇒
    `process.exit(1)`. Ordem obrigatória: chart → compile → boot.
  - Zero referências a `accounting-binding` em `my-app`.
  - `ChartOfAccountsFixture.ts` = plano canônico (17 contas) do setor salão.
- **Nós vizinhos:** onboarding (`InterviewService`/`dashboardController.handleQuickCreation` —
  instala preset; hoje NÃO instala chart nem binding); `BindingCompileService`/
  `BindingValidationService` (9 checagens + dry-run); LAC-A..E nenhum depende deste item.

## Checklist numerado de comportamentos

1. **Endpoint novo `POST /api/accounting-binding/activate-default`** — equivalente HTTP do CLI:
   body `{ unitId, sectorKey? }` (default = setor do binding padrão); server-side embute fixture +
   snapshot; idempotente (Active existente ⇒ 200 com `status:'already-active'`); bloqueantes do
   validador retornados estruturados. Cadeia completa Route → Controller → Service (+ Policy, DTO
   Zod `.strict()`); registro 2 toques (`index.ts` + `docs.paths.ts`) ⇒ **guard de path-count do
   openapi atualiza**. Testável: integração feliz + sem chart + idempotência (espelha o
   `--self-check` do wrapper).
2. **Policy:** mesma família de autorização das rotas de accounting-binding existentes (admin do
   escopo). Testável: 403 para usuário sem permissão.
3. **Pré-condição de chart** conforme fork F-B2. Se (a): flag explícita `installChartIfEmpty: true`
   no body instala `ChartOfAccountsFixture` antes do compile (nunca silenciosamente).
4. **UI mínima** conforme fork F-B1: superfície que chama o endpoint e exibe resultado
   (Active × lista de bloqueantes), i18n pt/en, build de produção.
5. **Auditoria:** compile já audita pela cadeia existente; **nenhum eventType novo** (se a
   implementação exigir um, entra na allowlist do `auditCanonical` na MESMA mudança — gate).

## Contratos esboçados

```ts
// ActivateDefaultBindingDto (Zod .strict())
{ unitId: z.string().min(1), sectorKey: z.string().min(1).optional(),
  installChartIfEmpty: z.boolean().optional() /* só se F-B2=(a) */ }
// Resposta: { success: true, data: { status: 'Active' | 'already-active',
//   bindingVersion?: number, blocking?: ValidationFinding[] } }
```

## Forks — RATIFICADOS 2026-09-02 (todas as recomendações acolhidas)

- **F-B1 — onde vive a superfície:** (a) só endpoint (consumível por chatbot/API — alinhado à visão
  API-first do dono, 2026-09-01 nesta sessão); (b) botão manual em aba de configuração contábil;
  (c) chamada automática no onboarding ao instalar preset de setor (fecha a cascata
  instalar→contabilizar). **Recomendação: (a) agora, (c) como segundo passo** — (c) muda o
  onboarding e merece degrau próprio. **RATIFICADO 2026-09-02 (recomendação).**
- **F-B2 — chart ausente:** (a) endpoint instala a fixture do chart sob flag explícita;
  (b) reporta bloqueante e exige chart prévio (como o CLI). **Recomendação: (a)** — sem a flag o
  comportamento é (b); a flag torna o onboarding self-service possível em uma chamada. **RATIFICADO 2026-09-02 (recomendação).**
- **F-B3 — múltiplas unidades:** ativar por unidade (como hoje) × loop server-side "todas as
  unidades do usuário". **Recomendação: por unidade** (espelha o CLI; loop é açúcar do cliente).
  **RATIFICADO 2026-09-02 (recomendação).**

## Pendente de validação externa

— (vazia; a matriz papel→conta usada é a fixture já ativa em produção — nenhum mapeamento novo).

## Insumos ausentes

1. **Gatilho de ativação do item** — decisão do dono (onboarding self-service ou P2). Sem ele,
   este BRIEF não avança para feature.

## Achados fora de escopo

- Editor completo da matriz papel→conta por evento (só quando um tenant divergir do padrão do setor).
- Instalação de chart custom (não-fixture) pelo onboarding.
- Qualquer mudança no boot-gate (`process.exit(1)` permanece — é o desenho ratificado).
