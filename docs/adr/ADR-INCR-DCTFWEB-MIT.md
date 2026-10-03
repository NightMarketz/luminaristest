# ADR-INCR-DCTFWEB-MIT — Arquivo JSON de importação do MIT a partir das apurações confirmadas (X9: DCTFWeb + MIT)

- **Data:** 2026-10-02
- **Status:** **Accepted (02/10/2026).** Os forks F-X9-1..6 (§8) foram ratificados pelo dono em 02/10, por
  questionário, todos na recomendação (F-X9-4 → b; F-X9-5 → c; os demais → a). As cédulas estão em
  [`D-2026-10-02-X9-DCTFWEB-MIT-FORKS`](../plano/decisoes/D-2026-10-02-X9-DCTFWEB-MIT-FORKS.md). **Nenhum código
  escrito, nenhum autorizado:** o BRIEF exige pedido próprio, e o código exige "executa" (ORCH-006).
- **Autor:** agente, com base em `origin/main` `dafe594e`.
- **Autorização (ORCH-006), citada:**
  1. **F-M2** (dono, 03/09): no nó, `autorizacao: "F-M2 (2026-09-03) — só ADR"` ([X9](../plano/nos/X9.md)).
  2. **F-X7-8 → (a)** (dono, 02/10): *"ADR próprio do X9 (DCTFWeb + MIT), que consome o contrato C1"*. O
     **F-X7-9 → (b)** (arquivo JSON de importação) migra para cá e é herdado
     ([ADR-INCR-TAX-ASSESSMENT §8](ADR-INCR-TAX-ASSESSMENT.md); cédulas em
     [D-2026-10-02-X7-TAX-ASSESSMENT-FORKS](../plano/decisoes/D-2026-10-02-X7-TAX-ASSESSMENT-FORKS.md)).
  3. **Roteamento (dono, chat, 02/10):** o dono pediu *"BRIEF próprio do X8 e/ou do X9"*. Como o nó só autoriza ADR
     e o ADR não existia, a resposta ao questionário foi *"ADR do X9 agora (Recomendado)"*, com o BRIEF depois da
     ratificação e o X8 em espera (rodada 8 da mesma nota de decisão).
  - **Passo 1 (cobertura):** a autorização cobre exatamente este documento, e só ele. A §5 é um esqueleto de
    comportamentos, não o BRIEF.
- **Related:** `ADR-INCR-TAX-ASSESSMENT` (contrato C1, porta `EnvioMit`, F-X7-8/9) ·
  [`BE-INCR-TAX-ASSESSMENT-A-brief.md`](../accounting/BE-INCR-TAX-ASSESSMENT-A-brief.md) (`TaxAssessment.codigoReceita`,
  item 2b liminar, F-TA-1 → a) · `ADR-FISCAL-OBLIGATION-PROFILE-regime-porte` (matriz de obrigações, perfil da PJ) ·
  C6b (`AccountingContact`, `AccountingDeliveryLog`) · decisões R5 (Integra Contador adiado) e R8 (instância = CNPJ
  raiz).

## TLDR (2 linhas)

O X9 gera o arquivo JSON de importação do MIT (leiaute 1.0) de um mês, para uma PJ, a partir das apurações de IRPJ/CSLL **confirmadas** no X7. Quem importa e **encerra** no e-CAC, que é o ato de confissão (IN 2.237 art. 2º), é sempre um humano. O Luminaris nunca transmite e não recalcula nada.
**Risco principal:** o arquivo contém **só o que o Luminaris apura**, mas um arquivo importado sobre uma apuração já encerrada vira **retificador e substitui a apuração inteira** (Manual do MIT §9.1; IN 2.237 art. 13 § 1º). Se o usuário não completar os outros débitos no MIT antes de encerrar, eles somem da DCTFWeb. Os avisos do retorno são a defesa (F-X9-1 → a, ratificado com esse risco aceito). Além disso, o X9 **não serve o 1º cliente**, que é Simples (D10).

---

## 1. Contexto e objetivo

- **O que já está decidido e este ADR respeita:**
  - V4 (29/09): DIRF e DCTF mensal foram extintas; o nó é **DCTFWeb + MIT**.
  - F-X7-8 → (a): o X9 tem ADR próprio.
  - F-X7-9 → (b): arquivo JSON, sem HTTP (R5).
  - F-TA-1 → (a): a Fase A do X7 grava `codigoReceita` (6 dígitos) em cada `TaxAssessment`, *"o insumo que o C1
    consome sem migrar"*.
- **O que existe hoje:** nada. `DCTFWeb` só aparece no comentário de exclusão da matriz
  (`obrigacoesPorRegime.ts:6`). O `TaxAssessment` também ainda não existe: a Fase A tem o BRIEF ratificado, mas não
  tem código.
- **Objetivo deste ADR:** fixar
  - o que entra no arquivo e de onde vem;
  - como o mês do arquivo se relaciona com os períodos do X7;
  - o que acontece quando uma apuração exportada é substituída;
  - quem aparece como responsável;
  - o que fica de fora (retidos, Simples, eventos especiais, suspensões);
  - o que a matriz de obrigações ganha (o D11 do X7 entregou isso ao X9).
- **Dependência dura:** o código do X9 só faz sentido depois do **PR-2 da Fase A** do X7 (model `TaxAssessment` e
  confirmação, F-TA-10 → a). Antes disso não há o que exportar.

## 2. Evidência de código (CBM-001 — lida em `origin/main` `dafe594e`)

Caminhos relativos a `server/`. Grau **V** em todas as linhas (lido nesta sessão).

| Ponto | O que existe | Arquivo:linha |
|---|---|---|
| Matriz de obrigações | Só ECD/ECF (`ObrigacaoSped = 'ECD' \| 'ECF'`); o comentário diz *"EFD-Contribuições, DCTFWeb, PGDAS-D … ficam FORA até ter fonte"* | `src/features/accounting/models/obrigacoesPorRegime.ts:6-7,12,31-56` |
| Matriz × inativa | `resolverObrigacoes` devolve `NAO_SE_APLICA` com fonte `linha.obrigacao === 'ECD' ? INATIVA_ECD : INATIVA_ECF`. Uma terceira obrigação herdaria a fonte errada | `obrigacoesPorRegime.ts:84-87` |
| Perfil da PJ | `CompanyFiscalProfile` `@@unique([userId, anoCalendario])`, `regime`, `declarante Json?` (o CNPJ mora aqui), `contadorContactId` | `prisma/schema.prisma:1373-1407` |
| CNPJ | `CNPJ_REGEX = /^[A-Z0-9]{12}[0-9]{2}$/`: **alfanumérico**, porque a IN 2.229 está em produção desde 01/07/2026 | `src/lib/cnpj.ts`; `CompanyFiscalProfileDto.ts:37` |
| Contador | `AccountingContact`: `cpf` (11 dígitos com DV), `phone?`, `email`, `crcNumber` (máscara do CFC `UF-NNNNNN/O-D`), `crcUf`. Todos são **PII de terceiro**: nunca em auditoria | `prisma/schema.prisma:1770-1784` |
| Molde de log com hash | `AccountingDeliveryLog`: `periodStart/End`, `manifestSha256*` lido do job (nunca recomputado), FKs com `Restrict` | `prisma/schema.prisma:1813-1827` |
| Allowlist de auditoria | `company_fiscal_profile.*` em `auditCanonical.ts:149-153`. Todo `eventType` novo entra na mesma mudança | `src/features/accounting/audit/auditCanonical.ts` |
| Contrato C1 (planejado, não código) | `TaxAssessment { userId, anoCalendario, tributo IRPJ\|CSLL, periodo T01..T04, codigoReceita, aPagarCents, status CONFIRMED\|SUPERSEDED, supersedesId, deletedAt }`; liminar: `lc224AcrescimoSuspenso` + `lc224LiminarReferencia String?` (texto livre, até 60) | BRIEF da Fase A §2 e item 2b |

## 3. Fonte legal e técnica (com grau)

**V-fonte** = lido na fonte primária nesta sessão (02/10). Como e onde está na §15. **I** = inferido.

| Regra | Fonte | Grau |
|---|---|---|
| A DCTFWeb é **confissão de dívida** e instrumento suficiente para exigir o débito | IN RFB 2.237/2024 art. 2º | V-fonte |
| Obrigados: PJ de direito privado em geral (I); MEI só nos casos do inciso IX (contratar segurado, reter IR etc.); entrega centralizada na matriz (§ 1º) | IN 2.237 art. 3º caput I, IX e § 1º; art. 4º IX (MEI fora do IX é dispensado) | V-fonte |
| Fontes da DCTFWeb: eSocial e EFD-Reinf **e** o MIT | IN 2.237 art. 5º I–II | V-fonte |
| Prazo: **último dia útil do mês seguinte** ao fato gerador. Sem movimento: entrega o 1º mês sem movimento e fica dispensado nos seguintes | IN 2.237 art. 6º caput e § 2º II | V-fonte |
| IRPJ, CSLL (e o adicional da Lei 15.079), PIS/Pasep e Cofins estão no conteúdo; o Simples **não** informa o que apura no DAS | IN 2.237 art. 8º I, V, VI, VII e § 4º | V-fonte (texto vigente, com redação do inciso V alterada) |
| Os tributos dos incisos I a XII do art. 8º entram **pelo MIT**. **Exceções:** IRPJ/CSLL/PIS/Cofins **retidos** vão para a EFD-Reinf; o IRRF do MIT é só o do art. 2º da IN SRF 137/1998 | IN 2.237 art. 9º caput, § 1º I e § 2º | V-fonte (a IN SRF 137 não foi lida, ver §10) |
| Evento especial (extinção, incorporação, fusão, cisão) vai na DCTFWeb do mês, pelo MIT | IN 2.237 art. 10 | V-fonte |
| Multa por atraso: 2% ao mês sobre os tributos informados, limitada a 20%, mínimo de R$ 500 (R$ 200 sem movimento); R$ 20 por grupo de 10 informações incorretas ou omitidas | IN 2.237 art. 11 I–II, § 3º | V-fonte |
| A retificadora **substitui integralmente** e tem de conter **todas** as informações anteriores, com as alterações; prazo de 5 anos | IN 2.237 art. 13 caput, § 1º e § 9º | V-fonte |
| Divergência entre a DCTFWeb e outras declarações ⇒ retificar as inconsistentes | IN 2.237 art. 13 § 7º | V-fonte |
| Retificadora que **reduz** débito pode ficar retida para análise | IN 2.237 art. 14 | V-fonte |
| O MIT gera a DCTFWeb **depois do encerramento**. O período de apuração (PA) é **mensal** (MMM/AAAA). Existe uma só apuração "Em Edição" por PA | Manual do MIT (jan/2025) §2, §2.2, §8.4 | V-fonte |
| Mês, ano e evento especial **não são editáveis** depois de criada a apuração; o resto é | Manual do MIT §2.4 | V-fonte |
| Débitos anuais de IRPJ (2390, 2430, 2456, 7756) e CSLL (6758, 6773, 7837) são declarados no **PA de março do ano seguinte** | Manual do MIT §4.1 | V-fonte |
| Quotas do IRPJ/CSLL trimestral: o débito informado *"no mês final do período de apuração trimestral"* pode ser dividido **na DCTFWeb, depois do encerramento do MIT** | Manual do MIT §4.4 | V-fonte (a frase); que o trimestral vai **sempre** no último mês do trimestre é **I** |
| *"Real Anual"*: ao selecionar IRPJ/CSLL, o MIT pergunta se houve balanço de suspensão/redução no mês | Manual do MIT §4.3; leiaute `BalancoLucroReal` | V-fonte |
| Processo que suspende a exigibilidade: o contribuinte **deve** informar os dados do processo para o MIT enviar à DCTFWeb | Manual do MIT §5 | V-fonte |
| O MIT **importa JSON**. A importação cria a apuração "Em Edição" e **não encerra sozinha**: *"É necessária a intervenção do usuário para encerrar"*. A apuração importada pode ser editada antes do encerramento. Erro que impede a importação aparece na hora; os outros, na aba Pendências | Manual do MIT §9 | V-fonte |
| **Arquivo importado sobre uma apuração encerrada = retificador**: gera nova "Em Edição" que, encerrada, substitui a anterior | Manual do MIT §9.1 | V-fonte |
| O MIT lista só os códigos de receita compatíveis com os Dados Iniciais (forma de tributação, regime de PIS/Cofins) | Manual do MIT §4 | V-fonte |
| **Tabela de códigos do MIT** contém, com as mesmas descrições da tabela da DCTF: IRPJ `2089-01` (Presumido, TR), `0220-01` (Real obrigada, TR), `3373-01` (Real optante, TR), `2362-01`/`5993-01` (estimativa, ME), `2430-01`/`2456-01` (ajuste, AN); CSLL `2372-01` (TR), `6012-01` (TR), `2484-01` (ME), `6773-01` (AN); PIS `8109-02` (faturamento, ME), `6912-01` (não cumulativo, ME); Cofins `2172-01` (ME), `5856-01` (não cumulativa, ME) | Manual do MIT §10.1 (itens 1, 9, 16, 23, 26, 31, 41, 54, 60, 63, 69, 129, 135, 154, 165) | **V-fonte. Promove a I do ADR do X7 (§3, última linha; §9 item 2)**: os 5 códigos da Fase A estão na tabela do próprio MIT |
| Leiaute JSON 1.0: `PeriodoApuracao{MesApuracao, AnoApuracao}`; `DadosIniciais{SemMovimento, QualificacaoPj, TributacaoLucro, VariacoesMonetarias, RegimePisCofins, ResponsavelApuracao{CpfResponsavel, TelResponsavel?, EmailResponsavel?, RegistroCrc?}}`; `Debitos{BalancoLucroReal?, Irpj, Csll, Irrf, …, PisPasep, Cofins, …}`, cada grupo com `ListaDebitos[{IdDebito, CodigoDebito, ValorDebito, …}]`; `ListaSuspensoes?` | Leiaute JSON de importação 1.0 (retificado em 20/02/2025), pp. 2–10 | V-fonte |
| Domínios usados: `TributacaoLucro` 1 Real Anual · 2 Real Trimestral · 3 Presumido · 7 Simples; `QualificacaoPj` 1 = PJ em geral; `VariacoesMonetarias` 1 = caixa; `RegimePisCofins` 1 não cumulativo · 2 cumulativo · 3 ambos · 4 não se aplica | Leiaute 1.0, pp. 3–4 | V-fonte |
| Regras de forma: os grupos de `Debitos` vêm **na ordem da tabela** do leiaute; `IdDebito` é único e sequencial de 1 até a quantidade de débitos **da apuração**; `CodigoDebito` = String de 6 dígitos (ex. `"022012"`); `ValorDebito` = número com até 2 casas (ex. `777.55`); `BalancoLucroReal` é obrigatório se `TributacaoLucro` = 1 | Leiaute 1.0, pp. 5–8 | V-fonte |
| Responsável: **só o CPF é obrigatório**. Telefone (DDD de 2 dígitos + número de 8 ou 9) e e-mail são opcionais; `RegistroCrc` é opcional, com `NumRegistro` de 6 a 11 caracteres (ex. `"SP123456P3"`, `"123456P3TMG"`) | Leiaute 1.0, pp. 4–5; Manual §3.5 | V-fonte. **As duas fontes divergem no e-mail:** o leiaute diz de 5 a 60 caracteres, o Manual diz até 40. O mais restrito (≤ 40) satisfaz as duas; e-mail mais longo é omitido |
| Nome do arquivo: `<CNPJ raiz, 8 dígitos>-MIT-<AAAAMM>.json` (ex. `87654321-MIT-202504.json`) | Leiaute 1.0, p. 10 | V-fonte. O leiaute é anterior ao CNPJ alfanumérico (§9 P-1) |
| Critério de variações monetárias padrão = caixa; a opção pela competência só em janeiro ou no início de atividade | Manual do MIT §3.3 | V-fonte |
| PIS/Pasep e Cofins **cumulativos** para quem é tributado pelo **lucro presumido** (os arts. 1º–6º e 1º–8º não se aplicam) | Lei 10.637/2002 art. 8º II; Lei 10.833/2003 art. 10 II | V-fonte (Planalto, sem os trechos tachados). No Real, receitas dos incisos VII–XI do art. 10 continuam cumulativas, então o Real pode ser "ambos" (I) |

## 4. Decisões fixadas (sem fork: a lei, o leiaute ou um fork ratificado já decide)

**D1 — A saída é o arquivo JSON do leiaute 1.0, e o encerramento é humano** (herdado: F-X7-9 → b; R5). O Luminaris
não transmite, não chama o e-CAC e não registra "declarado". O arquivo é **pré-preenchimento**: a confissão é o
encerramento no MIT (IN 2.237 art. 2º; Manual §9).

**D2 — Um arquivo por PJ × PA mensal.** A chave é `(userId, anoCalendario, mes)`, e o nome segue o leiaute:
`<raiz do CNPJ do declarante>-MIT-<AAAAMM>.json`. O PA do MIT é mensal (Manual §2.2), e a DCTFWeb é entregue de
forma centralizada pela matriz (art. 3º § 1º), o que casa com R8 (instância = CNPJ raiz).

**D3 — A fonte é a apuração confirmada, sem recálculo.** Entram os `TaxAssessment` com `status = CONFIRMED` e
`deletedAt` nulo, da PJ e do ano, cujo período cai no PA pedido (D4). O valor é o que o X7 confirmou (F-X7-3 → a:
imutável).

**D4 — Período do X7 → PA do MIT:**
- `T01..T04` ⇒ mês 3, 6, 9, 12 do mesmo ano (Manual §4.4, grau **I**; P-4);
- **(Fase B do X7, só quando existir)** `M01..M12` ⇒ o próprio mês; `ANUAL` (ajuste) ⇒ PA de **março do ano
  seguinte** (Manual §4.1, V). O mapeamento fica registrado aqui; o código entra com a Fase B.

**D5 — Grupo e ordem.** `tributo = IRPJ` ⇒ `Debitos.Irpj`; `CSLL` ⇒ `Debitos.Csll`. Os grupos são emitidos na ordem
do leiaute (Irpj antes de Csll), e o `IdDebito` é sequencial de 1 a n **na apuração inteira**, não por grupo. PIS e
Cofins (`PisPasep`, `Cofins`) só entram quando o X8 existir e o dono decidir isso no ADR dele (F-X7-13 → a). Não
há linha reservada para eles agora.

**D6 — `ValorDebito` = `aPagarCents` convertido para número com 2 casas.** É `Number(cents) / 100` serializado pelo
`JSON.stringify` (para inteiros abaixo de 2⁵³, o menor texto que volta ao mesmo double é o próprio decimal: `115` ⇒
`1.15`). Apuração com `aPagarCents = 0` não gera débito. Que o débito do MIT é o valor **líquido das deduções**, e que
o débito zero se omite, é **I** (P-2, P-3).

**D7 — Nunca `SemMovimento = true`.** O Luminaris não enxerga eSocial, EFD-Reinf nem os tributos que não apura.
Declarar "sem movimento" a partir dele seria afirmar o que ele não sabe. Um PA sem apuração confirmada ⇒ 422
*"nada a exportar neste mês"*. A DCTFWeb sem movimento (art. 6º § 2º II) fica com o usuário, no e-CAC (Manual §8.2:
o MIT sem movimento é opcional).

**D8 — Sem eventos especiais.** O arquivo nunca leva `ListaEventosEspeciais`. Como o evento não é editável depois de
criada a apuração (Manual §2.4), o retorno sempre traz o aviso *"mês com extinção, fusão, cisão ou incorporação: não
importe este arquivo"* (IN 2.237 art. 10).

**D9 — Retidos e IRRF ficam fora.** O retido na fonte vai para a EFD-Reinf (art. 9º § 1º I). O IRRF do MIT é só o do
art. 2º da IN SRF 137 (art. 9º § 2º), que o Luminaris não apura. A dedução do retido já está dentro do `aPagarCents`
(F-X7-11 → a).

**D10 — Simples e MEI: 400.** O Simples não informa no MIT o que está no DAS (art. 8º § 4º). O que o MIT do Simples
recebe (IOF, IR sobre aplicações, ganho de capital etc., Manual §2.1) o Luminaris não apura. **O X9 não serve o 1º
cliente.**

**D11 — A porta `EnvioMit` é um tipo mais uma função pura** (`montarArquivoMit(entrada) → { nomeArquivo, conteudo,
avisos }`). O adaptador 1 é o arquivo. Não há registry, factory de adaptadores nem interface com uma implementação:
a porta existe porque o X7 a nomeou (cédula 03/09, D2 (ii)), e o adaptador HTTP só nasce com a R5.

**D12 — PII.** O arquivo leva o CPF do responsável. O CPF **nunca** vai para a auditoria nem para o log, e o
conteúdo do arquivo **não é persistido** (fica só o hash, se F-X9-2 → a).

**D13 — Quotas e DARF ficam fora.** A divisão em quotas e a emissão do DARF acontecem na DCTFWeb, depois do
encerramento (Manual §4.4).

## 5. Esqueleto de comportamentos (o BRIEF herda; isto não é o BRIEF)

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| X9-1 | Função pura `montarArquivoMit`: recebe o perfil, o responsável e as apurações confirmadas do PA e devolve o JSON do leiaute 1.0 (D4–D8), o nome do arquivo (D2) e os avisos | `lib/mit.ts` novo, sem I/O (molde `lib/ecf.ts`) | F-X9-1, F-X9-4 |
| X9-2 | Dados iniciais: `QualificacaoPj = 1`; `TributacaoLucro` vem do perfil (PRESUMIDO ⇒ 3; REAL + TRIMESTRAL ⇒ 2; REAL + ANUAL ⇒ 1, só com a Fase B); `RegimePisCofins` e `VariacoesMonetarias` conforme o F-X9-4 | `lib/mit.ts` | F-X9-4 |
| X9-3 | Responsável vindo do contador do perfil | serviço | F-X9-3 |
| X9-4 | Recusas: Simples/MEI ⇒ 400 (D10); perfil sem declarante ou sem CNPJ ⇒ 400; PA sem apuração confirmada ⇒ 422 (D7); liminar ligada ⇒ F-X9-5 | serviço | F-X9-5 |
| X9-5 | Registro da exportação e aviso de defasagem | Prisma + repo + rotas | F-X9-2 |
| X9-6 | Rotas: `POST /accounting/mit-exports` (gera e devolve o arquivo) e, se F-X9-2 → (a), `GET /accounting/mit-exports?anoCalendario=` (lista com defasagem) | rota em 2 toques + controller + policy | F-X9-2 |
| X9-7 | Matriz de obrigações ganha a DCTFWeb; a fonte da inativa deixa de ser ternário ECD/ECF (`obrigacoesPorRegime.ts:87`) | `models/obrigacoesPorRegime.ts` | F-X9-6 |
| X9-8 | Gates que o diff aciona: snapshot de shape dos DTOs; allowlist do `auditCanonical.ts` (`tax.mit_export.generated`: ids, ano, mês, sha256; **sem CPF**); guard de path-count do openapi; rota em 2 toques | vários | — |

## 6. Contratos esboçados (forma materializável; o BRIEF fecha)

```ts
// lib/mit.ts — só o subconjunto do leiaute 1.0 que o X9 emite (D7, D8, D9: sem SemMovimento=true, sem eventos, sem IRRF)
type MitDebito = { IdDebito: number; CodigoDebito: string /* /^\d{6}$/ */; ValorDebito: number /* 2 casas */ };
type MitArquivo = {
  PeriodoApuracao: { MesApuracao: number; AnoApuracao: number };
  DadosIniciais: {
    SemMovimento: false;
    QualificacaoPj: 1;
    TributacaoLucro: 1 | 2 | 3;          // 1 só com a Fase B do X7
    VariacoesMonetarias: 1 | 2;          // F-X9-4
    RegimePisCofins: 1 | 2 | 3;          // F-X9-4
    ResponsavelApuracao: {
      CpfResponsavel: string;            // 11 dígitos — PII (D12)
      TelResponsavel?: { Ddd: string; NumTelefone: string };
      EmailResponsavel?: string;         // 5..40: leiaute 5..60 ∩ Manual §3.5 ≤ 40; mais longo ⇒ omitido
    };                                    // RegistroCrc omitido (F-X9-3)
  };
  Debitos: { BalancoLucroReal?: boolean; Irpj?: { ListaDebitos: MitDebito[] }; Csll?: { ListaDebitos: MitDebito[] } };
};

// Porta EnvioMit (D11)
type ApuracaoParaMit = { id: string; tributo: 'IRPJ' | 'CSLL'; periodo: string; codigoReceita: string; aPagarCents: bigint };
type EntradaMit = {
  cnpj: string; regime: 'PRESUMIDO' | 'REAL'; forma: 'TRIMESTRAL' | 'ANUAL';
  ano: number; mes: number; responsavel: { cpf: string; phone?: string; email?: string };
  apuracoes: ApuracaoParaMit[];
};
type SaidaMit = { nomeArquivo: string; conteudo: string; sha256: string; avisos: string[]; apuracaoIds: string[] };
export function montarArquivoMit(e: EntradaMit): SaidaMit;
```

```ts
// DTO (Zod .strict())
export const MitExportRequestSchema = z.object({
  anoCalendario: z.number().int().min(2025),   // IN 2.237 art. 1º § 1º I: fatos a partir de 01/01/2025
  mes: z.number().int().min(1).max(12),
}).strict();
```

```prisma
// Só se F-X9-2 → (a). Molde: AccountingDeliveryLog (hash, período, sem conteúdo).
model MitExport {
  id            String   @id @default(cuid())
  userId        String   // a PJ (R8)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  anoCalendario Int
  mes           Int
  sha256        String   // do conteúdo devolvido; o conteúdo NÃO é guardado (D12)
  apuracaoIds   Json     // string[] dos TaxAssessment que entraram
  geradoPorId   String
  createdAt     DateTime @default(now())
  @@index([userId, anoCalendario, mes])
  @@map("mit_exports")
}
// "Defasado" = algum id de apuracaoIds está SUPERSEDED, ou existe CONFIRMED do PA fora de apuracaoIds. É calculado na
// leitura, sem coluna, e sustentado pelo art. 13 § 7º.
```

**Rotas (esboço):**

| Rota | O que faz |
|---|---|
| `POST /api/accounting/mit-exports` | monta, registra (F-X9-2 a) e devolve `{ nomeArquivo, conteudo, sha256, avisos }` |
| `GET /api/accounting/mit-exports?anoCalendario=` | lista as exportações com `defasado: boolean` (F-X9-2 a) |

Deny-by-default no middleware; a policy é a de dado contábil vigente até o GOV-CONTADOR.

## 7. Fronteira com os vizinhos

| Vizinho | Relação |
|---|---|
| **X7** (`TaxAssessment`) | O X9 só **lê** os confirmados. Não escreve no X7, e o X7 não lê o X9: a defasagem é calculada do lado do X9 (F-X9-2) |
| **X8** (PIS/Cofins) | Em espera (rodada 8). Se o X8 for construído e gravar apurações com `codigoReceita`, o D5 ganha os grupos `PisPasep`/`Cofins`. Isso não se decide aqui |
| **EFD-Reinf / eSocial** | Fora: são as outras fontes da DCTFWeb (art. 5º I) |
| **Matriz de obrigações** (X13) | Ganha a linha DCTFWeb (F-X9-6), com fonte na IN 2.237 |
| **C6b / pacote do contador** | O arquivo do MIT como item do pacote fica fora deste ADR (§11) |
| **Integra Contador (R5)** | O adaptador HTTP fica para quando houver tenant pagando. A porta (D11) não muda |

## 8. FORKS — RATIFICADOS (dono, 02/10, [D-2026-10-02-X9-DCTFWEB-MIT-FORKS](../plano/decisoes/D-2026-10-02-X9-DCTFWEB-MIT-FORKS.md))

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-X9-1** Completude do arquivo | **(a)** arquivo **parcial**: só os débitos que o Luminaris confirmou, com avisos fixos no retorno: *"o arquivo traz só IRPJ/CSLL; inclua os demais débitos no MIT antes de encerrar"* e *"importado sobre uma apuração já encerrada, ele vira retificador e substitui a apuração inteira"* · (b) **débitos avulsos**: o operador digita código e valor dos outros tributos no Luminaris, e o arquivo sai completo · (c) **bloquear** até o Luminaris cobrir todos os tributos do mês | ✅ **RATIFICADO (a) — dono, 02/10.** Recomendação era: **(a).** A apuração importada é editável antes do encerramento (Manual §9), e esse é o caminho documentado para completar o arquivo. O (b) põe no Luminaris valores que ele não apurou nem consegue conferir, e o (c) nunca libera, porque o Luminaris não verá eSocial nem Reinf. **Caso adversarial tentado:** *"o usuário importa sobre uma apuração encerrada que tinha PIS/Cofins digitados e encerra sem olhar"*. O (a) não impede isso: só avisa. O MIT mostra o resumo por grupo antes de encerrar (Manual §7), e o art. 14 retém a retificadora que reduz débito. O risco é real e fica declarado no TLDR | alto em (a) sem os avisos |
| **F-X9-2** Registrar a exportação | **(a)** tabela `MitExport` (hash + ids, **sem conteúdo**), com `defasado` calculado na leitura quando uma apuração exportada é substituída · (b) só o evento de auditoria `tax.mit_export.generated`, sem tabela e sem aviso de defasagem | ✅ **RATIFICADO (a) — dono, 02/10.** Recomendação era: **(a).** A confirmação no X7 é imutável, mas substituível (F-X7-3 → a). Quando ela muda depois da exportação, a DCTFWeb diverge da escrituração, e o art. 13 § 7º manda retificar. Sem o registro, o sistema não sabe que exportou. O custo é uma tabela sem PII. **Viés declarado:** "o dono quer completude" empurra para o (a). O contrapeso é que o dever vem do art. 13 § 7º, não do gosto | médio em (b): retificação esquecida |
| **F-X9-3** Responsável pelo preenchimento | **(a)** o **contador do perfil** (`contadorContactId`): CPF obrigatório, mais telefone e e-mail se houver. O `RegistroCrc` fica **omitido** (é opcional no leiaute). Perfil sem contador ⇒ 400 · (b) igual ao (a), mas com o CRC convertido da máscara do CFC para o formato do MIT · (c) o operador digita o CPF a cada exportação | ✅ **RATIFICADO (a) — dono, 02/10.** Recomendação era: **(a).** Só o CPF é obrigatório (Manual §3.5). O formato do CRC no MIT só tem exemplos (`"SP123456P3"`, `"123456P3TMG"`), e o CRC transferido com UF no começo passa de 11 caracteres. Converter é risco sem ganho. O (c) faz digitar PII toda vez. O dado já existe no C6b | baixo |
| **F-X9-4** Dados iniciais que o perfil não tem | **(a)** dois campos novos no perfil: `mitRegimePisCofins` (só no REAL: 1 ou 3) e `mitVariacoesMonetarias` (1 ou 2, padrão 1) · **(b)** derivar o que a lei fixa e usar o padrão do Manual no resto: PRESUMIDO ⇒ `RegimePisCofins` 2 (Lei 10.637 art. 8º II; Lei 10.833 art. 10 II); REAL ⇒ 1; `VariacoesMonetarias` ⇒ 1 (caixa, Manual §3.3). O retorno avisa *"confira os Dados Iniciais no MIT"* | ✅ **RATIFICADO (b) — dono, 02/10.** Recomendação era: **(b).** Enquanto o X8 não existir, o arquivo não leva débito de PIS/Cofins. O `RegimePisCofins` só filtra quais códigos o MIT oferece para o que o usuário digitar (Manual §4), e os Dados Iniciais são editáveis depois da importação. O público-alvo (salão) não opera câmbio. Os campos do (a) pertencem ao X8, se ele for construído | baixo: um campo editável no MIT |
| **F-X9-5** PJ com a chave da liminar contra a LC 224 ligada (F-TA-5 → a) | (a) declarar o débito **cheio** (com o acréscimo) e a **suspensão** em `ListaSuspensoes` (motivo 1, liminar em MS). Isso exige emendar a Fase A (o valor suspenso na linha `LC224_SUSPENSO`) e 8 campos do processo (nº de 20 dígitos, vara, município IBGE, data da decisão, depósito, terceiro…) · (b) exportar o valor da Fase A (acréscimo 0), sem suspensão, com aviso · **(c)** recusar (409, *"PJ com liminar contra a LC 224: a declaração da suspensão depende do contador (P-5)"*) enquanto a chave estiver ligada no ano | ✅ **RATIFICADO (c) — dono, 02/10.** Recomendação era: **(c).** O Manual diz que quem tem processo suspensivo *"deve informar os dados do processo"* (§5), então o (b) tende a produzir uma confissão a menor sem o registro da suspensão. O (a) é o caminho certo se o contador confirmar, mas custa uma emenda num BRIEF ratificado mais 8 campos, e **hoje nenhum cliente-alvo declarou liminar** (F-TA-5). O (c) nunca emite arquivo errado. Reabrir com o P-5 | baixo em (c): o cliente com liminar preenche no MIT à mão |
| **F-X9-6** DCTFWeb na matriz de obrigações | **(a)** entra uma linha por regime: REAL, PRESUMIDO e SIMPLES = `OBRIGATORIA` (art. 3º I; a regra do "sem movimento" do art. 6º § 2º II fica na fonte); MEI = `CONDICIONAL` (art. 3º IX; art. 4º IX), com fonte e vigência de 01/01/2025. O tipo `ObrigacaoSped` vira `ECD \| ECF \| DCTFWEB`, e a inativa ganha fonte própria · (b) a matriz continua só com SPED | ✅ **RATIFICADO (a) — dono, 02/10.** Recomendação era: **(a).** O D11 do X7 entregou isso ao X9, e a fonte agora está lida. É o único item do X9 que **vale para o 1º cliente**: o Simples também entrega DCTFWeb, com os débitos vindos do eSocial e da Reinf, mesmo que o arquivo do X9 não o sirva (D10). É dado versionado, sem motor | baixo |

## 9. Pendente de validação externa (nada disso entra no checklist como decidido)

| # | Pergunta | Por que importa | Quem fecha |
|---|---|---|---|
| P-1 | O MIT aceita **CNPJ alfanumérico** no nome do arquivo? O leiaute (02/2025) diz *"CNPJ raiz (8 dígitos)"* | O CNPJ alfanumérico está em produção desde 01/07/2026 (`lib/cnpj.ts`). Uma PJ nova pode ter raiz com letras | 1ª importação real de PJ alfanumérica, ou uma versão nova do leiaute |
| P-2 | O `ValorDebito` é o valor **líquido das deduções** (o `aPagarCents` do X7) ou o devido bruto? | Valor errado é confissão errada (art. 2º) | contador |
| P-3 | Débito com valor 0 (retenção ≥ devido, F-TA-9 a) se omite ou se declara? | D6 | contador / 1ª importação |
| P-4 | O IRPJ/CSLL trimestral vai **sempre** no PA do último mês do trimestre? | D4 (grau I) | contador / 1ª importação (o MIT recusa periodicidade incompatível?) |
| P-5 | Com liminar contra a LC 224: declarar o débito cheio com suspensão, ou o valor sem o acréscimo? | F-X9-5; P-11 da Fase A | contador / jurídico do cliente |
| P-6 | **Oráculo do formato:** a 1ª importação real no MIT. O próprio MIT rejeita o arquivo com erro de leiaute (Manual §9) | Teste verde prova o leiaute **lido**, não o leiaute **aceito** | gate humano (RUNBOOK-FORMAT): o agente prepara o runbook em branco; não preenche, não marca desfecho, não assina |

## 10. Insumos ausentes (pausa registrada)

1. **Arquivo JSON exportado do próprio MIT** (Manual §8.3: *"no mesmo leiaute do arquivo de importação"*). Seria o
   fixture de ouro. Só existe com acesso ao e-CAC de uma PJ real (dono ou contador).
2. **IN SRF 137/1998 art. 2º** (que IRRF entra no MIT) não foi lida. É irrelevante enquanto o D9 deixar o IRRF de
   fora.
3. **O endereço do leiaute citado no Manual §9** (`…/mit_leiaute_json_importacao.pdf` e `…_retificado.pdf`) responde
   `{"error_type": "NotFound"}` (26 bytes). O leiaute lido é o de 20/02/2025, o mesmo sha do ADR do X7 (§15). Pode
   existir versão mais nova publicada em outro endereço; não procurei além disso.

## 11. Achados fora de escopo (registrados, não planejados — regra 5)

1. **ADR do X7 §3 (última linha) e §9 item 2:** "o MIT usa a mesma tabela de códigos" passa de I a **V** (Manual do
   MIT §10.1). Este ADR não edita o ADR do X7. Quem fizer o próximo fold do X7 pode marcar.
2. **Alerta de prazo** (último dia útil do mês seguinte, art. 6º): exige calendário de dias úteis com feriados. Não
   está aqui.
3. **O arquivo do MIT no pacote do contador** (C6b, `ExportKind` novo): fica para quando o contador pedir.
4. **X8:** a revogação do PIS/Cofins em 01/01/2027 (LC 214 art. 542, V-fonte no ADR do X7 §3) deixa cerca de 3 meses
   de fato gerador. O ADR do X8 começa por esse custo-benefício.

## 12. Riscos e vieses (T8)

- **Risco — retificação que apaga débitos** (TLDR, F-X9-1). A mitigação é aviso, não trava: o Luminaris não vê o
  e-CAC.
- **Risco — oráculo só externo.** O teste prova o leiaute que eu li. O MIT aceitar é o P-6.
- **Risco — valor para o 1º cliente ≈ zero**, salvo a linha da matriz (F-X9-6).
- **Viés 1 (fonte legível):** a tabela de códigos e o leiaute vieram de PDFs extraídos com `pdftotext -layout`. No
  leiaute, a extração embaralha as colunas (descrição × obrigatoriedade). As regras de forma da §3 foram lidas
  campo a campo, mas uma condição de obrigatoriedade mal pareada é possível. O P-6 é a checagem que pegaria isso.
- **Viés 2 (completude × ponytail):** o F-X9-2 (a) adiciona uma tabela. A justificativa é o art. 13 § 7º.
- **Viés 3 (herança do X7):** o D6 assume que o `aPagarCents` é o número certo para a DCTFWeb (P-2). Se não for, o
  erro não está no X9, está no C1.
- **Caso adversarial tentado contra "o X9 é só um serializador":** a retificação integral (art. 13 § 1º; Manual
  §9.1) mostra que um arquivo correto **por linha** pode produzir uma DCTFWeb errada **no todo**. Por isso o F-X9-1
  é fork, e não detalhe de implementação.

## 13. Invariantes que a implementação DEVE provar (o BRIEF herda; cada uma vira teste)

1. Grupos na ordem do leiaute (`Irpj` antes de `Csll`); `IdDebito` = 1..n contínuo na apuração inteira.
2. `CodigoDebito` = `codigoReceita` do `TaxAssessment`, 6 dígitos, como String.
3. `ValorDebito`: 1 centavo ⇒ `0.01`; 10 ⇒ `0.1`; 115 ⇒ `1.15`; o texto JSON nunca tem mais de 2 casas.
4. `SemMovimento` é sempre `false`; PA sem confirmado ⇒ 422 (D7).
5. Só `CONFIRMED` não deletado entra; `SUPERSEDED` nunca.
6. `T01` ⇒ `MesApuracao = 3`; pedir o mês 1 ou 2 de um ano só trimestral ⇒ 422.
7. Simples/MEI ⇒ 400; liminar ligada ⇒ conforme F-X9-5.
8. Nome do arquivo = 8 primeiros caracteres do CNPJ + `-MIT-` + AAAAMM + `.json`.
9. O CPF não aparece no payload de auditoria nem no log; o conteúdo não é persistido (D12).
10. (F-X9-2 a) Substituir uma apuração exportada ⇒ o `GET` mostra `defasado = true`; exportar de novo ⇒ o registro
    novo sai com `defasado = false`.
11. Os avisos fixos (F-X9-1, D8 e F-X9-4 b) estão em **todo** retorno de sucesso.

## 14. Sinal humano — estado do gate

- **F-X9-1 a F-X9-6:** ✅ 02/10, questionário em 2 lotes; todos na recomendação. Cédulas com a resposta literal em
  [`D-2026-10-02-X9-DCTFWEB-MIT-FORKS`](../plano/decisoes/D-2026-10-02-X9-DCTFWEB-MIT-FORKS.md).
- **`Accepted` em 02/10.** BRIEF só com pedido de planejamento; código só com "executa", depois do PR-2 da Fase A
  do X7.
- **P-1..P-6:** externos. O P-6 é runbook humano.
- A nota [X9](../plano/nos/X9.md) aponta para este ADR na seção "Docs".

## 15. Verificação na fonte primária (02/10)

Política do pedido: *"fonte legal só primária"*. Lido nesta sessão:

| Documento | Origem | sha256 (12) | Observação |
|---|---|---|---|
| IN RFB 2.237/2024, texto vigente | API do Sijut, ato `141910`, visão multivigente; segmentos tachados removidos | `a5a1adcb05a6` (JSON) | Histórico: alterada pelas IN RFB 2.248/2025, 2.267/2025, **2.319/2026** e **2.325/2026**. O § 1º do art. 6º não aparece no texto vigente |
| Manual do MIT, jan/2025 (1.0.14.02) | URL do MANIFEST `manual-mit` | `49da7ca21177` | igual ao MANIFEST e ao ADR do X7 |
| Leiaute JSON de importação do MIT 1.0 (retificado em 20/02/2025) | gov.br/receitafederal, `mit_leiaute_json_importacao_20-02-2025.pdf` | `4e840b311cca` | igual ao ADR do X7. Os nomes citados no Manual §9 respondem NotFound (§10 item 3) |
| Lei 10.637/2002 (art. 8º II) | Planalto, `leis/2002/l10637.htm` (curl; sem `<strike>`) | `df7532d9deab` | |
| Lei 10.833/2003 (art. 10 II) | Planalto, `leis/2003/l10.833.htm` (curl; sem `<strike>`) | `b6e6c7d501ec` | |

Nada foi copiado para o repo nem para o corpus (decisão 10 de 29/09). As cópias ficaram na pasta temporária da
sessão.
