# Retorno — ISS-TRANSICAO-IBS PR-2 (itens 8–14)

- sessão: sessao-feature · modelo: claude-opus-5-5 · perfil-previsto: completo (vermelho de código: fiscal)
- autorização: dono, chat, 2026-11-06, questionário de 'executa': "X7 emenda rastreio,ISS-TRANSICAO PR-2" — sem merge
- branch: `claude/iss-transicao-ibs-pr2` (de origin/main 503029ca1) · commits e7bcb6559, bd6ccb92c, d5bf87dd3 · sem push
- rodadas-de-review: —
- custo: custo: US$ 5.26 · claude-opus-5-5 US$ 5.26 · 4 min

## Checklist

| # | Item | Status | Teste que prova |
|---|---|---|---|
| 8 | pAliq do regime normal × (10000 − fator)/10000; Simples sem fator | feito | `FiscalDocumentEmissionService.test.ts` › "pAliq na transição…": 2028-12-31 ⇒ 5.00, 2029-01-15 ⇒ 4.50; tabela A7 2028–2032 × {200,500}; Simples 2029 ⇒ 3.00 inalterado; 2033 ⇒ prévia bloqueada com IssExtintoError + data (A3). Puro: `issTransicaoPr2.test.ts` item 8 |
| 9 | Data do fator = dCompet; pacote pela P-ISS-3 | feito | mesmo describe: pacote VENDA vendido 2028-12-20 ⇒ 5.00; sessão CONSUMO 2029-01-10 ⇒ 4.50 (A2) |
| 10 | Piso ISS_LIMITE/ALIQUOTA_MIN_BP por vigência (200 até 2028; 180/160/140/120 — P-ISS-1 b, ADCT art. 128); formatoLinha; issComBeneficio/simplesCalc por parâmetro; serviço lê pela data do PA; DRAFT ⇒ 400; texto do alerta interpola o piso | feito | `issTransicaoPr2.test.ts` (semente = migração, formato, 2028⇒200…2032⇒120, 2033 e só-DRAFT ⇒ SemLinhaVigenteError 400 com a data, tabela A7 do DAS); `issTransicaoPr2.integration.test.ts` (PA 2028-12 ISS R$ 1.000,00 × PA 2029-01 R$ 900,00; texto "piso de 2.00%") |
| 11 | Benefício no ramo § 3º (P-ISS-2): cálculo não muda | feito (identidade) | `issTransicaoPr2.test.ts` item 11: isenção 10000 ⇒ 10000 em 2029; 20% em 2029 = tabela × 0,8 |
| 12 | Aviso BENEFICIO_ISS_TRANSICAO_8B (WARNING) no PA 2029-01 para benefício que cruza 2029 | feito | integração: presente em 2029-01, ausente em 2028-12 e para benefício que começa em 2029 |
| 13 | 2033 sem ISS nem piso | feito | puro (apurar 2033-01 sem ISS/beneficioIss) + integração (calcular 2033-01 = 200, sem ISS) |
| 14 | Gates | feito | snapshot: só o enum novo inserido no fim (sem UPDATE); `.gen.ts` e `ALERTA_LABEL` com o código; i18n pt/en com a chave; `auditCanonical.ts` intocado; tsc, tsc de teste, check:arch, tsc do my-app limpos |

Insumo ausente 2 (casas do pAliq): **não é lacuna** — o código já tem regra, `bpToPctString` (2 casas, `toFixed`), e o DpsPayloadDto valida TSDec1V2. O fator é aplicado em bp sem arredondamento e passa por essa regra. Resíduo: com alíquota em bp não múltipla de 10 (por exemplo 333 × 0,9 = 299,7 bp), o `toFixed` arredonda em ponto flutuante. Isso só acontece com alíquota municipal fracionária, que hoje é inferida como rara.

## Lacunas de spec (registradas, nada escolhido além da letra)
1. **Simples com regApTribSN ≠ 1 (ISS fora do DAS) que informa pAliq.** O item 8 diz "regime não Simples ⇒ fator", e foi o que implementei: esse caso fica sem fator. A alíquota informada aí pode ser a municipal, e nesse caso o fator caberia. Pergunta ao dono: o fator vale para opSimpNac 3 com regApTribSN 2/3?
2. **Simples com retenção (E0621/E0628) não é testável pela prévia**, porque o issRetidoTomadorPj=true é recusado antes da montagem (F-DFE-14). O teste do ramo Simples usa regApTribSN 2, que passa pelo mesmo `isSimples`.
3. **O aviso do item 12 sai só no PA 2029-01** (letra do item) e também para benefício VALOR_FIXO ("um benefício").

## Achados fora de escopo
- `LEGAL_PARAMS_SEED_FILES` (test/helpers/legalParams.ts) não inclui `LEGAL_PARAMS_SEED_FILE_RETENCOES_V3`. Não toquei.
- check:arch avisa de 28 violações stale no baseline. É pré-existente.

## Conflitos prováveis com o #1102
- `server/src/features/accounting/models/issLimite.ts`: este PR acrescenta `issAliquotaMinBp` no fim do arquivo. Se o #1102 também mexer no fim do arquivo ou nos imports, o conflito é textual e simples.
- Possível também em `formatoLinha.ts` (checar de ISS_LIMITE), caso o #1102 mexa nessa entrada.

## PROVA
```yaml
PROVA:
  - command: "cd server && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-1.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx tsc -p tsconfig.test.json --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-2.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  - command: "cd server && npx jest src/features/accounting/models/__tests__/issTransicaoPr2.test.ts src/features/accounting/models/__tests__/issBeneficio.test.ts src/features/accounting/models/__tests__/issTransicao.test.ts src/features/accounting/models/__tests__/simplesCalc.test.ts src/features/accounting/services/__tests__/FiscalDocumentEmissionService.test.ts src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts src/features/legalParameters --selectProjects unit"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-3.log
    sha256: d551ff02b432dd6eb4310c579431b3da9e3b93dc7477050acc49b1eeffc27c1e
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label iss-pr2 -- npx jest src/features/accounting/services/__tests__/issTransicaoPr2.integration.test.ts --selectProjects integration --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-4.log
    sha256: d9ada42a0bfb335d29e72cc79c7b994e4fe93ca7a76a3307d95e0e41e302b414
  - command: "cd server && node ../scripts/heavy-slot.cjs run --label iss-pr2 -- npx jest src/features/accounting/services/__tests__/issBeneficioMunicipal.integration.test.ts --selectProjects integration --runInBand"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-5.log
    sha256: 8cf51e230983c871a26b3561d52ad82399b6dd844113e511e415862fcb64ae42
  - command: "cd server && npm run check:arch"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-6.log
    sha256: 5fad2ab4f9c0ad00b52de607cd3bb67f56e91502e60ed5f19ec2c674c6150092
  - command: "cd my-app && npx tsc --noEmit"
    exit_code: 0
    log: .claude/retornos/_logs/iss-transicao-ibs-pr2-7.log
    sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
VEREDITO: PASS
```
Caso adversarial: o teste de integração afirma ISS de R$ 900,00 em 2029-01. Com o piso constante antigo (200), daria R$ 1.000,00, então o teste reprovaria a versão anterior. Por raciocínio, não reexecutado contra o código antigo. Grau: inferido.
