---
id: "D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO"
tipo: "decisao"
dominio: "gate"
titulo: "NFS-e do 1º cliente pelo portal a partir de 01/11/2026, emissão automática só com o PAA do governo (sem guarda de certificado); fechamento de ECD/ECF do H1 vai para o último passo, perto de fechar o 1º cliente"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22, questionário (AskUserQuestion): D5 → \"Portal, depois o governo (Recomendado)\"; H1 × M2 → \"Só vamos fechar ecf e ecd perto de fechar o primeiro cliente, entao agora nao, faz tudo envolta disso e deixa a confirmação por ultimo do ultimo\"; depois: \"Grava as duas decisões no vault (cédula + fold no D5, X10i, H1, H2 e na FILA-ORDEM) num PR de docs, sem merge.\" — decide caminho e ordem; não é 'executa' de nada nem autoriza merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO

**Estado:** `decided`. **Autorização:** dono, chat, 22/10/2026, questionário (citação no frontmatter).
**Não é `executa`** (ORCH-006) e não autoriza merge.

## 1. D5 — caminho da NFS-e

### Contexto apresentado ao dono

- A Res. CGSN 191 art. 3º I torna o Emissor Nacional obrigatório para ME/EPP do Simples em **01/11/2026**; o 1º cliente é
  Simples em SP capital ([[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]]).
- A FAQ NFS-e v1.1 (22/09/2026) item 17.7 exige o certificado do **próprio prestador** no mTLS e na assinatura da DPS;
  não há procuração para integrador e o PAA da NFS-e está "em desenvolvimento, ainda indisponível"
  (`pesquisas-legais/nfse-adn-certificado-numeracao`). O PSC não cobre a conexão da NFS-e.
- Guardar o certificado do cliente (BRIEF `BE-INCR-DFE-ADN-EMISSOR`, F-ADN-1..13 de 12/10) esbarra na DOC-ICP-04 item
  6.1.1.8 (guarda de chave por terceiro só por PSC credenciado) e no precedente do TJSP que responsabiliza o titular
  pelas notas do terceiro (pesquisa de 10/10) — exigiria o parecer da L-ADN-5.
- Nenhum caminho automático roda antes do [[M2]]; em 01/11 o cliente emite pelo portal de qualquer forma.

Opções: (1) portal agora + emissão automática quando o PAA sair; (2) portal + advogado em paralelo; (3) guarda do
certificado como caminho principal. Na 1ª rodada o dono pediu uma explicação menos técnica; a pergunta foi refeita em
linguagem simples, com as mesmas três opções.

### Decisão

**(1) Portal, depois o governo** (a recomendação).

1. **Desde 01/11/2026 a NFS-e do 1º cliente é emitida pelo próprio cliente no Emissor Nacional (portal).** O Luminaris
   relê a nota pelo modo manual (`ManualEmissor` / `retornoManual`, [[DFE-MANUAL]], já em `main`) e lança no razão.
2. **Emissão automática de NFS-e só quando o PAA da NFS-e for publicado** pela Receita/Sefin. Até lá, não há caminho
   automático de NFS-e no plano.
3. **O Luminaris não guarda o certificado do cliente.** A L-ADN-5 (parecer de advogado sobre custódia) não é acionada;
   o caminho de guarda do `BE-INCR-DFE-ADN-EMISSOR` (PR-0..PR-4, F-ADN-1..13 de 12/10) fica **arquivado** — reabrir
   exige decisão nova do dono.
4. **Não muda:** NF-e/NFC-e seguem pelo PSC sem guarda (F-E8-1R de 11/10). Seguem abertos no [[D5]]: quem contrata o
   PSC e o e-CNPJ do Luminaris, e o runbook de produção restrita com certificado de teste.

## 2. H1 × M2 — ordem dos gates

### Contexto apresentado ao dono

- No vault, `H2 depende_de [[H1]]?` era aresta pontilhada (a ordem fixada pelo dono: H1 → H2 → M2), não bloqueio técnico.
- Tentativa 3 do H1 (22/10): ECD com 0 erros no PVA, ECF importada, presunção fechando nos 4 trimestres; Y600 (L11) em
  `main` (#841). O passo 6 (validar a ECF) espera ECD **assinada**, que não existe com o P6 de dados públicos
  ([[D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA]]); a assinatura já estava diferida ao M2 (dono, 13/10).

### Decisão

Nas palavras do dono: *"Só vamos fechar ecf e ecd perto de fechar o primeiro cliente, entao agora nao, faz tudo envolta
disso e deixa a confirmação por ultimo do ultimo"*.

1. **O fechamento de ECD/ECF do [[H1]] (passo 6, desfecho e assinatura do RUNBOOK-H1, e a assinatura do [[P4]]) é o
   último passo do plano**, perto de fechar o 1º cliente.
2. **[[H2]] e [[M2]] seguem antes**, sem esperar o H1. Ordem nova: H1 (passos 1–5, feitos) → H2 → M2 → 1º cliente →
   H1 passo 6 + assinaturas.
3. Registro no grafo: sai `[[H1]]?` do `depende_de` do H2; entra `[[M2]]?` no `depende_de` do H1 (pontilhada — a
   confirmação vem depois do deploy). O estado do H1 continua `human-open`; desfecho e assinatura seguem só do dono.

### Risco aceito

Um erro novo na validação da ECF só aparece depois do deploy; vira correção antes da 1ª entrega oficial do cliente.
