---
id: "D-2026-10-02-X11-EVENTOS-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-EVT-1..7 do BRIEF do X11 (eventos de NFS-e)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (\"ratifica os forks F-EVT por questionário\" + AskUserQuestion) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X11-EVENTOS-FORKS — cédulas da ratificação do X11

**Estado:** `decided` (7 de 7)  
**Autorização:** dono, chat, 02/10/2026: *"ratifica os forks F-EVT por questionário"*; respostas ao AskUserQuestion (2 rodadas). O agente apresentou, o dono decidiu.  
**Não é "executa"** (ORCH-006): [[X11]] não ganha autorização de código com esta nota.

Documento dos forks: [`BE-INCR-DFE-EVENTOS-brief.md`](../../accounting/BE-INCR-DFE-EVENTOS-brief.md) §5.

## Rodada 1 (F-EVT-1..4)

### F-EVT-1 — de onde vem o prazo, e se ele bloqueia
- **Opções:** (a) configura por unidade e só avisa; o fisco recusa (E0822 → OUT_OF_WINDOW); (d) medido no D5 (**recomendada**) · (b) configura e bloqueia · (c) só mapear E0822 · (d) buscar na API municipal.
- **Resposta literal:** *"(a) Configura e avisa (Recommended)"*
- **Registro:** ✅ (a).

### F-EVT-2 — instante-base e calendário da contagem
- **Opções:** (b) `dhProc`, dias de calendário em America/Sao_Paulo, rótulo "estimado" até PV-2 (**recomendada**) · (a) `dhProc`, blocos de 24 h · (c) `dCompet`.
- **Resposta literal:** *"(b) dhProc, dias de calendário SP (Recommended)"*
- **Registro:** ✅ (b).

### F-EVT-3 — `@@unique` durante a substituição
- **Opções:** (a) `saleKey` temporária `subst:<origId>:<saleId>` + troca na tx da autorização (**recomendada**) · (b) tirar do unique e checar no serviço.
- **Resposta literal:** *"(a) saleKey temporária + troca na tx (Recommended)"*
- **Registro:** ✅ (a).

### F-EVT-4 — análise fiscal (e101103 → e105104/e105105) entra no X11?
- **Opções:** (b) dentro, como PR-3 separado (**recomendada**) · (a) fora do X11.
- **Resposta literal:** *"(b) Dentro, como PR-3 (Recommended)"*
- **Registro:** ✅ (b).

## Rodada 2 (F-EVT-5..7)

### F-EVT-5 — como a porta conta eventos ocorridos fora do Luminaris
- **Opções:** (b) método separado `consultarEventos(chave)` (**recomendada**) · (a) `CANCELLED` no `EmissaoResult`.
- **Resposta literal:** *"(b) Método consultarEventos (Recommended)"*
- **Registro:** ✅ (b).

### F-EVT-6 — original já cancelada quando a substituta autoriza
- **Opções:** (a) fato do fisco vence + pendência `substituicao_sobre_cancelada` (**recomendada**) · (b) falha com 409.
- **Resposta literal:** *"(a) Fato do fisco vence (Recommended)"*
- **Registro:** ✅ (a).

### F-EVT-7 — o PR-1 espera o X10i?
- **Opções:** (a) PR-1 sai sem o X10i; PR-2/PR-3 esperam (**recomendada**) · (b) tudo espera o X10i.
- **Resposta literal:** *"(a) PR-1 sai sem o X10i (Recommended)"*
- **Registro:** ✅ (a).

## Consequências

- Os itens `[cond:F-EVT-n]` do BRIEF valem como escritos (o texto já seguia a recomendação).
- F-EVT-7 (a): o PR-1 (itens 1–17) não depende do [[X10i]]; PR-2 (itens 18–19) e PR-3 (item 20) dependem. O `depende_de` do frontmatter do [[X11]] fica como está (o nó inteiro só fecha com o PR-2); a nota registra a exceção no corpo.
- Pendências externas PV-1..4 e insumos IA-1/2 do BRIEF §6 continuam abertos — ratificar o desenho não preenche o prazo do município.
