# RUNBOOK: sign-off de browser — aba "Kit de setor" (EMENDA-2 da LAC-B)

> Formato: [`RUNBOOK-FORMAT.md`](../operating-manual/RUNBOOK-FORMAT.md). Preparado **em branco** pelo agente
> ([FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief](FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief.md) item 14).
> **Evidência, desfecho e assinatura são do dono.**

Executor: ____________           Data: ____
Autorização: EMENDA-2 da LAC-B, item 14; execução pedida pelo dono no chat em 26/10/2026 ("executa a EMENDA-2 da LAC-B")
Pré-condições:
- PR-0 e PR-1 da EMENDA-2 integrados (commit ___)
- Servidor e `my-app` em **build de produção** (`npm run build && npm start`), a partir desse commit
- Uma unidade com o kit do salão **instalado** pela faixa de ativação (runbook H2 da LAC-B, passos 1–3)
- `sqlite3` apontando para o banco do servidor (`server/prisma/prisma/dev.db` ou a cópia em uso). `<UNIT>` = id da
  unidade; `<USER>` = id do usuário dono

## Passos

1. Abrir Contabilidade com a unidade selecionada.
   Resultado esperado: a barra de abas tem "Kit de setor" (última). Ao abrir: "Salão de beleza" e "Versão 6"
   (a última publicada), sem aviso de falha, sem changelog, sem bloco de pendências.
   EVIDÊNCIA: [screenshot]

2. Simular kit numa versão antiga:
   `UPDATE kit_installations SET kitVersion = 4 WHERE userId = '<USER>' AND unitId = '<UNIT>';` e recarregar a aba.
   Resultado esperado: "Versão 4 instalada · versão 6 disponível" e o botão "O que muda nas versões novas", que abre
   as entradas das versões 5 e 6.
   EVIDÊNCIA: [saída do comando + screenshot com o changelog aberto]

3. Simular uma pendência aberta:
   `INSERT INTO kit_upgrade_pendings (id, userId, unitId, kitKey, toVersion, runId, itemKey, reason, kitValue, tenantValue, status, createdAt, updatedAt) VALUES ('rb-p1', '<USER>', '<UNIT>', 'beautySalon', 6, 'rb-run', 'role:receita-servico', 'override', '{}', '{}', 'OPEN', datetime('now'), datetime('now'));`
   e recarregar a aba.
   Resultado esperado: "Pendências da atualização do kit: 1" e a linha `role:receita-servico` com "A conta do papel foi
   ajustada nesta unidade". Sem botões de aceitar/recusar (entram no PR-2).
   EVIDÊNCIA: [saída do comando + screenshot]

4. Simular instalação que parou no passo 7:
   `UPDATE kit_installations SET kitVersion = 6, status = 'FAILED', steps = '{"lastCompletedStep":6,"warnings":[]}' WHERE userId = '<USER>' AND unitId = '<UNIT>';`
   e recarregar a aba.
   Resultado esperado: aviso âmbar "A instalação do kit parou no meio, no passo 7 de 7." com o botão
   "Retomar instalação".
   EVIDÊNCIA: [saída do comando + screenshot]

5. Clicar "Retomar instalação" e confirmar.
   Resultado esperado: a confirmação diz que continua do passo 7; depois de confirmar, toast "Instalação do kit
   concluída." e o aviso some. `SELECT status, steps FROM kit_installations WHERE unitId = '<UNIT>';` devolve
   `INSTALLED` e `lastCompletedStep: 7`; `SELECT COUNT(*) FROM accounting_bindings WHERE unitId = '<UNIT>' AND status = 'Active';` devolve 1.
   EVIDÊNCIA: [screenshot + saída dos dois SELECT]

6. (`INSTALLING`) `UPDATE kit_installations SET status = 'INSTALLING' WHERE unitId = '<UNIT>';` e recarregar a aba.
   Resultado esperado: "Instalação do kit em andamento.", sem botão. Ao final, voltar o status:
   `UPDATE kit_installations SET status = 'INSTALLED' WHERE unitId = '<UNIT>';`
   EVIDÊNCIA: [screenshot]

7. (Modo cliente) Entrar como contador com atribuição ativa e escolher o cliente no seletor "Livro".
   Resultado esperado: a aba "Kit de setor" não aparece.
   EVIDÊNCIA: [screenshot da barra de abas]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): ____
- Ruído na tela (BRIEF §9): a aba ficou poluída? ____
- Atualização do artefato de rastreio: nota [LAC-B](../plano/nos/LAC-B.md) (`estado_detalhe`) com o desfecho + data
- Assinatura do executor: ____________
