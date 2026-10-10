---
id: "D-2026-10-10-X14-PROXIMOS-PASSOS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X14 e SIMEI-TAC-12: aresta só na parte MEI (TAC primeiro), caixa vira nó próprio (X14-CAIXA) e X14 → done, gate X14-DAS só com DAS real, BRIEF do FE-INCR-SIMPLES autorizado"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10, questionário em duas rodadas (sessão de decisão: só questionário + registro, sem 'executa')"
atualizado: "2026-10-10"
---
# D-2026-10-10-X14-PROXIMOS-PASSOS — próximos passos do X14 e do SIMEI-TAC-12

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-10. Esta sessão foi só de decisão: **nenhuma cédula dá
`executa`**. Nós: [[X14]], [[SIMEI-TAC-12]], [[X14-CAIXA]] (novo), [[FE-INCR-SIMPLES]] (novo).

## Como foi perguntado

- **1ª rodada (D1–D4):** em D1–D3 o dono respondeu com **fundamentação legal escrita**, sem escolher opção, e pediu
  "Verifique para ratificar as leis" / "Ratifique tbm". Em D4 escolheu **(a)**. O agente conferiu cada citação no
  corpus e no Planalto (tabela abaixo) e reperguntou D1–D3 com o resultado da conferência.
- **2ª rodada (D1–D3):** o dono escolheu as opções registradas abaixo.
- **D5 (merge do PR #624) não foi perguntado:** o #624 já estava mergeado em `main` (`845d79ce`) quando a sessão
  começou, ao contrário da premissa do pedido ("PR #624 (aberto)").

## Cédulas

| # | Ponto | Escolha do dono (literal) | Recomendação | Diverge? |
|---|---|---|---|---|
| D1 | Aresta SIMEI-TAC-12 → X14 + ordem | "(a) Só MEI; TAC primeiro (Recomendado)". Fundamento escrito pelo dono na 1ª rodada: "a regra de negócio do TAC não possui relação jurídica ou matemática com o regime de caixa, justificando que não aguardem um pelo outro no código." | (a) | não |
| D2 | BRIEF do DAS por recebimento | "(c) Nó próprio; X14 → done (Recomendado)". Fundamento escrito na 1ª rodada: "Por ser uma obrigação restrita a ME/EPP e possuir alta complexidade contábil isolada, a lei fundamenta a separação dessa feature (cálculo e front-end) das regras simplificadas aplicadas ao MEI/TAC." | (c) | não |
| D3 | Gate humano X14-DAS | "(b) Quando houver DAS real (Recomendado)" | (b) | não |
| D4 | FE-INCR-SIMPLES | "(a) Planejar o BRIEF agora" | (b) depois do D2 | **sim**: o dono escolheu planejar já, sem esperar o caixa |

### Efeito de cada cédula

- **D1:** a aresta [[SIMEI-TAC-12]] → [[X14]] cobre **só a parte MEI** do X14 (`apurarSimei`/`montarMei` e o perfil
  fiscal do MEI, já em `main`). **Ordem:** o código do TAC vem antes dos planejamentos do D4 (e do X14-CAIXA, quando
  houver). O código do TAC **continua precisando do `executa` próprio**, que não foi dado.
- **D2:** a base do DAS por recebimento sai do X14 e vira o nó [[X14-CAIXA]] (`planned`, **sem autorização**). O
  [[X14]] passa a `done`. O FE ([[FE-INCR-SIMPLES]]) e o gate X14-DAS seguem separados. O escopo legal do X14-CAIXA é
  o da tabela de fatos (arts. 16 a 20 e 77).
- **D3:** nenhum runbook agora. Quando houver DAS real do 1º cliente, o runbook nasce com **dois oráculos**: o PGDAS-D
  para ME/EPP (Res. 140 arts. 38 e 42 II "b") e o PGMEI para MEI/TAC (arts. 42 I e 104).
- **D4:** a `sessao-planejamento` do BRIEF do [[FE-INCR-SIMPLES]] está **autorizada, sem `executa`**. Ela especifica
  as telas sobre o cálculo por competência, e a variante por recebimento entra depois como emenda (por isso a aresta
  para o X14-CAIXA é pontilhada). Fila (D1): depois do código do TAC.

## Fatos legais — grau

Graus: **V-corpus** = lido em `docs/accounting/fontes-oficiais/` nesta sessão, com a linha conferida. **V-web** =
página oficial baixada e lida nesta sessão. **I** = inferência sobre o texto. **diverge** = citação que não bate com a
fonte, registrada aqui e **não usada como fundamento**. **não lido** = sem leitura, sem descrição.

Fonte web: `https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm`, baixada em 2026-10-10, 1.622.252 bytes,
sha256 `76c3edf01af3…`. O tamanho é igual ao registrado no MANIFEST (linha `lc-123-2006`), mas o sha difere do
registrado (`07ee7d3adc22`). Não investiguei a causa, e nenhum trecho lido depende disso.

| Fato | Fonte | Grau |
|---|---|---|
| ME/EPP pode tributar a receita **recebida** no mês, por opção irretratável no ano | LC 123 art. 18 § 3º (red. LC 155/2016) | V-web |
| MEI recolhe "valor fixo mensal correspondente à soma das seguintes parcelas" | LC 123 art. 18-A § 3º V | V-web |
| TAC-MEI: limite de R$ 251.600,00; contribuição de 12% sobre o salário-mínimo | LC 123 art. 18-F I e III (incluído pela LC 188/2021) | V-web |
| DAS = "documento único de arrecadação, instituído pelo Comitê Gestor" | LC 123 art. 21 I | V-web |
| Simei paga por DAS "independentemente da receita bruta por ele auferida no mês" | Res. CGSN 140 art. 101 caput (linha 2578) | V-corpus |
| CPP do TAC = 12% a partir da competência 04/2022 | Res. 140 art. 101 I "c" | V-corpus |
| Base de cálculo = receita auferida (competência) ou recebida (caixa) | Res. 140 art. 16 caput (linha 601) | V-corpus |
| Regime irretratável para todo o ano-calendário | Res. 140 art. 16 § 1º | V-corpus |
| Opção registrada no Portal na apuração de novembro (efeito no ano seguinte), dezembro (início de atividade com efeito da opção em dezembro, efeito no ano seguinte) ou no mês de início dos efeitos (efeito no próprio ano) | Res. 140 art. 19 I–III (linha 629) | V-corpus |
| Caixa vale **só** para a base mensal; limites, sublimites e alíquota seguem por competência | Res. 140 art. 19 p.ú. | V-corpus |
| Parcela a prazo não vencida entra na base até o último mês do ano seguinte ao da **prestação/operação** | Res. 140 art. 20 I (linha 639) | V-corpus |
| Receita auferida e não recebida entra na base no encerramento (a), no último mês do caixa ao retornar à competência (b) e no mês anterior à exclusão (c) | Res. 140 art. 20 II | V-corpus |
| Registro dos valores a receber, modelo Anexo IX | Res. 140 art. 20 III c/c art. 77 (linha 1856) | V-corpus (conteúdo do Anexo IX: **não lido**, é PDF binário) |
| Impedimento do art. 12 com caixa mantido: a receita não recebida vai à base do **ICMS/ISS, recolhido direto ao ente**, não ao DAS | Res. 140 art. 20 IV | V-corpus |
| No caixa, devolução e cancelamento deduzem só o valor efetivamente devolvido | Res. 140 arts. 17 p.ú. e 18 § 1º | V-corpus |
| Cálculo do ME/EPP pelo PGDAS-D | Res. 140 art. 38 (linha 1196) | V-corpus |
| Recolhimento por DAS | Res. 140 art. 41 | V-corpus |
| DAS gerado exclusivamente: MEI pelo PGMEI (I); demais ME/EPP pelo PGDAS-D a partir de 01/2012 (II "b") | Res. 140 art. 42 (linha 1320) | V-corpus |
| PGMEI emite os DAS de todos os meses do ano | Res. 140 art. 104 | V-corpus |
| O DAS-MEI do TAC não depende do regime de caixa | Res. 140 art. 101 caput + art. 19 p.ú. (o caixa só afeta a base mensal do ME/EPP) | I (sobre texto V) |

### Citações que divergem da fonte (não usadas)

| Citação | O que a fonte diz | Origem |
|---|---|---|
| Res. 140 art. 101 § 2º "garante" que o DAS-MEI independe da receita; redação pela Res. 165/2022 | § 2º: "As tabelas constantes do Anexo XI aplicam-se apenas no âmbito do Simei". A redação pela Res. 165 não aparece no corpus | dono, 1ª rodada, D1 |
| Res. 140 arts. 16 a 18 obrigam o registro de recebíveis | 16 = base/opção, 17 = devolução, 18 = cancelamento. O registro está no art. 20 III c/c art. 77 | dono, 1ª rodada, D1/D2 |
| Res. 140 art. 16 § 3º sobre irretratabilidade/opção | § 3º = segregação (I) e mercado interno × exportação (II). Irretratável é o § 1º | dono, 1ª rodada, D2; pedido da sessão |
| Res. 140 art. 20 I: "ano subsequente ao da emissão do documento fiscal" | "àquele em que tenha ocorrido a respectiva prestação de serviço ou operação com mercadorias" | dono, 1ª rodada, D2 |
| LC 123 art. 21 § 1º regulamenta a apuração pelo Comitê Gestor | § 1º: com filiais, o recolhimento é feito pela matriz | dono, 1ª rodada, D3 |
| Res. 140 arts. 37 e 38 = PGDAS-D | 37 = vedação de incentivo fiscal; só o 38 é o PGDAS-D | dono, 1ª rodada, D3 |
| Res. 140 art. 40: DAS emitido exclusivamente pelo Portal | 40 = vencimento no dia 20 do mês seguinte. "Gerado exclusivamente" é o art. 42 (MEI pelo PGMEI, não PGDAS-D) | dono, 1ª rodada, D3 |
| Res. 140 "arts. 91–111 = regras do SIMEI" / composição no art. 92 | 91–92 = omissão de receita. O SIMEI começa no art. 100, a composição está no art. 101 | dono, 1ª rodada, D3; pedido da sessão |
| Res. 140 art. 18 = registro de recebíveis | 18 = cancelamento de documento fiscal | pedido da sessão |

### Não lido

- Res. CGSN 184 a 192: não estão no corpus nem foram baixadas nesta sessão. Citadas pelo dono (D3) como gabarito;
  **sem descrição do conteúdo**.
- Res. CGSN 165/2022: não lida.
- Anexo IX da Res. 140 (modelo do registro de valores a receber): só existe como PDF binário, não lido.

## Fato de código conferido (lido nesta sessão)

`simplesRegimeApuracao === 'CAIXA'` é lido **uma vez**, em `SimplesApuracaoService.montar` (ME/EPP,
`server/src/features/accounting/services/SimplesApuracaoService.ts:429`). Ali serve **só** para classificar o alerta
`NFSE_DIVERGE_RECEITA` como `INFO`/`REGIME_CAIXA`. `montarMei` passa `caixa: false` (linha 546), e `apurarSimei` não
recebe o campo. Conclusão: nem a base do DAS ME/EPP nem a do DAS-MEI mudam com CAIXA (grau V, leitura).

## Inconsistências das notas encontradas (não corrigidas aqui — fora do que as cédulas dizem)

- [[SIMEI-TAC-12]]: o frontmatter diz "F-TAC-6..10 RATIFICADOS (dono, 09/10)", o corpo diz "PENDENTES".
- [[X14]] (antes deste registro): o frontmatter dizia "#603 mergeado 10/10", o corpo dizia "#603 (sem merge)". O corpo
  foi reescrito aqui por causa da mudança de estado (D2).
