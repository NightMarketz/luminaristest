# Cobertura de fontes regulatórias — inventário medido (09/11/2026)

**Verdade:** desde que o acervo `ctresb/leis` virou fonte primária (17/10), **52% dos documentos citados nos dossiês
vieram de fonte oficial**, e outros 17% vieram do acervo em versão não compilada. As lacunas são poucas e têm nome:
manuais SPED/NF-e, IN RFB compilada, CONFAZ antes de 2026, RICMS-SP, legislação municipal de SP e acórdãos do CARF.
**Risco principal:** NF-e/NFC-e (97% fonte oficial) e ISS/NFS-e (70%) dependem quase só de portal oficial. O acervo
não ajuda nesses módulos, e a cópia do portal muda na mesma URL.

Origem: pesquisa externa colada pelo dono no chat (09/11/2026), que propôs este arquivo. Ela é **pista, não fonte**
(`VERIFICACAO-LEGAL.md` §3). A conferência de cada afirmação dela está em §4.

**Este arquivo não é gate.** É inventário consultivo, e nenhuma sessão é bloqueada por ele (regra ⛔ do `CLAUDE.md`:
não montar aparato de auditoria novo). O método continua sendo `VERIFICACAO-LEGAL.md`.

## 1. Medida: de onde veio cada documento citado

Comando: `node scripts/cobertura-fontes-legais.mjs` (lê `pesquisas-legais/*/manifest.json`; `--desde AAAA-MM-DD`,
padrão 2026-10-17; `--json`). A unidade é o **documento salvo no dossiê**, não a norma. Uma norma que veio do acervo
não compilada e depois do Planalto conta duas vezes, uma em cada coluna. O módulo é deduzido do slug do dossiê.

Total: 87 dossiês, 506 documentos desde 17/10. Acervo usável 157 (31%), acervo não compilado 86 (17%), fonte
oficial 263 (52%). Antes de 17/10 houve só 33 documentos, todos de fonte oficial, e eles não mudam o quadro: o total
geral fica em 55% de fonte oficial.

| Módulo | Dossiês | Docs | Acervo usável | Acervo não compilado | Fonte oficial | Domínios oficiais mais usados |
|---|---:|---:|---:|---:|---:|---|
| PIS/COFINS / eficiência fiscal | 8 | 88 | 56% | 10% | 34% | planalto.gov.br (15), legislacao.fazenda.sp.gov.br (5), prefeitura.sp.gov.br (3) |
| Retenções / EFD-Reinf | 11 | 73 | 30% | 11% | 59% | sped.rfb.gov.br (15), gov.br (12), planalto.gov.br (10) |
| LGPD / digital / pagamentos | 6 | 58 | 28% | 16% | 57% | planalto.gov.br (8), gov.br (7), normasinternet2.receita (5) |
| Transversal / triagem | 9 | 56 | 27% | 14% | 59% | planalto.gov.br (10), sped.rfb.gov.br (5), gov.br (4) |
| Contábil / ECD / CFC | 9 | 46 | 30% | 22% | 48% | planalto.gov.br (7), www1.cfc.org.br (5), sped.rfb.gov.br (4) |
| IRPJ / CSLL / ECF | 9 | 45 | 38% | 31% | 31% | sped.rfb.gov.br (8), planalto.gov.br (2), normas.receita (2) |
| NF-e / NFC-e / DF-e | 10 | 37 | 3% | 0% | 97% | confaz.fazenda.gov.br (13), nfe.fazenda.gov.br (11), legislacao.fazenda.sp.gov.br (7) |
| Simples / MEI | 4 | 35 | 14% | 37% | 49% | normasinternet2.receita (10), planalto.gov.br (4), gov.br (2) |
| DP / folha / eSocial | 3 | 31 | 45% | 23% | 32% | planalto.gov.br (5), gov.br (5) |
| ISS / NFS-e | 4 | 27 | 15% | 15% | 70% | gov.br (9), planalto.gov.br (4), normasinternet2.receita (2) |
| IBS / CBS | 4 | 10 | 0% | 40% | 60% | planalto.gov.br (5), sped.rfb.gov.br (1) |

Os alertas que mandaram o acervo para a fonte oficial (243 documentos do acervo) foram: `versao_texto` não compilada
em 86, corpo curto ou com aviso em 4, revogação em 1, data ausente em 1 e fonte não oficial em 1. Os não compilados
por pasta: `federal/decretos` 23 (ex.: RIR, Dec. 9.580/2018, "original"), `federal/leis-complementares` 18 (LC 214,
224, 225, 227, 235), `federal/leis-ordinarias` 16, `reguladores/fazenda/resolucoes` 6 (CGSN 185–193/2026),
`reguladores/rfb/instrucoes-normativas` 5 (IN 2.306, 2.315, 2.333, 2.343/2026) e `reguladores/cfc/resolucoes` 3.

## 2. Mapa por fonte: o que o acervo tem e onde está o resto

Grau: **verificado** = medi em 09/11/2026 (listagem do acervo por `gh api git/trees`, ou HTTP no portal);
**dossiê** = medido nos manifests da §1; **inferido** = dedução, não testada.

| Domínio | No acervo `ctresb/leis` | Fonte oficial que cobre | Acesso por máquina | Versão / histórico |
|---|---|---|---|---|
| Leis, LC, decretos federais | Sim: 16.684 leis ordinárias, 237 LC, 12.250 decretos-lei (COBERTURA.md). Decretos e LC recentes vêm muitas vezes não compilados (§1) | planalto.gov.br (compilado), normas.leg.br | Planalto funciona no `baixar`; o rodapé dinâmico muda o hash no mesmo dia, com os mesmos artigos (memória) | Compilado no Planalto; no acervo, depende do `versao_texto` |
| IN e atos da RFB | Parcial. `reguladores/rfb/<ano>/rfb-sijut-<id>.md` em "visão original". **IN 1.700/2017 (idAto 81268) e IN 2.110/2022 (126687) dão 404** (verificado, 2 amostras). `_falhas_sijut.jsonl` tem 103 linhas (anexo binário) | API SIJUT `normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/{id}/visao/{original\|vigente\|multivigente}` | **Verificado:** as três visões dão 200 por curl para a IN 1.700. `visao/relacional` dá 403. O link `sijut2consulta/link.action` devolve casca JS ao `baixar` | Multivigente marca alterações e revogações. Consulta "na data X": não verificada |
| Soluções de Consulta (Cosit/Disit) | Sim, `reguladores/rfb/solucoes-de-consulta/2018–2026` (272 em 2026), com falha pontual: SC Cosit 153/2026 ausente (memória) | Busca SIJUT `consulta.action?numero_ato=N&ano_ato=AAAA` | Pelo navegador embutido (memória) | Original |
| Resoluções CGSN | Sim, `reguladores/fazenda/resolucoes`, só original | API SIJUT multivigente (10 usos no Simples) | Sim (API) | Multivigente |
| SPED: ECD, ECF, Reinf, EFD-Contribuições (manuais, leiautes, tabelas dinâmicas, referencial) | **Não** (não é norma) | sped.rfb.gov.br; corpus local `docs/accounting/fontes-oficiais/` com `MANIFEST.md` (sha256) | `baixar` e `scripts/baixar-fontes-oficiais.mjs`. O órgão reedita na mesma URL (`arquivo/download/N`) | Por leiaute e ano-calendário; só o hash gravado mostra a troca |
| NF-e/NFC-e: MOC, Notas Técnicas, schemas | **Não** | nfe.fazenda.gov.br; portal.fazenda.sp.gov.br (NFC-e SP); SVRS (cClassTrib) | O portal NF-e entra em redirecionamento em laço no `baixar` → navegador embutido (memória) | NT versionada por número e versão |
| CONFAZ | Parcial. `convenios/` só tem 2026 (116) e 1 de 2021. `atos-normativos/` tem Atos COTEPE 2018–2026. **Sem Ajustes SINIEF** e sem Convênios antes de 2026 (verificado) | confaz.fazenda.gov.br, com texto compilado na página do ato | Funciona no `baixar` (memória). Dossiês usaram Conv. 142/18 e Aj. SINIEF 07/05, 19/16, 21/26, 38/26, 40/26, 46/25 | Compilado na página |
| ICMS-SP | Parcial. Lei 6.374/1989 está. **RICMS (Dec. 45.490/2000) não está** em `estaduais/SP/decretos/2000` (392 arquivos, verificado). Sem Portarias CAT/SRE nem Respostas à Consulta | legislacao.fazenda.sp.gov.br | Funciona no `baixar` (memória) | RICMS por artigo, com redação |
| Município de SP (ISS) | Quase nada. `municipais/SP/sao-paulo/` tem lei orgânica e 1 decreto de 2026. Lei 13.701/2003 ausente (verificado) | legislacao.prefeitura.sp.gov.br, prefeitura.sp.gov.br | Funciona no `baixar` (memória) | Catálogo com redação |
| NFS-e nacional | Resoluções CGNFS-e em `reguladores/rfb/resolucoes`. Manuais e anexos (xlsx/XSD): **não** | gov.br/nfse | `baixar` (gov.br) | Anexos datados no nome do arquivo |
| CFC / NBC | Parcial. `reguladores/cfc/resolucoes` só tem 2017–2026. NBC/ITG anteriores (ex.: ITG 2000 R1) faltam (verificado pela lista de anos) | www1.cfc.org.br (5 usos em dossiê) | `baixar` | Resolução de alteração em separado; sem compilado no acervo |
| CPC / IFRS | **Não há pasta** (verificado) | cpc.org.br. A obrigatoriedade para o contador vem da NBC TG do CFC que adota o CPC (inferido, não li a resolução) | Não testado | — |
| Jurisprudência | STF: repercussão geral (1.494), súmulas e controle concentrado. STJ: repetitivos (1.474), súmulas. TST: súmulas. TRF4: súmulas. **CARF: só portarias, sem acórdãos** (verificado) | carf.economia.gov.br, stf.jus.br, stj.jus.br | Não testado no CARF | — |
| eSocial / INSS / MTE | Portarias e IN de `reguladores/mte`, `inss`. Leiautes: **não** | gov.br/esocial | `baixar` (gov.br) | Leiaute S-1.3 versionado |
| BCB (Pix, Open Finance) | `reguladores/bcb/resolucoes`. Manuais (DICT): **não** | bcb.gov.br, normativos.bcb.gov.br | `baixar` | — |
| ICP-Brasil (DOC-ICP) | **Não** | gov.br/iti, repositorio.iti.gov.br | `baixar` (memória) | Compilada no PDF |
| LexML (descoberta) | — | lexml.gov.br | **Verificado:** o SRU devolveu a página "Verificação de segurança — Senado Federal" ao curl. Serve como busca no navegador embutido, não como API sem pessoa | — |

## 3. Por módulo: onde o agente tem texto bastante e onde depende de portal

| Módulo | Situação | O que falta no acervo |
|---|---|---|
| NF-e / NFC-e | Depende de portal (97%) | MOC 7.0, NTs, Ajustes SINIEF, legislação NFC-e SP |
| ISS / NFS-e | Depende de portal (70%) | Lei 13.701/2003 SP, manuais e anexos do Sistema Nacional |
| Retenções / Reinf | Misto (59% oficial) | Manuais, leiautes, tabelas e NTs da Reinf (SPED) |
| Simples / MEI | Misto. Acervo tem a norma, mas não compilada (37%) | CGSN compilada (SIJUT multivigente) |
| IRPJ/CSLL/ECF | Acervo cobre a lei; SPED cobre o leiaute | Manual e tabelas dinâmicas da ECF, RIR compilado |
| Contábil / ECD | Misto | Manual ECD (SPED), NBC antes de 2017, CPC |
| PIS/COFINS | Acervo cobre melhor (56% usável) | IN 2.121/2022 compilada (SIJUT, inferido: não testei a ausência), legislação SP pontual |
| IBS/CBS | Fonte oficial ou não compilada (100%) | LC 214 compilada (o acervo tem só os vetos derrubados), atos CGIBS |
| DP / folha | Acervo cobre melhor (45% usável) | Leiautes do eSocial, tabelas do INSS |

O que continua com o humano não muda com mais fonte: validação dos demonstrativos, PVA, NF-e real e as perguntas
abertas ao contador (gates do Bloco A, `ORACLE-DEFICIT.md`).

## 4. Conferência da pesquisa colada (09/11/2026)

| Afirmação da pesquisa | Resultado | Evidência |
|---|---|---|
| LexML oferece "serviço de consulta por API" | **Diverge na prática** | O SRU devolveu página anti-robô ao curl (09/11). Uso pelo navegador embutido |
| Normas RFB tem visões original, vigente, multivigente e relacional | **Bate em 3 de 4** | Original, vigente e multivigente dão 200 na API (IN 1.700). A relacional deu 403 por esse caminho: não verificada |
| Normas RFB permite ver o ato "numa data específica" | Não verificado | — |
| Acervo de soluções de consulta com "dezenas de milhares" de registros | Não verificado (o número). A existência bate | Acervo tem 2018–2026; SIJUT tem busca |
| CFC em `portalrestore.cfc.org.br` | Não verificado | Os dossiês usaram `www1.cfc.org.br` |
| "Manual ECD — leiaute 9, atualizado em janeiro de 2026" | **Diverge** | A edição vigente é a de **maio/2026** (sha `bc63f0a893ce`; `pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md`) |
| Tabelas dinâmicas da ECF publicadas por leiaute e ano-calendário | Bate | Dossiê: `Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025` |
| `nfephp-org/sped-efd` atualizado em julho/2026 | Bate | `pushed_at` 2026-07-06 |
| `nfephp-org/sped-nfe` acompanha NTs de 2026 | Bate em atividade | `pushed_at` 2026-11-05 (não li o conteúdo) |
| `nfephp-org/sped-docs` como documentação útil | **Diverge** | Último push em 2016-12-05: não acompanha nenhum leiaute atual |
| `nfephp-org/sped-esocial` | Bate em atividade | `pushed_at` 2026-09-18 |
| (omitido pela pesquisa) `sped-ecd`, `sped-ecf` | Parados | Pushes em 2024-07 e 2022-08: não servem para ECD L9 nem ECF L12 |
| Matriz: "Leis federais — Alta" | **Parcial** | 17% dos documentos do acervo vieram não compilados, concentrados em decretos e LC recentes |
| Matriz: "CPC/IFRS — Alta" | **Sem base** | A pesquisa não aponta fonte, e o acervo não tem pasta CPC |
| Matriz: "Normas da Receita — Alta" | Parcial | Fonte oficial boa (API). Acervo com lacunas: IN 1.700 e IN 2.110 ausentes |
| Exemplo SEFAZ-AM | Fora do escopo | O produto é SP primeiro |
| "A LLM não transforma interpretação não validada em regra de produção" | Já é regra do projeto | `ORACLE-DEFICIT.md`, gates do Bloco A, `VERIFICACAO-LEGAL.md` §Limite |

## 5. O que a medida diz sobre a "Knowledge Acquisition Layer" proposta

A pesquisa propõe conectores por fonte, grafo de normas e motor de regras. A medida mostra outra coisa:

- **A aquisição com proveniência já existe.** O `legal.py` grava, por documento, o sha256, o commit do acervo e os
  alertas de versão. O corpus SPED tem `MANIFEST.md`, e há 87 dossiês. Falta acesso a fontes específicas, não uma
  camada genérica.
- **As lacunas são nomeáveis:** a API multivigente da RFB, o CONFAZ, a SEFAZ-SP, a Prefeitura de SP, o SPED e o
  portal NF-e. Quatro dessas seis já passam no `baixar` (memória de 27/10). A **API SIJUT** não passa, porque o
  `baixar` recebe a casca JS. O **portal NF-e** também não, porque entra em laço de redirecionamento.
- **Um grafo de normas** não tem consumidor no código hoje (inferido: nenhum serviço lê relação entre normas).

**Fork para o dono (não decidido aqui):**
(a) manter como está: `baixar` e navegador por dossiê;
(b) ensinar o `legal.py` a converter link SIJUT em `api/consulta-externa/ato/{id}/visao/multivigente`. É a única
rota bloqueada com uso alto (27 documentos do normasinternet2 e 10 do normas.receita, somando todos os dossiês). A ferramenta fica em
`~/.claude/tools`, fora do repo;
(c) construir a camada completa da pesquisa.
**Decidido em 09/11/2026, por delegação do dono (chat: "Faz os contrapontos e decide como devemos seguir"): (b),
em versão reduzida.** Entram o hash do texto, o alerta de reedição e a leitura da API da Receita. Ficam de fora a
camada genérica, os coletores por fonte e o campo de classe. Spec e contrapontos: `LEGAL-PY-CAPTURAS-brief.md`.

## 6. Reedição silenciosa na mesma URL: o que o `legal.py` detecta (09/11/2026)

Li o código em `~/.claude/tools/pesquisa-legal/legal.py` (395 linhas, versão de 26/10) e testei.

| Pergunta | Resposta | Evidência |
|---|---|---|
| O hash é do bruto ou do texto normalizado? | **Do bruto** (`legal.py:226`, `:272`). O `.txt` é extraído, mas não recebe hash | Baixei `l9250.htm` do Planalto duas vezes, com segundos de intervalo. Os hashes brutos saíram diferentes e o texto normalizado saiu idêntico. A diferença está no byte 267.610: o balanceador F5 injeta um token novo a cada requisição, depois do `</html>`. Nos dossiês, a LC 214 tem 24 capturas e 24 hashes brutos, e todas as que ainda têm `.txt` têm o mesmo texto |
| O histórico é preservado? | **No dossiê, sim, por acaso.** Captura nova vira um Dnn novo e nada é sobrescrito. **Entre dossiês, não**: nenhum índice liga duas capturas da mesma URL. **O conteúdo some na maior parte dos casos**: 328 dos 539 documentos dos manifests (61%, em 46 dossiês) não têm mais o arquivo no repo, só o hash | `git check-ignore` não acusa regra nenhuma: as sessões não commitaram os `docs/`, e as worktrees foram removidas |
| O alerta diferencia mudança de conteúdo, indisponibilidade e mudança de URL? | **Não há alerta no `baixar`.** Mudança vira Dnn novo em silêncio. HTTP 404 só aparece no terminal e não entra no manifest. Redirecionamento grava `url_final`, sem alerta (só recusa quando sai de domínio oficial) | Teste com URL inexistente: `ERRO … 404`, e `buscas`/`documentos` ficaram sem registro |

Mudanças reais na mesma URL achadas agora, cruzando os manifests (não pelo `legal.py`):

| URL | Entre | Indício |
|---|---|---|
| CONFAZ `ajustes/2016/AJ_019_16` | 13/10 e 17/10 | 124.850 → 126.430 bytes, depois estável em 4 capturas. É compatível com a incorporação do Aj. SINIEF 38/26 (inferido: o texto de 13/10 não foi guardado) |
| API RFB `ato/92278/visao/multivigente` (Res. CGSN 140) | 17/10 e 29/10 | 1.460.719 → 1.463.113 bytes. O `historico` do ato, lido na API em 09/11, tem como última entrada a Res. CGSN 195, de 21/10/2026, com vigência em 01/01/2027. A data bate com a mudança (verificado no histórico; o texto anterior não foi guardado) |
| `legislacao.fazenda.sp.gov.br` Portaria SRE 94/2025 | 17/10 e 27/10 | 148.018 → 151.064 bytes |
| `gov.br/nfse` documentação atual | 28/10 e 31/10 | Texto normalizado diferente |
| Planalto, Dec. 12.955/2026 (compilado) | 12/10 e 21/10 | Texto normalizado diferente. O Planalto mexeu na compilação |

Ao todo: 196 URLs oficiais, 41 capturadas mais de uma vez e 19 com bruto diferente. Em 3 delas o texto normalizado
também mudou (o terceiro caso é uma página de busca da RFB, que muda por natureza). A comparação de texto só alcança os
documentos cujo `.txt` ainda existe: as outras 16 são ruído de bruto ou mudança que já não dá para provar.

## 7. Como atualizar

Rodar `node scripts/cobertura-fontes-legais.mjs` e trocar a tabela da §1. Refazer as checagens "verificado" da §2
com `gh api "repos/ctresb/leis/git/trees/main:<pasta>"`. A última atualização do acervo em `reguladores/rfb` foi
em 28/10/2026. Se a pasta crescer, as ausências medidas aqui podem deixar de valer.
