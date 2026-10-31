# BRIEF — FE-INCR-NFCE-ASSINADOR (tela do assinador local: pareamento, estado, revogação e aviso no balcão)

> `sessao-planejamento`, 2026-10-30. Base: branch `claude/x10a-emenda-assinador-local-d3a515` (PR #995, só docs, não
> mergeado) `2da151b4`, sobre `origin/main` `b20c21e3`. Vizinho de FE do
> [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md) (nó
> [`X10a`](../plano/nos/X10a.md)). **Sem código.** Implementação exige `executa` próprio (ORCH-006).
>
> **Autorização, literal:** [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 4 — dono, chat, 30/10, questionário:
> *"Junto do AL-PR-2 (Recomendado)"*, que abre *"o `FE-INCR-NFCE-ASSINADOR` (pareamento, estado, revogação, aviso no
> balcão) para andar junto do pareamento no servidor"*. A decisão diz *"abre planejamento, não é 'executa' de nada nem
> autoriza merge"*. **Cobre só este BRIEF.**
>
> **Em duas linhas:** uma seção nova na aba "Perfil fiscal" gera o código de pareamento, mostra o estado do assinador
> (contato, versão, validade do certificado, token) e revoga; um aviso na seção "Documentos fiscais" da venda diz quando
> há nota em `PENDING_SIGNATURE` com o assinador fora. **Risco principal (verificado por leitura):** não existe tela de
> emissão de NF-e/NFC-e em `main` (só o botão "Emitir NFS-e"), então o "balcão" do aviso não tem casa óbvia (F-FEAS-4).
> Além disso, todo contrato aqui depende do AL-PR-2 e dos PRs #984/#992, nenhum em `main`.

## 0. Formulário (contexto fixo)

- **Item a planejar:** FE do pareamento e do estado do assinador local, achado §9 item 1 da EMENDA-4; nó
  [`X10a`](../plano/nos/X10a.md).
- **Autorização:** a citação acima. **Confere com o item:** pede exatamente "pareamento, estado, revogação, aviso no
  balcão". Sem divergência de escopo. Não cobre a tela de emissão de NFC-e (`FE-INCR-NFCE`, sem autorização, §9 do
  `BE-INCR-NFCE-brief.md`), nem o download do assinador fora do ramo condicional do F-FEAS-7.
- **Insumos lidos:**
  - BRIEF BE: EMENDA-4 §3 (AL-3, AL-4, AL-5, AL-12, AL-13, AL-14, AL-15, AL-22), §4.2 (DTOs e tabela de rotas), §4.3
    (`DfeSignerDevice`), §5 (AL-PR-2), §6 (F-AL-3, F-AL-6, F-AL-8 ratificados).
  - Decisão: [[D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO]] item 4; cédula
    [`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../plano/gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md) §4 (*"O runbook
    A3 tem o passo 'parear o assinador' feito pelo dono na tela"*).
  - Regras: `my-app/CLAUDE.md` (reuso canônico, `neutral-*`, `rounded-2xl`, `withAuth` + build de produção, vitest,
    `.gen.ts`); exemplar [`FE-INCR-NFE-brief.md`](FE-INCR-NFE-brief.md).
  - **Código em `main`** (lido, não alterado) — §1.
  - **Código em PR aberto** (lido nas cabeças de `pull/984/head` e `pull/992/head`): `FiscalDocumentDto.ts` linhas 33 e
    177, `FiscalDocumentDto.gen.ts` linhas 16 e 93.
- **Nós vizinhos:** consome o AL-PR-2 (rotas de usuário `codigos`, `GET`, `DELETE`, e o `DfeSignerDto.gen.ts`), o
  AL-PR-3 (nota indo a `PENDING_SIGNATURE` por assinador fora) e o PR-7 #984 (`PENDING_SIGNATURE` no filtro da lista).
  É consumido pelo runbook A3 (AL-24, passo "parear o assinador").

## 1. Fatos verificados nesta sessão (código, não memória)

- **Não há nada do assinador no repo:** `grep dfe-assinador|DfeSigner` em `server/src` e `my-app` não acha nada. As
  rotas e os DTOs nascem no AL-PR-2.
- **Telas fiscais existentes:**
  - Aba `perfil-fiscal` do `AccountingView` (`AccountingView.tsx:89`, render em `:603-610`) empilha `FiscalProfilePanel`,
    `MeiEnquadramentoSection`, `PresumidoServicosSection` e `ServiceFiscalProfilesPanel` num `space-y-8`, todos com
    `unitId`. Fica **fora** do `DELEGATED_TABS` (`:111`, só `periodos`, `compliance` e `politica`), então o modo
    cliente/contador não vê.
  - `FiscalProfilePanel.tsx` é o padrão de painel por unidade: `reqRef` que descarta a resposta de unidade antiga
    (`:68-80`), `resolveError`, `useAccountingT`, `fieldset = 'space-y-3 rounded-2xl border border-neutral-800 p-4'`.
  - `features/accounting/components/dfe/` tem `FiscalDocumentsSection.tsx` (cartões da venda, montado no
    `SaleDetailPanel.tsx:14`), `dfeLabels.ts` (`STATUS_LABEL`, `PENDENCIA_LABEL`) e `dfeUi.ts` (`btn`, `dangerBtn`,
    `errorBox`, `warnBox`).
  - **Não existe botão "Emitir NF-e/NFC-e" nem tela de caixa.** O `SaleDetailPanel` só tem `EmitNfseButton`
    (`:148-154`). O `BE-INCR-NFCE-brief.md` §8 item 2 e a EMENDA-1 deixam a tela de emissão para um `FE-INCR-NFCE` sem
    autorização. Esse é o "balcão" que o aviso precisa (F-FEAS-4).
- **Status de documento no FE é escrito à mão:** `dfe.service.ts:51` `FiscalDocumentStatus = 'SENT' | 'PROCESSING' |
  'AUTHORIZED' | 'AUTHORIZED_DIVERGENT' | 'REJECTED' | 'CANCELLED'`; `FiscalDocumentsSection.tsx:25-32` tem
  `STATUS_TONE: Record<FiscalDocumentView['status'], string>`. Nenhum dos dois conhece `PENDING_SIGNATURE`.
- **A lista por unidade e status já existe:** `GET /api/nfe/dfe/documents` com `FiscalDocumentListQuerySchema`
  (`FiscalDocumentDto.ts:29-39`: `unitId`, `saleId?`, `status?`, `pendencias`); `saleId` é opcional, mas o
  `dfeService` só expõe `listBySale` (`dfe.service.ts:135`). Em `main` o enum de `status` não tem `PENDING_SIGNATURE`;
  no #984 tem (linha 33), no #992 tem também `CONTINGENCY`.
- **Precedente de view de certificado:** `FiscalCertificateDto.gen.ts` traz `notAfter`, `diasParaVencer` e
  `fingerprintSha256` calculados no servidor. É o modelo para não fazer conta de data no cliente (memória
  `date-only-regex-nao-valida-calendario`).
- **i18n:** `accounting.json` tem 3651 linhas em pt e em en (medido nesta sessão; a paridade de chaves se mede na
  implementação).

## 2. Contratos que o FE consome (do BE, AL-PR-2; esboço até o `.gen.ts` existir)

Rotas de usuário da EMENDA-4 §4.2 (o FE não toca as rotas `/api/dfe-assinador/v1/*`, que são do dispositivo):

```
POST   /api/accounting/dfe-assinador/:unitId/codigos   → 201 { codigo, expiraEm }           policy do perfil fiscal
GET    /api/accounting/dfe-assinador/:unitId           → 200 DfeSignerView | null            usuário da unidade
DELETE /api/accounting/dfe-assinador/:unitId           → 200 (ou 204)                        policy do perfil fiscal
GET    /api/nfe/dfe/documents?unitId=&status=PENDING_SIGNATURE   (já existe; enum vem do #984)
```

```ts
// Esboço do que o FE precisa ler. A EMENDA-4 lista os campos (AL-12) mas não fecha a view; os campos marcados (*)
// são pedidos deste BRIEF ao AL-PR-2 (F-FEAS-5). Tipo real = my-app/types/contracts/accounting/DfeSignerDto.gen.ts.
interface DfeSignerCodigoView {
  codigo: string;              // mostrado uma vez; o banco guarda só o hash (AL-3)
  expiraEm: string;            // ISO; TTL 10 min (AL-3)
}
interface DfeSignerView {
  dispositivoId: string;
  nome: string;                // nomeDispositivo do pareamento
  versaoAssinador: string;
  versaoMinima?: string;       // (*) para avisar antes do 426 do AL-22
  lastSeenAt: string | null;   // ISO
  online: boolean;             // (*) mesmo limiar de 90 s do AL-13, calculado no servidor
  tokenPresente: boolean;
  certCnpjRaiz: string;        // 8 dígitos
  certNotAfter: string;        // 'AAAA-MM-DD' (readCertFacts)
  diasParaVencer: number;      // (*) como FiscalCertificateView
  certThumbprint: string;      // sha256 do DER, hex
  ambiente: 'producao' | 'homologacao';
  pareadoEm: string;           // createdAt
  outrasUnidades: Array<{ unitId: string; nome: string }>;  // (*) AL-4: o mesmo dispositivo serve N unidades da raiz
}
// Nunca na view (AL-12): tokenHash, certificado inteiro, subject (CPF do responsável, AL-16).
```

Contratos do FE (novos):

```ts
// my-app/lib/services/dfeAssinador.service.ts
export const dfeAssinadorService = {
  gerarCodigo(unitId: string): Promise<DfeSignerCodigoView>,     // notify só em sucesso
  getEstado(unitId: string): Promise<DfeSignerView | null>,
  revogar(unitId: string): Promise<void>,                         // notify só em sucesso
};
// my-app/lib/services/dfe.service.ts — acréscimos
export type FiscalDocumentStatus = … | 'PENDING_SIGNATURE';     // espelha o #984
listByUnit(unitId: string, status: FiscalDocumentStatus): Promise<FiscalDocumentView[]>;

// my-app/features/accounting/components/dfe/AssinadorLocalSection.tsx  — { unitId: string }
// my-app/features/accounting/components/dfe/AssinadorForaAviso.tsx     — { unitId: string; docs: FiscalDocumentView[] }
// my-app/features/accounting/lib/assinadorEstado.ts                    — função pura view → estado de tela
export type AssinadorEstadoTela =
  | { kind: 'sem-pareamento' }
  | { kind: 'online'; avisos: AssinadorAviso[] }
  | { kind: 'fora'; desde: string | null; avisos: AssinadorAviso[] };
export type AssinadorAviso = 'token-ausente' | 'cert-vencendo' | 'cert-vencido' | 'versao-antiga';
```

## 3. Checklist de comportamentos

Marcadores: `[direto]` sem fork · `[fork:F-FEAS-n]` vale o ramo recomendado se o dono ratificar · `[cond:…]` só
existe num ramo. Numeração FA-n para não colidir com AL-n.

### A. Cliente de API

- **FA-1 [direto] `dfeAssinador.service.ts`** com as três funções do §2, `apiClient` JSON e tipos só do
  `DfeSignerDto.gen.ts` (nunca espelhados à mão nem importados do backend). `notify()` só em sucesso de mutação.
  *Teste:* cada função chama o caminho certo com `unitId` codificado; `getEstado` devolve `null` quando o BE devolve
  `null`.
- **FA-2 [direto] `dfe.service.ts` ganha `PENDING_SIGNATURE`** na união `FiscalDocumentStatus`, com rótulo em
  `dfeLabels.ts` e tom em `STATUS_TONE` (âmbar), e a função `listByUnit(unitId, status)` sobre a rota existente.
  *Teste:* `tsc` falha se o `Record` de tom ou de rótulo ficar sem a chave nova; `listByUnit` monta
  `?unitId=…&status=PENDING_SIGNATURE`.

### B. Seção "Assinador local" (pareamento, estado, revogação)

- **FA-3 [fork:F-FEAS-1] Onde vive:** `AssinadorLocalSection` entra na aba `perfil-fiscal`, logo depois do
  `FiscalProfilePanel`, com o mesmo `fieldset` `rounded-2xl` e `neutral-*`. A aba continua fora do `DELEGATED_TABS`.
  *Teste:* a aba renderiza a seção com o `unitId` ativo.
- **FA-4 [direto] Carga por unidade:** `getEstado(unitId)` ao montar e ao trocar de unidade, com o padrão `reqRef` do
  `FiscalProfilePanel` (resposta de unidade antiga é descartada). Erro de carga ⇒ `errorBox` com `resolveError` e botão
  "tentar de novo". *Teste:* trocar de unidade com a primeira resposta atrasada ⇒ a tela mostra só a da segunda.
- **FA-5 [direto] Estado de tela por função pura** `assinadorEstado(view, hoje?)` → `AssinadorEstadoTela`: `null` ⇒
  `sem-pareamento`; `online` vem do servidor (F-FEAS-5); avisos: `tokenPresente = false` ⇒ `token-ausente`;
  `diasParaVencer < 0` ⇒ `cert-vencido`; `0..30` ⇒ `cert-vencendo` (o mesmo limiar de 30 dias do alerta AL-15);
  `versaoMinima` maior que `versaoAssinador` ⇒ `versao-antiga`. Nenhuma conta de data no cliente. *Teste:* tabela
  view → estado, cobrindo cada aviso sozinho e combinado.
- **FA-6 [direto] Render do estado:** sem pareamento ⇒ texto curto do que o assinador faz e botão "Gerar código de
  pareamento". Pareado ⇒ selo Online/Fora do ar; "último contato" (`lastSeenAt` por um formatador de data e hora que já
  exista; o `features/accounting/lib/formatDate.ts` só formata data, e o `formatDateTimeBR` está em
  `features/dashboard/category-views/finance/utils/formatters.ts`; escolher pelo critério de reuso, não criar outro;
  ou "nunca"); nome do dispositivo; versão; certificado (raiz do CNPJ formatada, validade por reslice de `certNotAfter`
  para `formatDate`, dias para vencer, impressão digital abreviada com cópia); token "detectado/não detectado";
  ambiente; outras unidades atendidas (AL-4). Cada aviso do FA-5 vira uma linha em `warnBox`. *Teste:* cada estado
  renderiza os textos; a tela nunca contém `NaN`, `Invalid Date` nem `undefined`.
- **FA-7 [fork:F-FEAS-2] Gerar código:** o botão chama `gerarCodigo`; o código aparece num `Modal` canônico em fonte
  monoespaçada, agrupado de 4 em 4 para leitura, com botão "copiar" e contagem regressiva até `expiraEm`. Expirado ⇒ o
  código some e aparece "gerar outro". O código **não pode ser revisto** depois de fechar o modal: o banco só tem o
  hash (AL-3), então isso não é escolha da tela. O código vive só no estado do componente: nada em `localStorage`, URL,
  log ou `console`. *Teste:* o código aparece; depois do `expiraEm` (relógio falso) some; fechar e reabrir não o
  mostra; nenhuma escrita em `localStorage`.
- **FA-8 [direto] Pareamento visto pela tela:** com o modal aberto, a seção relê o estado (F-FEAS-6). Quando o
  dispositivo aparece, o modal fecha sozinho e mostra "Assinador pareado". *Teste:* o mock passa de `null` para uma
  view ⇒ o modal fecha e o estado aparece.
- **FA-9 [direto] Revogar:** o botão "Revogar" (estilo `dangerBtn`) abre um `Modal` de confirmação que diz o efeito:
  o caixa para de assinar nesta unidade; notas novas ficam pendentes até outro pareamento; se o dispositivo atende
  outras unidades, diz quais (o alcance depende do AL-PR-2, §8 item 1). Confirmar ⇒ `revogar` ⇒ relê o estado.
  *Teste:* cancelar não chama o serviço; confirmar chama uma vez e a tela volta a "sem pareamento".
- **FA-10 [direto] Parear de novo com um ativo:** o botão "Gerar código" continua disponível com assinador pareado,
  e o modal avisa que o pareamento novo substitui o atual (AL-4: o anterior é revogado na mesma tx). *Teste:* com view
  presente, o modal mostra o aviso de substituição.
- **FA-11 [direto] Erros nomeados:** 403 (sem a policy do perfil fiscal) e os 400 do BE passam por `resolveError`
  (texto do servidor). Sem a policy, os botões de gerar e revogar aparecem e o 403 explica: a tela não duplica a
  policy no cliente. *Teste:* 403 em `gerarCodigo` ⇒ mensagem do servidor, sem modal de código.

### C. Aviso no balcão

- **FA-12 [fork:F-FEAS-4] Onde aparece:** `AssinadorForaAviso` no topo da `FiscalDocumentsSection` da venda quando
  algum documento dela está em `PENDING_SIGNATURE` **e** o estado da unidade é `fora` ou `token-ausente`; e, na
  `AssinadorLocalSection`, a contagem de notas pendentes da unidade (`listByUnit(unitId, 'PENDING_SIGNATURE')`).
  *Teste:* venda com nota pendente + assinador fora ⇒ aviso; pendente + online ⇒ sem aviso; fora sem pendente ⇒ sem
  aviso.
- **FA-13 [fork:F-FEAS-3] O aviso informa, não bloqueia:** o texto diz que a nota está esperando o assinador, que sai
  sozinha quando ele voltar (AL-14) e o que conferir no caixa (ligado, token no leitor). Nenhum botão de emissão é
  desabilitado pela tela; quem barra ou deixa pendente é o servidor (pré-voo AL-13 e F-AL-6 a). *Teste:* com o aviso
  na tela, as ações existentes da seção continuam habilitadas.
- **FA-14 [direto] Pré-voo nomeado pelo servidor:** quando a emissão devolver o faltante `assinador local` (AL-13),
  a tela mostra o texto do BE como hoje mostra `faltantes` do preview (texto íntegro, sem tradução própria). *Teste:*
  `faltantes: ['assinador local']` aparece como veio.

### D. Atualização, i18n e gates

- **FA-15 [fork:F-FEAS-6] Releitura:** a seção relê o estado a cada 30 s enquanto está montada e a aba do navegador
  visível (`document.visibilityState`), além do botão "atualizar". O aviso da venda relê junto com a lista de
  documentos da seção. *Teste:* com `visibilityState = 'hidden'` não há chamada; ao voltar a `visible`, uma chamada.
- **FA-16 [cond:F-FEAS-7 a] Download do assinador:** quando o AL-PR-6 existir, a seção mostra o link de download da
  própria instância e o SHA-256 publicado (F-AL-8 a), com instrução do aviso do SmartScreen. Até lá, o item fica fora
  do PR. *Teste (quando entrar):* link e hash vêm do BE; o hash é copiável.
- **FA-17 [direto] i18n:** chaves novas em `accounting.json` (namespace `dfe.assinador.*` e o rótulo de status
  `PENDING_SIGNATURE`) em pt e en na mesma mudança; paridade medida antes e depois. *Teste:* o gate de paridade passa.
- **FA-18 [direto] Gates:** `neutral-*` (nunca `zinc-*`), cards `rounded-2xl`, zero `any`; `npx tsc --noEmit` e
  `npm run test:types` limpos em `my-app`; `check:arch` do `my-app`; tipos só do `.gen.ts` (o FE não regenera nada:
  quem regenera o `DfeSignerDto.gen.ts` é o AL-PR-2). Zero mudança em `server/`.
- **FA-19 [direto] Build de produção:** a aba fica atrás de `withAuth`, então a verificação é contra `next build` +
  `next start` em `127.0.0.1` (memória `verificacao-prod-build-no-painel`). Esta é a tela que o runbook A3 usa no passo
  "parear o assinador", que é gate humano (o dono executa e assina).
- **FA-20 [direto] Testes vitest** (shim `globalThis.React` onde preciso): `assinadorEstado` (tabela), serviço (FA-1,
  FA-2), `AssinadorLocalSection` (FA-4 a FA-11, FA-15), `AssinadorForaAviso` (FA-12, FA-13), regressão da
  `FiscalDocumentsSection` com um documento `PENDING_SIGNATURE` (tom e rótulo, sem `undefined`).

## 4. Plano por fatias

| PR | Itens | Depende | Natureza |
|---|---|---|---|
| FA-PR-1 (my-app) | FA-1, FA-3..FA-11, FA-15, FA-17..FA-20 (parte da seção) | AL-PR-2 em `main` (rotas + `DfeSignerDto.gen.ts`), F-FEAS-1, 2, 5, 6 | tela de pareamento e estado; anda junto do AL-PR-2 (decisão item 4) |
| FA-PR-2 (my-app) | FA-2, FA-12..FA-14, FA-20 (parte do aviso) | #984 em `main` (`PENDING_SIGNATURE` no enum), AL-PR-3 (pendência por assinador fora), F-FEAS-3, 4 | aviso no balcão |
| FA-PR-3 (my-app) | FA-16 | AL-PR-6; F-FEAS-7 (a) | download |

"Junto do AL-PR-2" quer dizer o FA-PR-1 empilhado no AL-PR-2 (mesma fila, PR próprio, porque a casa separa BE e FE),
não um diff misturado. O FA-PR-1 sozinho já basta para o passo "parear" do runbook A3.

## 5. Forks — RATIFICAÇÃO PENDENTE

### F-FEAS-1 — Onde fica a seção do assinador
- **(a)** Seção na aba "Perfil fiscal", depois do `FiscalProfilePanel`.
- **(b)** Aba nova "Assinador" no `AccountingView`.
- **(c)** Dentro da `FiscalDocumentsSection` da venda.
- **Recomendação: (a).** O assinador é configuração fiscal da unidade, como o perfil e o certificado, e a aba já é
  por unidade e fora do modo delegado. (b) põe a 30ª aba para uma seção pequena. (c) mistura configuração da unidade
  com o documento de uma venda. **RATIFICAÇÃO PENDENTE.**

### F-FEAS-2 — Como o código de pareamento aparece
O código **não pode** ser revisto depois de gerado: o servidor só guarda o hash (AL-3). O que resta escolher é a
apresentação.
- **(a)** Modal com o código, botão copiar e contagem regressiva até expirar; fechado o modal, só gerando outro.
- **(b)** Código inline na seção, visível até expirar mesmo com a navegação entre seções da aba.
- **Recomendação: (a).** O modal deixa claro que é uma vez só e não deixa o código à vista na tela enquanto o
  operador faz outra coisa. Se a pessoa fechar sem querer, gerar outro custa um clique (o novo pareamento só vale um
  código). **RATIFICAÇÃO PENDENTE.**

### F-FEAS-3 — O aviso no balcão bloqueia ou só informa
- **(a)** Só informa: aviso visível; a emissão segue pelo servidor, que deixa a nota em `PENDING_SIGNATURE` e a retoma
  quando o assinador volta.
- **(b)** Bloqueia: com o assinador fora, a tela desabilita a emissão.
- **Recomendação: (a).** O F-AL-6 (a) já ratificou que a nota fica pendente e sai sozinha; bloquear na tela
  contradiz essa decisão e perde a venda que o servidor guardaria. Também põe regra no FE, quando o pré-voo AL-13 já é
  a regra no servidor. **RATIFICAÇÃO PENDENTE.**

### F-FEAS-4 — Onde fica o "balcão" do aviso
Não existe tela de emissão de NF-e/NFC-e no `my-app` (§1).
- **(a)** No topo da `FiscalDocumentsSection` da venda (onde os documentos fiscais da venda já aparecem) e a contagem
  de pendentes na seção do assinador.
- **(b)** Uma faixa no topo do dashboard, para toda unidade com nota pendente e assinador fora.
- **(c)** Esperar o `FE-INCR-NFCE` (botão "Emitir NFC-e"), que não tem autorização.
- **Recomendação: (a).** É o único lugar de hoje em que o operador vê a nota da venda, e não cria tela nova. (b) é
  mais visível, mas toca o dashboard inteiro e consulta a cada página. (c) deixa o aviso sem casa por tempo
  indeterminado. Quando o `FE-INCR-NFCE` existir, ele reusa o `AssinadorForaAviso` (§9 item 1). **RATIFICAÇÃO PENDENTE.**

### F-FEAS-5 — Valores derivados: servidor ou cliente
`online` (90 s do AL-13), `diasParaVencer` e `versaoMinima` podem vir prontos na view ou ser calculados no FE.
- **(a)** O servidor devolve os três na `DfeSignerView` (pedido ao AL-PR-2; o `FiscalCertificateView` já faz assim).
- **(b)** O FE calcula a partir de `lastSeenAt`, `certNotAfter` e de uma constante.
- **Recomendação: (a).** Uma fonte só para "assinador fora": o pré-voo AL-13 e a tela usam o mesmo limiar, e o
  relógio do caixa não entra na conta. (b) repete o 90 no cliente e traz conta de data com fuso. **Efeito:** o AL-PR-2
  precisa incluir esses campos na view (nota ao BRIEF BE, sem editá-lo aqui). **RATIFICAÇÃO PENDENTE.**

### F-FEAS-6 — Como a tela fica em dia
- **(a)** Releitura a cada 30 s com a aba visível, mais botão "atualizar".
- **(b)** Só ao montar e no botão.
- **(c)** Canal de push (SSE/WebSocket) do servidor.
- **Recomendação: (a).** O pareamento (FA-8) e o "voltou" do assinador só aparecem sem clique com releitura; 30 s com
  a aba visível custa duas consultas leves por minuto, e só enquanto a seção está aberta. (c) traz dependência e canal novos para um estado que muda
  pouco. **RATIFICAÇÃO PENDENTE.**

### F-FEAS-7 — Download do assinador e SHA-256 nesta tela
O F-AL-8 (a) ratificado diz "SHA-256 publicado na tela", sem dizer qual tela.
- **(a)** Nesta seção, como FA-PR-3, quando o AL-PR-6 existir.
- **(b)** Fora deste BRIEF; outro FE-INCR quando o AL-PR-6 vier.
- **Recomendação: (a).** É a mesma seção em que o operador pareia; quem baixa o assinador está nela. Fica
  condicionado ao AL-PR-6 para não planejar contrato que não existe. **RATIFICAÇÃO PENDENTE.**

## 6. Pendente de validação externa

- **Passo "parear o assinador" do runbook A3** (AL-24): só o dono, com o assinador real e um certificado do cliente,
  prova a tela de ponta a ponta. O agente prova com mocks e com o build de produção.
- Nenhuma regra fiscal entra nesta tela: CNPJ-raiz, validade, EKU, pré-voo e retomada são do servidor (AL-3, AL-13,
  AL-14). A tela só exibe.

## 7. Insumos ausentes (dependências; não bloqueiam o BRIEF)

1. **Alcance do `DELETE /api/accounting/dfe-assinador/:unitId`** quando o dispositivo atende várias unidades (AL-4):
   revoga só o vínculo da unidade ou o dispositivo inteiro? A EMENDA-4 diz "revoga (soft-delete)" sem dizer o quê. O
   texto do FA-9 depende disso; é decisão do AL-PR-2, não da tela.
2. **Forma exata da `DfeSignerView` e da resposta de `codigos`:** a EMENDA-4 lista campos (AL-12) e não fecha o DTO.
   O §2 é esboço até o `DfeSignerDto.gen.ts` existir.
3. **Status HTTP do `DELETE`** (200 com corpo ou 204): o serviço trata os dois.

## 8. Achados fora de escopo (não planejados — ORCH-006)

1. **`FE-INCR-NFCE`** (botão "Emitir NFC-e", DANFE NFC-e no balcão, perfil fiscal do produto): já registrado no
   `BE-INCR-NFCE-brief.md` §8 e sem autorização. Quando existir, é a casa natural do `AssinadorForaAviso`.
2. **`CONTINGENCY` (#992) no FE:** a mesma união escrita à mão em `dfe.service.ts` não conhece o estado de
   contingência. Este BRIEF só acrescenta `PENDING_SIGNATURE`.
3. **União de status escrita à mão:** `FiscalDocumentStatus` poderia vir do `FiscalDocumentDto.gen.ts` em vez de
   espelhar o BE (comentário em `dfe.service.ts:56`). Troca que vale para todo o módulo, não para este item.
4. **Diário local do assinador (AL-19) visível na tela:** não pedido; fica no caixa.

## 9. Gates de envio [OPS-001]

1. **Objetivo:** a primeira linha do "Em duas linhas" responde ao pedido: o dono consegue parear, ver e revogar pela
   tela (o runbook A3 depende disso), e o balcão fica sabendo quando a nota espera o assinador.
2. **Grau dos claims:** telas, serviços, status e rotas existentes **verificados por leitura** nesta sessão (§1, com
   linha); `PENDING_SIGNATURE` no enum **verificado** nas cabeças dos PRs #984/#992 (não estão em `main`); forma da
   view do assinador **assumida** (esboço, §7 item 2).
3. **Caso adversarial tentado:** "o aviso deveria bloquear a emissão": esbarra no F-AL-6 (a) ratificado e virou o
   F-FEAS-3. Segundo: "a tela pode mostrar o código de novo": falha, porque o banco só tem o hash (AL-3), e por isso o
   F-FEAS-2 não oferece essa opção.
4. **Checagem que teria falhado:** se já houvesse tela de emissão de NFC-e, o F-FEAS-4 não existiria. O grep de
   `fiscal|nfce|dfe` no `my-app` e a leitura do `SaleDetailPanel` mostraram só o `EmitNfseButton`.
5. **Duas primeiras linhas:** o cabeçalho "Em duas linhas" dá o desenho e o risco (balcão sem casa; contratos em PRs
   não mergeados).
