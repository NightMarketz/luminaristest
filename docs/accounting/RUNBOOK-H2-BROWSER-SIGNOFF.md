# RUNBOOK: H2 — Browser sign-off final (carimbo humano + upload por clique + recibos PDF)

> Preparado por agente em 2026-08-17 (runbook EM BRANCO — `docs/operating-manual/RUNBOOK-FORMAT.md`).
> A varredura de agente de 2026-07-23 já de-riscou as telas (2 bugs achados e corrigidos, PR #151);
> o que resta é exatamente o que ela NÃO pode fazer: o olho final, o upload POR CLIQUE e o PDF.

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

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum" — bug novo vai para §5.2]
- Atualização do artefato de rastreio: [§5.1 Bloco A item 4 do master map + data]
- Assinatura do executor: ____________
