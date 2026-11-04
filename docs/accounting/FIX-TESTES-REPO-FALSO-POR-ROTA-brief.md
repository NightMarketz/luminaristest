# BRIEF — FIX-TESTES-REPO-FALSO-POR-ROTA: toda rota contábil com um teste de integração no caminho feliz

> **Estado:** BRIEF de correção, 04/11/2026. Sem código e sem `executa`. Os forks estão em **RATIFICAÇÃO PENDENTE**.
> Régua: [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) (A1, A2, A6).
> **Não é gate nem aparato de auditoria** (regra ⛔ do CLAUDE.md): a medição do item 1 é uma tabela feita uma vez, num doc,
> e não entra no CI.

## 0. Contexto fixo

- **Item:** inventário de testes (PR #1065), §4.7: *"41 dos 109 testes de serviço usam repositório falso … O critério certo
  é 'rota ou serviço com teste de integração', a medir por rota."*
- **Autorização:** dono, chat, 04/11: *"… e onde já estiver implementado, você também já cria briefs de correção de acordo
  com o aprendizado."* Cobre **este BRIEF**. Executar pede `executa` próprio, e cada lote pede o seu (F-RF-2).
- **Fatos (graus marcados):**
  - Recontagem de 04/11, por leitor (inferido, critério "arquivo `*Service*.test.ts`, não integração, com `jest.fn` e o texto
    `Repository`"): **48** arquivos, 32 deles em `features/accounting/services/__tests__`. O número do inventário (41/109) usa
    outro critério. Os dois são **pista**, não medida.
  - Citar o nome do serviço em `*.integration.test.ts` também é pista fraca: teste HTTP passa pelo repositório real sem citar
    o serviço. Exemplo verificado: `fixedAssetController.integration.test.ts` exercita o `FixedAssetRepository` sem citá-lo.
    Por nome, `FixedAssetClass`, `DepreciationRate`, `DimensionReport`, `DataExchangeImport` e `DataExchangeExport`
    aparecem em **zero** testes de integração (grep, 04/11). Mas o `depreciationRateController.integration.test.ts`
    existe (inventário §5), o que mostra o limite do critério por nome.
  - Por que importa (A6): os bugs de 04/11 (VP-1, IMO-1/2/3, DFE-1) eram pegáveis por integração. A classe "tx não propagado
    ao repo" passa em unit que conta chamadas (memória do projeto).

## 1. Checklist de comportamentos

Sessão: **`sessao-feature`** com `executa`, um lote por PR. Caso que sair vermelho vira PR vermelho de propósito
(`sessao-instrumentacao`) e depois `sessao-correcao`, um achado por vez.

1. **[direto] Medição por rota, uma vez (não é gate).** Um doc `docs/operating-manual/COBERTURA-ROTAS-CONTABIL-<data>.md`
   com uma linha por rota de `server/src/routes/**` sob `/api/accounting` e `/api/nfe` (método + caminho montado):
   `integração no caminho feliz: sim (arquivo:linha) | não`. O critério é a rota aparecer num `request(app).<verbo>(…)` de
   `*.integration.test.ts`, com o caminho literal ou montado. O script que gera a tabela fica no scratchpad da sessão e
   **não** é versionado (F-RF-1).
2. **[direto] Ordem dos lotes por risco.** Primeiro as rotas que **escrevem** no razão, no período ou em documento fiscal e
   não têm integração. Depois as escritas cadastrais. Por último as leituras e os relatórios, que seguem a A7 (esperados
   fixos).
3. **[direto] Um teste por rota do lote (A6),** pela HTTP (`makeApp` + `authHeader`), repositório real, caminho feliz e
   **2ª leitura** (o `GET` ou a leitura do banco depois do `POST`). O cenário do teste é o mais curto que chega à rota, montado
   pelos serviços, não por `prisma.*` no razão.
4. **[direto] Uma guarda por rota de escrita (A2),** no estado em que ela morde: a guarda de status, de período ou de CAS que
   o serviço tem, testada com o dado já no estado que a dispara (o padrão do IMO-1).
5. **[direto] Nada se repete (A1).** O teste novo não repete os valores do unit existente. O unit fica, porque prova a regra.
   Só sai um unit cujo único conteúdo é contar chamadas de repositório que a integração nova prova melhor, e isso vira
   pergunta no PR (F-RF-3).
6. **[direto] A tabela do item 1 é atualizada no PR de cada lote,** à mão, como registro. Não é gate.

## 2. Contratos

Nenhum contrato novo. Gates do diff: `tsc` do server com `tsconfig.test.json`. Rodar local só os arquivos novos, cada um
com `--runInBand`.

## 3. Forks (RATIFICAÇÃO PENDENTE)

### F-RF-1 — O script da medição é versionado?
- (a) Não: scratchpad, e só a tabela vai para o doc.
- (b) Sim, em `scripts/`, sem entrar no CI.
- **Recomendação:** (a). Script versionado tende a virar gate, e a regra ⛔ veda aparato novo enquanto o Bloco A estiver
  aberto.
- **Status: ✅ RATIFICADO (a)**, dono, chat, 04/11, questionário do #1075, Q1: *"É inventário (Recomendado)"*
  ([D-2026-11-04-APRENDIZADOS-TESTES](../plano/decisoes/D-2026-11-04-APRENDIZADOS-TESTES.md)). A medição do item 1 é
  inventário, não gate nem rodada.

### F-RF-2 — Tamanho do lote
- (a) Até 8 rotas por PR (o tamanho dos lotes do FIX-AUTH-CONTA).
- (b) Um PR por área (imobilizado, fiscal, fechamento…).
- **Recomendação:** (a). O PR fica revisável e o tempo de integração cresce aos poucos (o CI de integração é o caminho
  crítico medido na PESQUISA-TESTES-2).

### F-RF-3 — Remover unit que só conta chamadas
- (a) Remover no mesmo PR, quando a integração nova cobre o mesmo comportamento.
- (b) Nunca remover neste BRIEF.
- **Recomendação:** (b). Remoção é decisão caso a caso do dono; aqui só se acrescenta.

## 4. Pendente de validação externa

Nenhum.

## 5. Insumos ausentes

- A lista de rotas montadas (prefixo de `app.use` × `router.<verbo>`). É o item 1.

## 6. Achados fora de escopo

- Áreas fora da contabilidade (CRM, chat, wizard). O CRM tem BRIEF próprio
  (`docs/crm/FIX-TESTES-CRM-PIPELINE-PILHA-REAL-brief.md`).
