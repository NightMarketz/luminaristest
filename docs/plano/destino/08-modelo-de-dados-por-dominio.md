---
tipo: "destino"
secao_sdd: "§8"
titulo: "Modelo de dados por domínio"
---
# §8 Modelo de dados por domínio

| Domínio | Operacional (DynamicTable) | Invariante (Prisma) |
|---|---|---|
| Parte (pessoa/empresa) | customers, suppliers, crmAccounts, crmContacts, employees | Counterparty (CPF/CNPJ alfanumérico — a ponte fiscal) |
| Comercial | leads, opportunities, proposals, sales, saleItems, contratos recorrentes | Receivable, JournalEntry via binding |
| Serviço | appointments, services, packageCatalog, tickets, ordens de serviço | CustomerPackageBalance, PackageBalanceMovement |
| Estoque | products, productUnits, stockMovements | InventoryItem, StockMovement (subrazão), custo |
| Compras | solicitações, cotações, pedidos | Payable, PayablePayment, FiscalDocument de entrada |
| Tesouraria | — | BankStatement, lines, ReconciliationMatch, BankSettlementItem, ReconcilePendingItem |
| Contábil | — | Account, AccountingPeriod, JournalEntry, Posting, dimensões, AuditEvent, ReferentialMapping |
| Fiscal | — | FiscalProfile, FiscalDocument(+Attempt/Sequence), Lalur*, apuração |
| Ativos | — | FixedAssetClass, DepreciationRate, FixedAsset |
| Pessoas | employees, jornada, ponto | Folha (PROPOSTO first-class; hoje diferido §M5) |
