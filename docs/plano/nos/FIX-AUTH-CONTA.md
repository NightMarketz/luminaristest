---
id: "FIX-AUTH-CONTA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Conta e infraestrutura: delete de usuário dá 500 após apagar vetores, ADMIN desativa o próprio layout, logout não invalida JWT, senha sem confirmação…"
estado: "planned"
estado_detalhe: "Registrado 19/10; §3.4 do documento de achados (25 itens, [V] salvo 2). Itens de e-mail/reset dependem de transporte de e-mail, que não existe"
write_set: ["server/src/features/users/**", "server/src/features/dashboardLayout/**", "server/src/middleware/auth.ts", "server/src/lib/jwt.ts", "server/src/server.ts", "server/src/jobs/PurgeDeletedRecords.ts", "server/src/features/attachments/**"]
atualizado: "2026-10-19"
---
# FIX-AUTH-CONTA — Conta e infraestrutura: delete de usuário dá 500 após apagar vetores, ADMIN desativa o próprio layout, logout não invalida JWT, senha sem confirmação…

**Estado:** `planned` — Registrado 19/10; §3.4 do documento de achados (25 itens, [V] salvo 2). Itens de e-mail/reset dependem de transporte de e-mail, que não existe  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
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
