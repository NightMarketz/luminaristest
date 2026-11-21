---
id: "D-2026-11-21-NFSE-PAULISTANA-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "NFSE-PAULISTANA: F-NSP-0..12 ratificados por questionário (F-NSP-2 contra a recomendação: modo manual dentro do nó; F-NSP-2b perguntado em seguida)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21, questionário (AskUserQuestion) da sessao-planejamento do nó NFSE-PAULISTANA, sob a autorização \"Executa tudo pra liberar e poder rodar em xhigh até terminar\"; não é 'executa' de código nem autoriza merge"
atualizado: "2026-11-21"
---
# D-2026-11-21-NFSE-PAULISTANA-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 21/11/2026 (citação no frontmatter). **Não é `executa`**
(ORCH-006). Com isto o BRIEF fica sem fork pendente, mas o código do [[NFSE-PAULISTANA]] continua pedindo um "executa"
citável (`D-2026-10-28-FLUXO-AUTONOMO`).

BRIEF: [`BE-INCR-NFSE-PAULISTANA-brief.md`](../../accounting/BE-INCR-NFSE-PAULISTANA-brief.md) §6.

## Cédula

As respostas são os rótulos que o dono escolheu no questionário, literais.

| Fork | Pergunta (resumo) | Resposta do dono | Recomendação |
|---|---|---|---|
| F-NSP-0 | quando executar | **"Executar ao 'executa' (Recomendado)"** | = |
| F-NSP-1 | quem vai para a Paulistana | **"Campo por unidade + guardas (Recomendado)"** | = |
| F-NSP-2 | modo manual da Paulistana | **"Dentro deste nó"** | ≠ (era fora do nó) |
| F-NSP-2b | como manual e automático convivem | **"Mesmo campo por unidade (Recomendado)"** — `nfseEmissao: portal \| automatica`, o mesmo da X10i (F-ADL-4) | = |
| F-NSP-3 | o que é "homologação" | **"Só produção + teste à parte (Recomendado)"** | = |
| F-NSP-4 | de onde sai o RPS | **"Montagem única + renderizador (Recomendado)"** | = |
| F-NSP-5 | série do RPS | **"Série numérica no perfil (Recomendado)"** | = |
| F-NSP-6 | contador do RPS | **"Coluna 'numeracao' na chave (Recomendado)"** | = |
| F-NSP-7 | envio | **"Síncrono, 1 RPS por nota (Recomendado)"** | = |
| F-NSP-9 | cancelamento feito no site | **"Evento novo no job do X11 (Recomendado)"** | = |
| F-NSP-10 | conferência da cadeia no assinador | **"Recalcula a cadeia do RPS (Recomendado)"** | = |
| F-NSP-12 | código de serviço de 5 dígitos | **"Campo por serviço (Recomendado)"** | = |

## Efeito no BRIEF

- **F-NSP-2 → (b):** entra o **PR-M** (modo manual): ficha do RPS, upload do XML da NFS-e emitida no site da prefeitura,
  releitura campo a campo e cancelamento manual. Não depende do assinador local, então pode entrar antes do PR-3/PR-4. A
  lacuna `L-20261121-201053-0536` (que registrava o modo manual fora do nó) passa a ser item deste nó.
- **F-NSP-2b → (a):** o campo `nfseEmissao` por unidade é o mesmo do ADL-14 da emenda X10i; quem chegar primeiro à `main`
  cria o campo, o outro reusa.
- As demais respostas confirmam o ramo recomendado em que o BRIEF já foi escrito.
