# RUNBOOK: H2 — Browser sign-off final (carimbo humano + upload por clique + recibos PDF)

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> A varredura de agente de 2026-07-23 já de-riscou as telas (2 bugs achados e corrigidos, PR #151);
> o que resta é exatamente o que ela NÃO pode fazer: o olho final, o upload POR CLIQUE e o PDF.

> **EMENDA (agente, 2026-08-22) — fluxo de salão pós-swap ainda não coberto.** Em 2026-08-21
> (commit `04582d8a`, PR #211, "prensa de binding") `server/src/lib/factory.ts` passou a montar os
> 5 mappers do salão via `buildSalonAccountingMappers()` — que interpreta `SALON_BINDING_V1`
> (`server/src/features/accountingBinding/fixtures/salonBinding.ts`) através do intérprete
> genérico (`InterpretedEventMapper` + `archetypeCatalog`), em vez de instanciar as 5 classes
> `Salon*Mapper.ts` escritas à mão. O golden test (`__tests__/archetypes` / Corpo D) prova que o
> intérprete produz `PostEntryInput` byte-idêntico aos mappers antigos — **mas só EM TESTE**,
> contra fixtures em memória. Ninguém exercitou o intérprete novo com o app de pé: os passos 1–5
> abaixo (preparados em 2026-08-17, antes do swap) passam pelas telas de contabilidade mas **não
> fecham nenhuma venda de salão** — nenhum deles bate no caminho de runtime que mudou em
> `04582d8a`. Os passos 6–11 abaixo emendam essa lacuna, evento a evento, clicando na tela do
> salão (não no painel de contabilidade) e conferindo o lançamento resultante na aba de
> contabilidade. O passo 11 é o carimbo crítico do swap e por isso fica por último, depois da
> releitura geral do passo 5.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17) + fila §5.1 Bloco A item 4.
Pré-condições (verificar antes de começar):
- Build de produção dos DOIS lados, reiniciado do commit exato (servidor de dev longo serve
  código velho): `cd server && npm run build && npm start` · `cd my-app && npx next build && npx next start`.
- `dev.db` REAL em `server/prisma/prisma/dev.db`; login com a conta admin.
- Um arquivo **.ofx** e um **CNAB 240** de teste no disco do executor. Fonte pronta no repo: o
  bloco OFX de `server/src/lib/__tests__/ofx.test.ts` salvo como `extrato-teste.ofx` (o gate é o
  caminho de upload por clique, não o realismo do dado).
- Console do navegador ABERTO durante toda a sessão.
- **[EMENDA 2026-08-22]** Uma unidade/tenant de **Salão de Beleza** (`sectorKey: 'beautySalon'`,
  preset `server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts`) com dados que
  permitam fechar: venda só de serviço, venda com produto de estoque (para a CMV disparar via
  `InventoryService.recordSaleCogs`), pagamento em pelo menos 3 meios diferentes (Dinheiro/Pix e
  Cartão, para exercitar o resolvedor por sub-chave), devolução e venda de pacote. **Verificado
  nesta emenda: não existe seed para isso** — `server/prisma/seed.ts` e `server/seed-units.ts` não
  citam `salon`/`beautySalon` nenhuma vez. **Criar essa unidade e os dados (produto com estoque,
  pacote, cliente) pela própria UI (onboarding/interview → preset Salão de Beleza) faz parte dos
  passos 6–11 abaixo, não é pré-condição já satisfeita** — registrar como sub-passo do primeiro
  evento tocado.

## Passos

1. Passada final pelas abas do painel de contabilidade (AP, AR, Dimensões, Conciliação,
   Contrapartes, Aprovações, DRE/BP/DFC/Comparativo, Livro Diário, Compliance, Import/Export).
   Resultado esperado: telas renderizam, console sem erro.
   EVIDÊNCIA: [screenshots das abas-chave + print do console limpo ao final]

2. Na aba **Conciliação**, importar o extrato **clicando** no controle de upload e escolhendo o
   `.ofx` do disco (não colar, não fetch).
   Resultado esperado: extrato listado com linhas; auto-match roda.
   EVIDÊNCIA: [screenshot do extrato importado + nome do arquivo no diálogo]

3. Repetir o passo 2 com o arquivo **CNAB 240**.
   Resultado esperado: idem.
   EVIDÊNCIA: [screenshot]

4. Em **Recibos**, gerar o PDF de um recibo (caminho puppeteer) e ABRIR o arquivo baixado.
   Resultado esperado: PDF válido, com os dados do recibo.
   EVIDÊNCIA: [o PDF anexado ou screenshot dele aberto]

5. Releitura crítica ("carimbo"): algo em qualquer tela está errado para uso real (rótulo,
   número, fluxo)? Se sim, registrar em Achados — não corrigir nada nesta sessão.
   Resultado esperado: veredicto consciente do executor.
   EVIDÊNCIA: [uma frase por tela inspecionada OU "sem ressalvas"]

---

### [EMENDA 2026-08-22] Passos 6–11 — fluxo de salão pós-swap (intérprete `SALON_BINDING_V1`, `04582d8a`/PR #211)

> Cada passo abaixo é uma ação na **tela do salão** (não no painel de contabilidade); o resultado
> se confere DEPOIS, na aba **Livro Diário**/lançamento do painel de contabilidade. Se a unidade de
> salão (pré-condição acima) ainda não existir, criá-la é parte do passo 6.

6. Na tela do salão, criar (se preciso) a unidade Salão de Beleza e fechar uma **venda só de
   serviço** (sem item de produto/estoque) — evento `salon.sale.finalized`.
   Resultado esperado: no Livro Diário, lançamento novo com D **1.1.2 A Receber** = valor da venda
   e C **3.1 Receita de Serviços** = mesmo valor. **Caso de borda:** a linha de C **3.3 Receita de
   Revenda NÃO deve aparecer** (base do split é zero para venda sem produto — `revenueSplit.ts`,
   `receita-revenda` é `optional: true` no arquétipo).
   EVIDÊNCIA: [print da tela de fechamento da venda + print do lançamento no Livro Diário/aba
   Lançamento mostrando as 2 linhas (e a ausência da 3ª)]

7. Vender um **pacote pré-pago** — evento `salon.package.sold`.
   Resultado esperado: lançamento com D **1.1.2 A Receber** = valor do pacote e C **2.1.1 Pacotes
   Pré-pagos** (passivo, não receita — a venda do pacote NÃO reconhece receita agora, só cria
   passivo diferido).
   EVIDÊNCIA: [print da tela de venda de pacote + print do lançamento]

8. Fechar uma **venda com item de produto de estoque** — evento `salon.sale.finalized` (com
   `revenueByNature` não-zero) seguido do evento automático `salon.sale.cogs` (disparado pelo
   `InventoryService.recordSaleCogs` na baixa de estoque, mesma tela).
   Resultado esperado: DOIS lançamentos. (a) finalized: D 1.1.2 A Receber = total; C 3.1 Receita de
   Serviços + C **3.3 Receita de Revenda** (agora presente, valor = parte de produto do split). (b)
   cogs: D **4.2 CMV** = custo do produto (em centavos, sem arredondamento de reais) e C **1.1.6
   Estoques** = mesmo valor — confira que o valor da CMV bate com o custo cadastrado do produto,
   não com o preço de venda.
   EVIDÊNCIA: [print da tela + prints dos DOIS lançamentos no Livro Diário]

9. Fazer a **devolução** de uma das vendas acima — evento `salon.sale.returned`.
   Resultado esperado: lançamento NOVO e separado (não é estorno/`reversedById` do lançamento
   original — o original de `salon.sale.finalized` continua `Posted`, intocado) com D **3.2
   Devoluções de Vendas** (contra-receita) e C **1.1.2 A Receber**.
   EVIDÊNCIA: [print da devolução na tela + print do lançamento novo + confirmação de que o
   lançamento original da venda continua com status Posted, não alterado]

10. Registrar **pagamento** (liquidação) para pelo menos 3 vendas em aberto, uma por meio de
    pagamento diferente: **Dinheiro**, **Pix ou Cartão**, e (se houver saldo de pacote disponível)
    **Package Balance** — evento `salon.sale.settled`. Este é o passo mais frágil do intérprete: a
    conta de débito é resolvida por SUB-CHAVE (`paymentMethod`), não por uma conta fixa.
    Resultado esperado, um lançamento por meio: C **1.1.2 A Receber** sempre; D varia por método —
    Dinheiro → **1.1.3 Caixa**; Pix → **1.1.1 Banco**; Cartão (Débito/Crédito) → **1.1.4 A Receber
    Cartão/Adquirente**; **Package Balance → 2.1.1 Pacotes Pré-pagos, NUNCA uma conta de
    caixa/banco** (guard `packageBalanceNeverCash`) — confira este último com atenção, é o caso que
    mais quebra se o mapeamento por sub-chave regredir.
    EVIDÊNCIA: [print de cada liquidação na tela + print do lançamento correspondente no Livro
    Diário, um par tela/lançamento por meio de pagamento testado]

11. Reconciliação final: revisar o console do navegador acumulado desde o passo 6 (nenhum erro) e
    conferir que os pares débito/conta de cada lançamento gerado nos passos 6–10 batem
    linha-a-linha com o que o golden test do intérprete afirma — rodar localmente
    `cd server && npx jest src/features/accountingBinding/__tests__/goldenPhase1.test.ts` (o par
    `goldenPhase0.test.ts` é o corpus congelado; `goldenPhase1.test.ts` é quem compara
    `InterpretedEventMapper` byte a byte contra os 5 mappers à mão, os mesmos 17 casos) e colar a
    saída.
    Resultado esperado: console limpo E o `goldenPhase1.test.ts` verde (paridade byte-idêntica
    confirmada).
    EVIDÊNCIA: [print do console final (sem erros) + saída do comando jest acima (verde) +
    confirmação linha-a-linha dos lançamentos dos passos 6–10, ou divergência registrada em
    Achados]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum" — bug novo vai para §5.2]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 4 do master map + data — cobre AMBOS:
  o browser sign-off original (passos 1–5) E, desde a emenda 2026-08-22, o fluxo de salão
  pós-swap do binding (passos 6–11, intérprete `SALON_BINDING_V1`/`04582d8a`/PR #211)]
- Assinatura do executor: ____________
