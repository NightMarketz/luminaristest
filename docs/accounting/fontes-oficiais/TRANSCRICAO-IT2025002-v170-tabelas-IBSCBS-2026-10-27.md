# IT 2025.002 v1.70 — Tabelas de CST, cClassTrib e cCredPres do IBS/CBS — colunas usadas pelo grupo UB

Fonte: Portal NF-e › Documentos › Diversos (`https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/NJarYc9nus=`), "Vigentes", publicadas em 01/10/2026, lidas em 27/10/2026 pelo navegador embutido (o portal recusa download fora do navegador).

| Arquivo | Link | sha256 do .xlsx |
|---|---|---|
| `IT 2025.002 v.1.70 - cClassTrib.xlsx` (abas "CST 2026-09-01", "cClass 2026-09-01") | `exibirArquivo.aspx?conteudo=Cd5xq2ZVuEg=` | `bee3e106d24c06257d31105658679e97e2544dcc3ac61467fbe0ca4f78c6e850` |
| `IT 2025.002 v.1.70 - cCredPres.xlsx` (aba "cCredPres") | `exibirArquivo.aspx?conteudo=2fJ9V18v0U8=` | `5afee01483e532b342700f8c2786f95ba6cf91a4e23ceccfbeb34bf1afef9ee1` |
| `IT 2026.002 v.1.00 - Aliquotas da CBS.xlsx` (só conferência: 2026 = 0,9%; 2027 "aguarda legislação") | `exibirArquivo.aspx?conteudo=LRksVAMl7nQ=` | `33f17aa3322de841c7cb7bd469a2785d34cea34fadd0571e18bd8f7c88872f3b` |

Extração mecânica (descompactação do .xlsx e leitura das células no próprio navegador), sem edição de conteúdo. Só as colunas que a montagem e as regras do UB (NT 2025.002 v1.52, `TRANSCRICAO-NT2025002-v152-UB-2026-10-26.md`) consultam; os textos de lei ("LC Redação", "LC 214/25", regulamentos, descrição longa, link) ficaram fora. Datas no serial do Excel (46023 = 2026-01-01). O sha256 de cada TSV abaixo foi calculado no navegador sobre o texto extraído e é conferido por `server/src/features/accounting/models/__tests__/ibsCbsTabelas.test.ts` contra `models/ibsCbsTabelas.ts`:

- CST: `805c43302b46576952fe02ccfc4fd2fc40e995dfb0a1772ad75ff8c59e5fce86`
- cClassTrib: `1694f4aa04bdd4b91560fcf38a27d5c9cea25fb78cf35a41763882c155fde186`
- cCredPres: `d9befc11300061b773831eda19b497779c2b261fc3b6e8da1839897fb92f93cf`

Achado: o dossiê `pesquisas-legais/gates-humanos-lei` (21/10) registrou a tabela vigente como "não encontrada em domínio oficial". Ela está no Portal NF-e desde 01/10/2026 (v1.70). A linha do `000001` (tributação integral) está abaixo: CST 000, `indNFe = indNFCe = 1`, sem redução.

## Tabela de Indicadores de CST (aba "CST 2026-09-01")

```text
CST-IBS/CBS	Descrição CST-IBS/CBS	ind_gIBSCBS	ind_gIBSCBSMono	ind_gRed	ind_gDif	ind_gTransfCred	ind_ gCredPresIBSZFM	ind_gAjusteCompet	ind_RedutorBC
000	Tributação integral	1	0	0	0	0	0	0	0
010	Tributação com alíquotas uniformes	1	0	0	0	0	0	0	0
011	Tributação com alíquotas uniformes reduzidas	1	0	1	0	0	0	0	0
200	Alíquota reduzida	1	0	1	0	0	0	0	0
220	Alíquota fixa	1	0	0	0	0	0	0	0
222	Redução de base de cálculo	1	0	0	0	0	0	0	1
221	Alíquota fixa proporcional	1	0	0	0	0	0	0	0
400	Isenção	0	0	0	0	0	0	0	0
410	Imunidade e não incidência	0	0	0	0	0	0	0	0
510	Diferimento	1	0	0	1	0	0	0	0
515	Diferimento com redução de alíquota	1	0	1	1	0	0	0	0
550	Suspensão	1	0	0	0	0	0	0	0
620	Tributação monofásica	0	1	0	0	0	0	0	0
800	Transferência de crédito	0	0	0	0	1	0	0	0
810	Ajuste de IBS na ZFM	0	0	0	0	0	1	0	0
811	Ajustes	0	0	0	0	0	0	1	0
820	Tributação em documento específico	0	0	0	0	0	0	0	0
830	Exclusão de base de cálculo	1	0	0	0	0	0	0	0
```

## Tabela de cClassTrib (aba "cClass 2026-09-01") — colunas: CST, cClassTrib, tipo de alíquota, pRedIBS, pRedCBS, indicadores de grupo, tpRBSN, tpDoacao, vigência, indNFe, indNFCe

```text
CST-IBS/CBS	cClassTrib	Tipo de Alíquota	pRedIBS	pRedCBS	ind_gTribRegular	ind_gCredPresOper	ind_gMonoPadrao	ind_gMonoReten	ind_gMonoRet	ind_gpBioDiferenca	ind_gEstornoCred	tpRBSN	tpDoacao	dIniVig	dFimVig	indNFe	indNFCe
000	000001	Padrão	0	0	0	0	0	0	0	0	0	1	2	46023		1	1
000	000002	Padrão	0	0	0	0	0	0	0	0	0	1	0	46023		0	0
000	000003	Padrão	0	0	0	1	0	0	0	0	0	1	0	46023		1	0
000	000004	Padrão	0	0	0	1	0	0	0	0	0	1	0	46023		1	0
000	000005	Padrão	0	0	0	0	0	0	0	0	0	1	2	46023		1	0
000	000006	Padrão	0	0	0	0	0	0	0	0	0	1	2	46023		0	0
010	010001	Uniforme setorial	0	0	0	0	0	0	0	0	0	9	2	46023		0	0
010	010002	Uniforme setorial	0	0	0	0	0	0	0	0	0	1	2	46023		0	0
011	011001	Uniforme nacional (referência)	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
011	011002	Uniforme nacional (referência)	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
011	011003	Uniforme nacional (referência)	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
011	011004	Uniforme nacional (referência)	0	0	0	0	0	0	0	0	0	1	2	46023		0	0
011	011005	Uniforme nacional (referência)	30	30	0	0	0	0	0	0	0	1	2	46023		0	0
200	200001	Padrão	100	100	0	0	0	0	0	0	0	3	0	46023		0	0
200	200002	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200003	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200004	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200005	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	0
200	200006	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200007	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200008	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	0
200	200009	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200010	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200011	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	0
200	200012	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200013	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200014	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200015	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200016	Padrão	100	100	0	0	0	0	0	0	0	9	0	46023		0	0
200	200017	Padrão	100	100	0	0	0	0	0	0	0	9	0	46023		0	0
200	200018	Padrão	100	100	0	0	0	0	0	0	0	9	0	46023		0	0
200	200019	Padrão	100	100	0	0	0	0	0	0	0	0	0	46023		0	0
200	200020	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200021	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		0	0
200	200022	Padrão	100	100	1	0	0	0	0	0	0	1	0	46023		1	0
200	200023	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	0
200	200024	Padrão	100	100	1	0	0	0	0	0	0	1	0	46023		1	0
200	200025	Padrão	60	100	0	0	0	0	0	0	0	1	2	46023		0	0
200	200026	Padrão	80	80	0	0	0	0	0	0	0	9	2	46023		0	0
200	200027	Padrão	70	70	0	0	0	0	0	0	0	1	2	46023		0	0
200	200028	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200029	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200030	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200031	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200032	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200033	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200034	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200035	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200036	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200037	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200038	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	1
200	200039	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	0
200	200040	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200041	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200042	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200043	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		1	0
200	200044	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200045	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200046	Padrão	50	50	0	0	0	0	0	0	0	1	2	46023		0	0
200	200047	Padrão	40	40	0	0	0	0	0	0	0	1	2	46023		1	1
200	200048	Padrão	40	40	0	0	0	0	0	0	0	1	2	46023		0	0
200	200049	Padrão	40	40	0	0	0	0	0	0	0	1	2	46023		0	0
200	200050	Padrão	40	40	0	0	0	0	0	0	0	1	2	46023		0	0
200	200051	Padrão	40	40	0	0	0	0	0	0	0	1	2	46023		0	0
200	200052	Padrão	30	30	0	0	0	0	0	0	0	1	2	46023		0	0
200	200053	Padrão	100	100	0	0	0	0	0	0	0	1	0	46023		1	1
200	200054	Padrão	100	100	0	0	0	0	0	0	1	9	0	46023		1	1
200	200055	Padrão	60	60	0	0	0	0	0	0	0	1	2	46023		0	0
200	200056	Padrão	30	30	0	0	0	0	0	0	0	1	2	46023		0	0
220	220001	Fixa	0	0	0	0	0	0	0	0	0	9	0	46023	46023	0	0
220	220002	Fixa	0	0	0	0	0	0	0	0	0	9	0	46023	46023	0	0
220	220003	Fixa	0	0	0	0	0	0	0	0	0	1	0	46023	46023	0	0
221	221001	Fixa	0	0	0	0	0	0	0	0	0	1	0	46023		0	0
221	221002	Fixa	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
221	221003	Fixa	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
221	221004	Fixa	0	0	0	0	0	0	0	0	0	1	0	46023		0	0
222	222001	Padrão	0	0	0	0	0	0	0	0	0	5	2	46023		0	0
400	400001	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		0	0
400	400002	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		0	0
400	400003	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
400	400004	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
410	410001	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	1
410	410002	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
410	410003	Sem alíquota	0	0	0	0	0	0	0	0	0	0	1	46023		1	1
410	410004	Sem alíquota	0	0	0	0	0	0	0	0	0	3	0	46023		1	0
410	410005	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	1
410	410006	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	1
410	410007	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	1
410	410008	Sem alíquota	0	0	0	0	0	0	0	0	0	2	0	46023		1	1
410	410009	Sem alíquota	0	0	0	0	0	0	0	0	0	2	0	46023		1	1
410	410010	Sem alíquota	0	0	0	0	0	0	0	0	0	2	0	46023		0	0
410	410011	Sem alíquota	0	0	0	0	0	0	0	0	0	2	0	46023		0	0
410	410012	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	1
410	410013	Sem alíquota	0	0	0	0	0	0	0	0	0	3	0	46023		1	0
410	410014	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		1	1
410	410015	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410016	Sem alíquota	0	0	0	1	0	0	0	0	0	1	0	46023		1	0
410	410017	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
410	410018	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410019	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		1	1
410	410020	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		1	1
410	410021	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410022	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
410	410023	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	0
410	410024	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		1	0
410	410025	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	0
410	410026	Sem alíquota	0	0	0	0	0	0	0	0	1	0	1	46023		1	1
410	410027	Sem alíquota	0	0	0	0	0	0	0	0	0	3	0	46023		1	0
410	410028	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410029	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	1
410	410030	Sem alíquota	0	0	0	0	0	0	0	0	1	0	0	46023		1	0
410	410031	Sem alíquota	0	0	0	0	0	0	0	0	0	1	0	46023		1	0
410	410032	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
410	410033	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410034	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
410	410035	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		1	1
410	410036	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
410	410037	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
410	410999	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	1
510	510001	Sem alíquota	0	0	0	0	0	0	0	0	0	2	0	46023		1	0
515	515001	Padrão	60	60	0	0	0	0	0	0	0	1	0	46023		1	0
550	550001	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
550	550002	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		0	0
550	550003	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550004	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
550	550005	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
550	550006	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550007	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550008	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550009	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550010	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550011	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550012	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550013	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550014	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
550	550015	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550016	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550017	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550018	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550019	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550020	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550021	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
550	550022	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550023	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		1	0
550	550024	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		0	0
550	550025	Sem alíquota	0	0	1	0	0	0	0	0	0	1	0	46023		0	0
550	550026	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550027	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550028	Sem alíquota	0	0	1	0	0	0	0	0	0	0	0	46023		1	0
550	550029	Sem alíquota	0	0	1	0	0	0	0	0	0	4	0	46023		1	0
620	620001	Uniforme setorial	0	0	0	0	1	0	0	0	0	9	0	46023		1	0
620	620002	Uniforme setorial	0	0	0	0	1	1	0	0	0	9	0	46023		1	0
620	620003	Uniforme setorial	0	0	0	0	0	0	0	0	0	9	0	46023		1	0
620	620004	Uniforme setorial	0	0	0	0	0	0	1	1	0	9	0	46023		1	0
620	620005	Uniforme setorial	0	0	0	0	0	0	1	1	0	9	0	46023		1	0
620	620006	Uniforme setorial	0	0	0	0	0	0	1	0	0	2	0	46023		1	1
620	620007	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
800	800001	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
800	800002	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
810	810001	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
811	811001	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
811	811002	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
811	811003	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
820	820001	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
820	820002	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
820	820003	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
820	820004	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
820	820005	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
820	820006	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
820	820007	Sem alíquota	0	0	0	0	0	0	0	0	0	9	0	46023		0	0
820	820008	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
820	820009	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		0	0
830	830001	Sem alíquota	0	0	0	0	0	0	0	0	0	0	0	46023		1	0
```

## Tabela de cCredPres (aba "cCredPres") — colunas de apropriação, indicadores, cClassTrib referenciado, vigência, modelos

```text
cCredPres	Apropria via NF?	Apropria via evento?	indDeduzCredPres	ind_gCBSCredPres	ind_gIBSCredPres	cClassTrib nota referenciada	dIniVigCBS	dFimVigCBS	dIniVigIBS	dFimVigIBS	indNFe	indNFCe
01	0	1		1	1	410014	46388		46388		1	0
02	0	1		1	1	410015	46388		46388		0	0
03	0	1		1	1	410016	46388		47119		1	0
04	1	0	1	1	1	410017	46388		46388		1	1
05	1	0		1	0	Com incidência de CBS	46388				1	0
06	1	0		1	0	Com incidência de CBS	46388				1	0
07	1	0	1		1	Com incidência de IBS			46388		1	0
08	0	1		0	1	cClass de alíquota zero			47119		1	0
09	0	1		0	1	cClass de alíquota zero			47119		1	0
10	1	0		1	0	Com incidência de CBS	46388				1	0
11	1	0	1	0	1	Com incidência de IBS			46388		1	0
12	0	1		0	1	cClass de alíquota zero			47119		1	0
13	1	0		1	0	Com incidência de CBS	46388				1	0
```
