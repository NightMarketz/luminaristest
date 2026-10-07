---
id: "D-2026-10-07-SIMPLES-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: forks F-SN-0..13 do PRE-ADR-SIMPLES-NACIONAL-CALCULO (Simples ME/EPP + MEI)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-07: \"sim, abre o questionário dos forks\" + \"apenas faça baseado na lei e pronto\" — só decisão, sem 'executa'"
atualizado: "2026-10-07"
---
# D-2026-10-07-SIMPLES-FORKS — cédulas da ratificação do PRE-ADR do Simples

**Estado:** `decided` (14/14; 11 na recomendação, 3 divergentes: F-SN-0, F-SN-2, F-SN-12).
**Autorização:** dono, chat, 07/10/2026: *"sim, abre o questionário dos forks"*. Respostas via AskUserQuestion, em 5 lotes.
**Não é "executa"** (ORCH-006). O PRE-ADR passa a **Accepted**; o BRIEF do [[X14]] exige pedido próprio.

Documento dos forks: [`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md`](../../adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md) §4.

## Regra do dono sobre a fonte (07/10)

*"Não precisa pedir ao contador em lugar nenhum a lei é unica e não é interpretativa, apenas faça baseado na lei e
pronto."* Consequência: o §8 do PRE-ADR **deixa de ser pedido ao contador**. Cada item se resolve pela norma do corpus
(`docs/accounting/fontes-oficiais/`) ou, quando a norma é silente, pela regra explícita abaixo. Nenhum item do §8 vira
pedido em `luminaris-contador-liaison`.

## Cédulas

| Fork | Resposta literal | Decisão | Base |
|---|---|---|---|
| F-SN-0 | *"ME/EPP e MEI juntos"* | (b) — **diverge** | MEI: Res. CGSN 140 arts. 100–119 (corpus, V); LC 123 art. 18-A |
| F-SN-1 | *"Nó próprio X14 (Recomendado)"* | (a) | software |
| F-SN-2 | *"Tabela Prisma editável"* | (b) — **diverge** | software |
| F-SN-3 | 1ª: *"Pesquise"*; após a pesquisa: *"Mapa com fonte + bloqueio (Recomendado)"* | (a) | Res. 140 art. 25 § 1º I, III "m", VI (V) |
| F-SN-4 | *"Implementar agora (Recomendado)"* | (a) | LC 123 art. 18 §§ 5º-J, 5º-M; Res. 140 arts. 25 V, 26 (V) |
| F-SN-5 | *"Subrazão fiscal de receita (Recomendado)"* | (c) + (d) conferência | software |
| F-SN-6 | *"Atributo do X10a + manual interino (Recomendado)"* | (a) + (b) interino | Res. 140 art. 25 § 7º; Lei 10.147 (V) |
| F-SN-7 | *"Só competência (Recomendado)"* | (a) | LC 123 art. 18 § 3º (V) |
| F-SN-8 | *"Espelho + registro do DAS oficial (Recomendado)"* | (b) | manual PGDAS-D sem leiaute de importação (V) |
| F-SN-9 | *"Espelho anual mínimo (Recomendado)"* | (a) | Res. 140 art. 72 § 1º (V) |
| F-SN-10 | *"Provisão pelo valor oficial (Recomendado)"* | (a) | molde F-X7-4 |
| F-SN-11 | *"2 campos no perfil do ano (Recomendado)"* | (a) | LC 123 art. 13 §§ 9º–10, red. LC 214 (V) |
| F-SN-12 | *"Modelar a parceria já"* | (b) — **diverge** | Lei 12.592 §§ 4º, 5º, 8º; LC 123 art. 13 § 1º-A, art. 18 § 4º V (V) |
| F-SN-13 | *"Um modelo só (Recomendado)"* | (a), condicionado ao F-X7-3 → (a) | critério de reuso |

**Pesquisa do F-SN-3 (07/10):** não existe tabela oficial CNAE × anexo. A Res. 140 art. 25 § 1º enquadra pela
descrição da atividade; o Anexo VI lista só CNAEs impeditivos. Salão (beleza) → inciso III "m" (residual sem
atividade intelectual) → Anexo III sem fator R; revenda → inciso I → Anexo I; locação de bem móvel → inciso VI →
Anexo III sem ISS.

## Riscos aceitos e salvaguardas das divergências

- **F-SN-2 (tabela editável):** admin pode alterar coeficiente de lei sem PR. Salvaguarda que o BRIEF deve propor
  (não ratificada aqui): carga inicial por script a partir da fonte, teste de diff contra a fonte, trilha de auditoria
  de toda edição.
- **F-SN-0 (MEI junto):** cálculo distinto (valor fixo, art. 101; DASN-SIMEI até o último dia de maio, art. 109;
  Anexo XI de ocupações). Entra no mesmo nó [[X14]].
- **F-SN-12 (parceria já):** o contrato registra a cota-parte e a natureza da cota do salão (aluguel de bem móvel →
  Anexo III sem ISS; gestão → Anexo III), conforme a Lei 12.592 § 4º. A homologação (§ 8º) é campo do contrato.

## Pontos em que a norma é silente — regra adotada (sem contador)

1. **Arredondamento do PGDAS-D:** sem regra na Res. 140 nem no manual. Vale o **DAS oficial** (F-SN-8/F-SN-10); o
   cálculo próprio é conferência e a divergência é exibida, nunca contabilizada.
2. **CPP dentro do DAS na DRE:** o DAS incide sobre a receita bruta (LC 123 art. 18) → classificado como **dedução da
   receita** junto com os demais tributos do DAS. Não há partição por tributo no lançamento.
3. **Fatos do cliente** (opção caixa em 2026, uso de parceria, histórico de 12 meses, NCMs revendidos): não são
   interpretação de lei; vêm do cadastro/importação do próprio cliente no sistema.
