# RUNBOOK: sign-off de browser — aba "Kit de setor" (EMENDA-2 da LAC-B)

> Formato: [`RUNBOOK-FORMAT.md`](../operating-manual/RUNBOOK-FORMAT.md). Preparado **em branco** pelo agente
> ([FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief](FE-INCR-BINDING-ACTIVATION-EMENDA-2-brief.md) item 14).
> **Preenchido pelo agente como executor, na persona do revisor** (exceção de `RUNBOOK-FORMAT.md` §Fronteira,
> dono 2026-10-25): conferência na tela do próprio app, todos os passos rodados pelo agente na sessão.
> Prints e textos literais da tela em [`runbook-evidence/lac-b-kit-de-setor/`](runbook-evidence/lac-b-kit-de-setor/).

Executor: agente Claude Fable 5.1, persona revisor, sob comando do dono (chat, 2026-10-26: *"Roda o Runbook: a conferência na tela está em RUNBOOK-LAC-B-KIT-DE-SETOR.md; preenche com prints e evidencias e assina como ia tester"*; reexecução do passo 9: *"Corrige a fixture dos passos 3 e 9 … e reexecuta só o passo 9, atualizando o runbook e a nota LAC-B"*)           Data: 2026-10-26 (22h–23h, horário de Brasília; os timestamps do servidor abaixo estão em UTC, 2026-10-27T01:xx)
Autorização: EMENDA-2 da LAC-B, item 14; execução pedida pelo dono no chat em 26/10/2026 ("executa a EMENDA-2 da LAC-B"); execução deste runbook pedida pelo dono no chat em 26/10/2026 (frase citada no campo Executor)
Pré-condições:
- PR-0 e PR-1 da EMENDA-2 integrados (commit `957ec331f4b567135ceac49269d036d71c78d942` = `main` com #916, #919 e **#921 — o PR-2 também já está integrado**, por isso os passos 8–9 existem e o passo 3 mostra os botões; ver Registro)
  ```
  $ git log -1 --format='%H %ci' 957ec331
  957ec331f4b567135ceac49269d036d71c78d942 2026-10-26 21:59:23 -0300
  ```
- Servidor e `my-app` em **build de produção**, a partir desse commit, na worktree `emenda-2-lac-b-7069d6`:
  `cd server && npm run build` → `exit=0`; `cd my-app && npm run build` → `exit=0`; subidos por `.claude/launch.json`
  `backend-prod` (`node dist/server.js`, porta 3001, log `"Luminaris Server running","url":"http://localhost:3001"`) e
  `frontend-prod` (`next start`, porta 3000). Tela aberta em `http://localhost:3000/pt/accounting`.
- Uma unidade com o kit do salão **instalado** pela faixa de ativação (runbook H2 da LAC-B, passos 1–3):
  criada para o tenant `seed-presumido@seed.local` (`<USER>` = `cmufn7n590000cixkxbls0agh`) a unidade `rb-lac-b-unit`
  (`<UNIT>` = `cmvpzspp50001ciwszbcczcrj`) e o perfil fiscal dela pela API (preparo, não é passo do runbook):
  ```
  POST /api/dynamic-tables/cmuw4yqut0001cii02g0qg04n/data {"data":{"name":"rb-lac-b-unit","isActive":true}} → 201 id=cmvpzspp50001ciwszbcczcrj
  PUT  /api/accounting/fiscal-profile {"unitId":"cmvpzspp50001ciwszbcczcrj","regimeTributario":"PRESUMIDO","icmsContribuinte":false,"pisCofinsRegime":"CUMULATIVO"} → 200
  ```
  Depois, na tela, H2 passos 1–3 (prints `pre-1-faixa.png`, `pre-2-confirmacao.png`, `pre-3-ativada.png`):
  faixa *"A contabilidade automática desta unidade não está ativa — as vendas não geram lançamento."* + seletor Setor
  (Salão de beleza) + "Ativar contabilidade" → confirmação *"Setor: Salão de beleza. Ao confirmar, (1) o plano de contas
  padrão é instalado se o da unidade estiver vazio e (2) o período do mês corrente é aberto se ainda não existir."* →
  "Ativar" → toast *"Contabilidade automática ativada: as vendas desta unidade passam a gerar lançamento."*, faixa vira
  *"Contabilidade automática ativa."* e a aba "Kit de setor" entra no fim da barra. Banco logo após:
  ```
  sqlite> SELECT id, kitKey, kitVersion, status, steps FROM kit_installations WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
  | cmvpzw6p40011ciws09k3puvw | beautySalon | 6 | INSTALLED | {"lastCompletedStep":7,"warnings":[]} |
  sqlite> SELECT COUNT(*) FROM accounting_bindings WHERE unitId = 'cmvpzspp50001ciwszbcczcrj' AND status = 'Active';
  | 1 |
  sqlite> SELECT COUNT(*) FROM kit_upgrade_pendings WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
  | 0 |
  ```
  (As unidades já existentes do seed não serviam ao passo 1: as duas em v6 têm 7–8 pendências reais
  `referential_year_frozen` abertas.)
- `sqlite3` apontando para o banco do servidor: a máquina não tem o CLI `sqlite3`; os comandos abaixo foram rodados
  **literalmente como escritos** pelo módulo `sqlite3` do Python 3.12 (`python -I db.py "<SQL>"`) sobre
  `server/prisma/prisma/dev.db` da worktree (a cópia que o `backend-prod` usa; `DATABASE_URL=file:./prisma/dev.db`;
  `prisma migrate status` → "Database schema is up to date!"). A saída é impressa em tabela `| coluna |`.
- Desvio de ambiente registrado: a senha dos usuários `seed-presumido@seed.local` e `seed-real@seed.local` nesta cópia do
  banco não era a `SEED_ACCOUNTING_PASSWORD` do `server/.env`; o hash foi regravado com `bcryptjs` para a senha de teste
  do `.env` (`UPDATE User SET password=? WHERE email IN (...)` → 2 linhas). Só afeta o login local.
- Método de tela: os passos foram executados por um runner Puppeteer (`server/node_modules/puppeteer`, Chrome headless
  1280×900) que faz login pelo formulário, seleciona a unidade, abre a aba e grava **print** (`.png`) e **texto literal
  da aba** (`innerText` de `[data-testid=accounting-kit-tab]`, `.txt`) na pasta de evidência. Os textos colados abaixo são
  esses dumps, sem paráfrase.

## Passos

1. Abrir Contabilidade com a unidade selecionada.
   Resultado esperado: a barra de abas tem "Kit de setor" (última). Ao abrir: "Salão de beleza" e "Versão 6"
   (a última publicada), sem aviso de falha, sem changelog, sem bloco de pendências.
   EVIDÊNCIA: [`passo1.png`](runbook-evidence/lac-b-kit-de-setor/passo1.png) · barra de abas (`passo1-abas.txt`, última
   entrada): `[..., "Apuração", "Pendências", "Cobrança", "Kit de setor"]` · texto da aba (`passo1.txt`):
   ```
   Salão de beleza
   Versão 6
   ```
   Confere: só setor e versão; nenhum aviso, changelog ou bloco de pendências. **PASSOU.**

2. Simular kit numa versão antiga:
   `UPDATE kit_installations SET kitVersion = 4 WHERE userId = '<USER>' AND unitId = '<UNIT>';` e recarregar a aba.
   Resultado esperado: "Versão 4 instalada · versão 6 disponível" e o botão "O que muda nas versões novas", que abre
   as entradas das versões 5 e 6.
   EVIDÊNCIA:
   ```
   sqlite> UPDATE kit_installations SET kitVersion = 4 WHERE userId = 'cmufn7n590000cixkxbls0agh' AND unitId = 'cmvpzspp50001ciwszbcczcrj';
   (1 row(s) affected)
   ```
   Aba recarregada, fechada ([`passo2-fechado.png`](runbook-evidence/lac-b-kit-de-setor/passo2-fechado.png)):
   ```
   Salão de beleza
   Versão 4 instalada · versão 6 disponível
   O que muda nas versões novas
   ```
   Depois de clicar "O que muda nas versões novas" ([`passo2-changelog.png`](runbook-evidence/lac-b-kit-de-setor/passo2-changelog.png)):
   ```
   Versão 5
   v5: referencial 2025 das 9 folhas da emenda 3.3 (juros/multa/desconto em 3.5.x e 4.3.x, multas indedutíveis 4.4.x, tarifa bancária 4.6), PROPOSTA-REFERENCIAL-D1 §1.2 (F-HR-4 a, dono 11/10; 4.6 em vez de 4.5, dono 13/10).
   Versão 6
   v6: plano de contas em 4 níveis — analíticas patrimoniais renomeadas (1.1.1 → 1.1.1.01 etc.) pela REGRA_VALIDA_NIVEL_CONTAS do Manual da ECD L9 (BE-INCR-PLANO-4-NIVEIS; ADR-PLANO-CONTAS-4-NIVEIS); binding V2; a recolher em 2.1.3 Obrigações Tributárias › 2.1.3.01–.04 (F-L8-10 a) e sintéticas 3.6/4.5 (F-L8-11 a; dono 15/10).
   ```
   Confere: texto da versão, botão, e as entradas das versões 5 e 6. **PASSOU.**

3. Simular uma pendência aberta (fixture no formato real de `classifyKitDiff.ts:204`, corrigida em 26/10 por comando do
   dono — a 1ª execução usou `'role:receita-servico'` e `kitValue '{}'`, ver passo 9 e Registro, achado 1):
   `INSERT INTO kit_upgrade_pendings (id, userId, unitId, kitKey, toVersion, runId, itemKey, reason, kitValue, tenantValue, status, createdAt, updatedAt) VALUES ('rb-p1', '<USER>', '<UNIT>', 'beautySalon', 6, 'rb-run', 'role:receita-serviço', 'override', '{"role":"receita-serviço","accountCode":"3.1"}', '{"role":"receita-serviço","accountCode":"3.1.1"}', 'OPEN', datetime('now'), datetime('now'));`
   (`3.1` = código do papel `receita-serviço` no binding Active do kit v6 da unidade; `tenantValue` leva outro código só
   para ter forma de ajuste) e recarregar a aba.
   Resultado esperado: "Pendências da atualização do kit: 1" e a linha `role:receita-serviço` com "A conta do papel foi
   ajustada nesta unidade". Sem botões de aceitar/recusar (entram no PR-2).
   EVIDÊNCIA (1ª execução, fixture antiga — a tela com a fixture corrigida está no passo 9, "Reexecução"):
   ```
   sqlite> INSERT INTO kit_upgrade_pendings (id, userId, unitId, kitKey, toVersion, runId, itemKey, reason, kitValue, tenantValue, status, createdAt, updatedAt) VALUES ('rb-p1', 'cmufn7n590000cixkxbls0agh', 'cmvpzspp50001ciwszbcczcrj', 'beautySalon', 6, 'rb-run', 'role:receita-servico', 'override', '{}', '{}', 'OPEN', datetime('now'), datetime('now'));
   (1 row(s) affected)
   ```
   Aba recarregada ([`passo3.png`](runbook-evidence/lac-b-kit-de-setor/passo3.png)):
   ```
   Salão de beleza
   Versão 4 instalada · versão 6 disponível
   O que muda nas versões novas
   Pendências da atualização do kit: 1
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   Confere o contador e a linha com o motivo. **Os botões "Aceitar"/"Recusar" ESTÃO na linha**: a frase "Sem botões de
   aceitar/recusar (entram no PR-2)" é da redação do PR-1; o PR-2 (#921) está no commit das pré-condições e o passo 8
   deste mesmo runbook (item 20 do BRIEF §10) exige os botões. Lido como superado pelo passo 8, não como divergência —
   registrado para o dono confirmar (Registro, achado 2). **PASSOU** (com essa leitura).

4. Simular instalação que parou no passo 7:
   `UPDATE kit_installations SET kitVersion = 6, status = 'FAILED', steps = '{"lastCompletedStep":6,"warnings":[]}' WHERE userId = '<USER>' AND unitId = '<UNIT>';`
   e recarregar a aba.
   Resultado esperado: aviso âmbar "A instalação do kit parou no meio, no passo 7 de 7." com o botão
   "Retomar instalação".
   EVIDÊNCIA:
   ```
   sqlite> UPDATE kit_installations SET kitVersion = 6, status = 'FAILED', steps = '{"lastCompletedStep":6,"warnings":[]}' WHERE userId = 'cmufn7n590000cixkxbls0agh' AND unitId = 'cmvpzspp50001ciwszbcczcrj';
   (1 row(s) affected)
   ```
   Aba recarregada ([`passo4.png`](runbook-evidence/lac-b-kit-de-setor/passo4.png) — o aviso é o bloco âmbar com o
   triângulo e o botão verde à direita):
   ```
   Salão de beleza
   Versão 6
   A instalação do kit parou no meio, no passo 7 de 7.
   Retomar instalação
   Pendências da atualização do kit: 1
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   **PASSOU.**

5. Clicar "Retomar instalação" e confirmar.
   Resultado esperado: a confirmação diz que continua do passo 7; depois de confirmar, toast "Instalação do kit
   concluída." e o aviso some. `SELECT status, steps FROM kit_installations WHERE unitId = '<UNIT>';` devolve
   `INSTALLED` e `lastCompletedStep: 7`; `SELECT COUNT(*) FROM accounting_bindings WHERE unitId = '<UNIT>' AND status = 'Active';` devolve 1.
   EVIDÊNCIA: confirmação ([`passo5-confirmacao.png`](runbook-evidence/lac-b-kit-de-setor/passo5-confirmacao.png)):
   ```
   Retomar a instalação do kit?
   A instalação continua do passo 7; os passos já concluídos não são refeitos.
   Cancelar
   Retomar
   ```
   Depois de "Retomar": toast *"Instalação do kit concluída."* ([`passo5-toast.png`](runbook-evidence/lac-b-kit-de-setor/passo5-toast.png));
   2,5 s depois, "A instalação do kit parou no meio" e "Retomar instalação" ausentes da página (assert do runner) e a aba
   ([`passo5-depois.png`](runbook-evidence/lac-b-kit-de-setor/passo5-depois.png)):
   ```
   Salão de beleza
   Versão 6
   Pendências da atualização do kit: 1
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   ```
   sqlite> SELECT status, steps FROM kit_installations WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
   | INSTALLED | {"lastCompletedStep":7,"warnings":[]} |
   sqlite> SELECT COUNT(*) FROM accounting_bindings WHERE unitId = 'cmvpzspp50001ciwszbcczcrj' AND status = 'Active';
   | 1 |
   ```
   **PASSOU.**

6. (`INSTALLING`) `UPDATE kit_installations SET status = 'INSTALLING' WHERE unitId = '<UNIT>';` e recarregar a aba.
   Resultado esperado: "Instalação do kit em andamento.", sem botão. Ao final, voltar o status:
   `UPDATE kit_installations SET status = 'INSTALLED' WHERE unitId = '<UNIT>';`
   EVIDÊNCIA:
   ```
   sqlite> UPDATE kit_installations SET status = 'INSTALLING' WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
   (1 row(s) affected)
   ```
   Aba recarregada ([`passo6.png`](runbook-evidence/lac-b-kit-de-setor/passo6.png)); "Retomar instalação" ausente da
   página (assert do runner):
   ```
   Salão de beleza
   Versão 6
   Instalação do kit em andamento.
   Pendências da atualização do kit: 1
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   Volta do status:
   ```
   sqlite> UPDATE kit_installations SET status = 'INSTALLED' WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
   (1 row(s) affected)
   sqlite> SELECT status, steps FROM kit_installations WHERE unitId = 'cmvpzspp50001ciwszbcczcrj';
   | INSTALLED | {"lastCompletedStep":7,"warnings":[]} |
   ```
   **PASSOU.**

7. (Modo cliente) Entrar como contador com atribuição ativa e escolher o cliente no seletor "Livro".
   Resultado esperado: a aba "Kit de setor" não aparece.
   EVIDÊNCIA: preparo (API, como dono; não é passo do runbook): contato do contador no escopo e convite para o usuário
   `seed-real@seed.local`:
   ```
   POST /api/accounting/contacts {"unitId":"cmvpzspp50001ciwszbcczcrj","name":"Contador RB","email":"contador-rb@seed.local","cpf":"52998224725","crcNumber":"SP-123456/O-3","crcUf":"SP"} → 201 id=cmvq00whs005fciwsjgewv87v
   POST /api/accounting/accountant-assignments {"unitId":"cmvpzspp50001ciwszbcczcrj","accountingContactId":"cmvq00whs005fciwsjgewv87v","accountantEmail":"seed-real@seed.local"} → 201 {"id":"cmvq00wi1005hciwsu0twyeye","status":"PENDING",...}
   ```
   Na tela, logado como `seed-real@seed.local`: faixa "Convites de contador responsável" ([`passo7-convite.png`](runbook-evidence/lac-b-kit-de-setor/passo7-convite.png))
   → "Aceitar" → modal "Aceitar atribuição" com a declaração de contrato marcada → "Aceitar". Seletor "Livro" →
   opção `seed-presumido@seed.local · cmvpzspp…`. Faixa *"Você está no livro de seed-presumido@seed.local — unidade
   cmvpzspp…"* e barra de abas (`passo7-abas.txt`):
   ```
   Períodos
   Compliance
   Política contábil
   ```
   "Kit de setor" ausente da página (assert do runner). Print: [`passo7.png`](runbook-evidence/lac-b-kit-de-setor/passo7.png). **PASSOU.**

8. (PR-2 — aceitar e recusar uma pendência aberta) Com a pendência do passo 3 e mais uma
   (`INSERT … VALUES ('rb-p2', '<USER>', '<UNIT>', 'beautySalon', 6, 'rb-run', 'referential:2025:9.9.9', 'referential_year_frozen', '{}', '{}', 'OPEN', datetime('now'), datetime('now'));`),
   na linha `referential:2025:9.9.9` clicar "Recusar", digitar um motivo de 9 caracteres e depois de 10 ou mais, e confirmar.
   Resultado esperado: com 9 caracteres o botão "Recusar" do modal fica desabilitado; o modal diz que recusar mantém o
   valor da unidade; ao confirmar, toast "Pendência recusada." e a linha some da lista.
   `SELECT status, motivo FROM kit_upgrade_pendings WHERE id = 'rb-p2';` devolve `REJECTED` e o motivo digitado.
   EVIDÊNCIA:
   ```
   sqlite> INSERT INTO kit_upgrade_pendings (id, userId, unitId, kitKey, toVersion, runId, itemKey, reason, kitValue, tenantValue, status, createdAt, updatedAt) VALUES ('rb-p2', 'cmufn7n590000cixkxbls0agh', 'cmvpzspp50001ciwszbcczcrj', 'beautySalon', 6, 'rb-run', 'referential:2025:9.9.9', 'referential_year_frozen', '{}', '{}', 'OPEN', datetime('now'), datetime('now'));
   (1 row(s) affected)
   ```
   Aba antes ([`passo8-antes.png`](runbook-evidence/lac-b-kit-de-setor/passo8-antes.png)): "Pendências da atualização do kit: 2",
   linhas `role:receita-servico` e `referential:2025:9.9.9` ("O referencial do ano já foi usado numa ECD"). "Recusar" na
   linha `referential:2025:9.9.9`; com `123456789` (9 caracteres) no motivo ([`passo8-modal-9chars.png`](runbook-evidence/lac-b-kit-de-setor/passo8-modal-9chars.png)):
   ```
   [assert] botão "Recusar" disabled=true (esperado true)
   Recusar a pendência referential:2025:9.9.9?
   Recusar mantém o valor desta unidade; a pendência não volta nesta versão do kit.
   Motivo (10 a 500 caracteres)
   Cancelar
   Recusar
   ```
   Digitado em seguida `motivo de teste do runbook` no mesmo campo (o runner acrescentou ao texto, total 35 caracteres)
   ([`passo8-modal-10chars.png`](runbook-evidence/lac-b-kit-de-setor/passo8-modal-10chars.png)):
   `[assert] botão "Recusar" disabled=false (esperado false)`. Confirmado: toast *"Pendência recusada."*
   ([`passo8-toast.png`](runbook-evidence/lac-b-kit-de-setor/passo8-toast.png)); 2 s depois `referential:2025:9.9.9` ausente
   da página e a aba ([`passo8-depois.png`](runbook-evidence/lac-b-kit-de-setor/passo8-depois.png)):
   ```
   Salão de beleza
   Versão 6
   Pendências da atualização do kit: 1
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   ```
   sqlite> SELECT status, motivo FROM kit_upgrade_pendings WHERE id = 'rb-p2';
   | REJECTED | 123456789motivo de teste do runbook |
   ```
   **PASSOU** (o motivo gravado é exatamente o texto que ficou no campo).

9. Na linha `role:receita-serviço` (motivo `override`) clicar "Aceitar".
   Resultado esperado: o modal diz que aceitar remove o ajuste da conta do papel e recompila o binding. Confirmar com
   motivo: toast "Pendência aceita." (sem ajuste vivo do papel o BE só fecha a pendência), a lista e o contador
   atualizam. `SELECT status FROM kit_upgrade_pendings WHERE id = 'rb-p1';` devolve `ACCEPTED`.
   EVIDÊNCIA — **1ª execução (fixture antiga, `role:receita-servico` + `kitValue '{}'`): FALHOU**; modal ([`passo9-modal.png`](runbook-evidence/lac-b-kit-de-setor/passo9-modal.png)) confere:
   ```
   Aceitar a pendência role:receita-servico?
   Aceitar remove o ajuste da conta deste papel e recompila o binding com a conta do kit.
   Motivo (10 a 500 caracteres)
   Cancelar
   Aceitar
   ```
   Confirmado com o motivo `aceite de teste do runbook`: **o toast "Pendência aceita." NÃO apareceu em 20 s**
   (`Error: texto não apareceu em 20000ms: "Pendência aceita."`). A tela mostra toast de ERRO e o erro inline na seção
   de pendências ([`passo9-divergencia.png`](runbook-evidence/lac-b-kit-de-setor/passo9-divergencia.png), do clique
   repetido para colar a tela; o 1º clique já tinha dado o mesmo 422 no log):
   ```
   Salão de beleza
   Versão 6
   Pendências da atualização do kit: 1
   O papel 'undefined' não é usado pelo binding do kit 'beautySalon'.
   role:receita-servico
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   Log do `backend-prod`:
   ```
   {"timestamp":"2026-10-27T01:21:38.822Z","level":"info","message":"[API Error Handler]","requestId":"9b157e9f-10e4-4dea-a1d8-feae64085e8c","method":"POST","route":"/api/accounting-kit/pending/rb-p1/accept","userId":"cmufn7n590000cixkxbls0agh","statusCode":422,"code":"ROLE_NOT_IN_KIT","event":"api.error"}
   ```
   ```
   sqlite> SELECT id, status, motivo, updatedAt FROM kit_upgrade_pendings WHERE id = 'rb-p1';
   | rb-p1 | OPEN | None | 2026-10-27 01:18:43 |
   ```
   A lista e o contador não mudaram; `rb-p1` seguia `OPEN`. Divergência do esperado na 1ª execução.
   Causa apurada (leitura do código + 1 diagnóstico, fora do roteiro — Registro, achado 1): a fixture do passo 3
   (`kitValue = '{}'`, papel sem ç) não tinha o formato da pendência real.

   **Reexecução do passo 9 (26/10, mesmo build `957ec331`, mesmos servidores reiniciados; dono, chat, 2026-10-26:
   *"Corrige a fixture dos passos 3 e 9 … e reexecuta só o passo 9, atualizando o runbook e a nota LAC-B"*).**
   A linha antiga foi removida e a fixture corrigida do passo 3 inserida (o SELECT confirma o `ç` em UTF-8:
   `itemKey = 'role:receita-serviço'` → `1`):
   ```
   sqlite> DELETE FROM kit_upgrade_pendings WHERE id = 'rb-p1';
   (1 row(s) affected)
   sqlite> INSERT INTO kit_upgrade_pendings (id, userId, unitId, kitKey, toVersion, runId, itemKey, reason, kitValue, tenantValue, status, createdAt, updatedAt) VALUES ('rb-p1', 'cmufn7n590000cixkxbls0agh', 'cmvpzspp50001ciwszbcczcrj', 'beautySalon', 6, 'rb-run', 'role:receita-serviço', 'override', '{"role":"receita-serviço","accountCode":"3.1"}', '{"role":"receita-serviço","accountCode":"3.1.1"}', 'OPEN', datetime('now'), datetime('now'));
   (1 row(s) affected)
   sqlite> SELECT id, itemKey, reason, kitValue, tenantValue, status FROM kit_upgrade_pendings WHERE id = 'rb-p1';
   | rb-p1 | role:receita-serviço | override | {"role":"receita-serviço","accountCode":"3.1"} | {"role":"receita-serviço","accountCode":"3.1.1"} | OPEN |
   ```
   Aba ao abrir — vale também como a tela do passo 3 com a fixture corrigida
   ([`passo9r-antes.png`](runbook-evidence/lac-b-kit-de-setor/passo9r-antes.png)):
   ```
   Salão de beleza
   Versão 6
   Pendências da atualização do kit: 1
   role:receita-serviço
   A conta do papel foi ajustada nesta unidade
   Aceitar
   Recusar
   ```
   "Aceitar" na linha → modal ([`passo9r-modal.png`](runbook-evidence/lac-b-kit-de-setor/passo9r-modal.png)), com o
   motivo `aceite de teste do runbook` e `[assert] botão "Aceitar" disabled=false`:
   ```
   Aceitar a pendência role:receita-serviço?
   Aceitar remove o ajuste da conta deste papel e recompila o binding com a conta do kit.
   Motivo (10 a 500 caracteres)
   Cancelar
   Aceitar
   ```
   Confirmado: toast *"Pendência aceita."* ([`passo9r-toast.png`](runbook-evidence/lac-b-kit-de-setor/passo9r-toast.png));
   2,5 s depois `role:receita-serviço` e "Pendências da atualização do kit" ausentes da página (assert do runner — o
   contador foi a 0 e o bloco de pendências some) e a aba ([`passo9r-depois.png`](runbook-evidence/lac-b-kit-de-setor/passo9r-depois.png)):
   ```
   Salão de beleza
   Versão 6
   ```
   ```
   sqlite> SELECT status FROM kit_upgrade_pendings WHERE id = 'rb-p1';
   | ACCEPTED |
   sqlite> SELECT id, status, motivo FROM kit_upgrade_pendings WHERE id = 'rb-p1';
   | rb-p1 | ACCEPTED | aceite de teste do runbook |
   sqlite> SELECT COUNT(*) FROM accounting_bindings WHERE unitId = 'cmvpzspp50001ciwszbcczcrj' AND status = 'Active';
   | 1 |
   ```
   **PASSOU** (na reexecução; sem ajuste vivo do papel o BE só fechou a pendência, e o binding seguiu com 1 Active).

## Desfecho (marcar UM)
[x] PASSOU — todos os passos com evidência conferindo com o esperado
    (o passo 9 passou na reexecução de 26/10, depois da correção da fixture do roteiro autorizada pelo dono; a 1ª
    execução do passo 9 FALHOU por essa fixture e a evidência dela fica colada acima)
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook):
  1. **A fixture dos passos 3/9 não é o formato real da pendência `override`, e é isso que derruba o passo 9.**
     `classifyKitDiff.ts:201-206` cria a pendência com `kitValue: { role, accountCode }`; o aceite
     (`KitPendingService.applyKitValue`, `case 'override'`) lê `const { role } = kitValue` e chama
     `RoleAccountOverrideService.remove(scope, role)` — com `'{}'` o papel vai `undefined` e o serviço devolve 422
     `ROLE_NOT_IN_KIT` (`roleOverrideTypes.ts:22`) em vez do `RoleOverrideNotFoundError` que o aceite engole ("sem ajuste
     vivo só fecha"). Segundo desvio da fixture: o papel real do binding é `receita-serviço` (com ç; lido do
     `payload` do binding Active da unidade), não `receita-servico`. **Diagnóstico** (não é passo do runbook): pendência
     `rb-p3` inserida no formato real, com um papel que o binding usa —
     `itemKey 'role:receita-revenda', kitValue '{"role":"receita-revenda","accountCode":"3.1.1.02"}'` — e aceita na tela
     com o motivo `aceite diagnostico formato real`: toast *"Pendência aceita."*
     ([`diag-rb-p3-toast.png`](runbook-evidence/lac-b-kit-de-setor/diag-rb-p3-toast.png)), contador 2 → 1, linha some,
     `SELECT id, itemKey, status, motivo … WHERE id = 'rb-p3'` → `| rb-p3 | role:receita-revenda | ACCEPTED | aceite diagnostico formato real |`.
     Ou seja: o comportamento esperado do passo 9 existe no app; o roteiro é que pedia uma linha que o app nunca grava
     (regra de [sintético ≠ formato real]). **Correção aplicada ao roteiro (passos 3 e 9) em 26/10 por comando do dono:**
     `itemKey 'role:receita-serviço'` e `kitValue '{"role":"receita-serviço","accountCode":"3.1"}'` (`tenantValue` idem
     com `3.1.1`); o passo 9 foi reexecutado com ela e PASSOU (evidência no passo 9, "Reexecução").
  2. O passo 3 ainda carrega a frase "Sem botões de aceitar/recusar (entram no PR-2)" da redação do PR-1; com o #921
     integrado os botões aparecem (e o passo 8 depende deles). Lido como superado; o dono confirma ou reprova a leitura.
  3. (baixo) Com a linha malformada, a tela mostra a mensagem crua do BE com `'undefined'` dentro — `ROLE_NOT_IN_KIT` não
     está no mapa de códigos do item 18 (que cobre `KIT_PENDING_*`, `*_COMPILE_DRAFT`, `KIT_NOT_INSTALLED`,
     `ACCOUNT_NOT_FOUND`). Dentro da spec ("o resto, a mensagem do BE"); só não acontece com pendência real.
  4. (ambiente) Esta cópia do banco tinha os `seed-*` com senha diferente do `.env` (regravada — pré-condições) e as duas
     unidades v6 do seed já com 7–8 pendências reais abertas, o que inviabiliza o passo 1 nelas; o runbook pede unidade
     instalada pela faixa, e foi assim que se fez.
- Ruído na tela (BRIEF §9): a aba ficou poluída? **Não, na leitura do revisor.** No pior estado medido (passo 4: versão +
  aviso de falha + pendências) são três cartões `rounded-2xl` empilhados, cada um com uma frase; sem changelog aberto e
  sem pendência a aba é um cartão só (passo 1). O changelog fica fechado por padrão e o aviso âmbar some quando o
  status volta. A faixa de ativação e os convites ficam acima da barra de abas e não entram na aba. Julgamento do dono
  continua valendo sobre o do agente.
- Atualização do artefato de rastreio: nota [LAC-B](../plano/nos/LAC-B.md) (`estado_detalhe`) com o desfecho + data — feita
  nesta execução (26/10) e refeita depois da reexecução do passo 9 (26/10).
- Assinatura do executor: agente Claude Fable 5.1, persona revisor, sob comando do dono (chat, 2026-10-26) — 1ª execução
  (FALHOU no passo 9) e reexecução do passo 9 com a fixture corrigida (PASSOU), ambas em 2026-10-26
