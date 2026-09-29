---
id: "PACOTE-VALIDADE"
tipo: "plataforma"
dominio: "financeiro"
titulo: "Validade do pacote pré-pago e receita por não uso"
estado: "planned"
estado_detalhe: "Decisão de produto de 29/09: o pacote ganha prazo; vencido, o saldo do passivo 2.1.1 vira receita por não uso. Hoje não há vencimento nem baixa (busca por 'expir' em features/packages vazia). Tratamento contábil do vencido = pendente de validação externa (contador) · 29/09: BRIEF BE-INCR-PACOTE-VALIDADE escrito — o prazo já tem onde morar (catálogo `validityDays` + `CustomerPackageBalance.expiresAt` reservado, nenhum dos dois aplicado): zero migração de schema; 11 forks F-PV-1..11 PENDENTES (recomendação: prazo do catálogo copiado no crédito, validade por saldo com junção na recompra, conta 3.4, evento `sale.package.expired` pelo binding, passe no reconcile, E-1 não vence); PE-1..PE-6 (contador + jurídico)"
autorizacao: "dono, 2026-09-29: \"Validade por pacote\" — decisão de produto; BRIEF próprio (sem 'executa')"
ancora_sdd: "—"
atualizado: "2026-09-29"
---
# PACOTE-VALIDADE — Validade do pacote pré-pago e receita por não uso

**Estado:** `planned` — Decisão de produto de 29/09: o pacote ganha prazo; vencido, o saldo do passivo 2.1.1 vira receita por não uso. Hoje não há vencimento nem baixa (busca por 'expir' em features/packages vazia). Tratamento contábil do vencido = pendente de validação externa (contador) · 29/09: BRIEF BE-INCR-PACOTE-VALIDADE escrito — o prazo já tem onde morar (catálogo `validityDays` + `CustomerPackageBalance.expiresAt` reservado, nenhum dos dois aplicado): zero migração de schema; 11 forks F-PV-1..11 PENDENTES (recomendação: prazo do catálogo copiado no crédito, validade por saldo com junção na recompra, conta 3.4, evento `sale.package.expired` pelo binding, passe no reconcile, E-1 não vence); PE-1..PE-6 (contador + jurídico)
**Autorização:** dono, 2026-09-29: "Validade por pacote" — decisão de produto; BRIEF próprio (sem 'executa')
**Depende de:** —
**Desbloqueia:** —
**Âncora no SDD consolidado:** —

Origem: [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]] (decisão 18). Vizinho: a linha do GAP-MAP Nível 5 sobre cancelar/devolver venda de pacote (decisão
17, só registro) — o mesmo `SaleReversalBridge` e o mesmo `PackageBalanceService` estão nos dois.

## Docs

- [`docs/accounting/BE-INCR-PACOTE-VALIDADE-brief.md`](../../accounting/BE-INCR-PACOTE-VALIDADE-brief.md) — BRIEF 29/09: checklist de 22 itens, contratos, **11 forks F-PV-1..11 PENDENTES**, PE-1..PE-6 (tratamento contábil do vencido e efeito fiscal com o contador; validade no direito do consumidor com o jurídico), fronteira com o E-1 (§2). Não autoriza código: exige os forks ratificados + "executa"
