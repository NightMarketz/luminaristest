# Pendências que o vault aponta, conferidas contra o repo — 24/11/2026

Junta os dois índices que o vault do Obsidian gerou em 23/11:
- `pendencias-fiscais-2027-indice`: pendências fiscais e legais abertas;
- `pendencias-com-data-antiga-2026-11`: notas com pendência e data anterior a 01/11.

Os índices foram escritos **antes** das correções de memória de 23/11 e do lote de merge de 24/11. Por isso a coluna
"Estado em 24/11" foi conferida contra o repo (`origin/main` `d3f3a201c`) e o GitHub. As 24 linhas marcadas "(26/11)" ou
conferidas pela lacuna `L-20261124-121627-ad6e` usam a base `origin/main` `40b6ab8f4`. As referências de linha das notas
foram tiradas, porque mudaram quando as notas receberam os avisos de 23/11.

**Legenda do estado:**
- **resolvido** / **superado** / **ratificado**: conferido no arquivo ou no PR citado.
- **falso positivo**: o trecho não descreve uma pendência.
- **vigente, conferido (26/11)**: a norma foi lida na redação vigente, com artigo, e o código ou o BRIEF foi comparado
  com ela.
- **não achado**: procurado em fonte oficial e não encontrado, e isso está dito.
- **adiado, com gatilho** / **segue fork do dono**: não há o que conferir até o gatilho ou a decisão.
- **não conferido** (nesta passada): era o estado de 24 linhas em 24/11. Em 26/11 todas ganharam estado novo na pesquisa
  legal da lacuna `L-20261124-121627-ad6e`, pelo método (`docs/operating-manual/VERIFICACAO-LEGAL.md`). O estado novo
  está na própria linha, e as fontes, os trechos e os achados estão em
  `pesquisas-legais/pendencias-vault-ad6e/relatorio.md`.

Relatório irmão: `docs/RELATORIO-DECISOES-LUMINARIS-2026-11-24.md`.

---

## 1. Pendências fiscais e legais (índice fiscal 2027)

| Pendência | Nota de origem | Tipo | Estado em 24/11 |
| :--- | :--- | :--- | :--- |
| PRE-ADR do Simples com 13 forks F-SN-0..12 pendentes (PR #452, Proposed) | `simples-nacional-2027-lc214-muda-calculo` | forks | **resolvido:** #452 mergeado em 29/09. PRE-ADR Accepted em 07/10, com 14 forks F-SN-0..13 ratificados (`D-2026-10-07-SIMPLES-FORKS`) |
| RBT12 passa a 12 meses antecedentes ao mês anterior ao PA (art. 18 § 1º novo) | `simples-nacional-2027-lc214-muda-calculo` | vigência | **vigente, conferido (26/11):** LC 123 art. 18 § 1º e § 1º-A I, red. LC 214 art. 517, efeitos em 01/01/2027 (art. 544 III, red. LC 227), e Res. 140 art. 21 II "a", red. Res. 190, que a 196 não revogou. O código usa a mesma janela M−13…M−2 desde 2027-01 (`simplesCalc.ts:198-201`). O fator r soma folha e receita dos mesmos meses (`fatorR`, `:264-288`; Res. 140 art. 26, red. Res. 190). Sem divergência. A soma multiunidade é outra lacuna (976c, em sessão) |
| Nova redação do § 3º omite a opção pela receita recebida ("caixa acaba" é inferido) | `simples-nacional-2027-lc214-muda-calculo` | vigência | **vigente, conferido (26/11); o inferido vira verificado:** o § 3º novo diz só "receita bruta auferida no mês" (LC 214 art. 517). A Res. 140 art. 16, red. Res. 190, diz o mesmo, com efeitos em 01/01/2027 (Res. 190 art. 9º II, red. Res. 196 art. 4º). O não recebido em 31/12/2026 vai a dez/2026 (art. 144-C, incl. 196). A linha `MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES` já cita essa fonte (`server/prisma/data/legal_parameters_marco_legal_v2.sql`) |
| Anexos XVIII–XXII: partilha muda de 2029 a 2032; anomalia "14,93%" × "14,92537%" no Anexo XX | `simples-nacional-2027-lc214-muda-calculo` | vigência | **vigente; a anomalia não afeta o cálculo (26/11):** a partilha ano a ano de 2029 a 2032 está na LC 214 Anexo XX, red. LC 227, e no Anexo III da Res. 196 (os outros anexos da 196 não foram abertos aqui). A paridade da semente com eles é o item 4 do BRIEF #1436. O "14,93%" é o rótulo da linha; a frase diz "14,92537%" (= 5/33,5), na LC e na Res. 196. O código não lê o limiar: dispara o teto quando o ISS passa de 5% (`simplesCalc.ts:397`), e o gerador toma o limiar da frase (`gen-simples-anexos.mjs:18-19`). Divergência já conhecida no mesmo anexo: a nota (*) de 2027–28 diz "federais" e o art. 18 § 1º-B I diz "federais e IBS" (lacuna 09b7, itens 1–2 do BRIEF #1436) |
| Art. 25: declaração mensal e "declaração assistida"; DEFIS anual pode acabar (inferido) | `simples-nacional-2027-lc214-muda-calculo` | vigência | **vigente, conferido (26/11); "a DEFIS acaba" verificado.** A LC 123 art. 25, red. LC 214 art. 517, cria a declaração mensal e a assistida. A Res. 190 art. 8º XXI revoga a DEFIS (art. 72) em 01/01/2027. O bloco socioeconômico do ano anterior vai ao PGDAS-D de jan a mar (art. 38-B § 1º); a 196 só acrescentou o § 2º-A. A DEFIS do AC 2026 vence em 31/03/2027 (art. 144-F). **Divergência na caixa:** `L-20261127-005504-79dc` (sem espelho do bloco do AC 2027; mensagem "aguarda regulamentação") |
| Salão (LC 116 itens 6.01–6.03) no Anexo III sem fator r (inferido), pergunta ao contador | `simples-nacional-2027-lc214-muda-calculo` | contador | **pesquisado em #1343** (`pesquisas-legais/simples-6-02-6-03-fator-r/relatorio.md` §1): 6.02 no Anexo III sem fator r pela SC Cosit 127/2019, grau verificado no dossiê (a vigência da SC está como assumida); 6.03 no Anexo III por leitura residual, sem norma nem SC específica, com aviso de grau. O 6.01 (barbearia, cabeleireiro, manicure) não é tratado à parte; a mesma SC, no item 8, cita cabeleireiro, barbeiro e manicure no Anexo III (leitura minha, não do dossiê). Pela regra de 07/10, não vai ao contador |
| Não há tabela oficial CNAE × anexo; a base do salão seria a Res. CGSN 140 art. 25 § 1º III "m" | `simples-nacional-2027-lc214-muda-calculo` | fonte | **vigente, reconferido (26/11):** a Res. 140 art. 8º §§ 1º–2º diz que o Anexo VI traz os CNAE impeditivos e o Anexo VII os ambíguos. Nenhum dos Anexos I–XII é CNAE × anexo; o enquadramento é por atividade. O #1343 segue valendo para o salão |
| A compilação da Res. CGSN 140 para na Res. 183/2025; a 191/2026 não está compilada | `simples-nacional-2027-lc214-muda-calculo` | fonte | **superado (26/11):** a visão multivigente da API, que é o método desde 09/11, já traz a 190, a 191, a 195 e a 196 (baixada em 25/11). O que ficou parado é o corpus local `Res-CGSN-140-2018.txt`, sem nenhuma delas: `L-20261127-005539-e917` |
| Combo com preço realocado: "valor de mercado" de 2027 (LC 214 art. 13 I "b"), pergunta A1 ao contador | `realocar-preco-em-combo-e-simulacao` | contador | **resolvido:** a A1 foi decidida em 21/10 (`D-2026-10-21-TRIAGEM-CONTADOR-F1`): `PROPORCIONAL_CATALOGO` é o padrão e `CARGA_TRIBUTARIA` só vale com aceite do contador. A LC 214 art. 13 I "b" foi conferida no texto do Planalto de 20/11. Ela produz efeitos desde 01/01/2026 (art. 544 VI), não "de 2027"; a mesma pergunta do art. 544 VI está no fork 0f85, com o dono |
| Nenhuma SC Cosit nem acórdão CARF sobre kit/combo foi achado | `realocar-preco-em-combo-e-simulacao` | fonte | **não achado:** a busca de 20–21/10 não achou nada (`pesquisas-legais/brief-eficiencia-fiscal/relatorio.md:36`) e não foi refeita aqui. O padrão proporcional não depende dela |
| Lei 10.147 cai em 01/01/2027 com a LC 214 art. 542 XI (segregação monofásico/ST por NCM) | `realocar-preco-em-combo-e-simulacao` | vigência | **vigente, conferido (26/11):** LC 214 art. 542 XI, com efeitos em 01/01/2027 (art. 544 III). O código lê o fim do `vigenteAte` 2026-12-31 da linha `PIS_COFINS` (`D-2026-11-24-MONOFASICO-POR-LINHA`). As linhas de NCM ficam abertas de propósito. A política de linha aberta é a lacuna 4944, com o dono |
| `legal.py achar` falha com CERTIFICATE_VERIFY_FAILED; listagem do acervo só por `gh api` | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | ferramenta | **não reproduz:** o `achar` rodou sem erro em 26/11 (`federal/leis-complementares/2006`, `reguladores/rfb/...`) |
| IN RFB 2.110/2022 (SIJUT idAto 126687) fora do acervo; o `baixar` aceita link SIJUT desde 09/11 | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | **segue fora do acervo, lida pela API:** a pasta `instrucoes-normativas/2022` tem 12 itens e nenhum é a 2.110 (26/11). O texto multivigente foi lido em `pesquisas-legais/dp-cobertura-100` [D19, rfb:126687] |
| SC Cosit 153/2026 fora do acervo | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | **segue fora do acervo; inteiro teor lido (26/11):** o idAto 152980 saiu da busca do portal novo da Receita. A ementa e o PDF anexo confirmam 3,5% de 2025 a 2027 e 11% a partir de 2028 (Lei 12.546 art. 9º-A). As conclusões de 27/10 ficam de pé |
| Páginas de fornecedor (MP, PSCs) não passam no `baixar`; só por navegador, gravando `docs/Dnn_*-navegador.txt` com SHA-256 | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | **vigente como regra:** o defeito do `baixar` com página dinâmica já está na caixa (0a90, mais a 04ca do TST) |
| Portal NF-e (`nfe.fazenda.gov.br/portal/listaConteudo.aspx`) em redirecionamento em laço | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | **causa achada (26/11):** o portal responde 200 quando o cliente guarda cookie (curl com cookie jar) e entra em laço sem cookie. O `legal.py baixar` não guarda cookie (`legal.py:83-84`). Só descrito: a caixa recusou a filha fora da meta (§8b) |
| Binários dos 23 documentos (~29 MB) estão fora do git; só MANIFEST e `.txt` versionados | `corpus-fontes-oficiais-local` | fonte | **falso positivo:** é a regra do corpus (`docs/accounting/fontes-oficiais/.gitignore`) |
| Corpus baixado em 10/09 pode estar defasado; reedição silenciosa exige `--forcar` e hash | `corpus-fontes-oficiais-local` | vigência | **confirmado para a Res. 140:** o `.txt` de 10/09 não tem a 190, a 191, a 195 nem a 196. Os outros 22 documentos não foram reconferidos, porque o `--forcar` reescreve arquivos versionados e vai em PR próprio: `L-20261127-005539-e917` |
| IN RFB 1.700/2017 Anexo III (taxas de depreciação) só como anexo binário `43557-tabela.html` | `corpus-fontes-oficiais-local` | fonte | **vigente como regra, contornado:** o binário fica fora do git por desenho. O texto foi lido pela API em `pesquisas-legais/salao-depreciacao-equipamentos` [D10], e `anexo-iii-to-fixture.mjs` confere o sha256 do HTML |
| cClassTrib de PSC: cotar DigitalSign, Certisign e Safeweb | `cclasstrib-psc-payouts-27-10` | fonte | **superado:** o Luminaris não contrata PSC nem e-CNPJ, e serviço contratado algum dia será BYOK (`D-2026-10-30-D5-SEM-CONTRATACAO-BYOK`). Em 22/11 o A1 voltou ao servidor (`D-2026-11-22-GUARDA-A1-TODOS-OS-USOS`) |
| Preços de PSC mudam; reconferir na cotação | `cclasstrib-psc-payouts-27-10` | vigência | **superado** pela mesma decisão de 30/10 |
| F6 (Payouts MP): ramo BYOK (F-PP-1 (b)) ou Pix pela API do banco (D6) | `cclasstrib-psc-payouts-27-10` | fork | **segue fork do dono:** o F6 está fora do escopo e bloqueado pela decisão "cliente integrador × banco do cliente" (`D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO` §3). Não há nota de nó F6 nem nada a pesquisar até ele reabrir |
| Guia do MP no GitHub (24/08) diz "Transaction Intent" para o BR; o site (27/10) mostra o lote | `cclasstrib-psc-payouts-27-10` | vigência | **adiado, com gatilho:** é contrato de fornecedor, não norma. Só pesa quando o F6 sair do bloqueio |
| PR #936 (fold dos 6 blocos) sem merge em 28/10 | `cclasstrib-psc-payouts-27-10` | estado | **resolvido:** #936 mergeado em 28/10/2026 às 18:23 UTC (`gh pr view 936`) |

## 2. Notas com pendência e data anterior a 01/11

| Nota | Data da nota | Pendência apontada | Estado em 24/11 |
| :--- | :--- | :--- | :--- |
| `accounting-p2-vertical-clinica-brief` | 25/08 | forks F-P2-3 e F-P2-4 pendentes | **superado:** nó P2 `done` (`docs/plano/nos/P2.md`) |
| `max-cents-e-politica-nao-persistencia` | 31/08 | doc mestre desatualizado, pendente de fold | **superado** (inferido): o SDD virou snapshot de 23/09 e o plano vive em `docs/plano/`, então não há fold no doc mestre a fazer |
| `accounting-fechamento-por-modulo` | 03/09 | F-M7 (emitir ou não NFS-e na onda do salão) pendente | **resolvido:** o F-M7 foi ratificado em (d) em 03/09 (`docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md:239`, `CEDULA-DECISAO-2026-09-03-modulos.md`). O caminho mudou depois: portal em 22/10 e Paulistana com `executa` em 24/11 |
| `onboarding-wizard-plano-grafo` (BRIEF do I8) | 07/09 | 9 forks F-CRM-1..9 pendentes | **superado** (inferido): nó I8 `done` (`docs/plano/nos/I8.md`); não li a cédula dos F-CRM-1..9 de 07/09 |
| `onboarding-wizard-plano-grafo` (ordem natural) | 07/09 | 5 forks do BRIEF I1/I1b pendentes | **superado:** nó I1 `done`; o F-I1-1 consta como ratificado em `D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM` |
| `onboarding-wizard-plano-grafo` (ratificações) | 07/09 | LAC-B ativada; fold no master map pendente | **superado:** nó I3 `done`; o master map virou o vault `docs/plano/` |
| `dev-db-real-path-is-nested` | 12/09 | "pendentes (29→41) aplicadas uma a uma" | **falso positivo:** o trecho descreve migrações já aplicadas |
| `motor-de-dominio-rejeitado-atomicuntil` | 22/09 | passo pendente aguardando `executa` | **superado:** o ADR está rejeitado (`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`); não há passo a executar |
| `accounting-master-map-source-of-truth` | 23/09 | ORCH-006/007 `pending-eval` no governance.md | **resolvido:** os dois têm gate `eval` em `.claude/skills/luminaris-orchestrator/governance.md` (alvo `evals.json#happy-accounting-1`) |
| `fe-contract-types-import-type` | 28/09 | PR-1 pendente | **resolvido:** há 123 arquivos `.gen.ts` rastreados em `my-app/` |
| `simples-nacional-2027-lc214-muda-calculo` | 29/09 | PRE-ADR com 13 forks pendentes | **resolvido:** ver a linha 1 da seção 1 |
| `handler-async-closure-stale-x-waitfor-tohavebeencalled` | 30/09 | itens pendentes datados de 09/2026 | **resolvido em parte:** os 3 latentes do e-Lalur foram corrigidos no #434 (mergeado em 29/09). O `LalurPanel` tem `cancelled` só no loader do catálogo (`:124-138`); `fetchEntries` e `fetchParteB` (`:107-108`) não têm, e a nota não diz qual era o "loader do padrão" (não identificado). Segue o achado "relatado" do combobox, que aceita digitação durante o loading e dá "não encontrado" falso (`CatalogCombobox.tsx:106`), e o caso "matrix…" sem precondição (`LalurEntryModal.test.tsx:119`). Os três (com o loader do `LalurPanel`) ficam só descritos no dossiê (§8b) |
| `f5-adr-payment-provider-proposed` | 02/10 | próximo passo pendente | **resolvido em parte:** o PR-3 (#615) foi mergeado em 09/10, e o nó F5 está `inflight` com `executa` de 29/10. Falta confirmar se a sonda de colunas em produção rodou |
| `ideia-nucleo-contabil-pacotes-por-select` | 08/10 | forks pendentes e BRIEF | **superado:** virou o PRE-ADR do kit de setor e o nó `KIT-SETOR` está `done` desde 15/10, com F-KS-0..7 decididos (`D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA`) |
| `realocar-preco-em-combo-e-simulacao` | 20/10 | premissas legais e pergunta ao contador | **resolvido:** ver as três linhas da seção 1 (A1 decidida em 21/10, Lei 10.147 conferida, SC/CARF não achado) |
| `pacote-contador-triar-antes` | 27/10 | "triar cada P-* antes do pacote" | **falso positivo:** é uma regra de método, não uma pendência |
| `sp-cosmeticos-fora-da-st-e-sup-2026` | 27/10 | o BRIEF do EFICIENCIA-FISCAL trata ST de cosmético e SUP como pendentes | **resolvido no BRIEF:** §0 itens 1–2 e §6 (P-EF-6 e P-EF-8 conferidos em 27/10). Sobrou o texto do item 28 (`BE-INCR-EFICIENCIA-FISCAL-brief.md:302`), que ainda diz "valor 2026 não conferido" (G5, descrito no dossiê) |
| `cclasstrib-psc-payouts-27-10` | 28/10 | preços e próximos passos pendentes | **superado em parte:** ver as linhas de PSC e do #936 na seção 1 |

## 3. Resumo

| Estado | Seção 1 (24 linhas) | Seção 2 (18 linhas) |
| :--- | :---: | :---: |
| resolvido, superado ou pesquisado em 24/11 | 5 | 11 |
| vigente, conferido em 26/11 (norma lida e comparada com o código) | 6 | 0 |
| resolvido ou superado em 26/11 | 2 | 4 |
| resolvido em parte em 26/11 | 0 | 1 |
| fonte ou ferramenta conferida em 26/11 (contornada, não reproduz, causa achada ou defasagem confirmada) | 7 | 0 |
| falso positivo | 1 | 2 |
| não achado | 1 | 0 |
| segue fork do dono / adiado, com gatilho | 2 | 0 |
| não conferido | 0 | 0 |

**Conferência de 26/11 (lacuna `L-20261124-121627-ad6e`):**
- Nenhuma divergência nova entre as normas de 2027 lidas e o cálculo do DAS (RBT12, fim do caixa, partilha 2029–2032 e
  limiar do teto do ISS). As conhecidas seguem na caixa: 09b7 (teto do ISS na 6ª faixa) e 976c (soma multiunidade).
- Duas divergências foram à caixa:
  - `L-20261127-005504-79dc`: falta o bloco socioeconômico do art. 38-B no PGDAS-D a partir do AC 2027;
  - `L-20261127-005539-e917`: o corpus local da Res. CGSN 140 parou na Res. 183.
- Os achados fora da meta da caixa estão descritos no §5 de `pesquisas-legais/pendencias-vault-ad6e/relatorio.md`.

As notas de origem estão no vault, em `20 Topics/08-fiscal-contabil-e-legal/` e `20 Topics/11-produto-e-arquitetura/`.
