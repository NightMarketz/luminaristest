# FE-INCR-RESET-409 — BRIEF: aviso do 409 no "Resetar sistema"

**Origem:** `BE-INCR-RESET-CONSISTENTE-brief.md` §7, primeiro achado ("FE do 409") · **Sessão:** `sessao-planejamento` · **Data:** 2026-10-16
**Autorização:** dono, chat, 2026-10-16. Escolheu este item entre os próximos passos do I7: *"Aviso de 409 no
frontend: hoje a tela do 'Resetar sistema' mostra só a mensagem de erro. O modal com as contagens por tipo e o caminho
para resolver é o FE-INCR do §7 do BRIEF…"*. Cobre **planejar** (este BRIEF). Os forks F-R409-1..4 foram
**RATIFICADOS** pelo dono por questionário nesta sessão, em 2026-10-16 (§3). A execução ainda precisa de "executa".
**Depende de:** #740 (BE do 409 + `my-app/types/contracts/accounting/AccountingResetDto.gen.ts`), empilhado no #730.
Nenhum dos dois está mergeado. **Não há nota de nó no vault.** Se o dono quiser o nó, `docs/plano/nos/` ganha a nota por
fold (§6).

## 0. Estado medido no código (lido, 16/10, `claude/i7-reset-consistente-pr2` `ed51d1a0`)

| # | Fato | Onde | Grau |
|---|---|---|---|
| E1 | O botão "Excluir Sistema" faz `confirm()` nativo → `DynamicTableService.deleteSystem()` → `window.location.href = '/dashboard/setup'`. O `catch` é vazio (*"Error already handled automatically by apiClient"*) | `my-app/features/dashboard/DashboardSidebar.tsx:124-136, 253-262` | lido |
| E2 | Em erro, o `apiClient.request` chama `notify(message, 'error')` (toast) e **depois** lança `{ ...corpo, status }`. O chamador recebe `code`, `message`, `details` e `status`. Não existe opção por chamada para suprimir o toast | `my-app/lib/api/api-client.ts:69-76` | lido |
| E3 | Precedentes de chamador que trata o corpo lançado: `reportBuilder.ts:825-829` (lê `code` + `details`) e `ReviewPanel.tsx:268` (`status === 409` → recarga) | idem | lido |
| E4 | O corpo do 409 (BE #740) é `{ code: 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING', message, details: { blocking: [{ table, count }] } }`. `table` vem do enum `ACCOUNTING_RESET_BLOCKING_REPORT` (56 BLOCKING + `AccountingPolicyVersion` com contador) | `server/src/features/accounting/dtos/AccountingResetDto.ts`, `models/accountingResetClassification.ts` | lido |
| E5 | Um 2º 409 possível, `SYSTEM_RESET_COMPANY_LEVEL_WITHOUT_TRAIL`, vem **sem** `details` (caso raro: perfil da empresa sem trilha) | `AccountingScopeResetService.ts` | lido |
| E6 | Modal canônico: `components/ui/Modal.tsx` (`isOpen`, `onClose`, `title`, `footer`, `maxWidth`). As chaves `deleteSystem`/`confirmDeleteSystem` moram em `public/locales/{pt,en}/common.json` | idem | lido |
| E7 | O FE consome o payload pelos tipos do `dtoShapeSnapshot` (`my-app/types/contracts/**.gen.ts`, `import type`), nunca importando do backend (memória `fe-contract-types-import-type`) | `AccountingResetDto.gen.ts` (no #740) | lido |

## 1. Checklist de comportamentos (cada um testável sozinho)

1. **Reconhecer o 409.** Um guard puro `isResetBlocked(err): err is ResetBlockedError` em
   `features/dashboard/lib/resetBlocked.ts`. Ele é verdadeiro só com `status === 409`,
   `code === 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING'` e um `details` que passa no shape do contrato (§2). Teste vitest:
   aceita o corpo real; recusa outro `code`, `details` ausente ou malformado, e `status` diferente.
2. **Abrir o modal no lugar do silêncio.** No `catch` do `handleDeleteSystem`, um bloqueio de reset abre o
   `ResetBlockedModal` (sobre o `Modal` canônico) com os `details`. Qualquer outro erro mantém o comportamento de hoje.
   O redirect **não** acontece. Teste: `deleteSystem` rejeitado com o corpo do 409 ⇒ modal visível, e `location` não
   muda.
3. **Contagens por tipo.** O modal lista as entradas de `blocking`, legíveis, com a contagem, na forma do F-R409-1.
   Um `table` sem rótulo conhecido aparece pelo nome cru (degrada, não quebra). Teste: 2 entradas ⇒ 2 linhas com as
   contagens; um nome desconhecido ⇒ linha com o nome cru.
4. **Caminho para resolver.** Abaixo da lista, o texto de ação que o F-R409-2 decidir. Teste: o texto certo para um
   `blocking` só de contador e para um `blocking` com lançamento.
5. **Toast + modal (F-R409-3 b).** O `apiClient` não muda: o toast de hoje continua, e o modal abre por cima com as
   contagens. Teste: o 409 abre o modal (o toast vem do `apiClient`, que o teste não precisa mockar além de hoje).
6. **i18n pt/en em namespace novo (F-R409-4 b).** `public/locales/{pt,en}/reset.json`. O `reset` entra no `ns` de
   **toda** página que monta o `DashboardSidebar`, no mesmo PR (memória `i18n-namespace-novo-precisa-entrar-no-ns`;
   sem isso o SSR sai vazio). O executor lista essas páginas por grep de `DashboardSidebar`/layout. A paridade pt/en é
   gate.
7. **Gates do diff.** `cd my-app && npx tsc --noEmit` + `npm run test:types`; vitest com o shim de `React` global
   (`my-app/CLAUDE.md`); `neutral-*` e `rounded-2xl`; `check:arch` (U1: o componente não importa `api-client`). A tela
   fica atrás de `withAuth`, então o **sign-off de browser é sobre o build de produção** (gate humano, runbook; agente
   não assina).

## 2. Contratos esboçados

```ts
// features/dashboard/lib/resetBlocked.ts
import type { SystemResetBlockedDetails } from '@/types/contracts/accounting/AccountingResetDto.gen';

export type ResetBlockedError = {
  status: 409;
  code: 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING';
  message: string;
  details: SystemResetBlockedDetails; // { blocking: Array<{ table: string; count: number }> }
};
export function isResetBlocked(err: unknown): err is ResetBlockedError;

// features/dashboard/components/ResetBlockedModal.tsx
export interface ResetBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocking: SystemResetBlockedDetails['blocking'];
}

// Rótulos (F-R409-1): table → grupo/rótulo (i18n). Desconhecido ⇒ nome cru.
export const RESET_BLOCKING_GROUPS: Record<string, 'lancamentos' | 'financeiro' | 'fiscal' | 'banco' | 'ativo' | 'contador' | 'outros'>;
```

Sem rota nova e sem DTO novo: o contrato de entrada é o 409 do #740.

## 3. Forks: RATIFICADOS (dono, questionário, 2026-10-16)

| Fork | Escolha |
|---|---|
| F-R409-1 | **(a) grupos legíveis**, na recomendação |
| F-R409-2 | **(a) por situação**, na recomendação |
| F-R409-3 | **(b) toast + modal**, contra a recomendação (o `apiClient` não muda) |
| F-R409-4 | **(b) namespace novo `reset.json`**, contra a recomendação |

Texto original dos forks, como foram apresentados:

- **F-R409-1: como mostrar as contagens.** (a) **Recomendado:** agrupar em ~7 grupos legíveis (lançamentos,
  financeiro AP/AR, fiscal, banco/conciliação, imobilizado, contador, outros), com a soma por grupo e o detalhe por
  tabela recolhível. Com 57 nomes técnicos possíveis, rótulo por tabela é muita chave i18n para pouca informação. (b)
  Um rótulo i18n por tabela (57 × 2 chaves). (c) Nome técnico cru + contagem (zero i18n, ilegível para o dono do
  salão).
- **F-R409-2: o "caminho para resolver".** Pelo F-I7-1, o movimento contábil nunca sai pelo reset. (a)
  **Recomendado:** texto por situação. Se o bloqueio é **só** contador (`AccountantAssignment` e/ou
  `AccountingPolicyVersion`): "revogue o acesso do contador e tente de novo" (§7 do BRIEF do I7), com link para a tela
  do contador. Se há lançamento ou documento: "a escrituração precisa ser preservada; o reset não está disponível para
  este sistema; fale com o seu contador", sem ação. (b) Só o texto genérico, sem distinguir contador. (c) Link para a
  tela contábil de cada grupo (mais telas para mapear, e algumas não existem).
- **F-R409-3: o toast que o `apiClient` dispara antes do modal (E2).** (a) **Recomendado:** opção por chamada no
  `apiClient`, `{ silentStatuses?: number[] }`, para o `deleteSystem` passar `[409]`. É uma mudança pequena e opt-in no
  cliente canônico, com teste próprio. (b) Aceitar toast + modal (a mesma mensagem duas vezes). (c) O modal não abre e
  só o toast fica, com mais texto (perde as contagens).
- **F-R409-4: namespace i18n.** (a) **Recomendado:** chaves em `common.json`, junto de `deleteSystem` (o sidebar já
  usa o `common`; nenhum `ns` novo). (b) Namespace novo `reset.json` (exige entrar no `ns` das páginas que montam o
  sidebar).

## 4. Pendente de validação externa

Vazia. Nenhuma regra contábil ou fiscal nova: o FE só mostra o que o BE decidiu (F-I7-1).

## 5. Insumos ausentes

1. A tela de gestão do contador para onde o link do F-R409-2 (a) apontaria: não li. O executor confirma a rota antes.
   Se ela não existir, o texto fica sem link (não é fork).

## 6. Achados fora de escopo (registrados, não planejados)

- O `confirm()` nativo da confirmação do reset (E1) foge do padrão de modal da casa. Trocar pelo `Modal` é outra
  mudança.
- Este FE-INCR não tem nota em `docs/plano/nos/`. Criar o nó (e o fold) é decisão do dono.
- O §7 do BRIEF do I7 também registra que `GET /dashboard/system` não existe no BE, mas o FE o chama
  (`dynamic-table.service.getSystem`). Isso continua fora daqui.
