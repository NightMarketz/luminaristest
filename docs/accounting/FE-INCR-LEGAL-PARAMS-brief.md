# FE-INCR-LEGAL-PARAMS — tela dos coeficientes de lei da plataforma (BRIEF)

> **Sessão:** `sessao-planejamento` → `sessao-feature` em sequência.
> **Autorização:** F-LP-7 → (a) *"BRIEF FE separado (`FE-INCR-LEGAL-PARAMS`)"*, dono 06/10
> ([D-2026-10-06-LEGAL-PARAMS-FORKS](../plano/decisoes/D-2026-10-06-LEGAL-PARAMS-FORKS.md)); dono, chat, 08/10:
> *"executa o FE-INCR-LEGAL-PARAMS"* + questionário *"Planejar e executar em sequência"*.
> **Nó:** LEGAL-PARAMS (o FE é a parte F-LP-7 do mesmo nó; sem nota própria).
> **Base:** `origin/main` `9fc3d56a`.

## 0. Insumos (fato consumado)

- Rotas do BE (PR-1, `server/src/routes/legalParameters.ts`): `GET /api/legal-parameters?tabela&status` (lista, qualquer
  autenticado, sem paginação), `GET /api/legal-parameters/vigente`, `POST /api/legal-parameters` (propor),
  `POST /api/legal-parameters/:id/publish`, `POST /api/legal-parameters/:id/revoke` — os 3 últimos só `PLATFORM_ADMIN`.
- Contrato de entrada gerado: `my-app/types/contracts/legalParameters/LegalParameterDto.gen.ts`; resposta =
  `LegalParameterView` (`server/src/features/legalParameters/dtos/LegalParameterDto.ts`), declarada à mão no service FE
  (decisão 9 de D-2026-09-28: respostas fora do gerador).
- Semântica (BRIEF BE §9): L-6 só o status muda; L-7 a substituída sai do lookup (`supersedesId`, mesma
  tabela/chave/discriminador); formato por tabela validado no BE (`formatoLinha.ts`) — 400 com mensagem.

## 1. Forks — ratificados 08/10 (questionário)

| Fork | Caminhos | Recomendação | Decisão |
|---|---|---|---|
| F-FE-LP-1 Onde mora | (a) página própria `/legal-parameters` · (b) aba na Contabilidade | (a) | ✅ **(b) contra a recomendação** — *"Aba na Contabilidade"* |
| F-FE-LP-2 Ações | (a) lista + histórico + propor/publicar/revogar (só PLATFORM_ADMIN) · (b) só lista + histórico | (a) | ✅ (a) |
| F-FE-LP-3 Histórico | (a) cadeia de versões da mesma tabela/chave/discriminador · (b) trilha de auditoria (rota nova no BE) | (a) | ✅ (a) |
| F-FE-LP-4 valorJson | (a) campo JSON validado pelo servidor · (b) formulário por tabela | (a) | ✅ (a) |

## 2. Checklist de comportamentos

1. **Aba "Parâmetros legais"** (24ª) no `AccountingView`; renderiza mesmo sem unidade selecionada? Não — segue o padrão
   das abas (`unitId &&`), sem usar a unidade (dado de plataforma; o painel não recebe `unitId`).
2. **Service** `lib/services/legalParameters.service.ts`: `list({tabela?, status?})`, `propose(input)`, `publish(id)`,
   `revoke(id)` sobre `apiClient`; entrada pelo tipo gerado, resposta `LegalParameterView`.
3. **Lista** com filtros: tabela (21 do enum), status (todos | DRAFT | PUBLISHED | REVOKED), busca por chave;
   colunas tabela, chave, discriminador, valor (int / texto / JSON resumido), vigência, situação, fonte (link se
   `fonteUrl` http(s)); paginação client-side com `StandardPagination` (a rota devolve tudo, ~1.000 linhas).
4. **Situação derivada** (pura, testada): `RASCUNHO` (DRAFT) · `REVOGADA` (REVOKED) · `SUBSTITUIDA` (PUBLISHED e outra
   PUBLISHED aponta para ela em `supersedesId`, L-7) · `EM_VIGOR` (demais PUBLISHED).
5. **Histórico** (F-FE-LP-3 a): botão por linha abre modal com a cadeia — todas as linhas da mesma
   tabela/chave/discriminador, ordenadas por `vigenteDesde` e `createdAt`, com valor, vigência, situação, fonte, motivo,
   publicada/revogada por e quando.
6. **Papel** `PLATFORM_ADMIN` no tipo `Role` do FE. Só ele vê: "Propor linha", "Nova versão" (proposta com
   `supersedesId` e tabela/chave/discriminador travados), "Publicar" (DRAFT) e "Revogar" (PUBLISHED). Os demais só leem.
7. **Proposta** (F-FE-LP-4 a): modal com tabela, chave, discriminador, tipo do valor (inteiro | texto | JSON), valor,
   fonte (obrigatória), URL e sha256 da fonte, vigência (desde obrigatória, até opcional), motivo (obrigatório).
   Validação no cliente só de presença/sintaxe (inteiro, JSON parseável, data `AAAA-MM-DD`); o formato por tabela vem do
   BE (400) e aparece no modal (`resolveError`).
8. **Publicar / revogar** com confirmação (modal), mensagem de erro do BE (409 empate de vigência, não é rascunho…);
   recarrega a lista.
9. **i18n** pt/en no namespace `accounting` (paridade é gate). `neutral-*`, `rounded-2xl`/`xl` (gates do FE).
10. **Testes (vitest):** helpers puros (situação, cadeia, payload da proposta, validação) + painel (usuário comum não vê
    ações; PLATFORM_ADMIN vê e publica; histórico abre a cadeia; erro 400 do BE aparece) + contagem de abas (23 → 24).

## 3. Contratos

```ts
// entrada: ProposeLegalParameterInput / ListLegalParametersQueryInput (gerados — não editar)
// saída (à mão, espelha LegalParameterView do BE):
interface LegalParameter { id; tabela; chave; discriminador: string|null; valorInt: number|null; valorTexto: string|null;
  valorJson: unknown; fonte; fonteUrl: string|null; fonteSha256: string|null; vigenteDesde; vigenteAte: string|null;
  status: 'DRAFT'|'PUBLISHED'|'REVOKED'; supersedesId: string|null; motivo; proposedById; publishedById: string|null;
  publishedAt: string|null; revokedById: string|null; revokedAt: string|null; createdAt }
type Situacao = 'RASCUNHO' | 'EM_VIGOR' | 'SUBSTITUIDA' | 'REVOGADA';
```

## 4. Pendente de validação externa

Nenhuma — a tela não decide regra fiscal; o formato e a semântica são do BE.

## 5. Insumos ausentes

- Não há rota para ler a fila de recálculo (`legal_parameter_recalc_jobs`, PR-4 #576) nem a trilha de auditoria da
  plataforma; a tela não mostra o status do recálculo.

## 6. Achados fora de escopo

- Mostrar o `avisoParametroLegal` (PR-4) nas telas de apuração IRPJ/CSLL/PIS/Cofins — não há tela de apuração no FE hoje.
- Status do job de recálculo após publicar (exige rota nova no BE).
