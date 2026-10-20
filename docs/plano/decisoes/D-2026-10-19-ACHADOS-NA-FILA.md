---
id: "D-2026-10-19-ACHADOS-NA-FILA"
tipo: "decisao"
dominio: "plano"
titulo: "Achados de 19/10 (motor DynamicTable, construção e módulos antigos) entram no vault e na fila (seção E)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-19: \"Já incorpora nos planos do vault e encaixa na fila\" (registro + posição na fila; não é 'executa'); antes, no mesmo dia: \"Autorizo as duas (Recommended)\" (#770, #771: registrar, instrumentar e corrigir, sem merge)"
atualizado: "2026-10-19"
---
# D-2026-10-19-ACHADOS-NA-FILA

**Estado:** `decided`. **Autorização:** dono, chat, 19/10/2026 — *"Já incorpora nos planos do vault e encaixa na fila"*.
**Não é "executa"** (ORCH-006): os nós `planned` desta decisão não roteiam até o dono autorizar cada um.

## Contexto

Sessão de 19/10: verificação de arquitetura do motor DynamicTable (PR #769), avaliação da camada de construção e
revisão micro dos módulos anteriores ao baseline (0db39612). Documento completo, com grau de evidência e arquivo:linha:
[`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md).

## O que fica registrado

- **PRs abertos (inflight):** [[DT-ARQ-CORRECOES]] (#769), [[FIX-ESTOQUE-FINALIZE]] (#771), [[FIX-ANALYTICS-DADO]] (#770),
  [[FIX-ADDEDFIELDS-VAZAMENTO]] (#772).
- **Nós novos `planned`, sem autorização:** [[TESTE-ACOPLAMENTO-PRESET]], [[FIX-PLUGINS-VENDA]], [[FIX-AUTH-CONTA]],
  [[FIX-CHAT-AGENTE]], [[FIX-FE-DASHBOARD]], [[FIX-ANALYTICS-RESIDUO]].
- **BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS`:** escrito, forks ratificados na recomendação (opção b) e autorização registrada
  pela sessão que o escreveu, mas está numa branch local (`claude/mystifying-ptolemy-65dd7c`), empilhada no #769 e **não
  pushada**. Entra no vault quando essa branch virar PR.
- **Achados estruturais** anexados a nós existentes: [[BUILDER-VERTICAIS]] (só o CRM é módulo; preset é código) e [[W1]]
  (a entrevista descarta a customização no create).
- **Seção E da [[FILA-ORDEM]]**: ordem proposta pelo agente para estes itens. Não altera A–D ratificadas em
  [[D-2026-10-14-FILA-ORDEM-RATIFICADA]].

## O que continua do dono

1. Merge de cada PR por número (CLAUDE.md, "Merge só com PR nomeado") — "pode mergear tudo" não basta.
2. #770 item 3: esconder os KPIs derivados de constante (a) ou ler dado real (b).
3. `executa` de cada nó `planned` da seção E.
4. Recomendação do agente, não decisão: mergear o #771 antes do sign-off [[H2]] (A3), porque os passos 6–11 do H2 fazem vendas
   na tela e hoje validariam estoque errado.
