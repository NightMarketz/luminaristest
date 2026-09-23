---
tipo: "destino"
secao_sdd: "§4"
titulo: "Personas e papéis"
---
# §4 Personas e papéis

| Persona | Faz no sistema | Estado |
|---|---|---|
| Dono | Tudo: gera o sistema, opera, fecha o mês, cumpre o fisco, decide | DECIDIDO — única hoje |
| Operador (atendente, vendedor, profissional) | Agenda, venda, atendimento, lead; sem acesso ao razão | GATILHO P3 multi-operador (`actorUserId` já reservado) |
| Gestor financeiro | Baixas, conciliação, aprovações, cobrança | GATILHO P3 + torre de aprovação |
| Contador | Recebe pacote, revisa, lança acerto, assina ECD/ECF | DECIDIDO como destinatário. ⟨corr⟩ **Login do contador = pergunta ainda aberta ao contador** (`BE-INCR-REVIEW-LAYER-brief.md:232`), não "decidido que não" |
| Contador com acesso (portal) | Entra em N clientes, revisa, exporta | PROPOSTO — reabre "contador não é persona"; só por ADR |
| Cliente final | Agenda online, paga, recebe nota, vê pacote/saldo | PROPOSTO — portal do cliente |
