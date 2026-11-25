# Inventário do que é Brasil no código — 14/11/2026

> **Correção de 15/11/2026 (dono, chat: "vc já contou errado").** Este inventário casa **termos**, e por isso mistura
> **idioma** com **país**: conta como "Brasil" conceitos universais escritos em português (folha, rubrica, férias,
> alíquota, retenção, plano de contas). Use-o para **achar** onde olhar, nunca para dizer quanto do código é do Brasil. As
> somas por camada abaixo **não** medem acoplamento com país. A regra e a medida por conceito estão em
> [`docs/adr/PRE-ADR-PAIS-NA-BORDA.md`](../../adr/PRE-ADR-PAIS-NA-BORDA.md).

Pedido do dono (chat, 14/11): *"Tem que dar um prompt pra um haiku achar todos os locais em que cada coisa específica do
Brasil aparece"*. Um leitor Haiku (só coleta) escreveu e rodou o script; a classificação é da sessão principal.

**Grau:** as ocorrências são **casamento de termo por script**, não leitura. Servem para localizar; cada conclusão sobre
o que o código faz se confirma lendo o arquivo. Os pontos lidos estão nas lacunas citadas abaixo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `inv-br.mjs` | O script (Node, ~4 s, só lê o repositório). As linhas 5 e 6 têm `REPO` e `OUT` fixos: ajuste antes de rodar |
| `RESUMO.txt` | Totais por categoria, top 30 arquivos, conferência do script |
| `matriz-categoria-camada.tsv` | Linhas distintas por categoria × camada, separando código, comentário e teste |
| `matriz-termo-camada.tsv` | Idem por termo × camada, só código |
| `arquivos-por-categoria.tsv` | Todos os arquivos com ao menos uma ocorrência de código, por categoria |
| `nucleo.tsv` | Recorte das camadas que deveriam ser livres de país: núcleo do razão, escopo e primitivas, motor DynamicTable, schema |
| `descoberta.tsv` | 400 termos em português frequentes que não estavam na lista (com ruído de SQL e siglas em inglês) |
| `locales.txt` | Arquivos de tradução por idioma e nº de chaves |

**Fora desta pasta, por tamanho:** `ocorrencias.tsv` (98.994 linhas, 20 MB) e `ambiguos.tsv` (10.733 linhas, 2 MB). O script
os regenera.

## Números

- 3.165 arquivos varridos (+ 18 de tradução). 98.994 ocorrências principais e 10.733 de termos ambíguos (`ie`, `uf`, `real`,
  `pis`, `das`…), estas em arquivo à parte.
- Linhas distintas de código com termo brasileiro (sem texto, moeda, citação de norma e data): contabilidade 7.682
  (serviços 3.416, modelos 2.241, DTOs 1.189, repositórios 580, outros 256), carga de parâmetros legais 2.524, front da
  contabilidade 2.245, tipos gerados do front 1.144, libs fiscais 1.057, DP 673, schema 493.
- Camadas que deveriam ser livres de país: **núcleo do razão 23**, **escopo e primitivas 110** (104 em
  `audit/auditCanonical.ts`), **motor DynamicTable 32**.
- Conferência do script contra buscas independentes: `'BRL'` 67 linhas em 28 arquivos (igual); `America/Sao_Paulo` 28 em 23
  (igual); constantes de vigência 11 (igual).

## O que virou lacuna (caixa do maestro)

| Lacuna | Onde | O quê |
|---|---|---|
| `L-20261115-013829-41b5` | `PostingService.ts:1062`, `:966` | O núcleo do razão conhece e-Lalur e a regra de níveis da ECD |
| `L-20261115-013846-1cb6` | `audit/auditCanonical.ts:18` | A allowlist de auditoria nomeia os eventos de todos os domínios |
| `L-20261115-013846-5722` | `DynamicTable.model.ts:29` | `cpf` e `cnpj` como formato de campo no motor genérico |
| `L-20261115-013846-764a` | servidor | 3.989 linhas de mensagem em português fixo no código |
| `L-20261114-222614-0d37`, `…-b556`, `…-0a7b`, `…-675c`, `…-223006-1fd7`, `…-223006-d704` | — | Registradas antes, na mesma conversa: plataforma que conhece domínios, primitivas dentro da contabilidade, núcleo sem guarda, vigência em código, ano fiscal em duas cópias, moeda e fuso fora do slot do escopo |

## Limitações do script

- O termo `13` (13º salário) casa qualquer número 13.
- Na conferência de vigência, `CANONICAL` casa `ANO` no nome (1 falso positivo).
- Migrações (`server/prisma/migrations`, 165 `.sql`) ficaram fora.
- "Comentário" é decidido pelo início da linha: um `*` de multiplicação no início conta como comentário.
- Texto em português: só pega string com letra acentuada (é piso).
- Falsos positivos conhecidos: `simples` em "cliente simples" (motor DynamicTable), `a1` em código de ticket.

## O prompt

O prompt completo dado ao leitor está em [`PROMPT.md`](PROMPT.md), já com as correções acima anotadas.

**Publicação (24/11):** o `inv-br.mjs` não foi publicado: tinha caminhos locais fixos (linhas 5 e 6) de uma worktree e de um scratchpad. As tabelas são a saída dele em 14/11. A contagem por termo foi retirada em 15/11 (`D-2026-11-15-PAIS-NA-BORDA`).
