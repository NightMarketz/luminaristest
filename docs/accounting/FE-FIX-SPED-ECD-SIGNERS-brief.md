# BRIEF — FE-FIX-SPED-ECD-SIGNERS (ECD pela tela: signatário J930 fora do contrato do C12)

> Produzido por **sessão de planejamento** em 28/09/2026. Sem código de aplicação.
> **Forks F-1..F-4 RATIFICADOS pelo dono em 28/09/2026 (questionário em chat), todos → (a).** "Executa" (chat, 28/09):
> *"Me entrevista para as resposta e já dispara com as respostas em mãos"* — cobre as sessões A (instrumentação) e B (correção).

## 0. Cabeçalho

- **Autorização (chat, 28/09/2026):** *"Planeje a correção com granularidade"* — dada logo após o relatório da
  varredura FE×DTO (autorizada no mesmo chat: *"autorizo a varredura FE×DTO strict como exceção à moratória"*), cuja
  única divergência confirmada é esta. Cobre **planejar**; não cobre instrumentar, corrigir nem ratificar fork.
- **Divergência de escopo (passo 1):** a autorização nomeia "a correção" da divergência D1 (`identQualif`). A leitura
  do contrato mostrou que **corrigir só o D1 não entrega o objetivo** (ECD gerável pela tela): o mesmo commit abriu uma
  segunda face (§1, F3–F4). O BRIEF planeja as duas porque o objetivo sob a letra é a geração, e registra a escolha
  no fork F-1 — se o dono quiser só o D1, o checklist encolhe para C-1/T-1.
- **Base:** `origin/main` = `7ce5fdd2` (buscado nesta sessão).

## 1. Fatos (grau: verificado = executado nesta sessão; lido = leitura de código)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| F1 | O FE manda `signers[].identQualif` na ECD; o `SignerSchema` J930 `.strict()` recusa | sonda `SpedEcdRequestSchema.safeParse` com o payload de `SpedGenerationPanel.tsx:111-117` + `emptyEcdSigner` (`:67-73`) → `unrecognized_keys ["identQualif"]` em `signers.0` | verificado |
| F2 | O corpo do FE chega intacto ao `.strict()`: prefill do perfil fiscal só mexe em `signers` quando o corpo **não** os traz | `spedController.ts:168-170`, `spedPerfilPrefill.ts:95-108` | lido |
| F3 | **Sem `identQualif`, a ECD continua 400:** contador (`codAssin='900'`) exige `indCrc`, `email`, `fone`, `ufCrc` e CPF de 11 dígitos — o editor ECD não tem nenhum desses campos | sonda com o signatário no formato pós-fix → 4 issues `signers.0.{indCrc,email,fone,ufCrc}`; mesmo payload + os 4 campos → `OK`. Regra em `SpedEcdDto.ts:167-210` | verificado |
| F4 | A tela **exige** um contador antes do submit (`validateEcdSigners`, `SpedGenerationPanel.tsx:45-47`) → todo submit que passa na validação local cai no F3 | leitura | lido |
| F5 | F1 e F3 nasceram no **mesmo commit** `edb80ec8` (C12, #353, 20/09). Antes: `identQualif: z.string().min(1)` e sem regra de CRC → a tela funcionava | `git show edb80ec8~1:…SpedEcdDto.ts` × `edb80ec8` | verificado |
| F6 | Chave opcional **vazia** no signatário é 400: `indCrc: ''` (formato do CRC) e `ufCrc: ''` (enum UF); a mesma linha **omitindo** as chaves passa | sonda casos C/D | verificado |
| F7 | `ufCrc` tem de bater com a UF embutida no `indCrc` (`SP123456/O-8` + `ufCrc:'RJ'` → 400); `indCrc` sem UF (`123456`) → 400 de formato | sonda casos E/F; `SpedEcdDto.ts:152-166` | verificado |
| F8 | ECF e ECF Real **não** têm o problema: payload no formato do FE → `OK` nas duas | sonda | verificado |
| F9 | i18n: `sped.field.indCrc`, `sped.field.email`, `sped.field.fone` já existem em pt/en; `sped.field.ufCrc` não existe; `sped.field.qualifDesc` só é usado na linha que sai (`SpedGenerationPanel.tsx:388`) | `public/locales/{pt,en}/accounting.json:414-422`, grep | lido |
| F10 | **Trabalho paralelo não commitado:** o worktree `ecstatic-haibt-11235f` (branch `claude/finalizacao-modulos-fiscal-contabil-financeiro-d0a1b5`) tem o "PR-0" (remove `identQualif` de tipo/estado/input + teste vitest), a linha do GAP-MAP N3 e `docs/accounting/PLANO-ONDA1-FE-2026-09-28.md`. Aquele plano diz que o PR-0 destrava "geração da ECD pela tela → H1" (§2) — **F3 desmente**. O item 4 do SPED-SIGNERS daquele plano (§5.1) manda "marcar como obrigatórios" CRC/e-mail/fone/UF, supondo campos que a linha da ECD não tem | `git diff` naquele worktree, leitura | lido |

## 2. Checklist

### Sessão A — `sessao-instrumentacao` (só `my-app/features/accounting/components/__tests__/SpedGenerationPanel.test.tsx`)

Cada teste nasce **vermelho em `main`** pelo motivo declarado; nenhum arquivo de aplicação é tocado.

- **T-1 [direto]** Payload ECD: nenhum `signers[i]` tem a chave `identQualif`.
  Vermelho esperado: `expect(signer).not.toHaveProperty('identQualif')` recebe `identQualif: ''`.
  (Reaproveita o teste já escrito no worktree paralelo — ver F-4.)
- **T-2 [direto]** Linha contador (`900`) preenchida com CRC, e-mail, fone e UF do CRC → o payload leva
  `indCrc`, `email`, `fone`, `ufCrc` com os valores digitados.
  Vermelho esperado: a query pelo campo de CRC/UF da linha ECD não encontra o elemento (o campo não existe).
- **T-3 [direto]** `validateEcdSigners` (função pura) devolve `'ecdContadorCrc'` para contador sem qualquer um de
  `indCrc`/`email`/`fone`/`ufCrc`, ou com CPF ≠ 11 dígitos; devolve `null` com os quatro + CPF 11.
  Vermelho esperado: recebe `null`.
- **T-4 [direto]** Linha não-contador com CRC/e-mail/fone/UF em branco → o payload **omite** as quatro chaves (F6).
  Declarado: **verde em `main` por vacuidade** (hoje a linha não tem essas chaves) — é guarda de regressão da correção,
  não prova de lacuna.

> **Executado 28/09 — T-1, T-2 e T-4 fundidos num caso de UI** (patch, não mudança de escopo): um T-1 isolado que
> submete contador sem CRC não sobrevive ao C-5 (a tela passa a bloquear o submit) — teria de ser reescrito na
> correção, o que anula o guarda. O caso único afirma, nesta ordem: a linha oferece CRC/E-mail/Fone/UF do CRC
> (`aria-label="UF do CRC"`) → sem `identQualif` → `toStrictEqual` do J930 (contador com os 4, não-contador sem
> vazios). Em `main` quebra na 1ª asserção (`expected [] to have a length of 2 but got +0`); a face `identQualif`
> fica provada pela sonda F1 e é exercida depois do fix. T-3 = 2º caso (`indCrc: expected null to be
> 'ecdContadorCrc'`). Transporte do F-4: só a ideia do teste e o texto da linha do GAP-MAP; o diff do worktree
> paralelo não foi copiado (o caso dele fica inválido após C-5 pelo mesmo motivo).

### Sessão B — `sessao-correcao` (faz T-1..T-4 passarem; nada além)

- **C-1 [direto]** Tirar `identQualif` de `EcdSigner` (`my-app/lib/services/sped.service.ts:35`), de `emptyEcdSigner`
  (`SpedGenerationPanel.tsx:70`) e o input da linha `:388`.
- **C-2 [direto]** `EcdSigner` ganha `indCrc?`, `email?`, `fone?`, `ufCrc?` (as chaves opcionais do `SignerSchema`
  que a regra do contador exige); `emptyEcdSigner` inicializa `''`.
- **C-3 [fork F-2, F-3]** Editor ECD (`EcdSignersEditor`) ganha os campos CRC, E-mail, Fone e UF do CRC.
- **C-4 [direto]** Submit monta cada signatário por um mapper puro `toEcdSignerPayload(row)` que emite **só** as
  chaves do contrato e **omite** string vazia/whitespace — substitui o `signers: ecdSigners` (spread do estado inteiro,
  o padrão que vazou). Exportado para T-4 testar direto.
- **C-5 [direto]** `validateEcdSigners`: contador exige CPF 11 + `indCrc` + `email` + `fone` + `ufCrc` → `'ecdContadorCrc'`.
  Artefato de origem: `SpedEcdDto.ts:167-210` (REGRA_OBRIGATORIO_CONTADOR, Manual ECD L9 p. 202, citado no DTO).
  Espelha `validateEcfSigners` (`'ecfContadorCrc'`, `:62-63`).
- **C-6 [direto]** i18n pt/en no mesmo diff: `sped.field.ufCrc`, `sped.error.ecdContadorCrc`; remove
  `sped.field.qualifDesc` (órfã após C-1).
- **C-7 [direto]** Fixture `ecd()` do arquivo de teste perde `identQualif`; fixtures de contador ganham os 4 campos
  (senão os testes existentes de validação quebram por C-5, não por regressão).
- **C-8 [direto]** GAP-MAP N3: a linha "SPED ECD pela tela…" passa a nomear as duas faces (F1 + F3) e o status
  vira `[CORRIGIDO <data>]` com o comando que prova. Onde a linha mora depende de F-1.

### Gates (entram no checklist, não ficam a critério)

- **G-1** `cd my-app && npx tsc --noEmit` limpo.
- **G-2** `cd my-app && npx vitest run features/accounting/components/__tests__/SpedGenerationPanel.test.tsx` verde
  (shim `globalThis.React`; sem `waitFor(toHaveBeenCalled)` sobre handler async).
- **G-3** Paridade i18n pt/en das chaves de C-6.
- **G-4** Sonda descartável **antes do merge** (não commitada): o payload capturado no T-2 →
  `SpedEcdRequestSchema.safeParse` → `success: true`. É a única ponte FE↔BE sem browser — os testes FE mockam o service,
  que é exatamente por onde a regressão passou (CBM-001).
- **G-5** `cd my-app && npm run build` (tela atrás de `withAuth`).
- **G-6** Sign-off de browser = **humano (H2)**: gerar a ECD pela aba Compliance contra cópia do `dev.db` real com o
  server no commit exato → 200 + download. A linha do runbook nasce em branco; agente não preenche.

Sem toque de BE → sem snapshot de shape, `docs.paths`, openapi nem `auditCanonical`.

## 3. Contratos

```ts
// BE — FATO, não muda (server/src/features/accounting/dtos/SpedEcdDto.ts:135-151, .strict())
// SignerSchema J930 = { identNom, identCpfCnpj, codAssin(enum), indCrc?, email?, fone?, ufCrc?(enum UF),
//                       numSeqCrc?, dtCrc?, indRespLegal: 'S'|'N' }
// + superRefine: codAssin==='900' ⇒ CPF 11 ∧ indCrc ∧ email ∧ fone ∧ ufCrc; ufCrc === UF embutida no indCrc.
// Chave opcional com '' é 400 (F6) — ausência é o único "vazio" aceito.

// FE — my-app/lib/services/sped.service.ts
export interface EcdSigner {
  identNom: string;
  identCpfCnpj: string;
  codAssin: string;            // 3 dígitos ('900' = contador)
  indRespLegal: 'S' | 'N';
  indCrc?: string;             // obrigatório se codAssin === '900'
  email?: string;              // idem
  fone?: string;               // idem
  ufCrc?: string;              // idem — UF_CODES
}

// FE — mapper puro (SpedGenerationPanel.tsx, exportado)
export function toEcdSignerPayload(row: EcdSigner): EcdSigner;
// saída: só as 8 chaves acima; valores trim(); chave opcional cujo trim() === '' é OMITIDA.

// FE — validateEcdSigners(signers): 'signersRequired' | 'signersIncomplete' | 'ecdRespLegal'
//                                  | 'ecdContador' | 'ecdContadorCrc' (novo) | null
```

`numSeqCrc`/`dtCrc` (opcionais, sem regra condicional) ficam fora — não são exigidos para gerar.

## 4. Forks — RATIFICADOS 28/09/2026 (todos → a)

| Fork | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-1** | Relação com o PR-0/PR-2 do `PLANO-ONDA1-FE-2026-09-28` (não commitado, F10) | Este BRIEF **substitui** o PR-0 e absorve o item 4 do SPED-SIGNERS; o PR-2 fica só com combobox/tabela | Manter PR-0 como está e deixar CRC no SPED-SIGNERS | PR-0 como está **e** este BRIEF logo depois como PR-0b | **(a)**: PR-0 sozinho não muda nada visível (F3+F4: todo submit válido segue 400) e o PR-2 depende de 2 forks F-FE-SG ainda abertos — (b) deixa a ECD quebrada até eles; (c) paga dois ciclos de review pelo mesmo arquivo |
| **F-2** | Origem do `ufCrc` | `<select>` com `UF_CODES` (já exportado em `SpedGenerationPanel.tsx:23`), divergência com o CRC reportada pelo BE | Derivar da UF embutida no `indCrc`, sem campo | Input livre | **(a)**: (b) reimplementa no FE o `normalizeCrcNumber` do BE (dois donos da mesma regra); a mensagem do BE para divergência já é precisa (F7) e chega via `resolveError` |
| **F-3** | Quais campos cada linha mostra | Os 4 campos em toda linha (mesmo layout do `EcfSignersEditor`) | CRC/UF só quando `codAssin==='900'`; e-mail/fone sempre | Os 4 só na linha contador | **(a)**: consistência com o editor da ECF na mesma tela, zero lógica de visibilidade; o C-4 omite o que ficar vazio (F6) |
| **F-4** | O diff já escrito no worktree `ecstatic-haibt-11235f` (teste + remoção do `identQualif`) | Transportar como 1º commit da sessão A/B (T-1 e C-1 já prontos) | Reescrever do zero | — | **(a)** (T6: patch sobre trabalho já ~certo, nunca rewrite) — mas é WIP de outra sessão: só com o "ok" do dono sobre aquele worktree |

## 5. Pendente de validação externa

- Formato do CRC (`UF-NNNNNN/O-D`) e REGRA_OBRIGATORIO_CONTADOR: o FE espelha o BE; a verdade é o Manual ECD L9 p. 202
  citado no DTO — não reconferido na fonte primária nesta sessão.
- ECD gerada pela tela aceita no PVA = gate **H1**, humano.

## 6. Insumos ausentes

- O PR-0, o plano ONDA1 e a linha do GAP-MAP só existem como mudança **não commitada** em outro worktree: não há
  commit a citar. F-1/F-4 dependem do dono dizer o destino daquele trabalho.

## 7. Achados fora de escopo (não planejados)

- `codAssin` (ECD) e `identQualif` (ECF) seguem input livre contra enum fechado no BE — é o SPED-SIGNERS (PR-2 do plano
  ONDA1), não esta correção.
- Varredura FE×DTO: o grep `\.strict()` não pega `z.strictObject(...)` (CRM); NF-e de imobilizado (CFOP 1551) sem
  `classId` no FE — registrados no relatório da varredura de 28/09.
