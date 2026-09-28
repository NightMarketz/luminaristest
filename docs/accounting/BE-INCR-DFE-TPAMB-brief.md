# BRIEF — BE-INCR-DFE-TPAMB (o `tpAmb` da DPS vem do ambiente do documento)

> Produzido em `sessao-planejamento` (2026-09-28). **Este documento NÃO escreve código**: checklist, contratos
> esboçados e forks. **Forks F-AMB-1..6: RATIFICADOS 2026-09-28** conforme as recomendações — "Pode seguir com as recomendações e executa cada uma das duas" (dono, chat, 2026-09-28). Execução autorizada (instrumentação → correção).

**Em duas linhas:** `FiscalDocumentEmissionService.buildPayload` grava `tpAmb: 1` (produção) em **toda** DPS,
inclusive quando o `FiscalDocument` nasce `homologacao`. Isso contraria a spec ratificada do X10b (BRIEF
`BE-INCR-DFE` §1, linha `[103]`: *"`DFE_PARTNER_ENV`: producao=1, homologacao=2"*), então é um **defeito contra a
spec**, não uma decisão nova. **Risco principal:** o dano concreto está no **reenvio** (a porta vem do env e o
documento tem o ambiente dele) e no **FocusEmissor** que ainda vai existir. Hoje não sai nenhuma nota real (D5 e
M2 abertos).

---

## 0. Contexto fixo (não rediscutir)

- **Item a planejar:** corrigir o `tpAmb` fixo da DPS em
  `server/src/features/accounting/services/FiscalDocumentEmissionService.ts:625`. O nó de origem é o X10b (fato
  consumado, `docs/accounting/BE-INCR-DFE-brief.md`), vizinho de `DFE-MANUAL` (`docs/plano/nos/DFE-MANUAL.md`,
  `done`) e de `X10i` (`docs/plano/nos/X10i.md`, `blocked` por D5/M2/D1f).
- **Autorização (ORCH-006):** o dono escreveu em chat, em 2026-09-28, *"Planeje para corrigir"*, sobre este achado. O
  texto chegou pelo agente que despachou esta sessão.
  **Cobre:** este BRIEF (backend). **Não cobre:** código (a execução pede um "executa" à parte), o `FocusEmissor`
  (X10i, BRIEF só depois do D5), a tela (`FE-INCR-DFE`) e os achados da §9.
  A autorização cobre o item **exatamente**: não pede mais do que ele nem menos, então não há divergência a
  reportar (passo 1 da sessão).
- **Insumos lidos nesta sessão** (base: `origin/main` em `b385040e`):
  - `services/FiscalDocumentEmissionService.ts`:
    - `:122-131` `getStatus`.
    - `:174-252` `emit`. Chama `assemble` **antes** de `selectDfeEmissor`. `createSent` recebe
      `ambiente: selection.ambiente`. `port.emitir` recebe o mesmo `ambiente`.
    - `:361-376` `reassembleGroupForReenvio`, que chama o mesmo `assemble`.
    - `:380-563` `assemble`. Em `:509` a pré-condição (viii) (porta habilitada) é agregada a `faltantes`, e o lançamento
      do erro em `:523` acontece **antes** de `buildPayload`.
    - `:604-678` `buildPayload`, com **`tpAmb: 1` literal em `:625`**.
    - `:95-97` `buildDpsId`.
    - `:709-743` `toView`, que expõe `ambiente`.
  - `services/FiscalDocumentLifecycleService.ts`:
    - `:155-214` `reenviar`. Remonta o payload por `reassembleGroupForReenvio` (portanto com `tpAmb: 1`) e passa
      `ambiente: doc.ambiente` à porta, que vem de `portFor(doc)`.
    - `:105-125` `pollPendingOnce`.
    - `:301-318` `webhookReceived`, que usa `selectDfeEmissor(process.env)`.
  - `dtos/DpsPayloadDto.ts`:
    - `:23` `tpAmb: z.union([z.literal(1), z.literal(2)])`.
    - `:140-154` `DpsManualPayloadSchema` / `toManualDps`, que **mantêm** `tpAmb` (removem só `id`/`serie`/`nDPS`).
  - `dfe/DfeEmissorPort.ts:14,26-34,66-75`: `DfeAmbiente`, `EmitirInput.ambiente`, e `consultar`/`cancelar`
    **sem** ambiente.
  - `dfe/selectDfeEmissor.ts:23-43`: ambiente **só do env** (`DFE_PARTNER_ENV`).
  - `dfe/resolveEmissor.ts:16-22`: o adaptador sai do documento; o ambiente, não.
  - `prisma/schema.prisma:1473`: `FiscalDocument.ambiente String // producao | homologacao`.
    `:1531-1541`: `FiscalDocumentSequence @@id([userId, unitId, kind, serie])`, **sem ambiente**.
  - PR #410 (`origin/claude/fix-dfe-manual-guardas`, **aberto, não mergeado**): `lib/nfse.ts` passa a ler
    `infDPS/tpAmb` (`'1' | '2'`). `FiscalDocumentLifecycleService.retornoManual` ganha a guarda (v):
    `ambienteNota = nota.tpAmb === '1' ? 'producao' : 'homologacao'`, e se ela diverge de `doc.ambiente` o retorno é
    422 e nada é escrito.
  - Testes: `services/__tests__/FiscalDocumentEmissionService.test.ts:134-160,204,369,402,440,468-482` rodam **com
    `DFE_PARTNER_ENV=homologacao`** e nenhum assere `tpAmb`. `dtos/__tests__/DpsPayloadDto.test.ts:13` usa `tpAmb: 2`
    só no schema.
  - Docs: `docs/accounting/HANDOFF-2026-09-27-emissao-fiscal.md` §4 ("webhook compara o parceiro com o do env";
    "`id` da DPS nunca é refeito").
    `docs/adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md` §9.2 item 5 (`ambiente` é coluna; só `producao` vira
    `SourceDocument`) e §11.2 (a Focus homologa em `homologacao.focusnfe.com.br`).
    `docs/accounting/BE-INCR-DFE-MANUAL-brief.md` (itens 8, 14 e 15; p3).
    `docs/operating-manual/GAP-MAP.md:89` (a lacuna irmã do retorno manual, tratada pelo #410).

## 1. Fatos medidos (com grau)

| # | Fato | Grau | Evidência |
|---|---|---|---|
| M1 | O único escritor de `infDPS.tpAmb` no código de aplicação é o literal `tpAmb: 1` em `FiscalDocumentEmissionService.ts:625` | **verificado** (leitura + grep) | `grep -rn tpAmb server/src --include=*.ts` fora de `__tests__`: só o `:625`, o schema `:23` e o leitor da NF-e de **compra** (`lib/nfe.ts`, outro leiaute) |
| M2 | `emit`, `preview` e `reenviar` herdam o `1` porque todos passam por `assemble` → `buildPayload` | **verificado** (leitura) | `:180-201`, `:137`, `Lifecycle:168-181` |
| M3 | Domínio oficial do campo: **1 = Produção; 2 = Homologação** | **verificado na primária** | `NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx` (sha256 `de5bc492…e9eeb7c`), aba `LEIAUTE DPS_NFS-e `, **linha 103** (item 102), `NFSe/infNFSe/DPS/infDPS/tpAmb`: *"Identificação do tipo de ambiente no Sistema Nacional NFS-e: 1 - Produção; 2 - Homologação"* |
| M4 | O governo rejeita a DPS cujo `tpAmb` diverge do ambiente de recebimento (RN **E0006**) | **verificado na primária** | mesma planilha, aba `RN DPS_NFS-e`, linha 143 |
| M5 | O mapeamento do #410 (`'1'→producao`, senão `homologacao`) bate com M3 | **verificado** contra M3 | a lista de valores é fechada em `{1,2}` (o #410 recusa outro valor em `lib/nfse.ts`) |
| M6 | O que o portal público chama de "produção restrita" é o `tpAmb=2` do leiaute | **inferido** | o comentário do #410 e a p3 do BRIEF manual dizem isso; a primária diz "Homologação", **não** "produção restrita" |
| M7 | Hoje, com `DFE_PARTNER_ENV=homologacao`, o `payloadJson` gravado leva `tpAmb: 1` | **inferido por leitura** (M1+M2), **não executado** | o vermelho é a primeira entrega da sessão de instrumentação (§6) |
| M8 | O `dev.db` real não tem nenhum `FiscalDocument` | **verificado** | leitura somente-leitura de `server/prisma/prisma/dev.db` (`fiscal_documents` agrupado por ambiente/partner/status → `[]`), 28/09 |
| M9 | O ambiente de um documento novo é o do **env** no instante do `emit` e fica congelado na coluna. O reenvio usa `doc.ambiente`, mas a **porta** (e o destino dela) continua vindo do env | **verificado** (leitura) | `emit:210`; `Lifecycle:204`; `resolveEmissor.ts:18` devolve a instância do env quando o nome do parceiro coincide |

**O que o erro produz, por caminho.** Todas as linhas são **inferidas**, porque não existe adaptador real:
- **Emissão nova com parceiro em homologação.** A DPS sai com `tpAmb=1` e vai ao endpoint de homologação. Se o
  parceiro repassa o nosso `tpAmb`, o governo rejeita (E0006, M4): a falha é **ruidosa**, mas o documento fica
  `REJECTED` sem motivo nosso. Se o parceiro usa o ambiente do token, o `tpAmb` que gravamos é **mentira
  persistida** no `payloadJson`.
- **Reenvio depois que o env mudou de `homologacao` para `producao`** (o caso que o dono descreveu). O documento
  continua `homologacao`, mas a porta do env aponta para produção e a DPS leva `tpAmb=1`. Com isso, uma nota de
  teste sai **como nota de produção válida**, sem E0006 para barrar. É o único caminho **silencioso**.
- **Modo manual.** A ficha (`GET …/ficha`) mostra `tpAmb: 1` num documento `homologacao`. O operador que se guia
  pela ficha emite no portal errado. A guarda (v) do #410 barra o **retorno** (422), mas só depois de a nota existir.

## 2. Comportamento esperado

> **Fonte única:** `infDPS.tpAmb` de toda DPS montada (emissão, prévia, reenvio e ficha manual) é
> `tpAmbFor(ambiente)`, em que `ambiente` é o **mesmo valor** gravado, ou já gravado, em `FiscalDocument.ambiente`:
> `producao → 1`, `homologacao → 2` (M3). Nenhum literal de `tpAmb` fica no código de aplicação. A função de mapeamento
> existe **uma vez** e é a inversa exata da que a guarda (v) do #410 usa na leitura.

## 3. Checklist numerado

Classificação: **[direto]**, sem fork; **[cond:F-AMB-n]**, depende do fork; **[gate]**, gate que o diff aciona.
Todo item tem um **teste-guarda**. Os marcados ⛔ **falham hoje** e são o que a sessão de instrumentação entrega vermelho.

0. **[direto] Registro no GAP-MAP.** Nova linha em `docs/operating-manual/GAP-MAP.md`, Nível 1:
   *"DPS sempre `tpAmb=1` independentemente de `FiscalDocument.ambiente`"*, com status `[ABERTO]` e comando = o
   teste do item 1. A linha 89 (lacuna irmã, #410) é outra lacuna; as duas ficam referenciadas uma à outra.
   **Guarda:** a linha cita o comando `npx jest FiscalDocumentEmissionService -t tpAmb`, e o status só muda por esse
   comando.
1. ⛔ **[direto] Emissão em homologação.** `emit` com `DFE_PARTNER=null` e `DFE_PARTNER_ENV=homologacao` grava em
   `createSent` um `payloadJson` com `infDPS.tpAmb === 2` e `ambiente === 'homologacao'`.
   **Guarda** (unit, `FiscalDocumentEmissionService.test.ts`): assere os dois campos do **mesmo** objeto passado ao
   `createSent` e ainda `port.emitir.mock.calls[0][0].payload.infDPS.tpAmb === 2`. **Hoje recebe `1`.**
2. **[direto] Emissão em produção (controle).** O mesmo cenário com `DFE_PARTNER_ENV=producao` dá `tpAmb === 1`.
   **Guarda:** o par 1+2. Com os dois, uma mutação que inverta o mapa derruba um lado **e** uma que fixe qualquer
   literal derruba o outro. Hoje este passa, porque é controle, não prova da lacuna.
3. ⛔ **[direto] Modo manual.** `emit` com `DFE_PARTNER=manual` e `homologacao` grava o `DpsManualPayload` com
   `infDPS.tpAmb === 2`, e `ficha()` desse documento devolve `payload.infDPS.tpAmb === 2`.
   **Guarda** (unit): o cenário de `:440` estendido com a asserção. **Hoje recebe `1`.**
4. ⛔ **[direto] Prévia.** `preview` com `homologacao` devolve `payloads[i].infDPS.tpAmb === 2` para todo `i`.
   **Guarda** (unit). Porta desabilitada: `ok:false`, `payloads: []`, sem montar (já é o comportamento, pelo
   `:509`/`:523`). O caso vira asserção explícita para que o parâmetro novo de F-AMB-1 nunca precise de valor
   "neutro".
5. ⛔ **[direto] Reenvio, mesmo ambiente.** `reenviar` de um documento `REJECTED` com `ambiente: 'homologacao'` e o env
   em `homologacao` grava em `appendAttempt` um payload com `tpAmb === 2`, e `port.emitir` recebe o mesmo.
   **Guarda** (unit, `FiscalDocumentLifecycleService.test.ts`). **Hoje recebe `1`.**
6. ⛔ **[cond:F-AMB-2] Reenvio, ambiente divergente.** Documento `homologacao` com env `producao`, ou o inverso.
   - Recomendado **(a)**: `400 reenvio_bloqueado: ambiente_divergente`, `faltantes` nomeando os dois ambientes, e 0
     escrita (sem `appendAttempt`, sem audit, sem `port.emitir`).
   - **Guarda** (unit): asserções de "nunca chamado" sobre `appendAttempt`, `auditService.append` e `port.emitir`.
     **Hoje reenvia com `tpAmb=1`.**
   - Com **(b)**, a guarda assere `tpAmb === 2` saindo pela porta do env de produção, e o risco fica documentado.
7. **[cond:F-AMB-3] Invariante antes de persistir.** Imediatamente antes de `createSent` (`emit`) e de `appendAttempt`
   (`reenviar`), o serviço confere `payload.infDPS.tpAmb === tpAmbFor(ambiente)`. Se diverge, é
   `Error('dfe_tpamb_invariant: …')`: bug nosso, 500, nunca 400.
   **Guarda:** um teste que injeta um `assemble` adulterado (spy devolvendo `tpAmb` trocado) e assere que o erro é
   lançado e que `createSent` **nunca** é chamado. Uma mutação que remova a checagem derruba o teste.
8. **[direto] `tpAmbFor` puro.** `tpAmbFor('producao') === 1` e `tpAmbFor('homologacao') === 2`. O tipo de retorno é
   `1 | 2`, e passar valor fora de `DfeAmbiente` é erro de compilação. O `switch` é exaustivo com `never`, para que
   um terceiro ambiente não caia em default silencioso.
   **Guarda** (unit, `dfe/__tests__/`): tabela dos 2 casos, mais o round-trip com o mapeamento do #410. Esse
   round-trip entra só se o #410 mergear antes (ver F-AMB-6).
   **Não é vermelho de instrumentação**: a função não existe e o teste não compilaria, o que é falha pelo motivo
   errado. Esse teste nasce na sessão de correção.
9. **[direto] Nenhum literal remanescente.** **Guarda estática**:
   `grep -nE "tpAmb:\s*[12]\b" server/src --include=*.ts | grep -v __tests__` = vazio. Entra no relatório da
   correção como comando executado com saída vazia, não como afirmação.
10. **[cond:F-AMB-4] Dado já persistido.** Recomendado **(a)**: nada a migrar (M8). **Guarda:** a consulta de M8,
    colada no relatório da correção com data.
11. **[gate]** `cd server && npx tsc --noEmit` limpo; unit verde; `npm run test:integration` **sozinho**. O Windows dá
    EBUSY; nesse caso a CI Linux do PR é o oráculo e o `grep -c EBUSY` vai no log. Não há rota nova, DTO novo nem
    eventType novo: openapi (222 paths), snapshot de DTO e `auditCanonical` **não mudam**, e o relatório diz que
    foram conferidos, não que foram presumidos.

## 4. Contratos esboçados

```ts
// dfe/DfeEmissorPort.ts — aditivo (ou dfe/ambiente.ts; F-AMB-1 decide só o PONTO de uso, não o nome)
export type DpsTpAmb = 1 | 2;
/** Leiaute DPS v1.01, aba LEIAUTE, linha 103: 1 = Produção, 2 = Homologação. Inversa de `ambienteFromTpAmb`. */
export function tpAmbFor(ambiente: DfeAmbiente): DpsTpAmb {
  switch (ambiente) {
    case 'producao': return 1;
    case 'homologacao': return 2;
    default: { const _never: never = ambiente; throw new Error(`dfe_ambiente_unknown: ${String(_never)}`); }
  }
}
// Se o #410 mergear antes (F-AMB-6 a): a guarda (v) passa a usar a inversa daqui, não um ternário local.
export function ambienteFromTpAmb(tpAmb: '1' | '2' | DpsTpAmb): DfeAmbiente { /* '1'|1 → producao; '2'|2 → homologacao */ }
```

```ts
// services/FiscalDocumentEmissionService.ts — F-AMB-1 (a)
private async assemble(scope, saleId, kind, ambiente: DfeAmbiente | null): Promise<…>
//   ambiente === null só quando a porta está desabilitada; nesse caso (viii) já agregou o faltante e o
//   throw de :523 ocorre ANTES de buildPayload. Invariante: buildPayload nunca vê null.
private buildPayload(args: { …; ambiente: DfeAmbiente }): DpsPayload   // infDPS.tpAmb = tpAmbFor(args.ambiente)

preview(scope, saleId, kind)            // selection = selectDfeEmissor(env) → assemble(…, selection.ambiente)
emit(scope, saleId, kind)               // selection ANTES de assemble → o MESMO selection.ambiente vai a
                                        // assemble, createSent.ambiente e port.emitir.ambiente
reassembleGroupForReenvio(scope, saleId, kind, cTribNac, ambiente: DfeAmbiente)   // chamador passa doc.ambiente
```

```ts
// services/FiscalDocumentLifecycleService.ts — reenviar, F-AMB-2 (a)
const envAmbiente = selectDfeEmissor(process.env).ambiente;
if (port === <instância do env> && envAmbiente !== doc.ambiente)   // porta do env com ambiente diferente do documento
  throw new ValidationError('reenvio_bloqueado: ambiente_divergente', {
    faltantes: [`documento em ${doc.ambiente}, emissão configurada em ${envAmbiente ?? 'nenhum'}`],
  });
// ManualEmissor: sem destino de rede — a checagem vale igual (a ficha nova mostraria o ambiente do documento,
// mas o operador segue o env da tela); F-AMB-2 cobre os dois adaptadores com a mesma regra.
reassembled = await emissionService.reassembleGroupForReenvio(scope, doc.saleId, kind, doc.cTribNac, doc.ambiente);
```

Erros: **400** `reenvio_bloqueado: ambiente_divergente` (item 6) e **500** `dfe_tpamb_invariant` (item 7). As rotas
não mudam, e o shape de `FiscalDocumentView` também não.

## 5. Impacto nos vizinhos

- **Modo manual (ficha espelho, `DFE-MANUAL` / `FE-INCR-DFE`).** Depois da correção, a ficha de um documento
  `homologacao` mostra `tpAmb: 2`. A tela (BRIEF `FE-INCR-DFE`, ainda a abrir) deve **destacar** o ambiente e dizer em
  qual portal emitir (produção × produção restrita, M6 inferido). Isso é da tela e **não** deste BRIEF (F-AMB-5).
  O retorno continua protegido pela guarda (v) do #410. As duas pontas passam a usar o **mesmo** mapeamento
  (F-AMB-6).
- **FocusEmissor (X10i).** O BRIEF do adaptador herda três requisitos, que aqui são só registrados e **não**
  planejados:
  1. host e token da chamada escolhidos por `EmitirInput.ambiente` (o do documento), **nunca** pelo env dentro do
     adaptador;
  2. se a API da Focus aceitar `tpAmb` no corpo, enviar `tpAmbFor(input.ambiente)`, e se não aceitar, conferir na
     releitura que o XML autorizado volta com o `tpAmb` do documento (a releitura já existe);
  3. `consultar` e `cancelar` hoje não recebem ambiente (`DfeEmissorPort.ts:69-70`), e a Focus precisa dele para
     consultar a `ref` no host certo (F-AMB-5 / achado A1).
- **`NullEmissor`.** Não lê `tpAmb` e só ecoa. O efeito é nenhum além do payload gravado.

## 6. Sessão de execução recomendada

**`sessao-instrumentacao` → `sessao-correcao`.** Justificativa:
- É **defeito contra spec ratificada**: a linha `[103]` do BRIEF X10b diz `producao=1, homologacao=2`, e o código
  ignora isso. Não há comportamento novo a especificar, então `sessao-feature` seria pesada demais.
- A lacuna é reproduzível **por fora** com teste unitário barato: itens 1, 3, 4 e 5, mais o 6 depois de F-AMB-2. O
  protocolo manda provar vermelho pelo motivo certo antes do fix, e as asserções de `tpAmb` falham hoje com
  `Received: 1`, não por erro de compilação.
- A correção é localizada (2 serviços + 1 função pura) e cabe no "diff mínimo" da `sessao-correcao`.

**Exceções:**
- Os itens 7 e 8 não têm vermelho possível antes do código (função inexistente ou checagem defensiva). Eles
  nascem na correção, junto do fix, e a mutação manual (remover a checagem → teste cai) é a prova.
- Se o dono escolher F-AMB-2 (a), a recusa de reenvio é **comportamento novo** (um 400 novo). Ainda cabe em
  instrumentação → correção, porque é a mesma lacuna ("reenvio emite no ambiente errado"), mas o texto da
  ratificação precisa dizer isso para a `sessao-correcao` não recusar como escopo alheio.

**Pré-requisito da instrumentação:** este BRIEF com F-AMB-1..6 ratificados, mais a autorização do dono para as duas
sessões. O "Planeje para corrigir" autoriza **só este BRIEF**.

## 7. Forks — RATIFICADOS 2026-09-28

### F-AMB-1 — onde o ambiente entra na montagem
- **(a)** `assemble`/`buildPayload` recebem `ambiente` como parâmetro, e o `tpAmb` nasce certo.
- **(b)** Patch pós-montagem: `emit` e `reenviar` sobrescrevem `infDPS.tpAmb`, como já fazem com `nDPS`.
- **(c)** O payload montado não tem `tpAmb` e o adaptador o injeta.
- **Recomendação: (a).** A prévia também precisa do valor certo, e a (b) deixa a prévia errada ou exige um terceiro
  patch. A (c) quebra o `DpsPayloadSchema` (`tpAmb` é 1-1) e a ficha manual, que não passa por adaptador de rede.
  Na (a), a ordem `selection → assemble` em `emit` passa a ser obrigatória. **RATIFICADO (a) — dono 2026-09-28.**

### F-AMB-2 — reenvio quando o ambiente do documento ≠ o do env
- **(a)** Recusa com 400 `reenvio_bloqueado: ambiente_divergente` e 0 escrita.
- **(b)** Reenvia com `tpAmb` do documento pela porta do env. Se o parceiro repassa o `tpAmb`, o governo rejeita
  por E0006; se não repassa, a nota sai no ambiente do env.
- **(c)** Reenvia e **troca** `doc.ambiente` para o do env.
- **Recomendação: (a).** É o único caminho silencioso de §1, e (b) depende de um comportamento do parceiro que não
  conhecemos. A (c) reescreve a identidade do documento: um documento de homologação que "vira" produção mexe no
  `SourceDocument` (ADR §9.2 item 5). O custo da (a) é o operador cancelar e emitir de novo no ambiente certo.
  **RATIFICADO (a) — dono 2026-09-28.** A recusa de reenvio com ambiente divergente (400 `ambiente_divergente`, nada escrito) é parte DESTA lacuna, não escopo alheio para a `sessao-correcao`.

### F-AMB-3 — invariante defensiva antes de persistir (item 7)
- **(a)** Checagem no serviço, com 500 `dfe_tpamb_invariant`.
- **(b)** Só os testes dos itens 1–5.
- **(c)** `refine` no Zod. Inviável: o schema não conhece o ambiente do documento.
- **Recomendação: (a).** São duas linhas, e o teste de mutação prova que a checagem morde. É defesa contra
  regressão por um terceiro caminho de montagem (NF-e 55, Fase E), que não passaria pelos testes 1–5.
  **RATIFICADO (a) — dono 2026-09-28.**

### F-AMB-4 — documentos já gravados com `tpAmb` errado
- **(a)** Nada a migrar (M8: 0 documentos no `dev.db`; produção não implantada, M2 aberto), mais uma nota no PR.
- **(b)** Migração de dado que reescreve `payloadJson` das tentativas `homologacao`.
- **Recomendação: (a).** A (b) reescreveria uma tentativa **já enviada**, e a tentativa é registro do que saiu
  (`appendAttempt` nunca sobrescreve). Se aparecer dado antes do merge, é fork novo. **RATIFICADO (a) — dono 2026-09-28.**

### F-AMB-5 — exibir o ambiente na ficha manual
- **(a)** `ficha()` passa a devolver `ambiente` (aditivo, mexe no openapi e no snapshot).
- **(b)** A tela deriva de `payload.infDPS.tpAmb`.
- **(c)** Decidir no BRIEF `FE-INCR-DFE`.
- **Recomendação: (c).** É exibição, e a regra de escopo 5 manda não dimensionar além do item. Depois da correção,
  o `tpAmb` do payload já é a verdade. **RATIFICADO (c) — dono 2026-09-28.**

### F-AMB-6 — ordem com o PR #410 (guarda (v), ainda aberto)
- **(a)** O #410 mergeia primeiro e a correção troca o ternário da guarda (v) por `ambienteFromTpAmb`, uma função só
  nas duas direções.
- **(b)** A correção mergeia primeiro e o #410 é rebaseado para usar `tpAmbFor`/`ambienteFromTpAmb`.
- **(c)** Independentes: cada um com o seu mapeamento, e um teste de round-trip amarrando os dois.
- **Recomendação: (a).** O #410 está pronto e revisado. Tocar nele depois é uma linha, na regra de
  `sessao-integracao` ("rebaseie o filho antes do pai"). A (c) deixa duas fontes da mesma tabela. **RATIFICADO (a) — dono 2026-09-28.**

## 8. Pendente de validação externa

- **V1.** Se a Focus repassa o `tpAmb` do corpo ou impõe o do host/token. Não está na doc lida (ADR §11.2,
  `…/reference/ambiente.md`). Decide a severidade de F-AMB-2 (b); não muda a recomendação.
- **V2.** Se "produção restrita" do portal = `tpAmb=2` (M6, inferido). Fonte a abrir: a versão `producao-restrita`
  do Guia do Emissor Web (p3 do BRIEF manual).
- **V3.** Se a numeração da DPS no Sistema Nacional é separada por ambiente (achado A3). Sem primária lida.

## 9. Insumos ausentes

- **I1.** Contrato da API NFS-e nacional da Focus (campos do corpo, se aceita a DPS pronta ou só o JSON próprio). Só
  depois do D5, e só afeta o X10i.

## 10. Achados fora de escopo (não planejados; frente nova exige autorização)

- **A1.** **Webhook e polling usam o ambiente do env.** `webhookReceived` (`Lifecycle:302-303`) compara o `:partner`
  com o parceiro do env e consulta pela porta do env. `pollPendingOnce` (`:113-116`) pula tudo quando o env está
  desabilitado. Mais `consultar`/`cancelar` sem ambiente na porta (§5). Isso vai para o BRIEF do X10i, já listado no
  handoff §4.
- **A2.** **`id` da DPS com `tpInsc = "1"` para CNPJ.** Em `buildDpsId` (`:96`), o literal após o `cMun` é `1`. A
  primária (aba LEIAUTE, linha 102) diz *"Tipo de inscrição Federal = 1 / CPF … = 2 / CNPJ"*, e o BRIEF X10b §1
  `[102]` transcreveu `"2"`. É **defeito contra spec e contra primária** (verificado), independente do `tpAmb`.
  Soma-se ao "`id` nunca é refeito com o número real" (handoff §4), porque o `id` é montado com `nDPS = 0`. Só
  morde com parceiro que aceite a DPS pronta. **Recomenda-se linha própria no GAP-MAP e autorização separada.**
- **A3.** **Numeração não separada por ambiente.** `FiscalDocumentSequence @@id([userId, unitId, kind, serie])`
  não tem ambiente, então emissões de homologação consomem números da série de produção (buraco na sequência real).
  Se isso é defeito depende de V3.
- **A4.** **Comentário de índice.** Os comentários do código usam o **número da linha da planilha** (`[102]`
  `id`, `[103]` `tpAmb`), não a coluna "item" da planilha (101/102). É coerente com o BRIEF X10b; fica só registrado,
  para ninguém "corrigir" o índice.

---

### Autoverificação de envio (OPS-001)

1. **Objetivo.** Fazer o documento de homologação nunca sair como nota de produção. Isso está nas §2 (fonte única)
   e §7 F-AMB-2, que cobre o único caminho **silencioso** e não só a linha `:625`.
2. **Graus.** A tabela da §1 gradua cada fato. O vermelho de hoje (M7) é **inferido, não executado**.
3. **Caso adversarial tentado.** "O bug é inócuo porque o governo rejeita por E0006." Isso vale para a emissão nova
   **se** o parceiro repassa o `tpAmb` (V1), mas **não** para o reenvio com o env trocado, que continua silencioso.
   Por isso F-AMB-2 existe. Tentei também "o #410 já resolve": ele guarda o **retorno** manual, não a DPS que sai.
4. **Checagem que teria falhado.** O par de testes 1+2 derruba tanto o literal fixo quanto o mapa invertido. O grep
   do item 9 falha se sobrar literal.
5. **Viés declarado.** Esta sessão leu a primária numa cópia do xlsx em outro worktree (`interview-gates-22e1e0`,
   binário fora do git). O prefixo do sha256 (`de5bc492959e`) confere com `fontes-oficiais/MANIFEST.md:25`. Também tendo a ampliar o escopo
   (A1–A3): foram mantidos fora de propósito.
