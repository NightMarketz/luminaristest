# ADR-PLANO-CONTAS-4-NIVEIS — Plano de contas canônico com analítica patrimonial no nível ≥ 4

- **Data:** 2026-10-13
- **Status:** **Accepted (2026-10-13).** F-L8-1..6 ratificados pelo dono no chat (questionário de 13/10), todos na
  recomendação (a). Nenhum código está autorizado sem "executa".
- **Autorização:** dono, chat, 13/10. Diante da L8 do H1, escolheu *"Aprofundar o plano canônico (Recommended)"*, com a
  descrição "ADR + BRIEF … e uma migração para os tenants já instalados". Depois pediu *"abrir o planejamento da L8"*.
- **BRIEF:** [`BE-INCR-PLANO-4-NIVEIS-brief.md`](../accounting/BE-INCR-PLANO-4-NIVEIS-brief.md)
- **Autor:** `sessao-planejamento` (agente).

## Contexto

A tentativa 2 do passo 4 do H1 (13/10, PVA ECD 10.4.1) recusou o plano canônico com 9 erros "mínimo 4 níveis" e 8
"COD_CTA_SUP não preenchido". A regra é o `REGRA_VALIDA_NIVEL_CONTAS` do Manual da ECD Leiaute 9 (jan/2026), p. 119:
analítica de natureza 01/02/03 (ativo, passivo, PL) com `NIVEL ≥ 4`. As contas de resultado ficam fora da regra.

O canônico vai de `1 Ativo` direto a `1.1.1 Banco`, sem a sintética `1.1`. O nível e a conta superior do I050 saem da
profundidade do código (`SpedGenerationService.ts:61-68`), e a hierarquia é pela chave codificada, sem `parentId`
(Contrato §2.1).

## Decisão

1. **O plano canônico ganha os grupos do art. 178 da Lei 6.404/1976** (redação da Lei 11.941/2009): Ativo Circulante e
   Passivo Circulante como sintéticas de nível 2; grupos de nível 3 (Disponível, Créditos, Estoques; Obrigações com
   Clientes, Fornecedores; Lucros ou Prejuízos Acumulados); analíticas patrimoniais no nível 4 (`x.y.z.NN`). Resultado
   (3.x/4.x) não muda.
2. **A hierarquia continua pela chave codificada** (F-L8-1 a). Os códigos analíticos são renomeados no lugar,
   preservando o `id`.
3. **Os tenants instalados migram por script de dado, antes do código novo** (F-L8-4 a). O script renomeia, cria as
   sintéticas, recompila o binding e confere Σ saldo por conta.
4. **A regra vira guarda na origem:** criar analítica patrimonial com menos de 4 segmentos, ou sem a sintética-pai, é
   400.

## Consequências

- **(+)** O H1 deixa de ter 17 dos 23 erros da tentativa 2, e o BP passa a agregar por grupo legal.
- **(−)** Os códigos que hoje são "estáveis por contrato" (`RETAINED_EARNINGS_CODE` e afins) mudam uma vez. Todo literal
  precisa sair do código de produção (guarda de varredura no BRIEF, item 2), e cerca de 60 arquivos de teste trocam
  literais por constantes.
- **(−)** Quem já tiver entregue ECD com o plano velho precisa de `IND_MUDANC_PC = 1` + I157 na próxima. Hoje ninguém
  entregou (inferido, F-L8-6).

## Alternativas consideradas

- **Hierarquia só na ECD** (o gerador inventa os níveis no I050). O dono a recusou no questionário de 13/10: o livro
  divergiria do plano da tela.
- **`parentCode` explícito, mantendo os códigos** (F-L8-1 b): muda o Contrato §2.1 e o schema.
