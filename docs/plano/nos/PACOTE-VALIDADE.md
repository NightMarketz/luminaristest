---
id: "PACOTE-VALIDADE"
tipo: "plataforma"
dominio: "financeiro"
titulo: "Validade do pacote pré-pago e receita por não uso"
estado: "inflight"
estado_detalhe: "Decisão de produto de 29/09: o pacote ganha prazo; vencido, o saldo do passivo 2.1.1 vira receita por não uso. Hoje não há vencimento nem baixa (busca por 'expir' em features/packages vazia). Tratamento contábil do vencido = pendente de validação externa (contador) · 29/09: BRIEF BE-INCR-PACOTE-VALIDADE escrito — o prazo já tem onde morar (catálogo `validityDays` + `CustomerPackageBalance.expiresAt` reservado, nenhum dos dois aplicado): zero migração de schema; 11 forks F-PV-1..11 PENDENTES (recomendação: prazo do catálogo copiado no crédito, validade por saldo com junção na recompra, conta 3.4, evento `sale.package.expired` pelo binding, passe no reconcile, E-1 não vence); PE-1..PE-6 (contador + jurídico) · 02/10: F-PV-1..11 ratificados por questionário + sub-forks 3b/9b/9c/9d; contra a recomendação: F-PV-3 b (backfill, prazo contado do deploy), F-PV-9 b (NFS-e do vencido em CONSUMO, cTribNac do pacote no perfil fiscal) e F-PV-9c b (emissão automática no job). Nenhum fork pendente; PE-1..PE-6 seguem dado externo (contador + jurídico); sem 'executa' · 02/10 (2ª rodada): backfill vira job no boot (F-PV-3c b, contra a recomendação), só saldos anteriores ao deploy (3e a, marca no JobWatermark); o incremento só vai a produção depois do PE-6 (3d); PACKAGE_EXPIRY_NFSE_PENDING e pacoteCTribNac→VENDA confirmados; pedidos prontos para o dono enviar: PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE (PE-1..PE-5) e PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE (PE-6) · 03/10: código + testes no PR #483, **retido aberto por decisão do dono** até o PE-6 (jurídico): o backfill roda no 1º boot de qualquer ambiente, sem flag ([[D-2026-10-03-INTEGRACAO-REKEY-ECF-X7]] §3); auto-merge desligado. Próximo passo: resposta do PE-6 → OK do dono → merge → deploy"
autorizacao: "dono, 2026-10-03: \"Executa o BE-INCR-PACOTE-VALIDADE — código e testes; não vai a produção antes do PE-6\" (antes: 2026-09-29 \"Validade por pacote\", só BRIEF)"
prs: ["#483"]
ancora_sdd: "—"
perfil_previsto: "opus-medio"
perfil_evidencia: "regra 1 não casa (F-PV-1..11 + 3b/9b/9c/9d ratificados 02/10; PE-1..6 são dado externo, não fork); regra 2: lançamento do saldo vencido (passivo → receita), saldo, tributo (NFS-e do vencido) e migração aditiva (FiscalProfile.pacoteCTribNac)"
atualizado: "2026-10-03"
---
# PACOTE-VALIDADE — Validade do pacote pré-pago e receita por não uso

**Estado:** `inflight` — Decisão de produto de 29/09: o pacote ganha prazo; vencido, o saldo do passivo 2.1.1 vira receita por não uso. Hoje não há vencimento nem baixa (busca por 'expir' em features/packages vazia). Tratamento contábil do vencido = pendente de validação externa (contador) · 29/09: BRIEF BE-INCR-PACOTE-VALIDADE escrito — o prazo já tem onde morar (catálogo `validityDays` + `CustomerPackageBalance.expiresAt` reservado, nenhum dos dois aplicado): zero migração de schema; 11 forks F-PV-1..11 PENDENTES (recomendação: prazo do catálogo copiado no crédito, validade por saldo com junção na recompra, conta 3.4, evento `sale.package.expired` pelo binding, passe no reconcile, E-1 não vence); PE-1..PE-6 (contador + jurídico) · 02/10: F-PV-1..11 ratificados por questionário + sub-forks 3b/9b/9c/9d; contra a recomendação: F-PV-3 b (backfill, prazo contado do deploy), F-PV-9 b (NFS-e do vencido em CONSUMO, cTribNac do pacote no perfil fiscal) e F-PV-9c b (emissão automática no job). Nenhum fork pendente; PE-1..PE-6 seguem dado externo (contador + jurídico); sem 'executa' · 02/10 (2ª rodada): backfill vira job no boot (F-PV-3c b, contra a recomendação), só saldos anteriores ao deploy (3e a, marca no JobWatermark); o incremento só vai a produção depois do PE-6 (3d); PACKAGE_EXPIRY_NFSE_PENDING e pacoteCTribNac→VENDA confirmados; pedidos prontos para o dono enviar: PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE (PE-1..PE-5) e PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE (PE-6) · 03/10: código + testes no PR #483, **retido aberto por decisão do dono** até o PE-6 (jurídico): o backfill roda no 1º boot de qualquer ambiente, sem flag ([[D-2026-10-03-INTEGRACAO-REKEY-ECF-X7]] §3); auto-merge desligado. Próximo passo: resposta do PE-6 → OK do dono → merge → deploy
**Autorização:** dono, 2026-10-03: "Executa o BE-INCR-PACOTE-VALIDADE — código e testes; não vai a produção antes do PE-6" (antes: 2026-09-29 "Validade por pacote", só BRIEF)
**Depende de:** —
**Desbloqueia:** —
**Âncora no SDD consolidado:** —
**PRs:** #483

Origem: [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]] (decisão 18). Vizinho: a linha do GAP-MAP Nível 5 sobre cancelar/devolver venda de pacote (decisão
17, só registro) — o mesmo `SaleReversalBridge` e o mesmo `PackageBalanceService` estão nos dois.

## Docs

- [`docs/accounting/BE-INCR-PACOTE-VALIDADE-brief.md`](../../accounting/BE-INCR-PACOTE-VALIDADE-brief.md) — BRIEF 29/09: checklist de 22 itens, contratos, **11 forks F-PV-1..11** (✅ ratificados 02/10, + 3b/9b/9c/9d — [[D-2026-10-02-PACOTE-VALIDADE-FORKS]]; efeitos no §5.2), PE-1..PE-6 (tratamento contábil do vencido e efeito fiscal com o contador; validade no direito do consumidor com o jurídico), fronteira com o E-1 (§2). Não autoriza código: exige os forks ratificados + "executa"
- [`docs/accounting/PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md`](../../accounting/PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md) — pesquisa legal de PE-1..PE-6 (pedido do dono, 29/09). Não decide nada. Achados:
  - CPC 47 B46 tem 2 ramos, e o dono escolheu o 2º;
  - NBC TG 1002, item 23.7 (microentidade reconhece a receita na nota);
  - Simples a partir de 2027 reconhece a receita na emissão do documento fiscal (Res. CGSN 190/2026);
  - regulamento da CBS existe (Decreto 12.955/2026, art. 11 § 6º → art. 57);
  - CC art. 132 § 1º (vencimento em feriado vai para o dia útil seguinte);
  - não há lei específica de validade de crédito pré-pago.
- [`docs/accounting/PESQUISA-JURISPRUDENCIA-PACOTE-VALIDADE-2026-09-29.md`](../../accounting/PESQUISA-JURISPRUDENCIA-PACOTE-VALIDADE-2026-09-29.md) — jurisprudência dos pontos em aberto (pedido do dono, 29/09). Só análogos. Achados:
  - STJ REsp 1.321.655 e 1.580.278: perda integral do valor antecipado é abusiva, retenção até 20%;
  - TJRS 70080293178 (secundária): validade de vale-presente informada é aceita;
  - STF Tema 581: disponibilidade como serviço, contra-argumento no ISS;
  - SC Cosit 144/2023: preço independe da denominação;
  - nenhuma decisão sobre IBS/CBS nem sobre CARF/breakage.

## Fold 02/10 — ratificação

- [[D-2026-10-02-PACOTE-VALIDADE-FORKS]]: F-PV-1..11 decididos por questionário. Três escolhas contra a recomendação:
  - **F-PV-3 (b)**: backfill dos saldos antigos, com o prazo contado do deploy (3b a);
  - **F-PV-9 (b)**: NFS-e do vencido em `CONSUMO`, com o `cTribNac` do pacote no perfil fiscal (9b a), o que fecha
    também a lacuna do pacote `VENDA`;
  - **F-PV-9c (b)**: a emissão é automática no passe do job, com âncora na venda de origem mais recente (9d a).
- Efeitos no checklist: BRIEF §5.2 (itens 2a, 9.5, 13a, 14a). Não é "executa". PE-1..PE-6 continuam do contador e do
  jurídico. O PE-6 vira pré-condição do ~~CLI de backfill em produção~~ **deploy do incremento** (2ª rodada, F-PV-3d) e o
  PE-4 do uso da NFS-e do vencido.
- **2ª rodada 02/10** ([[D-2026-10-02-PACOTE-VALIDADE-FORKS]] §2ª rodada): F-PV-3c (b) job no boot, contra a
  recomendação; 3d deploy só após o PE-6; 3e (a) só saldos anteriores ao deploy. Item 9.5 e 13a confirmados.
- **Pedidos prontos (o dono envia):** [`PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md`](../../accounting/PEDIDO-CONTADOR-2026-10-02-PACOTE-VALIDADE.md)
  (PE-1..PE-5; prioridade PE-4 e PE-1 iv) e [`PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md`](../../accounting/PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md) (PE-6).
