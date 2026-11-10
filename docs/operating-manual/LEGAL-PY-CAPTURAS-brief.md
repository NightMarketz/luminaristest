# BRIEF — `legal.py`: alerta de reedição e leitura da API da Receita

**Estado:** escopo e forks **decididos** em 09/11/2026, por delegação do dono. Falta só o "executa". Nada foi
implementado.

## Contexto fixo

- **Item:** evolução de `~/.claude/tools/pesquisa-legal/legal.py` (ferramenta do método
  `docs/operating-manual/VERIFICACAO-LEGAL.md`). A ferramenta fica **fora do repo**. Este BRIEF fica no repo porque
  o diagnóstico que o motiva está aqui (`REGULATORY-SOURCE-COVERAGE.md` §6).
- **Autorização:** dono, chat, 09/11/2026: "Me da a sua sugestão estruturada em spec" (a spec) e "Faz os contrapontos
  e decide como devemos seguir" (o recorte e os forks). **Nenhuma das duas autoriza código**: implementar exige um
  "executa" (ORCH-006). Não há nó no vault: é ferramenta do agente, não produto, e não é gate (regra ⛔ do `CLAUDE.md`).
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
| Minha leitura das marcações da API estava errada | Supus que "riscado na multivigente" = "fora da vigente". Não é: 60 segmentos riscados aparecem na vigente, **sem risco**, e só a anotação diz "Revogado pela Res. CGSN 183" | **A renderização imprime a anotação de cada segmento.** Sem ela, texto revogado parece vigente |
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
- Teste: duas fixtures HTML iguais até `</html>`, com `<script id="f5_cspm">` diferente depois → 1 documento.

**D2. Alerta de reedição na captura.**
- Ao gravar um documento, varre `pesquisas-legais/*/manifest.json` atrás das capturas anteriores da mesma chave.
- Chave: `id_normativo` quando existir (D3); senão a URL pedida, sem fragmento e sem diferença de caixa. Medido: 4
  URLs aparecem com duas grafias, como `d12955.htm` e `D12955.htm`.
- Compara com a captura mais recente. Se ela não tiver `sha256_texto`, calcula na hora a partir do `.txt` dela, se
  existir.
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
- `tachado: true` vira `~~texto~~`. `agendado: true` vira `[AGENDADO] texto`.
- Depois do texto, as anotações do segmento (`ancorasDestino[].texto` e `ancorasOrigem[].texto`), com a
  `dataInicioVigencia`. É a anotação que diz "Revogado" ou "Redação dada".
- No fim, "Histórico de alterações": `historico[].texto` e a data de vigência.
- Alertas: "alteração com vigência futura: <texto>, a partir de <data>" (caso real: Res. CGSN 195/2026, em
  01/01/2027) e "N anexos binários não baixados", com a URL `…/ato/N/anexo/<id>` de cada um, para `baixar` à parte.
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

## 5. Ainda não verificado

- **Aparência na tela do SIJUT.** As marcações foram conferidas só nos dados da API. Falta comparar um artigo com
  revogação e um com redação nova contra a tela, no navegador embutido. É o primeiro passo da implementação do D4,
  e não é pergunta ao dono.
- **Solução de Consulta na API.** Só li uma Resolução. Antes de fechar o D4, baixar uma SC Cosit e conferir que os
  campos são os mesmos.

## 6. Fora de escopo

- Recuperar o conteúdo dos 46 dossiês que só têm o hash.
- Fontes ausentes do acervo (CONFAZ antes de 2026, RICMS-SP, município de SP, CARF, CPC): o `baixar` e o navegador
  continuam sendo o caminho, dossiê a dossiê.
- Rotina periódica que rebaixa URLs citadas. Seria aparato novo. Volta à mesa se o D2 mostrar reedição frequente.

## 7. Ordem de execução

1. PR só de documentação e script de medição: este BRIEF, o inventário e `scripts/cobertura-fontes-legais.mjs`.
2. `git init` na pasta da ferramenta, com a versão de 26/10 como primeiro commit (F1).
3. D1 e D2, com teste. Não dependem da Receita.
4. Conferência da tela do SIJUT (§5), depois D3 e D4.
5. D5: a linha no `VERIFICACAO-LEGAL.md` e a atualização da memória `legal-py-achar-ssl-e-rfb-fora-do-acervo`.
