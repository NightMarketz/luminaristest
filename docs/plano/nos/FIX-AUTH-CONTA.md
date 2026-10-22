---
id: "FIX-AUTH-CONTA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Conta e infraestrutura: delete de usuário dá 500 após apagar vetores, ADMIN desativa o próprio layout, logout não invalida JWT, senha sem confirmação…"
estado: "inflight"
estado_detalhe: "Lote 1 (§3.4 #1 #2 #3 #6 #21) corrigido no PR #808 — 7 guardas verdes; forks #3 (tokenVersion) e #6 (currentPassword, admin isento) ratificados pelo dono, chat, 2026-10-21. Lote 2 (#9 #12 #22 #23) instrumentado — 4 guardas vermelhos; #10/#11 e #20 aguardam decisão do dono; e-mail fora. Lote 3: #4 instrumentado (1 guarda vermelho, my-app/lib/context/__tests__/AuthContext.logout.test.tsx); #7 #8 #13 #14 #16 #17 #18 #19 decididos pelo dono em 22/10 ([[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]]; #19 vai a BRIEF por causa do CSRF); #15 fora do nó; #24 inventário e #25 meta, sem defeito próprio. Lote 4 (#7 #8 #13 #14 #16 #17 #18) instrumentado e corrigido no PR #839 — 9 guardas vermelhos → verdes; #10/#11, #20 seguem abertos"
write_set: ["server/src/features/users/**", "server/src/features/dashboardLayout/**", "server/src/middleware/auth.ts", "server/src/lib/jwt.ts", "server/src/server.ts", "server/src/jobs/PurgeDeletedRecords.ts", "server/src/features/attachments/**", "server/src/lib/attachmentStorage.ts", "my-app/lib/context/AuthContext.tsx", "server/src/app.ts", "server/src/routes/auth.ts", "server/src/routes/users.ts", "server/src/routes/dashboard-layout.ts", "server/src/routes/index.ts", "server/src/routes/reports.ts", "server/src/routes/docs/reports.paths.ts", "server/src/controllers/authController.ts", "server/src/controllers/dashboardLayoutController.ts", "server/src/controllers/reportsController.ts", "server/src/features/reports/**", "server/src/lib/factory.ts", "server/public/openapi.json", "server/.dependency-cruiser-known-violations.json", "my-app/pages/users/**", "my-app/public/locales/*/common.json", "my-app/types/contracts/users/UserDto.gen.ts", "my-app/types/contracts/reports/**"]
autorizacao: "dono, chat, 2026-10-21: \"Autorizo instrumentar e corrigir os achados de FIX-AUTH-CONTA (§3.4), FIX-CHAT-AGENTE (§3.3) e FIX-FE-DASHBOARD (§3.5) do ACHADOS-2026-10-19 — sessao-instrumentacao → sessao-correcao, lotes de até 8 itens por PR, sem merge. Itens que dependem de transporte de e-mail ficam fora.\" · dono, chat, 2026-10-21: \"inicia o lote 2 do FIX-AUTH-CONTA\" — sem merge; e-mail fora; itens de decisão do dono (#10/#11, #20) não cobertos · dono, chat, 2026-10-22, questionário: #7 \"Só admin\"; #16 \"JWT de 30 dias se marcado\"; #19 \"Cookie httpOnly do server\"; \"#8 remover 'Make admin', #13 e #14 remover rotas, #17 rate limit no cadastro, #18 trust proxy\" — sem merge"
atualizado: "2026-10-22"
prs: ["#808", "#827", "#828", "#831", "#839"]
---
# FIX-AUTH-CONTA — Conta e infraestrutura: delete de usuário dá 500 após apagar vetores, ADMIN desativa o próprio layout, logout não invalida JWT, senha sem confirmação…

**Estado:** `inflight` — Lote 1 (§3.4 #1 #2 #3 #6 #21) corrigido no PR #808 — 7 guardas verdes; forks #3 (tokenVersion) e #6 (currentPassword, admin isento) ratificados pelo dono, chat, 2026-10-21. Lote 2 (#9 #12 #22 #23) instrumentado — 4 guardas vermelhos; #10/#11 e #20 aguardam decisão do dono; e-mail fora  
**Autorização:** dono, chat, 2026-10-21 — instrumentar e corrigir §3.4 em lotes de até 8 itens por PR, sem merge, e-mail fora; lote 2 iniciado no mesmo dia  
**Depende de:** —  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Itens de maior risco (§3.4)

1. Excluir usuário com trilha contábil: Qdrant apagado antes, depois P2003 (`onDelete: Restrict`) não mapeado → 500 e usuário intacto.
2. ADMIN "ativando" layout de outro usuário desativa o próprio (`setActive` com o `userId` do admin); idem `deleteLayout`.
3. Logout não invalida JWT (sem `jti`/blacklist); token de 7 dias segue válido após logout, troca de senha ou demoção.
4. Troca de senha/e-mail sem confirmar a senha atual.
5. `uncaughtException` sai com código 0.
6. Purga de soft delete limpa 2 de 47 modelos; "soft delete" de anexo apaga o binário na hora; delete de usuário deixa anexos em disco.
7. README × middleware divergem em `GET /users/:id`; a tela de edição quebra para USER.

Fora deste nó (decisão de produto, sem nó): transporte de e-mail e "esqueci a senha"; página `/users/subscription` (mock).
