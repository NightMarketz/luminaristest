---
id: "D-2026-10-23-OBSERVABILIDADE-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks F-OBS-0..9 do PRE-ADR-OBSERVABILIDADE ratificados, todos pela recomendada; observabilidade vira nó OBS"
estado: "decided"
autorizacao: "dono, chat, 2026-10-23: \"Pode ratificar tudo\", em resposta à tabela das 10 recomendações. Decide forks e cria o nó; NÃO é 'executa' nem merge"
atualizado: "2026-10-23"
---
# D-2026-10-23-OBSERVABILIDADE-FORKS

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-23: *"Pode ratificar tudo"*. A frase responde à tabela das recomendações dos
10 forks de [`PRE-ADR-OBSERVABILIDADE`](../../adr/PRE-ADR-OBSERVABILIDADE.md) §7 (PR #867). O pedido de origem,
no mesmo dia, foi: *"Planeja e mapeia se há uma forma de cobrir tudo, temos que ter um brief para não se perder
depois"*.

Nó criado: [[OBS]]. Pelo `README` do vault, item do destino só vira nó depois de PRE-ADR ratificado.

## Respostas do dono (todas = a recomendada)

| Fork | Opção | Efeito |
|---|---|---|
| F-OBS-0 quando | (b) | Fase A (itens 1–10) sem depender de host; Fase B (itens 11–15) na Onda 0 |
| F-OBS-1 biblioteca | (a) | mantém `lib/logger.ts`; o contexto entra em `formatLog` |
| F-OBS-2 nível do 4xx | (c) | 5xx = `error`; 401/403 = `warn`; demais 4xx = `info`, sem stack |
| F-OBS-3 dado pessoal | (a) | chaves redigidas no `logReplacer`; path sem query no log de tempo |
| F-OBS-4 agregador | decidir com o host | escolha na Onda 0, pelos critérios do §7 |
| F-OBS-5 registro de acesso | (b) provisório | NDJSON diário separado, volume encriptado, expurgo em 6 meses mais margem |
| F-OBS-6 porta de origem | (b) | porta repassada pelo proxy, ou `null`; nunca a porta do socket do proxy |
| F-OBS-7 alerta remoto | (a) | falha de qualquer scheduler e `uncaughtException` |
| F-OBS-8 `no-console` | (a) | regra no ESLint do server, com as exceções do item 9. **Segunda exceção à regra ⛔ do `CLAUDE.md`**, registrada lá ao lado do `check:arch` |
| F-OBS-9 métricas | (a) | só log, sem endpoint de métricas |

## Requisito legal registrado

Marco Civil, Lei 12.965/2014, art. 15: guarda dos registros de acesso por 6 meses. Pelo Dec. 8.771/2016, art. 15-A
(incluído pelo Dec. 12.975/2026), entra também a porta de origem. Dossiê:
[`marco-civil-guarda-registros`](../../../pesquisas-legais/marco-civil-guarda-registros/relatorio.md). Vale quando o
Luminaris operar. Por isso está na Fase B.

## O que continua do dono

1. `executa` da Fase A, por PR.
2. Escolha do host na Onda 0, que fecha F-OBS-4 e confirma F-OBS-5 e F-OBS-6.
3. A pergunta ao advogado sobre os arts. 16-A a 16-J do Dec. 8.771 (dossiê, §4). Ela não bloqueia este nó.
4. Merge do #867 por número.
