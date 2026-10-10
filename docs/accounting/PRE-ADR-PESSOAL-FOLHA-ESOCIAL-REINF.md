# PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF — Domínio de pessoal: folha, eSocial e EFD-Reinf (estratégia, retenções e parceria do salão)

- **Data:** 2026-10-10
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork está decidido e nenhum código está autorizado.
- **Autorização (literal):** dono, chat, 2026-10-10, questionário: *"PRE-ADR folha+eSocial+Reinf"*. A opção foi
  descrita assim: *"Um PRE-ADR para o domínio de pessoal, com fork de estratégia: motor próprio, integração com a folha
  do contador ou por fases. A Reinf entra aqui pelas retenções."* Escopo: **só o documento**, sem código e sem
  "executa".
- **Passo 1 da `sessao-planejamento` (a autorização cobre o item?):** cobre exatamente o item. O texto do dono fixa o
  domínio (pessoal), o fork central (motor × integração × fases) e a porta de entrada da Reinf (retenções). Não há
  divergência a reportar.
- **Divergência de forma:** o pedido manda gravar em `docs/accounting/`, mas os PRE-ADRs usados como exemplo estão em
  `docs/adr/` (`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md`, `PRE-ADR-NUCLEO-KIT-DE-SETOR.md`,
  `PRE-ADR-ACCOUNTANT-GOVERNANCE.md`). Segui o caminho pedido. Se for ratificado, o dono decide se o arquivo vai para
  `docs/adr/`.
- **Nó:** nenhum. "Folha + eSocial" aparece só em `docs/plano/destino/18-caminho.md` §18.1, onda 4 (GATILHO/PROPOSTO),
  e em `diferidos/M5-subrazoes-restantes.md` (folha ⚫, sem autorização). Pela regra do vault, o item só vira nota em
  `nos/` depois de um PRE-ADR ratificado. A proposta de ids está em F-PES-1.
- **Autor:** `sessao-planejamento` (agente). Os forks são decididos pelo dono, fora desta sessão.
- **Base:** `origin/main` = `845d79ce` (refeito o fetch nesta sessão). Nenhum worktree ou branch trata do tema
  (`git worktree list`, `git branch -a`: só `claude/fix-contagem-contas-folha`, que trata de "conta-folha" no sentido
  de conta analítica e não tem relação com este item).

## TLDR

**O que se sabe:** a lei não obriga o Luminaris a ter um motor de folha para servir o 1º cliente. Ela obriga três
outras coisas, que hoje o sistema não cobre:

1. **A folha do fator R tem de ser a folha declarada no eSocial.** A Res. CGSN 140, art. 26 § 2º I, diz *"tão somente
   as remunerações informadas na forma prevista no inciso IV do art. 32 da Lei nº 8.212"*. Hoje o X14 aceita uma folha
   digitada (`SimplesHistoricoMensal.folhaCents`).
2. **O salão-parceiro retém e recolhe os tributos e contribuições do profissional-parceiro** (Lei 12.592, art. 1º-A §
   3º e § 10 II). Hoje nenhuma linha do código trata disso.
3. **Quem retém IR na fonte declara pela EFD-Reinf (série R-4000)**, desde que a DIRF foi substituída (IN RFB 2.043,
   art. 3º VIII e § 1º). Hoje o contas a pagar não registra retenção nenhuma.

**Risco principal:** o eSocial **não aceita importação de arquivo**. Ou o software assina o XML com certificado
digital e transmite por webservice, ou alguém digita no portal (MOS S-1.3 §8.1). Por isso o caminho "motor próprio" (a)
traz junto a guarda do certificado A1 do cliente e uma superfície trabalhista inteira (13º, férias, rescisão, SST,
convenção coletiva) cujo oráculo é externo. Nada disso existe hoje.

**Recomendação do F-PES-0: (c), por fases.**
- **Fase 1 = integração.** O sistema importa os XML do eSocial e os totalizadores que a folha do contador já gerou,
  contabiliza, alimenta o fator R com a base legal correta, confere a DCTFWeb e registra as retenções da Reinf a partir
  do contas a pagar.
- **Fase 2 = motor próprio**, com gatilho explícito. Os models da fase 1 nascem com `origem` para a fase 2 entrar sem
  migração de semântica.

Uma parte depende de lei que a pesquisa **não** resolveu: o que o salão retém do parceiro pessoa física, e se a cota do
parceiro entra na folha do fator R. São as perguntas L-PES-1 a L-PES-3.

---

## 1. Problema e escopo (o objetivo sob a letra)

A letra é "PRE-ADR folha + eSocial + Reinf". O objetivo é **o tenant fechar o mês de pessoal sem refazer nada fora do
Luminaris**, isto é:

1. a despesa de pessoal e os encargos ficam no razão, por competência;
2. o fator R do Simples usa a folha que a lei manda usar;
3. as retenções que o tenant faz, como pagador, viram declaração (Reinf ou eSocial) e débito na DCTFWeb;
4. o salão com parceria cumpre a parte trabalhista e previdenciária da Lei 12.592 sem criar vínculo empregatício por
   descuido (art. 1º-C).

**Dentro:** empregado CLT, sócio com pró-labore, profissional-parceiro do salão, retenções na fonte feitas pelo tenant
(IR/CSRF/INSS de cessão de mão de obra), eSocial (como fonte ou como saída), EFD-Reinf, efeitos no fator R e na DCTFWeb.

**Fora:** ponto eletrônico, recrutamento, benefícios flexíveis, RPPS e órgão público, produtor rural, desporto. O §6.11
do destino ("RH nível TOTVS") está **sem texto** (`destino/06…` §6.11: *"Texto não recebido"*). Este PRE-ADR não
inventa esse texto.

**Oráculo.** A DCTFWeb nasce do eSocial, da EFD-Reinf e do MIT (IN 2.237, art. 5º I–II, lido no ADR do X9). O
oráculo das bases previdenciárias é o totalizador que o próprio eSocial devolve depois do S-1299 (MOS §10.3.2). O que o
Luminaris calcular é conferência ou saída. Não é a verdade fiscal.

## 2. Evidência

Graus de evidência:

| Grau | Significado |
|---|---|
| **V-fonte** | Lido na fonte primária nesta sessão (10/10) |
| **V-sec** | Fonte secundária lida nesta sessão |
| **V-repo** | Lido no repositório nesta sessão |
| **V-adr** | Verificado por um ADR do repo em sessão anterior e não relido aqui |
| **I** | Inferido |
| **NV** | Não verificado |

### 2.1 O que o repo já tem e que toca o tema (fato consumado)

| Peça | Estado | Evidência (V-repo) |
|---|---|---|
| Folha no plano | Diferida, sem autorização | `docs/plano/diferidos/M5-subrazoes-restantes.md` ("folha ⚫"); `destino/18-caminho.md` §18.1 onda 4 ("folha + eSocial", GATILHO/PROPOSTO) |
| Regra de fronteira | Folha é Prisma first-class. `PayrollEntry` é citada nominalmente como proibida em DynamicTable | `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1, `[AC-2.1-B1]`, `[AC-2.1-B2]`, `[AC-2.1-B3]` |
| Fator R (X14) | Função pura `fatorR()`: r ≥ 0,28 → Anexo III, senão V. Folha **declarada**: `folhaPaCents` na entrada e `SimplesHistoricoMensal.folhaCents` no histórico, "até a folha da onda 4 existir" | `server/src/features/accounting/models/simplesCalc.ts:247-334`; `server/prisma/schema.prisma:2571-2589`; BRIEF X14 itens 7 e 11 |
| Parceria (X14) | `SalaoParceriaContrato`: cota do salão em bp, `naturezaCota` ALUGUEL_BEM_MOVEL\|GESTAO, `homologadoEm` + `sindicato`, vigência e soft-delete. Só a cota do salão entra na receita bruta. **Não guarda a inscrição do parceiro (PF, MEI ou ME) e não calcula retenção** | `schema.prisma:2612-2632`; `simplesCalc.ts:30-31`; BRIEF X14 item 13 |
| `profissionalContactId` | String sem FK, que aponta para um contato fora do Prisma | `schema.prisma:2617`; `SimplesDto.ts:59` |
| Cadastro de pessoas | Preset **DynamicTable** `employees` (cargo, CPF, unidade, `serviceCommission`, `productCommission`, `monthlyCost`, `workSchedule`) | `server/src/features/dynamicTables/presets/modules/core/EmployeesModule.ts` |
| Comissões | Preset DynamicTable `commissions` (`employeeId`, `saleId`, `amount`, status Pending→Paid) mais o `CommissionsPlugin`, que só carimba `paidAt`. Não vai a lugar nenhum além da tabela | `presets/modules/finance/CommissionsModule.ts`; `rules/plugins/CommissionsPlugin.ts:1-40` |
| Retenções hoje | Só as **sofridas** pelo tenant como prestador: PIS/Cofins retido pelo cliente (X8 PR-3: `pisCofinsRetidoCompensarAccountId`) e ISS retido pelo tomador (`issRetidoTomadorPj`, `tpRetISSQN`). **Nenhuma retenção feita pelo tenant como pagador** | `schema.prisma:1442-1446, 1468, 1684`; `TaxAssessmentService.ts:118-176, 639-675` |
| Contas a pagar | `Payable` com `expenseAccountId`, sem campo de retenção | `schema.prisma:1007`; grep `reten` em `PayableDto.ts` = 0 |
| DCTFWeb (X9) | Só gera o JSON do MIT (IRPJ/CSLL). D7: *"Nunca SemMovimento = true. O Luminaris não enxerga eSocial, EFD-Reinf"*. D9: retidos fora. D10: Simples → 400. F-X9-6: DCTFWeb na matriz, com o Simples `OBRIGATORIA` e os débitos vindos do eSocial e da Reinf | `docs/adr/ADR-INCR-DCTFWEB-MIT.md` §4 D7, D9, D10 e §8 |
| Matriz de obrigações | Tipo `ECD \| ECF \| DCTFWEB`. eSocial e Reinf **não** têm linha | `ADR-INCR-DCTFWEB-MIT.md` F-X9-6; `models/obrigacoesPorRegime.ts` |
| Tabelas de lei versionadas | `LegalParameter` (tabela, chave, valor em bp ou centavos, fonte, `fonteSha256`, `vigenteDesde`/`vigenteAte`, DRAFT→PUBLISHED→REVOKED) mais um job de recálculo | `schema.prisma:2737-2760, 2669-2682`; nó LEGAL-PARAMS `done` |
| Plano de contas | Nenhuma conta de salários, encargos, INSS, FGTS ou IRRF a recolher, nem provisão de férias e 13º | `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts:21-82` |
| Assinatura digital | Só **verificação** de XMLDSig (NF-e/NFS-e). Não existe assinatura com certificado próprio nem guarda de PFX | `server/src/lib/nfeSignature.ts`, `server/src/lib/nfseSignature.ts:1-25` |
| eSocial/Reinf/pró-labore no código | **0 ocorrências** | grep `esocial\|reinf\|prolabore\|pró-labore` em `server/src` e `schema.prisma` |
| Tie-out e 2 commits | Padrão obrigatório para quem posta no razão e mexe num subrazão | Contrato §2.3 `[AC-2.3-1]`, `[AC-2.3-2]` |

### 2.2 Colisões verificadas (rejeitadas e decididas)

| Regra | Colide? | Como este PRE-ADR respeita |
|---|---|---|
| `R-motor-regras` (template gera lançamento) e `R-motor-dominio` (DAG, plugins, fila) | **Sim, se F-PES-9 → (b)** | Rubrica com fórmula editável pelo usuário é o modelo do Odoo e do Frappe (§3). Aqui seria um motor de regras no caminho do razão e da folha. A recomendação (a) é um catálogo fechado de rubricas em código, mais funções puras. Lançamento contábil por bridge explícita (ADR-C01), sem template |
| `R-contab-preset-dt` e Contrato §2.1 | **Sim, se a folha morar no preset `employees`** | O preset continua sendo cadastro operacional (agenda, comissão). O dado autoritativo de pessoal fica em models Prisma, com referência ao id da linha do preset, como já faz `profissionalContactId`. A integração comissão→folha acontece em serviço de aplicação, nunca no motor (`[AC-2.1-B1]`, `[AC-2.1-B4]`) |
| R5 (Integra Contador/Serpro adiado) | Não | R5 trata do Serpro. eSocial e Reinf têm webservice próprio. Mesmo assim, F-PES-4 adia a transmissão própria para a fase 2, pela mesma lógica (só com tenant que precise) |
| R6 (contábil → financeiro → fiscal) | Não | A fase 1 é contábil (lançamento) e fiscal de conferência. Não abre domínio novo antes do contábil |
| R8 (instância = CNPJ raiz) | Não | eSocial e Reinf são por CNPJ raiz. A DCTFWeb é centralizada na matriz (IN 2.237, art. 3º § 1º, V-adr) |
| X14 (fator R, parceria) | **Toca**: F-PES-11 | O X14 continua dono do cálculo. Este domínio só passa a **fornecer** a folha. `folhaCents` digitado vira override explícito |
| X9 D7 (nunca "sem movimento") | Não | Continua valendo. Mesmo com a fase 1, o Luminaris só conhece o eSocial que importou |

## 3. Pesquisa de referência (código-fonte, não marketing)

Lido nesta sessão via `gh api` (V-fonte, conteúdo dos repositórios em 10/10/2026).

**OCA `l10n-brazil` (Odoo Community).** Nos branches 8.0, 10.0, 12.0, 14.0 e 16.0 os únicos módulos de pessoal são
`l10n_br_hr` e `l10n_br_hr_contract`: cadastro (CBO, deficiência, tipo de admissão, regime e vínculo, causa de
rescisão). Também existe `l10n_br_account_withholding`, que **gera a fatura de retenção** (`account_move.py`,
`l10n_br_fiscal_tax_group.py`). **Não há folha nem eSocial na OCA.** A retenção, porém, é modelada **no documento
fiscal ou financeiro**, não na folha. Esse é o mesmo lugar que este PRE-ADR propõe para a Reinf (F-PES-5).

**KMEE `kmee-odoo-addons` (16.0, fora da OCA, atualizado em 23/08/2026).**

- `l10n_br_hr_payroll` depende de `payroll`/`payroll_account` do repositório **OCA/payroll**. Isso acontece porque, a
  partir da versão 13, o `hr_payroll` do Odoo saiu da edição community.
- As regras salariais são `hr.salary.rule` com `amount_python_compute` e `condition_python`, avaliadas por
  `safe_eval` (`OCA/payroll: payroll/models/hr_salary_rule.py:5, 61, 119, 226`).
- A aritmética brasileira foi tirada para **funções puras sem ORM**, testáveis com pytest
  (`l10n_br_hr_payroll/models/salary_rules_br.py`: `round_money` HALF_UP; `calc_inss`, `calc_irrf`, `redutor_irrf`,
  `irrf_mais_favoravel`, `calc_salario_familia`), e injetadas como `tools.br.*` (`hr_payslip.py:123-193`).
- As tabelas INSS/IRRF/salário-família/redutor têm vigência (`fiscal_tables.py`: `date_start`/`date_end`). O resolvedor
  **levanta erro em vez de cair em tabela de outro ano**, e usa `_vigentes_opcional` para o redutor da **Lei
  15.270/2025**, que só existe a partir de 01/2026.
- `l10n_br_esocial` ("Tabelas, eventos e transmissão eSocial S-1.3") traz:
  - um model genérico `l10n_br.esocial.evento` com `tipo` (S-xxxx), `operacao` I/A/E/R, `per_apur`, `ind_retif`,
    `nr_recibo`, `xml_envio`/`xml_retorno`, `origem_model`/`origem_id` e estados
    draft→validated→pending→sent→success/error/rectified;
  - um model `l10n_br.esocial.lote`, que pega o certificado A1 de `l10n_br_fiscal_certificate`, assina, transmite e
    classifica o evento em grupo 1/2/3;
  - dezenas de tabelas de referência carregadas por CSV.
- **Lição para nós:** (i) a matemática da folha em função pura com tabela por vigência é o mesmo desenho do X14 e do
  `LegalParameter`; (ii) o evento eSocial é um registro genérico com origem polimórfica e recibo; (iii) a parte que **não**
  copiamos é a regra em Python editável (`safe_eval`), que é motor de regras.

**Frappe HRMS** (`frappe/hrms`, `hrms/payroll/doctype`):

- `Salary Component` tem `formula`, `condition` e `amount_based_on_formula`. O `Salary Slip` avalia tudo com
  `_safe_eval` e `whitelisted_globals` (`salary_slip.py:59, 164, 1467-1474`).
- O `Payroll Entry` gera **um lançamento de provisão (accrual JE) por lote de holerites**
  (`payroll_entry.py:619 make_accrual_jv_entry`, `:693 "Accrual Journal Entry for salaries"`) e um lançamento bancário
  separado.
- `hrms/regional` só tem **India** e **united_arab_emirates**. **Não existe localização Brasil.**
- **Lição para nós:** o lançamento consolidado por competência e lote (F-PES-10 a) é o padrão. A fórmula editável,
  de novo, não serve.

**Síntese.** Nenhum dos dois projetos consolidados entrega folha brasileira com eSocial no núcleo. No Odoo, isso é
produto de parceiro (KMEE) com várias dezenas de módulos. No Frappe, não existe. Isso pesa a favor de não pôr o motor de
folha no caminho crítico do 1º cliente (F-PES-0 c), sem negar o destino.

## 4. A norma (pesquisa em fonte primária, 10/10/2026)

| Regra | Fonte | Grau |
|---|---|---|
| O salão-parceiro **centraliza** pagamentos e recebimentos (§ 2º) e **retém** a própria cota-parte *"bem como dos valores de recolhimento de tributos e contribuições sociais e previdenciárias devidos pelo profissional-parceiro incidentes sobre a cota-parte que a este couber"* (§ 3º) | Lei 12.592/2012, art. 1º-A §§ 2º–3º (red. Lei 13.352/2016). <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12592.htm>, baixada em 10/10/2026, 21.926 bytes (mesmo tamanho do MANIFEST; o sha difere por causa do script dinâmico do servidor), texto tachado descartado | V-fonte |
| A cota do salão é aluguel de bens móveis e/ou gestão (§ 4º). A cota do parceiro **não** entra na receita bruta do salão (§ 5º). O parceiro **"poderá"** ser qualificado como pequeno empresário, ME ou MEI (§ 7º): é faculdade, não obrigação | Lei 12.592, art. 1º-A §§ 4º, 5º, 7º | V-fonte |
| Contrato escrito, **homologado pelo sindicato** (ou pelo MTE), com duas testemunhas (§ 8º). Cláusula obrigatória de retenção e recolhimento dos tributos e contribuições do parceiro (§ 10 II) | Lei 12.592, art. 1º-A §§ 8º, 10 | V-fonte |
| Sem relação de emprego nem de sociedade durante a parceria (§ 11). **Vínculo se configura** sem contrato formalizado ou quando o parceiro exerce função diferente da contratada (art. 1º-C). A fiscalização segue o Título VII da CLT (art. 1º-D) | Lei 12.592, art. 1º-A § 11, arts. 1º-C, 1º-D | V-fonte |
| Folha do fator R = remuneração a pessoas físicas decorrente do trabalho e pró-labore, mais a CPP e o FGTS efetivamente recolhidos, nos 12 meses anteriores (§ 1º). Contam **"tão somente as remunerações informadas"** pelo art. 32 IV da Lei 8.212 (§ 2º I). Aluguéis e lucros distribuídos não contam (§ 3º) | Res. CGSN 140/2018, art. 26 §§ 1º–3º (corpus `docs/accounting/fontes-oficiais/Res-CGSN-140-2018.txt`, redação vigente; o texto revogado está marcado) | V-fonte (corpus) |
| Obrigado ao eSocial: *"Todo aquele que contratar prestador de serviço pessoa física e possua alguma obrigação trabalhista, previdenciária ou tributária"*, inclusive na situação "sem movimento". Exceções: MEI sem empregado e alguns outros | MOS S-1.3, consolidado até a NO 11.2026 (publicado em 26/05/2026, retificado em 28/05/2026), cap. I §2. <https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/mos-s-1-3-consolidada-ate-a-no-s-1-3-11-2026-com-marcacoes-retificada.pdf>, sha256 `e686cc8a8c1f…` | V-fonte |
| O MEI informa só os segurados que lhe prestam serviço, **não** o próprio pró-labore (vai no DAS-MEI). Tem módulo simplificado próprio | MOS §2.1 | V-fonte |
| O eSocial cobre as relações de trabalho e o **IR retido sobre rendimentos do trabalho**. A EFD-Reinf cobre a retenção do art. 31 da Lei 8.212 (cessão de mão de obra) e as contribuições substitutivas | MOS §3 | V-fonte |
| Tabelas do empregador: S-1000, S-1005, S-1010 (rubricas), S-1020 (lotação), S-1070 (processos). Só precisam ser enviadas quando outro evento as referencia | MOS §10.1 | V-fonte |
| A folha vai em S-1200/S-1202/S-1207, um evento por trabalhador. O movimento fecha com o **S-1299 até o dia 15** do mês seguinte (13º até 20/12). O S-1298 reabre. O S-1299 aceito totaliza as bases e permite constituir o crédito pela DCTFWeb. O FGTS não depende do S-1299 | MOS §§10.3.1–10.3.2 | V-fonte |
| "Sem movimento": S-1299 sem movimento **na primeira competência do ano** em que a situação ocorrer. Desde 2023 não se repete todo janeiro. O MEI sem empregado está dispensado | MOS cap. I §12 | V-fonte |
| **Não existe PGD nem PVA, e não se importa arquivo.** Os caminhos são: software próprio com XML assinado por certificado digital via webservice (procEmi 1), digitação no portal (procEmi 3) ou os aplicativos simplificados do governo (2 para PF, 4 para MEI) | MOS §8.1 | V-fonte |
| ME/EPP do Simples com **até 1 empregado** e MEI com até 1 empregado ficam dispensados de certificado **só nos módulos web**. Webservice e procuração exigem certificado | MOS §8.2.2.1 | V-fonte |
| `indPorte` no S-1000 dá acesso ao módulo simplificado da ME/EPP. Quem usa só software próprio não precisa preencher | MOS cap. III, S-1000 item 9.1 | V-fonte |
| Categorias: 701 (contribuinte individual, autônomo em geral), 721/722 (diretor não empregado com/sem FGTS), **723 (empresários, sócios e membros de conselho)** | MOS, Tabela 01 (pp. 27 e 291) | V-fonte |
| Simples fora do Anexo IV: **não há contribuição patronal** (CPP, GILRAT, Terceiros) sobre a folha, porque a CPP está no DAS. No Anexo IV há CPP e GILRAT, sem Terceiros. Com atividades concomitantes, a contribuição é proporcional (IN 2.110 art. 171) | MOS cap. III (S-2500, item 2.4.5) | V-fonte |
| Leiautes vigentes: S-1.3 com a **NT 07/2026 rev.** (24/09/2026), que ajusta S-2230 e Tabela 18. A NT 07/2026 original (04/09) traz XSD previsto para 18/01/2027 | <https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/nota-tecnica-s-1-3-07-2026-rev.pdf> (achado por busca; PDF não lido) | V-sec |
| **EFD-Reinf, obrigados:** quem presta ou contrata cessão de mão de obra ou empreitada (art. 31 da Lei 8.212) (I); CPRB (II); rural (III–IV); desporto (V–VII); e **(VIII) as pessoas do art. 2º da IN 1.990**, os antigos declarantes da DIRF. A DIRF foi substituída, para fatos a partir de **01/01/2025**, pela **série R-4000**, pelo S-1210 e pelo S-2501 do eSocial (§ 1º) | IN RFB 2.043/2021, art. 3º caput I–VIII e § 1º (red. IN 2.181/2024). Texto multivigente lido em <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/119859> (idAto 119859) | V-fonte |
| Art. 2º I da IN 1.990: obrigado quem *pagou ou creditou rendimentos com retenção de IR*, **ainda que em um único mês** | <https://www.normasbrasil.com.br/norma/instrucao-normativa-1990-2020_404804.html> | V-sec |
| Sem fato no período, a Reinf fica dispensada (art. 4º). Prazo: **dia 15 do mês seguinte**, postergado para o dia útil seguinte (art. 6º, red. IN 2.163). Multa de 2% ao mês, limitada a 20%, mínimo de R$ 500, com **redução de 50% para ME/EPP do Simples** e 90% para MEI (art. 7º § 4º) | IN 2.043, arts. 4º, 6º e 7º | V-fonte |
| O Simples foi tirado do 2º grupo do cronograma (art. 5º II "a"/"b") e caiu no 3º grupo (fatos a partir de 01/05/2021) | IN 2.043, art. 5º II–III | V-fonte |
| Leiaute Reinf **2.1.2**, com as NT 01/2026 (09/03), 02/2026 (08/05; isenção 12 de lucros no R-4010) e 03/2026 (CNPJ alfanumérico; R-4010/R-4020) | busca, fontes secundárias (Tecnospeed, Senior). Portal Sped inacessível (`ECONNREFUSED`) | V-sec |
| DCTFWeb: as fontes são eSocial, EFD-Reinf e MIT (art. 5º). O Simples entrega (art. 3º I). Os retidos vão para a Reinf (art. 9º § 1º I) | IN RFB 2.237/2024 | V-adr (ADR do X9, 02/10) |
| FGTS Digital: obrigatório a partir da competência **03/2024**. A guia (GFD) sai dos dados do eSocial e é paga via Pix até o dia 20. Não passa pela DCTFWeb | CNI/Portal da Indústria; netcpa (Edital 4/2023) | V-sec |
| CLT, Lei 4.090 (13º), Lei 8.036 (FGTS), Lei 10.666 art. 4º (retenção de 11% do contribuinte individual), IN 2.110/2022, RIR/2018, IN SRF 459/2004 | — | **NV**: não lidos nesta sessão (§12) |

## 5. Fork central — F-PES-0: estratégia do domínio de pessoal

**(a) Motor próprio de folha e eSocial.** O Luminaris cadastra trabalhador e contrato, calcula holerite (INSS
progressivo, IRRF com redutor, FGTS, salário-família, 13º, férias, rescisão, afastamentos), gera e assina os eventos
S-1.3 (tabelas, não periódicos, periódicos e SST), transmite por webservice com o certificado do cliente, guarda
recibos e totalizadores, contabiliza e alimenta o fator R.

- **A favor:** completude, e um único sistema para o salão.
- **Contra:**
  - a superfície legal é a maior do produto, e cada mês tem um oráculo externo (rejeição do eSocial);
  - exige guardar o certificado A1 de terceiros, coisa que o repo nunca fez (§2.1, assinatura);
  - a CCT por sindicato é dado que não existe;
  - os dois projetos consolidados de referência não fazem isso no núcleo (§3);
  - não acelera o 1º cliente, que é salão com parceria e cuja quantidade de empregados CLT é **desconhecida** (§11).

**(b) Integração: a folha é calculada fora, pelo contador ou pelo software de folha dele.** O Luminaris:

1. importa o resultado. Preferência: os XML do eSocial (S-1200/S-1210 e os totalizadores S-5001, S-5002, S-5003 e
   S-5011). Alternativa: um resumo digitado com documento anexo;
2. contabiliza por competência (bridge, 2 commits);
3. alimenta o fator R com a folha **declarada no eSocial**, que é a base legal da Res. 140, art. 26 § 2º I;
4. confere a DCTFWeb (totalizador × provisão);
5. registra no contas a pagar as retenções que o tenant faz e prepara a Reinf;
6. trata o parceiro do salão no seu próprio trilho (F-PES-6).

- **A favor:** entrega as três obrigações do TLDR sem motor trabalhista; o leiaute de importação é **público e nacional**
  (o mesmo XML do eSocial, qualquer que seja o software do contador); o oráculo vira conferência.
- **Contra:** o tenant sem contador que faça folha continua sem folha; eSocial e Reinf continuam saindo de outro lugar.

**(c) Por fases: (b) e depois (a).**
- **Fase 1** é (b) inteira.
- **Fase 2** é (a), aberta por gatilho declarado: o primeiro tenant com empregado CLT e sem provedor de folha, ou uma
  decisão do dono. Os models da fase 1 (`Trabalhador`, `FolhaCompetencia`, `EsocialEventoRegistro`) nascem com
  `origem ∈ {IMPORTADA_ESOCIAL, DIGITADA, MOTOR}`. Na fase 2 o motor passa a gravar `origem = MOTOR` nas mesmas
  tabelas, e contabilização, fator R e conferência **não mudam**.

**Recomendação: (c).**

1. **A lei puxa a fase 1, não a fase 2.** O fator R exige a folha *informada* no eSocial (art. 26 § 2º I, V-fonte).
   Importar o que foi informado é literalmente o que a norma pede. Calcular a folha no Luminaris e transmitir é a
   única forma de (a) cumprir a mesma regra, e é a mais cara.
2. **O eSocial não tem caminho de arquivo** (MOS §8.1, V-fonte). Sem transmissão própria, (a) calcularia uma folha
   que alguém redigitaria no portal. Isso é pior que (b). A fase 2, portanto, já nasce com transmissão (F-PES-4) e
   guarda de certificado.
3. **Completude** (memória `dono-quer-completude-nao-mvp`): (c) não corta o destino, ordena o caminho. A fase 2 fica
   descrita com BRIEFs (§7) e gatilho. Não fica escrito "talvez".
4. **Viés declarado:** a recomendação (c) tem menos código no curto prazo, e isso agrada o autor. O contrapeso é que o
   item 1 vem da letra da Res. 140, não de gosto, e que a fase 2 está fatiada aqui com o mesmo detalhe da fase 1.

**Caso adversarial tentado:** *"o 1º cliente tem 4 empregados CLT e o contador cobra caro pela folha; a fase 1 não o
serve"*. Resposta: a fase 1 serve a contabilidade, o fator R e a DCTFWeb desse cliente, desde que o contador entregue os
XML. O que ela não tira é o custo da folha no contador. Se o dono considerar esse o objetivo comercial, a escolha certa
é (a), e a pergunta passa a ser comercial, não técnica. Por isso F-PES-0 fica **PENDENTE**, e o fato que decide (há
empregado CLT? quem faz a folha hoje?) está no §11.

**RATIFICAÇÃO PENDENTE.**

## 6. Demais forks (todos RATIFICAÇÃO PENDENTE)

**F-PES-1 — Ids e onda.**
- (a) Quatro nós: **PES-1** (fase 1: importação + contabilização + fator R + conferência DCTFWeb), **PES-2**
  (retenções no contas a pagar + Reinf R-4000/R-2010), **PES-3** (parceria: retenção pelo salão-parceiro, depois de
  L-PES-1/2), **PES-4** (fase 2: motor + eSocial). PES-1 e PES-2 na onda 3, junto do X14, que eles alimentam. PES-4 na
  onda 4, como já está no destino.
- (b) Um nó só, na onda 4.

**Recomendação: (a).** PES-1 corrige uma premissa do X14 que já está em produção (a folha digitada), e PES-2 fecha uma
obrigação (Reinf) que hoje o tenant cumpre fora sem que o sistema saiba. Prendê-los à onda 4 deixaria o fator R
apoiado em dado sem base legal. Arestas propostas no §10.

**F-PES-2 — Formato da importação na fase 1.**
- (a) Só resumo digitado por competência: totais por grupo (salários, pró-labore, INSS do segurado, IRRF, FGTS, CPP fora
  do DAS, provisões), com o PDF da folha como `SourceDocument`.
- (b) Arquivo proprietário do software de folha de cada contador (CSV ou leiaute do fornecedor).
- (c) **XML dos eventos do eSocial** (S-1200 e S-1210 por trabalhador; totalizadores S-5001/S-5002/S-5003/S-5011),
  validados contra o XSD S-1.3, com `nrRecibo` como chave de idempotência. O resumo digitado de (a) fica como fallback
  explícito, com alerta `FOLHA_DIGITADA`.

**Recomendação: (c) + (a) como fallback.** O XML é padrão nacional, versionado e sai com recibo do governo: um parser
serve a todos os contadores. O totalizador S-5011 é a base que a própria DCTFWeb consome. (b) multiplica parsers sem
padrão. O fallback (a) existe porque a disponibilidade do download dos XML para o contador ou o tenant **não foi
verificada** (L-PES-6). Cuidado de PII: CPF e remuneração por pessoa entram só na linha do trabalhador e **nunca** na
auditoria (precedente: `AccountingContact`, ADR do X9 §2).

**F-PES-3 — Escopo do eSocial no motor (só na fase 2).**
- (a) Tabelas + não periódicos trabalhistas + periódicos. SST (S-2210, S-2220, S-2240) num BRIEF próprio, depois.
- (b) Tudo de uma vez, incluindo SST.
- (c) Só periódicos (folha). Admissão e desligamento ficam no portal.

**Recomendação: (a), com SST como BRIEF obrigatório da mesma fase**, não opcional. Os dados de SST vêm de PGR/PCMSO
(médico e engenheiro do trabalho), outra fonte externa com outro oráculo. Juntar os dois atrasa a folha sem ganho de
prova. (c) é incoerente: S-2299/S-2399 carregam verbas rescisórias (MOS §4.1), então a folha não fecha sem os não
periódicos.

**F-PES-4 — Transmissão (eSocial e Reinf).**
- (a) Webservice próprio com o **certificado A1 do cliente** sob guarda do Luminaris (PFX cifrado, segredo fora do
  banco).
- (b) Webservice com o certificado do **contador** ou procuração eletrônica (MOS §8.2.1.1.2).
- (c) Não transmitir: o Luminaris calcula e mostra, e o operador digita no portal web (procEmi 3). Não há importação de
  arquivo (MOS §8.1).

**Recomendação:** fase 1 = nenhuma transmissão (só importa o eSocial; Reinf → F-PES-5). Fase 2 = **(a)**, condicionada a
um BRIEF de segurança da guarda do certificado (é uma superfície nova; L-PES-10). (c) na fase 2 desmonta o motivo de ter
motor. (b) inverte a responsabilidade e prende o produto a um contador.

**F-PES-5 — EFD-Reinf: quais eventos, pelo que o sistema registra.** O que o Luminaris registra hoje é contas a pagar
**sem retenção** (§2.1). A Reinf do tenant nasce quando ele **paga** e retém. As retenções que o tenant **sofre**
(X8/ISS) são da Reinf do cliente dele, não da sua.

| Evento | Aplica ao salão/clínica? | Por quê |
|---|---|---|
| R-1000 (contribuinte), R-1070 (processos) | Sim, se houver qualquer evento | Tabelas |
| **R-4010** (pagamento a PF com retenção) | Provável: aluguel do ponto pago a locador PF; serviço de autônomo **que não seja rendimento do trabalho declarado no eSocial** | IN 2.043, art. 3º VIII + § 1º I (V-fonte). Retenção sobre aluguel PF: L-PES-5 |
| **R-4020** (pagamento a PJ com retenção de IR/CSRF) | Depende: serviços profissionais, limpeza, conservação | L-PES-4 (o Simples como tomador retém?) |
| **R-4099** (fechamento da série R-4000) | Sim, quando houver R-40xx | Fechamento |
| **R-2010** (serviço tomado com cessão de mão de obra, retenção de 11%) | Possível: limpeza ou vigilância contratadas por cessão (atividades do Anexo IV) | IN 2.043, art. 3º I (V-fonte); MOS §3 |
| R-2099 (fechamento da série R-2000) | Junto com R-2010 | Fechamento |
| R-2020 (cessão de mão de obra prestada) | Não | O salão não presta cessão de mão de obra (I) |
| R-2030/2040, R-2050/2055, R-2060, R-3010, R-4040, R-4080 | Não | Desporto, rural, CPRB (o Simples não é CPRB), beneficiário não identificado, comissões e corretagens recebidas |

- (a) R-1000 + R-4010 + R-4020 + R-4099, derivados de **campos de retenção no pagamento do contas a pagar** (natureza
  do rendimento, beneficiário, base, IR, CSLL, PIS, Cofins), com a provisão "retido a recolher" pelo padrão de 2
  commits. Os demais eventos ficam registrados como `NAO_SE_APLICA`, com fonte.
- (b) (a) + R-2010/R-2099 (flag "cessão de mão de obra" no contas a pagar, retenção de 11%).
- (c) Só o relatório de retenções, sem leiaute Reinf.

**Recomendação: (b).** É o mesmo dado de contas a pagar, e o R-2010 é a outra metade do que o MOS §3 manda para a Reinf.
O escopo efetivo do R-4020 espera a L-PES-4. Saída: na fase 1, **relatório e XML não transmitido**. A EFD-Reinf também
não tem PVA; sem transmissão própria, o operador digita na Reinf Web (I, L-PES-6). A transmissão segue o F-PES-4.
Precedente de lugar: o OCA `l10n_br_account_withholding` modela a retenção no documento financeiro (§3).

**F-PES-6 — O profissional-parceiro do salão fica fora da folha.** Que ele fica fora da **folha CLT** é lei (art. 1º-A
§ 11, V-fonte). O fork é **como** cumprir a retenção dos §§ 3º e 10 II.
- (a) Trilho próprio de **repasse ao parceiro**: `SalaoParceriaContrato` passa a guardar a inscrição do parceiro (PF,
  MEI ou ME/EPP, com CNPJ/CPF). O repasse do mês vira contas a pagar com retenção calculada por regra com fonte. Se o
  parceiro for PF e a regra exigir, vira **remuneração de contribuinte individual (cat. 701) no eSocial**. Na fase 1
  essa remuneração entra pela importação; na fase 2, pelo motor. Enquanto L-PES-1 não tiver resposta, parceiro PF ⇒
  alerta bloqueante `PARCEIRO_PF_RETENCAO_SEM_REGRA` no fechamento do repasse.
- (b) Política de produto: só aceitar parceiro MEI ou ME (contrato com parceiro PF é recusado).
- (c) Fora do sistema: o contador trata.

**Recomendação: (a).** (b) restringe o que a lei faculta (§ 7º diz "poderão"). (c) deixa o salão descumprir o § 10 II
sem que o sistema saiba. Guarda adicional: contrato sem homologação **já** não produz efeito no X14 (§ 8º). Este PRE-ADR
propõe que ele também acenda o alerta `PARCERIA_SEM_HOMOLOGACAO_RISCO_VINCULO`, pelo art. 1º-C I (L-PES-8). Comissão do
preset `commissions` paga a parceiro **não é** remuneração. Paga a empregado, **é** remuneração variável. A integração
comissão→repasse/folha é serviço de aplicação, não plugin (`[AC-2.1-B1]`).

**F-PES-7 — Pró-labore.**
- (a) O pró-labore é remuneração de **contribuinte individual cat. 723** no mesmo model de pessoal: importado na fase 1 e
  calculado na fase 2 (INSS do segurado, IRRF; CPP no DAS fora do Anexo IV). Entra no fator R e na DCTFWeb.
- (b) O pró-labore é só um contas a pagar ou um lançamento manual, fora do domínio.

**Recomendação: (a).** A Res. 140, art. 26 § 1º, inclui o pró-labore na folha do fator R, e o § 2º I só conta o que foi
informado no eSocial (V-fonte). Fora do domínio, o fator R da clínica fica errado. A obrigatoriedade de pró-labore para
o sócio que trabalha é a L-PES-9 (vira alerta, não bloqueio).

**F-PES-8 — Convenção coletiva (CCT).**
- (a) Parâmetros da CCT como dado versionado por sindicato e tenant (`ConvencaoColetivaParametro`: piso por cargo,
  reajuste, adicionais, com `fonte` obrigatória e vigência), consumidos por funções puras na fase 2.
- (b) Só um campo "piso" por cargo.
- (c) Fora: o contador aplica.

**Recomendação:** fase 1 = (c), porque a folha é externa e a CCT não toca a importação. Fase 2 = **(a)**: é o mesmo
princípio "jurisdição = dado" de `destino/10-brasil.md` e do `LegalParameter`, em tabela separada, porque a CCT é por
sindicato e não de plataforma. Quais cláusulas afetam o cálculo é a L-PES-7.

**F-PES-9 — Rubricas (só na fase 2).**
- (a) Catálogo **fechado** de rubricas em código, cada uma com a natureza da Tabela 03 do eSocial e as incidências
  (CP, IRRF, FGTS), calculadas por funções puras.
- (b) Rubricas com fórmula editável pelo usuário (modelo Odoo `safe_eval` / Frappe `formula`).

**Recomendação: (a).** (b) é motor de regras interpretado em runtime no caminho da folha e do razão, irmão do rejeitado
`R-motor-regras` (§2.2). Rubrica nova = PR com teste, a mesma técnica das tabelas do X14.

**F-PES-10 — Contabilização.**
- (a) **Um lançamento por competência e lote** (bridge `sourceType = 'payroll.competencia'`, idempotente pelo
  `@@unique` do razão), com detalhe por trabalhador no subrazão Prisma e tie-out subrazão × razão. Contas configuradas
  no perfil, porque o plano não tem contas de pessoal (§2.1).
- (b) Um lançamento por trabalhador.

**Recomendação: (a).** É o padrão do Frappe (`make_accrual_jv_entry`) e do `payroll_account`. Mantém o razão legível e
põe o PII no subrazão, não no histórico do lançamento. Segue o `[AC-2.3-1/2]`: commit 1 = `postEntry`, commit 2 = CAS no
`FolhaCompetencia`, com cabeçalho `atomicUntil`.

**F-PES-11 — Folha → fator R (aresta com o X14).**
- (a) O X14 passa a ler a folha **paga** por competência do domínio de pessoal: remuneração + pró-labore + CPP e FGTS
  efetivamente recolhidos (art. 26 § 1º). O `SimplesHistoricoMensal.folhaCents` vira override explícito, com alerta
  `FOLHA_FATOR_R_DIGITADA`, e divergência entre os dois acende alerta.
- (b) O domínio de pessoal grava em `SimplesHistoricoMensal.folhaCents`, e o X14 não muda.

**Recomendação: (a).** (b) faz o domínio escrever em tabela de outro nó e apaga a proveniência ("digitado" e
"importado do eSocial" viram o mesmo número). O conceito do § 1º é "montante **pago**" e "efetivamente recolhido",
diferente da competência do lançamento. Isso precisa de campo próprio, não de reuso.

**F-PES-12 — DCTFWeb.**
- (a) **Conferência:** totalizador importado (S-5011 e, na fase 2, o R-9011 da Reinf) × provisões do razão por código de
  receita. Divergência ⇒ alerta. Nenhum arquivo gerado. A DCTFWeb nasce no e-CAC a partir do eSocial e da Reinf (IN
  2.237, art. 5º).
- (b) Nada.

**Recomendação: (a).** É o mesmo papel "espelho + oficial + divergência" do X14 (F-SN-8 b). O X9 D7 continua: nunca
declarar "sem movimento".

**F-PES-13 — Regimes cobertos.**
- (a) O model vale para todos os regimes. A diferença de CPP (Anexo IV e regime normal: 20% + RAT + Terceiros; Simples
  fora do Anexo IV: nada, MOS cap. III 2.4.5) é parâmetro por regime. O foco de prova é o 1º cliente.
- (b) Só Simples.

**Recomendação: (a).** A folha é igual em todos os regimes, e só o encargo patronal muda. Fechar no Simples cria
retrabalho no primeiro tenant do Presumido (o regime-alvo de longo prazo é o Real, memória `accounting-regime-lucro-real-alvo`).

## 7. Esboço de modelo de dados (Prisma candidato — **sem schema final**)

Todos os models: `userId` (a PJ, `AccountingScope.ownerUserId`), soft-delete, factory, policy e DTO `.strict()`. Os
valores são `BigInt` em centavos. Os campos com PII **nunca** entram no payload de auditoria (allowlist
`auditCanonical.ts`).

**Fase 1 (caminhos b e c):**

| Model | Campos essenciais | Notas |
|---|---|---|
| `Trabalhador` | `cpf` (PII), `nome`, `categoriaEsocial` (101, 701, 723…), `tipo` EMPREGADO\|CONTRIB_INDIVIDUAL\|SOCIO_PRO_LABORE\|PARCEIRO_PF, `dynamicRowRef?` (id da linha do preset `employees`, sem FK), `admissao?`, `desligamento?` | `@@unique([userId, cpf])` (o CPF é a chave do eSocial). O preset continua dono da agenda e da comissão |
| `FolhaCompetencia` | `competencia` YYYY-MM, `tipo` MENSAL\|DECIMO_TERCEIRO, `origem` IMPORTADA_ESOCIAL\|DIGITADA\|MOTOR, `status` RASCUNHO\|CONFIRMADA\|SUBSTITUIDA, `supersedesId`, totais (`proventos`, `proLabore`, `inssSegurado`, `irrf`, `fgts`, `cppForaDas`, `pagoNoMes`, `encargosRecolhidosNoMes`), `postingEntryId?`, `sourceDocumentId?` | Molde de ciclo de vida do `TaxAssessment`/`SimplesApuracao`. Uma CONFIRMADA por (PJ, competência, tipo) |
| `FolhaLinhaTrabalhador` | `folhaCompetenciaId`, `trabalhadorId`, `bases` (CP, IRRF, FGTS), `descontos`, `liquido`, `rubricas Json` (só na origem MOTOR ou XML) | Subrazão; tie-out × razão |
| `EsocialEventoRegistro` | `tipoEvento` (S-1200, S-1210, S-5001, S-5002, S-5003, S-5011…), `perApur`, `nrRecibo` (`@@unique` com `userId`), `xmlSha256`, `direcao` IMPORTADO\|GERADO, `status`, `origemModel/origemId` | Molde KMEE `l10n_br.esocial.evento`. Na fase 1 só `IMPORTADO`. O XML bruto fica como `SourceDocument`, não em coluna |
| `RetencaoPagamento` | `payableId`/pagamento, `beneficiarioTipo` PF\|PJ, `beneficiarioDoc` (PII se PF), `naturezaRendimento` (tabela da Reinf), `dataFatoGerador`, `base`, `ir`, `csll`, `pis`, `cofins`, `inssCessao`, `cessaoMaoDeObra` bool | Alimenta R-4010/R-4020/R-2010. Provisão "retido a recolher" em 2 commits |
| `ReinfEventoRegistro` | `tipoEvento` (R-1000, R-2010, R-2099, R-4010, R-4020, R-4099), `perApur`, `status` GERADO\|TRANSMITIDO_FORA\|TRANSMITIDO, `xmlSha256`, `nrRecibo?` | Na fase 1 o XML é gerado e não transmitido (F-PES-5) |
| `SalaoParceriaContrato` (emenda do X14) | + `parceiroInscricao` PF\|MEI\|ME_EPP, + `parceiroDocumento` | Só depois da ratificação, e a emenda é do X14 (§10) |
| `LegalParameter` (reuso) | tabelas novas: `INSS_SEGURADO_FAIXA`, `IRRF_FAIXA`, `IRRF_REDUTOR`, `SALARIO_FAMILIA`, `SALARIO_MINIMO`, `REINF_NATUREZA_RENDIMENTO` | Já é versionado, com fonte e sha. Na fase 1 é usado para **conferir** a retenção do contas a pagar |

**Fase 2 (caminho a), além dos acima:** `ContratoTrabalho` (cargo/CBO, salário-base, jornada, sindicato, regime),
`ConvencaoColetivaParametro` (F-PES-8 a), `Holerite`/`HoleriteItem` (rubrica do catálogo fechado, referência, valor),
`PeriodoFerias`, `Afastamento`, `Desligamento`, `EsocialLote` (lote assíncrono, protocolo, grupo 1/2/3, molde KMEE
`l10n_br.esocial.lote`), `CertificadoDigitalCustodia` (PFX cifrado, validade, titular; o segredo fica em cofre fora do
banco, conforme o BRIEF de segurança do F-PES-4), `SstEvento` (S-2210/2220/2240).

## 8. Fatia de BRIEFs por caminho do F-PES-0

| Caminho | BRIEFs que nascem (todos só backend; o FE é nó vizinho) |
|---|---|
| **(b) Integração** | `BE-INCR-FOLHA-IMPORT` — PR-1: `Trabalhador` + `FolhaCompetencia` + linha + resumo digitado. PR-2: importação dos XML do eSocial (validação XSD, idempotência por recibo, PII fora da auditoria). PR-3: contabilização (bridge, 2 commits, contas no perfil, tie-out). PR-4: aresta fator R (F-PES-11) + conferência DCTFWeb (F-PES-12) · `BE-INCR-RETENCOES-REINF` — PR-1: `RetencaoPagamento` no contas a pagar + provisão. PR-2: XML R-1000/R-2010/R-2099/R-4010/R-4020/R-4099 não transmitido · `BE-INCR-PARCERIA-REPASSE` (depois de L-PES-1/2/8) · `FE-INCR-FOLHA` |
| **(a) Motor próprio** | Os quatro acima, mais: `BE-INCR-FOLHA-CADASTRO` (contrato, CCT) · `BE-INCR-FOLHA-CALCULO` (catálogo de rubricas, holerite mensal, INSS/IRRF/redutor/FGTS/salário-família por `LegalParameter`) · `BE-INCR-FOLHA-EVENTOS` (férias, 13º, afastamento, rescisão) · `BE-INCR-CERTIFICADO-CUSTODIA` (segurança) · `BE-INCR-ESOCIAL-TRANSMISSAO` (tabelas, não periódicos, periódicos, lotes, S-1298/S-1299, retificação) · `BE-INCR-ESOCIAL-SST` · `BE-INCR-REINF-TRANSMISSAO` |
| **(c) Por fases** | Fase 1 = a linha (b), na ordem `FOLHA-IMPORT` → `RETENCOES-REINF` → `PARCERIA-REPASSE`. Fase 2 = os BRIEFs exclusivos da linha (a), gravando `origem = MOTOR` nos mesmos models, sem BRIEF de migração |

Cada BRIEF nasce de uma `sessao-planejamento` própria e só vira código com "executa" (ORCH-006).

## 9. Forks pendentes (resumo)

| ID | Linha | Recomendação |
|---|---|---|
| **F-PES-0** | Estratégia: motor próprio × integração × fases | **(c)** fase 1 = integração; fase 2 = motor com gatilho |
| F-PES-1 | Ids e onda | (a) PES-1..PES-4; PES-1/2 na onda 3, PES-4 na onda 4 |
| F-PES-2 | Formato da importação | (c) XML do eSocial + (a) resumo digitado como fallback |
| F-PES-3 | Escopo do eSocial no motor | (a) tabelas + não periódicos + periódicos; SST em BRIEF obrigatório da mesma fase |
| F-PES-4 | Transmissão | fase 1 nenhuma; fase 2 (a) webservice com o A1 do cliente, depois do BRIEF de segurança |
| F-PES-5 | Eventos Reinf | (b) R-1000 + R-2010/2099 + R-4010/4020/4099, a partir do contas a pagar |
| F-PES-6 | Parceiro fora da folha | (a) trilho de repasse com retenção por regra com fonte; PF bloqueado até L-PES-1 |
| F-PES-7 | Pró-labore | (a) contribuinte individual cat. 723 no domínio |
| F-PES-8 | Convenção coletiva | fase 1 (c); fase 2 (a) dado versionado por sindicato |
| F-PES-9 | Rubricas | (a) catálogo fechado em código |
| F-PES-10 | Contabilização | (a) um lançamento por competência e lote + subrazão |
| F-PES-11 | Folha → fator R | (a) o X14 lê a folha paga do domínio; o digitado vira override |
| F-PES-12 | DCTFWeb | (a) conferência totalizador × razão |
| F-PES-13 | Regimes | (a) todos, com CPP parametrizada |

## 10. Como entra na fila (depois da ratificação)

1. O dono ratifica (ou não) F-PES-0..13, e a decisão vira nota em `docs/plano/decisoes/`.
2. Nascem as notas `nos/PES-1..4` (ids do F-PES-1). Arestas propostas:
   - PES-1: `depende_de` [[X14]] (consumidor; a emenda F-PES-11 é feita no X14) e [[LEGAL-PARAMS]] ✅;
   - PES-2: `depende_de` o contas a pagar ✅. Aresta pontilhada com [[X9]] (conferência da DCTFWeb);
   - PES-3: `depende_de` PES-1, [[X14]] (emenda do `SalaoParceriaContrato`) e as respostas L-PES-1/2/8;
   - PES-4: `depende_de` PES-1 e o gatilho do F-PES-0.
3. O `obrigacoesPorRegime` ganha as linhas eSocial e Reinf, com fonte (MOS §2; IN 2.043, art. 3º). É um ajuste do X13,
   registrado em achados fora de escopo.
4. **Gate humano (RUNBOOK-FORMAT; o agente prepara em branco):** para N competências reais, colar o totalizador do
   eSocial e a DCTFWeb do e-CAC ao lado da conferência do Luminaris. Desfecho em 3 estados, assinado pelo dono.

## 11. Pendente de validação externa (não entra em checklist até ter fonte ou resposta)

Fatos do 1º cliente e do contador. Pedido pela `luminaris-contador-liaison`; quem envia é o dono.

1. **O 1º cliente tem empregado CLT? Quantos?** Quem faz a folha hoje, e em qual software? **Decide o F-PES-0.**
2. Os parceiros do salão são PF, MEI ou ME? Os contratos estão homologados (§ 8º)? Qual sindicato?
3. Os sócios retiram pró-labore? Quanto?
4. O ponto é alugado de PF ou de PJ? Há serviço contratado por cessão de mão de obra (limpeza, vigilância)? Há serviço
   profissional pago a PJ?
5. O cliente tem certificado A1 (e-CNPJ)? O contador transmite com procuração?
6. O contador consegue entregar os XML dos eventos e totalizadores do eSocial por competência (L-PES-6)?

## 12. Insumos ausentes

- **Leiautes S-1.3, Anexo I (tabelas)**, principalmente a Tabela 03 (natureza das rubricas) e a Tabela 01 completa, e
  os **XSD** de S-1200/S-1210/S-5001/S-5002/S-5003/S-5011. Não baixados.
- **Manual de Orientação da EFD-Reinf 2.1.2.x** e as NT 01–03/2026. O portal do Sped recusou a conexão
  (`ECONNREFUSED`). Só há fonte secundária.
- **Normas não lidas:** IN RFB 2.110/2022 (previdência), Lei 10.666/2003 art. 4º, RIR/2018 (retenção sobre aluguel e
  serviços profissionais), IN SRF 459/2004 (CSRF), CLT (Títulos II–IV e o art. 611-A), Lei 4.090 e Lei 8.036. O texto
  integral da IN 1.990 só foi lido em fonte secundária.
- **Cronograma do eSocial para o grupo 3** (Simples) e a data de obrigatoriedade da DCTFWeb para o Simples. Hoje são
  datas **I**, sem impacto no desenho (o cliente já está obrigado).
- Texto do §6.11 do destino ("RH nível TOTVS"): *"Texto não recebido"*.

## 13. Achados fora de escopo (registrados, não planejados)

1. **`obrigacoesPorRegime` sem eSocial e sem Reinf.** O F-X9-6 só pôs a DCTFWeb. Dono: X13.
2. **Preset `employees` com `monthlyCost` em moeda dentro do `data Json`.** É cadastro operacional, não razão, mas
   `[AC-2.2-1]` pede centavos inteiros em caminho de dinheiro. Vale olhar quando a fase 1 referenciar o preset.
3. **Comissões (`commissions`) pagas não geram lançamento nem remuneração.** Hoje ficam presas no preset. Com a fase 1
   isso fica visível (a comissão do empregado deveria aparecer na folha importada); o fluxo comissão→contas a pagar é
   item próprio.
4. **`SalaoParceriaContrato` não guarda a inscrição do parceiro** (PF/MEI/ME). O X14 não precisava dela para a receita
   bruta; o F-PES-6 precisa. A emenda é do X14.
5. **Contas a pagar sem retenção** também afeta o X7. A dedução de IRRF/CSLL retidos *sofridos* é outra coisa
   (F-X7-11), mas o contas a pagar que *paga* com retenção hoje registra o bruto como líquido. Risco de saldo errado em
   fornecedores.

## 14. Perguntas de lei

Só entra o que a pesquisa desta sessão **não** resolveu.

**L-PES-1**
- **(a) Pergunta:** quando o profissional-parceiro é pessoa física (sem MEI nem ME), quais tributos e contribuições o
  salão-parceiro retém e recolhe sobre a cota do parceiro (INSS de 11% do contribuinte individual? IRRF pela tabela
  progressiva? ISS?) e em qual obrigação acessória informa (eSocial S-1200 cat. 701 + S-1210, ou Reinf R-4010)?
- **(b) Por que importa / qual fork decide:** decide o F-PES-6 (o trilho de repasse e o bloqueio
  `PARCEIRO_PF_RETENCAO_SEM_REGRA`) e o escopo de PES-3. Errar gera recolhimento a menor de terceiro, com o salão
  responsável pelo § 3º.
- **(c) O que a pesquisa encontrou:** a Lei 12.592, art. 1º-A § 3º e § 10 II, obriga reter e recolher *"tributos e
  contribuições sociais e previdenciárias devidos pelo profissional-parceiro"*, sem dizer quais. O § 11 nega o vínculo e
  o § 7º faculta MEI/ME (V-fonte, <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12592.htm>). O MOS
  §3 manda o IR sobre rendimento do trabalho para o eSocial (V-fonte). A busca por Solução de Consulta Cosit sobre
  salão-parceiro e contribuição previdenciária **não achou** nada específico (10/10). A Lei 10.666, art. 4º, não foi
  lida. Não basta porque a lei da parceria remete a outras normas sem nomeá-las.
- **(d) Quem responde:** lei pesquisável (Lei 10.666, art. 4º; IN 2.110; base de Soluções de Consulta da RFB) +
  contador.

**L-PES-2**
- **(a) Pergunta:** quando o parceiro é MEI ou ME do Simples, o salão retém alguma coisa sobre a cota dele? Quem emite
  documento fiscal de quê para quem (o parceiro emite NFS-e ao salão ou ao cliente final, considerando o § 5º e a "nota
  fiscal unificada")?
- **(b) Por que importa / qual fork decide:** F-PES-6 (se o repasse ao parceiro MEI/ME é só contas a pagar, sem
  retenção nem eSocial) e a conferência da receita do X14.
- **(c) O que a pesquisa encontrou:** § 7º (faculdade de MEI/ME) e § 5º (nota unificada não traz a cota para a receita
  do salão), ambos V-fonte. O MOS §2.1 diz que o MEI não informa o próprio pró-labore no eSocial (V-fonte). Nenhuma
  regra lida diz se a cláusula do § 10 II se esvazia quando o parceiro recolhe pelo DAS. Não basta porque o § 10 II é
  cláusula obrigatória do contrato em qualquer caso.
- **(d) Quem responde:** contador (com leitura do Comitê Gestor do Simples / RFB).

**L-PES-3**
- **(a) Pergunta:** a cota-parte paga ao parceiro pessoa física entra na "folha de salários" do fator R?
- **(b) Por que importa / qual fork decide:** F-PES-11 e o fator R de quem tem parceria e atividade sujeita ao fator R
  (a clínica estética do P2 tem esteticista, profissão coberta pela Lei 12.592).
- **(c) O que a pesquisa encontrou:** a Res. CGSN 140, art. 26 § 1º, conta a "remuneração a pessoas físicas decorrentes
  do trabalho". O § 2º I conta só o que foi informado pelo art. 32 IV da Lei 8.212 (eSocial). O § 3º exclui aluguéis
  (V-fonte, corpus). A cota do parceiro é do parceiro, não do salão (§ 5º da Lei 12.592), mas o salão a repassa. Não
  basta: se o salão informar o parceiro PF no eSocial (L-PES-1), a letra do § 2º I parece incluí-la, e o § 5º parece
  excluí-la. É conflito de leitura.
- **(d) Quem responde:** contador; se houver divergência, consulta formal à RFB (órgão).

**L-PES-4**
- **(a) Pergunta:** a ME/EPP optante pelo Simples, **como tomadora**, é obrigada a reter CSRF (PIS/Cofins/CSLL, Lei
  10.833, art. 30) e IRRF de serviços profissionais (RIR/2018) quando paga uma PJ não optante?
- **(b) Por que importa / qual fork decide:** o escopo do R-4020 no F-PES-5 e os campos de `RetencaoPagamento`.
- **(c) O que a pesquisa encontrou:** a IN 2.043, art. 3º VIII + § 1º I, liga a Reinf a quem retém IR (V-fonte), e a
  IN 1.990, art. 2º I, alcança quem pagou com retenção "ainda que em um único mês" (V-sec). Nenhuma das normas que
  regulam a retenção (Lei 10.833, art. 30; IN SRF 459/2004; RIR/2018) foi lida. Não basta: a obrigação de reter vem
  dessas normas, não da IN da Reinf.
- **(d) Quem responde:** lei pesquisável.

**L-PES-5**
- **(a) Pergunta:** o aluguel do ponto pago pelo salão (PJ) a um locador pessoa física sofre retenção de IRRF pela PJ, e
  isso vai no R-4010?
- **(b) Por que importa / qual fork decide:** inclusão do R-4010 no F-PES-5 e o caso mais provável de o salão ter Reinf.
- **(c) O que a pesquisa encontrou:** a ligação Reinf ↔ IR retido está lida (IN 2.043, art. 3º VIII, V-fonte). A regra
  de retenção sobre aluguel pago a PF (RIR/2018) **não foi lida**. Não basta porque o dever de reter vem do RIR.
- **(d) Quem responde:** lei pesquisável.

**L-PES-6**
- **(a) Pergunta:** o declarante ou o contador consegue **baixar** os XML dos eventos e dos totalizadores do eSocial
  (S-1200, S-1210, S-5001, S-5002, S-5003, S-5011) de uma competência, por portal ou webservice? E a EFD-Reinf aceita
  **importação de arquivo** em algum canal, ou só webservice e formulário web?
- **(b) Por que importa / qual fork decide:** F-PES-2 (c) só é viável se o download existir. F-PES-5 define se o XML
  gerado da Reinf tem destino sem transmissão própria.
- **(c) O que a pesquisa encontrou:** o MOS §8.1 diz que o eSocial não tem PGD/PVA nem importação, e lista os canais
  (webservice, portal e aplicativos) (V-fonte). Não há trecho lido sobre **download** de eventos. Para a Reinf, só fonte
  secundária. Não basta porque o download é a premissa do caminho recomendado.
- **(d) Quem responde:** órgão (documentação técnica do eSocial e do Sped), verificável por leitura do MOS restante e
  do manual do webservice.

**L-PES-7**
- **(a) Pergunta:** quais cláusulas da convenção coletiva dos trabalhadores em salões de beleza de São Paulo capital
  afetam o cálculo da folha (piso, reajuste, adicionais, comissão mínima), e quais prevalecem sobre a lei pelo art.
  611-A da CLT?
- **(b) Por que importa / qual fork decide:** F-PES-8 (a) na fase 2: o shape de `ConvencaoColetivaParametro`.
- **(c) O que a pesquisa encontrou:** nada. A CCT do cliente não foi obtida e a CLT não foi lida nesta sessão. Não
  basta porque o shape do dado depende das cláusulas reais.
- **(d) Quem responde:** advogado trabalhista (o texto da CCT é dado do cliente ou do sindicato).

**L-PES-8**
- **(a) Pergunta:** contrato de parceria sem homologação (§ 8º) configura vínculo automaticamente pelo art. 1º-C I
  ("não existir contrato formalizado na forma descrita nesta Lei")? Nesse caso, o salão deve informar o profissional como
  empregado no eSocial (S-2200) desde o início da prestação?
- **(b) Por que importa / qual fork decide:** a força do alerta `PARCERIA_SEM_HOMOLOGACAO_RISCO_VINCULO` (aviso ×
  bloqueio) no F-PES-6 e o tratamento retroativo.
- **(c) O que a pesquisa encontrou:** arts. 1º-A § 8º, 1º-C I–II e 1º-D (V-fonte). O X14 já trata contrato sem
  homologação como sem efeito na receita. Não basta: dizer se "forma descrita nesta Lei" inclui a homologação, e qual a
  consequência no eSocial, é interpretação trabalhista.
- **(d) Quem responde:** advogado trabalhista.

**L-PES-9**
- **(a) Pergunta:** o sócio que trabalha na empresa é obrigado a ter pró-labore (e a contribuição de contribuinte
  individual) mesmo quando só recebe lucros?
- **(b) Por que importa / qual fork decide:** F-PES-7: se a falta de pró-labore vira alerta e com que texto. Também mexe
  no fator R (Res. 140, art. 26 § 3º exclui lucros).
- **(c) O que a pesquisa encontrou:** o art. 26 §§ 1º e 3º da Res. 140 (pró-labore entra, lucro não; V-fonte) e o MOS
  (categoria 723; V-fonte). A Lei 8.212 e a IN 2.110 não foram lidas. Não basta porque a obrigação nasce na lei
  previdenciária.
- **(d) Quem responde:** lei pesquisável + contador.

**L-PES-10**
- **(a) Pergunta:** o Luminaris (software contratado) pode guardar o certificado A1 do cliente e transmitir eSocial e
  Reinf em nome dele? Que forma de outorga isso exige (procuração eletrônica, termo) e quais deveres de LGPD e de guarda
  decorrem?
- **(b) Por que importa / qual fork decide:** F-PES-4 (a) na fase 2 e o BRIEF de segurança da guarda.
- **(c) O que a pesquisa encontrou:** o MOS §8.2.2.1 exige certificado para webservice e para procuração, e o §8.2.1.1.2
  trata do uso de certificado por prestadores de serviço de contabilidade e RH (V-fonte; o item 8.2.1.1.2 só foi visto
  no sumário, não lido). Não basta porque o MOS descreve o mecanismo, não a responsabilidade do software.
- **(d) Quem responde:** advogado (LGPD/contratos) + órgão (regras de procuração do e-CAC/eSocial).

## Riscos desta proposta (incluindo os vieses do autor)

- **A premissa que decide o F-PES-0 é um fato desconhecido:** se o 1º cliente tem empregado CLT e quem faz a folha dele
  (§11.1). A recomendação (c) assume "poucos ou nenhum CLT, folha no contador". Se isso for falso e o objetivo for
  tirar a folha do contador, a recomendação certa é (a).
- **O caminho recomendado depende de um download não verificado** (L-PES-6). Se o XML do eSocial não for obtenível com
  facilidade, a fase 1 cai no resumo digitado, e a vantagem legal do F-PES-11 encolhe: o número continua digitado,
  mesmo que tenha documento anexo.
- **Normas centrais não lidas** (§12): Lei 10.666, IN 2.110, RIR, IN 459. Os forks F-PES-5 e F-PES-6 descrevem
  estrutura, não alíquota. Nenhuma alíquota de retenção aparece como decidida neste documento, de propósito.
- **Fontes secundárias** para o leiaute vigente da Reinf, para a IN 1.990 e para o FGTS Digital. Pela memória
  `tabela-transcrita-de-lei-conferir-redacao-vigente`, antes de qualquer BRIEF esses itens precisam de leitura primária.
- **Viés do autor:** tendência a preferir o caminho que reusa padrões que já conheço (2 commits, `LegalParameter`,
  espelho + oficial) e tem menos código no curto prazo. O contrapeso está explícito: o F-PES-0 tem o caso adversarial
  no §5, e a fase 2 está fatiada com o mesmo detalhe da fase 1.
- **Fora do formato dos exemplares:** o arquivo ficou em `docs/accounting/` por pedido, e não em `docs/adr/`.
