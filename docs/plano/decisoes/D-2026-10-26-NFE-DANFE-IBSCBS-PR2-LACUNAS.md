---
id: "D-2026-10-26-NFE-DANFE-IBSCBS-PR2-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas do PR-2 do NFE-DANFE-IBSCBS (folhas, teste do Chromium, código de barras com CNPJ alfanumérico) decididas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-26: \"Executa o NFE-DANFE-IBSCBS PR-2 — sessao-feature, sem merge.\" As 4 lacunas abertas pela sessão de feature foram respondidas no AskUserQuestion do mesmo dia. Decide lacunas do PR-2; não é merge"
atualizado: "2026-10-26"
---
# D-2026-10-26-NFE-DANFE-IBSCBS-PR2-LACUNAS

**Estado:** `decided`. **Contexto:** a `sessao-feature` do PR-2 (dono, chat, 2026-10-26: *"Executa o NFE-DANFE-IBSCBS PR-2 —
sessao-feature, sem merge."*) achou pontos que o BRIEF (`docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`, itens 11–16) não
decidia e perguntou antes de escrever o código de cada um. Nó: [[NFE-DANFE-IBSCBS]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| DANFE com mais de uma folha: o BRIEF não trata; o MOC (Anexo II §3.5 e §3.10.2) exige cabeçalho repetido e FOLHA n/m | "Paginação no HTML (Recomendado)" | o render distribui os itens por orçamento de altura, repete o cabeçalho e numera as folhas; a informação complementar longa continua na última folha |
| Item 16: teste com Chromium real "só onde a suíte já usa htmlToPdf", e nenhuma suíte usa | "Puppeteer falso + prova local (Recomendado)" | o teste confere a margem no `page.pdf` com puppeteer falso; a prova com Chromium real vai no corpo do PR, fora do CI |
| Item 13: chave com CNPJ alfanumérico (NT 2026.004) não cabe no CODE-128C; a NT Conjunta 2025.001 §6 manda o modelo híbrido | "Híbrido 128C/128A (Recomendado)" | `code128.ts` monta as palavras-código pelas regras da NT Conjunta e a biblioteca `bwip-js` desenha no modo `raw` |
| Item 13: a NT Conjunta se contradiz (regra 3: volta para C só com 4+ dígitos; exemplo "5225AB83" volta com 2) | "Regras numeradas (Recomendado)" | segue a regra 3; o exemplo entra no teste pelas palavras-código da NT (DV 30) |
| L-DANFE-PR2-1: com muitas duplicatas (~59+ no fixture de base) os quadros da 1ª folha não cabem em A4; o MOC deixa o quadro Fatura ser "reduzido, desde que contenha todos os dados" (§3.3.2) e reserva as folhas adicionais a itens e informações complementares (§3.5) | "Resto nas Info. Complementares (Recomendado)" | o quadro Fatura mostra as parcelas que cabem e "DEMAIS PARCELAS EM INFORMAÇÕES COMPLEMENTARES"; as demais abrem as informações complementares ("DEMAIS PARCELAS: …"), que continuam na última folha. Nenhuma parcela some; leitura do §3.3.2, não texto expresso |

## O que NÃO decide

Não é merge e não é `executa` do PR-3. A L-DANFE-PR2-1 foi perguntada a pedido do dono (chat, 2026-10-26: *"Antes do PR-3,
me pergunta a L-DANFE-PR2-1 (fatura com muitas duplicatas) com as opções e a recomendação."*). Segue `DANFE_FOLHA1_EXCEDE`
só para o que a fatura não resolve (ex.: transporte com dezenas de volumes, `vol` 0-5000).
