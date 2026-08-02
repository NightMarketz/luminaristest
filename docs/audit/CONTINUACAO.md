# Continuação da bancada — estado em `9ca37d6`

Documento de retomada. Escrito ao fim da sessão que produziu o PR #164, para que a
próxima não precise do histórico daquela conversa.

---

## O que existe no disco

| Artefato | Estado |
|---|---|
| `docs/audit/AV-R1.md` + `.json` | rodada 1 · 4 achados · AV-16 a AV-19 |
| `docs/audit/AV-R2-COBERTURA-AUSENTE.md` + `AV-R2.json` | rodada 2 · 110 obrigações de teste · AV-20 |
| `docs/audit/AV-R3-FORCA-DA-SUITE.md` + `.json` | rodada 3 · `mutation_score` 2/7 · AV-03 |
| `scripts/bancada-gate.mjs` | gate de 9 checagens · **falha hoje, ver abaixo** |
| `docs/audit/bancada.html` | **versão do `main` (v3)** — as edições v4/v4.1 foram perdidas |

## O que foi perdido, e como

Numa sessão anterior, `git checkout -- docs/audit/bancada.html` foi usado para reverter uma
mutação de teste. O arquivo é rastreado e as edições v4/v4.1 estavam **sem commit** — o
comando restaurou o `HEAD` e apagou tudo.

Blocos perdidos: `t-av00` (v4 integral, ~17 KB), `t-av03`, `t-av16`, `t-av17`, `t-av18`,
`t-av19`, `t-av20`, `t-v4patch`, mais as emendas v4.1 em `t-v3`, `t-contrato`, `t-padrao` e
a fiação JS (catálogo, aplicabilidade, `gateMap`, CSS de badge).

**Não há cópia recuperável no disco nem no git.** A reconstrução é autoria, não recuperação —
mas ela é guiada: os três relatórios descrevem cada instrumento em detalhe, e
`scripts/bancada-gate.mjs` codifica as exigências estruturais que a reconstrução tem de
satisfazer (checagens B1–B9). Reconstruir até o gate passar é um critério objetivo de pronto.

## Por que o gate falha hoje

```
node scripts/bancada-gate.mjs     # exit 1
::error::[B3] centerpiece.type "exposure_map" usado num relatório e não declarado no contrato
::error::[B3] centerpiece.type "missing_tests" ...
::error::[B3] centerpiece.type "mutation_score" ...
```

Os relatórios citam tipos de peça central que só existiam na bancada v4. **O gate está
certo** — ele detectou a divergência sozinho. Não silencie o B3: ele fecha quando a bancada
voltar a declarar os tipos.

---

## Fila de trabalho, em ordem

### 1 · Reconstruir `bancada.html` até o gate passar
Critério de pronto: `node scripts/bancada-gate.mjs` sai 0.

O que o gate exige, e portanto o que a reconstrução precisa ter:
- **B1/B2** — todo `srcId` do catálogo resolve para um bloco `<script type="text/plain" id=…>`, e todo bloco é referenciado.
- **B3** — o bloco `t-contrato` declara todos os tipos usados: além dos de `auditoria/1.1`, os da v4 (`intent_trail`, `mutation_score`, `comprehension_gap`, `review_reality`, `exposure_map`, `dependency_trust`) e o da v4.1 (`missing_tests`).
- **B7** — `exposure` inclui `latente_por_dependencia` (emenda v4.1).
- **B8** — o contrato declara `findings[].verification_mode` (`execucao` | `revisao` | `leitura`). É o campo que torna o teto do AV-00 §2.2 verificável; sem ele a regra é texto.
- **B9** — todo instrumento marcado `v4` carrega o bloco 4b (`conventions[]`) e o 6b (demonstração), ou tem `v4patch:true`.

Também restaurar, porque os relatórios dependem: `run.reduced_capabilities`
(`{tipos, build, suite, runtime}`) e `findings[].instrument_feedback`.

**COMMITE A BANCADA ANTES DE QUALQUER TESTE DESTRUTIVO.** Ver "armadilhas" abaixo.

### 2 · Fechar o defeito B1 do gate
Repro:
```bash
sed -i 's/srcId:"t-av20"/srcId:"t-av20-INEXISTENTE"/' docs/audit/bancada.html
node scripts/bancada-gate.mjs        # DEVERIA reprovar com [B1]; hoje sai 0
git checkout -- docs/audit/bancada.html   # NÃO faça isto se houver trabalho não commitado
```
Suspeita: o parser de itens em `bancada-gate.mjs` usa
`/\{code:"…",\s*fam:"…",\s*ver:"…"[\s\S]*?\}/g`, com `[\s\S]*?\}` não-guloso. Confirme quantos
itens ele reconhece (`OK: N itens`) e se as entradas empurradas via `ITEMS.push(...)` são
capturadas. Um gate que não reprova é teatro — este é o único cheque cuja mordida não foi
provada.

### 3 · Triar o que já foi medido (AV-00 bloco 9)
Nada foi triado. Emitir `triagem/1.0`, que nunca foi exercitado uma vez:
- 4 achados do R1, 3 do R3 — verificar falsificador, atribuir portão, dono e data.
- 110 obrigações do R2 — não são achados; decidir se viram fila de trabalho ou aceite.

O bloco 9 proíbe corrigir achado não triado. **Nenhuma correção de código antes disto.**

### 4 · Os achados de maior dano, se e quando triados
- **R3 F1 (dano 4)** — o caminho de escrita do razão não tem cobertura de integração. Nenhum teste de integração instancia `PostingService`; `PostingDimension.integration.test.ts:76` define um helper local `postEntry` que grava direto via `db.posting.create`.
- **R1 F1 e F2 (dano 3)** — os dois no mesmo `docker-compose.yml`: nome de variável divergente e Qdrant sem chave.

---

## Armadilhas medidas — não repita

1. **`git checkout -- <arquivo rastreado>` destrói trabalho não commitado.** Foi assim que a
   bancada v4 sumiu. Para reverter mutação de teste: copie para `.bak` e restaure de lá, ou
   commite antes.
2. **Regex montada por concatenação perde o escape.** `new RegExp("\\b"+nome+"\\b")` virou
   busca por caractere backspace e nunca casou: classificou 454 de 476 unidades como sem
   teste quando o real era 110. Use literal ou `includes`, e **confirme com um caso de
   sanidade conhecido** antes de acreditar no total.
3. **Contagem tirada de saída truncada não é contagem.** Um `head -5` virou "5 revisões
   independentes"; o total era 8.
4. **`perl -0pi` reescreve CRLF do arquivo inteiro.** Uma mutação de uma linha vira diff de
   79. Confira `git diff --numstat` por mutação antes de rodar a suíte.
5. **Suíte que não roda parece mutação morta.** Um `throw` inserido quebrou o narrowing de
   tipo num `catch` 24 linhas adiante e derrubou 20 suítes ao *carregar*. A leitura correta:
   `Test Suites: falhou` com `Tests: 0 failed` = resultado **inválido**, não morte.
6. **Fan-in cego a alias.** Contar só `./` e `../` perde os imports via `@/` — eram 181, e
   zeravam o fan-in de todos os controllers.

## Ambiente

- `server`: `npm ci` feito nesta sessão (781 pacotes). `npx jest --selectProjects unit` ~42 s;
  `--selectProjects integration --runInBand` ~167 s, exige `OPENAI_API_KEY=ci-dummy-openai-key`.
- `my-app`: **sem `npm ci`** — vitest nunca rodou, força da suíte do frontend desconhecida.
- Grafo `codebase-memory` indexado como `C-Users-smurf-Downloads-Luminaris` (10.841 nós).
  Use-o para localizar, confirme sempre no código (CBM-001). `in_degree` de `Class` vem ~0
  por desenho — nunca ranqueie classe por ele.

## Limite honesto

Nenhuma das três rodadas foi revisada por agente separado, o que o próprio AV-00 §9.4
rejeita. Os achados são candidatos verificados por execução, não triados nem revisados.
