---
id: "D-2026-11-04-PILOTO-DFE-SEED"
tipo: "decisao"
dominio: "fiscal"
titulo: "Piloto DFE (04/11): seed de cenário em banco descartável, BRIEF primeiro, sessão do DFE-MANUAL"
estado: "decided"
autorizacao: "dono, chat, 2026-11-04 (questionário): \"Descartável (Recomendado)\" · \"Piloto no DFE-MANUAL (Recomendado)\" · \"BRIEF primeiro (Recomendado)\" · \"Sessão do DFE-MANUAL (Recomendado)\""
atualizado: "2026-11-04"
---
# D-2026-11-04-PILOTO-DFE-SEED

**Estado:** `decided`. **Autorização:** questionário do dono no chat, 04/11/2026, com respostas literais repassadas pela
sessão "Playwright: screenshot, CLI e DevTools" e pela sessão do DFE-MANUAL. Esta nota registra as respostas e não
decide nada além delas.

| Cédula | Resposta literal | O que significa |
|---|---|---|
| Banco do seed | *"Descartável (Recomendado)"* | cópia do banco-modelo da integração, criada a cada execução e jogada fora, sem tocar o dev.db real |
| Escopo | *"Piloto no DFE-MANUAL (Recomendado)"* | seed do DFE (unidade com CNPJ, cliente com CPF, serviço com NBS, perfil fiscal completo), testes do caminho feliz e runbook reescrito só com o portal |
| Fluxo | *"BRIEF primeiro (Recomendado)"* | o BRIEF diz o formato do seed, onde vive, o comando e os forks; o dono ratifica, e o executa roda depois |
| Quem faz | *"Sessão do DFE-MANUAL (Recomendado)"* | por handoff, a sessão de planejamento aberta pelo cartão do dono |

**Limite:** planejar, não codar. Não é `executa`.

**Efeito:** fecha o F-PIL-1 → (a) do
[`PILOTO-DFE-SEED-TESTES-brief.md`](../../accounting/PILOTO-DFE-SEED-TESTES-brief.md) e derruba a opção (b)
(`migrate deploy`) do F-PIL-3. Os forks F-PIL-2..9 seguem pendentes. Registro na nota [[FE-INCR-DFE]] (campo
`autorizacao` e seção "Docs"), porque o runbook `RUNBOOK-H2-DFE-MANUAL` é o resíduo desse nó.
