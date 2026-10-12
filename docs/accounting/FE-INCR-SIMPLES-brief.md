# FE-INCR-SIMPLES — telas do Simples Nacional (ME/EPP + MEI) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização:** dono, chat, 2026-10-10, questionário de [[D-2026-10-10-X14-PROXIMOS-PASSOS]] D4 *"(a) Planejar o
> BRIEF agora"* (só o BRIEF, sem `executa`); dono, chat, 2026-10-12: *"Pode fazer o brief"*; no mesmo dia, questionário
> sobre a sobreposição com o FE-INCR-TAX-ASSESSMENT §3.1: *"BRIEF completo novo"*. **Sem "executa"**: cada PR começa
> com o "executa" do dono.
> **Base:** `origin/main` `9f6477d8` (fold do SIMEI-TAC-12).
> **Nós vizinhos:** [[X14]] (BE, done), [[SIMEI-TAC-12]] (BE, done), [[X14-CAIXA]] (pontilhada: emenda depois),
> FE-INCR-TAX-ASSESSMENT (aba "Apuração", PR-1 mergeado no #631).

> **Relação com o FE-INCR-TAX-ASSESSMENT §3.1.** Aquele BRIEF já detalhou o PR-4 "Simples" da aba Apuração (ME/EPP),
> com os forks P4-1..P4-7 ratificados em 08/10. Este BRIEF **reescreve o escopo inteiro** (pedido do dono, 12/10) e
> **herda aquelas decisões como fato consumado**: nenhum P4-n é reaberto aqui. O que é novo: MEI (SIMEI com TAC e
> Anexo VII), DASN-SIMEI, DEFIS, alíquotas sugeridas, severidade dos alertas e campos MEI do perfil fiscal. Pelo **F-FS-1 (a)**
> (ratificado 12/10), **este BRIEF substitui o §3.1**.

## 0. Fatos consumados (lidos nesta sessão em `origin/main` `9f6477d8`)

| Fato | Fonte |
|---|---|
| 14 rotas em `/api/accounting/simples`: `PUT historico/:competencia`, `PUT segregacao/:competencia`, `POST/GET/PATCH/DELETE parcerias`, `POST apuracoes/:competencia/calcular`, `GET apuracoes/:competencia`, `PUT apuracoes/:competencia/das`, `GET aliquotas/:competencia`, `GET/PUT dasn-simei/:ano`, `GET/PUT defis/:ano` | `server/src/routes/simples.ts:26-41` |
| **Não existe** `GET historico/:competencia` nem `GET segregacao/:competencia` (pré-requisito do P4-3 → b) | idem |
| `calcular`/`obter` devolvem `ApuracaoSimples` (ME/EPP) **ou** `ApuracaoMei`, conforme o perfil do ano | `SimplesApuracaoService.ts:182-189` |
| `ApuracaoMei` = `ApuracaoSimei` (`salarioMinimoCents`, `transportadorCargas`, `cppAliquotaBp`, `tributos` CPP/ICMS/ISS em centavos, `tributosMilesimos` CBS/IBS em milésimos — vazio antes de 2027, `totalCalculadoCents`, `tabela[]`) + `enquadramento`, `receitaPaCents`, `receitaAcumuladaAnoCents`, `limiteAnoCents`, `dasOficial`, `divergenciaCents`, `alertas` | `SimplesApuracaoService.ts:72-81`; `simplesCalc.ts:486-507` |
| O DAS do MEI registra pela mesma `PUT …/das` (regime MEI) | `SimplesApuracaoService.ts:204` |
| SIMEI exige `meiContribuinteIcms`/`meiContribuinteIss` declarados no perfil do ano (400 sem eles); o perfil tem também `meiTransportadorCargas` e `meiOcupacoes` | `SimplesApuracaoService.ts:480-483`; `CompanyFiscalProfileDto.ts:119-121,166` |
| **O my-app não tem nenhum desses 4 campos MEI** (grep vazio fora de `.gen.ts`) | `my-app/features/accounting/**` |
| `aliquotas` no MEI ⇒ 400 ("valores fixos pelo SIMEI") | `SimplesApuracaoService.ts:718-722` |
| `AliquotasSimples`: sugestão por atividade (alíquota efetiva, retenção de ISS, benefício municipal, `pTotTribSNSugerido`, crédito do adquirente ICMS/IBS/CBS), `regra`, `avisos[]` fixos | `SimplesApuracaoService.ts:88-115` |
| Alertas: 16 códigos (inclui `MEI_ENQUADRAMENTO_DIVERGE`, `MEI_TAC_COM_OCUPACAO_A`, `MEI_OCUPACAO_EXCLUIDA`, `BENEFICIO_MUNICIPAL_*`, `ISS_VALOR_FIXO_MUNICIPAL`) com `severity` INFO/WARNING e `motivoInformativo` opcional | `SimplesDto.ts:87-120` |
| Bloqueantes do registro do DAS: `TIEOUT_DIVERGENTE`, `RBT12_INCOMPLETO`, `ATIVIDADE_SEM_ANEXO` | `SimplesApuracaoService.ts:61` |
| DASN-SIMEI: `GET` devolve `SimplesDasnSimeiView` (prazo, receita total, receita ICMS, `mesesSemSubrazao`, `digitado`); `PUT` grava só `contratouEmpregado` | `SimplesDto.ts:178-222` |
| DEFIS: `GET` devolve `SimplesDefisView` (prazo, `mesesApurados`, lucro contábil, estoques, `digitado`); `PUT` grava empregados início/fim, ganhos de renda variável, sócios (`contactId`, rendimentos, participação bp ≤ 10000 somada, IRRF) | `SimplesDto.ts:188-230` |
| Aba "Apuração" existe (`TaxAssessmentPanel.tsx`, 271 linhas), só leitura X7/X8; "Simples (PR-4) e MIT (PR-5) ficam fora" | `TaxAssessmentPanel.tsx:17`; montada em `AccountingView.tsx` |
| Policy é do BE (`canReadTaxAssessment`/`canManageTaxAssessment`) | FE-INCR-TAX-ASSESSMENT §3.1 item 11 |

Decisões herdadas (ratificadas 08/10, não reabertas): P4-1 (a) grade troca de colunas pelo regime · P4-2 (a) 12 GETs
com concorrência limitada · P4-3 (b) GET de histórico/segregação no BE antes · P4-4 (a) parcerias como sub-painel da
aba · P4-5 (a) PDF do DAS como `SourceDocument` · P4-6 (b) o FE espera o SIMEI do BE (**já satisfeito**: X14 PR-4 em
`main`) · P4-7 (a) só o DAS vigente. Também F-4 (prévia obrigatória antes de gravar) e F-6 (formulários completos).

## 1. Divisão em PRs — F-FS-2 (a) ratificado

| PR | Conteúdo | Itens | Espera |
|---|---|---|---|
| **PR-A** | Grade do ano por regime + detalhe da competência (leitura) + calcular, ME/EPP **e** MEI; campos MEI do perfil fiscal | 1–8 | nada |
| **PR-B** | Registro do DAS oficial (ME/EPP e MEI), parcerias | 9–10 | PR-A |
| **PR-C** | Histórico pré-adoção e segregação manual | 11–12 | PR-A + **GET no BE** (P4-3 b) |
| **PR-D** | Declarações anuais: DASN-SIMEI e DEFIS; alíquotas sugeridas do mês | 13–15 | PR-A |

## 2. Checklist de comportamentos (cada um testável isoladamente no vitest)

### PR-A — leitura
1. **Regime do ano decide a grade** [P4-1]: perfil SIMPLES → 12 linhas × coluna **DAS** (calculado, oficial,
   divergência, status); MEI → mesma forma, com coluna **DAS-MEI**; PRESUMIDO/REAL → grade X7/X8 inalterada. Em ano
   SIMPLES/MEI a tela não chama prévia do X7/X8. Sem perfil do ano → estado "cadastre o perfil fiscal" com atalho.
2. **Carga do ano** [P4-2]: 12 `GET /simples/apuracoes/{AAAA-MM}?unitId`, concorrência limitada (F-FS-3); célula com
   estado *carregando / sem perfil (400) / não regulamentada (422 `SIMPLES_REGRA_NAO_REGULAMENTADA`) / calculado /
   DAS registrado / divergente / erro*; selo para bloqueante, para `provisaoPendente` e para alerta WARNING.
3. **Discriminação da resposta**: `regime === 'MEI'` ⇒ `ApuracaoMei`, senão `ApuracaoSimples` — type guard testado
   com as duas fixtures.
4. **Detalhe ME/EPP** — conteúdo do item 3 do §3.1 do FE-INCR-TAX-ASSESSMENT (RBT12 + janela, atividades com
   anexo/faixa/alíquotas/fator R/tributos, espelho do PGDAS-D, total, DAS oficial e divergência, tie-out, `tabela[]`).
5. **Detalhe MEI**: salário-mínimo usado, CPP (alíquota `cppAliquotaBp` em % — 5% comum, 12% transportador),
   ICMS/ISS fixos, **CBS/IBS a partir de 2027** exibidos a partir de milésimos sem arredondar além do que o BE já
   arredondou (F-FS-4), total, enquadramento ICMS/ISS, selo "transportador autônomo de cargas" quando
   `transportadorCargas`, receita do PA, **acumulado do ano × limite** (barra), DAS oficial e divergência, `tabela[]`.
6. **Alertas com severidade**: lista por `severity` (WARNING antes de INFO); `codigo` traduzido (16 chaves i18n) +
   `detalhe` do BE verbatim; `motivoInformativo` como etiqueta; os 3 bloqueantes marcados. Fonte do texto = BE (a tela
   não decide regra fiscal).
7. **Calcular** (`POST …/calcular`, body `{unitId}`): botão no detalhe; resultado substitui a leitura; nada gravado.
8. **Campos MEI do perfil fiscal** (F-FS-5): no `FiscalProfilePanel`, quando `regime = MEI`, mostrar e enviar
   `meiContribuinteIcms`, `meiContribuinteIss`, `meiTransportadorCargas`, `meiOcupacoes` (tipos do `.gen`); o
   detalhe MEI que receber o 400 "Declare no perfil fiscal…" mostra atalho para esses campos.

### PR-B — escrita do mês
9. **Registrar o DAS oficial** (`PUT …/das`) — item 5 do §3.1 do FE-INCR-TAX-ASSESSMENT, valendo também para o MEI
   (mesma rota): prévia obrigatória [F-4] (calcular na sessão sem bloqueante), calculado × oficial lado a lado,
   vencimento date-only com validação de calendário (sugestão dia 20 do mês seguinte, só sugestão — LC 123 art. 21
   III; Res. CGSN 140 art. 40; prorrogação por calamidade do art. 40-A é exceção que a sugestão não cobre), PDF como
   `SourceDocument` [P4-5]; 409 ⇒ "as entradas mudaram, calcule de novo" + recalcula; 400 com `details.alertas` ⇒
   lista os bloqueantes; re-registro avisa a substituição [P4-7].
10. **Parcerias salão-parceiro** — item 8 do §3.1 (sub-painel da aba, só em ano SIMPLES [P4-4]); some em ano MEI.

### PR-C — entradas que dependem do GET novo
11. **Histórico pré-adoção** (`PUT /simples/historico/{competencia}`) pré-preenchido pelo GET do BE [P4-3 b];
    atalho a partir de `RBT12_INCOMPLETO`.
12. **Segregação manual** (`PUT /simples/segregacao/{competencia}`) — item 7 do §3.1, pré-preenchida pelo GET do BE.

### PR-D — anuais e alíquotas
13. **DASN-SIMEI** (ano MEI): `GET /simples/dasn-simei/{ano}?unitId` mostra prazo, receita total, receita sujeita a
    ICMS, `mesesSemSubrazao` como aviso; formulário de `contratouEmpregado` → `PUT`.
14. **DEFIS** (ano SIMPLES): `GET /simples/defis/{ano}?unitId` mostra prazo, meses apurados, lucro contábil e
    estoques (só leitura, do razão); formulário: empregados início/fim, ganhos de renda variável, sócios (contato
    canônico, rendimentos isentos/tributáveis, participação % → bp, IRRF); a validação da soma das participações é o **F-FS-8** (o manual exige = 100%,
    o BE aceita ≤ 100%). **Só anos ≤ 2026:** a partir de 2027 a DEFIS muda (LC 123 art. 25, red. LC 214) e o BE responde 400
    (`SimplesDeclaracaoService.ts:29,128`); a tela mostra esse estado com o texto do BE em vez do formulário.
    Prazo exibido = o do BE (31/03 do ano seguinte — Res. CGSN 140 art. 72 § 1º).
15. **Alíquotas sugeridas do mês** (ano SIMPLES): `GET /simples/aliquotas/{competencia}?unitId` — por atividade:
    alíquota efetiva, retenção de ISS, benefício municipal, `pTotTribSNSugerido`, crédito do adquirente; `regra` e
    `avisos[]` do BE sempre visíveis com selo **"Sugestão"** (`sugestao: true`). Em ano MEI não aparece (o BE dá 400).

### Gates (todos os PRs)
16. Tipos de entrada de `@/types/contracts/accounting/SimplesDto.gen` (+ `CompanyFiscalProfileDto.gen` no item 8);
    respostas à mão espelhando `ApuracaoSimples`/`ApuracaoMei`/`AliquotasSimples`/views (decisão 9 do contrato FE);
    403 esconde ações de gerir; i18n pt/en com namespace no `ns` no mesmo PR; `neutral-*`/`rounded-2xl`; reuso de
    `Modal`/`GenericTable`; date-only sem `toLocaleDateString` (shift UTC); vitest por item; `npm run test:types`;
    build de produção (tela atrás de `withAuth`).

## 3. Contratos (esboço)

```ts
// Respostas — à mão, espelho do BE (server/src/features/accounting/services/SimplesApuracaoService.ts,
// models/simplesCalc.ts, dtos/SimplesDto.ts). ApuracaoSimples: ver FE-INCR-TAX-ASSESSMENT §3.1 "Contratos do PR-4",
// trocando `alertas` por AlertaSimples abaixo.
type Severidade = 'INFO' | 'WARNING';
interface AlertaSimples { codigo: CodigoAlertaSimples; detalhe: string; severity: Severidade;
  motivoInformativo?: 'DOCUMENTO_MUNICIPAL_TRANSIÇÃO' | 'REGIME_CAIXA' }
interface ApuracaoMei {
  competencia: string; regime: 'MEI'; salarioMinimoCents: number; transportadorCargas: boolean; cppAliquotaBp: number;
  tributos: Partial<Record<'CPP' | 'ICMS' | 'ISS', number>>;          // centavos
  tributosMilesimos: Partial<Record<'CBS' | 'IBS', number>>;          // milésimos de real; {} antes de 2027
  totalCalculadoCents: number; tabela: Array<{ legalParameterId: string; fonte: string; vigenteDesde: string }>;
  enquadramento: { contribuinteIcms: boolean; contribuinteIss: boolean };
  receitaPaCents: number; receitaAcumuladaAnoCents: number; limiteAnoCents: number;
  dasOficial: { id: string; numeroDocumento: string; valorCents: number; vencimento: string; provisaoPendente: boolean } | null;
  divergenciaCents: number | null; alertas: AlertaSimples[];
}
type Apuracao = ApuracaoSimples | ApuracaoMei;
const ehMei = (a: Apuracao): a is ApuracaoMei => a.regime === 'MEI';

interface AliquotasSimples { competencia: string; mesReferencia: string; sugestao: true;
  regra: 'INICIO_ATIVIDADE' | 'FAIXA_MES_ANTERIOR' | 'FAIXA_MES_PRESTACAO'; periodoApuracao: string | null;
  rbt12Cents: number | null; janelaRbt12: { de: string; ate: string; regra: string } | null;
  atividades: Array<{ anexo: string | null; natureza: 'SERVICO' | 'REVENDA' | 'LOCACAO_MOVEL'; cTribNac: string | null;
    faixa: number | null; fatorR: string | null; aliquotaEfetiva: string | null; issRetencao: string | null;
    beneficioMunicipal: { legislacao: string; tipo: string; pisoAplicado: boolean; excecaoPiso: boolean } | null;
    pTotTribSNSugerido: string | null; creditoAdquirente: { ICMS: string | null; IBS: string | null; CBS: string | null } | null }>;
  avisos: string[]; alertas: AlertaSimples[] }

// Views anuais: copiar SimplesDasnSimeiView e SimplesDefisView de dtos/SimplesDto.ts:215-230.
// Entradas (gerados): SimplesDasRegistroInput, SimplesDasnUpsertInput, SimplesDefisUpsertInput,
//   SimplesHistoricoUpsertInput, SimplesSegregacaoUpsertInput, SalaoParceriaContratoInput/PatchInput, SimplesUnitQueryInput.

type CelulaSimples = { competencia: string;
  estado: 'carregando' | 'semPerfil' | 'naoRegulamentada' | 'calculado' | 'registrado' | 'erro';
  apuracao?: Apuracao; bloqueante: boolean; divergente: boolean; warning: boolean };
```

## 4. Forks — RATIFICADOS (dono, chat, 2026-10-12, questionário — todos na recomendação)

| Fork | Caminhos | Recomendação → decisão |
|---|---|---|
| **F-FS-1** Documento que manda | (a) este BRIEF substitui o §3.1 do FE-INCR-TAX-ASSESSMENT: lá entra uma linha "superado por FE-INCR-SIMPLES-brief", e o PR-4 daquele nó sai da lista de fatias · (b) os dois valem; o §3.1 fica só para o ME/EPP e este para o resto · (c) este BRIEF vira uma emenda do §3.1 | **(a)**: um único documento por tela evita duas verdades; as decisões P4-n continuam valendo porque foram herdadas aqui  — ✅ ratificada |
| **F-FS-2** Fatiamento | (a) 4 PRs (A leitura · B escrita do mês · C histórico/segregação · D anuais/alíquotas) · (b) 2 PRs (ME/EPP · MEI+anuais) · (c) 1 PR | **(a)**: o PR-C é o único bloqueado (GET no BE); fatiar deixa A, B e D andarem  — ✅ ratificada |
| **F-FS-3** Concorrência da carga do ano | (a) 3 GETs simultâneos · (b) 6 · (c) serial | **(a)**: cada GET recalcula no BE (P4-2); 3 equilibra tempo × carga em SQLite  — ✅ ratificada |
| **F-FS-4** CBS/IBS em milésimos | (a) mostrar com 3 casas (R$ 0,000) como o BE devolve, e o total em centavos · (b) arredondar para centavos na tela | **(a)**: a tela não arredonda o que a lei não arredonda (F-TAC-7 a no BE); arredondar seria regra fiscal no FE  — ✅ ratificada |
| **F-FS-5** Campos MEI do perfil fiscal | (a) entram no PR-A deste nó (o SIMEI não calcula sem eles) · (b) nó próprio no perfil fiscal, antes do PR-A | **(a)**: sem eles o detalhe MEI só mostra 400; o formulário do perfil já existe e o shape vem do `.gen`  — ✅ ratificada |
| **F-FS-6** Onde ficam as declarações anuais | (a) cabeçalho do ano na aba Apuração (botões "DASN-SIMEI"/"DEFIS" conforme o regime) · (b) aba própria "Declarações" | **(a)**: mesma lógica do P4-4 (o dado nasce das apurações do ano)  — ✅ ratificada |
| **F-FS-7** X14-CAIXA | (a) nada agora; quando o regime de caixa existir, entra como emenda (aresta pontilhada) · (b) reservar já a coluna "base" na grade | **(a)**: D4 de [[D-2026-10-10-X14-PROXIMOS-PASSOS]] já diz que o caixa entra depois como emenda  — ✅ ratificada |
| **F-FS-8** Soma das participações na DEFIS — **RATIFICAÇÃO PENDENTE** | O Manual do PGDAS-D/DEFIS (versão 17/06/2025, sha `e73b2bfc7ede`, §9.4.3.1 itens 7.3 e 8) exige **soma = 100%**, contando sócios **mais cotas em tesouraria**; o BE (`SimplesDefisUpsertSchema`) aceita ≤ 100% e não tem o campo de tesouraria. (a) a tela só avisa quando a soma ≠ 100% e grava assim mesmo; a correção vai para o BE, numa frente própria (campo de tesouraria + regra = 100%) · (b) a tela bloqueia ≠ 100% sem o campo de tesouraria (quem tem cotas em tesouraria não consegue gravar) · (c) o PR-D espera a correção do BE | **(a)**: a tela não cria regra fiscal que o BE não tem; o aviso mostra o que o manual pede |

## 5. Pendente de validação externa

Nenhuma regra fiscal nova: a tela mostra e envia o que o BE decide; os textos de aviso vêm do BE. O oráculo do número
segue o gate humano X14-DAS (PGDAS-D para ME/EPP, PGMEI para MEI/TAC — D3 de [[D-2026-10-10-X14-PROXIMOS-PASSOS]]).

## 6. Insumos ausentes

- **BE:** `GET /simples/historico/{competencia}` e `GET /simples/segregacao/{competencia}` — pré-requisito do PR-C
  (P4-3 b). É frente de BE e exige autorização própria; este BRIEF não a planeja.
- Sem lista anual de apurações nem rota de versões substituídas (P4-2 c / P4-7 b não escolhidos).
- Componente canônico de seleção de contato (parceria, sócios da DEFIS) e de upload de `SourceDocument`: localizar
  na execução.
- Shape de `meiOcupacoes` no `.gen` (lista de ocupações do Anexo XI): confirmar na execução do item 8; a lista de
  ocupações vem do BE ou de `LegalParameter`? Não lido nesta sessão.

## 7. Achados fora de escopo

- **BE da DEFIS × manual (§9.4.3.1):** o DTO não tem *percentual em cotas em tesouraria* (item 8), *receita de exportação
  direta* (item 5) nem *via comercial exportadora* (item 6), e aceita soma das participações ≤ 100%, quando o manual
  exige = 100%. É uma frente de BE que exige autorização própria (ver F-FS-8).

- O PR-4 do FE-INCR-TAX-ASSESSMENT e este nó cobrem as mesmas telas: resolver pelo F-FS-1 e ajustar a nota do nó
  FE-INCR-TAX-ASSESSMENT (se houver) no fold.
- `ibsCbsInformar` sem vigência (achado §7 item 1 do BRIEF do X14): segue com o FE-INCR-DFE / X10b.
