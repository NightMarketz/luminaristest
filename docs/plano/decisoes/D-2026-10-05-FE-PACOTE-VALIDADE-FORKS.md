---
id: "D-2026-10-05-FE-PACOTE-VALIDADE-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Forks do FE-INCR-PACOTE-VALIDADE (F-FE-PV-1..7) e do FE-INCR-VENDA-PACOTE (F-FE-VP-1..3 + 1b), por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-05: \"Onde o aceite mora (coluna na venda ou no saldo) é fork — vai a mim por questionário\" + resposta \"Nota + BRIEF agora\" (abre o FE-INCR-VENDA-PACOTE). Sem 'executa'"
atualizado: "2026-10-05"
---
# D-2026-10-05-FE-PACOTE-VALIDADE-FORKS — forks dos dois nós FE do pacote

**Estado:** `decided` (11 cédulas; 5 contra a recomendação)
**Autorização:** dono, chat, 05/10/2026, sessão de planejamento do nó FE do PACOTE-VALIDADE (*"Onde o aceite mora
(coluna na venda ou no saldo) é fork — vai a mim por questionário"*). A abertura do 2º nó veio de uma cédula desta
rodada (*"Nota + BRIEF agora"*). **Não é "executa"** (ORCH-006).

Nós: [[FE-INCR-PACOTE-VALIDADE]], [[FE-INCR-VENDA-PACOTE]]. Origem: F-JUR-4 de
[[D-2026-10-04-PACOTE-VALIDADE-TRIAGEM-JURIDICO]].

## Cédulas — FE-INCR-PACOTE-VALIDADE

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-FE-PV-1 | O FE não vende pacote; onde a validade "na venda" aparece | variante Pacotes no wizard, neste nó | *"Nó separado antes"* | **sim** |
| F-FE-PV-2 | Onde o aceite mora | tabela própria append-only por venda | *"Tabela própria (Recommended)"* | não |
| F-FE-PV-3 | Quem aceita e como | checkbox do operador + assinatura no comprovante | *"Checkbox + assinatura (Recommended)"* | não |
| F-FE-PV-4 | Fonte do texto e da data | prévia no BE + hash | *"Prévia no BE + hash (Recommended)"* | não |
| F-FE-PV-5 | Qual é o comprovante | página imprimível | *"pdf imprimível"* (texto livre) | **sim** |
| F-FE-PV-6 | Venda de pacote sem aceite | trava no FE + selo | *"Trava no FE + selo (Recommended)"* | não |
| F-FE-PV-7 | Texto v1 | texto proposto | *"Texto proposto (Recommended)"* | não |
| — | Abrir o nó da venda agora? | só a nota | *"Nota + BRIEF agora"* | sim (mais que a recomendação) |

**Erro do agente na cédula F-FE-PV-5:** a opção "PDF no servidor" foi descrita como "dependência nova". É falso: o
`puppeteer` e o pipeline `lib/receiptHtml.ts` → `lib/pdf.ts` já existem (comprovante de lançamento). O dono escolheu
PDF mesmo com o custo inflado; a correção não muda o sentido. A resposta foi lida como "PDF que se imprime" (BRIEF
§5.1); se a intenção foi outra, é emenda.

## Cédulas — FE-INCR-VENDA-PACOTE

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-FE-VP-1 | Preço do pacote na venda | do catálogo, travado | *"Catalogo, editável pq é possivel vender mais caro que o catalogado, mas desconto obrigatoriamente marcado como desconto, quem vende acima do catalogado tbm tem tag de venda acima"* | **sim** |
| F-FE-VP-1b | Como a marca "acima do catálogo" se sustenta | snapshot do preço no item | *"Flag na venda"* | sim |
| F-FE-VP-2 | Pagar venda de pacote com saldo de outro pacote | 1ª: esconder. 2ª (reformulada): bloquear na tela + servidor | 1ª: *"Não faz sentido, preciso de mais informações"*. 2ª: *"Permitir a troca"* | **sim** |
| F-FE-VP-3 | Quantidade | fixa em 1 | *"Permitir N"* | **sim** |

A 1ª cédula do F-FE-VP-2 não dava o efeito concreto. A 2ª deu: o servidor já aceita o pagamento
(`RegisterPaymentService.ts:65-117` não olha o tipo da venda), e o saldo A que ia vencer vira saldo B com prazo novo.

## Consequências

- **Ordem dos nós:** FE-INCR-VENDA-PACOTE → FE-INCR-PACOTE-VALIDADE. O deploy do PACOTE-VALIDADE espera os dois
  (F-JUR-4) + [[M2]]. O #483 (com o delta) entrou em `main` em 04/10 (`2d1ddbe5`).
- **BE dentro do nó FE da validade:** tabela `PackageValidityAcceptance`, 3 rotas de aceite e a rota do PDF
  (BRIEF FE-INCR-PACOTE-VALIDADE §3 PR-1).
- **Preset de vendas ganha `aboveCatalogPrice`** (F-FE-VP-1b). Se o schema é copiado na criação da tabela, as tabelas
  existentes precisam de atualização (insumo I3 do BRIEF da venda).
- **Troca de pacote permitida (F-FE-VP-2):** risco aceito, receita por não uso evitável por quem troca. Vira
  **PE-VP-1** ao contador. O texto v1 (F-FE-PV-7) não fala da troca; se o contador ou o jurídico pedirem, é emenda.
- **Regras só de tela:** "abaixo do catálogo só por desconto", a marca acima do catálogo e a trava do aceite valem no
  wizard; pela tabela genérica ou pela API, não. Registrado nos dois BRIEFs (§8).
- **PE-FE-1..3** (jurídico, sobre a forma do texto, "corpo 12" na tela e a suficiência do aceite) não travam nada sem
  decisão do dono.
