---
id: "D-2026-10-02-X8-PIS-COFINS-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-X8-1..8 do ADR-INCR-PIS-COFINS — apuração mensal sem gerador de EFD"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, 2 lotes) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X8-PIS-COFINS-FORKS — cédulas da ratificação do ADR do X8

**Estado:** `decided` (8/8).
**Autorização:** dono, chat, 02/10/2026: *"Autorizo: (1) abrir o ADR do X8 (PIS/COFINS) e ratificar os forks dele por
questionário comigo agora; (2) depois, planejar o BRIEF do X8 (dono, 02/10) — sem 'executa'."* As respostas vieram
pelo AskUserQuestion: o agente apresentou cada fork com contexto e recomendação; o dono decidiu.
**Não é "executa"** (ORCH-006): o [[X8]] ganha autorização de **planejamento**, não de código.

Documento dos forks: [`ADR-INCR-PIS-COFINS.md`](../../adr/ADR-INCR-PIS-COFINS.md) §8.

## Rodada 1 — escopo e desenho

### F-X8-1 — quanto do X8 se constrói, diante da revogação em 01/01/2027
- **Opções:** (a) apuração mensal + provisão + saída para o X9, sem gerador de EFD-Contribuições (**recomendada**) ·
  (b) (a) + gerador de EFD · (c) não construir.
- **Resposta literal:** *"(a) Apuração sem EFD (Recomendado)"* → ✅ (a). O gerador da EFD-Contribuições fica
  **diferido** (não rejeitado); volta só com autorização nova.

### F-X8-2 — onde a apuração persiste
- **Opções:** (a) reusa o `TaxAssessment` do X7 (**recomendada**) · (b) model próprio.
- **Resposta literal:** *"(a) Reusa TaxAssessment (Recomendado)"* → ✅ (a). Efeito: o X8 só começa depois do PR-1 do
  [[X7]] (model).

### F-X8-3 — qual campo carrega o regime de PIS/Cofins
- **Opções:** (a) o `CompanyFiscalProfile.regime` do ano decide; a unidade é conferida (400) e o DTO do `FiscalProfile`
  recusa `PRESUMIDO + NAO_CUMULATIVO` (**recomendada**) · (b) o campo da unidade decide · (c) só aviso.
- **Resposta literal:** *"(a) PJ decide; unidade conferida (Recomendado)"* → ✅ (a).

### F-X8-4 — provisão contábil
- **Opções:** (a) bridge no molde do F-X7-4 (**recomendada**) · (b) o contador provisiona à mão.
- **Resposta literal:** *"(a) Provisiona por bridge (Recomendado)"* → ✅ (a). Contas dependem do contador (ADR §9 item 1).

## Rodada 2 — base e créditos

### F-X8-5 — receita de revenda com alíquota zero (Lei 10.147 art. 2º)
- **Opções:** (a) o operador informa (**recomendada**) · (b) conta de receita própria · (c) derivar das notas emitidas ·
  (d) não tratar.
- **Resposta literal:** *"(a) Operador informa (Recomendado)"* → ✅ (a).

### F-X8-6 — salão-parceiro (Lei 12.592 art. 1º-A § 5º)
- **Opções:** (a) o operador informa a cota-parte como ajuste da base; a correção na origem fica como achado
  (**recomendada**) · (b) corrigir na origem (frente nova) · (c) não tratar.
- **Resposta literal:** *"(a) Operador informa (Recomendado)"* → ✅ (a). A correção na origem (cota-parte como repasse,
  não receita) segue como achado fora de escopo do ADR (§11 item 1) — afeta também X7 Presumido e o Simples.

### F-X8-7 — separar o crédito da NF-e em PIS × Cofins
- **Opções:** (a) a importação grava base/PIS/Cofins separados daqui para frente; notas antigas por proporção 165:760
  marcada `DERIVADO` (**recomendada**) · (b) sempre proporcional · (c) o operador informa.
- **Resposta literal:** *"(a) Gravar separado daqui pra frente (Recomendado)"* → ✅ (a).

### F-X8-8 — outros créditos do art. 3º (energia, aluguel PJ, arrendamento, depreciação, frete)
- **Opções:** (a) o operador informa por linha (**recomendada**) · (b) derivar do AP + C8 · (c) só NF-e.
- **Resposta literal:** *"(a) Operador informa (Recomendado)"* → ✅ (a).

**ADR-INCR-PIS-COFINS: 8/8 forks ratificados, todos na recomendação.** Promoção a `Accepted` registrada no ADR (§14).
BRIEF: [`BE-INCR-PIS-COFINS-brief.md`](../../accounting/BE-INCR-PIS-COFINS-brief.md) — os forks dele (F-PCB-n) ficam
**pendentes**: a autorização de 02/10 cobre planejar o BRIEF, não ratificá-lo.
