# FE-INCR-BANK-CHARGE-ACCOUNTS — tela das contas de encargo bancário do F7 (E-12) — BRIEF

> ⛔ **CANCELADO 2026-10-09** (dono, chat): *"Aprovo a Opção (a) para o `F-ENC-1`"*, *"Os 2 campos legados `bankCharge*`
> saem do contrato"* e *"A tela isolada … fica cancelada"*. F-FE-BC-1 fica resolvido por consequência (sem tela). A demanda
> segue para a emenda 3.3: as contas por classe são canônicas no plano de contas (E1/E26), sem configuração. A tarifa virou
> a classe `TARIFA_BANCARIA` (EMENDA T, E26–E31, em `BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md`). O campo de tarifa
> na baixa é crescimento do `FE-INCR-BANK-SETTLEMENT`, e não deste documento. Os forks F-FE-BC-2..6 ficam **sem objeto**.
> O texto abaixo fica como registro histórico.

> **Autorização:** dono, chat, 2026-10-09 — *"planeja o FE da tarifa bancária (E-12), só BRIEF"*. Escopo: este documento.
> Não autoriza código, branch de implementação nem nota de nó com `executa`.
> **Origem do item:** `FE-INCR-ACCOUNTING-POLICY-VERSION-brief.md` §2 E-12 e §9 ("Sem tela para tarifa bancária…").
> **Sessão:** `sessao-planejamento`. Forks: todos **RATIFICAÇÃO PENDENTE**.
> **Bloqueio de entrada:** o F-FE-BC-1 depende do **F-ENC-1** (emenda 3.3 do F7, pendente). Se o F-ENC-1 for ratificado em
> (a), esta tela **não deve existir** (ver §5).

## 1. O que o item é, medido no código

"Tarifa bancária" no E-12 é o nome do achado. No código, os dois campos são a **conta do encargo da baixa por retorno
bancário** (F7): a diferença `|linha| − saldo` (até 20%) que o `confirm` lança em `bank.charge`.

| # | Fato | Fonte | Grau |
|---|---|---|---|
| S1 | `bankChargeExpenseAccountId` (natureza `Expense`, "encargo pago", lado AP) e `bankChargeIncomeAccountId` (`Revenue`, "encargo recebido", lado AR) | `AccountingScopeSettingsService.ts:113-121` | V |
| S2 | O `confirm` com `chargeCents > 0` lê a conta pelo lado do título; sem ela → 400 `charge_account_not_configured` | `BankSettlementService.ts:466-478` | V |
| S3 | Hoje o modal da baixa mostra o 400 e o texto *"Configure … em PUT /api/accounting/settings (ainda sem tela…)"* | `BankSettlementPanel.tsx:330-332` | V |
| S4 | GET/PUT `/api/accounting/settings` já existem; o PUT é parcial (só a chave presente muda, `null` limpa) | `accounting.service.ts:723-733`; `AccountingScopeSettingsService.validate` | V |
| S5 | O tipo de escrita do FE é `FixedAssetAccountsPatch = Pick<…, 'unitId' \| 3 campos do imobilizado>`; o `updateSettings` aceita só esse tipo e dispara o toast fixo *"Contas do imobilizado salvas."* | `accounting.service.ts:191-194,729-733` | V |
| S6 | `toScopeSettingsProposal` monta a proposta `SCOPE_SETTINGS` só com as 3 chaves do imobilizado | `features/accounting/lib/policyPayload.ts:27-35` | V |
| S7 | Canônico de seção de contas governada: `FixedAssetAccountsSection` (GET → form → `useGovernedSave` → PUT direto ou proposta ao contador; banners `GovernedOfferButton`/`PendingProposalBanner`/`ActiveAccountantNotice`) | `FixedAssetAccountsSection.tsx` | V |
| S8 | Os tipos gerados já têm os 2 campos (`AccountingScopeSettingsDto.gen.ts:8-9,16-17`) | `.gen.ts` | V |
| S9 | O kit de setor preenche os 2 campos só quando nulos (`fillNullAccounts`) | `AccountingScopeSettingsService.ts:84-104` | V |
| S10 | A aba `conciliacao` está fora de `DELEGATED_TABS` (o contador em modo cliente não a vê) | `AccountingView.tsx:91` | V |
| S11 | **F-ENC-1 pendente** (emenda 3.3): (a) contas canônicas por classe, **os 2 campos saem do DTO**; (b) 8 overrides por classe, os 2 legados viram override de `JUROS_MORA`; (c) só configuração | `BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md:376`, E9 | V |
| S12 | Tarifa **do provedor** (Mercado Pago) é outra coisa: `feeCents` no item, conta pendente do contador (F-PP-6 → b, P3) | `D-2026-10-02-PAYMENT-PROVIDER-FORKS.md:67-70,113` | V |

## 2. Checklist numerado (cada item testável sozinho)

> Vale só se F-FE-BC-1 ≠ (c). Gates do `my-app/CLAUDE.md`: reuse do canônico (S7), `neutral-*`, `rounded-2xl`, corpo
> tipado pelo `.gen.ts` (sem espelho à mão, sem import do backend), mapper com retorno declarado, `.gen.ts` intocado,
> paridade i18n pt/en, verificação em build de produção (`withAuth`). Nenhum item toca o backend.

1. **Tipo de escrita.** `BankChargeAccountsPatch = Pick<UpdateAccountingScopeSettingsInput, 'unitId' |
   'bankChargeExpenseAccountId' | 'bankChargeIncomeAccountId'>` em `accounting.service.ts`. Teste de tipo: atribuir uma
   chave do imobilizado a ele não compila (`npm run test:types`).
2. **`updateSettings` deixa de ser do imobilizado.** Assinatura aceita `FixedAssetAccountsPatch | BankChargeAccountsPatch`;
   o toast fixo sai do service e vai para o chamador (ou recebe a mensagem por parâmetro). Teste: salvar contas de encargo
   não mostra "Contas do imobilizado salvas.".
3. **Proposta governada parcial.** `toScopeSettingsProposal` aceita o patch de encargo e põe **só** as 2 chaves de
   encargo no `payload`. Teste unitário: payload sem nenhuma chave do imobilizado, e vice-versa (o patch do imobilizado
   continua sem as de encargo — regressão do comentário de `toAccountsPatch`).
4. **Mapper `toBankChargePatch(unitId, form)`**: vazio → `null`; retorno declarado. Teste: `''` vira `null`, id passa.
5. **Componente `BankChargeAccountsSection`** espelhando o canônico S7: carrega via `getSettings`; **Salvar só depois
   do GET ok** (`loaded`), senão um salvar com o form vazio limparia as contas; `useGovernedSave` com
   `target: 'SCOPE_SETTINGS'`; banners de governança iguais. Teste: GET falho → botão desabilitado + `role=alert`.
6. **Filtro de natureza no seletor.** Encargo pago lista só folhas `Expense`; encargo recebido só `Revenue` (o BE já
   rejeita a errada, S1; o filtro evita o 400 previsível). Reusa `FixedAssetAccountSelect` com a lista pré-filtrada.
   Teste: conta `Revenue` não aparece no seletor de encargo pago.
7. **Lugar na tela** conforme F-FE-BC-2. Teste: a seção renderiza no lugar escolhido com `unitId`.
8. **Ponte a partir do erro.** No modal da baixa, o texto de S3 é trocado por um link/ação que leva à seção (F-FE-BC-3).
   Teste: com o erro `charge_account_not_configured`, o link aparece e aponta para a seção; sem o erro, não aparece.
9. **i18n** pt/en das chaves novas (`bankCharge.accounts.*`) e da troca do `bankSettlement.chargeAccountHint`, mesmo PR.
10. **Copy** do rótulo conforme F-FE-BC-4 (o termo que o operador vê: "encargo" × "tarifa").
11. **Verificação:** `npx tsc --noEmit` + `npm run test:types` + vitest da seção e do modal; tela verificada em build de
    produção; sign-off de browser fica com o dono (runbook, não sessão).

## 3. Contratos (esboço materializável)

```ts
// my-app/lib/services/accounting.service.ts
export type BankChargeAccountsPatch = Pick<
  UpdateAccountingScopeSettingsInput, // do .gen.ts
  'unitId' | 'bankChargeExpenseAccountId' | 'bankChargeIncomeAccountId'
>;
async updateSettings(input: FixedAssetAccountsPatch | BankChargeAccountsPatch): Promise<AccountingScopeSettings>;

// features/accounting/lib/policyPayload.ts
export function toScopeSettingsProposal(patch: FixedAssetAccountsPatch | BankChargeAccountsPatch): SettingsProposal;
// payload = só as chaves presentes no patch (Object.hasOwn), nunca as do outro grupo

// features/accounting/components/BankChargeAccountsSection.tsx
interface BankChargeAccountsSectionProps { unitId: string; accounts: Account[] } // folhas acceptsEntries
interface FormState { bankChargeExpenseAccountId: string; bankChargeIncomeAccountId: string }
export function toBankChargePatch(unitId: string, f: FormState): BankChargeAccountsPatch;
```

Backend: **nenhuma mudança**. Rota, DTO `.strict()`, validação de natureza e governança já existem (S1, S4).

## 4. Pendente de validação externa (não entra no checklist como decidido)

1. **Quais contas o encargo usa** (códigos do referencial de juros/multa/desconto) — contador, follow-up 0.8b ([[D1]]).
   A tela só deixa escolher; a conta certa não é decisão do agente.
2. **"Tarifa bancária" × "encargo" (juros/multa).** Diretriz do dono (chat, 2026-10-09, resposta ao questionário):
   *separar os campos*. Tarifa de serviço (TED, boleto, manutenção, taxa do MP) é despesa operacional, dedutível, fora do
   e-Lalur. Juros e multa são resultado financeiro, e só eles passam pelas regras da emenda 3.3. A justificativa: a tarifa
   lançada como encargo geraria linha indevida no M300. **Efeito neste BRIEF:** reforça o F-FE-BC-4 (a) (o rótulo não diz
   "tarifa") e cria o F-FE-BC-6. A separação em si é **backend** (F7 e emenda 3.3) e fica em §7.
   Pontos da resposta que **não** entram como artefato até alguém conferir o texto vigente (classe
   `tabela-transcrita-de-lei`):
   - a. A resposta cita a indedutibilidade da multa fiscal como "RIR/2018 art. 311 § 2º". O nó F7 e o BRIEF 3.3 citam
     Lei 8.981 art. 41 § 5º e RIR art. 352. Prevalece a citação já registrada até a conferência.
   - b. Os códigos referenciais "3.01.01.07 / 3.02.01.07 / 3.01.04.01" não foram conferidos contra a tabela da RFB
     vigente. O mapeamento é do contador (follow-up 0.8b).
   - c. No exemplo de lançamento da resposta, um título **a receber** debita "despesa de juros". No AR, juros recebidos
     são **receita** financeira (triagem do contador, item 6; `bankChargeIncomeAccountId` = `Revenue`, S1). O exemplo não
     vale como teste.

## 5. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-FE-BC-1** | Esta tela existe antes do F-ENC-1? | **(a)** Esperar o F-ENC-1. Se ele for (a), os 2 campos saem do DTO e esta tela é cancelada; o FE da emenda 3.3 cuida das contas por classe · **(b)** Construir já, sobre os 2 campos atuais, aceitando o descarte se o F-ENC-1 for (a) · **(c)** Construir já e o F-ENC-1 passa a ser (b) (os 2 campos viram override de `JUROS_MORA`, e a tela continua útil) | **(a).** A recomendação registrada do F-ENC-1 é (a), que apaga exatamente estes campos; (b) gasta um PR para ser removido, (c) inverte uma recomendação de outro nó por conveniência de tela. Custo de (a): a baixa com encargo segue travada em `charge_account_not_configured` até a emenda, mas hoje o kit de setor já pode preencher (S9) |
| **F-FE-BC-2** | Onde a seção mora (se existir) | **(a)** Dentro da aba Conciliação, junto da sub-aba de baixa (onde o 400 aparece) · **(b)** Seção "Contas" genérica numa aba de configurações contábeis (inclui imobilizado; a F-FAFE-3 recusou isso como frente nova) · **(c)** Aba Política | **(a).** Mesmo raciocínio do F-FAFE-3 (a): a conta mora com quem a consome. (b) reabre o que o dono já recusou |
| **F-FE-BC-3** | A ponte do erro no modal | **(a)** Link que fecha o modal e abre a seção · **(b)** Seção inline dentro do modal · **(c)** Só trocar o texto | **(a).** (b) põe escrita governada dentro de um modal de confirmação; (c) deixa o usuário procurando |
| **F-FE-BC-4** | Rótulo que o operador vê | **(a)** "Encargo pago/recebido (juros e multa)" · **(b)** "Tarifa bancária" · **(c)** Os dois | **(a)**, sujeito ao §4.2. "Tarifa" induz a lançar tarifa de serviço numa conta de juros |
| **F-FE-BC-6** | Diretriz "separar tarifa de juros/multa" (§4.2) × esta tela | **(a)** Esta tela só mostra as contas de juros/multa. A conta de tarifa nasce com o BE que separar `tarifaCents` (§7) e ganha a sua seção nesse FE · **(b)** Esperar o BE da separação e planejar uma tela única (tarifa + juros/multa + desconto) | **(b)** se o F-FE-BC-1 for (a), porque aí não há tela antes da emenda e uma tela única evita 2 PRs na mesma seção. **(a)** se o F-FE-BC-1 for (b) ou (c) |
| **F-FE-BC-5** | Contador em modo cliente vê a seção? | **(a)** Não (segue a aba Conciliação, fora de `DELEGATED_TABS`, S10) · **(b)** Sim, via aba Política | **(a).** Mudar a allowlist é decisão de governança, fora deste item; a proposta governada já chega ao contador pelo diff |

## 6. Insumos ausentes

- Nenhum para o desenho. A **ordem** depende do F-ENC-1, que é de outro nó.
- Não existe nota de nó em `docs/plano/nos/` para este item; o registro (frontmatter com `autorizacao`) fica para o fold,
  conforme a pendência 2 do template da `sessao-planejamento`.

## 7. Achados fora de escopo (não planejados)

- **Separar `tarifaCents` de juros/multa na baixa F7** (diretriz do dono, §4.2): muda o item do F7 (`chargeCents` →
  partes), o lançamento `bank.charge` e a emenda 3.3 (F-ENC-1/F-ENC-2 classificam só juros e multa). É backend, de outro
  nó, e precisa de autorização própria. O lugar natural é emendar o BRIEF 3.3 antes de ratificar o F-ENC-1, porque o
  F-ENC-2 (a) já tem `charges[]` por classe, e "tarifa" pode virar uma 5ª classe fora do e-Lalur.
- **Tarifa do provedor (F-PP-6, `feeCents`)** precisa de conta própria e, depois do PR-2/PR-3 do F5, de exibição na
  baixa. É outro FE, pendente do contador (P3).
- **`depreciationParteBAccountId` sem tela** (a outra metade do E-12): sem leitor desde o PR-3 do C8; fora deste item.
- **Toast fixo do `updateSettings`** (S5) é bug latente para qualquer segundo consumidor. O item 2 o resolve se esta tela
  existir; se F-FE-BC-1 → (a) e a tela for cancelada, o toast fica como está (correto para o único consumidor).
