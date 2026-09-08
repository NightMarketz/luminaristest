# BRIEF — BE-INCR-CNPJ-ALFA (T10: CNPJ alfanumérico transversal — `lib/cnpj.ts` + DTOs ECD/ECF + coerência da chave NF-e)

> Produzido por **sessão de planejamento**, 2026-09-07, sobre `origin/main` `09ae49a2` (+ PR #270 em
> merge). **Rodada 1** do [PLANO-SDD-SEQUENCIAL-2026-09-07.md](PLANO-SDD-SEQUENCIAL-2026-09-07.md).
> Não contém código de aplicação, não ratifica fork. Todo fork abaixo está **RATIFICAÇÃO PENDENTE**.

## Cabeçalho

- **Item a planejar:** tipagem de CNPJ alfanumérico no backend — (1) `server/src/lib/cnpj.ts` puro
  (formato + dígitos verificadores módulo 11 com valor = ASCII − 48); (2) troca dos **4 regex**
  `^\d{14}$` / `^\d{11}$|^\d{14}$` em `SpedEcdDto.ts:23-24` e `SpedEcfDto.ts:22-23`; (3) a asserção de
  coerência chave × CNPJ × `cDV` no teste do parser da NF-e, prevista na cédula de integração **E2 (h)** e
  **não implementada** no #267 (verificado: 0 ocorrências de `cDV`/`módulo 11` em `lib/nfe.ts` e
  `nfe.test.ts`).
- **Autorização (ORCH-006):** dono em sessão, 2026-09-07: *"Mergeia a PR #270 e dispara a proxima
  sessão gatilhando esse plano até terminar tudo"* — o plano põe este item na **rodada 1** com o gatilho
  *"planeja o CNPJ-ALFA"*. Origem da frente: cédula de integração 2026-09-03 §E2 (h) ("BRIEF
  `BE-INCR-CNPJ-ALFA` (T10) — pré-requisito do merge") e triagem T4→T10 ("crítica [V-repo]"). A cédula de
  módulos E.3 lista o item como **X6b**. Cobre exatamente os três pontos acima; **não** cobre o FE nem o
  DynamicTable (ver Achados).
- **Fatos verificados nesta sessão (código e Manual, não memória):**
  - **`lib/cnpj.ts` não existe.** O único validador de CNPJ do repo é
    `features/dynamicTables/utils/ValidationUtils.ts:36-50` (`isValidCnpj`): faz `replace(/\D/g,'')`,
    exige 14 dígitos, rejeita sequência repetida, **não confere DV**. Consumido só pelo DynamicTable
    (`SchemaValidator.ts:76`, `DynamicTableService.ts:1043`).
  - **Os 4 regex:** `SpedEcdDto.ts:23` (`cnpj`), `:24` (`cpfOrCnpj`); `SpedEcfDto.ts:22`, `:23`. Sites de
    uso: ECD declarante `cnpj`, `codScp`, signatário `identCpfCnpj`; ECF declarante `cnpj`, signatário
    `identCpfCnpj`. O refine da ECF `identCpfCnpj.length !== 11` (`SpedEcfDto.ts:95`) é para **CPF** do
    contador e permanece numérico.
  - **Serializers passam o CNPJ como string sem formatação numérica** (`sped.ts:185`, `ecf.ts:113,246`)
    — um valor alfanumérico atravessa intacto até o `.txt`.
  - **Parser da NF-e:** `readParty` lê `CNPJ` como string sem regex (`nfe.ts:168-180`); o `@Id` só checa
    `startsWith('NFe') && length === 47` (`nfe.ts:264-266`) — aceita alfanumérico hoje, mas **não valida
    charset nem posição**.
  - **Os dois fixtures sintéticos falham a coerência de E2 (h)** (calculado nesta sessão): `cDV` esperado
    **3** e **8**, gravados **7** e **5**; e os CNPJs `12345678000190` / `98765432000155` têm DV errado
    (corretos: **95** / **98**). Regra da cédula: *"o fixture atual tem de passar (se não passar, corrigir
    o fixture, não a asserção)"* → corrigir fixture é parte deste item.
  - **Contraparte mutila CNPJ alfanumérico em silêncio:** `Counterparty.model.ts:62-63`
    `normalizeTaxId = replace(/\D/g,'')`, aplicado por `transform` em `CounterpartyDto.ts:44-47`.
    `12ABC34501DE35` viraria `123450135`. Classe `param-aceito-e-ignorado`. Prisma `taxId String?`
    (`schema.prisma:1120`) — **sem migração**.
  - **Snapshot de shape:** `__dto-shapes__.json` tem **9** ocorrências do padrão `\d{14}` → regenerar
    com `UPDATE_DTO_SNAPSHOT=1` (`dtoShapeSnapshot.test.ts:19,67`).
  - **FE:** `SpedGenerationPanel.tsx:34-55` só checa `trim()` e `length === 11` do contador; tipos em
    `sped.service.ts` são `string`. Nenhum regex de CNPJ no FE → **zero mudança de FE** para este item.
  - **Manual da ECF Leiaute 12 (20/05/2026), p. 34-35, §2.4 "Códigos de Identificação":** `CNPJ C 014`
    (alfanumérico, 14) com o exemplo `AAA.AA.AAA/AAAA-10 ➔ |AAAAAAAAAAAA10|`; máscaras não entram;
    campos com tamanho declarado exigem a quantidade exata. **O leiaute da ECF já aceita CNPJ
    alfanumérico.** (PDF em `C:\Users\smurf\Downloads\luminaris-gates\`, baixado 07/09.)
  - **Algoritmo dos DV** (IN RFB 2.229/2024; produção desde 01/07/2026; NT 2026.004 para a NF-e —
    fontes **secundárias** convergentes, primária com redirect loop, triagem T10): 12 posições
    `[A-Z0-9]` + 2 DV numéricos; valor de cada posição = código ASCII − 48 (`'0'`→0 … `'9'`→9, `'A'`→17 …
    `'Z'`→42); pesos DV1 `5,4,3,2,9,8,7,6,5,4,3,2`, DV2 `6,5,4,3,2,9,8,7,6,5,4,3,2`; resto < 2 ⇒ 0, senão
    11 − resto. **Reproduz o exemplo público** `12ABC34501DE` → `35` e o numérico `11222333/0001` → `81`
    (calculados nesta sessão). Chave de acesso da NF-e passa a `[0-9]{6}[A-Z0-9]{12}[0-9]{26}` (posições
    7–20 = CNPJ do emitente; último dígito = `cDV` módulo 11 clássico com pesos 2..9).

## Insumos existentes

| Insumo | Caminho | O que fixa |
|---|---|---|
| Regex a trocar | `SpedEcdDto.ts:23-24`, `SpedEcfDto.ts:22-23` | os 4 pontos do item |
| Refine CPF do contador | `SpedEcfDto.ts:88-100` | fica numérico (11) — não é CNPJ |
| Serializers | `lib/sped.ts:178-192`, `lib/ecf.ts:102-115,238-250` | string pura, nada a mudar |
| Parser NF-e | `lib/nfe.ts:262-290`, `lib/__tests__/nfe.test.ts:58-76` | onde entra o regex da chave e a asserção (h) |
| Fixtures sintéticos | `lib/__tests__/fixtures/nfe/purchase-multi-item.SYNTHETIC.xml`, `sale.SYNTHETIC.xml` | chaves/CNPJs a corrigir |
| Contraparte | `models/Counterparty.model.ts:56-63`, `dtos/CounterpartyDto.ts:44-47` | `normalizeTaxId` (fork F-CNPJ-3) |
| Validador canônico existente (outro módulo) | `features/dynamicTables/utils/ValidationUtils.ts:13-72` | **não** tocar aqui (Achado 1); `lib/cnpj.ts` nasce como espelho de `lib/ofx.ts`/`lib/nfe.ts` (lib pura) |
| Snapshot | `dtos/__tests__/dtoShapeSnapshot.test.ts` + `__dto-shapes__.json` | regeneração obrigatória |
| Golden ref de lib pura + teste | `lib/ofx.ts` + `lib/__tests__/ofx.test.ts` | sem dependência, sem I/O, ValidationError só no parser |
| Regra de domínio | Manual ECF L12 §2.4 p. 34-35; cédula E2 (h); triagem T10 | artefatos citados acima |

## Contratos a materializar (esboço)

```ts
// server/src/lib/cnpj.ts — PURO, zero dependência, zero I/O
export const CNPJ_REGEX = /^[A-Z0-9]{12}[0-9]{2}$/;          // 14 posições, sem máscara, MAIÚSCULO
export const CPF_REGEX = /^[0-9]{11}$/;                       // CPF segue numérico
export const NFE_CHAVE_REGEX = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/; // NT 2026.004
export function stripCnpjMask(raw: string): string;           // remove SÓ '.', '/', '-' e espaços; uppercase; NUNCA \D
export function cnpjCheckDigits(base12: string): string;       // '12ABC34501DE' -> '35'  (lança em base inválida)
export function isValidCnpj(value: string): boolean;          // CNPJ_REGEX && DV confere
export function nfeChaveCheckDigit(chave43: string): number;  // módulo 11, pesos 2..9 da direita p/ esquerda
export function isValidNfeChave(chave44: string): boolean;    // NFE_CHAVE_REGEX && cDV confere

// dtos: substitui os 4 regex (F-CNPJ-2 decide se há DV no DTO)
const cnpj      = z.string().regex(CNPJ_REGEX, 'CNPJ = 14 posições sem máscara: 12 alfanuméricas maiúsculas + 2 dígitos verificadores.');
const cpfOrCnpj = z.string().regex(/^[0-9]{11}$|^[A-Z0-9]{12}[0-9]{2}$/, 'CPF (11 dígitos) ou CNPJ (14 posições).');
```

## Checklist numerado de comportamentos (cada um testável)

**A. `lib/cnpj.ts`**

1. `stripCnpjMask` remove apenas `.`, `/`, `-` e espaços e põe em maiúsculas; **nunca** `\D` (que
   apagaria as letras). Teste: `'12.ABC.345/01-DE'` → `'12ABC34501DE'`; `'12abc34501de35'` → maiúsculo.
   **Fork F-CNPJ-1** (aceitar minúsculas normalizando × rejeitar).
2. `cnpjCheckDigits` implementa o algoritmo do cabeçalho; testes: `'12ABC34501DE'` → `'35'`,
   `'112223330001'` → `'81'`, `'123456780001'` → `'95'`; base com 11 ou 13 posições, ou caractere fora de
   `[A-Z0-9]`, lança. **Direto — invariante fiscal, artefato citado.**
3. `isValidCnpj`: formato + DV. Testes: `11222333000181` ✔, `12ABC34501DE35` ✔, `12ABC34501DE36` ✘,
   `12345678000190` ✘ (é o CNPJ do fixture antigo — prova que a lib pega o erro), 13 ou 15 posições ✘,
   com máscara ✘ (a lib valida a forma canônica; quem normaliza chama `stripCnpjMask` antes). **Direto.**
4. `nfeChaveCheckDigit` / `isValidNfeChave`: módulo 11 clássico (pesos 2..9 cíclicos da direita para a
   esquerda; resto 0 ou 1 ⇒ 0). Testes: os dois fixtures **corrigidos** (comportamento 9) passam; os
   valores antigos (`…017`, `…025`) falham; chave com letra fora das posições 7–20 falha no regex.
   **Direto.**
5. A lib não importa nada de `features/`, não lança `ValidationError` (isso é do parser/DTO) — espelho de
   `lib/ofx.ts`. **Direto — fronteira.**

**B. DTOs ECD/ECF**

6. `SpedEcdDto.ts` e `SpedEcfDto.ts` passam a importar `CNPJ_REGEX`/`CPF_REGEX` de `lib/cnpj.ts` e os 4
   regex locais desaparecem (não pode sobrar cópia — clone de símbolo). Mensagens de erro atualizadas
   (não dizem mais "só números"). **Fork F-CNPJ-2** (só formato × formato + DV via `refine`).
7. Testes de DTO: declarante com `12ABC34501DE35` **aceito** nos dois DTOs; `12abc34501de35` (minúsculo)
   conforme F-CNPJ-1; `12ABC34501DE` (12) rejeitado; CPF de signatário continua `^[0-9]{11}$`; o refine do
   contador (`length !== 11`) continua rejeitando CNPJ como CPF. Os testes já existem
   (`dtos/__tests__/SpedEcdDto.test.ts`, `SpedEcfDto.test.ts`, `SpedEcfRealDto.test.ts` — verificado) —
   **estender**, não duplicar; o `SpedEcfRealDto` herda o `DeclarantSchema` da ECF e ganha o mesmo caso. **Direto.**
8. `UPDATE_DTO_SNAPSHOT=1` regenera `__dto-shapes__.json`; o diff mostra **exatamente** as 9 ocorrências
   de padrão trocadas e nada mais — o revisor confere o diff do snapshot linha a linha. **Direto — gate.**

**C. Parser e teste da NF-e (cédula E2 (h))**

9. **Corrigir os dois fixtures sintéticos:** CNPJs com DV válido (`12345678000195`, `98765432000198`) e
   chaves recalculadas (posições 7–20 = CNPJ do emitente; `cDV` recomputado). Todo teste que cita os
   valores antigos (`nfe.test.ts:74,76`, e os de `NfeImportService`/`NfeSaleReconciliationService` que
   usam `chaveAcesso`/`documentNumber` — o implementador faz o grep pelos literais) muda junto.
   **Direto (regra da cédula: fixture, não asserção).**
10. **Terceiro caso sintético com CNPJ alfanumérico** (cédula (h): "senão o teste passa com a rotina antiga
    e reprova o 1º fornecedor novo"): emitente `12ABC34501DE35`, chave
    `35 2509 12ABC34501DE 55 001 000000003 1 00000003 <cDV>`; passa por `parseNfe` e pela asserção 11.
    **Fork F-CNPJ-5** (fixture XML separado × variante gerada em teste a partir do fixture de compra).
11. Asserção de coerência em `nfe.test.ts`, para **cada** fixture: `chaveAcesso.slice(6,20) ===
    emit.cnpj`, `isValidNfeChave(chaveAcesso)`, `isValidCnpj(emit.cnpj)`. **Direto.**
12. `nfe.ts`: o gate do `@Id` passa a `startsWith('NFe') && NFE_CHAVE_REGEX.test(idAttr.slice(3))` com
    mensagem que cita o formato. **Fork F-CNPJ-4** (parar no regex × também exigir `cDV`/coerência com
    `emit/CNPJ` no parser, rejeitando com `ValidationError`).

**D. Contraparte**

13. `normalizeTaxId`: CPF (11 dígitos após tirar máscara) continua só-dígitos; CNPJ passa por
    `stripCnpjMask` (mantém letras, maiúsculo). Teste: `'12.ABC.345/01-DE35'` → `'12ABC34501DE35'`;
    `'882.440.449-40'` → `'88244044940'`. **Fork F-CNPJ-3** (incluir neste item × Achado).
14. `CounterpartyDto` mantém o `transform`; descrição OpenAPI do `taxId` deixa de dizer "só-dígitos".
    Snapshot (comportamento 8) cobre. **Depende de F-CNPJ-3.**

**E. Gates**

15. `cd server && npx tsc --noEmit` limpo; jest unit da accounting + `lib` verdes; **nenhuma** rota,
    controller, service, policy, evento de audit ou migração nova ⇒ sem path-count, sem allowlist, sem
    smoke-migration-gate. **Direto.**
16. Texto "14 dígitos (só números)" existe **só** nas mensagens Zod dos dois DTOs (verificado: 0
    ocorrências em `docs.paths.ts`); as descrições `@openapi` de `cnpj`/`identCpfCnpj`/`taxId` que o
    implementador tocar passam por `npm run docs:generate` — `openapi.json` nunca à mão. **Direto — gate.**

## Forks — ✅ RATIFICADOS 2026-09-07 (dono, `AskUserQuestion`, fork a fork)

| Fork | Decisão do dono | Contra a recomendação? | Efeito no checklist |
|---|---|---|---|
| **F-CNPJ-1** | **(b) no DTO, (a) na lib** — DTO rejeita minúscula; `stripCnpjMask` põe em maiúsculas | não | comportamentos 1 e 7 como escritos |
| **F-CNPJ-2** | **(a) só formato nos DTOs**; DV na lib e na asserção da NF-e | não | comportamento 6 sem `refine`; "Insumos ausentes" (varredura de CNPJ fictício) **não se aplica** |
| **F-CNPJ-3** | **(a) incluir a contraparte** neste item | não | comportamentos 13 e 14 **entram** no escopo |
| **F-CNPJ-4** | **(b) também no parser** — `nfe.ts` rejeita com `ValidationError` chave fora do regex, `cDV` inválido e `chave.slice(6,20) !== emit.CNPJ` | **SIM** — recomendação era só regex no parser | comportamento 12 vira: regex **+** `isValidNfeChave` **+** coerência com `emit/CNPJ`, cada um com mensagem própria e teste de rejeição; a asserção 11 continua no teste. Risco aceito por escrito: rejeitador sobre leiaute entendido por transcrição (F-I2) — se o XML real (E9) reprovar nota autorizada, é achado de domínio, emenda aqui |
| **F-CNPJ-5** | **(a) variante gerada no teste** | não | comportamento 10 como escrito |

Tabela original (caminhos + recomendação), mantida como registro:

| Fork | Caminhos | Recomendação + justificativa | Custo de errar |
|---|---|---|---|
| **F-CNPJ-1 — minúsculas** | (a) `stripCnpjMask` põe em maiúsculas e o DTO aceita depois de normalizar · (b) rejeitar minúscula no DTO (só `[A-Z0-9]`) | **(b) no DTO, (a) na lib.** O SPED exige a forma exata (§2.4); o DTO é fronteira e deve receber o canônico; a lib normaliza para quem lê de fonte suja (XML, cadastro). Não pôr `transform` nos DTOs SPED — hoje eles não transformam nada e o snapshot ficaria com forma diferente do que o usuário mandou | baixo |
| **F-CNPJ-2 — DV nos DTOs ECD/ECF** | (a) só formato (como hoje, que também não confere DV) · (b) formato + `refine(isValidCnpj)` | **(a).** A cédula pede tipagem, não validação nova; (b) muda comportamento para tenants/fixtures com CNPJ fictício (`ecf.ts:457` usa `11111111000191`, seeds e testes idem) e o PVA já confere DV — duplicar o oráculo aqui só cria falso vermelho. DV fica na lib e na asserção da NF-e. Reabrir quando houver cliente real com CNPJ inválido passando (não vai haver: o PVA barra) | baixo; (b) exige varrer todo CNPJ fictício do repo |
| **F-CNPJ-3 — contraparte** | (a) incluir `normalizeTaxId` + DTO neste item · (b) registrar como Achado para item próprio | **(a).** Mesma classe transversal que a triagem chamou de T10; sem isso o 1º fornecedor alfanumérico entra na contraparte com o CNPJ **mutilado em silêncio**, que é pior que rejeitar; diff de ~10 linhas + teste; sem migração | (b) deixa perda silenciosa de dado até o item próprio |
| **F-CNPJ-4 — rigor do parser da NF-e** | (a) regex da chave no parser + coerência/`cDV` **só no teste** (letra da cédula (h)) · (b) coerência e `cDV` também no parser, `ValidationError` | **(a).** Uma NF-e autorizada pela SEFAZ já tem chave íntegra; o parser confere `@Id == protNFe/chNFe` (`nfe.ts:283`). (b) adiciona um rejeitador sobre XML real que nunca vimos (dívida F-I2) — se o entendimento do leiaute estiver errado, (b) rejeita nota válida em produção; (a) só quebra o teste | (b) falso negativo em produção |
| **F-CNPJ-5 — forma do caso alfanumérico** | (a) 3º fixture `purchase-alnum.SYNTHETIC.xml` · (b) variante gerada no teste por `replace` sobre o fixture de compra (CNPJ + chave recomputada) | **(b).** Zero arquivo novo, chave recalculada pela própria lib (prova a lib duas vezes), e o `it.todo` de proveniência (E9) continua contando 2 fixtures sintéticos, não 3. (a) só se o XML real (E9) mostrar que o fixture de compra não serve de base | baixo |

## Pendente de validação externa

- **ECD:** o Manual da **ECD** não está no repo nem em `luminaris-gates\` — não verifiquei se o leiaute
  da ECD do ano-calendário 2025 declara `CNPJ` como `C 014`. O item troca o regex nos dois DTOs por
  simetria e pela IN RFB 2.229/2024 (fonte secundária); **a prova é o PVA da ECD (H1)**. Se o validador
  da ECD 10.4.1 rejeitar letra no 0000, o achado é de domínio: emenda aqui, não hotfix.
- **Fontes primárias** da NT 2026.004 e da IN 2.229/2024 continuam pendentes (portal com redirect loop;
  triagem T10). O exemplo `12ABC34501DE → 35` bate com o algoritmo, mas o exemplo em si veio de fonte
  secundária.
- **XML real (E9):** se a chave real vier em forma diferente da NT (ex.: CNPJ com letra fora das
  posições 7–20), o regex de F-CNPJ-4 (a) é o que quebra — de propósito, no teste.

## Insumos ausentes

- Nenhum que bloqueie. Se **F-CNPJ-2 → (b)**, o implementador precisa da lista de todo CNPJ fictício em
  fixtures/seeds (`grep -rn "000191\|0001[0-9][0-9]'" server/src`) — não varri, pela regra 2.

## Achados fora de escopo (registrados, não planejados)

1. **`ValidationUtils.isValidCnpj` (DynamicTable)** faz `\D` e exige 14 dígitos: qualquer campo `cnpj`
   de preset (CRM/clientes) **rejeita** CNPJ alfanumérico. Item próprio, módulo diferente; a correção
   natural é consumir `lib/cnpj.ts` (reuso, não segunda cópia). Blast radius = todo preset com campo
   `cnpj`/`cpf_cnpj`.
2. **FE:** máscaras/inputs de CNPJ (se existirem fora do `SpedGenerationPanel`) e o placeholder de
   `CreateCounterpartyModal.tsx:171` — sem regex hoje; quando o FE do X10 (emissão) nascer, o mesmo
   regex canônico deve ser espelhado em `lib/` do `my-app`.
3. **`isValidCpf` do DynamicTable** também não confere DV — fora deste item (CPF não muda com a IN 2.229).
4. **Dívida de fila:** a cédula E2 punha este BRIEF como pré-requisito do merge da NF-e; o #267 mergeou
   sem ele. Registrado no grafo (X6b); nada a corrigir em código por isso.

## Risco principal e vieses (T8)

- **Risco principal:** o algoritmo dos DV foi verificado contra **um** exemplo público e a
  compatibilidade numérica; fonte primária pendente. Mitigação: o comportamento 2 fixa três vetores de
  teste; se a primária mostrar outro peso, um teste fica vermelho e a correção é local.
- **Viés desta sessão:** recomendações favorecem **menos regra nova** (F-CNPJ-2 a, F-CNPJ-4 a) por
  ponytail e pela lição F-I2 (leiaute entendido ≠ leiaute real). Quem preferir falhar cedo escolhe (b)
  nos dois e aceita varrer os CNPJs fictícios do repo.
- **Viés de escopo:** incluí a contraparte (F-CNPJ-3) por ser a mesma classe; a letra da cédula só cita
  lib + 4 regex. O dono decide se "transversal" inclui o cadastro.
