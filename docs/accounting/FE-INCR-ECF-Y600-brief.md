# FE-INCR-ECF-Y600 — painéis da ECF (Presumido e Real) coletam o Y600 (BRIEF)

> **Sessão:** `sessao-planejamento`, sem código. Nenhum fork se auto-ratificou: os F-FE-Y600-1..6 do §4 estão
> **RATIFICAÇÃO PENDENTE**.
> **Item:** passo 14 do H2 (`docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md`, branch `claude/gate-copilot-h2-9782b8`,
> PR #982), marcado FALHOU pelo dono em 29/10. Achado fora de escopo do BE: `BE-INCR-ECF-Y600-brief.md` §7, *"FE-INCR-ECF-Y600
> (vizinho, não planejado aqui)… Exige autorização própria"*.
> **Autorização (dono, chat, 2026-10-29):** *"Pode disparar uma sessão de correção"*; perguntado qual sessão disparar,
> *"As duas"*, sendo esta a de **planejamento** do Y600. Cobre **este BRIEF** e a nota do nó. Não dá `executa`; a
> `sessao-feature` exige autorização própria. Os itens condicionais a F-FE-Y600-1 (b) e F-FE-Y600-2 (a) incluem
> código de backend e uma tela de cadastro. Estão aqui como **caminhos de fork**, não como escopo já autorizado.
> **Base:** `origin/main` em `778d867c` (29/10).

## Contexto fixo

- **Falha verificada (H2, 29/10, passo 14, evidência no runbook do PR #982):**
  - ECF Presumido pela tela (Contabilidade → Compliance), tenant `seed-presumido` com o sócio do H1 cadastrado:
    400 `ECF_Y600_COMPLEMENTO_FALTANDO`.
  - ECF Real pela tela, tenant `seed-real` sem sócio: 400 `ECF_Y600_SEM_SOCIOS`.
- **Causa no código (verificada, leitura):**
  - `my-app/features/accounting/components/SpedGenerationPanel.tsx:367-368`: o Presumido manda `socios: []` fixo, com o
    comentário *"a tela ainda não coleta sócios… FE próprio pendente"*.
  - `my-app/features/accounting/components/SpedEcfRealPanel.tsx:121-122`: o Real faz o mesmo.
  - Os dois painéis não mandam `dirigentes`, que o DTO aceita e põe `[]` por default.
- **Backend em `main` (verificado, leitura), BE-INCR-ECF-Y600 com os forks F-Y600-1..10 em (a)
  ([`D-2026-10-22-ECF-Y600-FORKS`](../plano/decisoes/D-2026-10-22-ECF-Y600-FORKS.md)):**
  - `server/src/features/accounting/dtos/SpedEcfDto.ts:167-276` traz `Y600ValoresSchema`, `RepresentanteLegalSchema`,
    `Y600_QUALIF` (01..17), `SocioEcfSchema`, `DirigenteEcfSchema` e `refineEcfY600` (partnerId único; `dtFimSoc` do
    dirigente ≥ `dtAltSoc` e dentro do ano). Em `SpedEcfRequestSchema`, `socios` é obrigatório (`max(999)`) e
    `dirigentes` tem default `[]`.
  - `server/src/features/accounting/dtos/SpedEcfRealDto.ts:80-91` reusa os mesmos schemas e o mesmo refine.
  - `server/src/features/accounting/services/y600FromPartners.ts` (`montarY600`) lê **todas** as vigências vivas pelo
    repositório e fica com as que cruzam o ano (`entradaEm ≤ 31/12` e `saidaEm` nulo ou `≥ 01/01`). Exige complemento para
    cada uma (`ECF_Y600_COMPLEMENTO_FALTANDO`, `details.partnerIds`) e recusa complemento fora do ano
    (`ECF_Y600_PARTNER_FORA_DO_ANO`). Também recusa `pais` incoerente com a residência (`ECF_Y600_PAIS_INCOERENTE`), `qualif`
    fora da tabela por caso (`ECF_Y600_QUALIF_INCOERENTE`, inclusive o representante PJ fora de 01/06), a ausência de
    qualquer ocorrência (`ECF_Y600_SEM_SOCIOS`) e o excesso de linhas (`ECF_Y600_LIMITE`). As mensagens citam `partnerId`,
    nunca nome nem CPF.
  - `server/src/lib/apiUtils.ts:39-40` repassa `details` do `ValidationError` no corpo do 400.
- **Contratos gerados (verificado, leitura):** `my-app/types/contracts/accounting/SpedEcfDto.gen.ts` já exporta
  `SocioEcfInput`, `DirigenteEcfInput`, `RepresentanteLegalInput`, `Y600ValoresInput`, e `SpedEcfRequestInput` com `socios`
  e `dirigentes?`. O mesmo vale para `SpedEcfRealDto.gen.ts`. `my-app/lib/services/sped.service.ts:29-30` monta
  `GenerateEcfPayload`/`GenerateEcfRealPayload` a partir deles. Os tipos já existem e o FE não usa nenhum.
- **Cadastro de sócios (verificado, leitura):**
  - O BE tem `GET/POST/PUT/DELETE /accounting/partners` (`server/src/routes/accounting.ts:477-481`, IRRF-DISTRIBUICAO
    PR-1, #794). O tipo do request está em `PartnerDto.gen.ts` (`CreatePartnerInput`, `ListPartnersQueryInput { unitId;
    data? }`).
  - **O FE não consome nenhuma dessas rotas.** Não há service, hook nem tela de sócios no `my-app`: o grep por `partners`
    em `lib/`, `features/` e `pages/` não acha nada. Os sócios do DEFIS são outra coisa: linhas de DynamicTable
    (`features/accounting/lib/defisSocios.ts`).
  - **`GET /accounting/partners?data=` devolve só quem está vigente numa data** (`PartnerService.list`, linhas 53-66:
    `filter(vigenteEm(p, dia))`, com hoje por default). Já o `montarY600` exige complemento de toda vigência que **cruza o
    ano**, inclusive a de quem saiu no meio dele. Nenhuma rota de leitura devolve esse conjunto. É o F-FE-Y600-1.
- **Dirigentes (verificado, leitura):** no BE, `dirigentes` é um array transiente do request (F-Y600-5). O cadastro mais
  próximo é o de signatários, `CompanySigner` (`/accounting/company-signers`, `CompanySignerDto.gen.ts`: `nome`, `cpf`,
  `qualifEcd`, `qualifEcf` na tabela 0930), que **também não tem FE** e usa outra tabela de qualificação (0930 ≠ QUALIF
  do Y600). É o F-FE-Y600-3.
- **Canônicos do FE que o item reusa (verificado, leitura):**
  - de `SpedGenerationPanel.tsx`: `Field`, `inputClass` e o padrão de editor de linhas `EcfSignersEditor` (adicionar e
    remover linha, `FiPlus`/`FiTrash2`);
  - `features/accounting/lib/parseBrl.ts` (dinheiro → centavos, canônico, "do not re-inline") e `formatCents.ts`;
  - `features/accounting/lib/simplesGrid.ts:90` `formatBp` e `lib/services/fixedAssets.service.ts:124` `percentToBp`;
  - `features/accounting/lib/resolveError.ts` `resolveErrorWithCode` (devolve `code`; **não** devolve `details`);
  - `lib/utils/nonEmpty.ts`.
- **Nós vizinhos:** consome [BE-INCR-ECF-Y600] (sem nó próprio: vive no gate [[H1]] e na decisão
  [[D-2026-10-22-ECF-Y600-FORKS]]) e o cadastro `Partner` de [[IRRF-DISTRIBUICAO]] (PR-1). Destrava o passo 14 do [[H2]]
  e, mais tarde, a ECF do 1º cliente pela tela. O H1 gera pela API (RUNBOOK-H1, passo 6) e não depende deste nó.

## 0. Onde vive

É só tela. O Y600 é **saída de arquivo** do gerador da ECF, que é Prisma first-class (ADR-INCR-SPED-ECF). O complemento é
transiente no request, pelo padrão D4 do declarante e dos signatários, conforme F-Y600-2 (a). Nada toca DynamicTable.
Arquivos do FE: `my-app/features/accounting/**` e `my-app/lib/services/**`. O único toque no BE é condicional ao
F-FE-Y600-1 (b) ou (a): leitura, sem write-path novo.

## 1. Regras que a tela espelha (artefato de origem)

A tela **não decide** regra fiscal. Ela espelha o que o DTO e o serviço já recusam, para o erro aparecer antes do POST. A
fonte de cada regra é o BE em `main` e, por trás dele, o Manual ECF L12 ([D01] do dossiê
`pesquisas-legais/ecf-y600/relatorio.md`).

| # | Regra espelhada | Fonte no BE | [D01] |
|---|---|---|---|
| R1 | Toda vigência do ano precisa de complemento; complemento de vigência fora do ano é recusado | `y600FromPartners.ts:56-75` | p. 570 (M2/M3) |
| R2 | Os 5 valores são obrigatórios e explícitos, sem default zero | `Y600ValoresSchema`; F-Y600-3 (a) | p. 570 (M4) |
| R3 | QUALIF por caso: Brasil+PF {01,02,09..17}; Brasil+PJ {03,04}; exterior+PF {05,06,14}; exterior+PJ {07,08}; o 18 é recusado | `QUALIF_POR_CASO`; F-Y600-9 | pp. 572, 574 |
| R4 | `pais` só para não residente, com 3 dígitos e ≠ 105 | `SocioEcfSchema.pais` + `ECF_Y600_PAIS_INCOERENTE`; F-Y600-10 | pp. 571, 574 (M9) |
| R5 | Representante legal: CPF e qualif juntos ou nenhum; PF {01..06}, PJ {01,06} | `RepresentanteLegalSchema` + `QUALIF_REP_LEG_PJ` | pp. 573–574 (M12) |
| R6 | Dirigente: CPF de 11 dígitos com DV; qualif {10..17}; `dtFimSoc ≥ dtAltSoc` e dentro do ano | `DirigenteEcfSchema` + `refineEcfY600` | pp. 571, 574 (M8) |
| R7 | Pelo menos uma ocorrência (sócio ou dirigente) | `ECF_Y600_SEM_SOCIOS`; F-Y600-7 | p. 56 (M1) |
| R8 | `percCapVotBp` opcional; vazio = participação do cadastro | `SocioEcfSchema`; F-Y600-3 | p. 572 |

## 2. Checklist de comportamentos

Cada item é testável sozinho. Os itens marcados *(F-FE-Y600-n)* seguem a **recomendação** do fork. A recomendação
**não está ratificada**: se o dono escolher outro caminho, o item muda.

### PR-0 — leitura das vigências do ano (BE, só se F-FE-Y600-1 = (b); some se for (c))

1. **`GET /accounting/sped/ecf/y600/vigencias?unitId&year`** *(F-FE-Y600-1)*: devolve as vigências que o `montarY600`
   vai exigir, **pela mesma função**. Extrair de `montarY600` um `selecionarVigenciasDoAno(vivos, year)` puro, que
   devolve as vigências do ano com `vigenteNoFim` e `dtFimSoc` calculados (saída de fato × mudança de participação, item 10
   do BRIEF do BE). O `montarY600` passa a chamar essa função: **um lugar só**. Cadeia de camada inteira: rota →
   controller → serviço (`SpedEcfGenerationService` ou um serviço de leitura próprio, pela factory) → `IPartnerRepository.list`.
   A policy de leitura é a mesma do `PartnerService.list` (`access: 'read'`). DTO Zod `.strict()` para a query.
2. **Testes do PR-0:** (a) função pura: vigência que sai no meio do ano entra, com `dtFimSoc`; mudança de participação
   (saída + sucessora no dia seguinte) entra como duas vigências, sem `dtFimSoc` na primeira; vigência de outro ano fica
   fora; apagada fica fora. (b) Paridade: para o mesmo cadastro, o conjunto de `partnerId` da rota é **igual** ao que o
   `montarY600` exige. O teste monta o request com complemento só para os ids da rota e espera 2xx; tirar um id dá
   `ECF_Y600_COMPLEMENTO_FALTANDO`. (c) Tenancy: `unitId` de outro dono → 404. (d) PII: o payload de auditoria, se houver
   leitura auditada, não leva `taxId`.
3. **Gates do PR-0:** `dtoShapeSnapshot` com inserção só da entrada nova (memória "UPDATE do snapshot reordena"); o `.gen.ts`
   regenerado entra no mesmo PR; OpenAPI com o path novo e o guard de path-count atualizado (+1); `cd server && npx tsc
   --noEmit` + `tsconfig.test.json`; `npm run check:arch`; e o gate de wiring, se a rota entrar no registro.

### PR-1 — o editor do Y600 e os dois painéis (FE)

4. **Tipos (sem shape à mão).** Em `lib/services/sped.service.ts`, os aliases `SocioEcfInput`, `DirigenteEcfInput`,
   `RepresentanteLegalInput` e `Y600ValoresInput` saem por `import type` de `@/types/contracts/accounting/SpedEcfDto.gen`.
   O tipo da vigência vem do `.gen.ts` do PR-0 (ou de `PartnerDto.gen.ts`, se F-FE-Y600-1 = (c)). Método novo no service:
   `listY600Vigencias(unitId, year)`. Nenhum import do backend (memória "Tipos de payload do FE").
5. **Lógica pura em `features/accounting/lib/ecfY600.ts`** (vitest, sem DOM):
   - `Y600Draft` = `{ socios: Record<partnerId, SocioDraft>; dirigentes: DirigenteDraft[] }`, com strings de input
     (dinheiro, percentuais e datas como o usuário digita);
   - `qualifOptions(tipoPessoa, residenteBrasil)` devolve a lista do caso (R3) *(F-FE-Y600-4)*; `QUALIF_REP_LEG_OPTIONS(tipoPessoa)`
     devolve a do R5;
   - `validateY600Draft(vigencias, draft, year)` devolve o **primeiro** código de erro i18n ou `null`, cobrindo R1–R8. Os
     códigos: `y600.semOcorrencia`, `y600.qualifObrigatoria`, `y600.qualifIncoerente`, `y600.valorObrigatorio`,
     `y600.valorInvalido`, `y600.paisObrigatorio`, `y600.paisInvalido`, `y600.representanteIncompleto`, `y600.cpfInvalido`,
     `y600.dtFimForaDoAno`, `y600.dtFimAntesDoInicio`, `y600.percVotInvalido`. Campo de valor vazio é **erro**, nunca zero
     (R2);
   - `toY600Payload(vigencias, draft)` devolve `{ socios: SocioEcfInput[]; dirigentes: DirigenteEcfInput[] }`. Gera **um**
     complemento por vigência da lista, nunca por chave órfã do draft. Dinheiro sai por `parseBrl`, percentual por
     `percentToBp`. `pais` só sai para não residente, `percCapVotBp` só se preenchido e `representanteLegal` só com os dois
     campos. Strings aparadas. As chaves são só as do schema (`.strict()` no BE recusa chave extra).
6. **Hook `useY600Vigencias(unitId, year)`** em `features/accounting/hooks/`: busca quando o ano é válido (2015..2100),
   refaz a busca quando o ano muda e expõe `{ vigencias, loading, error, reload }`. Cancela a resposta velha se o ano
   mudar no meio (sem corrida).
7. **Componente `EcfY600Editor`** em `features/accounting/components/EcfY600Editor.tsx`. É **um** componente para os dois
   painéis, porque é o mesmo objeto de domínio: o BE reusa `SocioEcfSchema` no Real, como já faz com
   `EcfSignersEditor`/`SignerSchema`.
   - **Sócios:** uma linha por vigência, só leitura do cadastro: nome, PF/PJ, residência, participação (`formatBp`),
     entrada e saída. O CPF/CNPJ aparece mascarado, só os 4 últimos dígitos. Ao lado, os campos do complemento: `qualif`
     (select do caso, R3), `pais` (só não residente), voto em % (placeholder = participação), um representante legal
     opcional (CPF + qualif, R5) e os 5 valores em R$.
   - **Dirigentes:** editor de linhas no padrão `EcfSignersEditor`, com nome, CPF, qualif {10..17}, início, fim
     (opcional), representante (opcional) e os 5 valores *(F-FE-Y600-3)*.
   - **Estados:** carregando; erro de carga com "tentar de novo"; ano sem vigência mostra o aviso
     `sped.y600.semVigencias` ("Nenhum sócio com vigência em {ano}…"), com o link para o cadastro se F-FE-Y600-2 = (a);
     e o rodapé com a soma das participações vigentes em 31/12, **só informativa** (F-Y600-8: não bloqueia).
   - Classes `neutral-*` e `rounded-2xl`. `Field`/`inputClass` vêm de `SpedGenerationPanel`.
8. **Troca de ano:** o draft mantém o complemento dos `partnerId` que continuam na lista nova e descarta os outros. Os
   dirigentes ficam.
9. **Presumido (`SpedGenerationPanel.tsx`):** a seção ECF ganha o `EcfY600Editor` entre os signatários e o botão.
   `handleEcfGenerate` roda `validateY600Draft` antes do POST (o erro aparece no mesmo `ecfError`). O body usa
   `toY600Payload` no lugar de `socios: []`, e o comentário das linhas 367-368 sai.
10. **Real (`SpedEcfRealPanel.tsx`):** o mesmo, no lugar das linhas 121-122. O banner de esqueleto continua (F-COMP2-4).
11. **Erros do servidor:** os seis códigos `ECF_Y600_*` ganham mensagem i18n própria em `sped.error.ECF_Y600_*`, pelo
    `resolveErrorWithCode`. Em `ECF_Y600_COMPLEMENTO_FALTANDO` e `ECF_Y600_PARTNER_FORA_DO_ANO` a tela chama `reload()`
    das vigências, porque o cadastro mudou entre a carga e o POST, e mostra a mensagem. Nenhuma mensagem do FE repete nome
    ou CPF que venha do servidor.
12. **i18n:** as chaves novas `sped.y600.*` e `sped.error.ECF_Y600_*` entram em `public/locales/pt/accounting.json` e
    `en/accounting.json`, com paridade (gate de wiring). As descrições dos códigos QUALIF (01..17) e QUALIF_REP_LEG
    (01..06) são transcritas do [D01] p. 572–573 (ver §6, insumo ausente).
13. **Teste-guarda (o pedido: "gerar a ECF pela tela num tenant com sócio cadastrado deve dar 2xx").** Tem dois níveis.
    - **13a, automatizável, vermelho hoje:** `features/accounting/components/__tests__/EcfY600.guard.test.tsx` (vitest).
      O teste mocka `spedService.listY600Vigencias` com **uma** vigência PF residente (`partnerId: 'p1'`, 100%) e
      `spedService.generateAndDownloadEcf`/`generateAndDownloadEcfReal` resolvendo 2xx. Em cada painel, preenche o
      mínimo válido (declarante, signatários, `qualif 02` e os 5 valores `0`) e clica gerar. A asserção é que o service
      foi chamado com `socios: [{ partnerId: 'p1', qualif: '02', valores: { …zeros… } }]` e que a tela mostra sucesso, sem
      erro. **Hoje falha pelo motivo certo:** o body sai com `socios: []` (e o mock de listagem nem é chamado). O nome do
      `describe` cita `H2 passo 14`.
    - **13a', o par negativo:** com a mesma vigência e os valores **em branco**, o clique não chama o service e mostra
      `y600.valorObrigatorio` (R2).
    - **13b, oráculo real (gate humano, fora desta sessão):** reexecutar o passo 14 do RUNBOOK-H2 em build de produção. O
      Presumido usa o `seed-presumido`, com o sócio do H1. O Real usa o `seed-real` **depois de cadastrar um sócio**: pela
      tela, se F-FE-Y600-2 = (a), ou por `POST /accounting/partners`, se (b). Nos dois, o POST de geração tem de dar 2xx e
      baixar o arquivo. A evidência e o desfecho são do dono (RUNBOOK-FORMAT).
14. **Testes de unidade de `ecfY600.ts`:** um caso por código do item 5. `qualifOptions` nos 4 casos (o 18 nunca
    aparece). `toY600Payload` omite `pais` do residente, omite o representante incompleto (o validate já barrou), nunca
    emite chave fora do schema e emite um complemento por vigência, mesmo com chave órfã no draft. Dinheiro "1.234,56" vira
    123456.
15. **Gates do PR-1:** `cd my-app && npx tsc --noEmit` e `npm run test:types` (o tsc exclui testes); vitest do
    `features/accounting`; o shim de `React` global nos testes de componente; `npm run check:arch`; paridade i18n; e
    **verificação contra o build de produção** (tela atrás de `withAuth`). Nenhum `any`, nenhum `zinc-*`.

### PR-2 — cadastro de sócios na tela (só se F-FE-Y600-2 = (a))

16. **Seção "Sócios"** *(F-FE-Y600-2)*: lista, cria, edita e remove sócios por `/accounting/partners`, com tipos de
    `PartnerDto.gen.ts`. Campos do `CreatePartnerInput`: nome, CPF/CNPJ, residente, participação %, entrada e saída. Os
    `outrasParticipacoes` (do IRRF/Simples) ficam fora desta tela, ver §7. A lista mostra **todas** as vigências vivas
    (não só as de hoje), com filtro de data opcional (`data`) e o `aviso` de soma ≠ 100% que o BE já devolve. Os erros do
    BE aparecem pelo `resolveErrorWithCode`: sobreposição de vigência e 409 na remoção de sócio com distribuição
    (emenda do item 1 da cédula D-2026-10-28-LACUNAS-EXECUTA-27-28). Reuso: `GenericTable` (ou o padrão de lista das
    abas de cadastro de Contabilidade) e o `Modal` canônico. Onde a seção fica é o F-FE-Y600-5.
17. **Testes do PR-2:** CRUD com service mockado; a soma ≠ 100% mostra aviso e não bloqueia; o CPF com DV inválido mostra
    o 400 do BE (o FE não reimplementa o DV). Gates do item 15.

## 3. Contratos (esboço; nomes finais pelo `GENERATION_CONTRACTS.md`)

```ts
// PR-0 (F-FE-Y600-1 = b) — server/src/features/accounting/dtos/SpedEcfDto.ts
export const Y600VigenciasQuerySchema = z
  .object({ unitId: z.string().min(1), year: z.coerce.number().int().gte(2015).lte(2100) })
  .strict();

// Resposta (view, não DTO de entrada): o que o montarY600 vai exigir, calculado pela MESMA função.
interface Y600VigenciaView {
  partnerId: string;              // id da linha Partner (= SocioEcfInput.partnerId)
  nome: string;
  taxIdFinal: string;             // só os 4 últimos dígitos (PII: a tela não precisa do número inteiro)
  tipoPessoa: 'PF' | 'PJ';
  residenteBrasil: boolean;
  participacaoBp: number;
  entradaEm: string;              // YYYY-MM-DD = DT_ALT_SOC
  saidaEm: string | null;
  dtFimSoc: string | null;        // saída de fato no ano (item 10 do BE); null em mudança de participação
  vigenteNoFim: boolean;
}
interface Y600VigenciasView { year: number; vigencias: Y600VigenciaView[]; somaParticipacaoFimBp: number }
```

```ts
// PR-1 — my-app/features/accounting/lib/ecfY600.ts (tipos de payload só do .gen.ts)
import type {
  SocioEcfInput, DirigenteEcfInput, Y600ValoresInput,
} from '@/types/contracts/accounting/SpedEcfDto.gen';

export interface ValoresDraft { remTrab: string; lucDiv: string; jurCap: string; demRend: string; irRet: string } // R$ digitado
export interface RepresentanteDraft { cpf: string; qualif: string }                                              // '' = ausente
export interface SocioDraft { qualif: string; pais: string; percVot: string; rep: RepresentanteDraft; valores: ValoresDraft }
export interface DirigenteDraft {
  nome: string; cpf: string; qualif: string; dtAltSoc: string; dtFimSoc: string;
  rep: RepresentanteDraft; valores: ValoresDraft;
}
export interface Y600Draft { socios: Record<string, SocioDraft>; dirigentes: DirigenteDraft[] }

export function qualifOptions(tipo: 'PF' | 'PJ', residente: boolean): readonly string[];   // R3
export function qualifRepLegOptions(tipo: 'PF' | 'PJ'): readonly string[];                  // R5
export function validateY600Draft(v: readonly Y600VigenciaView[], d: Y600Draft, year: number): string | null;
export function toY600Payload(
  v: readonly Y600VigenciaView[], d: Y600Draft,
): { socios: SocioEcfInput[]; dirigentes: DirigenteEcfInput[] };
export const emptyValores = (): ValoresDraft => ({ remTrab: '', lucDiv: '', jurCap: '', demRend: '', irRet: '' }); // NUNCA '0'
```

```ts
// PR-1 — EcfY600Editor (mesmo componente nos dois painéis)
export interface EcfY600EditorProps {
  unitId: string;
  year: number | null;            // null = ano inválido → não busca
  value: Y600Draft;
  onChange: (next: Y600Draft) => void;
  /** Exposto ao painel para validar e montar o payload sem nova busca. */
  onVigencias?: (v: readonly Y600VigenciaView[]) => void;
}
```

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-FE-Y600-1** | De onde a tela tira a lista de vigências que o BE vai exigir | (a) parâmetro novo `ano` em `GET /accounting/partners`, que devolve as vigências que cruzam o ano; (b) rota de leitura da ECF, `GET /sped/ecf/y600/vigencias`, calculada pela **mesma** função do `montarY600` (PR-0); (c) sem BE: busca `?data=31/12` e, se o POST der `ECF_Y600_COMPLEMENTO_FALTANDO`, lê `details.partnerIds`, busca cada um por `GET /partners/:id` e pede o complemento | **(b)**: a regra de seleção (cruza o ano, saída de fato × mudança de participação) fica num lugar só, e a tela mostra exatamente o que o arquivo vai ter, inclusive o `DT_FIM_SOC`. Em (a), um conceito da ECF entra na lista do cadastro do IRRF, e a seleção ficaria duplicada ou acoplada. Em (c), o usuário com sócio que saiu no ano leva um 400 antes de poder preencher, e a tela precisaria do `details`, que o `resolveErrorWithCode` não expõe. Custo de (b): um PR de BE pequeno, só leitura, que **amplia** a autorização (toca `server/`) |
| **F-FE-Y600-2** | Cadastro de sócios pela tela | (a) PR-2 deste incremento: seção "Sócios" com CRUD de `/accounting/partners`; (b) fora: o sócio continua entrando por API ou seed, e a tela de cadastro vira nó próprio, junto do FE do IRRF (distribuição/JCP, que também não tem tela) | **(a)**: sem o cadastro, a ECF pela tela só funciona em tenant semeado. Num cliente novo, a tela manda cadastrar sócio em `/accounting/partners` (a própria mensagem do `ECF_Y600_SEM_SOCIOS` diz isso) e não existe onde. O H2 do Real também precisaria de API. Divergência registrada: amplia o item além do painel da ECF e por isso precisa do OK do dono. Se (b), o 13b do Real usa `POST /accounting/partners` |
| **F-FE-Y600-3** | Dirigentes (administrador ou conselheiro não sócio) | (a) editor de linhas manual no painel (transiente, como o BE); (b) o mesmo, mais um botão "trazer do cadastro de signatários" (`/accounting/company-signers`) que preenche nome e CPF | **(a)**: o signatário não é necessariamente dirigente, a qualificação dele (0930) não mapeia para o QUALIF 10..17 do Y600, e `company-signers` também não tem FE (seria um service novo para um atalho). (b) pode vir depois sem mudar o contrato |
| **F-FE-Y600-4** | O select de QUALIF filtra pelo caso (residência × PF/PJ)? | (a) filtra no FE com a tabela R3, num módulo puro citando p. 574 e com teste dos 4 casos; (b) mostra os 17 e deixa o BE devolver `ECF_Y600_QUALIF_INCOERENTE` | **(a)**: o erro do PVA vira opção que nem aparece. O custo é uma cópia da tabela do serviço; o BE continua a autoridade, e o teste do FE cita a mesma página. Se a tabela mudar no Manual, as duas mudam (registrar no comentário de `QUALIF_POR_CASO` do BE) |
| **F-FE-Y600-5** | Onde fica a seção "Sócios" (só se F-FE-Y600-2 = a) | (a) dentro da aba **Perfil fiscal**, como seção abaixo do perfil; (b) aba nova "Sócios" em `AccountingView`; (c) dentro de Compliance, acima da ECF | **(a)**: sócio é dado da empresa, como o perfil fiscal e o regime. Não é obrigação acessória (c), e não justifica aba nova (b) enquanto for uma lista curta. O link do item 7 aponta para lá |
| **F-FE-Y600-6** | O complemento (qualif, valores) persiste entre gerações? | (a) não: o draft vive só na tela, como o declarante e os signatários (D4); recarregar a página zera; (b) rascunho em `localStorage` por unidade e ano; (c) persistir no BE (model novo) | **(a)**: segue o D4 e o F-Y600-2 (a), ambos ratificados. (b) grava CPF de representante e dirigente no navegador (PII fora do servidor). (c) contradiz o F-Y600-2. A ECF é anual: refazer o preenchimento é custo pequeno |

Os forks do BE (F-Y600-1..10) estão ratificados e **não** se reabrem aqui. O R2 (sem default zero) segue o F-Y600-3:
nenhum botão "zerar tudo" entra no checklist.

## 5. Pendente de validação externa

- **P1 — 17 campos × exemplo de 16 (PVA).** Vem do BE (P1 do `BE-INCR-ECF-Y600-brief.md` §5). A tela não muda com isso,
  mas o 13b é a primeira vez que um Y600 gerado pela tela vai ao PVA (no H1, quando o passo 6 voltar).
- **P3/P4 do BE (contador).** Como dividir os valores entre duas vigências do mesmo sócio, e o que vai em
  `VL_REM_TRAB` × `VL_DEM_REND`. A tela não decide: cada vigência tem seus 5 campos, e o texto de ajuda **não** orienta o
  rateio. Só cita o campo do Manual.

## 6. Insumos ausentes

- **Descrição dos códigos QUALIF 01..17 e QUALIF_REP_LEG 01..06** ([D01] pp. 572–573): o BRIEF do BE e o dossiê guardam
  só as faixas por caso (p. 574), não o texto de cada código. A `sessao-feature` transcreve do PDF do Manual (o mesmo
  arquivo do [D01], sha256 `7216ec2b…`, no corpus local de fontes oficiais, fora do repo), com página citada no arquivo
  de i18n. Sem a transcrição, o select
  mostra só o código. Isso não bloqueia o 13a.
- **Tabela de países do Sped** (código do `PAIS`): igual ao BE (só dentro do PVA). A tela valida só o formato.

## 7. Achados fora de escopo

- **FE do IRRF-DISTRIBUICAO** (distribuição de lucros, JCP, IRRF mensal): as rotas `/accounting/profit-distributions*`
  estão em `main` (PR-2..4), e o `my-app` não as consome. Se F-FE-Y600-2 = (b), o cadastro de sócios vai junto desse nó.
- **Sugerir `VL_LUC_DIV`/`VL_JUR_CAP`/`VL_IR_RET` a partir dos eventos de distribuição.** Os eventos agora existem em
  `main`, o que não era verdade quando o BRIEF do BE escreveu o F-Y600-3. Derivar ou sugerir valor por sócio e ano exige
  agregação no BE e decisão do dono sobre "sugestão × declaração". É incremento próprio (já listado no §7 do BE).
- **`outrasParticipacoes` no cadastro de sócios** (usado pelo IRRF e pelo Simples): fica fora da seção do PR-2.
- **Achados de tela do H2** (F a J da sessão 3 do gate-copilot: linha de signatário estourando a largura, "Cash" sem
  tradução etc.): não são deste nó.
