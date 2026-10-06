# RETORNO — FE-INCR-DFE PR-2 (itens 14–29, tela da emissão manual de NFS-e)

tarefa: tela de emissão manual de NFS-e no detalhe da venda — service `dfe.service`, botão "Emitir NFS-e" + preview, seção "Documentos fiscais" com ações por status, ficha espelho do portal, retorno pelo XML com releitura, rejeição/reenvio, cancelamento manual, downloads, i18n, testes, `RUNBOOK-H2-DFE-MANUAL.md` em branco. Emissão real fora.
autorizacao: dono em chat, 06/10/2026: "Executa o PR-2 do FE-INCR-DFE — sessao-feature; emissão real fora; merge só com meu OK" (ratificado com "Dispara em sequencia aqui tudo em opus medio"). Ainda NÃO registrada no campo `autorizacao` de `docs/plano/nos/FE-INCR-DFE.md` (fold é pós-merge).
sessao: sessao-feature · branch `claude/fe-incr-dfe-pr2` de origin/main `cd338e0c` · PR https://github.com/NightMarketz/luminaristest/pull/547 (aberto, NÃO mergeado)
modelo: claude-opus-5-5
perfil-previsto: sonnet-alto
rodadas-de-review: 0 — review independente não despachado nesta sessão (pendente; a sessão-feature pede agente isolado)
veredicto: implementado, gates verdes; aguarda review independente e OK do dono para merge

### Checklist (BRIEF §2, PR-2)
- 14 `lib/services/dfe.service.ts` (+ `accountingService.downloadDocumentAttachment` ao lado do `downloadReceipt`, mesma técnica) — feito (`dfe.service.test.ts`, 7)
- 15 botão "Emitir NFS-e" no `SaleDetailPanel` (componente em `features/accounting/components/dfe/`, só montado) — feito (`EmitNfseButton.test.tsx`, 6; `SaleDetailPanel.test.tsx` +2)
- 16 seção "Documentos fiscais", ações por status, só `partner === 'manual'` — feito (`FiscalDocumentsSection.test.tsx`)
- 17 regra de erro: relê `GET /documents/:id` depois de qualquer erro; caso F6 — feito (teste F6 + teste cancelamento 500→CANCELLED)
- 18 ambiente do documento × `/status`, faixa âmbar, link só em produção — feito (`FichaModal.test.tsx`)
- 19 ficha espelho, 4 seções na ordem do portal, copiar, "conferido na volta" — feito (`FichaModal.test.tsx`)
- 20 `features/accounting/lib/portalFormat.ts` (milhar = constante desligada) — feito (`portalFormat.test.ts`, 13)
- 21 retorno: input file escondido + DANFSe opcional, releitura IGUAL/DIVERGENTE, PII, recarregar → `view.releitura` — feito (`RetornoManualForm.test.tsx` + seção)
- 22 rejeição 1–20 linhas (`nonEmpty`) + reenviar → ficha da tentativa 2 — feito (testes na seção e no modal)
- 23 cancelamento: cMotivo 1/2/9, xMotivo 15–255 com contador, XML obrigatório, "Cancelar, não Substituir" — feito (`CancelamentoManualModal.test.tsx`)
- 24 downloads só com id, nome `nfse-<nNFSe|id>.xml|.pdf` — feito
- 25 `resolveErrorWithCode`, 403 íntegro, 409 relê — feito
- 26 i18n `dfe.*` (accounting) + `sales.emitNfse` (finance_view), pt/en; teste de que toda chave dos enums tem tradução — feito (`dfeLabels.i18n.test.ts`); ver achado A1 abaixo
- 27 testes vitest dos 7 alvos — feito (8 arquivos novos)
- 28 gates do FE + verificação em build de produção com `DFE_PARTNER=manual` — feito (ver PROVA e "Verificação em build de produção")
- 29 `docs/accounting/RUNBOOK-H2-DFE-MANUAL.md` em branco — feito (evidência/desfecho/assinatura vazios)

### PROVA
- `cd my-app && npx tsc --noEmit` → exit 0
- `cd my-app && npm run test:types` → exit 0
- `cd my-app && npx vitest run` → exit 0 · 105 arquivos, 719 testes
- `cd my-app && npm run build` → exit 0
- `cd server && npx tsc --noEmit` → exit 0 (sem diff no server)
- `node .claude/skills/skill-audit/check-i18n-keys.mjs` → "i18n en↔pt consistente." · `skill-audit.mjs run` → 0 findings
- par vermelho→verde do item 17: trocar a comparação de status do `run()` por `false` → `FiscalDocumentsSection.test.tsx` 1/13 vermelho (cancelamento 500→CANCELLED); restaurado → 13/13

### Verificação em build de produção (banco DESCARTÁVEL, nunca o dev.db real)
`prisma migrate deploy` num SQLite novo no scratchpad → `db:seed:accounting --years 2026` (senha de teste gerada) →
`activate-salon-binding.mjs` → server da branch na porta 3101 com `DFE_PARTNER=manual`, `DFE_PARTNER_ENV=homologacao` →
`next build` + `next start` na 3100. Unidade com CNPJ de teste, serviço + perfil de serviço, cliente com CPF de teste,
venda de serviço finalizada (tudo por API). Visto na tela: botão "Emitir NFS-e" e seção "Documentos fiscais"; preview
com 1 documento e R$ 150,00; ficha "tentativa 1" com as 4 seções e os valores no formato do portal; rejeição registrada
→ cartão "Rejeitada" com código/mensagem. Dois defeitos do BE apareceram (L-PR2-1/2 abaixo); para seguir, a data da venda
foi corrigida à mão NO BANCO DESCARTÁVEL. Retorno por XML e cancelamento não foram exercitados no browser (sem XML real;
cobertos pelos testes vitest e pelo runbook).

### Desvios do BRIEF (declarados)
1. `pages/dashboard/index.tsx` carrega o namespace `accounting` no SSR — o detalhe da venda vive no dashboard e as chaves
   `dfe.*` moram em `accounting.json` (item 26). Hoje é inócuo por causa do achado A1.
2. Mock de `dfe.service` acrescentado em 3 testes existentes do detalhe da venda (`SaleDetailPanel`, `pacoteValidade`,
   `vendaPacote`) — sem ele a seção nova bate na rede do jsdom (`window is not defined` pós-teardown).
3. Decisões de forma não escritas no BRIEF (inferidas, baixo risco, reversíveis): a seção só aparece em venda
   Finalizada/Cancelada/Devolvida (rascunho não tem documento); o aviso F6 só para `partner === 'manual'`; os textos
   das 3 pendências são meus (o BRIEF só nomeia as chaves); "Código interno do contribuinte" sem valor na DPS mostra o id
   da venda para copiar com a instrução "se o portal exigir" (PV-8, "ex.: usar o id da venda").
4. O download reusa `reconStreamDownload` do `accounting.service`, que hoje é alias de `multipartStreamDownload`
   (extraído depois do BRIEF) — mesma técnica, nenhuma cópia nova.

### Lacunas de spec (novas — nenhuma bloqueia o PR-2, duas bloqueiam o USO real da tela)
- **L-PR2-1 (verificado por execução)** — `POST /nfe/dfe/documents` responde **400** `infDPS.dCompet` fora de
  `AAAA-MM-DD` para venda criada pelo motor: `FiscalDocumentEmissionService.ts:606` usa `saleData.date` cru, e o motor grava
  `2026-10-06T00:00:00.000Z` (memória `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`). O preview passa (`ok=true`).
  Conserto é do BE (fora do PR-2, regra 3). Pré-condição P8 do runbook.
- **L-PR2-2 (verificado por execução)** — `reenviar` de um `REJECTED` responde `emissao_bloqueada: já existe documento
  vivo (status REJECTED)`: `reassembleGroupForReenvio` chama `assemble`, cuja checagem de documento vivo (`:662-667`) conta
  o próprio documento rejeitado. A tela segue o item 17 (relê e mostra a mensagem). Conserto é do BE. Pré-condição P9.
- N3 do PR-1 (releitura volta a `null` depois do reenvio) toca o PR-2: a tela mostra só a releitura da tentativa
  corrente e não presume nada — segue para decisão do dono.
- L4 do PR-0 (toast do `apiClient` em todo não-2xx) toca o PR-2: erros de comando aparecem no toast **e** inline.
  Não corrigido (aguarda decisão). L1/L2 não tocam o PR-2.

### Achados fora de escopo
- **A1 (verificado)** — o namespace `accounting` chega VAZIO no SSR em toda página (inclusive `pages/accounting`):
  `next-i18next.config.js` não lista `accounting` em `ns`. Prova: `serverSideTranslations('pt',['accounting'])` → 0 chaves,
  com o `accounting.json` de `origin/main` também; com `ns` acrescido de `accounting` → 34. Efeito: toda a contabilidade
  mostra só o fallback pt inline e o `en` nunca se aplica. Conserto de 1 linha, mas muda o idioma de todo o módulo — é frente
  própria.
- **A2 (observado)** — erro `VALIDATION_ERROR` do BE com `details` em array de issues aparece como "Validation failed. Check
  the details…" (o `resolveError` não humaniza esse formato).

### Linha de fold pós-merge
id: FE-INCR-DFE · estado: a decidir no fold (os 3 PRs em main; resta o gate humano do runbook e as L-PR2-1/2 do BE) · estado_detalhe: "+ PR-2 (itens 14–29) mergeado; RUNBOOK-H2-DFE-MANUAL em branco; L-PR2-1/2 (BE) bloqueiam o uso real" · prs: [479, 524, 547]
