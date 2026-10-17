# Relatório de pesquisa legal — verif-2026-10-17-lgpd-cdc-obrigacoes

**Pergunta:** As decisões do projeto baseadas em LGPD, CDC/CC (encargos, prazos, feriados), DCTFWeb/MIT, CNPJ alfanumérico, retenções/INSS do parceiro, pagamentos e guarda seguem o texto vigente em 17/10/2026?
**Aberto em:** 2026-10-17T09:54:24-03:00 · **Atualizado em:** 2026-10-17T10:06:19-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
De 22 decisões ou parâmetros desta frente, **16 conferem** com o texto vigente em 17/10/2026. Há **2 divergências** e **2 riscos de desatualização**. Outros **2 itens não foram verificáveis** nesta sessão. Nenhum parâmetro já gravado em código ficou errado por lei nova. As divergências estão em BRIEF ou emenda ainda não implementados, e no calendário de feriados do pacote.

- **DIVERGE 1. Retenção de IRRF no AP (EMENDAS-BRIEF-2026-10-11 §7, E7-3).** A emenda sugere 1,5% para todo prestador fora do Simples. O RIR art. 714 só aplica 1,5% aos serviços "caracterizadamente de natureza profissional" da lista do §1º [D27]. Outros serviços têm alíquota própria ou não têm retenção. O BRIEF precisa da condição "serviço da lista do art. 714 §1º", ou de uma tabela por tipo de serviço. A dispensa até R$ 10 confere (RIR art. 785 II [D27]; Lei 9.430 art. 67 [D12]).
- **DIVERGE 2. Validade do pacote (`server/src/features/packages/models/validity.ts:42`).** O código prorroga só em feriado nacional. Pela Lei 9.093/1995, também são feriado a data magna estadual (art. 1º II), o centenário municipal (art. 1º III) e até 4 feriados religiosos municipais, incluindo a Sexta-feira da Paixão (art. 2º) [D04]. O CC art. 132 §1º prorroga o vencimento que cai "em feriado" sem distinguir a esfera [D03]. Em SP, um pacote que vence em 09/07 ou na Sexta-feira Santa expira um dia antes do que a lei manda. O F-E4-1 (a) já foi ratificado para isso, mas falta o "executa" (inferido).
- **DESATUALIZADO-RISCO.** O comentário "IN RFB 2.229/2024 em produção desde 01/07/2026" (`server/src/lib/cnpj.ts:8`) afirma mais do que a norma diz. A IN 2.119 art. 2º p.ú., compilada hoje [D24], continua dizendo "previsão de implementação a partir de julho de 2026". O formato e o DV conferem com o Anexo XV [D26]. A data efetiva de produção não está na norma.
- **DESATUALIZADO-RISCO.** O job `PurgeDeletedRecords` apaga de vez as linhas de DynamicTable que foram apagadas há mais de 90 dias, e o código o justifica como "LGPD". O CTN art. 195 p.ú. manda guardar os comprovantes dos lançamentos "até que ocorra a prescrição" [D16]. A LGPD art. 16 I permite guardar dado para cumprir obrigação legal [D01]. Se uma linha de venda já lançada no razão puder ser apagada e expurgada, o comprovante some antes do prazo. Grau inferido: não confirmei se essa linha pode ser apagada.

## 2. Fundamentação
| # | Decisão (onde) | Norma | Fonte | Trecho / status |
|---|---|---|---|---|
| 1 | DCTFWeb obrigatória para PJ em geral (`legal_parameters_v2.sql:157-159`) | IN 2.237 art. 3º I | [D21] | "as pessoas jurídicas de direito privado em geral" (CONFERE) |
| 2 | DCTFWeb do MEI CONDICIONAL (`:160`) | IN 2.237 art. 3º IX, art. 4º IX | [D21] | MEI só se contratar segurado, reter IR etc. (CONFERE) |
| 3 | PJ inativa: CONDICIONAL, entrega o 1º mês sem movimento | IN 2.237 art. 4º e art. 6º §2º II | [D21] | nenhuma dispensa para inativa; "relativa ao primeiro mês sem movimento" (CONFERE) |
| 4 | Vigência 01/01/2025; `anoCalendario.min(2025)` (`MitExportDto.ts:11`) | IN 2.237 art. 1º §1º I | [D21] | "a partir de 1º de janeiro de 2025" (CONFERE) |
| 5 | Prazo da DCTFWeb: último dia útil do mês seguinte (ADR-INCR-DCTFWEB-MIT:78) | IN 2.237 art. 6º (red. vigente) | [D21] | o "dia 25" está tachado; vale o último dia útil (CONFERE) |
| 6 | Simples/MEI ⇒ 400 no MIT (BRIEF MIT item 10) | IN 2.237 art. 8º §4º | [D21] | "não deverão informar na DCTFWeb" (CONFERE) |
| 7 | A retificadora substitui tudo; divergência obriga retificar | IN 2.237 art. 13 §1º, §7º, §9º | [D21] | (CONFERE) |
| 8 | Multa da DCTFWeb: 2% ao mês, até 20%, mínimo R$ 200/500 | IN 2.237 art. 11 | [D21] | (CONFERE) |
| 9 | CNPJ com 14 posições, 12 alfanuméricas e 2 DV numéricos; valor = ASCII − 48; módulo 11 (`lib/cnpj.ts`) | IN 2.119 art. 2º p.ú. + Anexo XV (IN 2.229) | [D24][D26] | exemplo oficial 12ABC34501DE → DV 35; o código devolve 35 (CONFERE) |
| 10 | Data "em produção desde 01/07/2026" (`lib/cnpj.ts:8`) | IN 2.119 art. 2º p.ú. | [D24] | só "previsão... a partir de julho de 2026" (RISCO) |
| 11 | Feriados nacionais fixos (`legal_parameters_v2.sql:501-509`) | Lei 662 art. 1º (red. 10.607); Lei 6.802 art. 1º; Lei 14.759 art. 1º | [D05][D19][D18] | os 9 dias conferem; a Lei 14.759 vigora desde a publicação (22/12/2023), e `vigenteDesde 2024-01-01` não muda nenhum caso (CONFERE) |
| 12 | Domingo de eleição como feriado (`validity.ts:31`) | Código Eleitoral art. 380 | [D13] | (CONFERE) |
| 13 | Sexta-feira da Paixão é feriado municipal (`validity.ts:17`) | Lei 9.093 art. 2º | [D04] | (CONFERE) |
| 14 | Prorrogação só em feriado nacional (`validity.ts:42`) | CC 132 §1º + Lei 9.093 arts. 1º e 2º | [D03][D04] | (DIVERGE: ver §1) |
| 15 | Contagem do prazo do pacote: exclui o dia da venda e inclui o último (`validity.ts:8`) | CC 132 caput | [D03] | (CONFERE) |
| 16 | Teto de multa de 2% para consumidor PF (EMENDAS §4 E4-1) | CDC 52 §1º | [D02] | texto: "não poderão ser superiores a dois por cento". Na letra, o caput do art. 52 trata de crédito ou financiamento (CONFERE o texto; a extensão a serviço vem do STJ, não verificada) |
| 17 | Documento de cobrança com nome, endereço e CPF/CNPJ do fornecedor (L-COB-1) | CDC 42-A | [D02] | (CONFERE) |
| 18 | Juros legais = Selic − IPCA, mínimo 0 | CC 406 §§1º-3º (Lei 14.905/2024) | [D03] | (CONFERE) |
| 19 | Lei 7.089 alcança só banco e instituição financeira | Lei 7.089 art. 1º | [D20] | (CONFERE o texto; a instituição de pagamento segue aberta) |
| 20 | Retenção de INSS de 11% do parceiro PF, recolhida até o dia 20 | Lei 10.666 art. 4º; IN 2.110 arts. 37 II "a", 41 I e 165 I | [D09][D23] | (CONFERE; a lei também traz "até o dia útil imediatamente anterior") |
| 21 | IRRF de 1,5% como tomador; dispensa até R$ 10 (E7-3) | RIR arts. 714 e 785 II | [D27] | dispensa CONFERE; o escopo de 1,5% DIVERGE |
| 22 | CSRF 4,65%, com dispensa até R$ 10 | Lei 10.833 arts. 30, 31 e §3º | [D11] | CONFERE, mas há "Vide LC 214/2025" no §1º (ver §3) |
| 23 | Base LGPD para enviar CPF ao provedor (BRIEF PP §6.1 P5) | LGPD art. 7º V e IX; art. 9º V; art. 5º VI e VII | [D01][D28] | o texto lido confere; o enquadramento fica para o advogado |
| 24 | Lista de espera: consentimento, finalidade, revogação, minimização; CDC 30 e 37 §1º (dossiê waitlist-lgpd-cdc) | LGPD arts. 6º III, 7º I, 8º §§4º-5º, 9º I; CDC 30 e 37 §1º | [D01][D02][D28] | segue vigente (CONFERE) |
| 25 | W6: campo de saúde é dado sensível; privacy by design (dossiê w6) | LGPD arts. 5º II, 11, 38, 46 §2º | [D01][D28] | segue vigente (CONFERE) |
| 26 | Guarda do log de entrega por 5 anos (ADR-CONTADOR-DELIVERY:303) | CTN 195 p.ú., 173, 174 | [D16] | a lei diz "até a prescrição", não 5 anos; o log não é comprovante de lançamento (CONFERE, com ressalva) |

## 3. Vigência conferida
- **Alertas do acervo e como os resolvi:**
  - Lei 6.802 [D06] e Lei 7.089 [D08] estavam na versão original. Conferi no Planalto [D19][D20]: o texto é o mesmo, sem alteração.
  - A Lei 14.759 no acervo [D07] é só a retificação das assinaturas. O texto integral veio do Planalto [D18].
  - O RIR no acervo [D14] tem o corpo vazio (25 linhas). O texto veio do Planalto [D27].
  - As IN RFB 2.237, 2.229, 2.119 e 2.110 não estão no acervo, que só tem IN de fev/2025 em diante. Li a visão multivigente da API oficial da Receita [D21-D24]. O JSON foi convertido por `scratchpad/ato2txt.py`, e o `.txt` derivado substitui o gerado pela ferramenta. O hash é o do JSON bruto.
- **Alterações posteriores:**
  - A IN 2.237 foi alterada pelas IN 2.248/2025, 2.267/2025, 2.319/2026 e 2.325/2026. Nenhuma toca nos arts. 3º, 4º, 6º §2º e 8º §4º usados no projeto. O art. 6º já estava no último dia útil quando o ADR foi escrito.
  - A IN 2.119 foi alterada pelas IN 2.290/2025, 2.333/2026, 2.340/2026 e 2.345/2026. A 2.333 [D25] só troca os Anexos VI e VIII e revoga o art. 57. Na compilada [D24], o art. 2º p.ú. e o Anexo XV seguem com o texto da 2.229.
- **LGPD:** a cópia do acervo (13/10) [D01] não traz a Lei 15.352/2026, mas a compilada do Planalto [D28] traz. Essa lei transforma a ANPD em "Agência Nacional de Proteção de Dados" e mexe nos arts. 5º VIII e XIX e 55-A ss. **Não muda** os arts. 5º II, VI e VII, 6º, 7º, 8º, 9º, 11, 16, 38 e 46 usados nas decisões.
- **CTN:** o art. 174 ganhou incisos novos de interrupção pela LC 236 (04/09/2026). O prazo de 5 anos não mudou [D16].
- **Pendência futura:** a Lei 10.833 art. 31 §1º traz "Vide LC 214/2025" [D11]. Com a CBS a partir de 2027, a parcela PIS/Cofins da CSRF tende a mudar. Esta frente não lê a LC 214, que é da frente de PIS/Cofins.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **CDC 52 §1º fora de contrato de crédito.**
   - Leitura literal: o teto de 2% vale só para o fornecimento com crédito ou financiamento.
   - Leitura ampla (STJ, segundo a pesquisa de 10/10, sem conferência minha): o teto vale para toda relação de consumo.
   - Mais segura: travar em 2% para PF, como está no E4-1.
   - Pergunta ao advogado: "Há precedente vinculante do STJ que estenda o CDC 52 §1º a serviço pago em parcelas sem financiamento?"
2. **Sábado no CC 132 §1º.**
   - O código trata o sábado como dia útil. O CC não define dia útil.
   - A Lei 7.089 protege o sábado, mas só quando quem cobra é banco ou instituição financeira [D20].
   - Mais segura para a validade do pacote: tratar também o sábado como não útil, porque o CDC 47 manda interpretar a favor do consumidor [D02].
   - Custo: um dia de validade a mais em alguns casos.
3. **IRRF de 1,5%: quais serviços.**
   - O E7-3 não diz se o fornecedor é da lista do RIR 714 §1º.
   - Opção (a): o cadastro do fornecedor marca "serviço profissional (art. 714)".
   - Opção (b): uma tabela por tipo de serviço, com alíquotas de 1,5%, 1% e outras.
   - A decisão é do dono. A norma não deixa a sugestão de 1,5% para todos.
4. **Purge de 90 dias × guarda fiscal.**
   - É preciso saber se uma linha de venda já lançada pode ser apagada no DynamicTable.
   - Se puder, a correção é excluir do purge as linhas referenciadas pelo razão até a prescrição.
   - Precisa de leitura de código; não é dúvida de lei.

## 5. Lacunas
- **IN SRF 765/2007** (Simples sem IRRF, declaração do prestador): não li nesta sessão. O ato não está no acervo e não localizei o idAto no Sijut. NÃO VERIFICÁVEL aqui.
- **Resoluções da ANPD** (agentes de pequeno porte, incidentes, RIPD, encarregado): o projeto não tem nenhuma decisão baseada nelas (grep sem resultado), e o acervo não tem a ANPD. Nada a conferir. Fica a lacuna de produto: não há fluxo de incidente.
- **Res. Conjunta BCB/CMN 1/2020 (Open Finance):** não reconferi. Foi lida na API do BCB em 10/10 (menos de 90 dias); as alterações posteriores não foram conferidas artigo por artigo.
- **Lei 12.865 e Decreto 7.962:** baixados [D17][D15], mas nenhuma decisão do projeto os cita.
- **Jurisprudência do STJ** (CDC 52, CC 132): não conferida em stj.jus.br nesta sessão.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.709 de 14/08/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/183a6accb5801eb88fe63d57acdd375ae6339401/federal/leis-ordinarias/2018/lei-13709-2018-08-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:55:50-03:00 · arquivo local `docs/D01_lei-13709-2018-08-14.md` · SHA-256 `72d32431037ce85955c6f959f50f11d10971a8ec36f93cdae5ee3459ec66a4dd`
- **[D02]** Lei nº 8.078 de 11/09/1990 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/b7ec7b79cc380cc70b633c8b6c303c25c5b1825c/federal/leis-ordinarias/1990/lei-8078-1990-09-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-09-11;8078> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:55:52-03:00 · arquivo local `docs/D02_lei-8078-1990-09-11.md` · SHA-256 `fc47a9f4f9647c0bc86ab9399165653c70c0042d5b749b0558c6691a002b7d69`
- **[D03]** Lei nº 10.406 de 10/01/2002 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/40fe0ecf521a6ae5e22077bcc927c90a9477d3a5/federal/leis-ordinarias/2002/lei-10406-2002-01-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:55:54-03:00 · arquivo local `docs/D03_lei-10406-2002-01-10.md` · SHA-256 `be0cd7d8a1eaacb21cb64f07086929db91f43ad3149b3c721cd33873d328c32c`
- **[D04]** Lei nº 9.093 de 12/09/1995 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9e23d891255247e1287273e4f32bff894183c12f/federal/leis-ordinarias/1995/lei-9093-1995-09-12.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1995-09-12;9093> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:55:56-03:00 · arquivo local `docs/D04_lei-9093-1995-09-12.md` · SHA-256 `c7a5ab67566325a069cceae6120042d48a5cb6591acd4929e78880b6c0098957`
- **[D05]** Lei nº 662 de 06/04/1949 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a8ffff23fc3bfa941c6fdad903b9429e3c6371c8/federal/leis-ordinarias/1949/lei-662-1949-04-06.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1949-04-06;662> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:55:59-03:00 · arquivo local `docs/D05_lei-662-1949-04-06.md` · SHA-256 `52b0b95bbce511184a63823ca3b341dd3249c3fea06775f7d7e1dcc9ecf32142`
- **[D06]** Lei nº 6.802 de 30/06/1980 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/d59dbf0cf0a19452f65bf3104eaaf22de4a8b9ba/federal/leis-ordinarias/1980/lei-6802-1980-06-30.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1980-06-30;6802> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:01-03:00 · arquivo local `docs/D06_lei-6802-1980-06-30.md` · SHA-256 `38c367ad7891ba0c0a77f55d7997ec805974d55e66ea98d6bd0de8cff197f523`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D07]** Lei nº 14.759 de 21/12/2023 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/2be2554342e10a19c16058e427dbd3822364d8a9/federal/leis-ordinarias/2023/lei-14759-2023-12-21.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2023-12-21;14759> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:04-03:00 · arquivo local `docs/D07_lei-14759-2023-12-21.md` · SHA-256 `3458ce4b0eb829284797bd34f7c19959daca396e85c278b63a2805066a267787`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ corpo curto ou com aviso (texto integral pode faltar)
- **[D08]** Lei nº 7.089 de 23/03/1983 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a2f7fb2f049b10a5ea60dc86cb16952ab705ca0d/federal/leis-ordinarias/1983/lei-7089-1983-03-23.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1983-03-23;7089> · versao_texto: original · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:06-03:00 · arquivo local `docs/D08_lei-7089-1983-03-23.md` · SHA-256 `e188b08157b6b676b8bbf1c80cde221f687ebfb10ace84ac080e069406923637`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D09]** Lei nº 10.666 de 08/05/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/8d5689c5609a8924f8f487dcad5ec2877f0bc2de/federal/leis-ordinarias/2003/lei-10666-2003-05-08.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-05-08;10666> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:08-03:00 · arquivo local `docs/D09_lei-10666-2003-05-08.md` · SHA-256 `3311fc0954581236c74cbcd937470a15a481f5a858b6197fc538ce11e824d827`
- **[D10]** Lei nº 8.212 de 24/07/1991 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/9b29f44078e25755cfaf358456dd815043075924/federal/leis-ordinarias/1991/lei-8212-1991-07-24.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1991-07-24;8212> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:11-03:00 · arquivo local `docs/D10_lei-8212-1991-07-24.md` · SHA-256 `6ace89674b04578f1f2ff4e16d4ab89e4a251e1da7b44b288870cc63ec2bb0b7`
- **[D11]** Lei nº 10.833 de 29/12/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/17688c9637f6a90b7faace6d797aedfa3f6b2ff0/federal/leis-ordinarias/2003/lei-10833-2003-12-29.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2003-12-29;10833> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:13-03:00 · arquivo local `docs/D11_lei-10833-2003-12-29.md` · SHA-256 `fa0d994627d9e1476d625a9f0b588e596181735b922bdcdf9c1c0336fd06b9fc`
- **[D12]** Lei nº 9.430 de 27/12/1996 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6c8aa8aa7d6126d14c332df3ab07f956b17f4bf2/federal/leis-ordinarias/1996/lei-9430-1996-12-27.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-27;9430> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:15-03:00 · arquivo local `docs/D12_lei-9430-1996-12-27.md` · SHA-256 `6e8e20371d0e7796244402441b7e3fc72df83a7bbe640029d4919359a6115bcc`
- **[D13]** Lei nº 4.737 de 15/07/1965 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/11bcb39cf9ff88828a4e2746fe923af2c387d00d/federal/leis-ordinarias/1965/lei-4737-1965-07-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1965-07-15;4737> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:17-03:00 · arquivo local `docs/D13_lei-4737-1965-07-15.md` · SHA-256 `8e366162b6f79c750746ce51857ae94a77c2133de540986596a4100622d69b2f`
- **[D14]** Decreto nº 9.580 de 22/11/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2018/dec-9580-2018-11-22.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2018-11-22;9580> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:56:19-03:00 · arquivo local `docs/D14_dec-9580-2018-11-22.md` · SHA-256 `2c328212c1a8408eaa64072debe9860ecb435a731150296702b0583f00acfe6e`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D15]** Decreto nº 7.962 de 15/03/2013 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2013/dec-7962-2013-03-15.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2013-03-15;7962> · versao_texto: original · cópia de 2026-10-16  
  Lido em 2026-10-17T09:56:21-03:00 · arquivo local `docs/D15_dec-7962-2013-03-15.md` · SHA-256 `29024d783fd7a78a19ba4f51814649543cfa91bdeb3b2bcf3687579f5d3472d8`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D16]** Lei nº 5.172 de 25/10/1966 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/04685ef7689b7028d0dc835e5cde644ad7a2d328/federal/leis-ordinarias/1966/lei-5172-1966-10-25.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:1966-10-25;5172> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:23-03:00 · arquivo local `docs/D16_lei-5172-1966-10-25.md` · SHA-256 `fe8ef71d4ebe8c0d04d3422ca95853e15291c5c7ca6168cd34ae7b8ee6e3983b`
- **[D17]** Lei nº 12.865 de 09/10/2013 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/5b557d54c8858c263cea65891bc64903b771d7b6/federal/leis-ordinarias/2013/lei-12865-2013-10-09.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2013-10-09;12865> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T09:56:24-03:00 · arquivo local `docs/D17_lei-12865-2013-10-09.md` · SHA-256 `4840f6b095cd147d3aa7ccc76da73e0af4665ec481d2360da501dbe1299f9855`
- **[D18]** L14759 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm>  
  Baixado em 2026-10-17T09:57:07-03:00 · arquivo local `docs/D18_l14759-htm.html` · SHA-256 `82dfafb2b05ab7795baa2134a6474955fdf1b87779a5346beea3d265559ecb55`
- **[D19]** L6802 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l6802.htm>  
  Baixado em 2026-10-17T09:57:07-03:00 · arquivo local `docs/D19_l6802-htm.html` · SHA-256 `20680689c30dbe2d4ef99de5ea9df65ad4837c4619c16b6e009a73d2740955e2`
- **[D20]** L7089 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/l7089.htm>  
  Baixado em 2026-10-17T09:57:07-03:00 · arquivo local `docs/D20_l7089-htm.html` · SHA-256 `a3110cd448c2ad5f76c2ad8e65bb89e95448bd50502075dc366080b475723f0f`
- **[D21]** D21_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/141910/visao/multivigente>  
  Baixado em 2026-10-17T09:58:45-03:00 · arquivo local `docs/D21_multivigente.html` · SHA-256 `d80a3ba09ae418f6dd587bd62d0bc57415de569ca3ab85a21a3cb746ade9d95e`
- **[D22]** D22_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/141102/visao/multivigente>  
  Baixado em 2026-10-17T09:58:45-03:00 · arquivo local `docs/D22_multivigente.html` · SHA-256 `c0d945332fc62fc404c92a82aaa0ec353fa50d2405a134f16dafefa53b772820`
- **[D23]** D23_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/126687/visao/multivigente>  
  Baixado em 2026-10-17T09:58:46-03:00 · arquivo local `docs/D23_multivigente.html` · SHA-256 `584fcc1ba285747b20f701db8fcc6c3e7a62cf22b43a46c70d5e6882c56df8f5`
- **[D24]** D24_multivigente — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/127567/visao/multivigente>  
  Baixado em 2026-10-17T09:59:49-03:00 · arquivo local `docs/D24_multivigente.html` · SHA-256 `91ac8f8fc53b0f6ac144becc6346fce45766b2545d4001f880bc3bdab3c4c26c`
- **[D25]** INSTRUÇÃO NORMATIVA RFB Nº 2.333, DE 30 DE JUNHO DE 2026 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/808531961ddbb516885d7bb43171ee4f19656b80/reguladores/rfb/instrucoes-normativas/2026/instrucao-normativa-rfb-n-2.333-de-30-de-junho-de-2026-718142583.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/instrucao-normativa-rfb-n-2.333-de-30-de-junho-de-2026-718142583> · versao_texto: publicação original · cópia de 2026-10-15  
  Lido em 2026-10-17T09:59:58-03:00 · arquivo local `docs/D25_instrucao-normativa-rfb-n-2-333-de-30-de-junho-de-2026-71814.md` · SHA-256 `0a6e5378660b171cca4ac19926e88e57fe81003451ce52114487732a65af72fb`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D26]** D26_76204 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/127567/anexo/76204>  
  Baixado em 2026-10-17T10:00:13-03:00 · arquivo local `docs/D26_76204.pdf` · SHA-256 `a448bbbf0f1742ccdb04bc71f7814647aa1acd1c8c2199511474139b6c1bc903`
- **[D27]** D9580 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm>  
  Baixado em 2026-10-17T10:01:15-03:00 · arquivo local `docs/D27_d9580-htm.html` · SHA-256 `a54234a70f50e71075d12d2724a829eca5ee12f7db2758752fae391cd2b4f6f7`
- **[D28]** L13709compilado — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>  
  Baixado em 2026-10-17T10:02:01-03:00 · arquivo local `docs/D28_l13709compilado-htm.html` · SHA-256 `84de59be6c77fae6d3e1fbc3971040076e20daba882ad0a2389a7d8dfcdf0e4e`

## Registro de buscas
_Nenhuma busca registrada._
