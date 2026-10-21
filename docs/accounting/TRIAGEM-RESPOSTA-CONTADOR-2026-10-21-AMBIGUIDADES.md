# TRIAGEM — resposta do contador ao pacote de 17/10 (A2, A3, A5, A6, A7) — 2026-10-21

> Skill `luminaris-contador-liaison`, fase 3. Resposta colada pelo dono no chat em 21/10/2026 (texto do contador, não
> versionado aqui por ser comunicação externa; sem PII). **[CTD-002] Nenhum item fecha gate por si.** Citações conferidas no
> dossiê `pesquisas-legais/triagem-2026-10-21-contador-a2-a7` (LC 214 no Planalto compilado, baixada 21/10 [D03]; Lei 9.430
> [D01] e LC 116 [D02] no acervo) e nos dossiês de 17/10 (`verif-2026-10-17-irpj-csll` [D15] IN 1.700; `verif-2026-10-17-simples-mei`
> [D16] Res. CGSN 190; `verif-2026-10-17-contabil-ecd` [D07] Manual ECD).

| Item | Resposta (resumo) | Citação confere? | Classe | Efeito / trilho |
|---|---|---|---|---|
| **A2 = P-IBS-1** | Dispensa de 2026 condicionada à emissão do DF-e com o grupo IBS/CBS; sem guia; manter conformidade se intimado | **Sim.** Art. 348 § 1º ("cumprirem as obrigações acessórias previstas na legislação") e §§ 3º–4º (incl. LC 227: auto por descumprimento do art. 341-G ⇒ intimação para suprir em 60 dias; atender extingue a **penalidade**) [D03]. Imprecisão: o contador fala em "perda da dispensa"; o § 4º fala só em extinção da penalidade | **confirmação** | F-IBS-7 (b) fica de pé; F-IBS-13 **não** dispara; o `executa` do PR-2 cita esta triagem. "Confirma, nada muda" |
| **A3** | Informação socioeconômica de 2026 vai no PGDAS-D de jan–mar/2027; DEFIS acaba em 01/01/2027 | **Sim** (Res. CGSN 190 art. 8º XXI; Res. 140 art. 38-B) [D16 de 17/10] | **confirmação** da leitura 1 → **crítica de dado** | A linha `sn2-obr-defis-simples` precisa trocar o veículo (DEFIS → PGDAS-D jan–mar, fonte art. 38-B). Trilho próprio (correção de dado), **fora deste PR** |
| **A5** | Faixa 1 do Anexo III dá 2,01% de ISS; isenção municipal total ⇒ ME não recolhe ISS; redução parcial não pode ficar abaixo de 2% | **Parcial.** LC 116 art. 8º-A § 1º [D02] veda isenção **ou** redução que resulte em carga < 2% (exceto 7.02, 7.05, 16.01) — o texto não distingue isenção total de parcial. LC 123 art. 18 § 20 **não conferido** nesta sessão | **ambíguo** | Volta ao dono (abaixo). Nada muda no código até resolver |
| **A6** | 1º trimestre com início em 10/02: limite do adicional = R$ 20 mil × 2; mês iniciado conta inteiro | **Conclusão confere** (Lei 9.249 art. 3º § 1º, red. Lei 9.430 art. 4º [D01]; IN 1.700 art. 29 § 1º [D15 de 17/10]). **Citação imprecisa:** Lei 9.430 art. 2º § 2º é a estimativa mensal, não o trimestre do Presumido | **confirmação** | Confirma o #760 (meses em atividade). Nada muda |
| **A7** | PGE rejeita dois J930 com `IND_RESP_LEGAL = S`; demais signatários com `N` | **Não conferido no texto** (o Manual ECD lido em 17/10 diz "existe um registro … = S"; erro impeditivo não confirmado) | **confirmação** do comportamento atual | Mantém "exatamente 1" (`SpedEcdDto.ts:397-399`). O PVA do [[H1]] continua sendo o oráculo |

## Ambiguidade que volta ao dono (A5)

- **Leitura 1 (contador):** o município pode isentar totalmente o ISS do optante; o piso de 2% só limita **reduções** parciais.
- **Leitura 2 (texto do art. 8º-A § 1º da LC 116):** isenção também é vedada quando a carga fica abaixo de 2%; a ME recolhe ao
  menos 2% (exceto 7.02, 7.05, 16.01).
- **Mais segura para o produto:** não mudar nada até a pergunta exata voltar ao contador: *"O art. 8º-A § 1º da LC 116 veda
  'isenções' que resultem em carga < 2%. Em qual dispositivo (LC 123 art. 18 § 20?) o município pode isentar totalmente o ISS
  do optante, e isso prevalece sobre o 8º-A?"*

## O que esta triagem NÃO faz

Não altera dado nem código (A3 vai a trilho próprio); não assina gate; não envia nada ao contador.

## 21/10 — réplica do contador sobre a A5 (2ª mensagem colada pelo dono) — conferida

| Afirmação do contador | Texto conferido | Confere? |
|---|---|---|
| LC 123 art. 18 § 20 permite ao município isentar/reduzir o ISS do optante | § 20: "concedam isenção ou redução ... do ISS ... será realizada redução proporcional ou ajuste do valor a ser recolhido" [D04, acervo, compilada 13/10] | **sim** |
| § 20-A lista "isenção total / redução percentual / valor fixo" | § 20-A diz outra coisa: I "deliberação exclusiva e unilateral" do ente; II "de modo diferenciado para cada ramo de atividade" [D04] | **não** (citação errada) |
| Res. CGSN 140 arts. 31–35 mandam zerar o ISS isento no PGDAS-D sem travar no piso | **Art. 31 p.ú.:** "Quanto ao ISS, os benefícios de que tratam os incisos I e II do caput [I = isenção ou redução] não poderão resultar em percentual menor do que 2% ..., exceto ... 7.02, 7.05 e 16.01 ... (LC 116, art. 8º-A, § 1º)". Art. 32 § 1º: isenção/redução "na forma de redução do percentual efetivo" (Sijut, idAto 92278, visão vigente, lido no navegador em 21/10) | **não** — o próprio regulamento citado aplica o piso à isenção |
| LC 123 prevalece por especialidade (CF art. 146 III "d", 179) | argumento doutrinário; nenhum texto lido o positiva; o CGSN, órgão competente pelo § 20, incorporou o 8º-A § 1º | **não verificável no texto** (sem precedente citado) |

**Conclusão da triagem (A5):** a ambiguidade se resolve pelo texto do regulamento — **isenção ou redução municipal do ISS do optante
não pode levar o percentual abaixo de 2%** (exceto subitens 7.02, 7.05 e 16.01), Res. CGSN 140 art. 31 p.ú. c/c LC 116 art. 8º-A § 1º.
A leitura do contador ("isenção total zera") contraria o art. 31 p.ú. Classe: **crítica do contador rejeitada por texto** — o
produto **não muda** (o piso de 2% já confere, dossiê 17/10). Se o contador tiver precedente judicial (nº do processo/tema), ele
entra como insumo novo, conferido no site do tribunal antes de qualquer mudança.
