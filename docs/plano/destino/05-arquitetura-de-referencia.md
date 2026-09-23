---
tipo: "destino"
secao_sdd: "§5"
titulo: "Arquitetura de referência"
---
# §5 Arquitetura de referência

```
Canais          web · PWA/mobile · WhatsApp · e-mail · portal do cliente · API pública/webhooks
Agentes de IA   entrevista/gerador · assistente · vendas · cobrança · fiscal · conciliação · atendimento
                (propõem, humano confirma)
Operacional     motor DynamicTable + presets: CRM · vendas/PDV · agenda · serviços/pacotes · estoque op. ·
                compras op. · comissões · metas · marketing · atendimento · projetos · produção leve · frota ·
                qualidade · tabelas custom — governança declarativa + plugins; schema do setor
Núcleo          Prisma first-class: razão · períodos · auditoria hash-chain · subrazões AR/AP · estoque/custos ·
invariante      imobilizado · tesouraria · orçamento · folha · documentos fiscais · apuração · identidade/tenancy
                — constraint de banco, gate in-tx, atomicUntil
Ponte           binding compilado + intérprete fixo (bridge pós-commit)
Compliance BR   NF-e/NFC-e/NFS-e/CT-e · SPED ECD/ECF/EFD ICMS-IPI/Contribuições · eSocial/EFD-Reinf/DCTFWeb ·
                IBS/CBS/split payment
Integrações     bancos (Open Finance, CNAB, Pix, boleto) · adquirentes · emissor DF-e · e-commerce/marketplace ·
                WhatsApp · agenda
```

**Lei:** setas só para dentro do núcleo; o núcleo nunca importa de compliance, integração, preset ou agente.

**Runtime — DECIDIDO:** Node single-process, SQLite WAL, scheduler in-process (T1/T11, §M1). **Escala — GATILHO
P3:** separar workers de job (emissão fiscal, conciliação, IA) do processo web; fila com outbox para integrações
externas; banco relacional servidor quando a carga medida exigir — sempre por ADR com dado de carga.
⟨corr⟩ "Fila com outbox" e "banco servidor" reabrem decisões **rejeitadas/travadas** (§M4: PostgreSQL; T11) — o
ADR de P3 precisa citá-las explicitamente.
