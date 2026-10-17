# Relatório de pesquisa legal — verif-2026-10-17-iss-nfse

**Pergunta:** Reconferência das decisões de ISS e NFS-e (LC 116, LC 157, LC 214, NFS-e nacional, SP) contra o texto vigente
**Aberto em:** 2026-10-17T09:51:56-03:00 · **Atualizado em:** 2026-10-17T10:02:50-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Das 18 decisões/parâmetros de ISS e NFS-e conferidos, **14 CONFEREM** com o texto vigente, **2 DIVERGEM** e **2 são
DESATUALIZADO-RISCO**. Nenhuma das divergências vem de lei que mudou depois da decisão. As duas vêm de leitura
incompleta já na origem:

- **DIVERGE (1): `pAliq` sai do perfil da unidade e vai em toda DPS** (`FiscalDocumentEmissionService.ts:996`).
  Pelo leiaute vigente [D12], a alíquota do município conveniado é parametrizada e "fornecida pelo sistema". As RN E0617
  (regime normal, município ATIVO) e E0625 (ME/EPP com ISS pelo SN e sem retenção) **rejeitam** a DPS que traz `pAliq`.
  O caso típico do salão no Simples em SP a partir de 01/11/2026 cai na E0625. O campo é obrigatório só em E0619, E0621 e E0628
  (município não conveniado ou retenção). Além disso, a alíquota é por unidade e não por serviço. Em SP, a clínica
  com item 4 (2%, Lei 13.701 art. 16 I "a") e item 6.02 (5%, art. 16 IV) [D10] não cabe num valor único.
- **DIVERGE (2): o relatório de ISS agrupa pelo `cLocPrestacao`** (`issCompetencia.ts:35,99-104`, F-TC-1 a).
  Pela LC 116 art. 3º caput [D01], o ISS é devido no **estabelecimento prestador**. As exceções são os incisos I–XXV. Os
  subitens 4.01, 6.01, 6.02 e 6.03 estão fora delas, e a própria lista do seed marca `li = EP`. O agrupamento só erra quando o
  local da prestação está em outro município (atendimento a domicílio). Mesmo assim, a premissa P-C2 ("município do ISS = cLocPrestacao",
  grau A) está invertida para esses serviços.
- **DESATUALIZADO-RISCO:** (a) não há transição do ISS. Pelo art. 8º-B da LC 116 (incluído pelo art. 508 da LC 214) [D04],
  as alíquotas caem 10/20/30/40% em 2029–2032 e os benefícios caem na mesma proporção (§ 1º). A LC 116 fica revogada em 01/01/2033
  (LC 214 art. 543 IV) [D04]. A linha `ISS_LIMITE` e o `issComBeneficio` não têm fim de vigência. Não é urgente: nada muda antes de 2029.
  (b) O BRIEF PISO-ISS M11 diz que a Res. CGSN 191/2026 "não está compilada". Isso já não vale. Ela está no multivigente da Res. 140
  como redação agendada para 01/11/2026 [D06], e o texto próprio [D07] só mexe nos arts. 59 e 79. **Não altera o Anexo XI.**

**A memória "SP normal = Paulistana; Simples = nacional" CONFERE.** A LC 214 art. 62 § 1º I [D04] **não** obriga o
contribuinte a usar o emissor nacional. Ela obriga o **Município**, desde 01/01/2026, a autorizar a NFS-e nacional **ou**, se
tiver emissor próprio, a compartilhar os documentos com o ADN (até 31/12/2032, § 2º). SP manteve o emissor próprio e compartilha com o
ADN [D09][D13]. Para ME/EPP do Simples, o Emissor Nacional é obrigatório **a partir de 01/11/2026**: Res. CGSN 191 art. 1º
(nova redação do art. 59 § 1º da Res. 140) e art. 3º I [D07][D06], confirmado pela Prefeitura [D08]. Ajuste de
redação: a memória diz "desde 01/11/2026". Hoje (17/10) a data ainda não chegou e o certo é "a partir de".

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Local de incidência | LC 116 art. 3º caput | [D01] | "considera-se prestado, e o imposto, devido, no local do estabelecimento prestador … exceto nas hipóteses previstas nos incisos I a XXV" |
| Alíquota máxima 5% | LC 116 art. 8º II | [D01] | "demais serviços, 5% (cinco por cento)" |
| Alíquota mínima 2% | LC 116 art. 8º-A caput | [D01] | "A alíquota mínima … é de 2% (dois por cento)" |
| Piso sobre benefício; exceções | LC 116 art. 8º-A § 1º | [D01] | "… exceto para os serviços a que se referem os subitens 7.02, 7.05 e 16.01" |
| Piso no Simples | Res. CGSN 140 art. 31 p.ú. | [D06] | "não poderão resultar em percentual menor do que 2% … exceto … 7.02, 7.05 e 16.01" |
| Benefício = redução do % efetivo | Res. CGSN 140 art. 32 § 1º | [D06] | "na forma de redução do percentual efetivo do … ISS decorrente da aplicação das tabelas" |
| Transição ISS 2029–2032 | LC 116 art. 8º-B (LC 214 art. 508) | [D04] | "I - 10% … em 2029; II - 20% … 2030; III - 30% … 2031; e IV - 40% … 2032" |
| Fim do ISS | LC 214 art. 543 IV | [D04] | "Ficam revogados a partir de 1º de janeiro de 2033: … IV - a Lei Complementar nº 116" |
| Obrigação do Município | LC 214 art. 62 § 1º I, § 2º | [D04] | "autorizar … NFS-e de padrão nacional … ou, na hipótese de possuir emissor próprio, compartilhar" |
| Simples no Emissor Nacional | Res. CGSN 191 art. 1º e art. 3º I | [D07] | "utilizará, obrigatoriamente, a … NFS-e de padrão nacional, emitida pelo Emissor Nacional"; "a partir de 01 de novembro de 2026" |
| SP mantém emissor próprio | Portal NF Paulistana | [D09] | "O município de São Paulo manterá o emissor próprio de notas fiscais" |
| ISS SP itens 4 e 5 | Lei SP 13.701 art. 16 I "a" (red. Lei 18.066/2023) | [D10] | "2,0% … nos itens 4 e 5 e nos subitens 1.09, 2.01, 6.04 …" |
| ISS SP demais (6.01–6.03) | Lei SP 13.701 art. 16 IV | [D10] | "5,0% (cinco por cento) para os demais serviços" |
| `pAliq` fornecido pelo sistema | Anexo I v1.01, campo [311]/[312] | [D12] | "Se o município de incidência pertence ao Sistema Nacional NFS-e a alíquota estará parametrizada e … será fornecida pelo sistema" |
| `pAliq` proibido (normal) | Anexo I, RN E0617 | [D12] | "Não é permitido informar alíquota quando o prestador … não é optante … com o município de incidência … 'ATIVO'" |
| `pAliq` proibido (SN sem retenção) | Anexo I, RN E0625 | [D12] | "Não é permitido informar alíquota quando não há indicação de retenção … ME/EPP (opSimpNac = 3) … regApTribISSQN = 1" |
| Mínimo no leiaute (SN com retenção) | Anexo I, RN E0621/E0628 | [D12] | "o percentual da alíquota mínima informada permitida é 1,8%" |

## 3. Vigência conferida
- **LC 116 [D01]** e **LC 157 [D02]:** compilados, cópia de 13/10, sem alerta. Há duas marcas "Vide LC 214" (cabeçalho e art. 8º-B),
  resolvidas no Planalto [D04]. A LC 218/2025 mudou o art. 3º III (7.02, 7.19 e 14.14). O seed já marca `LP` para 14.14xx, então a mudança está coberta.
- **LC 214:** o acervo [D03] traz só a promulgação dos vetos (alerta). O texto lido é o compilado do Planalto [D04], com as marcas da LC 227/2026.
  Os arts. 62, 508 e 543 não têm marca de alteração.
- **Res. CGSN 140 [D06]:** API multivigente da RFB, sha `8d9b024965c1`, **idêntico** ao lido em 10/10. Nenhuma alteração desde então.
  O art. 59 § 1º vigente hoje é o modelo municipal. A redação da Res. 191 está agendada para 01/11/2026.
- **Decreto 12.955 [D11]:** surgiu alteração nova (Decreto 13.133/2026), mas ela toca só biocombustíveis (art. 477 e afins). Os arts.
  124–130 seguem intactos, e o dossiê `nfse-adn-certificado-numeracao` continua de pé. A FAQ v1.1 de 22/09/2026 ainda é a última versão
  (página do gov.br/nfse atualizada em 24/09).
- **Anexo I v1.01 [D12]:** sha `de5bc492959e`, igual ao do corpus e ao do seed `LC116_SERVICO`. A página "documentação atual"
  (atualizada em 15/08/2026) não lista versão mais nova. O Anexo B v1.01 (20260122) também segue vigente, e o dossiê `ctribnac-salao-clinica` continua de pé.
- **Lei SP 13.701 [D10]:** catálogo municipal multivigente. Valem as últimas redações do art. 16: Lei 18.066/2023 no I "a" e Lei
  16.272/2015 no IV. As Leis 18.095/2024 e 18.270/2025 alteram outros artigos (13 e 14), não o 16. Grau: inferido para a 18.095, porque o
  catálogo diz só "Altera a Lei".

## 4. Ambiguidades (só o que precisa de decisão humana)
- **D-4 (mínimo de 2% no `issAliquotaBp`).** A lei é clara: 2% é o mínimo que o **Município** pode fixar (art. 8º-A).
  O que fica em aberto é se o produto deve validar esse mínimo no campo. Há duas leituras.
  (a) Refine `>= 200`: bloqueia o Simples, que o leiaute deixa ir até **1,8%** com retenção (E0621/E0628), e é inútil no
  regime normal em município conveniado, onde o `pAliq` nem pode ir (E0617).
  (b) Sem mínimo no campo: o `pAliq` só é enviado nos casos de E0619/E0621/E0628, e o piso vale onde a lei o põe (benefício,
  `issBeneficio.ts`). **A leitura (b) é a mais segura.** O D-4 deixa de ser pergunta ao contador e vira ajuste de regra do leiaute.
- **F-PI-2 "piso absoluto" (dono, contra a recomendação).** A letra do art. 31 p.ú. diz que o benefício "não poderá resultar" em menos de 2%. Ela
  não manda elevar a alíquota da tabela que já está abaixo de 2% (1,92%). O código eleva e avisa (BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO).
  A leitura alternativa é aplicar o benefício só até o % da tabela. Pergunta ao contador: *"Na faixa 1 do Anexo III, com ISS de
  tabela abaixo de 2% e isenção municipal, a ME recolhe o % da tabela ou 2%?"*
- **Clínica: item 4 ou 6.02.** Continua a ambiguidade do dossiê `ctribnac-salao-clinica`. Em SP ela muda a alíquota (2% × 5%), não só o código.

## 5. Lacunas
- A API de parametrização municipal (`adn.nfse.gov.br/parametrizacao`) exige mTLS e não foi lida. Por isso não verifiquei a situação de SP no convênio
  ("ATIVO" para o Simples a partir de 11/2026) nem a alíquota que SP parametrizou por cTribNac.
- O D-2 (pacote vencido: NFS-e + ISS no vencimento, SC SF/DEJUG 11/2020 item 9.4.1) não foi relido nesta rodada.
- A Lei SP 18.095/2024 não foi aberta (o catálogo não diz quais artigos ela altera).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:07-03:00 · arquivo local `docs/D01_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D02]** Lei Complementar nº 157 de 29/12/2016 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d991827a4fe82dde2cc22ca61981ae214d98baed/federal/leis-complementares/2016/lcp-157-2016-12-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2016-12-29;157> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:08-03:00 · arquivo local `docs/D02_lcp-157-2016-12-29.md` · SHA-256 `5297fb30568deadbb15e911ea3101db185da541456367d10b616cfb00b0c3313`
- **[D03]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T09:52:10-03:00 · arquivo local `docs/D03_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D04]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-17T09:52:56-03:00 · arquivo local `docs/D04_lcp214-htm.html` · SHA-256 `e636217eccdd71fb47335fb2073d1b0a91405229715f91dfefe94a74da212cca`
- **[D05]** RESOLUÇÃO CGNFS-E Nº 9, DE 30 DE DEZEMBRO DE 2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1b9bb3ddaa43737703ca11821142da8cb6d6a2cf/reguladores/rfb/resolucoes/2026/resolucao-cgnfs-e-n-9-de-30-de-dezembro-de-2025-679135858.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-cgnfs-e-n-9-de-30-de-dezembro-de-2025-679135858> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:54:25-03:00 · arquivo local `docs/D05_resolucao-cgnfs-e-n-9-de-30-de-dezembro-de-2025-679135858.md` · SHA-256 `eb665eb33fc2e7021ef9f1fd91da57332b79be57a5574becd68000e54001bf6a`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D06]** D06_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/92278/visao/multivigente>  
  Baixado em 2026-10-17T09:54:51-03:00 · arquivo local `docs/D06_multivigente.html` · SHA-256 `8d9b024965c1568c12560992791181d1560a0c24982d65b451cc407231374d80`
- **[D07]** D07_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/152781/visao/multivigente>  
  Baixado em 2026-10-17T09:56:27-03:00 · arquivo local `docs/D07_multivigente.html` · SHA-256 `d2148c9d8019be7a839d9b7a391279d4b57127eca3caad267a68473051972483`
- **[D08]** » Simples Nacional: Exigência de emissão da NFS-e pelo sistema nacional é adiada para 1º/11/2026 - Nota Fiscal PaulistanaSimples Nacional: Exigência de emissão da NFS-e pelo sistema nacional é adiada para 1º/11/2026 – Nota Fiscal PaulistanaSimples Nacional: Exigência de emissão da NFS-e pelo sistema nacional é adiada para 1º/11/2026 – Nota Fiscal Paulistana — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/noticias/exigencia-de-emissao-da-nfs-e-pelo-sistema-nacional-e-para-1o-de-novembro-de-2026/>  
  Baixado em 2026-10-17T09:57:06-03:00 · arquivo local `docs/D08_exigencia-de-emissao-da-nfs-e-pelo-sistema-nacional-e-para-1.html` · SHA-256 `6fe28487c69572147fed9c94ded25744dbe71874eed6b0cd1c330fcbe1c38af8`
- **[D09]** » Reforma tributária - Nota Fiscal PaulistanaReforma tributária – Nota Fiscal Paulistana — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://notadomilhao.sf.prefeitura.sp.gov.br/reforma-tributaria/>  
  Baixado em 2026-10-17T09:57:06-03:00 · arquivo local `docs/D09_reforma-tributaria.html` · SHA-256 `10b7e74ab957e749f1c4b74fa817f3570e87c120b9268dc19490078d24676469`
- **[D10]** LEI Nº 13.701 DE 24 DE DEZEMBRO DE 2003 « Catálogo de Legislação Municipal — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.prefeitura.sp.gov.br/lei-13701-de-24-de-dezembro-de-2003>  
  Baixado em 2026-10-17T09:57:26-03:00 · arquivo local `docs/D10_lei-13701-de-24-de-dezembro-de-2003.html` · SHA-256 `35632c29f753d4c5ebd4ad9961039b17d47a83e45b0d48dd7c24d25770a253f8`
- **[D11]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-17T09:59:05-03:00 · arquivo local `docs/D11_d12955-htm.html` · SHA-256 `cde9455b1e3ba1d657b714bb3d136c17b7839e5aa4b8b556d7fcefb545a06152`
- **[D12]** D12_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx>  
  Baixado em 2026-10-17T10:00:24-03:00 · arquivo local `docs/D12_anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209-xlsx.html` · SHA-256 `de5bc492959eadc8bfa7540e16939995924f2188f743648eaf84d3b31e9eeb7c`
- **[D13]** Prefeitura assina adesão ao Sistema Nacional da Nota Fiscal de Serviços eletrônica - Secretaria Municipal da Fazenda - Prefeitura — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://prefeitura.sp.gov.br/web/fazenda/w/noticias/31967>  
  Baixado em 2026-10-17T10:01:37-03:00 · arquivo local `docs/D13_31967.html` · SHA-256 `c6c2e3bc3d56c4814c6f466018c32a1450da8fec632aad31dc89647b50d21ddc`

## Registro de buscas
_Nenhuma busca registrada._
