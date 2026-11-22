---
id: "D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR"
tipo: "decisao"
dominio: "fiscal"
titulo: "R5 reaberta: planejar a entrega à Receita pela API Integra Contador (Serpro); contratação segue com o dono"
estado: "decided"
autorizacao: "dono, 2026-11-21, questionário — à pergunta \"Fork R5: a integração com a Receita pela API Integra Contador (Serpro) está adiada… Reabrir para planejar a entrega automática?\", a resposta \"Reabrir e planejar\"; chat do mesmo dia: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\". Não é 'executa' de código, não contrata nada, não ratifica fork"
atualizado: "2026-11-21"
---
# D-2026-11-21-R5-REABERTA-INTEGRA-CONTADOR

**Estado:** `decided`. **Autorização:** dono, 21/11/2026 (citação no frontmatter). A sessão que mediu o gap fiscal
levou a pergunta ao questionário e repassou a resposta ao cartão desta sessão, que o dono confirmou ao iniciá-lo.
**Não é `executa`** (ORCH-006), não contrata e não autoriza merge.

## Decisão

1. A [[R5]] (*"adiar até X7 destravar — sem desenho de adaptador agora"*, cédula #319 de 14/09) é **reaberta para
   planejamento**. Nasce o nó [[INTEGRA-CONTADOR]].
2. **A contratação segue com o dono.** Quem contrata, quem paga e onde mora o e-CNPJ são forks do PRE-ADR (F-IC-1,
   F-IC-2), não decisão desta nota.
3. Continuam em vigor e limitam o desenho: [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] (sem contratação; serviço só
   BYOK) e [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] item 3 (sem guarda do certificado do cliente).

## Efeitos

- PRE-ADR, BRIEF e dossiê: ver a nota do [[INTEGRA-CONTADOR]].
- A R5 de 14/09 fica como histórico. O corpo dela não é reescrito; a nota ganha só o apontador para esta decisão.

## Ratificação dos forks F-IC-1..8 (dono, questionário nesta sessão, 21–22/11/2026)

Três rodadas de `AskUserQuestion`, cada pergunta com o contexto do fato e da decisão anterior que ela toca. Respostas
literais:

| Fork | Pergunta (resumo) | Resposta literal do dono | Recomendação | Resultado |
|---|---|---|---|---|
| F-IC-1 | Quem contrata o Serpro? | 1ª rodada: *"Tem opção grátis?"*. 2ª: *"Pesquise outras soluções grátis se não houver, byok"*. 3ª, depois da pesquisa (não há API oficial gratuita; o Conecta gov.br é só de órgão público; o robô no portal esbarra em CAPTCHA): *"BYOK + contador já"* | (a) cada cliente | **(a) + (b) na 1ª fase:** a PJ contrata, ou o escritório que já tem contrato atua como procurador |
| F-IC-2 | Onde fica o e-CNPJ do contratante? | *"Arquivo A1 no servidor"*; alcance: *"Todos os usos"* | (a) assinador local | **(b), contra a recomendação.** Reverte o item 3 de [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] para NF-e, NFC-e e NFS-e também ([[D-2026-11-22-GUARDA-A1-TODOS-OS-USOS]]) |
| Parecer da guarda (L-ADN-5) | A produção espera o parecer? | *"Produção espera (Recomendado)"* | idem | gate RB-IC-0 |
| F-IC-3 | Quem aperta "transmitir"? | *"Humano + chave (Recomendado)"* | (c) | (c) |
| F-IC-4 | Ordem dos PRs | *"Simples primeiro (Recomendado)"* | (a) | (a) |
| F-IC-5 | Encerrar o MIT pela API? | *"Só com atestado (Recomendado)"* | (a) | (a) |
| F-IC-6 | Divergência do Simples com a Receita | *"Bloqueia; saída com motivo (Recomendado)"* | (a) | (a) |
| F-IC-7 | Como provar antes da 1ª chamada real | *"Fake + trial + runbook (Recomendado)"* | (a) | (a) |
| F-IC-8 | DEFIS e DASN-SIMEI | *"Entram no PR do Simples"* | (a) fora | **(b), contra a recomendação** |

**Ainda não é `executa`.** O código de qualquer PR do BRIEF exige autorização própria do dono (ORCH-006). Pela
`D-2026-10-28-FLUXO-AUTONOMO`, um "executa" do BRIEF vale para PR-0..PR-6.
