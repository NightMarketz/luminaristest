# Fontes oficiais — manifesto

Gerado por `node scripts/baixar-fontes-oficiais.mjs` em **2026-09-10**; 9 normas do X6 acrescentadas em **2026-09-15** (`--so=<id>` por entrada — o script reescreve o manifesto só com a última; linhas acrescentadas à mão com o mesmo sha256).

Os arquivos desta pasta **não vão pro git** (só este manifesto vai). Para repor:
rode o script. Para saber se o órgão reeditou algum documento sem trocar a URL:
rode com `--forcar` e compare o sha256 — hash diferente = documento novo, e o BRIEF
que citava o antigo precisa ser reconferido.

| id | assunto | documento | arquivo | bytes | sha256 (12) |
|---|---|---|---|--:|---|
| in-1700-2017 | Imobilizado — taxas de depreciacao (Anexo III) | IN RFB 1.700/2017 (texto multivigente + 14 anexos) | `IN-RFB-1700-2017.json` | 2.654.791 | `f92f341685cb` |
| in-2003-2021 | Retificacao da ECD | IN RFB 2.003/2021 | `IN-RFB-2003-2021-ECD.json` | 54.552 | `c508c8a37d17` |
| in-2004-2021 | Retificacao da ECF | IN RFB 2.004/2021 | `IN-RFB-2004-2021-ECF.json` | 48.771 | `11b9af63d919` |
| manual-ecf-l12 | ECF Fase 3 — blocos L/M/N, e-Lalur | Manual de Orientacao do Leiaute 12 da ECF (ADE Cofis 02/2026) | `Manual-ECF-Leiaute-12.pdf` | 6.410.931 | `7216ec2bd62d` |
| manual-ecd-l9 | ECD / J930 — o campo que trava o PVA (D8) | Manual de Orientacao do Leiaute 9 da ECD (ADE Cofis 01/2026) — **Atualização: janeiro de 2026**, 235 pp. | `Manual-ECD-Leiaute-9.pdf` | 2.971.696 | `7ddf47755f61` |
| tabelas-dinamicas-ecf | X2 (plano referencial) + linhas de L/M/N/P (TIPO e FORMULA) | Tabelas Dinamicas e Planos Referenciais da ECF, Leiaute 12 (28/05/2026) | `RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx` | 1.724.077 | `366b8d9030a0` |
| guia-efd-contrib | EFD-Contribuicoes | Guia Pratico da EFD-Contribuicoes v1.35 | `Guia-Pratico-EFD-Contribuicoes-v1.35.pdf` | 4.105.830 | `60eace459169` |
| indice-sped | PVA e manuais — indice | Indice de manuais e validadores do SPED | `SPED-indice-manuais.html` | 40.577 | `d63a09d5e50a` |
| indice-efd-manuais | EFD-Contribuicoes — indice de versoes do guia | Pasta de manuais da EFD-Contribuicoes (todas as versoes) | `EFD-Contribuicoes-indice-manuais.html` | 30.852 | `403547ee7f34` |
| nfse-manual-emissor | Emissao NFS-e — API do Emissor Publico Nacional | Manual dos Contribuintes — Emissor Publico, API (6 pg, aponta pro Anexo I) | `NFSe-manual-contribuintes-emissor-publico-API.pdf` | 188.158 | `ac2f36e34ff5` |
| nfse-manual-adn | Emissao NFS-e — APIs do ADN (distribuicao) | Manual dos Contribuintes — Guia de Utilizacao das APIs do ADN | `NFSe-manual-contribuintes-APIs-ADN.pdf` | 201.769 | `9ffc97d8b1be` |
| nfse-manual-judicial | Emissao NFS-e — decisao administrativa/judicial | Manual dos Contribuintes — Emissao por Decisao Administrativa ou Judicial | `NFSe-manual-emissao-decisao-judicial.pdf` | 251.371 | `f6d39849f57e` |
| nfse-xsd | Emissao NFS-e — esquemas XSD (DPS, NFS-e, eventos) | NFSe-ESQUEMAS_XSD v1.01 (09/02/2026) | `NFSe-ESQUEMAS_XSD-v1.01.zip` | 65.640 | `e7935cbd9470` |
| nfse-anexo-i | Emissao NFS-e — leiaute e regras de negocio da DPS/NFS-e | ANEXO I — SEFIN/ADN, DPS e NFS-e, v1.01 (09/02/2026) | `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx` | 215.196 | `de5bc492959e` |
| nfse-anexo-ii | Emissao NFS-e — eventos (cancelamento, substituicao) | ANEXO II — Pedido de Registro de Evento e Eventos, v1.01 (22/01/2026) | `NFSe-ANEXO-II-eventos-v1.01.xlsx` | 51.527 | `5abe83d7e510` |
| nfse-anexo-a | Emissao NFS-e — municipio IBGE / pais ISO2 | ANEXO A — Municipio IBGE e Paises ISO2, v1.00 (10/12/2025) | `NFSe-ANEXO-A-municipios-paises-v1.00.xlsx` | 218.140 | `238b715ab2dc` |
| nfse-anexo-b | ISS — lista de servico nacional / NBS (casa com a LC 116) | ANEXO B — NBS2 e Lista de Servico Nacional, v1.01 (22/01/2026) | `NFSe-ANEXO-B-lista-servico-nacional-v1.01.xlsx` | 85.008 | `e74b0be8ad20` |
| nfse-anexo-c | Reforma tributaria — indicadores de operacao IBS/CBS na NFS-e | ANEXO C — INDOP IBS/CBS, v1.01 | `NFSe-ANEXO-C-INDOP-IBS-CBS-v1.01.xlsx` | 13.746 | `f59f066c5c35` |
| lc-116-2003 | ISS — lista de servicos e local da prestacao | Lei Complementar 116/2003 | `LC-116-2003.html` | 104.392 | `fb5f18220177` |
| manual-mit | DCTFWeb — apuracao e confissao de tributos | Manual de Orientacao do MIT 1.0.14.02 (jan/2025) | `Manual-MIT-1.0.14.02.pdf` | 1.791.656 | `49da7ca21177` |
| apis-mit | D4 — o MIT tem API (decide contratar Integra Contador) | Anuncio das APIs do MIT no Integra Contador (abr/2025) | `RFB-noticia-APIs-MIT-2025-04.html` | 55.470 | `9a425746eda9` |
| cnab240 | Remessa e retorno — CNAB 240 | FEBRABAN Layout Padrao 240 posicoes, versao 10.11 (31/07/2023) | `FEBRABAN-CNAB240-v10.11.pdf` | 4.342.675 | `246c9e261e95` |
| febraban-portal | Remessa e retorno — indice de versoes | Portal FEBRABAN — layout 240 | `FEBRABAN-portal-layout-240.html` | 85.790 | `d0f751fe8c48` |
| rir-2018 | Custo de aquisicao — tributo recuperavel nao integra o custo (art. 301 §3) | Decreto 9.580/2018 (RIR/2018) | `Decreto-9580-2018-RIR.html` | 2.944.670 | `08623894666c` |
| lei-10637-2002 | PIS nao-cumulativo — credito 1.65% (art. 2/3) | Lei 10.637/2002 | `Lei-10637-2002-PIS.html` | 238.160 | `811b878b1ade` |
| lei-10833-2003 | COFINS nao-cumulativa — credito 7.6% (art. 2/3). monofasico sem credito (art. 3 §2 II) | Lei 10.833/2003 | `Lei-10833-2003-COFINS.html` | 531.890 | `f89ed8a3ea62` |
| lei-14592-2023 | ICMS fora da base do credito de PIS/COFINS (art. 6) | Lei 14.592/2023 | `Lei-14592-2023.html` | 74.825 | `ee873f914ada` |
| lei-10147-2000 | Monofasico — farmacia/perfumaria (NCM. F-X6-7 a) | Lei 10.147/2000 | `Lei-10147-2000-monofasico-farmacia.html` | 35.624 | `2d43d0001ac4` |
| lei-10485-2002 | Monofasico — autopecas/veiculos (NCM. F-X6-7 a) | Lei 10.485/2002 | `Lei-10485-2002-monofasico-autopecas.html` | 40.944 | `8ba63d7b856a` |
| lei-10865-2004 | PIS/COFINS-Importacao e aliquotas por produto (monofasico. F-X6-7 a) | Lei 10.865/2004 | `Lei-10865-2004.html` | 389.869 | `5c7376321f17` |
| lei-9718-1998 | Monofasico — combustiveis (art. 4. F-X6-7 a) | Lei 9.718/1998 | `Lei-9718-1998.html` | 196.422 | `a71cf61cb7b3` |
| lei-13097-2015 | Monofasico — bebidas frias (art. 14 NCM; arts. 17/28/29/30 credito) | Lei 13.097/2015 | `Lei-13097-2015-bebidas-frias.html` | 638.654 | `c6679a9a9fa3` |
| lc-123-2006 | Simples Nacional — sem credito pelo regime normal (art. 23; §4 f4) | Lei Complementar 123/2006 | `LC-123-2006-Simples.html` | 1.620.693 | `316d1f9c07ff` |

## URLs de origem

- **in-1700-2017** — <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente>
- **in-2003-2021** — <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/114965/visao/multivigente>
- **in-2004-2021** — <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/114966/visao/multivigente>
- **manual-ecf-l12** — <http://sped.rfb.gov.br/arquivo/download/8003>
- **manual-ecd-l9** — <http://sped.rfb.gov.br/arquivo/download/7990>
  - **2026-09-23:** redação vigente jan/2026 fornecida pelo dono em 23/09 (arquivo `Manual_de_Orientação_da_ECD_Leiaute_9_janeiro_2026.pdf`, copiado à mão; o script NÃO a baixa); substitui bc63f0a893ce ("Atualização: maio de 2026", 236 pp., da URL acima). sha256 completo: `7ddf47755f616ecd76671b8be9c8b61e30adbb0e8408634e45af95f616119b2e`. Rodar o script com `--so=manual-ecd-l9` sobrescreve o PDF com a versão maio/2026.
- **tabelas-dinamicas-ecf** — <http://sped.rfb.gov.br/arquivo/download/8002>
- **guia-efd-contrib** — <http://sped.rfb.gov.br/arquivo/download/5836>
- **indice-sped** — <http://sped.rfb.gov.br/pasta/show/1644>
- **indice-efd-manuais** — <http://sped.rfb.gov.br/pasta/show/1989>
- **nfse-manual-emissor** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf>
- **nfse-manual-adn** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf>
- **nfse-manual-judicial** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-emissao-decisao-administrativa-e-judicial.pdf>
- **nfse-xsd** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip>
- **nfse-anexo-i** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx>
- **nfse-anexo-ii** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_ii-sefin_adn-pedregevt_evt-snnfse-v1-01-20260122.xlsx>
- **nfse-anexo-a** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_a-municipio_ibge-paises_iso2-v1-00-snnfse-20251210.xlsx>
- **nfse-anexo-b** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx>
- **nfse-anexo-c** — <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo-c-indop-ibscbs-snnfse-v1-01.xlsx>
- **lc-116-2003** — <http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm>
- **manual-mit** — <https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/DCTFWeb/arquivos/manual-mit-1-0-14-02.pdf>
- **apis-mit** — <https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/abril/disponibilizadas-novas-apis-que-simplificam-e-facilitam-o-preenchimento-e-transmissao-da-dctfweb>
- **cnab240** — <https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf>
- **febraban-portal** — <https://portal.febraban.org.br/pagina/3053/33/pt-br/layout-240>

## Anexos binários dos atos da RFB

| ato | anexo | bytes | sha256 (12) |
|---|---|--:|---|
| in-1700-2017 | `IN-RFB-1700-2017-anexos/51960-ANEXO I.pdf` | 259.848 | `0ec5101b3a01` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/52020-Anexo I.pdf` | 238.894 | `08da13aec3b7` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/51961-ANEXO II.pdf` | 228.084 | `39c104208145` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/52021-Anexo II.pdf` | 184.146 | `dd5bf2617b90` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43237-Anexo .html` | 399.894 | `b25086e973d4` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43557-tabela.html` | 464.572 | `d526ac53071a` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43258-Anexo IV.pdf` | 89.048 | `55059e8226dd` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43259-Anexo V.pdf` | 144.306 | `e697a67fc7e6` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43260-Anexo VI.pdf` | 266.336 | `85f79d5a5aa0` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43261-Anexo VII.pdf` | 299.924 | `3171b8d60d45` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43262-Anexo VIII.pdf` | 242.580 | `c834810185fc` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/43263-Anexo IX.pdf` | 248.906 | `7fd770189ae3` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/51971-Anexo X.pdf` | 25.409 | `07d911ff1863` |
| in-1700-2017 | `IN-RFB-1700-2017-anexos/51972-Anexo XI.pdf` | 9.811 | `44d8ce803aa6` |
- **rir-2018** — <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>
- **lei-10637-2002** — <http://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm>
- **lei-10833-2003** — <http://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm>
- **lei-14592-2023** — <http://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14592.htm>
- **lei-10147-2000** — <http://www.planalto.gov.br/ccivil_03/leis/l10147.htm>
- **lei-10485-2002** — <http://www.planalto.gov.br/ccivil_03/leis/2002/l10485.htm>
- **lei-10865-2004** — <http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.865.htm>
- **lei-9718-1998** — <http://www.planalto.gov.br/ccivil_03/leis/l9718.htm>
  - **2026-09-25:** rebaixada p/ a Fase 1 (C-2): mesmos 196.422 bytes, sha256 agora `dab540ec7cd2` (Planalto reeditou sem mudar o tamanho). Art. 4º relido nesta data — ver `TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`. Idem `lei-10865-2004`: 389.869 bytes, sha256 agora `fb07460dfb92`.
- **lei-13097-2015** — <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13097.htm> — acrescentada 2026-09-25 (Fase 1 do PLANO-POS-CONTADOR, passo 1.5); sha256 completo `c6679a9a9fa3ee541c63e915cbcc0a190b97764b388a21d372c59c273e1f393f`; transcrição em `TRANSCRICAO-monofasico-bebidas-combustiveis-2026-09-25.md`.
- **lc-123-2006** — <http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm>
