---
id: "D-2026-10-23-OBSERVABILIDADE-FORKS-2"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-OBS-10..17 do ADR-OBSERVABILIDADE ratificados, todos pela recomendada; ADR Accepted; F-OBS-13/14 viram exceções à regra ⛔"
estado: "decided"
autorizacao: "dono, chat, 2026-10-23: \"(1) ratificar os forks F-OBS-10..17 do ADR-OBSERVABILIDADE por questionário comigo; (2) depois da ratificação, EXECUTAR a Fase C inteira (itens 1–11 do ADR-OBSERVABILIDADE §6, incluindo o 7b) [...] Não autorizo merge.\" Respostas por AskUserQuestion no mesmo turno"
atualizado: "2026-10-23"
---
# D-2026-10-23-OBSERVABILIDADE-FORKS-2

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-23: *"Sessão de execução do nó OBS até o fim da Fase C. Autorizo, em
sequência: (1) ratificar os forks F-OBS-10..17 do ADR-OBSERVABILIDADE por questionário comigo; (2) depois da
ratificação, EXECUTAR a Fase C inteira (itens 1–11 do ADR-OBSERVABILIDADE §6, incluindo o 7b), seguindo as
respostas que eu der, mesmo que alguma não seja a recomendada. Não autorizo merge. A Fase B (F-OBS-4/5/6) fica
de fora: depende da Onda 0."*

Os forks de [`ADR-OBSERVABILIDADE`](../../adr/ADR-OBSERVABILIDADE.md) §7 foram perguntados por questionário
(AskUserQuestion, 2 rodadas), cada um com o contexto do ADR e a recomendada como 1ª opção. A cédula anterior,
dos forks F-OBS-0..9, é [[D-2026-10-23-OBSERVABILIDADE-FORKS]].

## Respostas do dono (todas = a recomendada)

| Fork | Resposta literal | Efeito |
|---|---|---|
| F-OBS-10 alcance do catálogo | "(a) Só os 6 portões (Recomendado)" | `event` do catálogo só nas linhas dos portões; o resto do log não precisa de `event` |
| F-OBS-11 forma da API | "(a) logger.event + Zod (Recomendado)" | `logger.event(level, event, message, ctx)` nos portões; `LogEntrySchema` em Zod; as 477 chamadas não mudam |
| F-OBS-12 registrar uma vez | "(a) Regra p/ código novo (Recomendado)" | OBS-R5 vale para código novo via skills; legado não varrido |
| F-OBS-13 gate de `catch` silencioso | "(a) ESLint + ledger, c/ exceção ⛔ (Recomendado)" | `no-empty` + `no-restricted-syntax` no ESLint do server; os 5 casos lidos um a um. **Exceção à regra ⛔ do `CLAUDE.md` aprovada** |
| F-OBS-14 gate de scheduler sem alerta | "(a) Teste por glob, c/ exceção ⛔ (Recomendado)" | o teste de falha descobre `jobs/*Scheduler.ts` e reprova arquivo sem caso. **Exceção à regra ⛔ do `CLAUDE.md` aprovada** |
| F-OBS-15 migrar `event` existentes | "(a) Migrar os 15 agora (Recomendado)" | tabela do ADR §4; `AlertPayload.event` não muda; CLI fora |
| F-OBS-16 wrapper de integração | "(a) Wrapper nos 4 fetch (Recomendado)" | `lib/outboundHttp.ts` em Mercado Pago ×2, BCB PTAX e ping do Qdrant; `alertWebhook` fora |
| F-OBS-17 onde a política mora | "(a) ADR fonte + §2.4 (Recomendado)" | ADR é a fonte; contrato §2.4 com checklist e link; skills apontam para o contrato |

Nenhuma resposta saiu da recomendada, então o §6 do ADR vale como está.

## Efeitos registrados

- `ADR-OBSERVABILIDADE.md`: Status → Accepted, cada fork marcado como ratificado.
- `docs/adr/INDEX.md`: linha nova.
- `CLAUDE.md` raiz: F-OBS-13/14 entram na linha de exceções à regra ⛔, ao lado do `check:arch` e do `no-console`.
- Nó [[OBS]]: `autorizacao` e `estado_detalhe` com a frase de execução da Fase C.

## O que continua do dono

1. Merge por número: #867 → #869 → C1 → C2 → C3 → C4.
2. A Fase B (F-OBS-4/5/6, itens 11–15 do PRE-ADR §5) na Onda 0.
