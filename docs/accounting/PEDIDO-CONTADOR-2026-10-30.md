# PEDIDO AO CONTADOR — 2026-10-30 (triagem: só o que só ele responde)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> Autorização: dono, chat, 2026-10-30: "triagem das perguntas ao contador e, se sobrar alguma, montagem do pedido — só docs,
> sem código, sem enviar nada (quem envia sou eu)"; e "Em vez de pedir a contador pesquisa e decide vc ja consegue".
> Triagem completa: [`pesquisas-legais/triagem-contador-2026-10-30/relatorio.md`](../../pesquisas-legais/triagem-contador-2026-10-30/relatorio.md)
> e [`D-2026-10-30-TRIAGEM-CONTADOR`](../plano/decisoes/D-2026-10-30-TRIAGEM-CONTADOR.md).

Das 22 perguntas abertas, a lei, a documentação oficial ou o dono responderam 21. Fica **um** item, e ele é rápido.

---

## Mensagem ao contador

Olá, [nome do contador],

Desta vez é um pedido só, rápido. O sistema já gera a **memória de cálculo do IRPJ/CSLL** (trimestral e estimativa) em
planilha, como você pediu em setembro. Antes de fecharmos o formato, queria saber se ele serve para a sua rotina.

Segue em anexo um exemplo com dados fictícios. A planilha tem uma aba só, e cada linha traz:

- ano, período (T01 a T04 no trimestral; A00 a A12 na estimativa), tributo (IRPJ ou CSLL), regime, forma de apuração e
  código de receita do DARF;
- tipo da linha: **RESUMO** (base, devido, deduções, a pagar, saldo negativo, diferença postergada) e, logo depois,
  **MEMÓRIA** (cada passo do cálculo: código, descrição, valor e de onde veio o valor — conta do razão, parâmetro legal
  ou valor informado);
- data em que a apuração foi confirmada e, se ela substituiu outra, a apuração substituída.

As perguntas:

1. Esse formato (uma linha por passo, resumo antes da memória) serve para você conferir e arquivar a apuração? Ou você
   prefere outro (uma aba por trimestre, os passos em colunas, o layout do e-Lalur/ECF)?
2. Falta alguma informação que você usaria para conferir: número da conta contábil, saldo do balancete, data do
   recolhimento?

Não precisa de documento nem de base legal: é a sua preferência de trabalho.

Obrigado!

---

## Uso interno (não vai na mensagem)

| Item | O que destrava | Critério de aceite (nosso) |
|---|---|---|
| P-C1 — forma da planilha da memória (`EXPORT_TAX_ASSESSMENT_MEMO`) | Fecha a P-C1 do [[X7]] (BRIEF X7-C §4). Se ele quiser outro formato, vira **emenda** ao BRIEF X7-C §C3 item 5 (forma da planilha), com `executa` próprio. Se aprovar, fica registrado como "confirma, nada muda" (T5) | Resposta escrita do contador, com uma de três saídas: (a) "serve como está"; (b) lista de colunas ou de abas a mudar; (c) "quero o layout X", com um exemplo. Sem uma das três, o item não fecha |

**Anexo a preparar (o dono gera antes de enviar):** um export `EXPORT_TAX_ASSESSMENT_MEMO` de um tenant de seed
(dados fictícios, sem CNPJ nem nome real — [CTD-003]), com um trimestre do Presumido e um mês de estimativa do Real.

### O que NÃO estamos pedindo (para não repetir)

- **Assinatura nas confirmações de 10/10** (III-4, III-7a, III-8, III-9, III-10 CST 02): conferidas em fonte primária em
  30/10. A lei vale mais que a assinatura. Duas ressalvas entraram no registro: na III-8, o mínimo de R$ 10 da Lei 9.430
  art. 67 é da PF (na PJ o IRRF se acumula até o DARF de R$ 10); na III-9, o trimestral antes de fechar o ano não exige ECF.
- **P-ISS-1..3, P-PT-1..3, F-RET-15, P-RET-9, P-EF-11:** respondidas pela lei ou pela documentação oficial (relatório §1).
- **A1, A2, A3 (caixa do Simples em 2026):** o produto vai ao ar só em 2027 (dono, 30/10), e o caixa acaba em 31/12/2026.
- **P-C5** (soma do ISS × livro municipal): é conferência do dono com dado real (runbook), não pergunta.
- **P-EF-7, P-EF-12:** dependem do cadastro de cada cliente e do aceite do contador **do cliente**, no onboarding.
- **XMLs de NF-e (X1)** e validação de BP/DRE/ECD/ECF: seguem no trilho próprio (H1), fora deste pedido.

**Quando a resposta chegar:** chame "triagem do que o contador mandou".
