---
id: "D-2026-09-30-W3-ESCOLHA-CRIACAO"
tipo: "decisao"
dominio: "plataforma"
titulo: "W3 autorizado: escolha criar × customizar sem palavra-chave frágil (3 saídas) + botões e modais de confirmação"
estado: "decided"
autorizacao: "dono, 2026-09-30, em sessão (auditoria de modelos de decisão, ponto #12): \"autorizo as 5 correções por código, começa pela #12. Mas instrumenta primeiro\" + \"(a), corrige e depois b\"; questionários do mesmo dia: ambígua → \"Pergunta de novo\"; negação → \"Modal de confirmação\"; modal = \"Botões no lugar do texto, confirmar antes de criar e confirmar se quer negar mesmo\"; vault → \"Autorizar W3 + ratificar F-W3-2\""
atualizado: "2026-09-30"
---
# D-2026-09-30-W3-ESCOLHA-CRIACAO — escolha criar × customizar

**Estado:** `decided`
**Autorização:** dono, 2026-09-30, em sessão. Abre o [[W3]] **só na parte da escolha criar × customizar**:
o F-W3-1 (gate de confirmação `=== 'true'`) continua **pendente**.

## Decisões

| # | Tema | Decisão | Palavras |
|---|---|---|---|
| 1 | Resposta ambígua em `AWAITING_CREATION_TYPE_CONFIRMATION` | **Pergunta de novo** (antes: criava o sistema direto) | *"Pergunta de novo"* |
| 2 | Negação ("não quero customizar") | Não abre a customização nem cria sem confirmar → **modal de confirmação** | *"Modal de confirmação"* |
| 3 | F-W3-2 | **Ratificado (a):** três saídas `create` / `customize` / `unclear`. Parte (a) corrigida no mesmo dia (teste-guarda `StageHandlers.creationType.test.ts`, GAP-MAP Nível 1) | *"Autorizar W3 + ratificar F-W3-2"* |
| 4 | Erro ao preparar a customização | Não cria o sistema; volta a perguntar (derivado da #1; instrumentado e corrigido no mesmo diff) | *"Instrumenta o achado fora do escopo tbm"* |
| 5 | Parte (b) — tela | **Botões** no lugar do texto + **confirmar antes de criar** + **confirmar a negação**. BRIEF [`WIZARD-W3-ESCOLHA-CRIACAO-brief.md`](../../accounting/WIZARD-W3-ESCOLHA-CRIACAO-brief.md), forks pendentes lá | *"Botões no lugar do texto, confirmar antes de criar e confirmar se quer negar mesmo"* |
| 6 | Forks F-W3-B1..B5 do BRIEF da parte (b) | **Todos (a), pela recomendação:** `choice` enum no corpo; texto livre segue como fallback; "Criar agora" no modal da negação vale como confirmação; "Customizar" sem modal; dois PRs seriais BE → FE | *"Segue as recomendações"* |
