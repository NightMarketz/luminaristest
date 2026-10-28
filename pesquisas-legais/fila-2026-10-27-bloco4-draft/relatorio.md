# Relatório de pesquisa legal — fila-2026-10-27-bloco4-draft

**Pergunta:** Bloco 4 da fila (linhas DRAFT de 21/10): natRend 13003/13007/15001 e DARF 1708/5952/8045 (P-REINF-2); lista de uso e consumo pessoal (LC 214 art. 57); contas do referencial para IBS/CBS (P-IBS-4); COD_PB_RFB do M010 (PARTEB_PADRAO 1071/2210)
**Aberto em:** 2026-10-27T11:05:16-03:00 · **Atualizado em:** 2026-10-27T11:20:09-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Das quatro linhas DRAFT de 21/10, duas já estão certas em `main`, uma muda de forma e uma segue provisória por falta de tabela oficial.

- **Natureza do rendimento e DARF (P-REINF-2): o contador acertou os DARF e errou as três naturezas. O código em `main` já usa a tabela oficial.**
  - Na Tabela 01 de 15/01/2026 [D01, extrato `docs/D01_tabela01-r4020-trechos.txt`]:
    - 13003 é "Rendimentos de Arrendamento ou Subarrendamento", e não serviço profissional;
    - 13007 é "Juros decorrente da alienação a prazo de bens", e não limpeza ou vigilância;
    - 15001 é "cooperativas de trabalho", e não comissões.
  - As naturezas certas para esses três casos são:
    - serviço profissional: 15003 a 15042, conforme a profissão (o mapa de 23 serviços está no dossiê `fila-2026-10-27-bloco2-reinf`);
    - limpeza: 15043;
    - vigilância: 15045;
    - comissão e corretagem: 15052.
  - Os DARF conferem com a tabela "R-4020" [D01]:
    - 1708 (código de receita 170806) é o IRPJ de 15003 a 15046;
    - 5952 (595207) é o agregado da CSRF;
    - 8045 (804506) é o IRPJ da 15052.
  - A carga do RETENCOES PR-1 (`legal_parameters_retencoes_v1.sql`) já veio da tabela oficial e não contém 13003 nem 13007: eles só aparecem em `docs/` (a triagem e a D-2026-10-21).
  - **Efeito:** nada a mudar no código. A linha DRAFT de 21/10 sai do pacote como "descartada: valores do contador não conferem com a Tabela 01; vale a carga do PR-1".
- **Lista de uso e consumo pessoal (LC 214, art. 57): a lista do contador não serve, e a chave por NCM só cobre parte do artigo.**
  - O art. 57 tem duas partes [D03]:
    - inciso I: bens por natureza (joias, pedras e metais preciosos, obras de arte, bebidas alcoólicas, derivados do tabaco, armas e munições, e "bens e serviços recreativos, esportivos e estéticos") e, desde a LC 227/2026, a alínea "g": "bens e serviços relacionados à aquisição ou à manutenção dos bens de que trata este inciso" (o Regulamento já a trazia no art. 62 VII [D06]);
    - inciso II: bens e serviços fornecidos de graça ou abaixo do mercado a sócio, administrador, empregado ou parente, conforme o destino.
  - As exceções estão no próprio art. 57 § 3º [D03], e o Regulamento da CBS as detalha [D06, arts. 62 e 63].
    - Bens estéticos usados "exclusivamente em estabelecimento físico pelos seus clientes" ou revendidos não são uso pessoal (LC 214 art. 57 § 3º III; Regulamento art. 62 p.ú. III).
    - Serviços estéticos comprados por quem presta "esses mesmos serviços" também não são, mas essa exceção só está no Regulamento (art. 62 p.ú. IV "a"), pela delegação do § 3º V da LC.
    - Para salão e clínica, isso tira quase tudo da alínea "f".
  - Os quatro itens do contador (copa, veículo de passeio, vestuário, higiene pessoal) são todos casos de destino (inciso II). Três têm exceção expressa:
    - copa é "alimentação e bebida não alcoólica [...] durante a jornada de trabalho" (LC 214 art. 57 § 3º IV "c"; Regulamento art. 63 § 1º III);
    - uniforme não é uso pessoal (§ 3º IV "a"; art. 63 § 1º I);
    - veículo usado nas funções do empregado não é, mas só pelo Regulamento (art. 63 § 2º II).
  - Nenhum dos quatro se reconhece pelo NCM.
  - **Efeito:**
    - a tabela `IBS_CBS_USO_CONSUMO` (chave = prefixo de NCM) comporta só as alíneas "a" a "e" do inciso I, com a exceção de revenda;
    - a alínea "f" (estéticos) **não** deve entrar para salão e clínica;
    - a alínea "g" também não: o que a define é a ligação com o bem principal, não o NCM. A manutenção de equipamento estético usado só com clientes fica fora dela porque o bem principal está na exceção do § 3º III; o § 3º não cita a alínea "g", então essa leitura é minha (grau I);
    - o inciso II pede uma marca por item de entrada ("fornecido a sócio, empregado ou parente"), que o código não tem hoje (`NfeImportService` só cruza NCM).
  - Proposta de conteúdo DRAFT (grau I: a correspondência entre categoria e capítulo de NCM é leitura minha):

    | Categoria | Posições de NCM |
    |---|---|
    | Pedras e metais preciosos | 7101 a 7112 |
    | Joias e ourivesaria | 7113, 7114 e 7116 |
    | Bebidas alcoólicas | 2203 a 2206 e 2208 |
    | Derivados do tabaco | 2402 a 2404 |
    | Armas e munições | 93 |
    | Obras de arte e antiguidades | 97 |

  - Ficam de fora a bijuteria (7117) e o álcool etílico (2207).
- **Contas do referencial para IBS e CBS (P-IBS-4): sem tabela nova. A escolha provisória de 21/10 continua.**
  - A pasta da ECF no SPED [D04] continua com o Leiaute 12, de 28/05/2026, como o mais recente.
  - Nas abas L100A e P100A desse arquivo [D02, extrato `docs/D02_parteb-l100a-trechos.txt`] há 0 contas com "IBS", "CBS" ou "Bens e Serviços" no nome.
  - Existe a `2.01.01.09.28 Outros Tributos a Recolher – Circulante`, que é a escolha provisória do dono de 21/10.
  - Revisar quando sair a tabela do ano-calendário de 2027.
- **COD_PB_RFB do M010 (resto do D1): o código em `main` bate com a tabela oficial. A proposta D-1 de 10/10 ficou velha.**
  - Na PARTEB_PADRAO [D02], 1071 e 2210 têm a mesma descrição e o tributo "A" (ambos). A tabela não diz o sentido.
  - A PARTEB_PARTEA diz quais linhas da Parte A cada conta aceita:
    - 1071: 86 (adição), 161 (exclusão) e 260;
    - 2210: 86, 161, 335, 265.01 e **91.01** ("alienação ou baixa de ativo").
  - `lalurBlocoF.ts` usa 1071 para o saldo devedor (contábil > fiscal) e 2210 para o saldo credor, com 91.01 só na 2210.
  - **Checagem feita:** os 5 pares que o código gera (161/1071, 161/2210, 86/1071, 86/2210, 91.01/2210) existem com a qualificação 01 na PARTEB_PARTEA. O par de controle 91.01/1071 não existe. Logo, a regra `REGRA_PARTE_B_PARTE_A` do PVA [D05, p. 239] passa.
  - A `PROPOSTA-REFERENCIAL-D1-2026-10-10.md` §2 ainda diz "2210, uma conta só". O código, mais novo, usa as duas.
  - O sentido "1xxx = saldo D, 2xxx = saldo C" é inferido do padrão do bloco: 1000 a 1003 são prejuízos; 2090 a 2275 são depreciação acelerada, que se exclui antes e se adiciona depois. O manual da ECF não diz isso.

## 2. Fundamentação
| Ponto | Norma | Fonte | Trecho literal |
|---|---|---|---|
| 13003 | Tabela 01 da Reinf | [D01] | "13003 \| Rendimentos de Arrendamento ou Subarrendamento" |
| 13007 | idem | [D01] | "13007 \| Juros decorrente da alienação a prazo de bens" |
| 15001 | idem | [D01] | "15001 \| Importâncias pagas ou creditadas a cooperativas de trabalho" |
| Comissões | idem | [D01] | "15052 \| Demais comissões, corretagens ou qualquer outra importância paga/creditada pela representação comercial" |
| DARF da 15052 | Tabela R-4020 | [D01] | "15052 [...] IRPJ \| N/A \| 804506 \| Mensal" |
| Estético é uso pessoal | LC 214, art. 57 I "f" | [D03] | "bens e serviços recreativos, esportivos e estéticos" |
| Aquisição e manutenção | LC 214, art. 57 I "g" (LC 227/2026) | [D03] | "bens e serviços relacionados à aquisição ou à manutenção dos bens de que trata este inciso" |
| Exceção: uso pelos clientes | LC 214, art. 57 § 3º III | [D03] | "sejam utilizados exclusivamente em estabelecimento físico pelos seus clientes" |
| Exceção: mesmo serviço | Regulamento da CBS, art. 62 p.ú. IV "a" | [D06] | "adquiridos por contribuintes cuja atividade preponderante seja a prestação desses mesmos serviços" |
| Copa | LC 214, art. 57 § 3º IV "c" | [D03] | "alimentação e bebida não alcoólica disponibilizada no estabelecimento do contribuinte para seus empregados" |
| Vedação de crédito | LC 214, art. 57 § 5º | [D03] | "fica vedada a apropriação de créditos" |
| Sem conta de IBS/CBS | ECF L100A/P100A | [D02] | 0 contas; "2.01.01.09.28 \| Outros Tributos a Recolher – Circulante" |
| Pares Parte A × Parte B | ECF PARTEB_PARTEA | [D02] | "2210 \| [...] \| 91.01 \| 01012018 \| 01" |
| Regra do PVA | Manual ECF L12, M010 | [D05] | "REGRA_PARTE_B_PARTE_A: Verifica, quando é realizada uma adição/exclusão [...] se o código da linha [...] consta na tabela" |

## 3. Vigência conferida
- **Alertas e como foram resolvidos:**
  - [D01] e [D02] vieram com o mesmo SHA-256 das cópias de 21 a 24/10 (`31c04713…` e `366b8d90…`): não há versão nova.
  - [D03] é a LC 214 compilada do Planalto, com as alterações da LC 227/2026 no art. 57 (alínea "g", inciso II, § 3º IV "f" e "h", §§ 4º, 6º e 7º revogados, § 9º).
  - [D06] foi baixado 2 vezes hoje (também no bloco 3, como D07). Os hashes diferem por 780 caracteres no fim da página; os arts. 14, 16, 62 e 63 são idênticos nas duas cópias.
- **Redação atual:** Leiaute 12 da ECF (tabelas de 28/05/2026, manual de 20/05/2026) [D04, D05]; Tabelas da Reinf de 15/01/2026 [D01].
- **Norma mais específica:**
  - o art. 63 § 2º V do Regulamento prevê "ato conjunto da RFB e do CGIBS" com outras exceções, não procurado;
  - a tabela do referencial do ano-calendário de 2027 ainda não existe.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Quem marca o "fornecido a sócio, empregado ou parente" (inciso II).** Isso é desenho de produto, não de lei.
  - Opção 1: campo por item na importação da NF-e de entrada.
  - Opção 2: regra por conta de despesa.
  - O efeito só começa em 2027 (crédito de IBS/CBS no regime regular). É um ponto para o BRIEF do IBS-CBS-2027, e não para o contador.
- **NCM por categoria do inciso I.** "Joias" e "obras de arte" não vêm com NCM na lei nem no regulamento. A tabela proposta é leitura minha e vai como DRAFT ao contador para confirmação de sim ou não.
- **Sentido de 1071 × 2210.** O PVA aceita as duas com as linhas 86 e 161, e o sentido é inferido. Cabe na delegação D-1 de 10/10: o agente propõe, o contador revisa sem travar.

## 5. Lacunas
- O ato conjunto RFB/CGIBS do art. 63 § 2º V do Regulamento não foi procurado.
- O Regulamento do IBS (Resolução CGIBS 6/2026) não foi lido.
- O manual da ECF não define o sentido dos blocos 1xxx e 2xxx da PARTEB_PADRAO.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_EFD-REINF-20-20Tabelas-2015012026-zip — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/56/02690B8D5DE8904DFAB98799195B016052E4F5/EFD-REINF%20-%20Tabelas%2015012026.zip>  
  Baixado em 2026-10-27T11:11:40-03:00 · arquivo local `docs/D01_EFD-REINF-20-20Tabelas-2015012026-zip.html` · SHA-256 `31c04713b92a965c7413190a21dfc1b8eab4b10002a58371506da758e770b1a7`
- **[D02]** D02_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/E1/20FDEEE25CAA9F998AC2AD3045DE0E9C631D3C/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx>  
  Baixado em 2026-10-27T11:11:43-03:00 · arquivo local `docs/D02_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_.html` · SHA-256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`
- **[D03]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-27T11:11:56-03:00 · arquivo local `docs/D03_lcp214-htm.html` · SHA-256 `7e93804ba56ebf0a879689403173aabb40b04b7a6a9120b73058e39d0a7f2c5e`
- **[D04]** Manuais — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pasta/show/1644>  
  Baixado em 2026-10-27T11:13:29-03:00 · arquivo local `docs/D04_1644.html` · SHA-256 `d63a09d5e50a2fd7e42bde6d83fd32ed5cf8384b8a6c080529674ebeb6409c31`
- **[D05]** D05_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/54/7E3B296352B7AFD32210C180962BDB938B0804/Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026.pdf>  
  Baixado em 2026-10-27T11:14:44-03:00 · arquivo local `docs/D05_Manual_ECF_Leiaute_12_20_05_2026_AC_2025_SIT_ESP_2026-pdf.pdf` · SHA-256 `7216ec2bd62de7d45e5b019298be2420d08c2a3c6ade3646a053412937e95265`
- **[D06]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-27T11:19:04-03:00 · arquivo local `docs/D06_d12955-htm.html` · SHA-256 `3e9bb39fc0bd35b24ba427e4c9d4c66fe49eae11d4a32405943bad4e4ad6e40b`

## Registro de buscas
_Nenhuma busca registrada._
