# BRIEF — `legal.py`: alerta de reedição e leitura da API da Receita

**Estado:** **implementado em 09/11/2026** (dono, chat: "Executa"). D1–D6 prontos, 36 testes verdes. O registro da
execução está na §7, e o que a execução corrigiu nesta spec está na §5.

## Contexto fixo

- **Item:** evolução de `~/.claude/tools/pesquisa-legal/legal.py` (ferramenta do método
  `docs/operating-manual/VERIFICACAO-LEGAL.md`). A ferramenta fica **fora do repo**. Este BRIEF fica no repo porque
  o diagnóstico que o motiva está aqui (`REGULATORY-SOURCE-COVERAGE.md` §6).
- **Autorização:** dono, chat, 09/11/2026: "Me da a sua sugestão estruturada em spec" (a spec) e "Faz os contrapontos
  e decide como devemos seguir" (o recorte e os forks) e "Executa" (o código). Não há nó no vault: é ferramenta do agente, não produto, e não é gate (regra ⛔ do `CLAUDE.md`).
- **Insumos** (lidos nesta sessão): `legal.py` de 26/10/2026, 395 linhas (`http_get` :77, `extrair_texto` :104,
  `cmd_baixar` :215–242, `cmd_acervo` :260–300, `cmd_trecho` :303, `cmd_relatorio` :318); a API SIJUT do ato 92278
  (Res. CGSN 140), nas três visões.
- **Consumidores do manifest, que não podem quebrar:** `cmd_relatorio`, `cmd_trecho`,
  `scripts/cobertura-fontes-legais.mjs` e os 87 manifests existentes.

## 1. Contrapontos à primeira versão desta spec, e o que cada um decidiu

A primeira versão tinha 10 comportamentos. Testei cada um contra o repositório antes de decidir.

| Contraponto | Evidência (09/11) | Decisão |
|---|---|---|
| Guardar texto por hash em `_textos/` duplica o que o git já faz | Os 266 `.txt` rastreados são 203 blobs distintos: o git já guarda texto igual uma vez só | **Cortado.** Vira regra sem código: o `.txt` e o manifest entram no commit do dossiê (D5) |
| O campo `classe` não tem quem o leia | Nenhum código nem relatório consome a classe. É a mesma crítica que fiz ao grafo de normas | **Cortado.** Volta quando existir consumidor |
| Baixar três visões da Receita triplica documento sem ganho | As três visões trazem os mesmos 2.033 segmentos e só mudam as marcações. A original já está no acervo. Os dossiês usaram quase só a multivigente | **Uma visão só:** multivigente |
| Minha leitura das marcações da API estava errada | Supus que "riscado na multivigente" = "fora da vigente". Não é: 60 segmentos riscados continuam na vigente, e é a anotação que diz "Revogado pela Res. CGSN 183". (Na execução vi que a vigente traz desses 60 só o rótulo, "II -": ver §5) | **A renderização imprime a anotação de cada segmento** |
| O adaptador é só troca de URL? | Não: o `baixar` já baixa a API, mas grava o JSON cru. O `.txt` de uma multivigente tem linha de 93.107 caracteres, e o `trecho` não serve nele | **Mantido, e é o item de maior valor** |
| O alerta de "texto mudou" chega a quem não precisa | Quem baixa agora vai ler o texto novo de qualquer jeito. Quem precisa saber é o dossiê antigo que citou o texto velho | **Mantido, com o texto do alerta apontando os dossiês afetados** |
| Registrar falha (404) no manifest | Não achei caso em que a falha sem registro causou erro | **Cortado.** A sessão já escreve a lacuna no relatório |
| Comando `capturas --mudou` | A análise foi feita uma vez, à mão, e está na §6 do inventário. Não há rotina que o chame | **Cortado.** A varredura existe dentro do D2 |
| Alerta de "URL final mudou" e tipo "só o bruto difere" | Nenhum caso medido do primeiro. O segundo some quando o `.txt` antigo está no git (D5) | **Cortados** |
| Redação aplicável a uma data passada | O produto só entra em operação em 2027: não há período antigo a apurar | **Fora.** O que importa é o inverso: o que já está agendado para 2027 (D4) |
| Coletores para NF-e/NFC-e (97% fonte oficial) e ISS/NFS-e (70%) | MOC, notas técnicas e manuais não são norma: o acervo nunca vai tê-los. O `baixar` já os alcança, salvo o portal NF-e, que vai pelo navegador | **Não fazer.** O número descreve o módulo, não um defeito |

## 2. Comportamentos decididos

Cada um tem teste offline em `test_legal.py`, ao lado da ferramenta (stdlib `unittest`, com `http_get` trocado por
fixture). Gate: `python -m unittest test_legal` na pasta da ferramenta.

**D1. Hash do texto normalizado.**
- `norm(txt)`: NFC, sequência de espaço em branco vira um espaço, pontas aparadas.
- Documento novo grava `sha256_texto = sha256(norm(txt))`. O `sha256` do bruto continua igual.
- A deduplicação no dossiê passa a usar `sha256_texto`: `Já salvo como [Dnn] (mesmo texto; bruto difere)`.
- Texto com menos de 200 caracteres (página-casca, PDF sem texto) não recebe `sha256_texto`: vale só o bruto.
- Teste: duas fixtures HTML iguais até `</html>`, com `<script id="f5_cspm">` diferente depois → 1 documento.

**D2. Alerta de reedição na captura.**
- Ao gravar um documento, varre `pesquisas-legais/*/manifest.json` atrás das capturas anteriores da mesma chave.
- Chave: `id_normativo` quando existir (D3); senão a URL pedida, sem fragmento e sem diferença de caixa. Medido: 4
  URLs aparecem com duas grafias, como `d12955.htm` e `D12955.htm`.
- Compara com a captura mais recente. Bruto idêntico é `IGUAL` sem mais conta. Se ela não tiver `sha256_texto`,
  calcula na hora a partir do `.txt` dela, se existir.
- Captura antiga da API da Receita guardou o JSON cru como `.txt`. Ela é renderizada de novo a partir do bruto antes
  de comparar; sem o bruto, o resultado é `SEM_COMPARACAO`.
- Resultado gravado em `captura.tipo` e em `alertas`:

| `tipo` | Quando | Texto do alerta |
|---|---|---|
| `PRIMEIRA` | sem captura anterior | (sem alerta) |
| `IGUAL` | mesmo texto | (sem alerta; só `captura.anterior`) |
| `TEXTO_MUDOU` | texto diferente | "TEXTO MUDOU desde <data>. Dossiês que citaram a versão anterior: <slug> Dnn, … Conferir se a conclusão deles ainda vale" |
| `SEM_COMPARACAO` | captura anterior sem texto em disco | "há captura de <data> (<slug> Dnn), mas o texto dela não foi guardado" |

- `TEXTO_MUDOU` imprime as 3 primeiras linhas diferentes (difflib).
- Limite conhecido: a worktree só enxerga dossiês já mergeados na `main` e os dela.
- Teste: um caso por linha da tabela, com dois dossiês de fixture.

**D3. Link da Receita vira leitura da API.**
- O `baixar` reconhece `sijut2consulta/link.action?idAto=N`, `normasinternet2…/#/consulta/externa/N[/visao/V]`,
  `rfb:N` e a própria URL da API.
- Baixa `api/consulta-externa/ato/N/visao/multivigente`. Se a URL pedida já nomear outra visão, respeita.
- Grava o `.json` bruto e o `.txt` renderizado (D4). Campos: `id_normativo: "rfb:N"`, `visao`, `titulo` (de
  `epigrafeCompleta`) e `fonte_oficial` (URL da visão na tela do SIJUT).
- Teste: as quatro formas de entrada resolvem para a mesma URL de API.

**D4. Renderização legível, com anotação por segmento.**
- Ordena `ementas` + `outrosSegmentos` por (`ordemSegmentoAto`, `versaoSegmento`); pula `omitir: true`. A chave do
  segmento é (`idSegmento`, `versaoSegmento`): o ato 92278 tem 2.033 segmentos e só 1.765 ids.
- Uma linha por segmento, com o HTML de `textoIntegra` removido.
- Sai riscado (`~~texto~~`) o segmento com `tachado: true` **ou** com anotação "[Revogado" não agendada.
- `agendado: true` vira `[AGENDADO]` seguido da anotação. A API manda esse segmento **sem texto**: a redação futura
  só existe no ato que a anotação indica.
- Depois do texto, as anotações do segmento (`ancorasDestino` e `ancorasOrigem`), com a `dataInicioVigencia` e o
  `rfb:N` do ato que alterou, pronto para `baixar`. É a anotação que diz "Revogado" ou "Redação dada".
- O cabeçalho traz a situação do ato na fonte. Ato com `vigente: false` gera o alerta "o ato consta como NÃO
  VIGENTE na fonte".
- No fim, "Histórico de alterações": `historico[].texto` e a data de vigência.
- Alertas: "alteração com vigência futura: <texto>, a partir de <data>" (caso real: Res. CGSN 195/2026, em
  01/01/2027) e "N anexos binários não baixados (o texto integral pode estar neles)", com a URL
  `…/ato/N/anexo/<id>` de cada um, para `baixar` à parte.
- O `trecho` passa a aceitar artigo riscado (`~~Art. …`) como cabeçalho.
- Teste, com a fixture real do ato 92278: nenhuma linha passa de 5.000 caracteres; o `trecho` acha "Art. 6º" com o
  artigo no cabeçalho; todo segmento que tem anotação "Revogado" sai com ela na mesma linha.

**D5. Regra de commit do dossiê (sem código).**
- Uma linha no `VERIFICACAO-LEGAL.md`: o `manifest.json` e os `docs/*.txt` entram no commit que usa o dossiê. O
  bruto (html, pdf, json) é opcional.
- Motivo: 328 dos 539 documentos dos manifests não têm mais o arquivo no repo.

**D6. Compatibilidade.**
- Manifest antigo continua válido e não é reescrito. `relatorio`, `trecho` e `cobertura-fontes-legais.mjs` rodam sem
  mudança.
- Teste: o `relatorio` de um manifest no formato de 26/10 sai igual, exceto pela linha "Atualizado em".

## 3. Contratos

Só os campos **novos** de `manifest.documentos[]`, todos opcionais:

```jsonc
{
  "sha256_texto": "string(64 hex)",                    // D1
  "id_normativo": "string",                            // D3, ex. "rfb:92278"
  "visao": "original|vigente|multivigente",            // D3
  "captura": {                                         // D2
    "tipo": "PRIMEIRA|IGUAL|TEXTO_MUDOU|SEM_COMPARACAO",
    "anterior": { "slug": "string", "id": "Dnn", "baixado_em": "ISO-8601", "sha256_texto": "string|null" },
    "citado_em": [ { "slug": "string", "id": "Dnn" } ]  // todos os dossiês com a versão anterior
  },
  "anexos": [ { "nome": "string", "url": "string" } ], // D4
  "alertas": ["string"]                                // já existe no acervo; passa a existir no baixar
}
```

A linha de comando não ganha argumento novo: `legal.py baixar <slug> <url|rfb:N> [...]`.

## 4. Forks — decididos em 09/11/2026 por delegação

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| F1 | Onde versionar a ferramenta | `git init` local em `~/.claude/tools/pesquisa-legal` | Ela serve a todos os projetos. Hoje não há como reverter uma mudança ruim |
| F2 | O que entra no git do projeto | Manifest e `.txt` do dossiê (D5). Sem pasta `_textos/` | O git já deduplica |
| F3 | Como chamar a Receita | O `baixar` detecta e redireciona | A sessão já chega com link SIJUT |
| F4 | Anexos binários | Só listar e alertar | A Res. CGSN 140 tem 24 PDFs. O alerta cobre a armadilha do Anexo III da IN 1.700 |
| F5 | Campo `classe` | Não fazer | Sem consumidor |
| F6 | Segmento agendado | Incluir com `[AGENDADO]` e a data | O produto entra em operação em 2027: o agendado é a regra que ele vai usar |

## 5. O que a execução conferiu e corrigiu nesta spec

Conferência contra a tela do SIJUT (navegador embutido, 09/11/2026, ato 92278):

| Ponto | Tela | API | Efeito |
|---|---|---|---|
| Riscados na multivigente | 205 | 217, dos quais 12 são anexo binário | Bate. O teste fixa 217 |
| Revogados na vigente | 60 anotações "[Revogado(a)", cada uma só com o rótulo ("II -") | 60 segmentos não omitidos, com o texto reduzido ao rótulo e `tachado: false` | **Corrige o que escrevi na §1**: a visão vigente não mostra texto revogado. O rótulo sai riscado mesmo assim |
| Agendados | Só "[Vide modificação prevista para 01/01/2027, nos termos da Res. CGSN 190]" | 232 segmentos com `textoIntegra` vazio | A redação de 2027 **não está neste ato**: é preciso baixar o `rfb:N` indicado |
| Solução de Consulta (SC Cosit 98.035/2025) | não conferida | Mesmos campos; o corpo tem 2 segmentos e o inteiro teor vem em PDF anexo | O alerta de anexo passou a dizer "o texto integral pode estar neles" |

Lacunas de spec que apareceram e como foram fechadas (por delegação: "decide como devemos seguir"):

- **Texto curto como identidade (D1).** Página-casca ou PDF sem texto teriam o mesmo hash de texto. Ficam sem
  `sha256_texto`.
- **Captura antiga da API em JSON cru (D2).** Comparar o `.txt` antigo com o texto renderizado daria falso "texto
  mudou" em toda norma da Receita já citada. A captura antiga é renderizada de novo a partir do bruto.
- **Ato não vigente (D4).** A spec não dizia o que fazer com `vigente: false`. Virou alerta.

## 6. Fora de escopo

- Recuperar o conteúdo dos 46 dossiês que só têm o hash.
- Fontes ausentes do acervo (CONFAZ antes de 2026, RICMS-SP, município de SP, CARF, CPC): o `baixar` e o navegador
  continuam sendo o caminho, dossiê a dossiê.
- Rotina periódica que rebaixa URLs citadas. Seria aparato novo. Volta à mesa se o D2 mostrar reedição frequente.

## 7. Execução (09/11/2026)

- **Onde:** `~/.claude/tools/pesquisa-legal` (fora deste repo), com git local (F1). Commits: `b06ea19` (versão de
  26/10, intacta), `e965ee1` (D1 e D2), `97edf3e` (D3, D4 e D6).
- **Teste:** `python -m unittest test_legal` na pasta da ferramenta: 36 testes, todos offline. As fixtures da
  Receita são respostas reais da API, capturadas em 09/11.
- **Falsificação:** 11 versões mutadas do `legal.py`, uma por regra (não riscar revogado, ignorar `omitir`, tirar as
  anotações, não desviar o link do SIJUT, deduplicar só pelo bruto…). As 11 derrubam pelo menos um teste. A primeira
  rodada deixou uma viva ("bruto idêntico é IGUAL"); o teste que faltava foi escrito.
- **Dado real:** `baixar` com `sijut2consulta/link.action?idAto=92278`, ao lado de cópias de 5 dossiês antigos:
  - leu a Res. CGSN 140 pela API e gravou 2.254 linhas legíveis, com o `trecho` achando o dispositivo sob "Art. 6º";
  - acusou **`TEXTO MUDOU desde 2026-10-29`**, apontando `emissao-mei-me-por-tipo D02`. A mudança é real: as
    alterações da Res. CGSN 191/2026, agendadas para 01/11/2026, entraram em vigor (a linha removida é o § 1º sobre
    a nota de serviço "conforme modelo aprovado e autorizado pelo Município");
  - para a Lei 9.250 no Planalto, respondeu "há captura de 2026-10-17 (irrf-distribuicao D05), mas o texto dela não
    foi guardado", e a segunda captura seguida deu "mesmo texto; bruto difere".
- **Não coberto:** nenhuma revisão por agente independente (o código fica fora do repo e do fluxo de PR). Contra a
  tela só foi conferido um ato grande (Resolução). Instrução Normativa com tabela em anexo HTML não foi testada.
- **O alerta era verdadeiro e o dossiê já estava certo:** o relatório de `emissao-mei-me-por-tipo` (29/10) leu a
  Res. CGSN 191 direto e já concluiu pela NFS-e nacional obrigatória a partir de 01/11/2026. Nada a refazer nele.
