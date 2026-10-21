# PEDIDO AO CONTADOR E AO ADVOGADO — 2026-10-17 (ambiguidades da verificação legal)

> Rascunho do agente (skill `luminaris-contador-liaison`). **[CTD-001] O dono envia; o agente não enviou nada.**
> Decisão do dono (chat, 17/10): "Sim, monta o pacote". Cédulas em
> [`D-2026-10-17-AMBIGUIDADES-A1-A10`](../plano/decisoes/D-2026-10-17-AMBIGUIDADES-A1-A10.md).
> **Complementa** o [`PEDIDO-CONTADOR-2026-10-10-UNICO.md`](PEDIDO-CONTADOR-2026-10-10-UNICO.md). Se a 2ª mensagem dele
> ainda não saiu, dá para juntar as perguntas abaixo à Parte III ("regras gerais").
> **21/10:** a pergunta 1 (A2) é a P-IBS-1 do IBS-CBS-2027, com prazo — versão urgente avulsa em
> [`PEDIDO-CONTADOR-2026-10-21-P-IBS-1.md`](PEDIDO-CONTADOR-2026-10-21-P-IBS-1.md). Envie uma das duas, não as duas.

---

## Mensagem ao contador

Olá, [nome do contador],

Revisamos as regras fiscais do sistema contra a legislação vigente. Ficaram cinco pontos em que a norma admite mais de
uma leitura. Não precisa de documento, só da sua leitura e, se possível, da base:

1. **CBS/IBS em 2026 (Presumido e Real).** Para ficar dispensado do recolhimento em 2026 (LC 214, art. 348 §1º), basta
   emitir a NF-e/NFS-e com o grupo IBS/CBS preenchido, ou há outra obrigação acessória a cumprir?
2. **Informação socioeconômica de 2026 (Simples).** A Res. CGSN 190 revoga o art. 72 (DEFIS) em 01/01/2027 e cria o
   art. 38-B, que manda informar no PGDAS-D, de janeiro a março, o ano anterior. Os dados de 2026 vão na DEFIS até 31/03/2027
   ou no PGDAS-D de jan–mar/2027?
3. **Piso de 2% do ISS no Simples.** Na faixa 1 do Anexo III, quando o ISS da tabela fica abaixo de 2% e há isenção
   municipal, a ME recolhe o percentual da tabela ou 2%?
4. **Adicional do IRPJ no início de atividade (Presumido).** Uma empresa aberta em 10/02: o adicional do 1º trimestre usa
   R$ 20 mil × 2? Fevereiro, parcial, conta como mês inteiro?
5. **ECD, registro J930.** O PGE do SPED Contábil aceita dois J930 com IND_RESP_LEGAL = S (dois responsáveis legais)?

Obrigado!

## Mensagem ao advogado

Olá, [nome],

O CDC, art. 52 §1º, limita a multa de mora a 2%, e o caput trata de crédito ou financiamento. Há precedente vinculante do
STJ que estenda esse teto a serviço pago em parcelas sem financiamento? Hoje aplicamos os 2% a todo consumidor pessoa
física, por segurança.

---

## Critério de aceite interno (não vai no texto)

| Pergunta | Item | Aceite | Trilho quando chegar |
|---|---|---|---|
| Contador 1 | A2 | resposta "sim/não + qual obrigação" | premissa na memória da apuração: confirma → registro; nega → emenda no M5 |
| Contador 2 | A3 | veículo (DEFIS × PGDAS-D) | linha `sn2-obr-defis-simples` e a obrigação do calendário |
| Contador 3 | A5 | "tabela" ou "2%" | teste de regressão do piso de ISS no `simplesCalc` (sessão de instrumentação) |
| Contador 4 | A6 | "meses inteiros" ou "fração" | confirma o #760 ou abre lacuna |
| Contador 5 | A7 | sim/não; o PVA do [[H1]] decide se houver dúvida | `SpedEcdDto.ts:397-399` |
| Advogado | A8 | precedente citado (nº do REsp/tema) ou "não há" | conferir no stj.jus.br antes de mudar o teto (memória "pesquisa colada: conferir citações") |

**Não estamos pedindo:** A1 (vai à SEFAZ-SP, relatório `sp-inutilizacao-nfe-nfce-2026-11` §4), A4 e A9 (decididos pelo
dono em 17/10) e A10 (dossiê `ctribnac-salao-clinica`).

**Quando a resposta chegar:** "triagem do que o contador mandou".
