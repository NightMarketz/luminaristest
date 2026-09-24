# BRIEF — BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13 · perfil de obrigações por empresa, regime × porte)

> **Estado: BRIEF pronto.** Forks do PRE-ADR (F-OBP-0..9) **RATIFICADOS pelo dono em 2026-09-24**, todos na
> recomendação. **8 forks novos de implementação (F-XP-1..8) ✅ RATIFICADOS pelo dono em 2026-09-24, todos na
> recomendação** (chat: *"Ratifico todos os F-XP na recomendação, executa X13 PR-1"*). **PR-1 autorizado**; PR-2 e PR-3
> ainda exigem "executa" próprio. Escrito em `sessao-planejamento`, 2026-09-24.

---

## Contexto fixo (não rediscutir)

- **Item:** nó **[[X13]]** (`docs/plano/nos/X13.md`).
- **Autorização:** PRE-ADR `docs/adr/ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md` aceito. Dono, chat de 24/09:
  *"Ratifico todos os forks na recomendação e pode disparar aqui já"*. Decisão registrada em
  `docs/plano/decisoes/D-2026-09-24-FISCAL-OBLIGATION-PROFILE.md`. **Cobre o BRIEF, não o código.**
- **Decisões que este BRIEF materializa (não reabrir):** F-OBP-0 (c) modelo para os 4 regimes, sem cálculo de
  Simples/MEI · F-OBP-1 (a) model por empresa · F-OBP-2 (a) `MEI` no enum · F-OBP-3 (a) matriz em const TS ·
  F-OBP-4 (a) 4 estados · F-OBP-5 (c) porte declarado + aviso · F-OBP-6 (c) wizard pergunta regime/porte, o resto
  vai no formulário · F-OBP-7 (a) prefill + sobrescrita + 400 · F-OBP-8 (a) por ano · F-OBP-9 (a) `CompanySigner`.
- **Fatos consumados do código (lidos em 24/09):**
  - `AccountingScope` = `{ ownerUserId, actorUserId, unitId }`: toda rota resolve escopo **com** `unitId`
    (`features/accounting/scope/AccountingScope.ts:12-48`).
  - [[R8]]: **instância = CNPJ raiz**, unidade = filial. Portanto "empresa" = `ownerUserId`. O perfil é chaveado
    por `(userId, anoCalendario)`, e o `unitId` da requisição só resolve escopo e policy.
  - `FiscalProfile` por unidade, regime `SIMPLES|PRESUMIDO|REAL` (`schema.prisma:1303-1347`); cadeia completa em
    `controllers/fiscalProfileController.ts`, `FiscalProfileService`, `FiscalProfileRepository` (upsert limpa
    `deletedAt`, `:17-24`), policy `canReadFiscalProfile`/`canManageFiscalProfile` (`IAccountingPolicy.ts:100-101`).
  - Geração SPED: `POST /sped/ecd/generate`, `/sped/ecf/generate` (Presumido fixo), `/sped/ecf/real/generate`
    (`routes/accounting.ts:187-193`). Todas têm `year`. O **prefill já tem precedente no controller**:
    `expandSignerContacts` (`controllers/spedController.ts:16-72`, "via barata" F-CD8-a) expande
    `signerContactIds` antes do `.strict()` e **não toca serviço nem DTO de geração**.
  - Tabelas de qualificação **diferem** entre ECD (J930 `COD_ASSIN`) e ECF (0930 `IDENT_QUALIF`)
    (`models/spedQualifAssinante.ts:2-6`, F-C12-2 a).
  - Emissão: `opSimpNac` MEI = 2 está **fora do MVP** (`dtos/DpsPayloadDto.ts:38`).
- **Fontes normativas** (grau verificado): IN RFB 2.003/2021 art. 3º (ECD) e IN RFB 2.004/2021 arts. 1º e 7º (ECF),
  corpus `docs/accounting/fontes-oficiais/*.txt`. LC 123/2006 art. 18-A §1º (MEI é optante do Simples) e Lei
  11.638/2007 art. 3º p.ú. (grande porte), Planalto, baixados em 24/09.

## 1. O que o nó é

O sistema passa a saber, **por empresa e por ano**, o regime, o porte e as condições que mudam as obrigações. Com
isso ele (1) diz quais obrigações SPED se aplicam e por quê, citando a norma; (2) guarda uma vez os dados do livro e
dos signatários; (3) preenche a geração ECD/ECF e recusa gerar para o regime errado; (4) pergunta regime e porte no
onboarding. Não calcula tributo e não cria obrigação nova (DAS, PGDAS-D, EFD-Contribuições ficam fora, §7).

## 2. Checklist de comportamentos

Cada item é testável sozinho. **[N]** = fonte normativa citada; **[D]** = decisão ratificada.

### PR-1 — Perfil, signatários, matriz e endpoint de obrigações

1. **Schema** — migração com `CompanyFiscalProfile` e `CompanySigner` (§4.1). SQLite: prólogo `IF EXISTS`
   (memória `migracao-sqlite-nao-e-transacional`). `@@unique([userId, anoCalendario])`. Soft-delete com restauração
   no upsert, no mesmo padrão do `FiscalProfileRepository.upsert`. `resetDb()` passa a limpar as 2 tabelas: a guarda
   derivada do schema do #231 reprova se faltar. [D F-OBP-1/8/9]
2. **Const de regime** — `models/regimeEmpresa.ts`: `REGIMES_EMPRESA = ['MEI','SIMPLES','PRESUMIDO','REAL']` e
   `regimeUnidadeEsperado(regime)`: MEI e SIMPLES → `SIMPLES`, os demais → o próprio. [D F-OBP-2]
3. **Matriz** — `models/obrigacoesPorRegime.ts` com **só as linhas de fonte verificada** (§4.2): ECD e ECF × 4
   regimes, com `fonte` e `vigenteDesde` em cada linha. Teste de tabela: uma asserção por linha, com o inciso da IN no
   nome do teste. [N IN 2.003 art. 3º; IN 2.004 art. 1º; LC 123 art. 18-A §1º] [D F-OBP-3]
4. **Resolvedor** — `resolverObrigacoes(perfil)`, função pura, sem I/O:
   - resposta de condição `null` → `CONDICIONAL`, com `perguntaPendente`;
   - resposta preenchida → o status final.
   Precedência na ECD do Presumido: `inativa` → `NAO_SE_APLICA`; `aporteInvestidorAnjo` ou
   `distribuicaoAcimaBase` → `OBRIGATORIA` (§2º/§3º vencem a dispensa); `livroCaixaSemEscrituracao` → `FACULTATIVA`
   (§1º V + §6º); caso contrário → `OBRIGATORIA`. Um teste por ramo. [N IN 2.003 art. 3º §§1º-3º, 6º] [D F-OBP-4]
5. **DTO** — `CompanyFiscalProfileDto.ts`, `.strict()` (§4.3). O `superRefine` recusa:
   - bloco `ecf` em MEI/SIMPLES;
   - condições `livroCaixaSemEscrituracao`/`distribuicaoAcimaBase` fora do PRESUMIDO;
   - `ecdNire` sem `ecdIndNire='1'`.
   Snapshot de shape atualizado.
6. **Cadeia** — Route → Controller → Service → Repository → Prisma, com Factory. Policy: **reusa**
   `canReadFiscalProfile`/`canManageFiscalProfile` (mesma régua de quem mexe no perfil fiscal). Rotas (§4.4):
   `GET|PUT /api/accounting/company-fiscal-profile/:ano`, `DELETE` idem (soft). `unitId` na query/corpo só para o
   escopo; o repositório filtra por `userId` + `ano`. Registro em 2 toques: `routes/accounting.ts` + `docs.paths.ts`.
7. **Contador e signatário por referência** — `contadorContactId` precisa ser um `AccountingContact` vivo do mesmo
   dono (cross-tenant → 404, nunca 403, como em `expandSignerContacts`). `representanteLegalSignerId` segue a mesma
   regra contra `CompanySigner`. Arquivar um contato referenciado → 409 (FK `Restrict`).
8. **`CompanySigner` CRUD** — `GET|POST /company-signers`, `GET|PUT|DELETE /company-signers/:id`. Campos no §4.1:
   - `qualifEcd` ∈ `SPED_ECD_QUALIF_ASSINANTE_CODES`, sem `900` (contador mora em `AccountingContact`);
   - `qualifEcf` ∈ tabela 0930, sem `900`;
   - CPF com DV (`lib/cpf`).
   [D F-OBP-9]
9. **Endpoint de obrigações** — `GET /company-fiscal-profile/:ano/obligations` → §4.5. Sem perfil no ano → 200 com
   `perfil: 'AUSENTE'` e lista vazia; o status do perfil é dado, não erro. Cada item traz `faltantes[]`:
   - ECD aplicável sem `ecd.*` → `['ecd.numOrd', …]`;
   - sem representante legal → `['representanteLegalSignerId']`;
   - sem contador → `['contadorContactId']`;
   - ECF aplicável sem `ecf.*` → os campos do `ecf`.
   É o mesmo padrão de `fiscalProfileEmissaoStatus`.
10. **Auditoria** — eventos `company_fiscal_profile.updated|deleted` e `company_signer.created|updated|deleted` na
    allowlist de `auditCanonical.ts`, **sem nome, CPF, e-mail ou fone** do signatário. Teste-guarda de PII no mesmo PR
    (memória `accounting-audit-allowlist-guards`).
11. **Gates do PR-1** — `tsc` nos dois pacotes, snapshot de shape, path-count do openapi (`npm run docs:generate`),
    `npm run test:integration` (`--runInBand`).

### PR-2 — Geração SPED lê o perfil; consistência com a unidade

12. **Prefill no controller** — em `spedController.ts`, um passo `expandCompanyProfile(body, user, target)` **antes**
    de `expandSignerContacts`. Se existe perfil para `body.year`:
    - ECD: preenche `declarant.indGrandePorte`, `book.{indNire,nire,numOrd,natLivr}` e os signatários (contador via
      `contadorContactId`, pelo mesmo `contactToJ930Signer`; representante legal via `CompanySigner`);
    - ECF: preenche `fiscal.indAliqCsll`, `fiscal.indRecReceita` e o 0930 dos dois signatários.
    **Campo presente no corpo vence** (sobrescrita explícita, nunca ignorada) e a resposta lista
    `sobrescritos: string[]`. Serviços e DTOs de geração **não mudam**, como no item 15 do BRIEF do C6b. [D F-OBP-7]
13. **Gate de regime** — com perfil no ano:
    - `/sped/ecf/generate` com regime ≠ PRESUMIDO → 400 `REGIME_DIVERGENTE`;
    - `/sped/ecf/real/generate` com regime ≠ REAL → 400;
    - ECF de MEI/SIMPLES → 400 `OBRIGACAO_NAO_SE_APLICA`, citando IN 2.004 art. 1º §1º I;
    - ECD nunca é recusada por regime (facultativa, IN 2.003 art. 3º §6º).
    Sem perfil: ver **F-XP-1**. [N] [D F-OBP-7]
14. **Aviso de grande porte** — ao gerar a ECD do ano N com `grandePorte=false|null`, o serviço de perfil calcula do
    razão, no **exercício N-1**, o ativo total e a receita bruta. Acima de R$ 240 mi ou R$ 300 mi → `avisos[]` na
    resposta; **não bloqueia**, porque o "conjunto sob controle comum" não é visível ao sistema. Contas de ativo e de
    receita bruta vêm do referencial já mapeado: ver **F-XP-6**. [N Lei 11.638 art. 3º p.ú.] [D F-OBP-5]
15. **Consistência unidade × empresa** — `PUT /fiscal-profile` (por unidade) com `regimeTributario ≠
    regimeUnidadeEsperado(perfil do ano corrente)` → 400. O ano corrente é o de `scopeToday` (ADR de fuso), não o de
    `new Date()`. O caminho inverso fica no **F-XP-8**. [D F-OBP-1]
16. **Trava do regime** — ver **F-XP-5**. Na opção recomendada: `POST /company-fiscal-profile/:ano/ecf-transmitida
    { recibo }` grava `ecfRecibo` e `regimeTravadoEm`; depois disso um `PUT` que mude `regime` → 409
    `REGIME_TRAVADO`, citando IN 2.004 art. 7º §2º. Os outros campos seguem editáveis. [N] [D F-OBP-8]
17. **Emissão de MEI** — com perfil MEI, `fiscalProfileEmissaoStatus` inclui o faltante
    `'regime MEI — emissão fora do escopo (opSimpNac=2)'` e a emissão fica bloqueada (**F-XP-4**).
18. **Gates do PR-2** — snapshot, openapi, integração; teste do `expandCompanyProfile` com corpo vazio, com corpo
    completo (nada sobrescrito além do que veio) e com sobrescrita parcial.

### PR-3 — Captura no onboarding (depende de [[I1]]; serial com I1 e I8, que mexem no mesmo corpo)

19. **Corpo do `POST /dashboard/create`** — ganha `fiscal?: { regime: REGIMES_EMPRESA | 'NAO_SEI', grandePorte?:
    boolean | null }` (`.strict()`). Com `regime` conhecido, o controller cria o `CompanyFiscalProfile` do ano
    corrente **depois** da unidade (no mesmo padrão de dois passos + compensação do F-I1-4 b) e, se a unidade não
    tiver `FiscalProfile`, cria um com `regimeUnidadeEsperado`. `'NAO_SEI'` → não cria nada; a resposta traz
    `data.fiscal.status = 'pendente'`. [D F-OBP-6]
20. **Wizard (entrevista)** — o turno de conclusão pede regime e porte com a opção "não sei — o contador informa". O
    rótulo pt/en do MEI e dos regimes entra com paridade i18n (`my-app/public/locales/{pt,en}`). É uma pergunta
    fechada: o modelo não infere o regime a partir da conversa (W3, gates determinísticos).
21. **Resposta do create** — `data.fiscal: { status: 'criado' | 'pendente', ano, obrigacoes?: ObrigacaoResolvida[] }`
    (reusa o resolvedor do item 4).
22. **Gates do PR-3** — snapshot do DTO de criação, i18n, integração do create com e sem `fiscal`.

## 3. Forks — ✅ RATIFICADOS 2026-09-24 (todos na recomendação: F-XP-1 c · 2 a · 3 a · 4 a · 5 a · 6 a · 7 a · 8 a)

- **F-XP-1 — Geração SPED sem perfil no ano.** (a) 400 `PERFIL_FISCAL_AUSENTE` desde o PR-2. (b) Segue como hoje,
  com `avisos: ['perfil fiscal ausente']`. (c) (b) até o PR-3 entrar e (a) depois. **Recomendação: (c).** O F-OBP-6
  ratificou "a geração exige o perfil completo", mas o runbook do H1 gera sem perfil hoje; (a) imediato trava o H1 por
  dado que o D8 ainda nem trouxe.
- **F-XP-2 — Dados cadastrais do declarante (0000/0030: nome, endereço, IE, IM, `codMun`).** (a) Entram no perfil
  do ano, com `POST /:ano/copiar-de/:anoAnterior`. (b) Continuam no corpo. **Recomendação: (a).** É o mesmo "digitar
  todo ano" que motivou o nó, e há preferência do dono por completude. **Risco:** amplia o §4.3 além do contrato do
  PRE-ADR, por isso é fork.
- **F-XP-3 — Cópia de ano anterior sem F-XP-2.** Se F-XP-2 → (b), o endpoint de cópia ainda vale para
  livro/CSLL/signatários? (a) Sim. (b) Não. **Recomendação: (a).** O `numOrd` muda por ano; o resto costuma repetir.
- **F-XP-4 — Emissão de MEI.** (a) Bloqueada com faltante explícito (item 17). (b) Implementar `opSimpNac=2` agora.
  **Recomendação: (a).** A emissão inteira espera D5/M2 (X10i); abrir um ramo novo antes disso é YAGNI.
- **F-XP-5 — Como o sistema sabe que a ECF foi transmitida.** (a) O operador informa o recibo (item 16). (b) Trava
  quando existe job de ECF do ano. (c) Sem trava, só auditoria. **Recomendação: (a).** A transmissão é humana (PVA,
  P4), e gerar arquivo ≠ transmitir, então (b) travaria cedo demais.
- **F-XP-6 — Fonte do aviso de grande porte.** (a) Saldos do razão no fim de N-1: ativo pelo grupo 1 do referencial
  mapeado, receita bruta pelas contas de receita bruta do split por natureza. (b) Só declarado, sem aviso.
  **Recomendação: (a)**, e o aviso diz de onde veio o número. Depende do mapeamento referencial do ano estar
  completo; sem ele, sem aviso.
- **F-XP-7 — Obrigações sem fonte verificada (EFD-Contribuições, DCTFWeb, PGDAS-D, DEFIS, DASN-SIMEI, EFD ICMS/IPI).**
  (a) Fora da matriz até ter fonte (§5). (b) Na matriz com status `FONTE_PENDENTE`. **Recomendação: (a).** A regra 3
  da sessão não deixa entrar regra sem artefato, e um status "talvez" na tela ensina o operador a ignorar a lista.
- **F-XP-8 — `PUT` do perfil da empresa com unidades divergentes.** (a) Aceita e devolve `unidadesDivergentes[]`.
  (b) Recusa com 409 até as unidades serem corrigidas. (c) Atualiza o `regimeTributario` das unidades em cascata.
  **Recomendação: (a).** (b) deixa a troca de regime em dois passos sem atomicidade. (c) mexe em `pisCofinsRegime`
  por consequência, que tem regra própria no DTO do X6.

## 4. Contratos esboçados

### 4.1 Prisma

```prisma
model CompanyFiscalProfile {
  id                        String    @id @default(cuid())
  userId                    String    // ownerUserId = instância = CNPJ raiz (R8)
  user                      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  anoCalendario             Int
  regime                    String    // MEI | SIMPLES | PRESUMIDO | REAL (models/regimeEmpresa.ts)
  grandePorte               Boolean?  // null = "não sei"
  inativa                   Boolean   @default(false)   // IN 2.003 art. 3º §1º III; IN 2.004 art. 1º §1º III
  aporteInvestidorAnjo      Boolean?  // IN 2.003 art. 3º §2º
  livroCaixaSemEscrituracao Boolean?  // só PRESUMIDO — IN 2.003 art. 3º §1º V
  distribuicaoAcimaBase     Boolean?  // só PRESUMIDO — IN 2.003 art. 3º §3º
  ecdIndNire                String?   // '0' | '1'
  ecdNire                   String?
  ecdNumOrd                 String?
  ecdNatLivr                String?
  ecfIndAliqCsll            String?   // '1' (9%) | '4' (15%) — só PRESUMIDO/REAL
  ecfIndRecReceita          String?   // '1' caixa | '2' competência
  contadorContactId         String?
  contadorContact           AccountingContact? @relation(fields: [contadorContactId], references: [id], onDelete: Restrict)
  representanteLegalSignerId String?
  representanteLegalSigner  CompanySigner?     @relation(fields: [representanteLegalSignerId], references: [id], onDelete: Restrict)
  ecfRecibo                 String?   // F-XP-5 (a)
  regimeTravadoEm           DateTime?
  createdById               String?
  updatedById               String?
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt
  deletedAt                 DateTime?
  @@unique([userId, anoCalendario])
  @@map("company_fiscal_profiles")
}

model CompanySigner {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  nome        String    // PII — nunca em payload de auditoria
  cpf         String    // 11 dígitos com DV
  qualifEcd   String    // J930 COD_ASSIN (≠ 900)
  qualifEcf   String    // 0930 IDENT_QUALIF (≠ 900)
  email       String
  fone        String    // 0930 exige FONE
  createdById String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  profiles    CompanyFiscalProfile[]
  @@index([userId])
  @@map("company_signers")
}
```

### 4.2 Matriz (linhas verificadas; nada além disto no PR-1)

| obrigação | regime | status base | condições que mudam | fonte |
|---|---|---|---|---|
| ECD | REAL | OBRIGATORIA | `inativa` → NAO_SE_APLICA | IN 2.003 art. 3º caput, §1º III |
| ECD | PRESUMIDO | OBRIGATORIA | `livroCaixaSemEscrituracao` → FACULTATIVA; `aporteInvestidorAnjo` ou `distribuicaoAcimaBase` → OBRIGATORIA (vence); `inativa` → NAO_SE_APLICA | IN 2.003 art. 3º §1º III/V, §§2º, 3º, 6º |
| ECD | SIMPLES | FACULTATIVA | `aporteInvestidorAnjo` → OBRIGATORIA | IN 2.003 art. 3º §1º I, §2º, §6º |
| ECD | MEI | FACULTATIVA | — (ver §5 item 2) | IN 2.003 art. 3º §1º I, §6º + LC 123 art. 18-A §1º |
| ECF | REAL | OBRIGATORIA | `inativa` → NAO_SE_APLICA | IN 2.004 art. 1º caput, §1º III, §2º (é o Lalur) |
| ECF | PRESUMIDO | OBRIGATORIA | `inativa` → NAO_SE_APLICA | IN 2.004 art. 1º caput, §1º III |
| ECF | SIMPLES | NAO_SE_APLICA | — | IN 2.004 art. 1º §1º I |
| ECF | MEI | NAO_SE_APLICA | — | IN 2.004 art. 1º §1º I + LC 123 art. 18-A §1º |

```ts
type StatusObrigacao = 'OBRIGATORIA' | 'CONDICIONAL' | 'FACULTATIVA' | 'NAO_SE_APLICA';
interface LinhaMatriz {
  obrigacao: 'ECD' | 'ECF';                 // cresce só com fonte (F-XP-7)
  regime: RegimeEmpresa;
  statusBase: StatusObrigacao;
  condicoes: Array<{ chave: keyof CondicoesPerfil; quandoTrue: StatusObrigacao; pergunta: string; fonte: string }>;
  fonte: string;
  vigenteDesde: string;                     // date-only; IN 2.003 = '2021-01-18', IN 2.004 = '2021-01-18'
}
```

### 4.3 DTO

```ts
export const UpsertCompanyFiscalProfileSchema = z.object({
  unitId: z.string().min(1),                                   // escopo/policy apenas
  regime: z.enum(REGIMES_EMPRESA),
  grandePorte: z.boolean().nullable().default(null),
  inativa: z.boolean().default(false),
  condicoes: z.object({
    aporteInvestidorAnjo: z.boolean().nullable().default(null),
    livroCaixaSemEscrituracao: z.boolean().nullable().default(null),
    distribuicaoAcimaBase: z.boolean().nullable().default(null),
  }).strict().default({}),
  ecd: z.object({ indNire: z.enum(['0','1']), nire: z.string().optional(),
                  numOrd: z.string().min(1), natLivr: z.string().min(1).max(80) }).strict().optional(),
  ecf: z.object({ indAliqCsll: z.enum(['1','4']), indRecReceita: z.enum(['1','2']) }).strict().optional(),
  contadorContactId: z.string().min(1).nullable().optional(),
  representanteLegalSignerId: z.string().min(1).nullable().optional(),
}).strict().superRefine(/* item 5 */);
// :ano no path — z.coerce.number().int().gte(2014).lte(2100)  (ECF desde 2014, IN 2.004 art. 1º)
```

### 4.4 Rotas novas (openapi +6 paths)

`GET|PUT|DELETE /api/accounting/company-fiscal-profile/{ano}` ·
`GET /api/accounting/company-fiscal-profile/{ano}/obligations` ·
`POST /api/accounting/company-fiscal-profile/{ano}/ecf-transmitida` (F-XP-5 a) ·
`GET|POST /api/accounting/company-signers` · `GET|PUT|DELETE /api/accounting/company-signers/{id}`
(+ `POST .../{ano}/copiar-de/{anoAnterior}` se F-XP-2/3 → a).

### 4.5 Resposta de obrigações

```ts
{ ano: number; perfil: 'COMPLETO' | 'INCOMPLETO' | 'AUSENTE'; regime?: RegimeEmpresa;
  obrigacoes: Array<{ obrigacao: 'ECD' | 'ECF'; status: StatusObrigacao; fonte: string;
                      perguntaPendente?: string; faltantes: string[] }>;
  avisos: string[] }            // ex.: grande porte (item 14), unidades divergentes (F-XP-8 a)
```

## 5. Pendente de validação externa

1. Linhas da matriz para EFD-Contribuições, DCTFWeb, PGDAS-D, DEFIS, DASN-SIMEI, EFD ICMS/IPI (por UF), eSocial/Reinf.
   Insumo parcial: tabela de obrigações do contador (triagem 23/09, item 1/10). Cada linha precisa da norma no corpus
   antes de entrar (F-XP-7).
2. **MEI com aporte de investidor-anjo:** o §2º da IN 2.003 fala em "microempresa ou empresa de pequeno porte". Falta
   fonte que diga se o MEI está nesse conjunto; até lá a linha MEI não tem a condição.
3. **Pergunta ao contador (junto do D8):** *"Para empresas do Simples e do Presumido que você atende, em quais casos
   você entrega a ECD?"* Calibra o texto das `pergunta` do §4.2 com a prática.
4. Presumido com livro caixa **e** escrituração completa no Luminaris: a dispensa do §1º V vale mesmo assim? O
   resolvedor segue a letra; o contador confirma a leitura.

## 6. Insumos ausentes

- Texto bruto da tabela de obrigações do contador (só a triagem está no repo).
- Os binários do corpus (Guia EFD-Contribuições, manuais ECD L9/ECF L12) não estão neste worktree; os `.txt` das IN sim.
- Qual grupo do referencial é "ativo total" e quais contas são "receita bruta" para o aviso do item 14: confirmar no
  código do split por natureza ao implementar (F-XP-6).

## 7. Achados fora de escopo (não planejar; exigem autorização própria)

- Cálculo de DAS/PGDAS-D, fator R, DEFIS, DASN-SIMEI → X7 / Onda 3 (F-OBP-0 c).
- Emissão NFS-e de MEI (`opSimpNac=2`) → X10i (F-XP-4).
- Entidades imunes/isentas (IN 2.003 art. 3º §1º IV; IN 2.004 obriga) — regime fora do enum; só com cliente real.
- SCP e livro próprio (IN 2.003 §5º; IN 2.004 art. 1º §3º).
- FE: `FE-INCR-FISCAL-OBLIGATION-PROFILE` (formulário, lista de obrigações, esconder geração que não se aplica) é
  incremento separado, depois do PR-1.

## 8. Gates de envio do PR de implementação

- `cd server && npx tsc --noEmit` · `cd my-app && npx tsc --noEmit` (PR-3).
- Snapshot de shape dos DTOs · allowlist `auditCanonical.ts` + teste-guarda de PII · openapi `npm run docs:generate`
  + guard de path-count · paridade i18n (PR-3) · `npm run test:integration` isolado (memória
  `jest-concorrente-windows-ebusy-test-db`).
- Smoke de migração contra cópia do `dev.db` real (`server/prisma/prisma/dev.db`): as 2 tabelas nascem vazias, nada
  é migrado. Um S6 vacuoso é esperado e **declarado** (memória `smoke-gate-s6-x-migracao-de-dado`).
- Fold: `docs/plano/nos/X13.md` + `node scripts/plano-vault.mjs index && … check`.
