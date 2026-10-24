# BE-INCR-ISS-TRANSICAO-IBS — BRIEF (nó ISS-TRANSICAO-IBS)

> **Sessão:** `sessao-planejamento` (agente). Saída = este documento + dossiê legal + fold da nota do nó. **Sem código, sem
> `executa`, sem merge.** Forks F-ISS-1..7 ~~PENDENTES~~ **ratificados pelo dono em 22/10/2026** (quadro abaixo do cabeçalho).

> **RATIFICAÇÃO 22/10/2026** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]; dono, chat, 2026-10-22: "Dispara 1 pra ratificar os forks", respostas no
> AskUserQuestion): **F-ISS-1..7 todos (a)**, a recomendação do BRIEF. O PR-2 segue esperando P-ISS-1..3 do contador.
> **Não é `executa`.**

## TLDR (2 linhas)

Dois PRs levam o ISS do produto até 2033. **PR-1** fecha a vigência de `ISS_LIMITE` em 31/12/2032, dá ao perfil fiscal um 400
nomeado de 2033 em diante e semeia o fator 10/20/30/40% e as linhas `DRAFT` do IBS de 2029–2032; ele não depende de ninguém. **PR-2**
aplica o fator na alíquota do regime normal, nos benefícios e no piso, e depende de 3 respostas do contador (P-ISS-1..3).
**Risco principal:** hoje o refine do `issAliquotaBp` chama `issAliquotaMaxBpDoCache()`, que lança `SemLinhaVigenteError` se a
linha `ISS_LIMITE` tiver fim. Fechar a vigência sem o item 4 faz o PUT do perfil com alíquota responder, a partir de 2033, um
erro genérico ("Sem linha vigente de ISS_LIMITE…") lançado de dentro do refine. É `ValidationError` (400), mas o status final
é inferido, não testado: a exceção sai do `parse` em vez de virar issue do Zod. Além disso,
o piso de 2% (A1) e o benefício municipal no Simples (A2) são leitura da lei, não texto: até o contador responder, o PR-2 não sai.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `ISS-TRANSICAO-IBS`, em `docs/plano/nos/ISS-TRANSICAO-IBS.md` (estado `planned`, `depende_de`
  `[[M5-ibs-cbs]]`, gatilho em 01/01/2029).
- **Autorização:** dono, chat, 2026-10-22 (repassada pela sessão de origem): *"Precisamos agora de sessões para a falta de
  brief"*. Limite: o BRIEF (sessao-planejamento), só docs, sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** a autorização cobre exatamente o BRIEF deste nó. Há uma divergência registrada: o campo
    `autorizacao` da nota (17/10) diz "só a nota … sem BRIEF". **O pedido de 22/10 é o pedido próprio** que aquele texto exigia.
    O fold (§9) acrescenta a citação de 22/10 ao `estado_detalhe` e não troca o campo `autorizacao`, que continua sem autorizar
    código. É o mesmo tratamento do BRIEF IBS-CBS-2027 §0.
- **Insumos (fato consumado):**
  - nota do nó; dossiê `pesquisas-legais/verif-2026-10-17-iss-nfse/relatorio.md` (origem do nó, DESATUALIZADO-RISCO a);
  - **dossiê novo** `pesquisas-legais/iss-transicao-ibs-2029/relatorio.md` (LC 214 lida no Planalto compilado, 22/10);
  - `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` (tabela `IBS_CBS` com vigência; linha `DRAFT` sem valor ⇒ 400 nomeado onde a
    alíquota é necessária; F-IBS-11 (a) conferência pulada com aviso);
  - código lido: `server/src/features/accounting/models/issLimite.ts`, `models/issBeneficio.ts` (`issComBeneficio`,
    `PISO_ISS_BP`), `models/simplesCalc.ts:378-425` (teto e benefício no Simples), `dtos/FiscalProfileDto.ts:91-99`,
    `services/FiscalDocumentEmissionService.ts:994-1003` (`pAliq`), `models/issCompetencia.ts` (X7 PR-2),
    `legalParameters/models/legalParameter.ts`, `legalParameters/models/formatoLinha.ts:139-142`;
  - seeds: `prisma/data/legal_parameters_v2.sql` (linha `lp2-iss-aliquota_max_bp`, 500, 2025-01-01→`NULL`),
    `prisma/data/legal_parameters_simples_v1.sql` (`SIMPLES_TETO_ISS` com vigências 2027–28, 2029, 2030, 2031 e 2032;
    verificado), `prisma/data/legal_parameters_ibs_cbs_v1.sql` (IBS UF/MUN até 2028-12-31).
- **Nós vizinhos:** consome LEGAL-PARAMS (`LegalParameter`, `linhaLegalVigente`, `SemLinhaVigenteError`, supersessão por
  `supersedesId`, cache síncrono), IBS-CBS-2027 (tabela `IBS_CBS`), X7 (relatório de ISS por competência × município) e X14/
  SIMPLES-PISO-ANEXO-XI (`simplesCalc`, `issBeneficio`). PACOTE-VALIDADE (`pacoteFatoGerador`) é tocado só pela pendência
  P-ISS-3. Nenhum nó consome este.

**Verificação legal (método do CLAUDE.md):** dossiê `iss-transicao-ibs-2029`. O acervo da LC 116 [D01] está compilado e sem
alerta, mas o art. 8º-B aparece só como "(Vide LC 214)". O acervo da LC 214 [D02] é a republicação (alerta). Por isso o texto foi
lido no **Planalto compilado [D03]**, baixado em 22/10, com as marcas da LC 227/2026. Os arts. 508, 543 e 544 V não têm marca de
alteração. Cada item com regra legal cita o artigo e a [Dnn] **desse dossiê**.

**Fronteira (STOP do CLAUDE.md):** a lei desenha a regra igual para todos e ela é uma tabela por vigência. Por isso ela vai para
**`legal_parameters` (Prisma, LEGAL-PARAMS)**, sem model novo. Nada aqui toca `DynamicTableService`, `RuleContext` ou plugin.

**PRE-ADR: não é necessário (conclusão desta sessão).** O desenho só acrescenta linhas e uma tabela ao catálogo fechado do
LEGAL-PARAMS, que já prevê tabela nova por enum mais `formatoLinha`. Também acrescenta funções puras no molde de `issLimite.ts`
e muda a validação de um campo existente. Não há camada nova, dependência nova entre camadas nem model Prisma novo. O
`check:arch` não muda. As decisões abertas são de regra (forks de BRIEF, §5), não de estrutura.

## 1. Regra legal que o BRIEF aplica (dossiê `iss-transicao-ibs-2029`)

| # | Regra | Fonte |
|---|---|---|
| L1 | Fato gerador de 01/01/2029 a 31/12/2032: a alíquota do ISS é reduzida em 10% (2029), 20% (2030), 30% (2031) e 40% (2032) **da alíquota municipal vigente em 31/12/2028** | LC 116 art. 8º-B caput, I–IV (LC 214 art. 508) [D03] |
| L2 | Os benefícios caem na mesma proporção (§ 1º). Os percentuais e parâmetros que os calculam também (§ 2º), salvo se já reduzidos pela queda da alíquota (§ 3º) | art. 8º-B §§ 1º–3º [D03] |
| L3 | O art. 8º-B vigora desde 01/01/2026, mas só atinge fato gerador de 2029 em diante | LC 214 art. 544 VI [D03] |
| L4 | Mesma operação com fato gerador de ISS e de IBS em anos diferentes (2029–2032): vale a lei do ano da **primeira ocorrência** | LC 214 art. 408 § 4º I [D03] |
| L5 | Elemento temporal do ISS não completado até 31/12/2032: não há ISS, só IBS | art. 408 § 4º II e § 5º [D03] |
| L6 | LC 116 revogada a partir de 01/01/2033 | art. 543 IV; art. 544 V [D03] |
| L7 | Alíquotas de referência do IBS de 2029 a 2032: o Senado as fixa por resolução (sem número na lei) | arts. 342 III, 361–364 (red. LC 227) [D03] |
| L8 | O máximo de 5% (art. 8º II) e o mínimo de 2% (art. 8º-A) **não foram alterados** pela LC 214 | busca no texto compilado [D03]; LC 116 [D01] |

## 2. Fatiamento — cada PR com `executa` próprio (F-ISS-7)

| PR | Conteúdo | Itens | Depende de | Prazo útil |
|---|---|---|---|---|
| **PR-1** vigência e fim | `ISS_LIMITE` com fim em 2032-12-31, tabela `ISS_TRANSICAO` (fator), linhas `DRAFT` do IBS 2029–2032, 400 nomeado de 2033 em diante, X7 intocado (teste) | 1–7 | — (lei explícita, L1/L6/L7) | qualquer data antes de 2029; a guarda de 2033 é a única com efeito em runtime |
| **PR-2** aplicação do fator | alíquota do regime normal (F-ISS-1), piso por vigência (F-ISS-4), benefício (F-ISS-3), pacote que cruza o ano (P-ISS-3) | 8–14 | PR-1; **P-ISS-1, P-ISS-2, P-ISS-3** | antes da 1ª competência de 2029 |

## 3. Checklist numerado (cada item = ≥ 1 teste)

Caminhos relativos a `server/src/`. Padrão de camada (Contrato §2/§3): o nó não cria rota, model nem repositório. Toda leitura
de tabela usa o canônico `linhaLegalVigente` / `linhasEmCacheSincrono` do LEGAL-PARAMS, sem leitor paralelo.

### PR-1 — vigência e fim (sem dependência externa)

1. **`ISS_LIMITE/ALIQUOTA_MAX_BP` ganha fim em 2032-12-31** por **nova versão** (`supersedesId = 'lp2-iss-aliquota_max_bp'`,
   mesmo valor 500, `vigenteAte = '2032-12-31'`, `fonte` "LC 116 art. 8º II; LC 214 art. 543 IV"), nunca por `UPDATE` da linha
   publicada. A migração de dado usa prólogo defensivo (memória "migração SQLite sem transação"). O valor continua 500 em 2029–2032
   (F-ISS-2). Teste: `issAliquotaMaxBp(linhas, '2032-12-31') === 500` e `issAliquotaMaxBp(linhas, '2033-01-01')` lança
   `SemLinhaVigenteError`.
2. **Tabela `ISS_TRANSICAO`** em `LEGAL_PARAMETER_TABELAS`, com `formatoLinha` próprio: chave `FATOR_REDUCAO_BP`, sem
   discriminador, `valorInt` 0..10000. Quatro linhas `PUBLISHED`: 2029 = 1000, 2030 = 2000, 2031 = 3000, 2032 = 4000, cada uma com
   vigência de 01/01 a 31/12. `fonte` = "LC 116 art. 8º-B I–IV (LC 214 art. 508)", `fonteSha256` = sha do [D03]. A lei dá o
   número, então nada nasce `DRAFT` (L1).
3. **`models/issTransicao.ts`** (puro, no molde de `issLimite.ts`):
   - `fatorReducaoIssBp(linhas, data)` devolve 0 antes de 2029-01-01, o valor da linha de 2029 a 2032, e lança
     `IssExtintoError` de 2033-01-01 em diante (L6);
   - `issExtinto(data): boolean`.

   Testes: 2028-12-31 ⇒ 0; 2029-01-01 ⇒ 1000; 2032-12-31 ⇒ 4000; 2033-01-01 ⇒ `IssExtintoError`. Data de 2029 sem a linha
   publicada ⇒ `SemLinhaVigenteError`, não 0 (memória "param aceito e ignorado").
4. **Guarda de 2033 no perfil fiscal (F-ISS-5).** O refine de `issAliquotaBp` (`FiscalProfileDto.ts:93-99`) deixa de chamar
   `issAliquotaMaxBpDoCache()` às cegas. Com `issExtinto(hoje)` e valor não nulo, ele dá **400 nomeado** ("ISS extinto a partir
   de 01/01/2033 (LC 214 art. 543 IV): deixe a alíquota de ISS em branco"). Com valor nulo, passa. O teste roda com a data
   injetada (`hoje`) em 2033-01-01: o PUT com valor dá 400 **com a mensagem nomeada**, e o PUT com `null` dá 200. **Este item
   anda junto com o item 1:** sem ele, o refine lança `SemLinhaVigenteError` de dentro do `parse` em todo PUT com alíquota a
   partir de 2033 (`issLimite.ts:12`, verificado). Pela classe, é `ValidationError`; o status HTTP final é inferido, porque a
   exceção escapa do Zod e não foi exercitada.
5. **Linhas `DRAFT` do IBS de 2029–2032 (F-ISS-6)** em `IBS_CBS`: `IBS/ALIQUOTA_UF` e `IBS/ALIQUOTA_MUN`, uma por ano de 2029 a
   2032, com `valorInt = null`, `status = 'DRAFT'` e `fonte = "LC 214 art. 36X + Res. SF nº ___"` (361 para 2029 … 364 para
   2032). Com isso a conferência do IBS-CBS-2027 cai no aviso `CONFERENCIA_SEM_ALIQUOTA` (F-IBS-11 a) e não no "sem linha". O
   teste prova que `parametroIbsCbsVigente(..., '2029-03-10')` lança `SemLinhaVigenteError` com a mensagem nomeada até haver linha
   `PUBLISHED`. Publicar o número é ato do operador (fluxo LEGAL-PARAMS), não PR deste nó.
6. **X7 sem mudança, com teste-guarda.** `agregarIssPorCompetencia` soma o `vIss` **do documento** e nunca refaz
   `alíquota × base` (`issCompetencia.ts`, item 19 do BRIEF C). Um teste com documentos de competência 2029-01 e 2032-12 prova que
   a soma é a do documento, sem fator. O relatório não ganha coluna nova: o contrato `IssLinhaSchema` é `.strict()` e não muda.
7. **Gates do PR-1:**
   - snapshot de shape do `legalParameters` (`__dto-shapes__.json`): inserir só a entrada nova (memória "UPDATE do snapshot
     reordena");
   - paridade i18n pt/en da mensagem do item 4;
   - `tsc` do server limpo; `check:arch` sem violação nova;
   - `resetDb` não muda (tabela existente).

### PR-2 — aplicação do fator (só depois de P-ISS-1..3)

8. **Alíquota do regime normal na DPS (F-ISS-1).** Quando a emissão manda `pAliq` (`FiscalDocumentEmissionService.ts:1000`) e o
   regime **não** é Simples, `pAliq = issAliquotaBp × (10000 − fator(dataFatoGerador)) / 10000`. Nesse caso `issAliquotaBp` é a
   alíquota municipal de 31/12/2028 (L1). Arredondamento: Insumo ausente 2 (casas do `pAliq` no leiaute de 2029). No **Simples
   com retenção** (E0621/E0628) o `issAliquotaBp` é o % efetivo do Anexo, que já cai pela tabela, e o fator **não** se aplica (o
   teste prova que não reduz duas vezes). Testes: regime normal em 2029-01-15 com 500 ⇒ `pAliq` 4,50; em 2028-12-31 ⇒ 5,00;
   Simples com retenção em 2029 ⇒ inalterado.
9. **Data do fator = primeira ocorrência (L4).** Para nota de serviço comum, a data é a da competência (`dCompet`). Para pacote,
   é a data que a P-ISS-3 fixar. Até a resposta, o PR-2 não toca o caminho do pacote (§6).
10. **Piso por vigência (F-ISS-4).** `PISO_ISS_BP` (constante, `issBeneficio.ts:17`) vira a linha `ISS_LIMITE/ALIQUOTA_MIN_BP`:
    - `formatoLinha` de `ISS_LIMITE` aceita a chave nova;
    - linha 2025-01-01→2028-12-31 = 200 `PUBLISHED` (art. 8º-A [D01]);
    - linhas de 2029 a 2032 conforme a P-ISS-1: 200 em todas (leitura a) ou 180/160/140/120 (leitura b);
    - `issComBeneficio` e `simplesCalc.ts:420-423` recebem o piso **por parâmetro** (a função continua pura) e o
      `SimplesApuracaoService` lê a linha pela data do PA.

    `SUBITENS_SEM_PISO` não muda (art. 8º-A § 1º não alterado). Teste: PA 2028-12 ⇒ 200; PA 2029-01 ⇒ o valor da linha. PA de 2029
    só com linha `DRAFT` ⇒ **400 nomeado** (F-ISS-4 a). O texto do alerta `BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO`
    (`SimplesApuracaoService.ts:552`) passa a interpolar o piso lido, no lugar do "2%" fixo.
11. **Benefício municipal no Simples (F-ISS-3).** O mecanismo depende da P-ISS-2:
    - **se o § 2º se aplica**, `reducaoBpDaFaixa` passa a devolver `reducao × (10000 − fator) / 10000` em 2029–2032;
    - **se o § 3º afasta**, nada muda no cálculo e o teste prova a identidade.

    Em ambos os casos o benefício cadastrado (`BeneficioCadastrado`) continua com a vigência do usuário. Teste com isenção
    (10000 bp) em 2029: 9000 bp no ramo § 2º; 10000 bp no ramo § 3º.
12. **Aviso de virada para benefício que cruza 2029.** Um benefício com `vigenteAte` nulo ou ≥ 2029-01-01 e `vigenteDesde` <
    2029-01-01 gera, na apuração do PA 2029-01, o aviso `BENEFICIO_ISS_TRANSICAO_8B` com o texto da regra aplicada (§ 2º ou § 3º).
    É aviso, não bloqueio.
13. **Nada de ISS a partir de 2033 na apuração do Simples.** O teto já é tratado (`simplesCalc.ts:384`, F-PR4-8). O item acrescenta
    um teste-guarda: PA 2033-01 com benefício cadastrado não aplica benefício nem piso, porque os Anexos de 2033 não têm ISS.
14. **Gates do PR-2:**
    - snapshot de shape;
    - i18n do aviso do item 12;
    - `auditCanonical.ts` **não** muda (nenhum eventType novo; o perfil fiscal já audita `issAliquotaBp`);
    - `tsc` limpo; `check:arch` limpo.

## 4. Contratos esboçados

### 4.1 Linhas de `legal_parameters` (PR-1, PR-2)

```sql
-- PR-1 item 1: nova versão (supersessão), mesmo valor, com fim
('lp-iss-max-2025-2032', 'ISS_LIMITE', 'ALIQUOTA_MAX_BP', NULL, 500, …, 'LC 116 art. 8º II; LC 214 art. 543 IV', …,
 '2025-01-01', '2032-12-31', 'PUBLISHED', 'lp2-iss-aliquota_max_bp', …)
-- PR-1 item 2
('lp-iss-transicao-2029', 'ISS_TRANSICAO', 'FATOR_REDUCAO_BP', NULL, 1000, …, '2029-01-01', '2029-12-31', 'PUBLISHED', …)
-- … 2030 = 2000, 2031 = 3000, 2032 = 4000
-- PR-1 item 5 (8 linhas: UF e MUN × 2029..2032)
('ibscbs-ibs-mun-2029', 'IBS_CBS', 'IBS', 'ALIQUOTA_MUN', NULL, …, 'LC 214 art. 361 + Res. SF nº ___', …,
 '2029-01-01', '2029-12-31', 'DRAFT', …)
-- PR-2 item 10
('lp-iss-min-2025-2028', 'ISS_LIMITE', 'ALIQUOTA_MIN_BP', NULL, 200, …, 'LC 116 art. 8º-A', …, '2025-01-01', '2028-12-31', 'PUBLISHED', …)
('lp-iss-min-2029', 'ISS_LIMITE', 'ALIQUOTA_MIN_BP', NULL, /* P-ISS-1: 200 | 180 */, …, '2029-01-01', '2029-12-31', 'DRAFT', …)
```

### 4.2 TS

```ts
// legalParameters/models/legalParameter.ts
export const LEGAL_PARAMETER_TABELAS = [/* existentes */, 'ISS_TRANSICAO'] as const;

// legalParameters/models/formatoLinha.ts
ISS_LIMITE: { valor: 'int', checar: (l) => so(['ALIQUOTA_MAX_BP', 'ALIQUOTA_MIN_BP'].includes(l.chave) && semDisc(l) && inBp(l.valorInt), '…') },
ISS_TRANSICAO: { valor: 'int', checar: (l) => so(l.chave === 'FATOR_REDUCAO_BP' && semDisc(l) && inBp(l.valorInt), 'chave FATOR_REDUCAO_BP; valorInt em bp (0..10000)') },

// accounting/models/issTransicao.ts
export class IssExtintoError extends ValidationError {}               // 400 nomeado (LC 214 art. 543 IV)
export const INICIO_TRANSICAO_ISS = '2029-01-01';
export const FIM_ISS = '2033-01-01';
export function issExtinto(data: string): boolean;                     // data >= FIM_ISS
export function fatorReducaoIssBp(linhas: readonly LinhaLegal[], data: string): number; // 0 | linha | throws
export function aliquotaIssDevidaBp(i: { aliquota31122028Bp: number; dataFatoGerador: string; linhas: readonly LinhaLegal[] }): number; // PR-2

// accounting/models/issBeneficio.ts (PR-2) — piso por parâmetro, função continua pura
export function issComBeneficio(i: { issTabelaBp: number; faixa: number; cTribNac: string; beneficio: BeneficioIssCalculo | null; pisoBp: number; fatorTransicaoBp: number /* 0 se § 3º */ }): { issAplicadoBp: number; pisoAplicado: boolean; excecaoPiso: boolean };

// accounting/dtos/FiscalProfileDto.ts (PR-1 item 4)
issAliquotaBp: z.number().int().min(0)
  .superRefine((v, ctx) => issExtinto(hoje()) ? ctx.addIssue({ code: 'custom', message: 'ISS extinto a partir de 01/01/2033 (LC 214 art. 543 IV)…' })
                                              : v <= issAliquotaMaxBpDoCache() || ctx.addIssue({ code: 'custom', message: '…ISS_LIMITE…' }))
  .nullable().optional(),
```

Nenhuma rota nova, nenhum model Prisma novo e nenhum path novo no openapi (o guard de path-count não muda).

## 5. Forks — **RATIFICADOS em 22/10/2026** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]])

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-ISS-1** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · O que o `issAliquotaBp` significa de 2029 em diante (regime normal, município não conveniado) | **(a)** é a alíquota municipal de 31/12/2028, e a emissão aplica o fator pela data do fato gerador (item 8) · **(b)** o operador digita a alíquota já reduzida a cada ano, e o produto só avisa na virada · **(c)** o campo ganha histórico por vigência no perfil | **(a).** É a letra do caput (base = lei de 31/12/2028, L1), sem trabalho anual do operador e sem migração de schema. (b) deixa o erro na mão de quem esquece a virada; (c) cria versionamento no perfil para um dado que a lei congela. No Simples com retenção o fator não se aplica (o Anexo já reduz) | médio: em (b), `pAliq` errado na DPS de município não conveniado ⇒ rejeição ou ISS a maior |
| **F-ISS-2** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · Máximo do `ISS_LIMITE` em 2029–2032 | **(a)** continua 500 até 2032-12-31 (o art. 8º II não mudou; RN E0595) · **(b)** uma linha por ano (450/400/350/300) | **(a).** Com F-ISS-1 (a), o campo guarda a alíquota-base de 2028, à qual o teto de 5% se aplica. (b) recusaria uma base legítima de 5% em 2029. Se F-ISS-1 for (b), esta recomendação se inverte | baixo |
| **F-ISS-3** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · Benefício municipal no Simples em 2029–2032 (item 11) | **(a)** o mecanismo sai com os dois ramos (§ 2º / § 3º) e o ramo ativo é a resposta da P-ISS-2, registrada como linha de parâmetro · **(b)** nada automático: só o aviso do item 12, e o usuário recadastra o benefício por ano · **(c)** aplica o § 2º sem esperar o contador | **(a)**, com o PR-2 esperando a P-ISS-2. A lei manda reduzir (§ 1º–§ 2º), mas a exceção do § 3º no Simples é leitura (A2 do dossiê). (b) põe a regra na mão do usuário; (c) decide uma ambiguidade sem o contador | alto em (c): DAS errado em todo PA com benefício |
| **F-ISS-4** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · PA de 2029 com a linha do piso ainda `DRAFT` (P-ISS-1 sem resposta) | **(a)** 400 nomeado na apuração do Simples com benefício (só ela lê o piso) · **(b)** usa 200 com aviso `PISO_ISS_TRANSICAO_PENDENTE` | **(a)**, que segue o molde da CBS `DRAFT` (IBS-CBS-2027 §2): sem número, não calcula. O piso muda o valor do DAS, não só uma conferência, então o precedente do aviso (F-IBS-11) não se aplica. Faltam mais de 2 anos para 2029 | médio em (b): DAS a maior ou a menor em silêncio |
| **F-ISS-5** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · `issAliquotaBp` a partir de 2033 (item 4) | **(a)** 400 nomeado com valor não nulo; `null` aceito · **(b)** aceita e ignora o valor na emissão · **(c)** zera o campo por migração em 2033 | **(a).** A memória "param aceito e ignorado é bug" proíbe (b); (c) é migração com data no futuro, que ninguém dispara | baixo; o alvo real é trocar a exceção genérica por um 400 que diga o motivo |
| **F-ISS-6** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · Quem semeia as linhas `DRAFT` do IBS de 2029–2032 | **(a)** este nó (PR-1 item 5) · **(b)** emenda ao IBS-CBS-2027 | **(a).** É a metade "sobe o IBS" da transição (art. 342 II–III, que amarra o IBS ao art. 508). O PR-1 do IBS-CBS-2027 já está em `main` e fechou a tabela em 2028 | baixo |
| **F-ISS-7** — **RATIFICADO 22/10/2026: (a)** ([[D-2026-10-22-ISS-TRANSICAO-IBS-FORKS]]) · Fatiamento | **(a)** 2 PRs (PR-1 sem dependência; PR-2 depois de P-ISS-1..3) · **(b)** um PR único depois das respostas | **(a).** O PR-1 é lei explícita e deixa a guarda de 2033 pronta sem esperar ninguém; (b) prende a guarda a uma resposta que não muda o PR-1 | baixo |

## 6. Pendente de validação externa (contador / fonte oficial — não são forks)

| # | Pergunta (texto pronto para o contador) | Trava | Quem |
|---|---|---|---|
| **P-ISS-1** (A1 do dossiê) | "De 2029 a 2032, o piso de 2% do ISS (LC 116 art. 8º-A; Res. CGSN 140 art. 31 p.ú.) continua 2% ou cai 10/20/30/40% junto com as alíquotas do art. 8º-B?" A leitura (b), de que o piso cai, é a mais coerente com o § 2º, mas a lei não diz | valores das linhas `ALIQUOTA_MIN_BP` 2029–2032 (item 10) | contador |
| **P-ISS-2** (A2) | "Para ME do Simples com isenção ou redução municipal de ISS, de 2029 a 2032 a redução do benefício (art. 8º-B § 2º) se aplica além da queda do Anexo, ou o § 3º a afasta?" | ramo do item 11 (F-ISS-3) | contador |
| **P-ISS-3** (L4/L5 no pacote) | "Pacote de sessões vendido em 2028 e consumido em 2029: qual é a 'primeira ocorrência' do art. 408 § 4º I, a venda (antecipação do IBS, art. 10 § 4º) ou a sessão (fato gerador do ISS)? E o saldo não consumido até 31/12/2032 sai só com IBS (§ 4º II)?" | item 9 para pacote; NFS-e de pacote a partir de 2029 | contador |
| **P-ISS-4** (A3) | Município que edita lei nova com alíquota já reduzida depois de 31/12/2028: a base continua sendo a de 31/12/2028? A leitura mais segura é que sim, e o produto segue F-ISS-1 (a) | texto de ajuda do campo | contador (baixa prioridade) |
| **P-ISS-5** | Alíquotas de referência do IBS de 2029 a 2032 (Res. SF, arts. 361–364) | publicação das linhas `DRAFT` do item 5 | fonte oficial (operador publica) |

## 7. Insumos ausentes

1. **Leiaute da DPS/NFS-e para 2029–2033.** Não lido: não se sabe se o sistema nacional passa a fornecer o `pAliq` já reduzido
   para o município conveniado, nem o que acontece com o grupo `tribMun` em 2033. A emissão de 2033 em diante **não** está no
   checklist por isso (§8, item 1).
2. Casas decimais e arredondamento do `pAliq` reduzido (ex.: 3% × 0,9 = 2,70%; 2,5% × 0,7 = 1,75%) no leiaute vigente em 2029.
3. Res. CGSN que regulamente o art. 8º-B no Simples. Não foi achada; não foi buscada além da LC 214 (regra 2).
4. As resoluções do Senado do item 5 (P-ISS-5), mitigadas pelas linhas `DRAFT`.

## 8. Achados fora de escopo (não planejados)

1. **Emissão de NFS-e a partir de 2033:** grupo `tribMun`, `tribISSQN` e `pTotTribMun` com o ISS extinto. Depende do leiaute
   (Insumo ausente 1) e é frente do emissor (DFE-ADN-EMISSOR), não deste nó.
2. **Paulistana e outros emissores próprios:** o relatório do X7 já não vê a Paulistana (#610). A transição não muda isso.
3. **ICMS 2029–2032 (LC 214 art. 501)** tem a mesma escala para o ICMS; o produto não calcula ICMS próprio fora do Simples. Não
   foi planejado.
4. **MEI:** o Anexo VII de 2029–2032 já é do SIMEI-TAC-12. Nada aqui.
5. **D-4 (mínimo de 2% no `issAliquotaBp`)** segue aberta no dossiê de 17/10. Com F-ISS-4 o mínimo vira linha de tabela, mas a
   decisão de validar o campo continua sendo a D-4, não este nó.

## 9. Fold desta sessão

`docs/plano/nos/ISS-TRANSICAO-IBS.md`: `estado` continua `planned`. O `estado_detalhe` ganha a entrada de 22/10 (BRIEF escrito,
PR deste BRIEF, forks F-ISS-1..7 pendentes, P-ISS-1..3 ao contador, próximo passo = ratificar os forks e depois `executa` do
PR-1). A seção "Docs" aponta para este arquivo e para o dossiê novo. `autorizacao` não muda.

## 10. Invariantes (cada uma vira teste)

1. `ISS_LIMITE/ALIQUOTA_MAX_BP` = 500 de 2025-01-01 a 2032-12-31, e sem linha a partir de 2033-01-01.
2. Fator = 0 antes de 2029; 1000/2000/3000/4000 de 2029 a 2032; `IssExtintoError` a partir de 2033. Sem linha publicada em
   2029–2032 ⇒ `SemLinhaVigenteError`, nunca 0.
3. PUT do perfil fiscal em 2033 com `issAliquotaBp` ⇒ 400 com a mensagem nomeada (não o "Sem linha vigente" genérico); com `null` ⇒ 200.
4. O relatório do X7 soma o `vIss` do documento em qualquer ano (sem fator).
5. Simples com retenção: o fator nunca se aplica sobre o % do Anexo (sem dupla redução).
6. Piso lido por vigência; linha `DRAFT` ⇒ 400 nomeado na apuração do Simples com benefício (F-ISS-4 a).
7. IBS 2029–2032 sem linha `PUBLISHED` ⇒ conferência pulada com aviso (herdado do F-IBS-11 a).
