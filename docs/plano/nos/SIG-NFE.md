---
id: "SIG-NFE"
tipo: "regua"
dominio: "fiscal"
titulo: "Verificação da assinatura (XMLDSig) do XML de NF-e importado"
estado: "planned"
estado_detalhe: "**Nó de régua** por decisão do dono (25/09) — conta no denominador fiscal, ver [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]. Fase 2 do plano pós-contador. Lacuna MEDIDA 23/09 (V2): nenhum `Signature`/xmldsig em `server/src` — produção importa XML sem verificar assinatura. Falta instrumentar (teste-guarda: XML com `<Signature>` adulterada hoje importa; esperado 400) e o fork F-SIG-1"
depende_de: ["[[FIS-08]]"]
ancora_sdd: "§III.2"
atualizado: "2026-09-25"
---
# SIG-NFE — Verificação da assinatura (XMLDSig) do XML de NF-e importado

**Estado:** `planned` — **Nó de régua** por decisão do dono (25/09) — conta no denominador fiscal, ver [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]. Fase 2 do plano pós-contador. Lacuna MEDIDA 23/09 (V2): nenhum `Signature`/xmldsig em `server/src` — produção importa XML sem verificar assinatura. Falta instrumentar (teste-guarda: XML com `<Signature>` adulterada hoje importa; esperado 400) e o fork F-SIG-1  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006). O plano pede duas: "instrumenta a assinatura" e depois a resposta ao F-SIG-1  
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
