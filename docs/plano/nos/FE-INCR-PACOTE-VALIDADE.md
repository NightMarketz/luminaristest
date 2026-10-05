---
id: "FE-INCR-PACOTE-VALIDADE"
tipo: "fe"
dominio: "financeiro"
titulo: "Validade do pacote em destaque + aceite registrado"
estado: "done"
estado_detalhe: "Aberto 05/10 pelo F-JUR-4 (D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO): bloqueador do deploy do PACOTE-VALIDADE. Requisito nomeado pelo jurídico: validade em destaque no cadastro, na venda e no comprovante; fonte ≥ corpo 12 (CDC 54 § 3º); aceite registrado (quem, quando, texto mostrado). BRIEF: 16 itens em 3 PRs (PR-1 BE: texto versionado, tabela PackageValidityAcceptance, rotas de aceite e do PDF; PR-2 FE: saldo com validade, bloco de validade + checkbox na venda, gravação do aceite, detalhe com selo, botão do PDF; PR-3: cadastro). Forks F-FE-PV-1..7 ratificados 05/10 por questionário; contra a recomendação: F-FE-PV-1 (c) a venda de pacote no FE vira nó próprio antes deste (FE-INCR-VENDA-PACOTE) e F-FE-PV-5 (b) comprovante em PDF pelo pipeline existente (lib/pdf.ts). Aceite em tabela própria append-only por venda; checkbox do operador + assinatura no PDF; texto e data do BE com hash; venda sem aceite = selo + botão; texto v1 aprovado. PE-FE-1..3 ao jurídico (forma, não travam). Ordem: FE-INCR-VENDA-PACOTE → este (o #483 já está em main, 2d1ddbe5); sem 'executa' · 05/10: 'executa' do dono → PR #530 mergeado (OK do dono 05/10): BE (tabela PackageValidityAcceptance append-only, rotas notice/aceite/PDF, texto v1 com hash) + FE (saldo com validade, pagamento com saldo vencido desabilitado, bloco de validade + checkbox no wizard, aceite gravado depois de venda+itens, detalhe com selo, PDF do comprovante, cadastro 'Validade (dias)' por override no front). Achado na verificação em produção: o motor grava `date` como ISO UTC e a ponte do #483 recuava um dia (saldo vencia 2 dias antes do aceito) — corrigido no #530. Pendências F1 no #535 (mensagem do saldo vencido só com a data; 'quem' com nome) e o BRIEF PACOTE-VALIDADE-PENDENCIAS (#532). Residual: sign-off de browser (RUNBOOK-H2-PACOTE-VALIDADE, humano), PE-FE-1..3 (pedido ao jurídico pronto no #535, o dono envia), mensagem traduzida pt/en recusada (F-PP-1 a); menor: o servidor não exige o aceite (trava só na tela; o selo cobre)"
depende_de: ["[[FE-INCR-VENDA-PACOTE]]", "[[PACOTE-VALIDADE]]"]
autorizacao: "dono, chat, 2026-10-05: \"Planeja o nó FE do PACOTE-VALIDADE (...) Onde o aceite mora (coluna na venda ou no saldo) é fork — vai a mim por questionário (...) Crie a nota do nó no vault. Sem 'executa'\" — BRIEF + nota; código fora · EXECUTA: dono, chat, 2026-10-05: \"Executa o FE-INCR-PACOTE-VALIDADE\""
prs: ["#530", "#535"]
ancora_sdd: "—"
perfil_previsto: "opus-medio"
perfil_evidencia: "regra 1 não casa (F-FE-PV-1..7 ratificados 05/10); regra 2: migração Prisma aditiva (PackageValidityAcceptance) e prova legal do aceite; BE+FE"
atualizado: "2026-10-05"
---
# FE-INCR-PACOTE-VALIDADE — Validade do pacote em destaque + aceite registrado

**Estado:** `done` — Aberto 05/10 pelo F-JUR-4 (D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO): bloqueador do deploy do PACOTE-VALIDADE. Requisito nomeado pelo jurídico: validade em destaque no cadastro, na venda e no comprovante; fonte ≥ corpo 12 (CDC 54 § 3º); aceite registrado (quem, quando, texto mostrado). BRIEF: 16 itens em 3 PRs (PR-1 BE: texto versionado, tabela PackageValidityAcceptance, rotas de aceite e do PDF; PR-2 FE: saldo com validade, bloco de validade + checkbox na venda, gravação do aceite, detalhe com selo, botão do PDF; PR-3: cadastro). Forks F-FE-PV-1..7 ratificados 05/10 por questionário; contra a recomendação: F-FE-PV-1 (c) a venda de pacote no FE vira nó próprio antes deste (FE-INCR-VENDA-PACOTE) e F-FE-PV-5 (b) comprovante em PDF pelo pipeline existente (lib/pdf.ts). Aceite em tabela própria append-only por venda; checkbox do operador + assinatura no PDF; texto e data do BE com hash; venda sem aceite = selo + botão; texto v1 aprovado. PE-FE-1..3 ao jurídico (forma, não travam). Ordem: FE-INCR-VENDA-PACOTE → este (o #483 já está em main, 2d1ddbe5); sem 'executa' · 05/10: 'executa' do dono → PR #530 mergeado (OK do dono 05/10): BE (tabela PackageValidityAcceptance append-only, rotas notice/aceite/PDF, texto v1 com hash) + FE (saldo com validade, pagamento com saldo vencido desabilitado, bloco de validade + checkbox no wizard, aceite gravado depois de venda+itens, detalhe com selo, PDF do comprovante, cadastro 'Validade (dias)' por override no front). Achado na verificação em produção: o motor grava `date` como ISO UTC e a ponte do #483 recuava um dia (saldo vencia 2 dias antes do aceito) — corrigido no #530. Pendências F1 no #535 (mensagem do saldo vencido só com a data; 'quem' com nome) e o BRIEF PACOTE-VALIDADE-PENDENCIAS (#532). Residual: sign-off de browser (RUNBOOK-H2-PACOTE-VALIDADE, humano), PE-FE-1..3 (pedido ao jurídico pronto no #535, o dono envia), mensagem traduzida pt/en recusada (F-PP-1 a); menor: o servidor não exige o aceite (trava só na tela; o selo cobre)
**Autorização:** dono, chat, 2026-10-05: "Planeja o nó FE do PACOTE-VALIDADE (...) Onde o aceite mora (coluna na venda ou no saldo) é fork — vai a mim por questionário (...) Crie a nota do nó no vault. Sem 'executa'" — BRIEF + nota; código fora · EXECUTA: dono, chat, 2026-10-05: "Executa o FE-INCR-PACOTE-VALIDADE"
**Depende de:** [[FE-INCR-VENDA-PACOTE]] (variante `packages` do wizard), [[PACOTE-VALIDADE]] (#483 em `main` desde 04/10, `2d1ddbe5`: `expiresAt` preenchido, `PACKAGE_BALANCE_EXPIRED`, `lastValidDay` com feriado)
**Desbloqueia:** o deploy do [[PACOTE-VALIDADE]] (junto com o delta D1+D2, o OK do dono para o merge e o [[M2]])
**Âncora no SDD consolidado:** —
**PRs:** #530, #535

Origem: F-JUR-4 de [[D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO]] (pergunta 4 do jurídico, classe DADO) e o §8 do
BRIEF BE-INCR-PACOTE-VALIDADE ("mostrar a validade no cadastro do pacote, na venda e no saldo"). Forks:
[[D-2026-10-05-FE-PACOTE-VALIDADE-FORKS]].

## Docs

- [`docs/accounting/FE-INCR-PACOTE-VALIDADE-brief.md`](../../accounting/FE-INCR-PACOTE-VALIDADE-brief.md) — BRIEF 05/10:
  fatos lidos no código (o cliente FE descarta `expiresAt`; o pagamento mostra só o saldo; o FE não vende pacote; não
  há comprovante de venda, mas há pipeline de PDF), 16 itens em 3 PRs, contratos (`PackageValidityAcceptance`,
  notice com hash, rotas de aceite e do PDF, texto v1), forks ✅ ratificados (§5.1), PE-FE-1..3 (jurídico, sobre a
  forma), insumos ausentes I1..I4. Não autoriza código: exige "executa".
- [`docs/accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md`](../../accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md) — BRIEF 05/10 das pendências depois do
  PR #530 (mensagem do saldo vencido, "quem" do aceite, data da receita, data D-1 na UI, ordem até o deploy); forks F-PP-1..7 ✅
  ratificados por delegação ([[D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS]]). Não autoriza código: exige "executa".
