---
id: "Z0-a"
tipo: "gate"
dominio: "gate"
titulo: "Contador com CRC aceita assinar escrituração que não conduziu? (premissa do F-Z0)"
estado: "done"
estado_detalhe: "Respondido: contador assina SOB CONDIÇÕES (triagem 23/09 item 0 — contrato, ele controla políticas, aprovação registrada de parâmetro, imutabilidade/estorno, trava só ele reabre, vínculo ao documento de origem). Condições = requisitos novos → BRIEF de governança (Fase 5), não fecham aqui"
ancora_sdd: "§M7.1 · §18.1 Onda 0"
atualizado: "2026-09-25"
---
# Z0-a — Contador com CRC aceita assinar escrituração que não conduziu? (premissa do F-Z0)

**Estado:** `done` — Respondido: contador assina SOB CONDIÇÕES (triagem 23/09 item 0 — contrato, ele controla políticas, aprovação registrada de parâmetro, imutabilidade/estorno, trava só ele reabre, vínculo ao documento de origem). Condições = requisitos novos → BRIEF de governança (Fase 5), não fecham aqui  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M7.1 · §18.1 Onda 0

## Docs

- [`docs/accounting/PEDIDO-CONTADOR-2026-09-03.md`](../../accounting/PEDIDO-CONTADOR-2026-09-03.md)

## Evidência

- [`docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md:41`](../../accounting/CEDULA-DECISAO-2026-09-03-modulos.md)
- [`docs/accounting/CEDULA-DECISAO-2026-09-10-entrevista.md:38`](../../accounting/CEDULA-DECISAO-2026-09-10-entrevista.md)
- `docs/SDD-LUMINARIS.md:1444` → **Premissa não testada (Z0-a, aberto):** "o contador só assina" depende do contador com CRC aceitar assinar
- `docs/SDD-LUMINARIS.md:390` → | **0 · provar** | B-4 (ensaio de restauração) → SEED-MY → H1 (PVA Presumido) → H1 2ª passada (Lucro Real) · P4 (instalar validadores) · H2 (browser sign-off) · H3 (prova P2 clínica) · X2 (catálogo RFB oficial) · E9/D2 (NF-e real anonimizada) · M2 (host + 1º deploy) · Z0-a (contador aceita assinar?) · envio do pedido ao contador (D1, itens 6–13) | gate humano / dado externo — agente não fecha |
- `docs/SDD-LUMINARIS.md:426` → - **Z0-a é aresta condicional:** "não" do contador puxa o portal do contador e reabre F-Z0; "sim" elimina o nó.

## Fold 25/09 (Fase 6 do PLANO-POS-CONTADOR)

- Fold 25/09 — fonte: [`TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) linhas 12 e 52 (item 0: "assina, sob condições", classificado **dado** / opinião profissional). A premissa do F-Z0 está respondida (sim, condicionado); os requisitos (aprovador CRC, trava reaberta só pelo contador, aprovação de parâmetro) seguem **não verificados** no código e vão para a Fase 5 (governança do contador).
