# BE-INCR-SIMPLES-NACIONAL — apuração do Simples Nacional (ME/EPP + MEI) (BRIEF, nó X14)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Fork novo deste documento **não** se auto-ratifica.
> **Autorização (dono, chat, 2026-10-07):** *"mergeia e escreve o BRIEF do X14"* + *"Ja faz o brief de tudo nosso
> esforço é pra terminar o quanto antes a nossa sessão de contabilidade e fiscal"*. Cobre o BRIEF **inteiro** do X14
> (ME/EPP + MEI, todos os F-SN). **Não** cobre código: cada PR exige "executa".
> **Forks do PRE-ADR:** F-SN-0..13 ratificados em [`D-2026-10-07-SIMPLES-FORKS`](../plano/decisoes/D-2026-10-07-SIMPLES-FORKS.md);
> PRE-ADR [`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md`](../adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md) Accepted.
> **Regra do dono (07/10):** decide-se pela lei; **nada vai ao contador**. Onde a norma é silente, vale a regra
> explícita da nota de decisão (DAS oficial prevalece; DAS inteiro = dedução da receita; fato do cliente = cadastro).
> **Base:** `origin/main` `d224532c` (re-fetch 2026-10-07).
> **Escopo:** backend. FE é nó vizinho (`FE-INCR-SIMPLES`, a abrir).

## 0. Fatos consumados que este BRIEF respeita (lidos nesta sessão)

| Fato | Onde |
|---|---|
| `LegalParameter` — tabela de plataforma append-only (DRAFT → PUBLISHED → REVOKED, `supersedesId`, `fonte` obrigatória, vigência date-only) + lookup puro `linhaLegalVigente` | `prisma/schema.prisma:2411`; `features/legalParameters/models/legalParameter.ts` |
| Catálogo fechado `LEGAL_PARAMETER_TABELAS` + `TABELAS_MIGRADAS` (propor tabela não migrada ⇒ 400) | `legalParameter.ts:7-28` |
| `TaxAssessment` — apuração persistida, `CONFIRMED`/`SUPERSEDED`, `memoria` Json, `tabelaVersao`, `provisaoEntryId`, soft-delete; `tributo` String "para a onda 3 alargar" | `schema.prisma:2356`; F-X7-3 → (a) ratificado (D-2026-10-02-X7) |
| `CompanyFiscalProfile` por (PJ, ano), `regime` ∈ MEI/SIMPLES/PRESUMIDO/REAL | `schema.prisma:1453` (`@@unique([userId, anoCalendario])`) |
| Matriz de obrigações exclui PGDAS-D/DEFIS/DASN-SIMEI "até ter fonte" | `models/obrigacoesPorRegime.ts:6` |
| DPS: `opSimpNac` só 1 ou 3 (MEI fora); `pTotTribSN` digitado | `dtos/DpsPayloadDto.ts:38, 103` |
| Ponte de venda → razão | `features/accounting/sync/bridges/SaleSettlementBridge.ts` |
| MEI: valor fixo = 5% do limite mínimo do salário de contribuição + R$ 1 ICMS + R$ 5 ISS; limite R$ 81.000; DASN-SIMEI até o último dia de maio | Res. CGSN 140 arts. 100, 101 I "b", II, III; 109 (corpus, V) |

## 1. Divisão em PRs (cada um exige "executa" próprio, merge na ordem)

| PR | Conteúdo | Itens |
|---|---|---|
| **PR-1** | Tabelas de lei no `LegalParameter` + cálculo puro (sem persistência, sem rota nova) | 1–9 |
| **PR-2** | Entradas: histórico pré-adoção, folha declarada, segregação manual, parceria, opção IBS/CBS; subrazão fiscal de receita + tie-out | 10–16 |
| **PR-3** | Apuração ME/EPP persistida no `TaxAssessment`, rotas, registro do DAS oficial, provisão, matriz de obrigações | 17–24 |
| **PR-4** | MEI (SIMEI + DASN-SIMEI), DEFIS espelho, saídas para documentos (ISS retido, `pTotTribSN`, `opSimpNac=2`), conferência NFS-e × receita | 25–31 |

## 2. Checklist de comportamentos (cada um testável isoladamente)

### PR-1 — tabelas e cálculo puro
1. **Tabelas novas no catálogo** `LEGAL_PARAMETER_TABELAS` e em `TABELAS_MIGRADAS`: `SIMPLES_ANEXO_FAIXA`,
   `SIMPLES_ANEXO_REPARTICAO`, `SIMPLES_TETO_ISS`, `SIMPLES_ENQUADRAMENTO`, `SIMPLES_LIMITE`, `SIMEI_VALOR`,
   `SALARIO_MINIMO`. (F-SN-2 → b, implementado pelo canônico `LegalParameter`, não por model novo.)
2. **Carga inicial por migração gerada por script** (`scripts/gen-simples-anexos.mjs`) a partir do HTML do Planalto
   (LC 123 compilada; LC 214 art. 519 + Anexos XVIII–XXII): 5 anexos × 6 faixas × 7 vigências (2018–26, 2027–28, 2029,
   2030, 2031, 2032, 2033+). Cada linha: `fonte`, `fonteUrl`, `fonteSha256`, `vigenteDesde/Ate`, `discriminador` =
   ordinal da linha na fonte. Status `PUBLISHED`, `proposedById='migration'`.
3. **Teste de diff contra a fonte**: o teste regenera as linhas a partir do HTML (fixture commitada com sha) e compara
   com o que a migração grava — diff vazio. Contagens asseridas; soma da repartição = 100,00% por faixa; anomalia
   "14,93%" × "14,92537%" (Anexo XX) vira regra nominal do parser com teste. **Salvaguarda do F-SN-2 → b**: edição do
   admin continua possível (DRAFT → PUBLISHED com `motivo`), sempre com trilha de quem/quando.
4. **Enquadramento** (`SIMPLES_ENQUADRAMENTO`, F-SN-3 → a): linhas só com fonte — serviço de beleza (cTribNac 060101,
   060201, 060301) → III, sem fator R (Res. 140 art. 25 § 1º III "m"); revenda → I (inciso I); locação de bem móvel → III
   sem ISS (inciso VI). Atividade sem linha ⇒ erro `ATIVIDADE_SEM_ANEXO` (422) na apuração.
5. **RBT12** com janela por vigência: até 2026, 12 meses anteriores ao PA; 2027+, 12 meses antecedentes ao mês anterior
   (LC 214 art. 517); início de atividade (1º mês × 12, depois média × 12); RBT12 = 0 conta como R$ 1,00
   (LC 123 art. 18 §§ 1º, 1º-A, 2º; Res. 140 art. 21 p.ú., art. 22 §§ 2º–4º).
6. **Alíquota efetiva e repartição**: (RBT12 × nominal − PD) / RBT12; repartição por tributo; teto do ISS com
   transferência (a federais até 2026; a federais **e IBS** a partir de 2027 — art. 18 § 1º-B I, red. 2027);
   ICMS/ISS acima da 5ª faixa (art. 18 §§ 1º-A, 1º-B; Res. 140 art. 21 III). Aritmética em `Decimal`;
   **sem regra de arredondamento na norma** → arredonda só o valor final por tributo, half-up a centavo, e a
   apuração exibe a divergência contra o DAS oficial (regra silente nº 1 da nota).
7. **Fator R** (F-SN-4 → a): folha 12m / RBT12 ≥ 0,28 → III, senão V, com janela por vigência
   (art. 18 §§ 5º-J, 5º-K, 5º-M, 24–26; Res. 140 art. 26).
8. **Segregação** (F-SN-6): receitas do § 4º-A (monofásico, ST, ISS retido, ISS de outro município) removem a parcela
   do tributo correspondente (art. 18 §§ 4º-A, 12, 13; Res. 140 art. 25 § 7º).
9. **Exemplo numérico do PRE-ADR §7 vira teste**: RBT12 R$ 600.000; serviço R$ 50.000 → R$ 5.280,00 (10,56%), repartição
   2026 e 2027; revenda R$ 5.000 → R$ 359,50 sem segregar, R$ 303,78 com monofásico (2026).

### PR-2 — entradas e subrazão
10. **Histórico pré-adoção** (`SimplesHistoricoMensal`, model novo): receita mensal por unidade e, opcional, folha;
    `sourceDocumentId` do extrato. Sem 12 meses ⇒ alerta `RBT12_INCOMPLETO` e a apuração não confirma.
11. **Folha declarada** para fator R no mesmo model (campo `folhaCents`), até a folha da onda 4 existir.
12. **Segregação manual interina** (F-SN-6 → b): `SimplesSegregacaoManual` por competência (monofásico, ST, ISS retido,
    ISS de outro município), com alerta `SEGREGACAO_MANUAL`. Quando o X10a entregar o atributo do produto, a ponte
    preenche e o manual vira override explícito.
13. **Parceria** (F-SN-12 → b; Lei 12.592 art. 1º-A §§ 4º, 5º, 8º; LC 123 art. 13 § 1º-A, art. 18 § 4º V):
    model `SalaoParceriaContrato` (unidade, profissional, cota-parte do salão em bp, natureza da cota
    `ALUGUEL_BEM_MOVEL | GESTAO`, `homologadoEm` + sindicato, vigência, soft-delete). Sem homologação ⇒ contrato não
    produz efeito (§ 8º). Com contrato: só a cota do salão entra na receita bruta; cota `ALUGUEL_BEM_MOVEL` → Anexo III
    sem ISS (inciso VI); `GESTAO` → Anexo III. Ver fork **B-3**.
14. **Opção semestral IBS/CBS** (F-SN-11 → a): `CompanyFiscalProfile.ibsCbsOpcaoS1/S2` ∈ {DAS, REGULAR}, default DAS,
    só para ano ≥ 2027; REGULAR exclui IBS/CBS do DAS daquele semestre (LC 123 art. 13 §§ 9º–10).
15. **Subrazão fiscal de receita** (F-SN-5 → c): a `SaleSettlementBridge` grava `ReceitaFiscalLinha` por item
    (natureza, cTribNac/produto, marcas de segregação, parceria) na mesma operação do lançamento (2 commits +
    reconcile idempotente, memória `postentry-tx-raiz-subrazao-2-commits`).
16. **Tie-out**: soma do subrazão da competência × saldo 3.1 + 3.3 − 3.2; divergência ⇒ alerta `TIEOUT_DIVERGENTE` e
    bloqueia confirmação.

### PR-3 — apuração ME/EPP persistida
17. `POST /api/accounting/simples/apuracoes/:competencia/calcular` — calcula sob demanda (não persiste, ver **B-2**) e
    devolve `ApuracaoSimples` (§3).
18. `GET /api/accounting/simples/apuracoes/:competencia` — espelho do PGDAS-D na árvore do manual (6.5 atividade e
    segregação; 6.6 qualificação por tributo) + DAS oficial registrado + divergência (F-SN-8 → b).
19. `PUT /api/accounting/simples/apuracoes/:competencia/das` — registra o DAS oficial (número, valor, vencimento dia
    20, PDF como `SourceDocument`) e **persiste** a apuração no `TaxAssessment` (`tributo='SIMPLES_DAS'`,
    `periodo='M01'..'M12'`, `memoria` = cálculo + repartição + atividades, `tabelaVersao` = ids das linhas
    `LegalParameter` usadas). Novo registro na mesma competência = `SUPERSEDED` + linha nova com `supersedesId`.
20. **Gate dentro do tx**: competência com tie-out divergente, `RBT12_INCOMPLETO` ou `ATIVIDADE_SEM_ANEXO` ⇒ 422
    re-checado dentro do `runTransaction` (memória `authoritative-gate-inside-tx`).
21. **Provisão** (F-SN-10 → a, molde F-X7-4): débito "Simples Nacional (DAS) — dedução da receita" × crédito
    "Simples Nacional a recolher", pelo **valor oficial**, por competência; contas configuradas no perfil (folhas
    irmãs, ACC-018 não acionado); substituição = estorno + novo; 2 commits com reconcile idempotente. CPP dentro do
    DAS sem partição (regra silente nº 2).
22. **Matriz de obrigações**: linhas `PGDAS_D` (mensal, dia 20 — art. 18 § 15-A; Res. 140 art. 40), `DEFIS` (anual,
    31/03 — Res. 140 art. 72 § 1º; vigência até o ano-calendário 2026, ver §5), `LIVRO_CAIXA` = DISPENSADO com
    escrituração contábil (Res. 140 art. 63 § 3º), `DASN_SIMEI` (MEI, último dia de maio — art. 109). Remove o
    comentário "até ter fonte" de `obrigacoesPorRegime.ts:6`.
23. **Alertas de limite**: ME (R$ 360 mil) / EPP (R$ 4,8 mi), excesso ≤ 20% → efeito no ano seguinte, sublimite
    R$ 3,6 mi para ICMS/ISS (e IBS a partir de 2027) (LC 123 art. 3º I, II, §§ 7º–9º-A; art. 13-A). Valores em
    `SIMPLES_LIMITE`.
24. **Camadas + gates**: Route → Controller → Service → Repository → Prisma + Policy (deny-by-default, só a PJ dona),
    Factory, DTOs `.strict()`, snapshot de shape, rota em 2 toques (`index.ts` + `docs.paths.ts`), guard de path-count
    do openapi, eventos `SIMPLES_DAS_REGISTRADO` / `SIMPLES_DAS_SUBSTITUIDO` na allowlist do `auditCanonical.ts`.

### PR-4 — MEI, DEFIS, saídas
25. **SIMEI** (F-SN-0 → b): DAS mensal fixo = 5% de `SALARIO_MINIMO` vigente + R$ 1 (se contribuinte de ICMS) +
    R$ 5 (se contribuinte de ISS), conforme o enquadramento do Anexo XI (Res. 140 art. 101). Registro do DAS oficial pela
    mesma rota do item 19 com `tributo='SIMEI_DAS'`; provisão pelo mesmo molde.
26. **Limites do MEI**: receita anual acumulada > R$ 81.000 (proporcional no ano de início) ⇒ alerta de desenquadramento
    com os efeitos do art. 115 (até 20% de excesso × acima de 20%).
27. **DASN-SIMEI espelho anual**: receita bruta total, parcela sujeita a ICMS, contratação de empregado (art. 109 I–III).
28. **DEFIS espelho anual mínimo** (F-SN-9 → a): só anos com meses apurados aqui; lucro contábil e estoques do razão;
    sócios/empregados/aplicações digitados (manual 9.4.3).
29. **Saída para documentos**: alíquota efetiva de ISS do mês anterior para retenção pelo tomador (art. 21 § 4º I) e,
    a partir de 2027, % de ICMS/IBS/CBS da faixa para crédito do adquirente (art. 23 § 2º, red. 2027). `pTotTribSN` da
    DPS passa a ser preenchido pelo cálculo em vez de digitado — ver **B-4**.
30. **`opSimpNac=2` (MEI)** liberado no `DpsPayloadDto` (hoje literal 1|3).
31. **Conferência NFS-e emitidas × receita de serviços** da competência (alerta, não bloqueio) (art. 26 § 10 e
    art. 25 §§ 6º–8º, red. 2027).

## 3. Contratos (esboço materializável)

```ts
// features/legalParameters/models/legalParameter.ts — adições ao catálogo (item 1)
'SIMPLES_ANEXO_FAIXA'      // chave 'III', discriminador 'F3' → valorJson {receitaAteCents, aliquotaNominalBp, parcelaDeduzirCents}
'SIMPLES_ANEXO_REPARTICAO' // chave 'III', discriminador 'F3' → valorJson Record<TributoSimples, bp>; soma 10000
'SIMPLES_TETO_ISS'         // chave 'III' → valorJson {percentualBp, transfereAIbs}
'SIMPLES_ENQUADRAMENTO'    // chave 'SERVICO:060101' | 'REVENDA' | 'LOCACAO_MOVEL' → valorJson {anexo, fatorR, semIss}
'SIMPLES_LIMITE'           // chave 'ME'|'EPP'|'SUBLIMITE'|'MEI' → valorInt centavos
'SIMEI_VALOR'              // chave 'CPP_PCT'|'ICMS'|'ISS' → valorInt (bp ou centavos)
'SALARIO_MINIMO'           // chave 'NACIONAL' → valorInt centavos

// features/accounting/models/simplesCalc.ts — puro
export type TributoSimples = 'IRPJ'|'CSLL'|'COFINS'|'PIS'|'CBS'|'IBS'|'CPP'|'ICMS'|'ISS'|'IPI';
export function rbt12(historico: MesReceita[], competencia: string): { cents: bigint; janela: {de: string; ate: string}; regra: 'LC123-art18-§1'|'LC214-art517' };
export function apurar(input: ApuracaoInput, linhas: LinhaLegal[]): ApuracaoSimples; // lança AtividadeSemAnexoError
```

```ts
// dtos/SimplesDto.ts — .strict(); centavos inteiros ≤ MAX_CENTS na API, BigInt na persistência
const cents = z.number().int().min(0).max(MAX_CENTS);
const competencia = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const SimplesHistoricoUpsertSchema = z.object({ unitId: z.string().min(1), receitaBrutaCents: cents,
  folhaCents: cents.nullable().optional(), sourceDocumentId: z.string().min(1).nullable().optional() }).strict();
export const SimplesSegregacaoManualSchema = z.object({ unitId: z.string().min(1),
  monofasicoCents: cents, icmsStCents: cents, issRetidoCents: cents, issOutroMunicipioCents: cents }).strict(); // sem .default (memória zod4-partial)
export const SalaoParceriaContratoSchema = z.object({ unitId: z.string().min(1), profissionalContactId: z.string().min(1),
  cotaSalaoBp: z.number().int().min(1).max(9999), naturezaCota: z.enum(['ALUGUEL_BEM_MOVEL','GESTAO']),
  homologadoEm: dateOnly, sindicato: z.string().trim().min(1).max(200),
  vigenteDesde: dateOnly, vigenteAte: dateOnly.nullable() }).strict();
export const SimplesDasRegistroSchema = z.object({ unitId: z.string().min(1), numeroDocumento: z.string().trim().min(1).max(40),
  valorCents: cents.refine((v) => v > 0), vencimento: dateOnly, sourceDocumentId: z.string().min(1).nullable().optional() }).strict();
// dateOnly = regex + validação de calendário (memória date-only-regex-nao-valida-calendario)
```

```ts
// Saída — ApuracaoSimples (PRE-ADR §6, com os ajustes):
interface ApuracaoSimples {
  competencia: string; regime: 'SIMPLES' | 'MEI';
  rbt12Cents: number; janelaRbt12: { de: string; ate: string; regra: string };
  atividades: Array<{ anexo: 'I'|'II'|'III'|'IV'|'V'; natureza: 'SERVICO'|'REVENDA'|'LOCACAO_MOVEL'; cTribNac: string|null;
    receitaCents: number; faixa: number; aliquotaNominal: string; parcelaDeduzirCents: number; aliquotaEfetiva: string;
    segregacoes: { monofasicoCents: number; icmsStCents: number; issRetidoCents: number; issOutroMunicipioCents: number };
    parceria: { cotaProfissionalExcluidaCents: number } | null;
    tributos: Partial<Record<TributoSimples, number>> }>;
  totalCalculadoCents: number;
  dasOficial: { numeroDocumento: string; valorCents: number; vencimento: string } | null;
  divergenciaCents: number | null;
  tieOut: { subrazaoCents: number; razaoCents: number; ok: boolean };
  alertas: Array<{ codigo: 'ATIVIDADE_SEM_ANEXO'|'RBT12_INCOMPLETO'|'LIMITE_ME_EXCEDIDO'|'LIMITE_EPP_EXCEDIDO'
    |'SUBLIMITE_ICMS_ISS'|'LIMITE_MEI_EXCEDIDO'|'SEGREGACAO_MANUAL'|'TIEOUT_DIVERGENTE'|'NFSE_DIVERGE_RECEITA'; detalhe: string }>;
  tabela: Array<{ legalParameterId: string; fonte: string; vigenteDesde: string }>;
}
```

Rotas (2 toques, deny-by-default): `PUT /api/accounting/simples/historico/:competencia` · `PUT …/segregacao/:competencia`
· `POST/GET/PATCH/DELETE /api/accounting/simples/parcerias` · `POST /api/accounting/simples/apuracoes/:competencia/calcular`
· `GET /api/accounting/simples/apuracoes/:competencia` · `PUT /api/accounting/simples/apuracoes/:competencia/das`
· `GET /api/accounting/simples/defis/:ano` · `GET /api/accounting/simples/dasn-simei/:ano`.

## 4. Forks novos do BRIEF — RATIFICAÇÃO PENDENTE

**B-1 — `TaxAssessment.codigoReceita` para o DAS.** O campo é `String` obrigatório (6 dígitos DCTF); o DAS não tem
código de receita nesse sentido.
- (a) Migrar para `String?` e deixar `null` no DAS/SIMEI. · (b) Sentinela `'DAS'`. · (c) Model próprio (reabre F-SN-13).
- **Recomendação: (a).** Sentinela vira código falso que o MIT/DCTFWeb poderia exportar; o X9 filtra por tributo, mas
  um `null` explícito falha alto se alguém tentar. Migração SQLite = rebuild de tabela com prólogo idempotente
  (memória `migracao-sqlite-nao-e-transacional`).

**B-2 — Quando a apuração vira linha persistida.**
- (a) Só no registro do DAS oficial (cálculo é sob demanda, item 17). · (b) Rascunho persistido no "calcular",
  confirmado no registro (novo status `DRAFT` no `TaxAssessment`).
- **Recomendação: (a).** O `TaxAssessment` só conhece `CONFIRMED|SUPERSEDED`; (b) adicionaria estado ao modelo
  compartilhado com o X7. O valor que vale é o oficial (F-SN-8), então não há o que confirmar antes dele.

**B-3 — Como a ponte sabe que um item de venda foi feito por parceiro.**
- (a) O item de venda carrega o profissional (campo do preset de vendas/agendamento) e a ponte cruza com o contrato
  vigente. · (b) Declaração mensal da receita por parceiro (como a segregação manual).
- **Recomendação: (a) com (b) interino.** O preset de agendamento já liga profissional (`AppointmentsModule.ts:21`);
  se o item de venda não tiver o campo, (b) cobre até o FE/preset expor. Ler o preset `SalesItemsMixed` na execução
  (insumo — §6).

**B-4 — `pTotTribSN` da DPS.** O campo hoje é digitado; a semântica oficial (alíquota efetiva total?) não foi lida.
- (a) Preencher pelo cálculo (alíquota efetiva do mês anterior) com override. · (b) Manter digitado; o cálculo só
  sugere.
- **Recomendação: (b) até ler o leiaute da DPS (E0713)** — por regra do dono, decide-se pela norma; a norma ainda não
  foi lida, então não se automatiza (§6).

## 5. Pendente de validação externa

Por regra do dono (07/10), **nada vai ao contador**. Fica só o oráculo que nenhuma leitura substitui:
- **Gate humano X14-DAS** (RUNBOOK-FORMAT, agente prepara em branco): para N competências reais do 1º cliente, colar
  o DAS que o portal gerou e a apuração do sistema; desfecho e assinatura do dono.
- **DEFIS depois de 2026**: a redação de 2027 do art. 25 torna a declaração mensal (inferência sobre o texto). O item
  28 limita a DEFIS a anos ≤ 2026 até sair a regulamentação.

## 6. Insumos ausentes

- **Res. CGSN 191/2026** e 184–190, 192 (compilação lida vai até a 183). Fonte: DOU.
- **Regulamentação de 2027** (manual PGDAS-D com IBS/CBS; SIMEI com IBS/CBS, Anexo VII da LC 214 não lido).
  Até lá, PR-4 implementa o SIMEI de 2026 e o cálculo ME/EPP 2027 pela LC 214 lida.
- **Leiaute da DPS para `pTotTribSN`** (B-4).
- **Lei 12.592 no disco desta máquina**: o arquivo não está no checkout (o MANIFEST manda repor); os §§ citados vêm da
  leitura registrada no PRE-ADR (V em 29/09).
- **Preset `SalesItemsMixed`**: se o item de venda carrega o profissional (B-3).
- **Portaria CAT 28/20 (SP)**: estoque que saiu da ST (afeta segregação só para estoque anterior a 01/04/2026).

## 7. Achados fora de escopo (registrados, não planejados)

1. `ibsCbsInformar` sem vigência (`FiscalProfileService.ts:151`) — o Simples passa a informar IBS/CBS em 01/01/2027.
   Dono: FE-INCR-DFE / X10b.
2. `icmsContribuinte` forçado a `false` no Simples — no BRIEF do X10a (decisão 5 de 29/09).
3. FE (`FE-INCR-SIMPLES`): telas de histórico, segregação, parceria, apuração/espelho, registro do DAS.
4. Split payment × DAS (LC 123 art. 21 § 3º-A, red. 2027) — PRE-ADR do split.
