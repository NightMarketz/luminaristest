# BRIEF de grupo: lacunas do Simulador Tributário do Salão (24/11/2026)

- **Item:** o grupo "simulador-salao" da caixa de lacunas. São 44 lacunas não finais que tocam o artifact
  `4T2JYWqnJXm9e6p2aUfDLu`, o dossiê `pesquisas-legais/parecer-salao-sp-4-pessoas/` e os dossiês `pesquisas-legais/salao-*`.
  Lista e estado na tabela do §5.
- **Autorização:** `docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md`, emenda de 21/11 (2), item 6. O dono pediu:
  *"Planeja como resolver tudo no macro em vez de vários remendos"*. Sobre executar um BRIEF de grupo sem fork:
  *"Sim, executa"* (dono, chat, 21/11).
- **Fato consumado que este BRIEF respeita.** `D-2026-11-21-SIMULACAO-COMPLETA-PRE-ADR`, no PR #1332, ainda aberto. **Este PR
  depende do #1332**: a decisão citada só existe lá. Mergeie o #1332 primeiro.
  - **F-SIM-1 (c):** a simulação vive no produto, e a página é o protótipo.
  - **F-SIM-6 (a+b):** os valores padrão vêm de pesquisa com fonte e faixa, e o kit setorial os carrega.
  - **F-SIM-7 (a):** o resultado calculado com padrão sai como faixa.
  - **F-SIM-8:** a página **congela depois da rodada de texto em curso**. A rodada em curso era a revisão de conteúdo de
    21/11 (patch p11).
- **Nós vizinhos:**
  - `SIMULACAO-CENARIO`: PRE-ADR, nota do nó e BRIEF do PR-0, todos no #1332.
  - `EFICIENCIA-FISCAL`: montador único. A lacuna b34e (as duas implementações divergem) pertence a esse nó, não a este grupo.
  - A emenda "país na borda" dos BRIEFs com executa (D-2026-11-24 §6, PR #1331).

## 1. As causas comuns

**C1. A fonte da verdade da página ficava fora do git.** Três sintomas mostram isso:
- A página era editada por patches aplicados em scratchpads e publicada de lá.
- A cópia do repositório tinha ficado na v38 (lacuna 99cc).
- Os patches, a bateria de testes e onze dossiês ficaram como arquivos não rastreados em três worktrees: 4e7d, 4f67 e as 16
  da rodada `revisao-conteudo-simulador`, paradas porque o p11 "esperava o item 7" quando o item 7 já estava no ar (v48).

O conserto estrutural:
- o repositório passa a ser a fonte da publicação, em `artefatos/simulador-tributario-salao.html`;
- o `.gitattributes` com `-text` mantém os bytes iguais aos publicados;
- cada publicação fica registrada com o id da versão e o SHA-256 em `artefatos/PUBLICACOES.md`;
- os patches e os testes ficam versionados em `simulador-salao-pendencias/`.

**C2. A página congelou (F-SIM-8), mas as lacunas continuavam apontando para ela.** Toda lacuna que pede mudar a **conta** da
página vira requisito do motor do produto (`SIMULACAO-CENARIO`). Ela não volta para a página. Isso não é fork: é a
F-SIM-1/8. O fork que sobra é o que a página congelada **diz** sobre os defeitos conhecidos (F-G1).

**C3. Pesquisa legal pendente que nenhuma sessão despachou.** Essas lacunas não dependem da página nem do motor: o produto de
cada uma é um dossiê pelo método (`docs/operating-manual/VERIFICACAO-LEGAL.md`). Os parâmetros que saírem delas vão para o
kit setorial do salão no motor (F-SIM-6).

## 2. Checklist

### Feito neste PR (C1, mais a rodada de texto em curso)
1. Os onze dossiês e a pasta `simulador-salao-pendencias/` da worktree `implicit-state-machines-inventory-e766ea` foram
   copiados sem alteração. Prova: `diff -rq` vazio contra a origem.
2. Os quatro dossiês da worktree `roda-maestro-dia-099ee9` foram copiados sem alteração: `clt-466-comissao-parcelada`,
   `lc123-opcao-cbs-ibs-prazo`, `lc214-simples-prazo-opcao` e `lc227-simples-cbs-ibs-prazo`. A análise deles continua em
   branco (é o item 10).
3. p11 (revisão de conteúdo, R01 a R26) aplicado sobre a v48, a versão no ar, que é byte a byte a `simulador-v48.html`
   (sha 4092130a…).
   - No CALC muda só o rótulo "A.069 e A.050" (diff do bloco `const T3=` … `/* ===== /CALC`).
   - `testes/tm-meses.js` dá 311 casos e 0 falhas, com saída idêntica à da v48.
   - `testes/pg-meses.js` dá 960 casos e 0 falhas, sem erro de script.
4. **p12** (NFS-e fora do Simples, lacuna fe42). O p11 deixava "o emissor que a Prefeitura exigir". O p12 usa a regra do dossiê
   `nfse-paulistana-adaptador` [D09]:
   - o salão que já foi do Simples fica no Emissor Nacional (IN SF/SUREM 10/2011 art. 1º-A § 2º, red. IN 13/2026);
   - o que nunca foi do Simples emite a NFS-e Paulistana (art. 1º; grau inferido forte no dossiê).
5. **Teste novo `testes/tx-p11.js`.** Abre as 11 abas em S26, PR26, RE26, RE27 e SR27 e confere os textos do p11 e do p12.
   - Na v48: 12 falhas, ou seja, o teste pega a falta dos textos.
   - Na v49: 0 falhas e 0 erros de script.
   - A 375 px, os quatro KPIs do topo ficam em `nowrap` e sem corte (lacuna a579).
6. A v49 (v48 + p11 + p12) foi publicada. Depois disso, a conferência achado a achado do
   `REVISAO-CONTEUDO-2026-11-21.md` mostrou três pontos ainda abertos da mesma rodada. O **p13** fecha os três:
   - R18 (b9d2): uma frase só para os 25% × 18%, na ficha e nos Insumos, pela Lei SP 6.374 art. 34 § 5º item 3 vigente
     (insumos D17). A frase inclui os códigos 33.07.10.0100 e 33.07.90.0500 e o bronzeador, que nenhuma das duas trazia.
   - R21 (300d): o glossário da aba 1 ganha GARE, CPR 1200, FPAS, DCTFWeb, VRE e MOS.
   - R05 (fe42): a ressalva de grau no ramo "nunca optou → Paulistana" e o alcance certo do § 2º (o optante que depois sai).

   Os números R22 a R25 não existem no relatório: a numeração pula de R21 para R26. A **v50** (v49 + p13) saiu de
   `artefatos/simulador-tributario-salao.html`. Versões e SHA-256 estão em `artefatos/PUBLICACOES.md`.
   **Depois da v50, a página congela (F-SIM-8).**
   - Testes na v50: `tm-meses` 311/0, com saída idêntica à da v48;
   - `pg-meses` 960/0;
   - `tx-p11` 32/0, contra 17 falhas na v48;
   - CALC idêntico ao da v49.

### A executar depois da resposta aos forks (uma sessão de pesquisa por linha; cada uma termina num PR de `pesquisas-legais/`)

| # | Lacuna | Pesquisa (dossiê novo, pelo `legal.py`) | Prova de pronto |
|---|---|---|---|
| 7 | c574 | FPAS 515: quadro do art. 577 da CLT (fonte oficial), DL 9.853 (Sesc) e DL 1.146 (Incra), compilados | `legal.py relatorio` com o grupo da CNC citado [Dnn]; a ficha diz "inferido" ou "verificado" |
| 8 | f88e | Piso de 2026 por função (CCT SP006651/2026 cl. 4ª e 5ª, texto de 2026 do Mediador; o D56 do parecer é o de 2025/2026). Barbeiro e pedicure ficam em qual grupo? | Tabela da cláusula transcrita no relatório, com [Dnn] |
| 9 | 0952 | Anexo da LOA 2026 com o demonstrativo de gastos tributários (LC 224 art. 4º §§ 2º I e 4º I; Decreto 12.808): o art. 2º da Lei 10.147 consta ou não | Trecho literal do anexo, ou "não consta" com a fonte lida |
| 10 | 4f67 | Preencher a ANALISE dos quatro dossiês do item 2: comissão parcelada (CLT art. 466 § 1º) e prazo da opção pela CBS/IBS (LC 123 art. 13 §§ 10 e 11; LC 214; LC 227) | `relatorio.md` sem o texto-modelo "_Resposta direta…_" |
| 11 | ec55 | IN RFB 2.003 art. 3º: ECD no Presumido (distribuição acima do teto) e no Real | Conclusão por regime com [Dnn] |
| 12 | f821 | Subitens 6.02 (estética, depilação) e 6.03 (massagem): Anexo III sem fator r, ou fator r (LC 123 art. 18 §§ 5º-B a 5º-M; Res. CGSN 140; soluções de consulta) | Conclusão por subitem; se houver fator r, vira requisito do motor (item 19) |
| 13 | 368c | DIFAL do material de uso e consumo do contribuinte do regime normal de SP (RPA): alíquota interestadual real, apuração e prazo (RICMS/SP) | Regra com artigo; requisito do motor (item 19) |
| 14 | 7c15 | RICMS/SP art. 566 (vencimento em dia sem expediente) | Artigo baixado; o calendário do motor usa a regra lida |
| 15 | 6aa2 | Regulamento do IBS, versão 2 (CGIBS, 10/11/2026): se já saiu, o art. 45 (prazo) mudou? | Resolução lida, ou "não publicada em <data>" com a página consultada |
| 16 | 43d7 · 37f3 | Leiaute da NFS-e nacional de 2027 (a nota conjunta separa as cotas?) e a responsabilidade do salão pela CBS/IBS do parceiro pessoa física (LC 214 art. 24 × Lei 12.592 § 3º) | Conclusão com [Dnn]; ambiguidade descrita se não houver regra |
| 17 | bfa2 | Artigos de energia elétrica do Decreto 12.955 (crédito de CBS/IBS) | Artigos lidos; confirma ou corrige o art. 47 da LC 214 |
| 18 | 95f3 | O Decreto 3.048 mudou desde 20/11: reler o Anexo V (RAT do CNAE 9602-5/01), citado como D40 | `legal.py baixar` com o texto novo e a conclusão "vale" ou "muda" |

### Requisitos do motor (C2, nó SIMULACAO-CENARIO; não é código desta sessão)
19. A planejadora do `SIMULACAO-CENARIO` recebe estas lacunas como requisitos, cada uma com o caso que a página erra e o teste
    que o motor tem de passar:
    - 38c0: ICMS normal da revenda no Simples impedido;
    - 967b: uma só convenção para o crédito de CBS/IBS de 2027, com o preço com ou sem tributo;
    - 883f: estabilidades da CCT na provisão de rescisão;
    - 60ca: valores padrão por pesquisa, com faixa (F-SIM-6/7);
    - f821 e 368c, depois dos itens 12 e 13;
    - as fatias p10f (visão de caixa), p10g (importação CSV) e p10h (PDF do PGDAS-D e sistema de caixa) do item 7. O dono as
      escolheu em 21/11 (F7, `DECISOES-2026-11-21.md`), mas a página congelou antes delas. A F-SIM-3 (entrada em camadas)
      do #1332 é onde elas cabem.

    Prova: o BRIEF do motor cita os ids. Este grupo não edita aquele BRIEF (regra 1 da sessão de planejamento).

## 3. Contratos

- **Publicação da página.** O arquivo do repositório tem os mesmos bytes da versão no ar.
  - Cada publicação acrescenta uma linha a `artefatos/PUBLICACOES.md`: `| data | versão | sha256 | bytes | base + patches | testes |`.
  - Quem publicar de outro lugar quebra o contrato. A prova é `sha256sum artefatos/simulador-tributario-salao.html` igual ao
    da última linha.
- **Patch.** `patches/pNN_*.py <html>`, troca exata com contagem conferida (`_pt.aplica`): se o trecho não casar o número
  esperado de vezes, o patch para.
- **Dossiê.** O formato do `legal.py relatorio`: conclusão, fundamentação, vigência, ambiguidades, lacunas e fontes com
  hash.

## 4. Forks (RATIFICAÇÃO PENDENTE)

**F-G1. O que a página congelada diz sobre os defeitos de conta já conhecidos.** São quatro:
- 38c0: no Simples impedido, a conta não cobra o ICMS normal da revenda;
- 368c: o DIFAL do optante é aplicado também no Presumido e no Real;
- 967b: o crédito de 2027 usa duas convenções;
- 60ca: o exemplo nasce com custos zerados.

Caminhos:
- (a) uma última linha de texto na página (no "O que esta conta supõe" e no aviso do exemplo) que nomeia cada limite e diz
  que a conta certa vai ao motor do produto;
- (b) corrigir a conta na página antes de congelar;
- (c) nada; a página já é só protótipo.

**Recomendação: (a).** É estrutural dentro do F-SIM-8: a correção vive no motor (item 19), e a página não engana quem a lê
nesse meio-tempo. A (b) reabre a página que o dono congelou e duplica a conta que o motor vai ter (a mesma divergência da
lacuna b34e). A (c) deixa números errados sem aviso numa página publicada.

## 5. Pendente de validação externa (contador; não é fork do dono)

| Lacuna | O que perguntar | Leituras possíveis |
|---|---|---|
| ca7a | *"No Presumido de 2027, o teto do lucro isento sem escrituração (IN RFB 1.700 art. 238 § 2º I) desconta IRPJ, CSLL, PIS e Cofins. Com PIS e Cofins extintos, CBS e IBS entram no desconto?"* | (i) só IRPJ e CSLL (letra da norma; é o que a página usa); (ii) CBS e IBS no lugar de PIS e Cofins (finalidade). A página mostra as duas. |
| e9c8 | *"Locatário no regime regular, locador no regime de 3,65% da LC 214 art. 487: o crédito de CBS/IBS do aluguel é cheio ou limitado ao que o locador recolhe?"* | Nenhuma regra expressa foi achada (dossiê `salao-2027-premissas-fora-simples`, Ambiguidade 2). A página supõe crédito cheio. |
| 2c8a | Gate do dono: um mês real de salão (PGDAS-D, folha, maquininha) para comparar linha a linha. | Fica `com-dono`; reabre quando houver o dado. |

## 6. Insumos ausentes
- O texto de 2026 da CCT SP006651/2026, cláusulas 4ª e 5ª. O parecer tem o resumo de 2025/2026 (D56) e o aditivo
  SP009373/2026.
- O anexo de gastos tributários da LOA 2026.
- O leiaute da NFS-e nacional de 2027.
- A versão 2 do regulamento do IBS.

## 7. Achados fora de escopo
- **59df.** O acervo `ctresb/leis` marca a Lei 9.249 art. 13 I como revogado, e o Planalto o traz em vigor. O dossiê
  `salao-lucro-real-adicoes-exclusoes` já usa o Planalto (D10), então para o simulador não há efeito. O risco é das outras
  pesquisas: é assunto da ferramenta `legal.py` e do acervo, não do simulador. A lacuna volta a `aberta` com esse destino.
- **cf77** (dossiê `emissao-mei-me-por-tipo`) e **b34e** (montador único) apareceram no filtro, mas não são deste grupo.

## 8. Mapa lacuna → item → estado depois deste PR

| Lacuna | Item | Estado |
|---|---|---|
| 8890 3c1b d3bf 693c a600 7ebe 2945 38c6 ee62 079e add7 db88 c365 (rodada) | 3, 5, 6 (p11 na v49) | resolvida |
| b9d2 300d (rodada) | 6 (p11 + p13 na v50) | resolvida |
| fe42 (rodada) | 4, 6 (p12 + p13 na v50; o ramo da Paulistana fica com grau "leitura da pesquisa") | resolvida |
| a579 | 5 (KPI a 375 px; marcador `kpis-375 v1/v2` desde a v48) | resolvida |
| a3a5 | já na v48: `normaliza(partilha3…)` e o texto "as fatias são reescaladas" (decisão de 21/11) | resolvida |
| 445d | já na v48: `presTot` não existe mais (grep = 0) | resolvida |
| bbc7 | já na v48: `mono-das v1` (guiaDAS segrega o monofásico) | resolvida |
| 3f49 | já na v36+: `regimes()` cobra o ICMS da revenda no Presumido e no Real (`regime-fora v1`) | resolvida |
| 4f10 | já na v44+: `calReg` com o ICMS no dia 20 (RICMS art. 112) e o IBS no último dia útil (Res. CGIBS 6/2026 art. 45) | resolvida |
| 4e7d | a cópia de `main` (#1309) é a canônica; a de `git-commit-auth-repeat-3da007` é mais velha (o D37 dela virou D40) | resolvida |
| 99cc | 6 (cópia = versão no ar); a conferência do PGDAS-D entra pelo #1332 | em-pr |
| c574 f88e 0952 4f67 ec55 f821 368c 7c15 6aa2 43d7 37f3 bfa2 95f3 | 7 a 18 (já planejadas; o conteúdo não depende do F-G1, só a regra do BRIEF com fork) | aberta, esperando o fork L-20261124-035723-5d95 |
| 38c0 967b 883f 60ca | 19 e F-G1 | aberta, esperando o fork 5d95 |
| ca7a e9c8 | §5 (contador) | com-dono |
| 59df | §7 | aberta (fora do grupo) |
| 2c8a ea2b | com o dono antes deste BRIEF | sem mudança |

## Write-set
- Este PR (depende do #1332): `pesquisas-legais/{revisao-conteudo-simulador-salao,salao-*,simulador-salao-pendencias,clt-466-comissao-parcelada,lc123-opcao-cbs-ibs-prazo,lc214-simples-prazo-opcao,lc227-simples-cbs-ibs-prazo}/**`
  e, em `pesquisas-legais/parecer-salao-sp-4-pessoas/artefatos/`: `simulador-tributario-salao.html`, `.gitattributes` (só
  para esse arquivo) e `PUBLICACOES.md`.
- Itens 7 a 18: um `pesquisas-legais/<slug-novo>/**` por item.
- Nenhum choke point (PAR-001).
