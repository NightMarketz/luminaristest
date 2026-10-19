---
id: "D-2026-10-15-CAMINHO-A-CAMADA-CONTABIL"
tipo: "decisao"
dominio: "plataforma"
titulo: "Posicionamento: Luminaris como camada contábil ao lado do sistema de salão (caminho a), não recepção própria"
estado: "decided"
estado_detalhe: "Revogada inteira por D-2026-10-19-LANDING-RECADO-GERAL (dono, chat, 2026-10-19)"
autorizacao: "dono, chat, 2026-10-15: \"Caminho (a): Luminaris como camada contábil ao lado do sistema de salão. Ajusta o texto da lista de espera para isso e inclui a pergunta 'que sistema você usa hoje / usaria junto?'\" — decide o posicionamento e o texto da lista; não cria nó nem autoriza BRIEF/código"
atualizado: "2026-10-19"
---
# D-2026-10-15-CAMINHO-A-CAMADA-CONTABIL — camada contábil ao lado do sistema do salão

**Estado:** `decided`. **Revogada inteira** por [[D-2026-10-19-LANDING-RECADO-GERAL]] (dono, chat, 19/10/2026).
**Autorização:** dono, chat, 15/10/2026 (citação no frontmatter).

## Contexto
O comparativo de mercado ([`docs/mercado/COMPARATIVO-2026-10.md`](../../mercado/COMPARATIVO-2026-10.md), §5.2 item 2)
mostrou que a régua (54/63) mede só a frente onde o Luminaris já lidera (razão, ECD/ECF, binding da venda), e que a
distância para Trinks/Avec/Belasis está toda fora dela: agendamento online, lembrete por WhatsApp, app do profissional
(B1–B3). Dois caminhos:
- **(a)** camada contábil ao lado do sistema de salão que o cliente já usa (recomendado como primeiro teste);
- **(b)** recepção própria (nós novos para B1–B3).

## Decisão
✅ **(a).** O Luminaris se apresenta como a contabilidade do salão, montada a partir do que ele já registra, e não
como sistema de gestão de salão. Texto e formulário da lista de espera em
[`docs/mercado/LISTA-DE-ESPERA-2026-10.md`](../../mercado/LISTA-DE-ESPERA-2026-10.md), com a pergunta "Que sistema
você usa hoje? / Usaria o Luminaris junto com ele?".

## Consequências
- **H1 → H2 → M2 não muda de ordem.** O caminho (a) apoia-se em F1–F3 do comparativo, que só viram fato com o PVA
  assinado (H1) e a venda conferida no razão (H2).
- **Lacuna aberta, sem nó:** importar as vendas do sistema do salão (primeiro candidato: a exportação de lançamentos
  financeiros da Trinks, formato ainda não lido). Hoje o Luminaris importa plano de contas, saldos de abertura e
  lançamentos por planilha (`IMPORT_KINDS` em `server/src/features/accounting/models/DataExchange.model.ts`), NF-e de
  compra por XML e extrato OFX/CNAB, mas não vendas de outro sistema. Criar o nó e planejar o BRIEF exige autorização
  própria do dono.
- **Caminho (b) não é descartado:** as respostas da pergunta "usaria junto?" dizem se ele precisa ser reaberto.
