# BE-INCR-TAX-ASSESSMENT-PERIODOS — BRIEF (períodos esperados do ano, por família)

> Sessão: `sessao-planejamento`. **Sem código, sem "executa".**
> **Autorização:** dono, chat, 2026-10-08 — "insumo ausente §5 de docs/accounting/FE-INCR-TAX-ASSESSMENT-brief.md
> (PR #585). Este pedido autoriza só o BRIEF, sem código e sem 'executa'." Cobre exatamente este item (rota de leitura
> que fecha o §5 do BRIEF do FE). Código exige nova autorização.

## 0. Problema e insumos (fato consumado — lidos nesta sessão)

A grade do ano (FE-INCR-TAX-ASSESSMENT PR-1, F-3 a) não sabe, antes da 1ª prévia, quais períodos existem: hoje isso
só aparece como 400/409 na prévia (FE BRIEF §5). Toda regra abaixo **já existe** no código; este incremento só a expõe.

| Regra | Onde vive (código) | Artefato de origem |
|---|---|---|
| Forma efetiva: `forma ?? (REAL\|PRESUMIDO ? 'TRIMESTRAL' : null)` | `CompanyFiscalProfileService.ts:427` `formaEfetiva` | X7 item 1 (D2, F-X7-5 a); Fase B item 11 |
| Txx exige TRIMESTRAL, A01..A12+A00 exige ANUAL | `TaxAssessmentService.ts:713-716` | `BE-INCR-TAX-ASSESSMENT-B-brief.md` item 11 |
| SIMPLES/MEI ⇒ IRPJ/CSLL no DAS (400) | `TaxAssessmentService.ts:709` | ADR-INCR-TAX-ASSESSMENT D12 |
| Perfil ausente ⇒ 400 | `TaxAssessmentService.ts:708` | `BE-INCR-TAX-ASSESSMENT-A-brief.md` item 13 |
| Trimestres em atividade | `models/taxAssessmentCalc.ts:84` `trimestresEmAtividade` | F-TA-4 b (A-brief) |
| Meses em atividade (forma anual) | `models/taxAssessmentCalcAnual.ts:70` `mesesEmAtividade` | F-TA-4 b; Fase B PR-3 (datas travam) |
| PIS/Cofins: modalidade pelo regime; SIMPLES/MEI ⇒ 400 | `models/pisCofinsCalc.ts:122` `modalidadeDoRegime` | ADR-INCR-PIS-COFINS D2 / F-X8-3 a |
| PIS/Cofins sem linha vigente ⇒ revogado (a partir de 2027-01) | `models/pisCofinsCalc.ts:132` `parametrosDoMes` | ADR-INCR-PIS-COFINS D9; LC 214 |
| Simples: apuração por `competencia` YYYY-MM, `inicioAtividade` | `models/simplesCalc.ts` (`rbt12`), `routes/simples.ts` | ADR-SIMPLES-NACIONAL-CALCULO; `BE-INCR-SIMPLES-NACIONAL-brief.md` |
| Estado CONFIRMED/SUPERSEDED (X7/X8) | `TaxAssessment.status`; `GET /tax-assessments` | X7 item 17 |
| Estado CONFIRMED/SUPERSEDED (Simples) | `schema.prisma` ~l.2587 (`status`, por `competencia`) | X14 BRIEF |

## 1. Checklist de comportamentos

1. **Rota** `GET /api/accounting/tax-assessments/periodos?unitId&anoCalendario` [F-P1] — leitura pura, sem efeito.
2. **Policy:** `canReadTaxAssessment` (mesma régua da lista, X7 item 17); 403 sem permissão; escopo = `AccountingScope`.
3. **DTO Zod `.strict()`** da query: `unitId` string não vazia, `anoCalendario` int 2000..2100; chave extra ⇒ 400.
4. **Família X7 (IRPJ/CSLL)** — resolve o perfil do ano (`companyProfileRepo.findByYear`):
   - perfil ausente ⇒ `apuravel:false, motivo:'PERFIL_AUSENTE'`, `periodos:[]` (A-brief item 13);
   - regime SIMPLES/MEI ⇒ `motivo:'REGIME_DAS'` (ADR D12); regime fora de PRESUMIDO/REAL ⇒ `motivo:'REGIME_SEM_APURACAO'`;
   - `formaEfetiva` TRIMESTRAL ⇒ esperados = T01..T04; ANUAL ⇒ A01..A12 + A00 (B-brief item 11); devolve `forma`.
   - Atividade: TRIMESTRAL via `trimestresEmAtividade`, ANUAL via `mesesEmAtividade` (A00 em atividade se ≥1 mês) [F-P3].
5. **Família X8 (PIS/Cofins)** — M01..M12: regime por `modalidadeDoRegime` (SIMPLES/MEI ⇒ `motivo:'REGIME_DAS'`);
   mês sem linha vigente em `parametrosDoMes` ⇒ estado `REVOGADO` (motivo citando a fonte de revogação, D9) — sem
   reescrever a regra: a função é chamada e o `ValidationError` traduzido. Atividade por `mesesEmAtividade`.
   Devolve `modalidade`.
6. **Família Simples** [F-P2] — competências YYYY-01..12 só se regime SIMPLES (MEI: `motivo:'REGIME_MEI'`, fora do X14
   salvo o BRIEF do X14 dizer o contrário); demais regimes ⇒ `motivo:'REGIME_NAO_SIMPLES'`; atividade pelo início do
   perfil (`inicioAtividade` do X14).
7. **Estado por período** (por tributo, X7/X8 ⇒ IRPJ, CSLL / PIS, COFINS): `SEM_APURACAO` | `CONFIRMED` (existe viva) |
   `SO_SUPERSEDED` (só versões substituídas) | `FORA_DA_ATIVIDADE` | `REVOGADO` (só X8). Fonte: 1 consulta do
   repositório por família (lista do ano já existente, X7 item 17; repo do Simples por `competencia`) — **sem N+1**.
8. **A pagar das confirmadas** [F-P4 a]: `aPagarCents` (string) + `id` da viva no estado `CONFIRMED`.
9. **Nenhuma regra nova:** o Service chama as funções puras; teste que falha se o Service reimplementar
   (asserção de equivalência: mesma entrada ⇒ mesma lista que `trimestresEmAtividade`/`mesesEmAtividade`).
10. **Cadeia:** Route (`routes/taxAssessments.ts`, registrar `/periodos` **antes** de `/:id`) → Controller
    (`taxAssessmentController.ts`, handler `listPeriodos`) → `TaxAssessmentPeriodosService` (novo, só leitura;
    ou método no `TaxAssessmentService` — decisão do implementador pela regra de tamanho do Contrato) → repositórios
    existentes (`ITaxAssessmentRepository`, perfil, Simples) → Prisma. Factory: wiring na factory existente do X7.
11. **Testes:** unidade das funções puras já cobertas (`taxAssessmentCalc*.test.ts`, `pisCofinsCalc.test.ts`) +
    unidade do Service com repo fake (perfil ausente, SIMPLES, TRIMESTRAL, ANUAL, início em maio, encerramento em
    agosto, ano 2027 ⇒ X8 REVOGADO, CONFIRMED/SO_SUPERSEDED) + **integração da rota** (`npm run test:integration`,
    403/400/200 e ordem da rota vs `/:id`).
12. **Gates:** `dtoShapeSnapshot` (query + resposta), openapi (`docs.paths.ts` + `public/openapi.json`, guard de
    path-count +1), `tsc --noEmit`. Sem eventType novo (leitura) ⇒ allowlist do `auditCanonical.ts` intocada.

## 2. Contratos (esboço)

```ts
const TaxAssessmentPeriodosQuerySchema = z.object({
  unitId: z.string().min(1),
  anoCalendario: z.coerce.number().int().min(2000).max(2100),
}).strict();

type EstadoPeriodo = 'SEM_APURACAO' | 'CONFIRMED' | 'SO_SUPERSEDED' | 'FORA_DA_ATIVIDADE' | 'REVOGADO';
type MotivoNaoApuravel = 'PERFIL_AUSENTE' | 'REGIME_DAS' | 'REGIME_MEI' | 'REGIME_NAO_SIMPLES' | 'REGIME_SEM_APURACAO';

interface PeriodoEsperado {
  periodo: string;                       // T01..T04 | A01..A12 | A00 | M01..M12 | YYYY-MM
  tributos: Record<string, {             // IRPJ, CSLL | PIS, COFINS | DAS
    estado: EstadoPeriodo;
    id?: string; aPagarCents?: string;   // estado CONFIRMED (F-P4 a)
  }>;
  motivo?: string;                       // texto do BE (ex.: fonte da revogação)
}
interface FamiliaPeriodos {
  familia: 'X7' | 'X8' | 'SIMPLES';
  apuravel: boolean;
  motivo?: MotivoNaoApuravel;
  forma?: 'TRIMESTRAL' | 'ANUAL';        // X7
  modalidade?: 'CUMULATIVO' | 'NAO_CUMULATIVO'; // X8
  periodos: PeriodoEsperado[];
}
interface TaxAssessmentPeriodosView { anoCalendario: number; regime: string | null; familias: FamiliaPeriodos[] }
```

## 3. Forks — ratificados 08/10 (questionário, respostas literais na coluna Status)

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-P1** Caminho da rota | (a) `GET /tax-assessments/periodos` · (b) `GET /tax-assessments/calendario` · (c) `GET /company-fiscal-profile/:ano/periodos` | (a): mesma montagem/policy da lista; o FE já consome esse prefixo | ✅ "/tax-assessments/periodos (Recommended)" |
| **F-P2** Simples entra já | (a) sim, 3 famílias · (b) só X7+X8; Simples quando o PR-4 do FE chegar | (a): o perfil já decide o regime; sem o Simples a grade de um optante fica vazia sem motivo | ✅ "Sim, 3 famílias (Recommended)" |
| **F-P3** Fora da atividade | (a) estado `FORA_DA_ATIVIDADE` na lista · (b) omitido | (a): a grade mostra a célula desabilitada com motivo, em vez de buraco ambíguo | ✅ "Estado FORA_DA_ATIVIDADE (Recommended)" |
| **F-P4** A pagar das confirmadas | (a) incluir `id`+`aPagarCents` · (b) só estado; FE faz 2ª chamada à lista | (b): a lista do ano já existe e traz memória/avisos; duplicar campo cria 2 fontes do mesmo dado | ✅ **divergente** "Sim, id + aPagarCents" — item 8 entra; grade monta com 1 chamada |

## 4. Pendente de validação externa
- Nenhuma regra nova. O comportamento de MEI na família Simples segue o que o X14 BRIEF/ADR já diz; se ele não
  disser, o item 6 fica com `REGIME_MEI` sem períodos até decisão.

## 5. Insumos ausentes
- Não li o `BE-INCR-SIMPLES-NACIONAL-brief.md` inteiro: o nome exato do campo de início de atividade usado pelo
  Simples no perfil e o tratamento do MEI ficam a confirmar pelo implementador na leitura do BRIEF do X14.

## 6. Achados fora de escopo
- Nenhum.
