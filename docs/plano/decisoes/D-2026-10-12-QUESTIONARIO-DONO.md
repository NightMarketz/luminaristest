---
id: "D-2026-10-12-QUESTIONARIO-DONO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Questionário do dono de 12/10: forks das emendas de 11/10, PSC contratado pelo Luminaris (F-E8-2 b, F-E8-3 reaberto b) e blocos de 10/10 em lote"
estado: "decided"
autorizacao: "dono, chat, 2026-10-12, questionário (AskUserQuestion) — 3 rodadas; ratificação de forks, sem 'executa'"
atualizado: "2026-10-12"
---
# D-2026-10-12-QUESTIONARIO-DONO

**Estado:** `decided`. Origem: conferência do relatório de próximos passos de 12/10 contra `origin/main`
(PR #639). **Nenhuma resposta é "executa"**: código continua precisando de pedido próprio.

## Cédulas

| Fork | Tema | Resposta do dono | Efeito |
| --- | --- | --- | --- |
| F-E8-2 | Quem contrata o PSC | "(b) Luminaris contrata e revende" — **contra a recomendação (a)** | O Luminaris é o contratante do PSC para NFS-e, NF-e e NFC-e; a pergunta ao advogado (§10.3) passa a ser a responsabilidade do Luminaris como contratante/revendedor |
| F-E8-3 | Critério do PSC | "Reabrir F-E8-3 → (b) lista curta" | Substitui o (a) de 11/10: o Luminaris homologa e contrata 1–2 PSCs |
| F-E2-1 | Detecção de esteticista (16%) | "(b) Declaração + alerta (Recomendado)" | Alerta por cTribNac 06.02 ou kit `aestheticClinic` |
| F-E2-2 | Proporcional no ano de início | "(a) Sim, proporcional (Recomendado)" | Memória: "decisão do dono D-4, sem fonte legal" |
| F-E4-1 | Feriados estaduais/municipais | "(a) Tabela em legal_parameters (Recomendado)" | Começa por SP capital; insumo ausente: lista oficial de SP |
| F-E5-1 | CAIXA na virada 2027 | "(a) Alerta + oferta (Recomendado)" | Sem automatizar (D-6 a) |
| F-E6-1 | Crédito do monofásico como insumo | "(a) Contador, via política (Recomendado)" | GOV-CONTADOR, política versionada |
| F-E7-1, F-E7-2 | Retenções no AP | "Ambas (a) (Recomendado)" | Folha `2.1.x IRRF a Recolher` no kit; Simples do prestador por campo no cadastro |
| F-NFCE-E1-2..9 | Emenda NFC-e | "Ratificar recomendações" | Recomendação de cada fork no `BE-INCR-NFCE-EMENDA-1-brief.md` |
| F-FE-COB-1..8 | Telas de cobrança MP | "Ratificar recomendações" | Todas (a), §4 do `FE-INCR-PAYMENT-PROVIDER-brief.md` |
| F-PES-0..13 | Folha/eSocial/Reinf | "Ratificar recomendações" (a recomendação da pergunta era adiar) | Recomendação de cada fork do PRE-ADR; o F-PES-0 segue condicionado ao fato comercial que o PRE-ADR descreve |
| F-ICMS-0..14 | ICMS/IPI/EFD | "Ratificar recomendações" (a recomendação da pergunta era adiar) | Recomendação de cada fork do PRE-ADR |

## Já resolvidos antes (registro)
- F-E1-1 = (a), dono 11/10, implementado no #634.
- F-E8-1R = (a), dono 11/10 (#635); F-E8-1 e F-ADN-1 superados; F-ADN-2/3 sem objeto.

## Ainda pendentes
- F-ADN-4..13 (BRIEF do emissor ADN) — a emenda do BRIEF para o caminho PSC (contratado pelo Luminaris) deve revisá-los.
- F-E8-1 (PAA) ficou superado, não pendente.
