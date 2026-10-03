---
id: "D-2026-10-02-X9-DCTFWEB-MIT-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-X9-1..6 do ADR-INCR-DCTFWEB-MIT (X9: arquivo JSON do MIT)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: \"Ratifica os F-X9-1..6 por questionário agora\" — só decisão, sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-X9-DCTFWEB-MIT-FORKS — cédulas da ratificação do ADR do X9

**Estado:** `decided` (6/6, todos na recomendação).
**Autorização:** dono, chat, 02/10/2026: *"Ratifica os F-X9-1..6 por questionário agora"*. As respostas vieram pelo
AskUserQuestion, em 2 lotes: o agente apresentou com contexto e recomendação, e o dono decidiu.
**Não é "executa"** (ORCH-006). O [[X9]] passa a ter ADR **Accepted**. Planejar o BRIEF exige pedido próprio, e o
código depende do PR-2 da Fase A do [[X7]].

Documento dos forks: [`ADR-INCR-DCTFWEB-MIT.md`](../../adr/ADR-INCR-DCTFWEB-MIT.md) §8. A rodada que abriu o ADR é a
rodada 8 de [[D-2026-10-02-X7-TAX-ASSESSMENT-FORKS]].

## Lote 1 — os forks que mudam o desenho

### F-X9-1 — Completude do arquivo
- **Opções:** (a) parcial, com avisos fixos (**recomendada**) · (b) débitos avulsos digitados no Luminaris ·
  (c) bloquear até cobrir todos os tributos.
- **Resposta literal:** *"(a) Parcial + avisos (Recomendado)"* → ✅ (a).
- **Risco aceito:** um aviso não impede a retificação que apaga débitos (Manual do MIT §9.1; IN 2.237 art. 13 § 1º).

### F-X9-2 — Registrar a exportação
- **Opções:** (a) tabela `MitExport` com hash e ids, sem conteúdo, e `defasado` calculado na leitura
  (**recomendada**) · (b) só o evento de auditoria.
- **Resposta literal:** *"(a) Tabela MitExport (Recomendado)"* → ✅ (a).

### F-X9-3 — Responsável pelo preenchimento
- **Opções:** (a) contador do perfil, sem CRC (**recomendada**) · (b) contador com CRC convertido · (c) CPF
  digitado a cada exportação.
- **Resposta literal:** *"(a) Contador, sem CRC (Recomendado)"* → ✅ (a).

### F-X9-5 — PJ com a chave da liminar contra a LC 224 ligada
- **Opções:** (c) recusar com 409 enquanto a chave estiver ligada no ano (**recomendada**) · (a) débito cheio com
  suspensão (exige emendar a Fase A e 8 campos do processo) · (b) valor da Fase A com aviso.
- **Resposta literal:** *"(c) Recusar 409 (Recomendado)"* → ✅ (c). Reabrir com o P-5 (contador ou jurídico).

## Lote 2

### F-X9-4 — Dados iniciais que o perfil não tem
- **Opções:** (b) derivar o que a lei fixa e usar o padrão do Manual no resto, sem campo novo (**recomendada**) ·
  (a) 2 campos novos no perfil.
- **Resposta literal:** *"(b) Derivar + padrão (Recomendado)"* → ✅ (b). PRESUMIDO ⇒ PIS/Cofins cumulativo (Lei
  10.637 art. 8º II; Lei 10.833 art. 10 II); REAL ⇒ não cumulativo; variações monetárias ⇒ caixa (Manual §3.3); o
  retorno avisa *"confira os Dados Iniciais no MIT"*.

### F-X9-6 — DCTFWeb na matriz de obrigações
- **Opções:** (a) entra na matriz (**recomendada**) · (b) a matriz continua só com SPED.
- **Resposta literal:** *"(a) Entra na matriz (Recomendado)"* → ✅ (a). REAL, PRESUMIDO e SIMPLES = `OBRIGATORIA`
  (IN 2.237 art. 3º I); MEI = `CONDICIONAL` (art. 3º IX; art. 4º IX); vigência 01/01/2025.

**ADR-INCR-DCTFWEB-MIT: 6/6 forks ratificados, todos na recomendação → Accepted.**
