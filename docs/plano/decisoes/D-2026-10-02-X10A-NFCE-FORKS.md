---
id: "D-2026-10-02-X10A-NFCE-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-NFCE-1..12 + 12b do BRIEF do X10a (NFC-e 65 + NF-e 55 própria)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: \"ratifica os forks F-NFCE por questionário\" (AskUserQuestion, 3 lotes) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X10A-NFCE-FORKS — cédulas da ratificação do BRIEF do X10a

**Estado:** `decided` (F-NFCE-1..12 na 1ª rodada; o sub-fork F-NFCE-12b na 2ª rodada, mesmo dia — ver o fim desta nota)
**Autorização:** dono, chat, 02/10/2026, respostas ao AskUserQuestion. O agente apresentou cada fork com contexto e
recomendação; o dono decidiu.
**Não é "executa"** (ORCH-006): o [[X10a]] não ganha autorização de código com esta nota.

Documento dos forks: [`BE-INCR-NFCE-brief.md`](../../accounting/BE-INCR-NFCE-brief.md) §5 (texto completo e efeitos
por item na tabela "RATIFICAÇÃO — 2026-10-02").

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-NFCE-1 | Seleção do emissor por tipo de documento | (c) env por tipo + `kinds` | *"(c) env por tipo + kinds (Recommended)"* | não |
| F-NFCE-2 | Conserto do `icmsContribuinte` no Simples | (b) campo IE separado | *"(b) campo IE separado (Recommended)"* | não |
| F-NFCE-3 | Perfil fiscal do produto por unidade ou por produto | (a) por unidade | *"(b) por produto"* | **sim** |
| F-NFCE-4 | Quem numera NF-e/NFC-e; sequência com ambiente | (a) numeração local já | *"(a) numeração local já (Recommended)"* | não |
| F-NFCE-5 | Inutilização: quem detecta, quem pede | (a) sistema lista, operador pede | *"(a) sistema lista, operador pede (Recommended)"* | não |
| F-NFCE-6 | NFC-e em tempo real × gatilho manual | (a) manual, no fluxo da venda | *"(a) manual, no fluxo da venda (Recommended)"* | não |
| F-NFCE-7 | Consumidor anônimo no balcão × F-DFE-7 (b) | (a) NFC-e sem CPF permitida | *"(b) manter: sem CPF, sem nota"* | **sim** |
| F-NFCE-8 | CSC e A1 até a Focus | (a) cliente cadastra no painel | *"(a) cliente cadastra no painel (Recommended)"* | não |
| F-NFCE-9 | CC-e (55) e cancelamento por substituição (65) | (c) nenhum dos dois | *"(c) nenhum dos dois (Recommended)"* | não |
| F-NFCE-10 | Janela de cancelamento 55/65 × F-EVT-1 do X11 | (a) seguir o F-EVT-1 | *"(a) seguir o F-EVT-1 do X11 (Recommended)"* | não |
| F-NFCE-11 | Desconto no item | (a) preço líquido | *"(a) preço líquido (Recommended)"* | não |
| F-NFCE-12 | IBS/CBS na NF-e/NFC-e | (a) Simples primeiro, normal em PR próprio | *"(b) transcrever o UB agora"* | **sim** |
| F-NFCE-12b | Subgrupos do UB atendidos no regime normal | (a) base + `gRed`, resto recusado nomeado | *"(b) Todos os subgrupos"* | **sim** |

## Consequências registradas (as escolhas contra a recomendação)

- **F-NFCE-3 (b):** `ProductFiscalProfile` sem `unitId`, `@@unique([userId, productRef])`. CSOSN e CST convivem no
  perfil e a montagem escolhe pelo CRT da unidade emitente. Limite: duas unidades com regime ou UF diferentes não
  têm CSOSN/CFOP próprios para o mesmo produto.
- **F-NFCE-7 (b):** o F-DFE-7 (b) vale também para a NFC-e — sem cliente com CPF/CNPJ válido, a emissão é recusada.
  Com o CF-e-SAT vedado em SP desde 01/01/2026 (Portaria SRE 79/2024), a venda anônima de balcão fica sem documento
  fiscal pelo Luminaris; o operador precisa cadastrar o consumidor.
- **F-NFCE-12 (b):** o PR-0 transcreve o grupo UB inteiro da NT 2025.002 v1.51, e o regime normal é atendido neste
  ciclo. Abriu o **F-NFCE-12b** (quais subgrupos do UB: base + `gRed` × todos), decidido na 2ª rodada → (b).
- **F-NFCE-12b (b):** o PR-6 monta todos os subgrupos do UB (base, `gRed`, diferimento, monofásico, crédito
  presumido, ajuste de competência); nenhum `cClassTrib` válido é recusado por falta de subgrupo. Custo declarado:
  PR-0 e PR-6 maiores, e subgrupos sem uso conhecido no salão ficam exercitados só por fixture.

## Fronteira com o X11

F-NFCE-9 (c) deixa CC-e e cancelamento por substituição fora do X10a; o BRIEF do X11 (PR #466, §7) os atribuía ao
X10a. Até haver contingência no Luminaris, nenhum dos dois nós os implementa. F-NFCE-10 (a) amarra a janela de
cancelamento da NF-e/NFC-e à escolha do dono no F-EVT-1 do X11.

## 2ª rodada — 2026-10-02 (F-NFCE-12b)

Autorização: dono, chat, 02/10: *"Autorizo uma rodada de ratificação por questionário dos forks pendentes abaixo
(dono, 02/10). Só decisão: não escreva código nem BRIEF novo, não dê 'executa'."* — lote 1 de 8 da rodada conjunta
(X10a · PACOTE-VALIDADE · FE-INCR-DFE · MAPA-COBERTURA · GOV-CONTADOR). Frontmatter da nota [[X10a]] conferido
antes da pergunta: o sub-fork seguia pendente.

- **Pergunta:** quais subgrupos do grupo UB (NT 2025.002 v1.51 pp. 19–30) o regime normal atende neste ciclo.
- **Opções:** (a) base + `gRed`, com 400 nomeado para `cClassTrib` de diferimento/monofásico/crédito
  presumido/ajuste de competência (**recomendada**) · (b) todos os subgrupos.
- **Resposta literal:** *"(b) Todos os subgrupos"* → ✅ (b), **contra a recomendação**.
- **Efeito:** BRIEF itens 1 e 20, §9 (PR-0 e PR-6). O X10a fica sem fork pendente; segue sem "executa".
