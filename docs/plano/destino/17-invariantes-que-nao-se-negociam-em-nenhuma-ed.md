---
tipo: "destino"
secao_sdd: "§17"
titulo: "Invariantes que não se negociam em nenhuma edição"
---
# §17 Invariantes que não se negociam em nenhuma edição

1. Contabilidade é Prisma first-class; nunca linha de DynamicTable; nunca serviço Prisma dentro do motor (T3, Contrato §2.1).
2. Dinheiro em centavo inteiro, igualdade exata (T4).
3. Estorno é lançamento novo; post é imutável (T5).
4. Gate de invariante mutável dentro da transação (T6).
5. Idempotência por identidade do evento, em constraint de banco (T7).
6. Auditoria append-only com hash, sem cascade (T8).
7. Origem → razão só por bridge/binding validado; intérprete sem branch de negócio (T10, P1).
8. Núcleo nunca importa de compliance, integração, preset ou agente; jurisdição e tempo fiscal são dado.
9. Nenhum agente move dinheiro, emite nota ou escreve no razão sem confirmação humana.
10. ⟨corr⟩ Service que chama `postEntry` = 2 commits + reconcile com cabeçalho `atomicUntil`; **motor de domínio
    rejeitado** (Contrato §2.3, `ADR-DOMAIN-MOTOR-rejected.md`).
