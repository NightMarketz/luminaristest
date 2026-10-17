---
id: "ISS-TRANSICAO-IBS"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Transição ISS → IBS (2029–2032) e fim da LC 116 em 2033"
estado: "planned"
estado_detalhe: "17/10: registrado pela verificação legal (frente ISS). ISS_LIMITE e issComBeneficio não têm fim de vigência; nada muda antes de 01/2029. Sem BRIEF"
depende_de: ["[[M5-ibs-cbs]]"]
autorizacao: "dono, chat, 2026-10-17: \"Atualiza tbm briefs e documenta em features novas\" — só a nota (registro de feature nova revelada pela verificação legal de 17/10); sem BRIEF, sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-17"
prs: []
---
# ISS-TRANSICAO-IBS — Transição ISS → IBS (2029–2032) e fim da LC 116 em 2033

**Estado:** `planned` — feature nova registrada pela verificação legal de 17/10/2026. Planejar exige pedido do dono; código exige `executa`.

## Escopo

- Redução escalonada do ISS e dos benefícios de 2029 a 2032 (LC 116 art. 8º-B, incluído pela LC 214 art. 508) e revogação da LC 116 em 2033 (LC 214 art. 543 IV) — verificado [D01][D04] do dossiê ISS.
- Parâmetros `ISS_LIMITE`/piso ganham `vigenteAte` e versões por ano; a apuração do Simples já tem o teto de ISS decrescente nos Anexos 2027–2033 (frente Simples, item 2).

## Gatilho

- Data legal: 01/01/2029.

## Docs

- Dossiê [`verif-2026-10-17-iss-nfse`](../../../pesquisas-legais/verif-2026-10-17-iss-nfse/relatorio.md) e consolidado [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md).
