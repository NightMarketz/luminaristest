---
id: "CRC-CFC"
tipo: "subno"
dominio: "contabil"
titulo: "Máscara do CRC no formato do CFC — transferido/secundário, só tipo O, grafia compacta e 0930 da ECF (GAP-MAP 15 + BE-INCR-CRC-CFC-FOLLOWUPS)"
estado: "inflight"
estado_detalhe: "Implementado e testado (28/09) na branch claude/busy-curran-1c0f23; PR #426 aberto a pedido do dono (Create PR, 28/09) — espera revisão e CI. Guarda vermelho→verde (crcNumberCfc.test.ts) e os testes novos vermelhos contra o código antigo; unit 249/249; integrações de contato/SPED/ECF uma a uma; FE 60/60; teste em build de produção (0930 com CRC transferido normalizado; 400 com motivo para /T-, /P- e sem DV). Leva junto o A4 do PLANO-PENDENCIAS (tabela J930 do RUNBOOK-H1) e as tabelas da ECF do runbook"
depende_de: ["[[C12]]"]
autorizacao: "GAP-MAP 15: \"Ta autorizado pode corrigir\"; seguimento: \"Planeje e pesquise as soluçoes ideias para os achados fora do escopo e corrija\" + questionário F-1..F-4; A4: \"Pode planejar e lançar um prompt para essa correção\" (dono, chat, 2026-09-28); PR: pedido do dono (Create PR, 2026-09-28)"
prs: ["#426"]
ancora_sdd: "§III.1 (fora da régua — correção)"
atualizado: "2026-09-28"
---
# CRC-CFC — Máscara do CRC no formato do CFC (GAP-MAP 15 + BE-INCR-CRC-CFC-FOLLOWUPS)

**Estado:** `inflight` — Implementado e testado (28/09) na branch claude/busy-curran-1c0f23; PR #426 aberto a pedido do dono (Create PR, 28/09) — espera revisão e CI. Guarda vermelho→verde (crcNumberCfc.test.ts) e os testes novos vermelhos contra o código antigo; unit 249/249; integrações de contato/SPED/ECF uma a uma; FE 60/60; teste em build de produção (0930 com CRC transferido normalizado; 400 com motivo para /T-, /P- e sem DV). Leva junto o A4 do PLANO-PENDENCIAS (tabela J930 do RUNBOOK-H1) e as tabelas da ECF do runbook
**Autorização:** GAP-MAP 15: "Ta autorizado pode corrigir"; seguimento: "Planeje e pesquise as soluçoes ideias para os achados fora do escopo e corrija" + questionário F-1..F-4; A4: "Pode planejar e lançar um prompt para essa correção" (dono, chat, 2026-09-28); PR: pedido do dono (Create PR, 2026-09-28)
**Depende de:** [[C12]]
**Desbloqueia:** [[H1]] (o CRC real do contador entra no J930/0930 sem 400 falso)
**Âncora no SDD consolidado:** §III.1 (fora da régua — correção)
**PRs:** #426

## Docs

- [GAP-MAP](../../operating-manual/GAP-MAP.md) — item 15 e linha no Nível 3 (instrumentado e fechado em 28/09)
- [`BE-INCR-CRC-CFC-FOLLOWUPS-brief.md`](../../accounting/BE-INCR-CRC-CFC-FOLLOWUPS-brief.md) — os 6 achados, F-1..F-4 ratificados, status por item (§6.1)
- [`RUNBOOK-H1-PVA.md`](../../accounting/RUNBOOK-H1-PVA.md) — §P6 J930 reescrita (A4) + tabelas da ECF (preparação; sem evidência)
- Decisão: [[D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM]]

## O que é

A máscara do CRC (#305 / C12) só aceitava `UF-NNNNNN/O-D`. O Manual de Registro do CFC (pp. 13-14) — a própria
fonte da máscara — define o registro transferido como sufixo (`SP-123456/O-3 T-MG`); a Res. CFC 1.494/2015 deixa só
originário e transferido. Contador transferido não cadastrava contato nem assinava a ECD. O seguimento fechou o
tipo `T` no lugar do `O`, o provisório (extinto, com mensagem própria), a grafia compacta dos ERPs (`SP1234567`),
a máscara no 0930 da ECF (o leiaute não declara formato — escolha da casa) e o FE da ECF sem `indCrc` vazio.
Subnó fora da régua: é correção.

## Abertos (não são deste nó)

- A validação de que o contador está ATIVO no CFC ficou só planejada — ver [[GOV-CONTADOR]].
- A tela esconde a mensagem do 400 (mostra o genérico) — sessão aberta pelo dono em 28/09 (`resolveError`).
