---
id: "D-2026-10-02-X7-TAX-ASSESSMENT-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-X7-2..14 do ADR-INCR-TAX-ASSESSMENT e F-TA-1..10 do BRIEF da Fase A"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, sessão de ratificação) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X7-TAX-ASSESSMENT-FORKS — cédulas da sessão de ratificação

**Estado:** `decided` (F-X7: 13/13; F-TA: 10/10; rodada 8 — roteamento X8/X9: 1/1).
**Autorização:** dono, chat, 02/10/2026: *"Autorizo: (1) rodada de ratificação dos forks F-X7-2..14 do
ADR-INCR-TAX-ASSESSMENT por questionário comigo agora; (2) depois, planejar o BRIEF da Fase A do X7 e decidir se
X8/X9 fundem nele (dono, 02/10) — sem 'executa'"*. As respostas vieram pelo AskUserQuestion: o agente apresentou e
o dono decidiu.
**Não é "executa"** (ORCH-006): o [[X7]] ganha autorização de **planejamento** da Fase A, não de código.

Documento dos forks: [`ADR-INCR-TAX-ASSESSMENT.md`](../../adr/ADR-INCR-TAX-ASSESSMENT.md) §8. F-X7-1 → (a) já estava
ratificado (29/09, decisão 9 de [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]]).

## Rodada 1 — os forks que mudam o desenho

### F-X7-2 — o cálculo do X7 × o Bloco N da ECF
- **Opções:** (a) o X7 calcula para guia, DCTFWeb e provisão; a ECF continua delegando o N ao PVA; a conciliação
  X7 × PVA vira passo do runbook H1/H1b/X5 (**recomendada**) · (b) o X7 alimenta o Bloco N (reabre o Fork 3).
- **Resposta literal:** *"(a) PVA segue no N (Recomendado)"* → ✅ (a).

### F-X7-3 — persistir a apuração
- **Opções:** (a) persistida, imutável depois de confirmada, correção = nova versão que nomeia a substituída
  (**recomendada**) · (b) calculada sob demanda.
- **Resposta literal:** *"(a) Persistida, imutável (Recomendado)"* → ✅ (a).

### F-X7-4 — provisão contábil
- **Opções:** (a) a confirmação gera a provisão por bridge explícita (ADR-C01), em 2 commits + reconcile idempotente;
  substituir = estorno + novo lançamento (**recomendada**) · (b) o contador provisiona à mão.
- **Resposta literal:** *"(a) Provisiona por bridge (Recomendado)"* → ✅ (a). As contas dependem do contador
  (ADR §9 item 3).

### F-X7-5 — quando a forma trava
- **Opções:** (a) na tx da confirmação da 1ª apuração do ano (**recomendada**) · (b) ação explícita do operador ·
  (c) sem trava, só aviso.
- **Resposta literal:** *"(a) Na 1ª confirmação (Recomendado)"* → ✅ (a). Sem "destravar" no MVP (declarado no ADR).

## Rodada 2 — cálculo e dados

### F-X7-7 — PJ × unidade
- **Opções:** (a) grava na chave da PJ, lê uma unidade e responde 400 se outra unidade da PJ tiver movimento
  (**recomendada**) · (b) somar unidades · (c) apurar por unidade.
- **Resposta literal:** *"(a) PJ, lê 1 unidade (Recomendado)"* → ✅ (a).

### F-X7-6 — períodos anuais no e-Lalur (Fase B)
- **Opções:** (a) alargar os valores da coluna `quarter` para `T01..T04 ∪ A00..A12`, sem migração (**recomendada**) ·
  (b) coluna nova `perApur` + migração.
- **Resposta literal:** *"(a) Alargar o enum (Recomendado)"* → ✅ (a).

### F-X7-10 — LC 224/2025 (Presumido acima de R$ 5 mi/ano)
- **Opções:** (b) implementar a IN 2.305 art. 15 (redação da IN 2.306) (**recomendada**) · (a) bloquear · (c) ignorar.
- **Resposta literal:** *"(b) Implementar a IN 2.305 (Recomendado)"* → ✅ (b).

### F-X7-14 — 16% para prestador exclusivo de serviço ≤ R$ 120 mil
- **Opções:** (a) não modelar e usar 32% (**recomendada**) · (b) modelar os §§ 7º e 8º.
- **Resposta literal:** *"(a) Não modelar; usa 32% (Recomendado)"* → ✅ (a).

## Rodada 3 — fronteira com X8/X9 e deduções

### F-X7-8 — X9 fundido ou separado
- **Pergunta:** decide o nível do ADR. Avisado: a fusão no BRIEF da Fase A volta como fork do BRIEF, condicionada a
  esta resposta.
- **Opções:** (a) X9 com ADR próprio, consumindo o contrato C1 (**recomendada**) · (b) fundir no X7.
- **Resposta literal:** *"(a) X9 com ADR próprio (Recomendado)"* → ✅ (a).

### F-X7-9 — adaptador 1 da porta `EnvioMit`
- **Resposta literal (1ª):** *"Pra que serve isso? Esqueci"*
- **Explicação dada:** o X7 calcula; o valor tem de ser declarado na DCTFWeb, onde o IRPJ e a CSLL entram pelo MIT.
  O adaptador é o jeito de levar o número ao MIT: (a) ficha para digitar · (b) arquivo de importação, com o
  encerramento (a confissão) feito pelo humano · (c) API do Serpro, adiada pela R5. Com o F-X7-8 → (a), o fork
  **migra para o ADR do X9** e não afeta a Fase A. Foi acrescentada a opção "decidir no ADR do X9".
- **Resposta literal (2ª):** *"(b) Arquivo JSON do MIT (Recomendado)"* → ✅ (b). O ADR do X9 herda a decisão.

### F-X7-13 — PIS/COFINS dentro do X7
- **Opções:** (a) fora, fica no X8 (**recomendada**) · (b) o X7 cobre o cumulativo do Presumido.
- **Resposta literal:** *"(a) Fora; fica no X8 (Recomendado)"* → ✅ (a).

### F-X7-11 — deduções (IRRF / CSLL retida)
- **Opções:** (a) o operador informa (**recomendada**) · (b) derivar de AR/NFS-e (não há modelo de retenção) ·
  (c) sem deduções.
- **Resposta literal:** *"(a) Operador informa (Recomendado)"* → ✅ (a).

## Rodada 4

### F-X7-12 — ISS
- **Opções:** (a) relatório somente leitura por competência e município na Fase C, sem guia (**recomendada**) ·
  (b) ISS fora do X7.
- **Resposta literal:** *"(a) Relatório na Fase C (Recomendado)"* → ✅ (a).

**ADR-INCR-TAX-ASSESSMENT: 14/14 forks ratificados (F-X7-1 em 29/09; F-X7-2..14 em 02/10), todos na recomendação.**
Promoção do ADR a `Accepted` registrada no próprio ADR (§14 previa a promoção depois da ratificação).

---

# BRIEF da Fase A — forks F-TA-1..10

**Autorização:** dono, chat, 02/10/2026: *"Ratifica os F-TA-1..10 por questionário agora"*. Documento dos forks:
[`BE-INCR-TAX-ASSESSMENT-A-brief.md`](../../accounting/BE-INCR-TAX-ASSESSMENT-A-brief.md) §3. Continua sem
"executa".

## Rodada 5 — os forks que mudam o desenho

### F-TA-1 — X8/X9 fundem no BRIEF da Fase A?
- **Opções:** (a) separados; a Fase A grava `codigoReceita` (**recomendada**) · (b) fundir o X9 · (c) fundir X8 e X9.
- **Resposta literal:** *"(a) Separados (Recomendado)"* → ✅ (a). Atende o item (2) da autorização de 02/10
  (*"decidir se X8/X9 fundem nele"*): **não fundem**.

### F-TA-3 — ordem dos trimestres
- **Opções:** (a) sequencial, lendo a memória confirmada (**recomendada**) · (b) qualquer ordem, relendo o razão.
- **Resposta literal:** *"(a) Sequencial (Recomendado)"* → ✅ (a).

### F-TA-7 — confirmar sem as contas da provisão
- **Opções:** (a) confirma, provisão pendente (**recomendada**) · (b) recusa (400).
- **Resposta literal:** *"(a) Confirma; provisão pendente (Recomendado)"* → ✅ (a).

### F-TA-8 — encerramento × provisão pendente
- **Opções:** (a) o encerramento recusa (**recomendada**) · (b) só aviso.
- **Resposta literal:** *"(a) Encerramento recusa (Recomendado)"* → ✅ (a).

## Rodada 6

### F-TA-2 — arredondamento
- **Opções:** (a) half-up por linha da memória (**recomendada**) · (b) truncar · (c) só o total.
- **Resposta literal:** *"(a) Half-up por linha (Recomendado)"* → ✅ (a). Sem fonte primária (P-4); oráculo H1/X5.

### F-TA-4 — início/encerramento de atividade
- **Opções:** (b) datas no perfil (**recomendada**) · (a) nº de trimestres · (c) não tratar.
- **Resposta literal:** *"(b) Datas no perfil (Recomendado)"* → ✅ (b).

### F-TA-6 — contas da provisão
- **Opções:** (a) 4 contas no `FiscalProfile` da unidade (**recomendada**) · (b) 2 contas · (c) no perfil da PJ.
- **Resposta literal:** *"(a) 4 contas na unidade (Recomendado)"* → ✅ (a).

### F-TA-9 — retenção maior que o devido
- **Opções:** (a) a pagar 0 + saldo negativo (**recomendada**) · (b) recusa (400).
- **Resposta literal:** *"(a) A pagar 0 + saldo negativo (Recomendado)"* → ✅ (a).

## Rodada 7

### F-TA-5 — chave por cliente para a liminar contra a LC 224
- **Opções:** (b) não construir agora (**recomendada**) · (a) construir a chave.
- **Resposta literal:** *"(a) Construir a chave"*
- **Checagem antes de registrar:** sem conflito com fork ratificado. O F-X7-10 → (b) implementa a LC 224; a chave só
  a desliga por cliente, e a tabela versionada (D3) continua sendo o desligamento para todos.
- **Registro:** ✅ (a), **divergente da recomendação**. Amplia o escopo da Fase A em 2 campos do perfil e uma regra de
  cálculo. Esta resposta é a autorização citável da ampliação, só para planejamento. Item 2b novo; itens 9, §2 e P-11
  ajustados. O efeito retroativo da liminar ficou como pendência jurídica (P-11), não como decisão.

### F-TA-10 — fatiamento
- **Opções:** (a) 3 PRs seriais (**recomendada**) · (b) 1 PR.
- **Resposta literal:** *"(a) 3 PRs seriais (Recomendado)"* → ✅ (a).

**BRIEF da Fase A: 10/10 forks ratificados (9 na recomendação, F-TA-5 divergente).**

---

# Rodada 8 — roteamento X8/X9 depois do F-TA-1 → (a)

**Pedido do dono (chat, 02/10):** *"BRIEF próprio do X8 e/ou do X9 (o X9 já ficou reduzido a DCTFWeb + MIT), já que
eles não fundem na Fase A."*
**Divergência do passo 1 (sessao-planejamento), reportada antes de escrever:** as notas [[X8]] e [[X9]] trazem
`autorizacao: "F-M2 (2026-09-03) — só ADR"`, e nenhuma das duas tem ADR. O F-X7-8 → (a) exige ADR próprio do X9. Um
BRIEF sem ADR contradiz um fork ratificado.

### R8-1 — Como seguir com X8/X9?
- **Opções:** (a) ADR do X9 agora, BRIEF depois da ratificação; X8 em espera (**recomendada**) · (b) ADR do X9 + ADR
  do X8 · (c) ADR + ratificação + BRIEF do X9 numa sessão · (d) BRIEF sem ADR (não recomendada).
- **Resposta literal:** *"ADR do X9 agora (Recomendado)"* → ✅ (a).
- **Efeito:** [`ADR-INCR-DCTFWEB-MIT.md`](../../adr/ADR-INCR-DCTFWEB-MIT.md) **Proposed**, com F-X9-1..6 pendentes.
  O X8 continua sem ADR, e o ADR dele começa pelo custo-benefício da revogação de 01/01/2027. Sem BRIEF e sem
  "executa".
