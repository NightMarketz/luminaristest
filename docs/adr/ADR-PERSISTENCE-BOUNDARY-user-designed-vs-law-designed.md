# ADR-PERSISTENCE-BOUNDARY — O que vive em DynamicTable e o que vive em Prisma first-class, e por quê

- **Data:** 2026-10-14
- **Status:** **Accepted 2026-10-14 (dono, chat)** — "não é um problema, só precisa documentar certo a arquitetura e fazer dessa forma".
- **Classe:** DECISÃO ARQUITETURAL (fronteira de persistência)
- **Supersede parcialmente:** o critério "em caso de dúvida, Prisma first-class" do Contrato §2.1 (emendado neste mesmo PR).
- **Depende de:** `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1–§2.3; `ADR-DOMAIN-MOTOR-rejected.md`; `ADR-ARCH-BOUNDARIES.md` (regra B1).
- **Relacionados:** `ADR-INCR-INVENTORY-stock-subledger.md` (recorte por campo), `ADR-INCR-COUNTERPARTY-first-class.md` (promoção de ref), `ADR-C01-salon-sales-accounting-bridge.md` (costura).

## TLDR (2 linhas)

A tese de produto é **um segundo banco por usuário, configurado em DynamicTable**, e ela continua válida para tudo o que o usuário desenha. A única exceção é o **núcleo que a lei desenha igual para todos** (razão, períodos, apuração, SPED, documento fiscal): esse vive em Prisma, não por desempenho, mas porque precisa de escrita atômica multi-tabela, agregação em volume e imutabilidade por construção, e nada disso vem de graça no motor. O preço aceito é legibilidade: dois mundos para revisar, com a diferença concentrada na costura.

## 1. Contexto: o que foi decidido e quando

- A tese original (pré-contabilidade) era **sem exceção**: todas as tabelas do usuário em DynamicTable, com pastas, camadas e comunicação entre tabelas num padrão único.
- A primeira exceção entrou em **2026-06-17** (`f5aa501a`, `Opportunity` first-class no CRM) e a segunda, inteira, em **2026-06-23** (`5b1f082d`, módulo contábil de partidas dobradas em Prisma). O plano anterior de fazer contabilidade no motor furou **no planejamento**, pelos limites listados no Contrato §2.2 — limites do motor como está, não do SQLite.
- Desde então, ~35 modelos contábeis e fiscais, 78 serviços, 47 deles com transação multi-passo, 29 pontos de agregação no repositório e 263 arquivos de teste (medidos em 14/10/2026). Foi por recorte, não por migração: o preset continuou como superfície de entrada e só o subconjunto de campos com invariante subiu (estoque valorado, contraparte, atributos fiscais de produto e serviço).

## 2. Decisão

### 2.1 Dois critérios, não um

| Pergunta | Resposta |
|---|---|
| **O usuário desenha o esquema?** (catálogo, agenda, venda, pipeline, formulários, campos próprios) | **DynamicTable.** Tese de produto; sem exceção dentro desse conjunto. |
| **A lei desenha o esquema, igual para todos, e a escrita precisa de pelo menos um destes:** atômica em várias tabelas com gate na transação · agregação em volume por conta/período/dimensão · imutabilidade por construção (sem rota de update) · regra legal codificada com tipo em compilação | **Prisma first-class.** Razão, períodos, numeração, apuração, LALUR, SPED (ECD/ECF), documento fiscal, cadeia de auditoria. |

"Consistência obrigatória" **sozinha não decide**: o motor pode e deve entregar consistência (§3). O que decide é o segundo critério inteiro.

### 2.2 Faixa operacional-financeira (AP/AR, contraparte, estoque)

Hoje em Prisma. É a faixa onde o usuário tem motivo real para campos próprios (aprovador, centro de custo interno) e onde as telas viriam de graça pelas lentes do GenericTable. **Candidata declarada a voltar para DynamicTable depois que o motor cumprir §3** — decisão futura, com BRIEF e estimativa por módulo, nunca durante incremento de outro assunto. Até lá, permanece em Prisma e a ponte para o razão continua sendo `postEntry(sourceType, sourceId)`.

### 2.3 Por que não é "desempenho"

Decisão de estrutura, não de otimização. O que a lei desenha não varia por usuário, então o único mecanismo de valor do DynamicTable (esquema variável em runtime) não é usado ali; e o que esse núcleo exige (transação multi-tabela com gate, CAS sobre coluna real, agregação indexada, ausência de rota de edição) exigiria do motor exatamente a primitiva transacional cross-tabela que `ADR-DOMAIN-MOTOR-rejected.md` rejeitou. Colocar o razão no motor não é endurecer o motor; é construir outro.

## 3. O que o motor DynamicTable deve passar a garantir (dívida nomeada)

Vale para o que já é DynamicTable (venda e CRM carregam dinheiro) e é pré-condição da §2.2. Cinco itens, todos no serviço, nunca na UI:

| # | Garantia | Estado em 14/10 (verificado) |
|---|---|---|
| G1 | Coluna travada bloqueia no serviço | `readOnly` é só UI (`DynamicTable.model.ts:47`); `immutableAfter`/`lifecycle` só no update |
| G2 | `deleteTableData` respeita `immutableAfter`/`lifecycle`/`deleteConstraints` | ignora os dois primeiros (Contrato `[AC-2.2-4]`) |
| G3 | `isSystem` passa por policy, não dribla guards | dribla os 3 guards e o `noOverlap` |
| G4 | `unique`/`compositeUnique` com lock + re-check **dentro** da tx | só `noOverlap` tem (`93945426`); GAP-MAP Nível 4 |
| G5 | Dinheiro = centavos inteiros imposto pelo esquema | convenção do caller (`numberFormat:'integer'`) |

Opção técnica a avaliar junto com G4: índice único parcial do SQLite sobre `json_extract(data,'$.campo') WHERE dynamicTableId = ?`, criado por DDL fora do Prisma (inferido da capacidade do SQLite; não testado no repo).

## 4. A costura é o único lugar onde os dois mundos se encontram

- Forma fixa: pós-commit do motor → `postEntry(sourceType, sourceId)` idempotente por `@@unique` → `reconcile*()` read-first. Nunca dentro de `DynamicTableService`/`RuleContext`/`RulePlugin` (`[AC-2.1-B1]`, `[AC-2.1-B4]`; gate `check:arch` regra B1, baseline 0).
- **Terceiro tipo de referência, nomeado:** `*Ref String` (ex.: `InventoryItem.productRef`, ex-`Payable.supplierRef`) aponta de Prisma para uma linha DynamicTable **sem FK**. Regra: todo `*Ref` declara no comentário do schema qual preset referencia e qual guarda impede órfão (`deleteConstraints` no preset ou verificação no read). `*Ref` sem guarda declarada é dívida, não padrão.
- Custo aceito: o revisor usa a régua de camadas igual nos dois mundos até o repositório; a lupa vai só na costura e nos `*Ref`.

## 5. Hipóteses abertas a falsificar (sessão de instrumentação, sem código de aplicação)

1. Venda `Finalized` é imutável nos três caminhos (update, delete, `isSystem`)? Previsão: delete passa (G2).
2. Delete de produto com `StockMovement` vivo deixa órfão? Previsão: sim (sem `deleteConstraints`).
3. Ponte float→centavos fecha com `unitPrice` 0.1 e 0.2 × 3? Previsão: fecha no razão; display do preset pode somar em float.

## 6. Mudar esta fronteira

Mover módulo entre os mundos, promover `*Ref` a FK, ou executar a §2.2 = ADR novo ou emenda datada aqui, com os números da §1 antes/depois.
