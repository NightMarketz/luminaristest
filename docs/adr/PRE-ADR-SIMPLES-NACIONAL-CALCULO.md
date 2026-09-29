# PRE-ADR-SIMPLES-NACIONAL-CALCULO — Apuração mensal do Simples Nacional (ME/EPP): anexos, fator R, segregação, DAS/PGDAS-D e DEFIS

- **Data:** 2026-09-29
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork decidido; nenhum código autorizado.
- **Autorização:** decisão **8** de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md` — *"Qual PRE-ADR
  da onda 3 primeiro → **Simples/MEI** (PGDAS-D/DAS/DEFIS, anexos, fator R); IBS/CBS 2027 em seguida"* (dono, 29/09:
  *"Simples/MEI primeiro"*). A mesma nota diz: *"'Planejar' autoriza BRIEF/ADR; código continua exigindo 'executa'
  (ORCH-006)"*. A nota foi lida no branch do PR #440 (`b5398c87`). O PR foi mergeado em `main` durante esta sessão
  (`251f0fd9`), e a nota e o dossiê mergeados são **idênticos** ao que foi lido (`git diff b5398c87 origin/main` vazio
  para os dois).
- **Divergência registrada (passo 1 da `sessao-planejamento`):** a autorização cobre "Simples/**MEI**"; o pedido do dono
  nesta sessão (29/09) fixa o escopo no Simples ME/EPP do 1º cliente. A autorização cobre **mais** que o item. Não
  bloqueia, porque foi o próprio dono quem estreitou. O MEI virou o fork **F-SN-0**.
- **Nó:** nenhum. O item é PROPOSTO (`destino/18-caminho.md` §18.1, onda 3; `destino/06…` §6.10). Pela regra do vault
  (`docs/plano/README.md`, última linha), ele só vira nota em `nos/` **depois** deste PRE-ADR ratificado. A proposta de
  id está em F-SN-1.
- **Autor:** `sessao-planejamento` (agente). Os forks são decididos pelo dono, fora desta sessão.
- **2ª passada (29/09, tarde):** o dono autorizou baixar os insumos ausentes (*"Pode Baixar"*). Entraram no corpus a
  Res. CGSN 140/2018, o Manual do PGDAS-D e DEFIS, a Lei 12.592/2012 e duas fontes de SP (RICMS arts. 313-E/F e Portaria
  SRE 94/2025), mais a notícia oficial da RFB sobre a Res. CGSN 191/2026 (MANIFEST). O que elas mudaram está em §2.3-b e
  nos forks F-SN-3, 6, 7, 8, 9 e 12. **O F-SN-1 espera o ADR do X7**, que está sendo escrito em paralelo (dono: *"espera
  ele acabar e reavalie"*).
- **Base:** `origin/main` = `251f0fd9` (código lido em `9dd690b3`; o #439 e o #440 não tocam o código citado).

## TLDR

O 1º cliente (Simples Nacional, São Paulo capital, com IE, serviços LC 116 6.01/6.02/6.03 e venda de produto no balcão)
precisa fechar o mês fiscal: quanto de DAS pagar, sobre qual receita, e se isso bate com o portal. O modelo fiscal já
aceita o Simples (X13, F-OBP-0 → c), mas **nenhuma linha calcula o tributo**. A proposta tem quatro partes:

1. **Tabelas dos Anexos como dado versionado por vigência**, geradas por script a partir da fonte oficial. Não é
   motor de regras.
2. **Função pura de apuração**: RBT12 → faixa → alíquota efetiva → repartição por tributo, com segregação por atividade.
3. **Receita tirada de um subrazão fiscal** alimentado pela ponte contábil que já existe, conferido contra o razão.
4. **Espelho do PGDAS-D** para preencher no portal, com o registro do DAS oficial e a conferência entre os dois. Sem
   gerar arquivo e sem API (R5).

Dois fatos da lei mudam o desenho, ambos verificados nesta sessão:

- **Em 01/01/2027** o IBS e a CBS entram no DAS, a **janela do RBT12 recua um mês** e a partilha passa a mudar **ano a
  ano** até 2033 (LC 214 arts. 517, 519 e 544 III; Anexos XVIII–XXII).
- **O salão não cai no fator R.** Os serviços 6.01–6.03 não aparecem nas listas do art. 18 §§ 5º-B/C/D/I, então caem no
  Anexo III pelo art. 17 § 2º combinado com o art. 18 § 5º-F. A lei está lida; o enquadramento é inferido e o contador
  confirma.

---

## 1. Objetivo (sob a letra)

A letra é "PRE-ADR do cálculo do Simples". O objetivo é **o 1º tenant pagante fechar o mês fiscal pelo Luminaris sem
refazer a conta fora dele**. Isso pede quatro coisas:

- (1) apurar o DAS com a receita que o sistema já registra;
- (2) mostrar os valores no formato em que o portal os pede;
- (3) registrar o DAS oficial e acusar divergência;
- (4) contabilizar.

E pede que isso continue certo na virada de 2027 e em cada ano de 2029 a 2033.

**O oráculo não é este sistema.** O PGDAS-D do portal calcula o DAS oficial (LC 123 art. 18 § 15; o nome é do CGSN,
não verificado). O que o Luminaris calcula é **conferência**. Por isso o comportamento central é "espelho + registro do
DAS oficial + divergência", e não "o DAS do Luminaris".

## 2. Evidência

Grau: **V** = lido nesta sessão, no arquivo ou na norma · **V-dossiê** = verificado pela pesquisa de 29/09
(`docs/accounting/DOSSIE-DECISOES-2026-09-29.md`, #440) e **não** relido aqui · **I** = inferido · **NV** = não verificado.

### 2.1 Plano e decisões

| Claim | Grau | Evidência |
|---|---|---|
| O cálculo do Simples (PGDAS-D, DAS, DEFIS, DASN-SIMEI) ficou para a onda 3; o **modelo** já aceita os 4 regimes | V | `docs/plano/decisoes/D-2026-09-24-FISCAL-OBLIGATION-PROFILE.md` (F-OBP-0 → c) |
| O ADR do perfil mandou "Cálculo de DAS/PGDAS-D, fator R e Anexos do Simples → X7 / Onda 3" | V | `docs/adr/ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md:235` |
| Onda 3 lista "IBS/CBS 2027 · split payment · régua de cobrança · Simples/MEI · PDV + NFC-e" com `·` (sem ordem); §18.3 diz que IBS/CBS e split "puxam a Onda 3" | V | `docs/plano/destino/18-caminho.md` §18.1 e §18.3 |
| O destino exige que o PRE-ADR "prove que é **tabela versionada (dado)**, não engine em runtime" | V | `docs/plano/destino/06-catalogo-completo-de-modulos-16-dominios.md` §6.10 ⟨corr⟩ |
| Decisão 8: Simples primeiro, IBS/CBS 2027 em seguida; a NFC-e sai da onda 3 e vai para o X10a | V | D-2026-09-29 #8 |
| Decisão 1: o cliente **fica no DAS** (não optou pelo regime regular de IBS/CBS para jan–jun/2027); nova chance em mar/2027 | V | D-2026-09-29 #1 |
| Decisão 5: `icmsContribuinte` forçado a `false` no Simples vai para o GAP-MAP `[ABERTO]`; **o conserto entra no BRIEF do X10a** | V | D-2026-09-29 #5; `docs/operating-manual/GAP-MAP.md:110` (Nível 5, `[ABERTO]`) |
| R5: Integra Contador (Serpro) **adiado até o X7 destravar — sem desenho de adaptador agora** | V | `docs/plano/decisoes/R5.md`; `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md:25` |

### 2.2 O código (o que existe e este PRE-ADR respeita como fato consumado)

| Claim | Grau | Evidência |
|---|---|---|
| Regime da **empresa** por ano (`CompanyFiscalProfile.anoCalendario`, `regime` ∈ MEI/SIMPLES/PRESUMIDO/REAL) | V | `server/prisma/schema.prisma:1370-1376`; `models/regimeEmpresa.ts` |
| Matriz de obrigações **exclui PGDAS-D, DEFIS e DASN-SIMEI "até ter fonte"**; Simples: ECF NAO_SE_APLICA, ECD FACULTATIVA | V | `models/obrigacoesPorRegime.ts:6-7, 80, 91` |
| Perfil **da unidade**: `regimeTributario` ∈ SIMPLES/PRESUMIDO/REAL; `superRefine` recusa SIMPLES com `icmsContribuinte=true` | V | `dtos/FiscalProfileDto.ts:64` |
| `pacoteFatoGerador` (CONSUMO\|VENDA) já é config do perfil (D1f) | V | `dtos/FiscalProfileDto.ts:52` |
| A DPS do Simples sai com `opSimpNac=3`, `regApTribSN` e `pTotTribSN` **estático** (`pTotTribSNCent` digitado); MEI (2) fora do MVP | V | `services/FiscalDocumentEmissionService.ts:646-647, 676`; `dtos/DpsPayloadDto.ts:38` |
| `ibsCbsInformar` tem default **por regime** (SIMPLES → false), sem data de vigência | V | `services/FiscalProfileService.ts:151` |
| Receita já separada por natureza no razão: `3.1` Serviços, `3.3` Revenda, `3.2` Devoluções (redutora) | V | `fixtures/ChartOfAccountsFixture.ts:64-68`; `sync/mappers/revenueSplit.ts` |
| A ponte carrega **por item** o `productId` e o `serviceId` da venda no momento do lançamento | V | `sync/bridges/saleItems.ts:58, 117` |
| NCM monofásico de PIS/COFINS já é tabela com fonte, e inclui **3303–3307 (perfumaria/higiene; Lei 10.147 art. 1º)** | V | `models/pisCofinsMonofasicoNcm.ts:57` |
| O plano de contas **não tem** conta de tributo sobre receita nem "Simples a recolher" | V | `fixtures/ChartOfAccountsFixture.ts` (lista inteira) |
| Não há modelo de profissional-parceiro (Lei 12.592): "parceiro" no código é o emissor fiscal | V | grep `12\.592\|parceir` em `server/src` |

Caminhos relativos a `server/src/features/accounting/`, salvo quando o caminho já vem completo.

### 2.3 A norma (corpus `docs/accounting/fontes-oficiais/`)

**LC 123/2006**: compilada do Planalto, MANIFEST `lc-123-2006`, sha256 `316d1f9c07ff`, baixada em 15/09. A cópia lida
tem o mesmo sha. A extração **descartou o texto tachado** (263 `<strike>` e 1224 `line-through`), pela regra da memória
`tabela-transcrita-de-lei-conferir-redacao-vigente`. Todos os dispositivos abaixo são **V**.

| Dispositivo | O que diz (resumo) |
|---|---|
| art. 3º I, II | ME: receita até R$ 360.000,00; EPP: acima disso e até R$ 4.800.000,00 (red. LC 155) |
| art. 3º §§ 9º, 9º-A | EPP que excede o limite é excluída no mês seguinte; se o excesso for ≤ 20%, os efeitos ficam para o ano seguinte |
| art. 13 I–VIII | O DAS inclui IRPJ, IPI, CSLL, COFINS, PIS, CPP (salvo § 5º-C), ICMS e ISS |
| art. 13 § 1º XIII "a" | ICMS por substituição tributária fica **fora** do DAS. A lista nomeia "cosméticos; produtos de perfumaria e de higiene pessoal" |
| art. 13 § 1º-A | O repasse aos profissionais da **Lei 12.592/2012** contratados por parceria **não integra a receita bruta** do contratante; o contratante retém e recolhe os tributos do contratado |
| art. 13-A | Sublimite de R$ 3.600.000,00 para ICMS e ISS |
| art. 17 § 2º | Serviço não vedado pode optar pelo Simples |
| art. 18 caput, §§ 1º, 1º-A | Alíquota efetiva = (RBT12 × Aliq − PD) / RBT12. RBT12 = receita dos 12 meses **anteriores ao período de apuração** |
| art. 18 § 1º-B I, II | Teto de 5% para o ISS efetivo; a diferença vai, proporcionalmente, aos tributos federais. A diferença centesimal vai ao tributo de maior percentual |
| art. 18 § 1º-C | Se PIS e COFINS forem transformados ou extintos, as alíquotas nominais e efetivas **se mantêm** |
| art. 18 § 2º | No início de atividade, os limites das faixas são proporcionalizados aos meses de atividade |
| art. 18 § 3º | Incide sobre a receita **auferida**. Por opção irretratável no ano, pode incidir sobre a receita **recebida** |
| art. 18 § 4º I, III, IV | Revenda → **Anexo I**. Serviços dos §§ 5º-B a 5º-I, na forma de cada parágrafo |
| art. 18 § 4º-A I, II, V; §§ 12, 13 | Segregar monofásico e ICMS-ST, ISS retido e ISS devido a outro município; **reduzir** a parcela do tributo já recolhido |
| art. 18 §§ 5º-B, 5º-C, 5º-D, 5º-I | Listas lidas por inteiro. **Nenhuma nomeia cabeleireiro, estética ou massagem** |
| art. 18 § 5º-F | Serviços do art. 17 § 2º → **Anexo III**, salvo previsão expressa de IV ou V |
| art. 18 §§ 5º-J, 5º-K, 5º-M, 24–26 | Fator R: folha/receita ≥ 28% leva as atividades do § 5º-I (e as do § 5º-M) ao Anexo III; abaixo disso, Anexo V. Folha inclui encargos e pró-labore; aluguel e lucro distribuído ficam fora |
| art. 18 §§ 15, 15-A | "Sistema eletrônico" de cálculo. A declaração vale como confissão de dívida e é entregue até o vencimento do pagamento |
| art. 21 I, III | Documento único de arrecadação. "Enquanto não regulamentado", vence no último dia útil da 1ª quinzena do mês seguinte (a data regulamentada é **NV**) |
| art. 21 § 4º I, V, VII | Na retenção do ISS, o documento informa a **alíquota efetiva de ISS do mês anterior**. Sem ela, vale 5%. O valor retido é definitivo |
| art. 25 caput, § 1º | Declaração **anual**, única e simplificada (o nome "DEFIS" é do CGSN — **NV**) |
| art. 26 I, § 2º | Emitir documento fiscal; manter livro-caixa |
| Anexos I, III, V (vigência 01/01/2018) | Faixas, alíquotas, parcela a deduzir e repartição. Nota (*) do Anexo III: acima de 14,92537% na 5ª faixa, o ISS fica fixo em 5% |

**LC 214/2025**: compilada do Planalto, já com a LC 227/2026; registrada no MANIFEST (`lc-214-2025`, sha256
`ddeafec2054c`, baixada em 27/09, não commitada). A cópia lida tem **o mesmo sha**. Todos os dispositivos abaixo são **V**.

| Dispositivo | O que diz (resumo) |
|---|---|
| art. 41 §§ 1º–3º | O optante segue as regras do Simples e pode optar por apurar IBS/CBS no regime regular |
| art. 47 § 9º | Sem essa opção, o optante **não** apropria crédito, e o adquirente do regime regular credita o valor pago no Simples |
| art. 544 II, III, V | art. 516 produz efeitos desde 2025; **arts. 517 e 519 a partir de 01/01/2027**; art. 518 a partir de 2033 |
| art. 542 | PIS (LC 7) e COFINS (LC 70) revogados a partir de 01/01/2027 |
| art. 517 → LC 123 art. 13 IX, X, §§ 9º, 10 | IBS e CBS entram no DAS. A opção pelo regime regular é **semestral** (jan e jul), exercida em **setembro e março**, irretratável no semestre |
| art. 517 → LC 123 art. 18 §§ 1º, 1º-A I | **RBT12 passa a ser "os doze meses antecedentes ao mês anterior ao do período de apuração"** (a janela recua um mês) |
| art. 517 → LC 123 art. 18 § 1º-B I | O excesso do ISS vai "aos tributos federais **e IBS**" |
| art. 517 → LC 123 art. 18 § 3º | A nova redação **não traz** a opção pela receita recebida (a leitura de que a opção acaba é **I**) |
| art. 517 → LC 123 art. 18 § 4º-A I | A segregação de ST e monofásico passa a cobrir ICMS, IBS e CBS |
| art. 517 → LC 123 art. 18 §§ 5º-K, 24 | A janela do fator R recua um mês |
| art. 517 → LC 123 art. 23 §§ 1º-A, 2º | O adquirente credita IBS/CBS; o documento informa os **percentuais de ICMS, IBS e CBS da faixa** do mês |
| art. 517 → LC 123 art. 25 | A declaração vira **mensal**, com as informações "socioeconômicas e fiscais" (§ 2º). Traz a **declaração assistida** pela RFB; o silêncio presume correto o saldo (§§ 6º–8º) |
| art. 517 → LC 123 art. 26 § 10 | O documento eletrônico vale como escrituração fiscal e confissão |
| art. 519 + Anexo XVIII (novo Anexo I) | **2027–2028**: CBS 15,33% + IBS 0,17% no lugar de COFINS 12,74% + PIS 2,76%; 6ª faixa 18,90%. Partilha **anual** em 2029, 2030, 2031 e 2032 (o ICMS migra para o IBS). A partir de 2033, só IBS |
| art. 519 + Anexo XX (novo Anexo III) | **2027–2028**: nas faixas 1–5, CBS + IBS somam exatamente o que PIS + COFINS somavam; 6ª faixa 32,90%. Teto do ISS: 5% (2027–28), 4,5% (2029), 4% (2030), 3,5% (2031), 3% (2032). **Anomalia da fonte:** a nota diz "14,92537%" e o cabeçalho da linha 2027–28 diz "14,93%" |

**2ª passada — fontes baixadas em 29/09 (MANIFEST, 6 entradas novas).** Todos os dispositivos abaixo são **V**.

| Fonte · dispositivo | O que diz (resumo) |
|---|---|
| Res. CGSN 140/2018 (multivigente; **a compilação da RFB vai só até a Res. 183/2025**) art. 21 II, III "b", p.ú. | Fórmula da alíquota efetiva; regra do ICMS/ISS quando o RBT12 passa da 5ª faixa sem estourar o sublimite; RBT12 = 0 conta como R$ 1,00 |
| Res. 140 art. 22 §§ 2º–4º | Início de atividade: 1º mês = receita do mês × 12; meses 2–12 = média dos meses anteriores × 12 |
| Res. 140 art. 25 § 1º III "m" | Vão ao **Anexo III** os "outros serviços" que **não** decorrem de atividade intelectual, técnica, científica, desportiva, artística ou cultural, nem estão nos incisos IV a IX. **É a base oficial do enquadramento do salão** |
| Res. 140 Anexo VI (PDF id 50966) | É a lista de **CNAEs impeditivos** ao Simples, **não** uma tabela CNAE × anexo. 9602-5/01 e 9602-5/02 **não** constam. Não existe tabela oficial CNAE × anexo na Res. 140 (lista de anexos I–XI lida) |
| Res. 140 art. 26 §§ 1º–7º | Fator r: folha com encargos e pró-labore (bases da Lei 8.212), sem aluguel nem lucros; regras para folha ou receita zero (0,28 / 0,01) |
| Res. 140 art. 18 | Documento cancelado é deduzido **no período da tributação original** |
| Res. 140 art. 19 I, p.ú. | A opção pelo regime de caixa é registrada no PGDAS-D de **novembro**, para o ano seguinte; limites e alíquota seguem por competência |
| Res. 140 art. 38 §§ 1º–2º | PGDAS-D: informar a totalidade das receitas do mês; declaração até o vencimento |
| Res. 140 art. 40 | DAS vence no **dia 20** do mês seguinte (dia útil seguinte se não houver expediente bancário) |
| Res. 140 art. 63 I e § 3º | Livro caixa obrigatório, **dispensado pela escrituração contábil** (Diário e Razão) |
| Res. 140 art. 72 § 1º | Defis pelo módulo do PGDAS-D até **31/03** do ano seguinte |
| Manual PGDAS-D e DEFIS, **versão 17/06/2025**, item 6.5 | Árvore oficial de atividades. Revenda: "sem" / "com ST / monofásico / antecipação". Serviços: "não sujeitos ao fator r, Anexo III, sem retenção, ISS devido ao próprio município", entre outros |
| Manual, item 6.6.4 | Monofásico: selecionar a atividade "com" e marcar **PIS e COFINS** como "tributação monofásica"; o resto da receita segue na base |
| Manual, item 9.4.3 | Defis: ganho de capital, empregados no início e no fim, **lucro contábil**, sócios (rendimentos isentos e tributáveis, participação, IRRF), aplicações, estoques por estabelecimento |
| Manual (sumário inteiro) | Não há capítulo de importação de arquivo nem cálculo de IBS/CBS |
| Lei 12.592/2012 art. 1º-A §§ 3º–5º, 8º, 10 | Salão-parceiro retém a sua cota e os tributos do profissional; a cota do salão é "aluguel de bens móveis e utensílios" e/ou "gestão, apoio administrativo…"; a cota do profissional **não é receita bruta do salão, mesmo com nota unificada**; contrato escrito **homologado pelo sindicato**, com cláusulas obrigatórias |
| Portaria SRE 94/2025 (SP) arts. 1º e 4º | Revoga o Anexo XI da Portaria CAT 68/2019: **perfumaria e higiene fora da ST desde 01/04/2026** |
| Notícia RFB (ago/2026) | Res. CGSN 191/2026: NFS-e nacional obrigatória para ME/EPP desde 01/11/2026. **O texto da 191 não está compilado no Normas** |

**Fatos que este PRE-ADR não releu:**

| Claim | Grau | Evidência |
|---|---|---|
| Emissor Nacional de NFS-e **obrigatório** para o Simples desde 01/11/2026 | **V** na 2ª passada (notícia RFB, MANIFEST `rfb-noticia-cgsn-191`); o texto da resolução é NV | Res. CGSN 191/2026, art. 3º I |
| Campos de IBS/CBS na NFS-e do Simples só a partir de 01/01/2027 | V-dossiê | Ato Conjunto 4 § 1º |
| Escolha do regime de IBS/CBS feita em set/2026, vale para jan–jun/2027 | V-dossiê | notícia do CGSN de 17/04/2026 (U1). A LC 123 art. 13 § 10 (§ acima) agora confirma a regra: **V** |

### 2.4 Fatos do 1º cliente (dono, 29/09)

| Fato | O que muda no cálculo |
|---|---|
| Simples Nacional, **ME/EPP** (não MEI) | Anexos + PGDAS-D. DASN-SIMEI fica fora (F-SN-0) |
| São Paulo capital | O ISS da repartição vai para SP (LC 123 art. 22 I). NFS-e pelo Emissor Nacional |
| **Com IE**, venda de produto no balcão | A revenda entra no **Anexo I**, com a parcela de ICMS no DAS. **Perfumaria e higiene saíram da ST em SP em 01/04/2026** (Portaria SRE 94/2025 arts. 1º e 4º, **V**), então não sobra ST a segregar nesses produtos. Até 2026 sobra o monofásico de PIS/COFINS por NCM 3303–3307 (lei **V**; quais produtos o salão vende é pendência) |
| Serviços LC 116 **6.01, 6.02, 6.03** | **Anexo III** por art. 17 § 2º + art. 18 § 5º-F (**I**). Sem fator R |
| IBS/CBS **dentro do DAS** em jan–jun/2027 | As parcelas de IBS/CBS são cobradas no DAS (Anexos XVIII/XX). Sem crédito para o salão (LC 214 art. 47 § 9º I) |

## 3. Colisões verificadas

| Regra | Colide? | Como este PRE-ADR respeita |
|---|---|---|
| Motor de domínio / rule engine **rejeitado** (`ADR-DOMAIN-MOTOR-rejected.md`) | Não, se F-SN-2 → (a) | Tabelas = `const` TS geradas por script. Apuração = função pura. Nenhuma DSL, DAG ou regra interpretada em runtime. Lei nova = PR com diff do script (mesma técnica do F-OBP-3 → a e do `pisCofinsMonofasicoNcm.ts`) |
| DynamicTable × Prisma (`CLAUDE.md`, Contrato §2.1) | Não | Invariante fiscal → **Prisma first-class**. Nenhum serviço Prisma entra no motor. A receita chega pela **ponte contábil** que já existe (`sync/bridges`), o mesmo ponto de integração que alimenta 3.1/3.3, CMV e estoque |
| R5 (Serpro adiado, sem desenho de adaptador) | Sim, se F-SN-8 → (c) | Recomendação (b): sem porta e sem adaptador para Integra Contador |
| R6 (contábil → financeiro → fiscal) | Não | Este nó é fiscal e vai para a onda 3 (decisão 2: "o cálculo do Simples espera a onda 3") |
| X7 (apuração IRPJ/CSLL do regime normal) | **Parcial** → F-SN-1 | O ADR do perfil tinha mandado o Simples para "X7 / Onda 3". A decisão 8 abriu PRE-ADR próprio. O X7 depende do D1 e do R5; este nó não depende de nenhum dos dois |
| Decisão 5 (`icmsContribuinte` → conserto no BRIEF do X10a) | Não, se F-SN-6 → (a) | Este PRE-ADR **não** corrige o DTO. Ele consome o que o X10a decidir sobre o atributo fiscal do produto e sobre a IE (aresta X10a → este nó, §11) |

## 4. Decisões propostas e forks (todos PENDENTES)

**F-SN-0 — MEI neste PRE-ADR?**
- (a) Só ME/EPP agora. MEI (valor fixo, art. 18-A; a partir de 2027 com IBS/CBS pelo Anexo VII; DASN-SIMEI) vai para um
  PRE-ADR irmão.
- (b) ME/EPP e MEI juntos.

**Recomendação: (a).** O MEI não usa anexo, faixa nem segregação: o cálculo é outro. O 1º cliente não é MEI, e a
emissão do MEI (`opSimpNac=2`) já está bloqueada (`DpsPayloadDto.ts:38`).

**F-SN-1 — Nó próprio ou dentro do X7?**
- (a) Nó novo na régua fiscal (id proposto **X14**, confirmado na ratificação), onda 3, sem aresta para D1 nem X7.
- (b) Absorver no X7.

**Recomendação: (a).** O X7 é regime normal (IRPJ/CSLL trimestral, F-M8) e está `blocked` por D1 1/1b e R5. O Simples
não depende de nenhum dos dois. Juntar os dois prenderia o Simples a gargalos que não são dele.

**F-SN-2 — Forma das tabelas dos Anexos.**
- (a) `const` TS **gerada por script** a partir do HTML do Planalto (LC 123 compilada + Anexos XVIII–XXII da LC 214).
  Cada linha leva `vigenteDesde`/`vigenteAte`, a fonte e o ordinal da linha na fonte. Contagens asseridas. Cada
  anomalia da fonte vira regra nominal do parser, com teste. "Diff vazio" é o teste.
- (b) Tabela Prisma editável por admin.
- (c) `const` digitada à mão.

**Recomendação: (a).** É o que a memória `tabela-transcrita-de-lei-conferir-redacao-vigente` exige depois de duas
mordidas, e o que o §6.10 do destino pede ("tabela versionada, não engine"). (b) abre edição de lei sem PR. (c) repete
o erro de transcrever de memória. São **7 vigências de partilha por anexo**: 2018–2026, 2027–28, 2029, 2030, 2031,
2032 e 2033+.

**F-SN-3 — Enquadramento atividade → anexo.**
- (a) Mapa por (natureza, `cTribNac`) só com linhas que têm fonte. Salão 6.01/6.02/6.03 → III; revenda → I. O que
  não estiver no mapa **bloqueia** a apuração com `ATIVIDADE_SEM_ANEXO`.
- (b) Mapa por CNAE. *2ª passada:* a Res. 140 **não tem** tabela CNAE × anexo; o Anexo VI é a lista de impeditivos.
- (c) O operador declara o anexo de cada serviço.

**Recomendação: (a).** Mesmo precedente do F-XP-7 → a ("fica fora até ter fonte"). (c) põe a decisão tributária na mão
de quem não a sabe. (b) não tem fonte oficial. A linha do salão passa a citar a Res. 140 art. 25 § 1º III "m" (V); o
único juízo que sobra é "serviço de beleza não é atividade intelectual", e o contador confirma.

**F-SN-4 — Fator R agora?**
- (a) Implementar agora: é regra verificada e pequena (≥ 28% → III, senão V; janela por vigência). A folha de 12 meses
  é **declarada**, porque a folha só existe na onda 4.
- (b) Adiar até mapear uma atividade que precise dele.

**Recomendação: (a).** Não aciona no salão, mas o vertical 2 (clínica, P2) com medicina (§ 5º-B XIX → § 5º-M) aciona. A
decisão 8 cita o fator R, e o dono quer completude (memória `dono-quer-completude-nao-mvp`).

**F-SN-5 — De onde sai a receita da apuração.**
- (a) Saldos do razão (3.1, 3.3, 3.2) no mês. Não segrega ST, monofásico, ISS retido nem parceria.
- (b) Ler as linhas de venda (DynamicTable) na hora de apurar. É um acoplamento que a ponte existe para evitar.
- (c) **Subrazão fiscal de receita**: a ponte (`saleItems.ts`) grava uma linha por item no lançamento, com natureza,
  `cTribNac`/produto e marcas de segregação, e a soma é conferida contra 3.1 + 3.3 − 3.2 (tie-out como 1.1.5/AR e
  1.1.6/estoque).
- (d) Documentos fiscais emitidos (NFS-e/NFC-e).

**Recomendação: (c)**, com (d) como **conferência** quando houver documento. A partir de 2027 o documento eletrônico é
escrituração e confissão (art. 26 § 10), e a RFB pode apresentar declaração assistida (art. 25 §§ 6º–8º); por isso
bater receita contra documento importa. Documento não serve de fonte primária: a NFC-e ainda não existe (X10a), e a
NFS-e manual pode faltar.

**F-SN-6 — Segregação da revenda (ICMS-ST e monofásico).**
- (a) Consumir o atributo fiscal do produto (NCM, CEST/ST) que o **X10a** vai criar para a NFC-e. Até lá, vale (b).
- (b) Declarar à mão, por competência, o valor de revenda com ST ou monofásico, com aviso.
- (c) Não segregar: paga-se a parcela cheia.

**Recomendação: (a) + (b) interino.** (c) paga PIS/COFINS que já foram recolhidos na cadeia. *2ª passada:* em SP,
perfumaria e higiene **saíram da ST em 01/04/2026** (Portaria SRE 94/2025), então para o salão a segregação relevante
é só o monofásico de PIS/COFINS, marcado por tributo no PGDAS-D (manual 6.6.4). Em 2027 ela some: a CBS não tem
monofásico para cosmético (**I**). O estoque comprado com ST antes de abril segue a Portaria CAT 28/20 (**NV**). O
atributo do produto é do X10a: criar um atributo concorrente aqui seria ilha.

**F-SN-7 — Competência ou caixa (art. 18 § 3º).**
- (a) Só competência (receita auferida).
- (b) As duas.

**Recomendação: (a).** A opção pela receita recebida some da redação de 2027 (**I**). Se o 1º cliente optou por caixa em
2026, os meses de 2026 vão por orientação manual. O contador confirma (§8). *2ª passada:* a Res. 140 art. 19 manda
registrar a opção no PGDAS-D de **novembro** para o ano seguinte, e ainda não foi atualizada para a redação de 2027. Não
fica claro se o portal oferecerá a opção em nov/2026 para 2027.

**F-SN-8 — PGDAS-D: gerar arquivo, orientar ou API.**
- (a) Gerar arquivo de importação. **Nenhum leiaute de importação do PGDAS-D está no corpus nem foi citado por fonte
  oficial lida (NV).**
- (b) **Espelho de preenchimento** por competência, com os valores por atividade e por segregação na ordem do portal,
  mais o **registro do DAS oficial** (número, valor, vencimento, PDF como `SourceDocument`), com a divergência entre o
  valor calculado e o oficial.
- (c) API do Integra Contador.

**Recomendação: (b).** (a) não tem fonte. (c) colide com o R5. (b) põe o oráculo (o portal) no centro e usa o cálculo
como conferência. É também o que a declaração assistida de 2027 pede: conferir o que a RFB apresentar. *2ª passada:*
o espelho segue a **árvore oficial do manual** (item 6.5, atividade e segregação) e as qualificações por tributo
(item 6.6); o manual não tem importação de arquivo, o que reforça (b).

**F-SN-9 — DEFIS.**
- (a) Espelho anual mínimo, só para anos-calendário com meses apurados no Luminaris e só enquanto existir declaração
  anual.
- (b) Fora: o contador entrega.
- (c) Geração completa.

**Recomendação: (a), depois do PGDAS-D.** A redação de 2027 do art. 25 torna a declaração **mensal**, com os dados
socioeconômicos dentro (**I**: a DEFIS anual pode acabar depois do ano-calendário 2026). O 1º cliente só terá, no
máximo, nov–dez/2026 no sistema. O contador confirma. *2ª passada:* prazo **31/03** (Res. 140 art. 72 § 1º); dos
campos (manual 9.4.3), o razão já dá o lucro contábil e os estoques (1.1.6). Sócios, empregados e aplicações seriam
digitados.

**F-SN-10 — Contabilização do DAS.**
- (a) Provisão por competência **ao registrar o DAS oficial**, pelo valor oficial, não pelo calculado: débito numa conta
  de tributo sobre a receita, crédito em "Simples Nacional a recolher". O pagamento segue o fluxo de AP e banco que já
  existe.
- (b) Só relatório; o contador lança.
- (c) Lançar só no pagamento (caixa).

**Recomendação: (a).** "Contabilidade automática" é a tese do produto (`destino/03`), e usar o valor oficial evita
propagar ao razão o erro do nosso cálculo. Os **códigos** das contas e o tratamento da CPP dentro do DAS (dedução da
receita ou despesa?) são do contador (§8). Conta nova é folha irmã (ACC-018 não é acionado, como no `2.1.2`).

**F-SN-11 — Onde guardar a opção semestral de IBS/CBS (LC 123 art. 13 §§ 9º–10, 2027).**
- (a) Dois campos no `CompanyFiscalProfile` do ano: 1º e 2º semestre ∈ {DAS, REGULAR}, default DAS.
- (b) Tabela própria de opções com vigência.

**Recomendação: (a).** O perfil já é por ano (F-OBP-8 → a) e a opção é irretratável por semestre: dois campos cobrem
isso sem tabela nova. Com REGULAR, a apuração **exclui** as parcelas de IBS/CBS do DAS (§ 9º: "não serão cobradas pelo
regime único"). O cálculo delas no regime regular é do PRE-ADR de IBS/CBS 2027.

**F-SN-12 — Profissional-parceiro (Lei 12.592; LC 123 art. 13 § 1º-A).**
- (a) Ignorar: a receita bruta é o total. Paga a mais se o salão usa parceria.
- (b) Modelar o contrato de parceria com a cota-parte. A receita bruta passa a ser a cota do salão, com retenção e
  recolhimento dos tributos do parceiro.
- (c) Perguntar primeiro. Default (a) com aviso; (b) entra por emenda se o cliente usar.

**Recomendação: (c).** Em salão a diferença pode ser grande, e não se sabe se o 1º cliente usa parceria. *2ª passada
(Lei 12.592 lida):* o contrato precisa ser escrito e homologado pelo sindicato (§ 8º); a cota do profissional sai da
receita bruta mesmo com nota unificada (§ 5º); e a cota do salão tem natureza de **aluguel de bens móveis e/ou
gestão** (§ 4º). Se for aluguel de bem móvel, a LC 123 art. 18 § 4º V manda o Anexo III **sem a parcela do ISS** (**I**,
contador confirma). Com parceria, (b) muda o anexo de parte da receita, não só a base.

## 5. Comportamentos candidatos do futuro BRIEF (esqueleto — não é checklist executável)

Regra 3 da sessão: comportamento com regra fiscal leva a fonte. Onde o enquadramento é **I**, o item fica marcado
"confirmação do contador" e só vira checklist depois dela.

| # | Comportamento | Classe | Fonte / fork |
|---|---|---|---|
| 1 | Tabelas dos Anexos I–V com as 7 vigências, geradas por script, com contagens e anomalias asseridas (inclui "14,93%" × "14,92537%") | fork | F-SN-2; LC 123 Anexos; LC 214 art. 519 + Anexos XVIII–XXII |
| 2 | Mapa atividade → anexo com fonte; o que não estiver no mapa bloqueia com `ATIVIDADE_SEM_ANEXO` | fork · **confirmação do contador** | F-SN-3; art. 17 § 2º, art. 18 §§ 4º, 5º-F |
| 3 | RBT12 com janela **por vigência** (até 2026: 12 meses anteriores ao PA; 2027+: 12 meses antecedentes ao mês anterior); início de atividade (1º mês × 12, depois média × 12); RBT12 = 0 conta como R$ 1,00 | direto | art. 18 §§ 1º, 1º-A, 2º; LC 214 art. 517; Res. 140 art. 21 p.ú., art. 22 §§ 2º–4º |
| 4 | Alíquota efetiva, percentuais por tributo, teto do ISS com transferência (a federais até 2026; a federais **e IBS** a partir de 2027), diferença centesimal, regra do ICMS/ISS acima da 5ª faixa | direto · **arredondamento NV** | art. 18 §§ 1º-A, 1º-B; Anexos (*); Res. 140 art. 21 III |
| 5 | Segregação por atividade e das receitas do § 4º-A (monofásico, ST, ISS retido, ISS de outro município), com redução da parcela | fork | F-SN-6; art. 18 §§ 4º-A, 12, 13 |
| 6 | Fator R com folha declarada (janela por vigência) | fork | F-SN-4; art. 18 §§ 5º-J/K/M, 24–26 |
| 7 | Histórico **pré-adoção** declarado (receita mensal e, opcionalmente, folha) com a evidência anexada. Sem ele não há RBT12 no 1º ano | direto | art. 18 § 1º; dado externo (§8 item 5) |
| 8 | Alertas: passagem ME/EPP; excesso de R$ 4,8 mi (≤ 20% → ano seguinte); sublimite de R$ 3,6 mi (ICMS/ISS, e IBS a partir de 2027); histórico incompleto | direto | art. 3º I, II, §§ 7º–9º-A; art. 13-A (e red. 2027) |
| 9 | Subrazão fiscal de receita alimentado pela ponte, com tie-out contra 3.1 + 3.3 − 3.2 | fork | F-SN-5 |
| 10 | Apuração persistida por competência (rascunho → DAS registrado), recálculo idempotente, soft-delete e eventos de auditoria na allowlist | direto | Contrato §2/§3; `auditCanonical.ts` |
| 11 | Espelho do PGDAS-D na árvore oficial de atividades e qualificações + registro do DAS oficial (vencimento dia 20) + divergência; cancelamento deduzido no período original | fork | F-SN-8; art. 18 §§ 15, 15-A; Res. 140 arts. 18, 38, 40; manual 6.5–6.6 |
| 12 | Contabilização do DAS registrado | fork · **códigos do contador** | F-SN-10 |
| 13 | Opção semestral de IBS/CBS no perfil; com REGULAR, as parcelas de IBS/CBS saem do DAS | fork | F-SN-11; LC 123 art. 13 §§ 9º–10 (2027) |
| 14 | Linhas `PGDAS_D` (mensal, dia 20), `DEFIS` (anual, 31/03; vigência depois de 2026 a confirmar) e `LIVRO_CAIXA` (dispensado por escrituração contábil) na matriz de obrigações, com a fonte | direto · DEFIS pós-2026 **I** | art. 18 § 15-A; art. 25; Res. 140 arts. 40, 63 § 3º, 72 § 1º |
| 15 | Saída para os documentos: alíquota efetiva de ISS do mês anterior (retenção) e, a partir de 2027, os percentuais de ICMS, IBS e CBS da faixa (crédito do adquirente B2B). Quem consome são os nós de emissão | direto | art. 21 § 4º I; LC 123 art. 23 § 2º (2027) |
| 16 | Conferência: NFS-e emitidas × receita de serviços da competência | direto | art. 26 § 10 (2027); art. 25 §§ 6º–8º (2027) |
| 17 | Parceria (cota-parte, retenção) | fork | F-SN-12 — só se ratificado (b) |
| 18 | Gates que o diff aciona: snapshot de shape dos DTOs, guard de path-count do openapi, allowlist do `auditCanonical`, rota em 2 toques (`index.ts` + `docs.paths.ts`), Policy + Factory + Repository | direto | Contrato §2/§3; `sessao-planejamento` (notas de operação) |

## 6. Contratos esboçados

```ts
// models/simplesNacionalAnexos.ts — GERADO (script) a partir de LC-123-2006-Simples.html + lcp214.htm (Anexos XVIII–XXII)
export const ANEXOS_SIMPLES = ['I', 'II', 'III', 'IV', 'V'] as const;
export type AnexoSimples = (typeof ANEXOS_SIMPLES)[number];
export type TributoSimples = 'IRPJ' | 'CSLL' | 'COFINS' | 'PIS' | 'CBS' | 'IBS' | 'CPP' | 'ICMS' | 'ISS' | 'IPI';

export interface FaixaSimples {
  faixa: 1 | 2 | 3 | 4 | 5 | 6;
  receitaAteCents: number;          // limite superior da faixa (RBT12); centavos inteiros
  aliquotaNominal: string;          // decimal exato da fonte, ex. '13.50'
  parcelaDeduzirCents: number;
  reparticao: Partial<Record<TributoSimples, string>>; // '%' exatos da fonte; soma = '100.00' (asserido)
}
export interface TabelaAnexo {
  anexo: AnexoSimples;
  vigenteDesde: string;             // date-only, ex. '2027-01-01'
  vigenteAte: string | null;        // '2028-12-31' | null
  faixas: readonly FaixaSimples[];
  tetoIss: { percentual: string; limiarEfetiva5aFaixa: string; transfereAIbs: boolean } | null; // Anexo III (*); null em 2033+
  fonte: string;                    // 'LC 214/2025 art. 519, Anexo XX' | 'LC 123/2006 Anexo III (red. LC 155)'
  linhaFonte: number;               // ordinal na fonte (chave; nunca o código de negócio)
}

// models/simplesEnquadramento.ts — F-SN-3 (a): só linhas com fonte
export interface EnquadramentoAtividade {
  natureza: 'SERVICO' | 'REVENDA';
  cTribNac: string | null;          // '060101' | '060201' | '060301' | null (revenda)
  anexo: AnexoSimples;
  fatorR: boolean;                  // true só para §5º-I / §5º-M
  fonte: string;                    // 'LC 123 art. 17 §2º + art. 18 §5º-F'
  confirmadoPorContador: boolean;   // pendência §8 item 1
}
```

```ts
// dtos/SimplesApuracaoDto.ts — .strict() em tudo; centavos = number inteiro ≤ MAX_CENTS na API (padrão PostingDto/
// FixedAssetDto), BigInt só na persistência (memória max-cents-e-politica-nao-persistencia)
const cents = z.number().int().min(0).max(MAX_CENTS);
export const CompetenciaParamSchema = z.object({ competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).strict();

export const SimplesHistoricoUpsertSchema = z.object({            // item 7 — pré-adoção
  unitId: z.string().min(1),
  receitaBrutaCents: cents,                                       // mercado interno (art. 3º §15 separa exportação)
  folhaCents: cents.nullable().optional(),                        // só se fator R (F-SN-4)
  sourceDocumentId: z.string().min(1).nullable().optional(),      // extrato PGDAS-D anexado
}).strict();

export const SimplesSegregacaoManualSchema = z.object({           // F-SN-6 (b), interino
  unitId: z.string().min(1),
  revendaMonofasicoCents: cents.default(0),
  revendaIcmsStCents: cents.default(0),
}).strict();

export const SimplesDasRegistroSchema = z.object({                // F-SN-8 (b) — o oráculo
  unitId: z.string().min(1),
  numeroDocumento: z.string().trim().min(1).max(40),
  valorCents: cents.refine((v) => v > 0),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),            // date-only; calendário validado (memória date-only-regex)
  sourceDocumentId: z.string().min(1).nullable().optional(),      // PDF do DAS
}).strict();
```

```ts
// Saída da apuração (GET /api/accounting/simples/apuracoes/:competencia)
interface ApuracaoSimples {
  competencia: string;
  rbt12Cents: number;
  janelaRbt12: { de: string; ate: string; regra: 'LC123-art18-§1' | 'LC214-art517-2027' };
  atividades: Array<{
    anexo: AnexoSimples; natureza: 'SERVICO' | 'REVENDA'; cTribNac: string | null;
    receitaCents: number; faixa: number; aliquotaNominal: string; parcelaDeduzirCents: number;
    aliquotaEfetiva: string;                         // precisão/arredondamento: pendência §8 item 9
    segregacoes: { monofasicoCents: number; icmsStCents: number; issRetidoCents: number; issOutroMunicipioCents: number };
    tributos: Partial<Record<TributoSimples, number>>;
  }>;
  totalCalculadoCents: number;
  dasOficial: { numeroDocumento: string; valorCents: number; vencimento: string } | null;
  divergenciaCents: number | null;                   // oficial − calculado
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };   // F-SN-5 (c)
  alertas: Array<{ codigo: 'ATIVIDADE_SEM_ANEXO' | 'RBT12_INCOMPLETO' | 'LIMITE_ME_EXCEDIDO' | 'LIMITE_EPP_EXCEDIDO'
    | 'SUBLIMITE_ICMS_ISS' | 'SEGREGACAO_MANUAL' | 'PARCERIA_NAO_MODELADA' | 'TIEOUT_DIVERGENTE'; detalhe: string }>;
  tabela: { anexo: AnexoSimples; vigenteDesde: string; fonte: string }[];
}
```

Rotas (esboço; registro em 2 toques, deny-by-default):

- `PUT /api/accounting/simples/historico/:competencia`: item 7.
- `POST /api/accounting/simples/apuracoes/:competencia/calcular`: rascunho idempotente.
- `GET /api/accounting/simples/apuracoes/:competencia`: espelho.
- `PUT /api/accounting/simples/apuracoes/:competencia/das`: registro do oficial; dispara F-SN-10 (a) se ratificado.

## 7. Exemplo numérico (aritmética do agente sobre a lei — **não é oráculo**)

Hipótese: RBT12 de R$ 600.000,00; no mês, R$ 50.000,00 de serviços (Anexo III) e R$ 5.000,00 de revenda (Anexo I). As
duas atividades estão na 3ª faixa. Conferido com `Decimal` nesta sessão.

- **Anexo III**: alíquota efetiva = (600.000 × 13,5% − 17.640) / 600.000 = **10,56%**. DAS de serviços = **R$ 5.280,00**.
  - 2026: IRPJ 211,20 · CSLL 184,80 · COFINS 720,19 · PIS 156,29 · CPP 2.291,52 · ISS 1.716,00.
  - 2027: CBS 866,45 + IBS 10,03 substituem COFINS + PIS (876,48 nos dois casos). **O total não muda**, o que é coerente
    com o § 1º-C.
  - ISS efetivo de 3,432%, abaixo do teto de 5%.
- **Anexo I**: alíquota efetiva **7,19%**.
  - Sem segregar: R$ 359,50.
  - 2026, com monofásico de PIS/COFINS (sem ST: perfumaria saiu da ST em SP em 01/04/2026), sobram 84,50% da
    repartição: **R$ 303,78**.
  - 2027: sem segregação (a CBS não tem monofásico para cosmético, **I**): **R$ 359,50**.
  - (A 1ª versão deste PRE-ADR usava também ICMS-ST e chegava a R$ 183,35 / R$ 239,07; a 2ª passada derrubou a ST.)

O oráculo é o DAS que o portal gera para o cliente real (§11, gate humano). O arredondamento por tributo do PGDAS-D é
**NV**.

## 8. Pendente de validação externa (não entra em checklist até ter fonte ou resposta)

Contador e dado do cliente. Vira pedido pela `luminaris-contador-liaison`; quem envia é o dono.

1. **Enquadramento** de 6.01/6.02/6.03 no Anexo III (**I**). Confirmar também os CNAEs do cliente (a Res. CGSN 140,
   Anexo VI, não foi lida).
2. **Revenda em SP**: quais NCMs o salão vende; se o monofásico da Lei 10.147 se aplica a eles (lei **V**, aplicação
   **I**). A ST de perfumaria e higiene acabou em 01/04/2026 (**V**). Há estoque comprado com ST antes disso (Portaria CAT
   28/20)?
3. **Caixa ou competência** em 2026: qual foi a opção do cliente.
4. **Parceria da Lei 12.592**: o cliente usa? O contrato é homologado pelo sindicato (§ 8º)? Qual a cota-parte? A cota
   do salão é aluguel de bem móvel ou gestão (§ 4º)? Isso muda o anexo e o ISS dessa parcela.
5. **Histórico de 12 a 13 meses** de receita (e folha, se houver fator R): extratos do PGDAS-D do cliente. **Dado externo.**
6. **Contas** para a provisão do DAS e para o mapeamento na DRE. A CPP dentro do DAS é dedução da receita ou despesa?
7. **Pacote pré-pago**: para o Simples, a receita bruta nasce na venda ou no consumo? (`pacoteFatoGerador`; contexto
   E-1/E-2 da D-2026-09-29.)
8. **DEFIS**: quem entrega a de 2026? A declaração anual continua depois de 2027? (**I** pela nova redação do art. 25.)
9. **Arredondamento** do PGDAS-D: casas decimais da alíquota efetiva e arredondamento por tributo. A Res. 140 e o
   manual foram buscados por "arredond" e não trazem a regra: só o DAS real responde.
10. **ISS em SP**: SP adota valor fixo (§ 18)? Há retenção por tomador PJ nos itens 6.xx? **DIFAL** nas compras de outro
    estado (fica fora do DAS, art. 13 § 1º XIII "h")?
11. **Opção de IBS/CBS no 2º semestre de 2027** (março de 2027): decisão do dono e do contador.
12. ~~**Livro-caixa**~~: **resolvido** na 2ª passada. A escrituração contábil dispensa o livro caixa (Res. 140 art. 63 § 3º).
13. **`pTotTribSN` da DPS**: é a alíquota efetiva do Simples? (Semântica **NV**.) Se for, o cálculo o alimenta em vez
    do campo digitado.

## 9. Insumos ausentes

*2ª passada:* os seis insumos da 1ª versão entraram no corpus (§2.3-b). Sobram:

- **Texto da Res. CGSN 191/2026** e das Res. 184–190 e 192. A compilação da Res. 140 no Normas vai só até a 183/2025,
  e a consulta do Normas não renderiza fora do navegador. Fonte possível: o DOU.
- **Regulamentação de 2027**: manual do PGDAS-D com IBS/CBS e ato do CGSN sobre a opção semestral. O manual baixado
  (jun/2025) não trata disso.
- **Portaria CAT 28/20** (SP): tratamento do estoque que saiu da ST.

## 10. Achados fora de escopo (registrados, não planejados)

1. **`ibsCbsInformar` sem vigência** (`FiscalProfileService.ts:151`): default SIMPLES → false. Pelo Ato 4 § 1º
   (V-dossiê), o Simples passa a informar IBS/CBS na NFS-e em **01/01/2027**, e o default não vira sozinho. Dono:
   FE-INCR-DFE / X10b.
2. **Opção pelo Simples muda para setembro** (LC 123 art. 16 § 2º, red. 2027; art. 87-B). Afeta o texto do
   onboarding/perfil.
3. **Split payment × DAS** (LC 123 art. 21 § 3º-A, red. 2027): o IBS/CBS pode ser extinto na liquidação. O efeito no DAS
   fica para o PRE-ADR do split.
4. **Livro-caixa** do ME/EPP (art. 26 § 2º) não está na matriz de obrigações.
5. **Distribuição isenta acima da presunção** quando há escrituração (art. 14 §§ 1º–2º): é valor de produto da
   contabilidade completa. Não planejado.
6. **Divergência textual** no Anexo XX (2027–28): a nota fala em transferir o excesso do ISS "aos tributos federais", mas
   a linha da fórmula inclui o IBS (0,26%), e a nova redação do art. 18 § 1º-B I diz "federais e IBS". O parser segue
   a fórmula e o art. 18; isso vira pendência se o contador divergir.

## 11. Como entra na fila (depois da ratificação)

1. O dono ratifica (ou não) F-SN-0..12. A decisão vira nota em `docs/plano/decisoes/`.
2. Nasce o nó `nos/X14.md` (id de F-SN-1). Arestas propostas:
   - `depende_de`: [[X13]] ✅ (perfil e matriz);
   - [[X10a]]? pontilhada: atributo fiscal do produto e semântica da IE, pela decisão 5; F-SN-6 (b) cobre o
     intervalo;
   - [[FE-INCR-DFE]]? pontilhada: conferência NFS-e × receita.

   Desbloqueia o PRE-ADR de IBS/CBS 2027 **só** na parte do DAS; o regime regular fica no PRE-ADR de IBS/CBS.
3. `sessao-planejamento` escreve o BRIEF `docs/accounting/BE-INCR-SIMPLES-NACIONAL-brief.md`, só backend (o FE é
   nó vizinho).
4. Código só com "executa".
5. **Gate humano (RUNBOOK-FORMAT; o agente prepara em branco):** para N competências reais do 1º cliente, colar o DAS
   do portal ao lado do espelho. Desfecho em 3 estados, assinado pelo dono. **Sem isso o cálculo não está provado.**

## Riscos desta proposta (incluindo os vieses do autor)

- **O enquadramento do salão ainda depende de um juízo.** A 2ª passada achou a base oficial (Res. 140 art. 25 § 1º III
  "m"), mas "serviço de beleza não é atividade intelectual" continua sendo leitura, e não existe tabela oficial CNAE ×
  anexo. Se o contador puser o 6.02 (estética) em outro inciso, a alíquota muda por inteiro.
- **A 1ª versão errou dois fatos que a 2ª passada corrigiu:** chamou o Anexo VI da Res. 140 de "CNAE × anexo" (é a
  lista de impeditivos), e supôs ICMS-ST em cosméticos em SP (acabou em 01/04/2026). Os dois vieram de busca, não de
  leitura. É o motivo desta regra: fonte não lida é NV.
- **Desenho puxado pela lei, não pelo portal.** O PGDAS-D pode pedir a segregação com granularidade diferente da do
  §6. O espelho (F-SN-8 b) depende de um manual que ninguém leu.
- **Viés do autor:** tendência a tratar como fato consumado a aritmética que eu mesmo fiz (§7), e a recomendar a opção
  mais completa (F-SN-4 a, F-SN-5 c), que tem mais código. O contrapeso está explícito: §7 "não é oráculo" e gate
  humano no §11.5.
- **Fonte lida fora do repo.** O HTML das duas leis não é versionado. Li cópias locais com o sha do MANIFEST, e
  qualquer releitura precisa baixar de novo e conferir o sha.
- **Sessões paralelas:** o "ADR do X7" está sendo escrito ao mesmo tempo. Se ele reivindicar o Simples, F-SN-1 decide
  quem fica com o quê.
