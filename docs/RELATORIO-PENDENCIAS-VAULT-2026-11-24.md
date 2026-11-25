# Pendências que o vault aponta, conferidas contra o repo — 24/11/2026

Junta os dois índices que o vault do Obsidian gerou em 23/11:
- `pendencias-fiscais-2027-indice`: pendências fiscais e legais abertas;
- `pendencias-com-data-antiga-2026-11`: notas com pendência e data anterior a 01/11.

Os índices foram escritos **antes** das correções de memória de 23/11 e do lote de merge de 24/11. Por isso a coluna
"Estado em 24/11" foi conferida contra o repo (`origin/main` `d3f3a201c`) e o GitHub. As referências de linha das notas
foram tiradas, porque mudaram quando as notas receberam os avisos de 23/11.

**Legenda do estado:**
- **resolvido** / **superado** / **ratificado**: conferido no arquivo ou no PR citado.
- **falso positivo**: o trecho não descreve uma pendência.
- **não conferido** (nesta passada): segue aberto até alguém conferir. As linhas de "vigência a verificar" exigem pesquisa
  legal pelo método (`docs/operating-manual/VERIFICACAO-LEGAL.md`), que é tarefa própria.

Relatório irmão: `docs/RELATORIO-DECISOES-LUMINARIS-2026-11-24.md`.

---

## 1. Pendências fiscais e legais (índice fiscal 2027)

| Pendência | Nota de origem | Tipo | Estado em 24/11 |
| :--- | :--- | :--- | :--- |
| PRE-ADR do Simples com 13 forks F-SN-0..12 pendentes (PR #452, Proposed) | `simples-nacional-2027-lc214-muda-calculo` | forks | **resolvido:** #452 mergeado em 29/09. PRE-ADR Accepted em 07/10, com 14 forks F-SN-0..13 ratificados (`D-2026-10-07-SIMPLES-FORKS`) |
| RBT12 passa a 12 meses antecedentes ao mês anterior ao PA (art. 18 § 1º novo) | `simples-nacional-2027-lc214-muda-calculo` | vigência | não conferido nesta passada. Desde 07/10 decide-se pela lei, sem pergunta ao contador |
| Nova redação do § 3º omite a opção pela receita recebida ("caixa acaba" é inferido) | `simples-nacional-2027-lc214-muda-calculo` | vigência | não conferido nesta passada |
| Anexos XVIII–XXII: partilha muda de 2029 a 2032; anomalia "14,93%" × "14,92537%" no Anexo XX | `simples-nacional-2027-lc214-muda-calculo` | vigência | não conferido nesta passada. Caso vizinho decidido: a partição do Anexo III 2027–2028 que somava 100,01% é reescalada para 100% (`D-2026-11-21-FORKS-DA-CAIXA`) |
| Art. 25: declaração mensal e "declaração assistida"; DEFIS anual pode acabar (inferido) | `simples-nacional-2027-lc214-muda-calculo` | vigência | não conferido nesta passada |
| Salão (LC 116 itens 6.01–6.03) no Anexo III sem fator r (inferido), pergunta ao contador | `simples-nacional-2027-lc214-muda-calculo` | contador | **pesquisado em #1343** (`pesquisas-legais/simples-6-02-6-03-fator-r/relatorio.md` §1): 6.02 no Anexo III sem fator r pela SC Cosit 127/2019, grau verificado no dossiê (a vigência da SC está como assumida); 6.03 no Anexo III por leitura residual, sem norma nem SC específica, com aviso de grau. O 6.01 (barbearia, cabeleireiro, manicure) não é tratado à parte; a mesma SC, no item 8, cita cabeleireiro, barbeiro e manicure no Anexo III (leitura minha, não do dossiê). Pela regra de 07/10, não vai ao contador |
| Não há tabela oficial CNAE × anexo; a base do salão seria a Res. CGSN 140 art. 25 § 1º III "m" | `simples-nacional-2027-lc214-muda-calculo` | fonte | o mesmo relatório do #1343 usa o art. 25 § 1º III "m" e a regra residual. A ausência da tabela não foi reconferida |
| A compilação da Res. CGSN 140 para na Res. 183/2025; a 191/2026 não está compilada | `simples-nacional-2027-lc214-muda-calculo` | fonte | não conferido nesta passada |
| Combo com preço realocado: "valor de mercado" de 2027 (LC 214 art. 13 I "b"), pergunta A1 ao contador | `realocar-preco-em-combo-e-simulacao` | contador | não conferido nesta passada |
| Nenhuma SC Cosit nem acórdão CARF sobre kit/combo foi achado | `realocar-preco-em-combo-e-simulacao` | fonte | não conferido nesta passada |
| Lei 10.147 cai em 01/01/2027 com a LC 214 art. 542 XI (segregação monofásico/ST por NCM) | `realocar-preco-em-combo-e-simulacao` | vigência | não conferido nesta passada |
| `legal.py achar` falha com CERTIFICATE_VERIFY_FAILED; listagem do acervo só por `gh api` | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | ferramenta | não conferido nesta passada (problema da ferramenta, não de norma) |
| IN RFB 2.110/2022 (SIJUT idAto 126687) fora do acervo; o `baixar` aceita link SIJUT desde 09/11 | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | não conferido nesta passada |
| SC Cosit 153/2026 fora do acervo | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | não conferido nesta passada |
| Páginas de fornecedor (MP, PSCs) não passam no `baixar`; só por navegador, gravando `docs/Dnn_*-navegador.txt` com SHA-256 | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | não conferido nesta passada |
| Portal NF-e (`nfe.fazenda.gov.br/portal/listaConteudo.aspx`) em redirecionamento em laço | `legal-py-achar-ssl-e-rfb-fora-do-acervo` | fonte | não conferido nesta passada |
| Binários dos 23 documentos (~29 MB) estão fora do git; só MANIFEST e `.txt` versionados | `corpus-fontes-oficiais-local` | fonte | não conferido nesta passada (é a regra do corpus, não um defeito) |
| Corpus baixado em 10/09 pode estar defasado; reedição silenciosa exige `--forcar` e hash | `corpus-fontes-oficiais-local` | vigência | não conferido nesta passada |
| IN RFB 1.700/2017 Anexo III (taxas de depreciação) só como anexo binário `43557-tabela.html` | `corpus-fontes-oficiais-local` | fonte | não conferido nesta passada |
| cClassTrib de PSC: cotar DigitalSign, Certisign e Safeweb | `cclasstrib-psc-payouts-27-10` | fonte | **superado:** o Luminaris não contrata PSC nem e-CNPJ, e serviço contratado algum dia será BYOK (`D-2026-10-30-D5-SEM-CONTRATACAO-BYOK`). Em 22/11 o A1 voltou ao servidor (`D-2026-11-22-GUARDA-A1-TODOS-OS-USOS`) |
| Preços de PSC mudam; reconferir na cotação | `cclasstrib-psc-payouts-27-10` | vigência | **superado** pela mesma decisão de 30/10 |
| F6 (Payouts MP): ramo BYOK (F-PP-1 (b)) ou Pix pela API do banco (D6) | `cclasstrib-psc-payouts-27-10` | fork | não conferido nesta passada |
| Guia do MP no GitHub (24/08) diz "Transaction Intent" para o BR; o site (27/10) mostra o lote | `cclasstrib-psc-payouts-27-10` | vigência | não conferido nesta passada; conferir o contrato ao integrar |
| PR #936 (fold dos 6 blocos) sem merge em 28/10 | `cclasstrib-psc-payouts-27-10` | estado | **resolvido:** #936 mergeado em 28/10/2026 às 18:23 UTC (`gh pr view 936`) |

## 2. Notas com pendência e data anterior a 01/11

| Nota | Data da nota | Pendência apontada | Estado em 24/11 |
| :--- | :--- | :--- | :--- |
| `accounting-p2-vertical-clinica-brief` | 25/08 | forks F-P2-3 e F-P2-4 pendentes | **superado:** nó P2 `done` (`docs/plano/nos/P2.md`) |
| `max-cents-e-politica-nao-persistencia` | 31/08 | doc mestre desatualizado, pendente de fold | **superado** (inferido): o SDD virou snapshot de 23/09 e o plano vive em `docs/plano/`, então não há fold no doc mestre a fazer |
| `accounting-fechamento-por-modulo` | 03/09 | F-M7 (emitir ou não NFS-e na onda do salão) pendente | não conferido nesta passada. Contexto: a NFS-e vai pelo portal desde 22/10 e a Paulistana tem `executa` desde 24/11 |
| `onboarding-wizard-plano-grafo` (BRIEF do I8) | 07/09 | 9 forks F-CRM-1..9 pendentes | **superado** (inferido): nó I8 `done` (`docs/plano/nos/I8.md`); não li a cédula dos F-CRM-1..9 de 07/09 |
| `onboarding-wizard-plano-grafo` (ordem natural) | 07/09 | 5 forks do BRIEF I1/I1b pendentes | **superado:** nó I1 `done`; o F-I1-1 consta como ratificado em `D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM` |
| `onboarding-wizard-plano-grafo` (ratificações) | 07/09 | LAC-B ativada; fold no master map pendente | **superado:** nó I3 `done`; o master map virou o vault `docs/plano/` |
| `dev-db-real-path-is-nested` | 12/09 | "pendentes (29→41) aplicadas uma a uma" | **falso positivo:** o trecho descreve migrações já aplicadas |
| `motor-de-dominio-rejeitado-atomicuntil` | 22/09 | passo pendente aguardando `executa` | **superado:** o ADR está rejeitado (`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`); não há passo a executar |
| `accounting-master-map-source-of-truth` | 23/09 | ORCH-006/007 `pending-eval` no governance.md | **resolvido:** os dois têm gate `eval` em `.claude/skills/luminaris-orchestrator/governance.md` (alvo `evals.json#happy-accounting-1`) |
| `fe-contract-types-import-type` | 28/09 | PR-1 pendente | **resolvido:** há 123 arquivos `.gen.ts` rastreados em `my-app/` |
| `simples-nacional-2027-lc214-muda-calculo` | 29/09 | PRE-ADR com 13 forks pendentes | **resolvido:** ver a linha 1 da seção 1 |
| `handler-async-closure-stale-x-waitfor-tohavebeencalled` | 30/09 | itens pendentes datados de 09/2026 | não conferido nesta passada |
| `f5-adr-payment-provider-proposed` | 02/10 | próximo passo pendente | **resolvido em parte:** o PR-3 (#615) foi mergeado em 09/10, e o nó F5 está `inflight` com `executa` de 29/10. Falta confirmar se a sonda de colunas em produção rodou |
| `ideia-nucleo-contabil-pacotes-por-select` | 08/10 | forks pendentes e BRIEF | não conferido nesta passada (ideia em maturação) |
| `realocar-preco-em-combo-e-simulacao` | 20/10 | premissas legais e pergunta ao contador | não conferido nesta passada (ver a seção 1) |
| `pacote-contador-triar-antes` | 27/10 | "triar cada P-* antes do pacote" | **falso positivo:** é uma regra de método, não uma pendência |
| `sp-cosmeticos-fora-da-st-e-sup-2026` | 27/10 | o BRIEF do EFICIENCIA-FISCAL trata ST de cosmético e SUP como pendentes | não conferido nesta passada se o BRIEF já foi corrigido |
| `cclasstrib-psc-payouts-27-10` | 28/10 | preços e próximos passos pendentes | **superado em parte:** ver as linhas de PSC e do #936 na seção 1 |

## 3. Resumo

| Estado | Seção 1 (24 linhas) | Seção 2 (18 linhas) |
| :--- | :---: | :---: |
| resolvido, superado ou pesquisado | 5 | 11 |
| falso positivo | 0 | 2 |
| não conferido nesta passada | 19 | 5 |

As linhas "não conferido" seguem abertas. As notas de origem estão no vault, em `20 Topics/08-fiscal-contabil-e-legal/` e
`20 Topics/11-produto-e-arquitetura/`.
