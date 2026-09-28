---
id: "SIG-NFE"
tipo: "regua"
dominio: "fiscal"
titulo: "Verificação da assinatura (XMLDSig) do XML de NF-e importado"
estado: "done"
estado_detalhe: "**Nó de régua** (25/09, [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]). Fase 2 do plano pós-contador FECHADA: 2.1–2.2 instrumentado vermelho (#391 `1e1e82b7`), 2.3 BRIEF com 5/5 forks ratificados (#402 `98c2b71b`), 2.4 MERGEADO 26/09 (#403 `f0297c90`) — `parseNfe` verifica a XMLDSig antes de extrair campos (`lib/nfeSignature.ts`) nos 3 chamadores; defesa XSW; titular do certificado × emitente (213/227), NFA-e `procEmi=1` só 292, `dhEmi` na validade; sem bypass em produção; GAP-MAP 14 FECHADO. Decisões em [[D-2026-09-26-SIG-NFE-FORKS]]. Resíduo declarado: sem cadeia ICP-Brasil (F-SIG-3 c) re-assinar com certificado próprio passa; nenhum XML real assinado testado (D2/[[E9]]); OtherName opcional após 31/12/2028"
depende_de: ["[[FIS-08]]"]
autorizacao: "dono em chat 26/09: \"instrumenta a assinatura\" (2.1–2.2) + \"executa o SIG-NFE 2.4\" (forks F-SIG-1..5 ratificados no mesmo dia)"
prs: ["#391", "#402", "#403"]
ancora_sdd: "§III.2"
atualizado: "2026-09-26"
---
# SIG-NFE — Verificação da assinatura (XMLDSig) do XML de NF-e importado

**Estado:** `done` — **Nó de régua** (25/09, [[D-2026-09-25-SIG-NFE-NO-DE-REGUA]]). Fase 2 do plano pós-contador FECHADA: 2.1–2.2 instrumentado vermelho (#391 `1e1e82b7`), 2.3 BRIEF com 5/5 forks ratificados (#402 `98c2b71b`), 2.4 MERGEADO 26/09 (#403 `f0297c90`) — `parseNfe` verifica a XMLDSig antes de extrair campos (`lib/nfeSignature.ts`) nos 3 chamadores; defesa XSW; titular do certificado × emitente (213/227), NFA-e `procEmi=1` só 292, `dhEmi` na validade; sem bypass em produção; GAP-MAP 14 FECHADO. Decisões em [[D-2026-09-26-SIG-NFE-FORKS]]. Resíduo declarado: sem cadeia ICP-Brasil (F-SIG-3 c) re-assinar com certificado próprio passa; nenhum XML real assinado testado (D2/[[E9]]); OtherName opcional após 31/12/2028  
**Autorização:** dono em chat 26/09: "instrumenta a assinatura" (2.1–2.2) + "executa o SIG-NFE 2.4" (forks F-SIG-1..5 ratificados no mesmo dia)  
**PRs:** #391, #402, #403  
**Depende de:** [[FIS-08]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.2

## Docs

- [`docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — Fase 2 (passos 2.1–2.4)
- [`docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md)
- [`docs/accounting/BE-INCR-NFE-SIGNATURE-brief.md`](../../accounting/BE-INCR-NFE-SIGNATURE-brief.md) — BRIEF 2.3 (B0–B10, forks)
- [`docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`](../../accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md) — MOC 7.0 §4.2, Anexo I (E/F, B07), DOC-ICP-04 v8.3

## Cadeia (do plano, 4 passos)

1. **2.1** confirmar lendo `lib/nfe.ts` + `NfeImportService` que nenhuma assinatura é verificada — `instrumentação`
2. **2.2** GAP-MAP + teste-guarda vermelho (XML com `<Signature>` adulterada → hoje importa; esperado 400)
3. **2.3** BRIEF curto: XMLDSig (**checar antes se já existe lib instalada** — não propor dependência nova sem isso) + modo fixture explícito só em teste
4. **2.4** implementação pelo BRIEF

## Forks

- **F-SIG-1..5 ratificados 26/09** (todos na recomendação) + emenda pós-pesquisa (e-CPF, NFA-e `procEmi=1`,
  codificação do OtherName) — ver [[D-2026-09-26-SIG-NFE-FORKS]].
- **Próximo, sem nó aberto:** F-SIG-3 (c) — cadeia ICP-Brasil + LCR (exige as raízes do ITI, dado externo). Vira nó
  só por decisão do dono.

## Vizinhos

- [[E9]] — troca dos fixtures sintéticos por NF-e real; um XML real assinado é o insumo natural do teste de 2.2.
- [[X6]] — mesma cadeia de importação (custo/crédito); a Fase 1 do plano fechou lá.
