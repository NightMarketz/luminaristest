---
id: "D-2026-10-02-X7-TAX-ASSESSMENT-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-X7-2..14 do ADR-INCR-TAX-ASSESSMENT"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, sessão de ratificação) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X7-TAX-ASSESSMENT-FORKS — cédulas da sessão de ratificação

**Estado:** `decided` (13/13).
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
