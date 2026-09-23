---
tipo: "destino"
secao_sdd: "§7"
titulo: "Camada de IA agêntica"
---
# §7 Camada de IA agêntica

Padrão de mercado 2026: agente propõe, humano aprova. No Luminaris esse padrão já existe (`ActionProposal`) e vira
regra dura para dinheiro.

| Agente | Faz | Limite | Estado |
|---|---|---|---|
| Gerador | Entrevista, escolhe preset, propõe binding | Validador determinístico aprova antes de ativar | ⟨corr⟩ **DECIDIDO** (binding + validador, `ADR-P1-binding-press.md`); **"compõe módulos" = I8, em fila** |
| Assistente ERP | Responde sobre dados e documentos, propõe ações | Ação só com confirmação | DECIDIDO (`ActionProposalRepository`) |
| Vendas | Detecta negócio parado, pesquisa, redige sequência | Envio só aprovado; opt-in LGPD | PROPOSTO |
| Cobrança | Prioriza inadimplência, gera Pix/boleto, negocia dentro de alçada | Desconto acima da alçada vai ao dono | PROPOSTO |
| Conciliação | Casa extrato × título × adquirente, sugere lançamento | Nunca posta: propõe item pendente | PROPOSTO |
| Fiscal | Sugere classificação tributária, aponta nota inconsistente | Regra vem da tabela versionada, não do modelo | PROPOSTO |
| Atendimento | Responde com base de conhecimento, agenda | Escala para humano; não altera preço | PROPOSTO |
| Contador-assistente | Checklist de fechamento, explica variação do DRE | Não fecha período | PROPOSTO |

**Invariante:** nenhum agente escreve no razão, emite nota ou move dinheiro sem um evento confirmado por humano que o
binding traduz. IA sugere; humano contabiliza.
