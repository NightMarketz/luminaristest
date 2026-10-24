# FE-INCR-PERFIL-FISCAL-PRESUMIDO — BRIEF

> Sessão de planejamento, 21/10/2026. Nó: [X7](../plano/nos/X7.md) (pendência "texto de ajuda do item 11 do
> PRESUMIDO-16 ausente no FE"). Só FE: o BE está todo em main (#560). Forks F-PP-1..3 **ratificados 21/10**; código exige 'executa'.

## Contexto fixo

- **Item:** seção do perfil fiscal do ano (`CompanyFiscalProfile`) que mostra e edita `prestadoraExclusivaServicos`
  e `declaraNaoProfissaoRegulamentada`, com o texto de ajuda do item 11 de
  [`BE-INCR-TAX-PRESUMIDO-16-brief.md`](BE-INCR-TAX-PRESUMIDO-16-brief.md) (linhas 71–73).
- **Autorização:** dono, chat, 2026-10-21: "a — planeja a seção Presumido do perfil fiscal" (resposta à lacuna
  levantada na sessão de feature do X7: o campo não existe no FE). Cobre o BRIEF; não cobre código.
- **Insumos (fato consumado):**
  - DTO `server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts:111-112` (os 2 booleans, default `false`) e
    `:190-196` (refine: `PRESUMIDO` + flag sem confirmação ⇒ 400 no path `declaraNaoProfissaoRegulamentada`, cita
    Lei 9.250/1995 art. 40 p.ú.).
  - Trava: `CompanyFiscalProfileService.ts:465-479` — com `formaApuracaoTravadaEm`, trocar qualquer um dos dois ⇒
    400 `FORMA_TRAVADA: …`.
  - Cálculo: `taxAssessmentCalc.ts:416-419` (sem confirmação ⇒ 400 na apuração).
  - Auditoria: `auditCanonical.ts:190-192` (os 2 campos já estão na allowlist; nenhum evento novo).
  - FE: `my-app/lib/services/companyFiscalProfile.service.ts` (`get`/`put`; tipos com os 2 campos);
    `my-app/features/accounting/lib/companyFiscalProfileForm.ts` (padrão "PUT = perfil lido com só N campos trocados",
    D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS lacuna 1); `MeiEnquadramentoSection.tsx` (exemplar de seção por ano na aba
    `perfil-fiscal`, `AccountingView.tsx:525-530`).
- **Vizinhos:** consome o contrato GET/PUT do perfil (BE, sem mudança). Consumido por `TaxAssessmentPanel` (só lê).

## Checklist (comportamentos)

1. **Seção nova** `PresumidoServicosSection` na aba `perfil-fiscal`, abaixo de `MeiEnquadramentoSection`, com seletor
   de ano igual ao do MEI. Carrega `companyFiscalProfileService.get(ano, unitId)`; 404 `company_fiscal_profile_missing`
   ⇒ mesma mensagem `simples.semPerfilAno`. Escopo de regime: **F-PP-1**.
2. **Checkbox `prestadoraExclusivaServicos`** — rótulo + ajuda curta citando IN RFB 1.700/2017 art. 215 § 10 (fonte:
   `taxAssessmentCalc.ts:402`, `F_215_10`).
3. **Checkbox `declaraNaoProfissaoRegulamentada`**, visível/habilitado conforme **F-PP-2**, com o **texto de ajuda do
   item 11**: a empresa não é sociedade de profissão legalmente regulamentada nem presta serviço hospitalar ou de
   transporte (Lei 9.250/1995 art. 40 parágrafo único); o sistema não verifica a profissão — a declaração é
   responsabilidade da empresa e do contador. Fonte: BRIEF PRESUMIDO-16 item 11 + mensagem do refine do DTO.
4. **Validação no cliente** espelhando o refine: `PRESUMIDO` + flag ligada + confirmação desligada ⇒ não envia, mostra
   o erro com a mesma citação (função pura em `companyFiscalProfileForm.ts`, ao lado de `toUpsertComEnquadramentoMei`).
5. **Salvar** = PUT do perfil lido com só os 2 campos trocados (função pura `toUpsertComPresumidoServicos`; reaproveita
   `toEcd`/`toEcf` e os erros `ecdIncompleta`/`ecfIncompleta`). Ao desligar a flag: **F-PP-3**.
6. **Trava:** com `formaApuracaoTravadaEm` no GET, os 2 checkboxes ficam desabilitados com aviso "forma travada desde
   {{data}}" (espelha `assertFormaNaoTravada`; `formaApuracaoTravadaEm` já está em `CompanyFiscalProfileView`).
7. **Erros do PUT** exibidos pela mensagem do BE (`resolveError`, como a seção do MEI) — inclui o 400 do refine e o
   `FORMA_TRAVADA`.
8. **i18n pt/en** sob `accounting.json` (`fiscalProfile.presumido.*`), paridade checada pelo gate.
9. **Testes vitest:** função pura (itens 4, 5, F-PP-3) e seção (render do texto de ajuda com "9.250", desabilitado na
   trava, erro do PUT exibido), no padrão de `MeiEnquadramentoSection.test.tsx` (shim de `React` global).
10. **Gates:** `cd my-app && npx tsc --noEmit`, `npm run test:types`, paridade i18n, `check:arch`. Sem rota/DTO novo no
    BE ⇒ sem snapshot nem openapi.

## Contratos (esboço)

```ts
// my-app/features/accounting/lib/companyFiscalProfileForm.ts
export interface PresumidoServicosForm { prestadoraExclusivaServicos: boolean; declaraNaoProfissaoRegulamentada: boolean }
export type PresumidoServicosError = 'ecdIncompleta' | 'ecfIncompleta' | 'regimeNaoSuportado' | 'confirmacaoAusente';
export function toPresumidoServicosForm(v: CompanyFiscalProfileView): PresumidoServicosForm;
export function toUpsertComPresumidoServicos(unitId: string, v: CompanyFiscalProfileView, f: PresumidoServicosForm):
  { ok: true; body: UpsertCompanyFiscalProfileInput } | { ok: false; error: PresumidoServicosError };
```
Saída: `PUT /…/company-fiscal-profile/:ano` com o corpo de hoje (`UpsertCompanyFiscalProfileInput`, gerado do snapshot) —
sem mudança de contrato.

## Forks — ratificados (dono, chat, 2026-10-21, questionário: F-PP-1 → b, F-PP-2 → b, F-PP-3 → a, todos na recomendação)

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-PP-1** Regimes da seção | (a) só `PRESUMIDO` · (b) `PRESUMIDO` e `REAL` (a flag também vale para a estimativa do Real, F-TB-5 b; o BRIEF PRESUMIDO-16 l.120-121 diz que a exclusão da Lei 9.250 cabe lá também, mas o refine do BE só exige a confirmação no Presumido) | **(b)** — a flag do Real hoje também não tem tela; no Real a confirmação aparece mas não é exigida pelo BE (exigir no Real é mudança de BE, fora deste FE — ver Achados) |
| **F-PP-2** Confirmação sem a flag | (a) checkbox sempre visível · (b) só aparece/habilita com a flag ligada | **(b)** — o refine só a exige com a flag; menos ruído |
| **F-PP-3** Desligar a flag | (a) zera a confirmação junto · (b) preserva o valor gravado | **(a)** — confirmação sem flag não tem efeito e evita trilha com declaração órfã |

## Pendente de validação externa

- Redação final do texto de ajuda (contador): o conteúdo legal está citado; a forma é do contador se o dono quiser.

## Insumos ausentes

- Não há tela que **crie** o perfil do ano (só as seções que editam um perfil existente); a seção herda essa limitação.

## Achados fora de escopo

- Exigir a confirmação também no REAL (BE: refine + `taxAssessmentCalc`) — nota do PRESUMIDO-16 l.120-121.
- Tela de cadastro do perfil fiscal do ano.
