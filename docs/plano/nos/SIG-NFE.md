---
id: "SIG-NFE"
tipo: "regua"
dominio: "fiscal"
titulo: "Verificação da assinatura (XMLDSig) do XML de NF-e importado"
estado: "planned"
estado_detalhe: "**Nó de régua** por decisão do dono (25/09) — conta no denominador fiscal, ver [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]. Fase 2 do plano pós-contador. Passos 2.1–2.2 FEITOS: instrumentado vermelho 26/09 (#391 `1e1e82b7` — `nfeController.purchase.signature.integration.test.ts`, `it.failing`, Expected 400 / Received 201; GAP-MAP 14). Próximo: BRIEF 2.3 + F-SIG-1 (dono), implementação 2.4"
depende_de: ["[[FIS-08]]"]
autorizacao: "dono em chat 26/09: \"instrumenta a assinatura\" (2.1–2.2) — sem 'executa' para 2.4; F-SIG-1 pendente"
prs: ["#391"]
ancora_sdd: "§III.2"
atualizado: "2026-09-26"
---
# SIG-NFE — Verificação da assinatura (XMLDSig) do XML de NF-e importado

**Estado:** `planned` — **Nó de régua** por decisão do dono (25/09) — conta no denominador fiscal, ver [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]. Fase 2 do plano pós-contador. Passos 2.1–2.2 FEITOS: instrumentado vermelho 26/09 (#391 `1e1e82b7` — `nfeController.purchase.signature.integration.test.ts`, `it.failing`, Expected 400 / Received 201; GAP-MAP 14). Próximo: BRIEF 2.3 + F-SIG-1 (dono), implementação 2.4  
**Autorização:** dono em chat 26/09: "instrumenta a assinatura" (2.1–2.2) — sem 'executa' para 2.4; F-SIG-1 pendente  
**PRs:** #391  
**Depende de:** [[FIS-08]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.2

## Docs

- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 2 (passos 2.1–2.4)
- [`docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md)

## Cadeia (do plano, 4 passos)

1. **2.1** confirmar lendo `lib/nfe.ts` + `NfeImportService` que nenhuma assinatura é verificada — `instrumentação`
2. **2.2** GAP-MAP + teste-guarda vermelho (XML com `<Signature>` adulterada → hoje importa; esperado 400)
3. **2.3** BRIEF curto: XMLDSig (**checar antes se já existe lib instalada** — não propor dependência nova sem isso) + modo fixture explícito só em teste
4. **2.4** implementação pelo BRIEF

## Fork pendente

- **F-SIG-1** — rigor da verificação: recusar toda nota sem assinatura válida × aceitar com aviso em modo fixture.
  **RATIFICAÇÃO PENDENTE** (texto do fork no plano, Fase 2).

## Vizinhos

- [[E9]] — troca dos fixtures sintéticos por NF-e real; um XML real assinado é o insumo natural do teste de 2.2.
- [[X6]] — mesma cadeia de importação (custo/crédito); a Fase 1 do plano fechou lá.
