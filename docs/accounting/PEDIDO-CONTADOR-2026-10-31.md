# PEDIDO AO CONTADOR — 2026-10-31 (reconferência da triagem de 30/10: continua só a P-C1)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> Autorização: dono, chat, 2026-10-31: "Monte o pedido em linguagem de contador, com critério de aceite por item, num
> arquivo que eu possa copiar. Você NUNCA envia — eu envio."
> Base: triagem de 30/10 no PR #994 ([`PEDIDO-CONTADOR-2026-10-30.md`](PEDIDO-CONTADOR-2026-10-30.md),
> [`D-2026-10-30-TRIAGEM-CONTADOR`](../plano/decisoes/D-2026-10-30-TRIAGEM-CONTADOR.md)), **ainda não mergeado em 31/10**.
> Este arquivo não substitui o de 30/10: a mensagem é a mesma. Ele só registra a reconferência de 31/10 e acrescenta o PE-6
> ao bloco "o que não estamos pedindo". Se o #994 entrar primeiro, os dois convivem.

## Triagem de 31/10 (os 5 itens que o dono listou)

| Item | Nó | Quem responde | Por quê | Grau |
|---|---|---|---|---|
| **P-C1** — forma da planilha da memória de cálculo | [[X7]] (X7 → X9) | **contador de fato** | É a preferência de trabalho dele: só ele diz se a planilha serve para conferir e arquivar | — |
| P-C5 — soma do ISS × livro municipal | [[X7]] | **dono** (runbook com dado real) | É conferência na tela com o livro do município, não pergunta (BRIEF X7-C §P-C5) | verificado (triagem 30/10 §1 linha 7) |
| P-ISS-1..3 — transição ISS → IBS | [[ISS-TRANSICAO-IBS]] PR-2 | **a lei** | ADCT art. 128 caput e § 3º; LC 214 arts. 10 §§ 3º–4º e 408 §§ 4º–5º (Planalto compilado, 30/10) | verificado |
| F-RET-15 — dedução do ISS retido | [[RETENCOES-FONTE]] PR-3/PR-4 | **a lei + o dono** | Natureza: DL 1.598 art. 12 § 1º III; momento: Lei 6.404 art. 177 (competência). O dono decidiu em 30/10: lançar na emissão da NFS-e com ISS retido | verificado + decisão do dono |
| PE-6 — validade do pacote pré-pago | [[PACOTE-VALIDADE]] | **jurídico, já fechado** | Não é do contador. A resposta do jurídico foi triada em 04/10 e o dono fechou o PE-6 (F-JUR-0, [`D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO`](../plano/decisoes/D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO.md)). Sobra o PE-FE-1..3 (a forma do texto), do jurídico, que não trava nada | decisão do dono |

Delegação D-1 de 10/10 ([`D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO`](../plano/decisoes/D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO.md)):
não precisou ser usada em nenhum dos cinco; a lei ou uma decisão já existente responde.

**Resultado:** vai ao contador **só a P-C1**.

---

## Mensagem ao contador (copiar daqui)

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
| P-C1 — forma da planilha (`EXPORT_TAX_ASSESSMENT_MEMO`) | Fecha a P-C1 do [[X7]] (BRIEF X7-C §4) e libera o X9. Outro formato → **emenda** ao BRIEF X7-C §C3 item 5, com `executa` próprio. Aprovado → registro "confirma, nada muda" (T5) | Resposta escrita com uma de três saídas: (a) "serve como está"; (b) lista de colunas ou abas a mudar; (c) "quero o layout X", com um exemplo. Sem uma das três, o item não fecha |

**Anexo (o dono gera antes de enviar):** um export `EXPORT_TAX_ASSESSMENT_MEMO` de um tenant de seed, com dados fictícios,
sem CNPJ nem nome real ([CTD-003]), com um trimestre do Presumido e um mês de estimativa do Real.

### O que NÃO estamos pedindo (para não repetir)

- Tudo o que a triagem de 30/10 já tirou ([`PEDIDO-CONTADOR-2026-10-30.md`](PEDIDO-CONTADOR-2026-10-30.md), mesmo bloco):
  assinatura nas confirmações de 10/10, P-ISS-1..3, P-PT-1..3, F-RET-15, P-RET-9, P-EF-11, A1–A3, P-C5, P-EF-7, P-EF-12,
  XMLs do X1 e a validação de BP/DRE/ECD/ECF (H1).
- **Novo em 31/10:** **PE-6** (validade do pacote pré-pago) e **PE-FE-1..3** (forma do texto da validade). São do jurídico,
  não do contador. O PE-6 já foi fechado pelo dono em 04/10; o pedido do PE-FE ao jurídico
  ([`PEDIDO-JURIDICO-2026-10-05-PACOTE-VALIDADE-FE.md`](PEDIDO-JURIDICO-2026-10-05-PACOTE-VALIDADE-FE.md)) está pronto, o
  dono envia se quiser, e não trava nada.

**Quando a resposta chegar:** cole aqui e chame "triagem do que o contador mandou". Cada resposta vira artefato checável
(emenda de BRIEF ou registro "confirma"), nunca sign-off ([CTD-002]).
