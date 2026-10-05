# RETORNO — X7 Fase B PR-4 (ECF anual + liberação do `ANUAL`)

tarefa: executar o PR-4 da Fase B do X7 (F-TB-8 a) — BE-INCR-TAX-ASSESSMENT-B-brief.md §3.1: itens 1, 2, 18, 19, 20, 21, 22, 23, 24 + testes 26 j, k, l; último PR da Fase B (`ANUAL` selecionável — F-TB-8.1)
autorizacao: dono, chat, 05/10/2026 — "Executa o PR-4 da Fase B do X7" (ainda NÃO registrada no `autorizacao` de docs/plano/nos/X7.md — entra no fold)
agente: sessão principal (sessao-feature), branch claude/modest-mendel-1rf1fi; review por Agent isolado (worktree própria)
base: 0b26abc5 (origin/main, 05/10 — inclui o #529, PR-3)

### Insumos do BRIEF B §5 resolvidos nesta sessão
- **§5.1 (abas N620/N660):** planilha oficial baixada de `sped.rfb.gov.br/arquivo/download/8002` em 05/10 — sha256 `366b8d9030a0…`, **o mesmo** do fixture e do MANIFEST (o `2a4c9688df7a` do ADR não é o que a RFB serve hoje). Regenerada com `ABAS_LINHAS` + N620/N660: **as 5 abas existentes e a PARTEB_PADRAO saíram idênticas** (deep-equal) — a parada do item 22 não disparou. N620 = 41 linhas (22 E), N660 = 33 (18 E).
- **§5.2 (regras finas do Manual):** Manual L12 baixado de `…/download/8003` em 05/10 — sha256 `7216ec2bd62d…` (= MANIFEST, "Atualização: maio/2026"). Lido:
  - `DT_INI`/`DT_FIN` do `A0m`: o Manual não diz; só "Balanço de Suspensão e Redução até <mês>" (M030 p.241, N030 p.277). Fica o item 19 → item 4 (período em curso), grau **I**.
  - `FORMA_TRIB_PER` fora do período: REGRA_FORM_TRIB_FORA_PERIODO fala em "período de escrituração" (p.76); `MES_BAL_RED` = "0 – Fora do Período: fora do período de apuração" (p.72) e os meses de trimestre ≠ R/E têm de ser 0. Coerente com o item 18.
  - M500/M510: ocorrência F sem condição de período (p.47); vêm dos fechamentos, que no anual só existem no `A00` (PR-2). Sem divergência.
  - M305 numa linha P de balancete: ocorrência só por IND_RELACAO (p.47); o teto do PR-2 (lacuna 4) já cobre. Sem divergência.
- **§5.3 / item 23 (L100/L300 nos meses B):** L100 "recuperado do registro K155/K156 … saldos finais não são editáveis" (p.223); K030 aceita `A01..A12` "Balanço suspensão redução até <mês>" (p.143) o K155 é "calculado pelo sistema através da funcionalidade de recuperar ECD" (p.145) e o E155 é "calculado a partir dos registros recuperados C155 de acordo com os períodos fiscais" (p.128). O PVA recupera da ECD também nos meses `B` ⇒ **a parada do item 23 não disparou**; Fork 6 → (b) continua.

### Decisões do dono tomadas nesta sessão (questionário, 05/10 — antes do código; as 3 na recomendação)
1. **FORMA_TRIB_PER no anual** (lacuna 1): derivado (`R` no trimestre com mês em atividade, `0` fora) **e conferido** com o informado — diverge ⇒ 400 com o esperado. O DTO continua exigindo o campo (o trimestral não muda).
2. **Item 2 × unidades** (lacuna 2): a busca do e-Lalur da forma antiga olha **todas as unidades do dono** (a forma é da empresa). Método novo, só leitura, no repositório do e-Lalur.
3. **`n500` em mês `0`** (lacuna 3): **400 na geração**, mesma família do item 21 — linha do e-Lalur num período sem registro de período no arquivo.
4. **Achado do review (item 2 contornável)** — 2º questionário, 05/10: **gate também na cópia de outro ano e na exclusão + defesa na ECF** (opção além da recomendação). A cópia (`copiar-de`) e a exclusão de um perfil ANUAL trocam a forma do e-Lalur sem passar pelo `upsert`; agora dão o mesmo 400 `FORMA_COM_LALUR`. E a geração recusa (400) linha do e-Lalur ou movimento da Parte B fora dos períodos da forma do ano, nas duas formas — o trimestral sem órfão continua byte a byte igual.

### Checklist (BRIEF B §1, itens do PR-4)
| # | Comportamento | Status | Teste |
|---|---|---|---|
| 1 | `ANUAL` liberado no REAL; `PRESUMIDO` + `ANUAL`, `SIMPLES`/`MEI` seguem 400; trava inalterada | ✅ | CompanyFiscalProfileDto.test (2 casos); taxAssessmentProfile.integration "item 1" (PUT 2031 ANUAL 200, PRESUMIDO 400); formaLalur.integration |
| 2 | Troca `TRIMESTRAL ↔ ANUAL` com e-Lalur do ano (linha, movimento ou fechamento vivos) nos períodos da forma antiga ⇒ 400 listando período/livro/quantidade; todas as unidades (dec. 2); dentro da tx do upsert — e da cópia e da exclusão (dec. 4) | ✅ | **26 l** — companyFiscalProfile.formaLalur.integration (2 sentidos, linha em outra unidade, arquivar destrava; copiar-de e DELETE ⇒ 400, vermelho sem o fix: 200) |
| dec. 4 | ECF: linha do e-Lalur fora dos períodos emitidos (também no trimestral) e movimento da Parte B fora dos períodos da forma ⇒ 400, antes de qualquer job | ✅ | SpedEcfRealGenerationService.test "defesa … órfão de troca de forma" (3 casos) |
| 18 | `FORMA_APUR` do perfil efetivo (`A` se ANUAL; sem perfil ⇒ `T`); DTO `formaApur` opcional `T`/`A`, informado ≠ perfil ⇒ 400; `FORMA_TRIB_PER` derivado + conferido (dec. 1); `MES_BAL_RED` dos `modo` confirmados; meses em atividade sem IRPJ+CSLL `CONFIRMED` ⇒ 400 listando; leitura do `TaxAssessment` pela interface do repositório | ✅ | SpedEcfRealGenerationService.test "formaApur informado ≠ perfil", "item 18: mês … sem confirmados", "início de atividade em maio" |
| 19 | `perApur` aceita `A00..A12`; L030/M030 = A00 + meses `B`; N030 = A00 + meses `B`/`E`; `A0m` = período em curso | ✅ | **26 j** ('EEBEEEBEEEEE' ⇒ L/M = A00,A03,A07; N = A00 + 12) |
| 20 | No anual, exige o fechamento `A00` (não os 4 trimestrais); M410/M500 só sob o `A00` | ✅ | "item 20" |
| 21 | lalur/lacs em `A0m` fora de `B` ⇒ 400; n620/n660 fora de `B`/`E` ⇒ 400 (+ dec. 3: n500 em mês `0`) | ✅ | "itens 21/22 (+ lacuna 3)" — 3 casos, nenhum job criado |
| 22 | N620/N660 sob o N030 do mês, N630/N670 sob o A00; sem alíquota no montador; catálogo regenerado (+ abas N620/N660, parada não disparou); a recusa provisória do PR-2 (lacuna 2) caiu | ✅ | "itens 21/22"; LalurService.parteB.test e lalurController.anual.integration (n620 E aceito, CNA recusado) |
| 23 | Bloco L sem L100/L300 também no anual (Fork 6 → b) | ✅ | 26 j (nenhum L100) + leitura do Manual acima |
| 24 | Emenda ao ADR-INCR-SPED-ECF-FASE3 retirando o F-M8 | ✅ | `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` — status + EMENDA 4ª |
| 26 k | ECF trimestral byte a byte igual | ✅ | sha256 de 2 arquivos (com ajustes; com M410/M500/M510) calculado no código de `origin/main` num worktree limpo e fixado no teste; bate sem perfil, com REAL nulo/TRIMESTRAL e com `formaApur` omitido |
| 25 | Snapshot `SpedEcfRealDto` (+ `.gen.ts` do FE); `CompanyFiscalProfileDto` sem mudança de shape (só o refine); OpenAPI +0 paths (247 → 247), descrições/enums atualizados; sem eventType novo | ✅ | dtoShapeSnapshot; docs:generate |

### Diff resumido
- `scripts/ecf-tabelas-dinamicas-to-catalog.mjs` + `fixtures/ecf-l12-linhas.json`: abas N620/N660.
- `models/Lalur.model.ts`: `ECF_ABAS_LINHAS`, `LIVRO_ABA` completo; sai `LALUR_LIVROS_SEM_CATALOGO`. `LalurService.resolveLinha` perde a recusa provisória.
- `dtos/CompanyFiscalProfileDto.ts`: `ANUAL` só recusado no PRESUMIDO. `CompanyFiscalProfileService`: `assertTrocaDeFormaSemLalur` (item 2), dep nova `lalurRepo` (factory). `ILalurRepository`/`LalurRepository`: `countByOwnerYearPeriods` (groupBy, só leitura, por dono).
- `lib/ecf.ts`: `Reg0010Input.mesBalRed` (vazio por default — Presumido e Real trimestral inalterados). `lib/ecfReal.ts`: `formaApur 'T'|'A'`, `mesBalRed`, `EcfRealPerApur`, `periodsN`, N620/N660.
- `dtos/SpedEcfRealDto.ts`: `formaApur` opcional `T`/`A`. `SpedEcfRealGenerationService`: `derivarEcfAnual` (pura), `modosConfirmados`, `assertLinhasNosPeriodos`, deps novas `profiles`/`assessments` (factory).
- `routes/docs.paths.ts`, `public/openapi.json`, snapshot + `my-app/types/contracts/accounting/SpedEcfRealDto.gen.ts`, ADR da ECF.

### Lacunas de spec
- Nenhuma aberta: as 3 desta sessão foram decididas pelo dono acima.
- Registro (não bloqueia): (a) ordem dos períodos no anual = a da lista de valores válidos do PER_APUR (A00, A01..A12 — pp.241/277); o Manual não fixa ordem e o PVA (H1b/X5) confirma; (b) item 18 pede os meses em atividade confirmados, não o `A00` — segui a letra (o arquivo não lê o `TaxAssessment` do A00); (c) o 0000 continua com `DT_INI = 01/01` (situação especial/início de atividade no ano não é suportada pelo gerador — pré-existente, vale também para o trimestral).

### Asserções pré-existentes alteradas (com o motivo)
- `CompanyFiscalProfileDto.test.ts` (2 testes) e `taxAssessmentProfile.integration.test.ts` "item 1": esperavam `REAL + ANUAL ⇒ 400 "forma anual é da Fase B"` — a recusa era provisória até este PR (F-TB-8.1, item 1). O PUT ANUAL do teste de integração foi para 2031, para não trocar o perfil de 2026 que os testes seguintes usam.
- `LalurService.parteB.test.ts` e `lalurController.anual.integration.test.ts`: esperavam o 400 "catálogo das abas N620/N660 ainda não foi transcrito" — a decisão do dono (lacuna 2 do PR-2) fixou esse 400 só **até o PR-4**. Agora: código CNA ⇒ 400 de tipo; código E ⇒ 201.
- `SpedEcfRealDto.test.ts` "formaApur": default `T` e `A` recusado → opcional, `T`/`A` aceitos, outro recusado (item 18). `spedController.ecfReal.integration` "formaApur não é T": só o título (continua 400, agora pelo perfil).

### Achados fora de escopo
- O FE não expõe a forma de apuração (nem `ANUAL`) no formulário do perfil fiscal; o painel de geração já não manda `formaApur`. Tela é nó vizinho.
- O `0000.DT_INI` fixo em 01/01 (lacuna (c)) impede a ECF do ano de início de atividade com situação especial — trimestral e anual.

### Review independente
- Veredito **PASS COM RESSALVAS**. Itens 18–24 e testes 26 j/k/l corretos; catálogo conferido (mesmo sha que a RFB serve hoje; 5 abas + PARTEB_PADRAO idênticas); todos os gates da geração antes do `createJob`; consulta por dono exclui arquivados; asserções editadas só as que a mudança da spec exige.
- **Defeito 1 (real):** o gate do item 2 só no `upsert` — `copiar-de` (201) e `DELETE` de perfil ANUAL (200) trocavam a forma com linha viva, e a ECF trimestral descartava a linha `A03` em silêncio (provado com testes descartáveis do revisor). → **decisão 4 do dono; corrigido** com teste vermelho→verde.
- Observação (pré-existente): `periodoBounds('A00')` vai sempre de 01/01 a 31/12, mesmo com início/fim de atividade no ano.
- Observação de ambiente: com `generated` em symlink, a integração usa o `test-integration.db` do checkout principal (compartilhado entre sessões).

### Checks executados
- `cd server && npx tsc --noEmit` → 0; `cd my-app && npx tsc --noEmit` → 0; `npm run test:types` → 0
- `npm run docs:generate` → 247 paths (antes 247)
- `npm run test:unit` → 279 suítes, 3986 passed
- `npm run test:integration` → 113 suítes, 929 passed (antes do fix do review)
- depois do fix do review: ver o PR (rodada completa repetida)
- Sem migração neste PR (sem `smoke:migration`).

### Fold pronto (pós-merge, não aplicado)
`id: X7` · `estado: inflight` · `estado_detalhe: + "05/10: Fase B PR-4 mergeado no #<n> (itens 1, 2, 18–24: ANUAL selecionável no perfil; troca de forma com e-Lalur do ano ⇒ 400 em todas as unidades; ECF anual com FORMA_APUR do perfil, MES_BAL_RED dos modos confirmados, L/M030 = A00 + meses B, N030 = A00 + B/E, Parte B no A00; catálogo N620/N660; emenda 4ª do ADR da ECF retira o F-M8). Fase B completa. Decisões do dono 05/10 (lacunas 1–3 do PR-4 + achado do review): FORMA_TRIB_PER derivado e conferido; item 2 olha todas as unidades e vale também na cópia e na exclusão do perfil; n500 em mês 0 ⇒ 400; ECF recusa órfão de troca de forma nas 2 formas. Oráculo do número segue H1b/X5 × PVA (P-B9)"` · `autorizacao: + "dono, 2026-10-05: 'Executa o PR-4 da Fase B do X7'"` · `prs: + "#<n>"` · nota de decisão nova `D-2026-10-05-X7-FASE-B-PR4-LACUNAS` (as 4 acima)
