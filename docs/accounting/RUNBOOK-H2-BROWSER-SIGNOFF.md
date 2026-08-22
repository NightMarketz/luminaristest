# RUNBOOK: H2 — Browser sign-off final (carimbo humano + upload por clique + recibos PDF)

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> A varredura de agente de 2026-07-23 já de-riscou as telas (2 bugs achados e corrigidos, PR #151);
> o que resta é exatamente o que ela NÃO pode fazer: o olho final, o upload POR CLIQUE e o PDF.
>
> **EMENDA 2026-08-22 (mesmo PR do fold do master map).** Este runbook foi preparado **antes** do swap
> do salão (PR #211, `04582d8a`, 2026-08-21), que trocou os 5 mappers escritos à mão pelo intérprete
> de binding (`factory.ts:174` monta os mappers a partir de `SALON_BINDING_V1`). O **passo 2 é novo** e
> existe por causa disso: o golden test prova byte-identidade **em teste**, e isso não é evidência de
> runtime — sem o passo 2, o carimbo humano não cobre justamente o caminho que mudou.

Executor: [nome — humano]           Data: [____]
Autorização: decisão do dono "vamos fechar o bloco A" (2026-08-17) + fila §5.1 Bloco A item 4.
Pré-condições (verificar antes de começar):
- Build de produção dos DOIS lados, reiniciado do commit exato (servidor de dev longo serve
  código velho): `cd server && npm run build && npm start` · `cd my-app && npx next build && npx next start`.
- `dev.db` REAL em `server/prisma/prisma/dev.db`; login com a conta admin.
- Um arquivo **.ofx** e um **CNAB 240** de teste no disco do executor. Fonte pronta no repo: o
  bloco OFX de `server/src/lib/__tests__/ofx.test.ts` salvo como `extrato-teste.ofx` (o gate é o
  caminho de upload por clique, não o realismo do dado).
- **Unidade de salão operante no `dev.db`**: pelo menos um **serviço**, um **produto** (para o CMV) e
  um **pacote** vendíveis, e o período contábil do mês **OPEN** — o passo 2 ESCREVE no razão.
- Console do navegador ABERTO durante toda a sessão.

## Passos

1. Passada final pelas abas do painel de contabilidade (AP, AR, Dimensões, Conciliação,
   Contrapartes, Aprovações, DRE/BP/DFC/Comparativo, Livro Diário, Compliance, Import/Export).
   Resultado esperado: telas renderizam, console sem erro.
   EVIDÊNCIA: [screenshots das abas-chave + print do console limpo ao final]

2. **NOVO (emenda do swap) — as 5 rotinas de salão pelo intérprete de binding.** Faça cada operação
   **na tela do salão** e, para cada uma, confira o lançamento no **Livro Diário** (aba de
   contabilidade). Nenhuma é opcional — cada uma exercita um pedaço distinto do intérprete:

   | # | Operação | Evento | O que este passo prova |
   |---|---|---|---|
   | 2a | Fechar uma venda de **serviço** | `salon.sale.finalized` | slot **condicional**: a perna de Receita de Revenda (3.3) é **omitida** quando zero |
   | 2b | Fechar uma venda com **serviço + produto revendido** | `salon.sale.finalized` **+** `salon.sale.cogs` | a perna 3.3 **presente** (o par 2a/2b prova o condicional) **e** a 2ª emissão do CMV — lançamento SEPARADO (D 4.2 / C 1.1.6) que coexiste com o da receita; usa `costCents`, não `amount` |
   | 2c | Registrar o **pagamento** de uma venda | `salon.sale.settled` | resolução de conta **por sub-chave** (`paymentMethod`) — troque o meio de pagamento e repita |
   | 2d | Vender um **pacote** | `salon.package.sold` | **passivo de performance**: vender pacote **NÃO** reconhece receita — D 1.1.2 A Receber / C 2.1.1 Pacotes Pré-pagos (receita fica diferida até o consumo) |
   | 2e | **Devolver** uma venda | `salon.sale.returned` | devolução **NÃO** estorna a receita: lança contra-receita separada (D 3.2 Devoluções / C 1.1.2) e o lançamento original **continua postado** |

   Resultado esperado: **um lançamento balanceado por operação** (Σdébito = Σcrédito), com as contas
   acima; console sem erro; nenhuma operação silenciosa (venda que não gera lançamento é **FALHA**, não
   ressalva). Compare o balancete antes/depois — se um evento não aparecer no Livro Diário, pare aqui.
   EVIDÊNCIA: [para CADA linha 2a-2e: screenshot do lançamento no Livro Diário com as pernas visíveis]

3. Na aba **Conciliação**, importar o extrato **clicando** no controle de upload e escolhendo o
   `.ofx` do disco (não colar, não fetch).
   Resultado esperado: extrato listado com linhas; auto-match roda.
   EVIDÊNCIA: [screenshot do extrato importado + nome do arquivo no diálogo]

4. Repetir o passo 3 com o arquivo **CNAB 240**.
   Resultado esperado: idem.
   EVIDÊNCIA: [screenshot]

5. Em **Recibos**, gerar o PDF de um recibo (caminho puppeteer) e ABRIR o arquivo baixado.
   Resultado esperado: PDF válido, com os dados do recibo.
   EVIDÊNCIA: [o PDF anexado ou screenshot dele aberto]

6. Releitura crítica ("carimbo"): algo em qualquer tela está errado para uso real (rótulo,
   número, fluxo)? Se sim, registrar em Achados — não corrigir nada nesta sessão.
   Resultado esperado: veredicto consciente do executor.
   EVIDÊNCIA: [uma frase por tela inspecionada OU "sem ressalvas"]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum" — bug novo vai para §5.2]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 4 do master map + data]
- Assinatura do executor: ____________
