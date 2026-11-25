# Cobertura do Departamento Pessoal — Luminaris × mercado × obrigação legal (14/11/2026)

**Pergunta do dono:** quanto de DP temos, comparado com outros apps, e quanto precisamos abranger para automatizar 100%.
**Método:** 12 leitores Haiku (só coleta) em 5 rodadas; cruzamento feito pela sessão principal. Coleta bruta em [`coleta/`](coleta/) (concorrentes: `dp-concorrentes*`; obrigações: `dp-obrigacoes*`); textos oficiais em [`docs/`](docs/) (D01..D60, com SHA no `manifest.json`).
**Grau geral:** o estado do código é **verificado** (leitura do repositório + `git`/`gh`). "Sem encaixe" no plano é **verificado por busca de termo** em 10 docs do DP (mesmo método de 06/11: um item pode estar descrito com outra palavra). Concorrentes: ver legenda de fonte. Obrigações: **nenhuma é conclusão legal** — cada uma passa pelo método de `docs/operating-manual/VERIFICACAO-LEGAL.md` no BRIEF que a receber.

## 1. Resposta curta

| Medida | Valor | Grau |
|---|---|---|
| DP **executável** hoje na `main` | cadastro + vínculo versionado + dependentes + afastamento + implantação de férias + lançamentos + 19 rubricas + calculadoras puras. **Não calcula uma folha mensal de ponta a ponta** (PR-3..PR-6 do F2 não existem; 0 commits de DP desde 07/11) | verificado |
| Eventos eSocial S-1.3 **gerados** | **0 de 50.** Cinco códigos (S-1010, S-1200, S-2200, S-2300, S-5001) aparecem só em comentário/DTO/teste. Nenhum gerador de XML, assinatura, envio. (O gerador EFD-Reinf existe em `lib/reinf.ts`: 6 eventos) | verificado |
| Eventos eSocial no alvo | 50 no sumário oficial; **15 fora por desenho** (ente público, rural, avulso, CPRB, judicial de anotação, toxicológico) → **35 no alvo** | verificado (lista oficial) |
| Front-end de DP | **0 páginas** (6 arquivos de contrato gerado) | verificado |
| Planejado com encaixe (F2..F6, SST, opcionais) | cobre **quase** toda a lista legal e de mercado; **8 grupos de lacunas sem encaixe** (§4) | verificado por termo |
| Cobertura das 41 capacidades da §3 | **12%** feito em código (5/41) · **24%** feito + parcial (10/41) · **83%** com encaixe de plano (34/41) · **17%** sem encaixe (7/41) | contagem da tabela §3; as 41 linhas são escolha minha (agrupamento), não um padrão externo |

**Frase:** o Luminaris tem hoje a **fundação** de um DP (cadastros, vigência, parâmetros legais, rubricas, cálculos unitários) e um plano que cobre quase tudo; o que automatiza de verdade (folha mensal, 13º/férias/rescisão, eSocial, guias, ponto, SST) **ainda não existe em código**. Os concorrentes de folha documentam 25–31 áreas cada (Questor 31 seções); só nos itens de F0/F1 estamos no mesmo nível.

## 2. Contagem da matriz (§3)

41 capacidades. **Feito em main: 5** (linhas 1-5) · **Parcial: 5** (6, 10, 14, 24, 34) · **Planejado com encaixe: 24** · **Sem encaixe / só na spec externa: 7** (15, 36-41). Fora por desenho (não conta): doméstico, rural, avulso, servidor, CPRB; recrutamento, treinamento, performance (produto, não lei).

## 3. Matriz de capacidades

Legenda **Hoje**: F = feito em `main` · P = parcial · N = não existe. **Plano**: onde entra (F2 = BRIEF escrito, decidido, 4 PRs pendentes; F3..F6, SST = sem BRIEF; DP-x = módulo opcional `disponivel:false`). **Mercado**: quem documenta em fonte aberta — Q Questor, A Alterdata, S Senior, T TOTVS, K Sankhya, C Convenia, So Sólides/Tangerino, D Domínio (nenhuma rotina de folha achada), O Odoo/OCA (só `l10n_br_hr` e `l10n_br_hr_contract`: cadastro e campos de contrato; **sem addon de folha**), Fr Frappe (sem localização BR).

| # | Capacidade | Hoje | Plano | Mercado | Base legal lida |
|---|---|---|---|---|---|
| 1 | Trabalhador, vínculo versionado, categorias, dependentes | F | F0/F1 (#1041) | todos | eSocial S-2200 |
| 2 | Lotação, cargo, jornada (12×36, tempo parcial), sindicato, CCT como dado | F | F0/F1, F2 | Q A S T | CLT 58-A, 59-A, 611 |
| 3 | Afastamento (cadastro), períodos de férias, implantação | F | F1 | todos | CLT 129-134 |
| 4 | Pró-labore, estagiário, aprendiz, PCD (validações) | F | F1 | Q | Lei 11.788; CLT 428/429; Lei 8.213 art. 93 |
| 5 | Catálogo de rubricas + parâmetros legais com vigência (INSS, IRRF 2026, FGTS, mínimo) | F | F1/F2 | S Q | eSocial tabelas 03/04 |
| 6 | Motor mensal: snapshot, fatiamento, INSS progressivo, IRRF 2026, FGTS, salário-família, outro emprego, HE/noturno/DSR/faltas, adiantamento, divisor EC 141 | P (calculadoras puras PR-0..2; sem serviço de folha) | **F2 PR-3..PR-6** | todos | CLT 59/73; Lei 8.212/8.213; IN RFB 2.110; EC 141 |
| 7 | Adicionais insalubridade/periculosidade, desconto sindical, VT, PLR, gorjeta | N | F3 (decidido 06/11) | S T (PLR) | CLT 192/193; Lei 7.418; 10.101; 13.419 |
| 8 | Pensão alimentícia, consignado (Crédito do Trabalhador) | N | F3 | Q A S T | CPC 529; Lei 15.179/2025 (conversão da MP 1.292, confirmado no cabeçalho do Planalto) |
| 9 | 13º (integral, adiantamento, complementar), médias | N | F3 | Q A S T | Leis 4.090/4.749 |
| 10 | Férias: cálculo, coletivas, abono, programação, recibo | P (períodos e saldo; sem cálculo) | F3 | Q A S T | CLT 134-153 (redação Lei 15.371/2026) |
| 11 | Rescisão: tipos, TRCT, seguro-desemprego, FGTS rescisório, chave | N | F3 (TRCT), F4 (seguro-desemprego) | Q A S T | CLT 477, 484-A; Lei 8.036 art. 18; Lei 7.998 |
| 12 | Contrato de experiência/prazo determinado (vencimento, prorrogação) | N | F3 (L5) | Q T | CLT 443-445, 479 |
| 13 | Estabilidades provisórias ao desligar | N | F3 | — | Lei 8.213 art. 118; ADCT 10; Lei 15.371 art. 4º |
| 14 | Salário-maternidade, auxílio-doença, acidente | P (cálculo de afastamento 15 dias) | F3/F4 | Q A S | Lei 8.213 arts. 59-60, 71-73 |
| 15 | Folhas complementar/rescisão complementar/dissídio | N | **só na spec externa (Katz)** | Q S T | CLT 611 |
| 16 | eSocial tabelas (S-1000/1005/1010/1020/1070) | N | F4 | todos | MOS S-1.3 (prazos lidos) |
| 17 | eSocial periódicos (S-1200/1210/1298/1299) + totalizadores S-5001/02/03/11/12/13 | N | F4 / F5 | Q A T | MOS S-1.3 |
| 18 | eSocial não periódicos (S-2190/2200/2205/2206/2230/2298/2299/2300/2399) | N | F4 | todos | MOS S-1.3 |
| 19 | eSocial SST (S-2210/2220/2240; S-2221 fora) | N | SST | Q S T | MOS: S-2210 1º dia útil; S-2220/2240 dia 15 |
| 20 | Processo trabalhista (S-2500/2501/3500; S-5501/5503) | N | F4 (L1) | Q T | MOS S-1.3 |
| 21 | Assinatura A1, transmissão, retificação, exclusão S-3000, conferência de totalizadores | N | F4 (pipeline Null/Manual primeiro) | Q (Placar/Status/Guia de erros) | MOS S-1.3 |
| 22 | DCTFWeb | N | F5 | Q A T D | IN RFB 2.237/2.248 (prazo: último dia útil do mês seguinte desde 07/02/2025) |
| 23 | FGTS Digital (guia mensal e rescisória) | N | F5 | Q A T D | Manual FGTS Digital v1.50 (20/03/2026) |
| 24 | EFD-Reinf do DP | P (`lib/reinf.ts`, 6 eventos) | nó EFD-REINF | Q D | Manual Reinf v2.8 (ago/2026) |
| 25 | Comprovante anual de rendimentos | N | F5 (L3) | Q A | IN RFB 2.060/2021 |
| 26 | Contabilização, provisões 13º/férias, rateio | N | F5 (F-FOL-1..9 pendentes) | Q S T | — |
| 27 | Alerta de cota aprendiz/PCD e Relatório de Transparência Salarial | N | F5 | — | Lei 14.611 art. 5º (publicação mar/set; multa até 3% da folha); IN GM/MTE 6/2024 |
| 28 | Ponto: REP-C/A/P, AFD/AEJ, banco de horas, HE | N | DP-PONTO (opcional, sem BRIEF) | Q A S So Pontomais | CLT 74; Portaria 671 compilada arts. 76-85 |
| 29 | SST programas: PGR (NR-1), PCMSO/ASO (NR-7), LTCAT, PPP, ficha de EPI (NR-6), CIPA (NR-5) | N | SST (sem BRIEF) | Q S T K | NR-1 (psicossocial no PGR **em vigor desde 26/05/2026**), NR-6 (Port. MTP 2.175/2022), Decreto 3.048 art. 68 |
| 30 | Benefícios VR/VA/saúde, PAT | N | DP-BEN | S C D T | Lei 14.442/2022; Decreto 10.854/2021 |
| 31 | Pagamento (remessa CNAB/PIX) | N | DP-PAG | A (Remessa Bank), Fortes (FortesPay) | — |
| 32 | Autoatendimento: holerite digital, férias, app, assinatura, WhatsApp | N | DP-APP / DP-GED | todos | Lei 14.063/2020 |
| 33 | Admissão digital (pré-admissão, documentos) | N | DP-ADM | K C So Gupy | MOS: S-2190/S-2200 |
| 34 | Importação da folha de outro sistema | P (implantação de férias, outras remunerações) | PES-1 (caminho de migração) | S (Migrador eSocial) | — |
| 35 | Analytics/BI, relatórios gerenciais | N | DP-BI | S K C | — |
| 36 | Licença-paternidade e salário-paternidade (10 dias a partir de **01/01/2027**; 15 em 2028; 20 em 2029) | N | **sem encaixe** | — | Lei 15.371/2026 art. 11 e 14 |
| 37 | Contrato intermitente (convocação, férias e 13º no recibo) | N | **só na spec** | Q | CLT 452-A |
| 38 | Teletrabalho e controle de jornada (CLT 75-A..E; EC 141 art. 8º) | N | **sem encaixe** | — | CLT 75-A a 75-E; EC 141 |
| 39 | Qualificação cadastral (CPF/NIS) antes do S-2200 | N | **sem encaixe** | T (Qualificação Cadastral), Gupy | MOS (pré-requisito) |
| 40 | Transferência de empregado entre estabelecimentos/empresas e sucessão de vínculo | N | **sem encaixe** | Q T | MOS S-2200 (sucessão) |
| 41 | Simulação (rescisão, férias) e cálculo automatizado | N | **só na spec / fora por produto (06/11)** | Q A S | — |

Fora do alvo, por decisão registrada (06/11 e PRE-ADR): doméstico (`special-categories`), rural PF, avulso, servidor/RPPS, CPRB; recrutamento, treinamento, avaliação de desempenho.

## 4. O que não tem encaixe no plano (candidatos a lacuna)

Cada linha: evidência de **ausência do termo** em PRE-ADR-DP, PRE-ADR-PESSOAL, BRIEFs F0/F1 e F2, PRE-ADR-FOLHA-CONTABILIZACAO, spec Katz, nota PES-4 e as decisões de 02/11 e 06/11.

| ID | Lacuna | Evidência |
|---|---|---|
| G1 | **Licença-paternidade/salário-paternidade (Lei 15.371/2026), vigência 01/01/2027** — Go-live é em 2027, então vale desde o primeiro dia; altera CLT arts. 131/134 e Lei 8.213 art. 28 | 0 ocorrências de "paternidade" nos docs do DP; acervo traz "Vide Lei 15.371" em CLT 134, 392 e correlatos |
| G2 | **NR-1: riscos psicossociais no PGR** (em vigor desde 26/05/2026, §6 item 1) | 0 ocorrências de "psicossocial"; SST só lista PGR/PCMSO/LTCAT/PPP/EPI |
| G3 | **S-2306, S-2555 e S-1280** nunca citados; S-2399 citado 1 vez | busca por código nos 10 docs (S-1280 é CPRB, fora por desenho; S-2306 e S-2555 não) |
| G4 | **Qualificação cadastral** (pré-requisito do S-2200) | 0 ocorrências |
| G5 | **Aviso prévio, médias, rescisão complementar, férias proporcionais** como itens nomeados da rescisão (F3 sem BRIEF) | 0 ocorrências de "aviso prévio"; "médias" só 3 (spec/F2) |
| G6 | **Intermitente, teletrabalho** | intermitente só na spec; teletrabalho 0 |
| G7 | **Transferência/sucessão** entre estabelecimentos e empresas | 0 ocorrências |
| G8 | **Intervalo suprimido (CLT 71), sobreaviso/prontidão, guarda e prescrição de documentos** | 0 ocorrências de "intervalo", "sobreaviso", "prescri" |

## 5. Mudanças desde o cruzamento de 06/11 (`D-2026-11-06-DP-ESCOPO-LACUNAS`)

- **Confirmado:** todas as lacunas L1..L7 de 06/11 continuam procedentes e com o mesmo encaixe; nenhuma foi retirada.
- **Novo (G1..G8 acima):** nenhuma estava na lista de 06/11.
- **Novo no mundo:** EC 141/2026 (já tratada, 22 ocorrências); Lei 15.371/2026 (G1); Lei 15.377/2026 (obrigação de informar campanhas de saúde, CLT 169-A e 473 §3º — **vigência não lida**); Portaria Consolidada MTE 1/2025 (vigência 02/01/2026: RAIS/CAGED passam pelo eSocial, arts. 18-19; revoga arts. 2-23 e 140-184-F da Portaria 671); DIRF extinta; IN RFB 2.248/2025 muda o prazo do DCTFWeb.
- **Estado do F2:** o `PES-4` lista PR-3..PR-6 como pendentes; confere com o código. Os PRs #1125-#1129 constam como *Closed* no GitHub, mas entraram na `main` pelo squash `d85e86917` (#1132).

## 6. Ambiguidades — todas resolvidas pelo texto (14/11/2026, 2ª passada)

Itens 1-3 conferidos por mim nos textos oficiais baixados hoje (D32, D33, D34, D22 e a LC 95 do acervo). Itens 4-6 vêm da leitura dos leitores (SIJUT/PDF oficiais) e não foram relidos por mim.

1. **NR-1 — vigência do PGR com riscos psicossociais: 26/05/2026.** Não havia divergência de fato. A Portaria MTE 765/2025, art. 1º, diz "Prorrogar **até** 25 de maio de 2026, o início da vigência" da redação de 1.419/2024: o regime antigo vale **até** o dia 25, e a nova redação passa a valer no dia seguinte. O PDF oficial da NR-1 no gov.br (D34, baixado hoje) diz: "Entra em vigor em 26 de maio de 2026 (Portaria MTE nº 765, de 15 de maio de 2025)". O mesmo PDF usa a mesma convenção para o prazo anterior: a Portaria 344 vem como "vigente até 25 de maio de 2025" e a 1.419 como "vigência em 26 de maio de 2025". O cabeçalho do PDF lista os atos até a Portaria 765/2025 e nenhum posterior. **Já em vigor desde 26/05/2026** (hoje é 14/11/2026), então G2 não é prazo futuro: é obrigação vigente que o módulo SST precisa cobrir.
2. **EC 141/2026 — não é divergência, é vacatio.** O Planalto (D32, compilada) já traz o inciso XIII com a nova redação ("40 (quarenta) horas semanais … Redação dada pela Emenda Constitucional nº 141, de 2026") e mantém o inciso XV com o texto antigo + "(Vide Emenda Constitucional nº 141, de 2026) (Vigência)". O motivo está no art. 10 da EC: I — o inciso XV (repouso de 2 dias) entra em vigor "após decorridos 2 (dois) meses de sua publicação"; II — o resto, "na data de sua publicação". O acervo só espelha o Planalto. **Datas** (publicação: DOU 16/10/2026, edição extra): a LC 95/1998, art. 8º, §1º — "a contagem … far-se-á com a inclusão da data da publicação e do último dia do prazo, entrando em vigor no dia subseqüente à sua consumação integral" — vale para emendas pelo parágrafo único do art. 1º (aplica-se aos "atos normativos referidos no art. 59 da Constituição", e o art. 59, I, é a emenda). Dois meses a contar de 16/10 (inclusive) consumam-se em 15/12/2026, então **o inciso XV, as cláusulas incompatíveis sem efeito (art. 3º) e o limite de 42 h (art. 6º, I) valem de 16/12/2026**; o limite de 40 h (art. 6º, II: "1 (um) ano após o decurso do prazo" do inciso I) vale de **16/12/2027**. Isso coincide com F-DPF-1 (divisor pela escala desde 16/12/2026). As datas de 15 e 17/12 que aparecem em fontes secundárias não têm base no texto. Risco que sobra: um tribunal contar pelo Código Civil (art. 132, §3º, que exclui o dia do começo) e chegar a 17/12; a LC 95 é a regra específica de vacância, então é a leitura mais segura, mas não é decisão judicial.
3. **Crédito do Trabalhador — a Lei 15.179/2025 é a conversão da MP 1.292/2025.** O cabeçalho da lei no Planalto (D33) diz literalmente "Conversão da Medida Provisória nº 1.292, de 2025" e a ementa "Altera a Lei nº 10.820 … (Lei do Crédito Consignado)". A dúvida do acervo era só de marcação (`versao_texto: "original"`, ementa sem citar a MP).
4. Anexo V da NR-16: o de 2014 está anulado por decisão judicial; o vigente é o de 2.021/2025 (leitor R4-B).
5. Prazo do DCTFWeb: o caput do art. 6º passou de "dia 25" para "último dia útil do mês seguinte" pela IN RFB 2.248/2025, vigência 07/02/2025 (SIJUT, leitor R4-A); o manual do DCTFWeb de 01/2025 concorda.
6. Cálculo do DAS (RBT12) em 2027: efeitos em 01/01/2027 (Res. CGSN 190, art. 9º); 01/11/2026 vale só para o art. 1º da Res. 191, que trata de NFS-e (leitor R4-A). **Atualização 25/11/2026:** a Res. CGSN 196/2026 (DOU 24/11) deu nova redação ao art. 9º da 190 (I – imediatamente para os arts. 144-D/144-E; II – 01/01/2027 para o resto) e revogou o art. 6º da 190: os Anexos I–V de 2027 são agora os da 196, com os mesmos números (dossiê `pesquisas-legais/dp-tabelas-irrf-das-sst`).

## 7. Lacunas de pesquisa (o que continuou sem fonte aberta)

- **Concorrentes:** Domínio (nenhuma rotina de folha), Tangerino (hoje é a Sólides; nenhuma página do produto próprio), TOTVS (rotinas GPEM/TRCT só por trecho de busca; lista de eventos por rotina não aberta), Fortes (só home), Pontomais (só marketing), Senior (6 de 8 consultas por tópico não feitas), Feedz (bloqueio 402).
- **Obrigações:** prazo de guarda do registro de ponto (não achei em nenhuma das duas portarias); holerite digital (sem norma do MTE); portarias do PAT (Port. MTP 672/2021, MTE 1.707/2024 — só fonte secundária); Notas Técnicas EFD-Reinf 01-03/2026; leiaute do totalizador de S-1207 e S-1260..1280. **Fechado em 25/11/2026** (dossiê `pesquisas-legais/dp-tabelas-irrf-das-sst`, relatório §1 e §5): tabelas mensais do IRRF (IN RFB 1.500 Anexos II, VI e X) e faixas/repartição do DAS 2027 (Anexos I–V da Res. CGSN 140 na redação da **Res. CGSN 196/2026**, que revogou o art. 6º da 190) transcritas e conferidas contra `legal_parameters_retencoes_v1.sql` e `legal_parameters_simples_v1.sql`, sem divergência de valor (60/60 linhas do Simples 2027); texto da IN PRES/INSS 128/2022 arts. 272–285 (LTCAT/PPP; extraído do Portal IN do INSS, compilado até a IN 212/2026); Quadro I da NR-5 e Anexo II da NR-4 transcritos por coordenada do PDF. Lacunas novas: L-20261125-195439-09b7 (teto do ISS na 6ª faixa sem o IBS), L-20261125-195502-411d (resto da Res. 196 não mapeado), L-20261125-195503-a785 (reler 8 dossiês da Res. 140).
- **Dossiê:** o `manifest.json` ainda lista o D12 (download errado: o `rfb:2237` baixou o ADE 69/2000, porque `idAto` não é o número do ato). Os arquivos foram removidos de `docs/`; o IN 2.237 correta é o `idAto` 141910 (D13).

## 8. Próximo passo sugerido

**Feito em 14/11:** G1..G8 estão encaixados em F3, F4, F5, SST e DP-APP, pela lei e sem questionário (dono, chat), em `docs/plano/decisoes/D-2026-11-14-DP-ESCOPO-LACUNAS-2.md`, e o nó PES-4 foi atualizado. Falta commitar (nada foi commitado). Em seguida vêm os BRIEFs de F3, F4, F5 e SST, cada um com a verificação legal dos itens "a ler no BRIEF". O `executa` do F2 (PR-3..PR-6) segue valendo e é o maior bloco de "automação real" que falta.
