---
id: "D-2026-11-07-X10A-EMENDA-4-LACUNAS-AL-PR-3"
tipo: "decisao"
dominio: "fiscal"
titulo: "X10a EMENDA-4 AL-PR-3: 2 lacunas da fila do assinador, pela recomendação — chave opcional só no infInut; certificado trocado no caixa = sem token"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, questionário (AskUserQuestion) da sessão de feature do AL-PR-3: Chave inut → \"Chave opcional no infInut (Recomendado)\"; Cert trocado → \"Trata como sem token (Recomendado)\"; dentro do executa de 07/11 (\"Pode disparar então o que precisa seguir\"), sem merge"
atualizado: "2026-11-07"
---
# D-2026-11-07-X10A-EMENDA-4-LACUNAS-AL-PR-3

**Estado:** `decided`. **Autorização:** dono, chat, 07/11/2026, questionário (citação no frontmatter). Origem: a sessão de
feature que executa o AL-PR-3 do [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](../../accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md)
achou dois pontos que o BRIEF não cobre (regra 2 da `sessao-feature`). Continua a numeração de
`D-2026-11-07-X10A-EMENDA-4-LACUNAS` (L-AL-1..4; o arquivo entra pelo PR #1138, ainda fora de `main`). Nenhum fork ratificado muda.

## Decisões

5. **L-AL-5 — chave da tarefa `ASSINAR` na inutilização.** O contrato §4.2 exige `conteudo.chave` de 44 dígitos, mas o
   `infInut` não tem chave (o Id tem 41 dígitos: cUF + ano + CNPJ + mod + série + faixa). **Decisão:** `chave` passa a ser
   opcional só quando `alvo = infInut`; o diário do assinador grava o Id do próprio elemento no lugar. CNPJ e `tpAmb`
   continuam conferidos no elemento (AL-19).
6. **L-AL-6 — certificado do caixa diferente do pareamento.** O heartbeat traz `certThumbprintSha256`. **Decisão:** se ele
   não bater com o `certThumbprint` do pareamento, o servidor grava `tokenPresente = false` (a tela mostra token ausente e o
   pré-voo deixa a nota em `PENDING_SIGNATURE`) até voltar o certificado certo ou a unidade parear de novo. A conferência do
   L-AL-1 em cada assinatura continua.
