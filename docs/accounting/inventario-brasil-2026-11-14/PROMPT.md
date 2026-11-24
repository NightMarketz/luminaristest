# Prompt do inventário de Brasil (para leitor Haiku, esforço médio)

Usado em 14/11/2026. Troque `<REPO>`, `<TOOL>` e `<OUT>` pelos caminhos da sessão. As linhas marcadas **(v2)** são
correções aprendidas na primeira rodada.

---

Você é um LEITOR: só COLETA, de forma EXAUSTIVA e mecânica. Não classifique o que é bom ou ruim, não recomende, não diga
o que "deveria" mudar, não edite nada do repositório. O julgamento é de quem te despachou.

## Objetivo
Achar TODOS os locais do repositório em que aparece cada coisa específica do Brasil (lei, fisco, trabalho, banco,
identificadores, moeda, idioma, fuso). "Todos" é literal: nenhuma lista pode ser cortada. Por isso o trabalho é feito por
um script que você escreve e roda, não por leitura manual.

## Onde
- Repositório (somente leitura): `<REPO>` (monorepo: `server/` Express+Prisma, `my-app/` Next.js).
- Script em `<TOOL>`, saídas em `<OUT>`. Nenhum arquivo dentro do repositório. **(v2)** Leia `REPO` e `OUT` de variável de
  ambiente, com esses caminhos como padrão.
- Node. Liste os arquivos com `git -C <REPO> ls-files` e filtre: entram `server/src/**`, `server/prisma/schema.prisma`,
  `server/prisma/data/**`, `server/test/**`, `server/scripts/**`, `my-app/**` (exceto `my-app/public/locales/**`, à
  parte), `scripts/**`. **(v2)** Inclua `server/prisma/migrations/**` como camada própria `migracoes`. Ficam fora:
  `docs/**`, `pesquisas-legais/**`, `.claude/**`, `node_modules`, `.next`, `server/public/openapi.json`, `*.xsd`,
  `*.lock`, binários. Extensões: `.ts .tsx .js .jsx .mjs .cjs .prisma .sql`.

## Como casar os termos
1. Em cada linha, extraia identificadores e palavras e quebre em tokens por camelCase, snake_case, kebab-case e pontuação
   (`issAliquotaBp` → `iss`, `aliquota`, `bp`). Compare sem diferenciar maiúsculas nem acento.
2. Termo de uma palavra casa com um token exato. Termo composto (`simples nacional`, `America/Sao_Paulo`, `pt-BR`, `R$`)
   casa como texto na linha.
3. Termos curtos ou ambíguos (marcados com `?`) vão para `ambiguos.tsv`.
4. **(v2)** Exclusões: `simples` precedido de `cliente`; token `a1` dentro de código de ticket (`F-…-a1`, `(a1`); nome de
   constante só casa `ANO` como token inteiro (não dentro de `CANONICAL`).

## Categorias e termos (semente)
- IDENT: cpf, cnpj, cnae, caepf, cno, cei, nis, nit, pasep, ctps, crc, cnh, `rg?`, `ie?`, `im?`, inscricao estadual,
  inscricao municipal, titulo eleitor, razao social, nome fantasia
- ENDERECO: cep, `uf?`, ibge, municipio, logradouro, bairro, viacep, ddd, `+55`
- MOEDA: brl, `R$`, centavos, cents, `toFixed(2)`, `currency`, `Intl.NumberFormat`
- LOCALE: pt-BR, pt_BR, America/Sao_Paulo, `-03:00`, UTC-3, brt, timeZone, feriado, dia util, `toLocaleDateString`,
  `toLocaleString`
- REGIME: mei, simei, simples, simples nacional, presumido, lucro presumido, `real?`, lucro real, crt, anexo, fator r,
  rbt12, `das?`, pgdas, defis, sublimite
- TRIBUTO: icms, icmsst, `st?`, difal, fcp, ipi, iss, issqn, `pis?`, cofins, csll, irpj, irrf, irpf, inss, fgts, ibs,
  cbs, cprb, rat, fap, cide, iof, csrf, jcp, monofasico, retencao, aliquota, base de calculo
- CLASSIF: ncm, cest, cfop, `cst?`, csosn, cclasstrib, nbs, lc116, codigo de receita, natureza de rendimento, cbenef
- DOCFISCAL: nfe, nfce, nfse, cte, mdfe, danfe, dps, sefaz, svrs, adn, chave de acesso, cstat, inutilizacao,
  contingencia, `a1?` **(v2)**, icp, certificado
- OBRIGACAO: sped, ecd, ecf, efd, reinf, esocial, dctf, dctfweb, dirf, mit, perdcomp, lalur, lacs, referencial, pva, darf,
  gps, dae, fgts digital
- BANCO: cnab, pix, boleto, ted, `doc?`, febraban, compe, ispb, mercadopago, mercado pago, split payment
- TRABALHO: clt, rubrica, decimo terceiro, `13º` e `13o` (não o número `13` sozinho) **(v2)**, ferias, aviso previo, cbo,
  sindicato, cct, convencao, salario minimo, dsr, vale transporte, pro labore, aprendiz, estagio, afastamento, holerite,
  folha
- CONTABIL: bp, dre, dfc, dmpl, dlpa, cpc, nbc, cfc, itg, ano calendario, anoCalendario, exercicio, plano de contas,
  fiscalYear
- ORGAO: rfb, receita federal, cgsn, bacen, cvm, mte, `caixa?`, anpd, procon, prefeitura
- NORMA: regex `\b(Lei|LC|Lei Complementar|IN RFB|Decreto|Res\.|Resolução|Portaria|Súmula|MP|EC)\s+n?º?\s*[\d.]+`,
  `art\.\s*\d+`, `§\s*\d+`, CLT, CTN, LGPD, CDC
- VIGENCIA: datas literais `20\d\d-\d\d(-\d\d)?` entre aspas simples, duplas ou crase, e anos `20(1\d|2\d|3[0-3])`, em
  linha de código junto de operador de comparação, `const`, `gte(`, `lte(`, `min(`, `max(`
- TEXTO_PT: (a) no front (`my-app/pages`, `features`, `components`): linha com `[áàâãéêíóôõúç]` que não contém `t('`,
  `t("` nem `useTranslation`; (b) em `server/src` não-teste: string literal com letra acentuada

## Uma linha TSV por ocorrência
`categoria \t termo \t camada \t tipo \t caminho \t linha \t trecho` (trecho ≤ 180 caracteres, sem tab).
- `tipo`: `teste` se o caminho tem `__tests__`, `.test.`, `.spec.`, `/test/`, `/fixtures/`; senão `comentario`; senão
  `codigo`. **(v2)** Comentário = linha que começa com `//`, `/*`, `--`, `#`, ou com `*` **seguido de espaço dentro de
  bloco `/* … */` aberto** (não trate `*` de multiplicação como comentário).
- `camada` (pelo caminho, primeira regra que casar): `schema`; `seed-legal` (`server/prisma/data/**`); `nucleo-razao`
  (`features/accounting/services/{PostingService,PeriodService,AuditService}.ts`,
  `features/accounting/repositories/PostingRepository.ts`); `escopo-e-primitivas`
  (`features/accounting/{scope/**, models/dates.ts, models/money.ts, audit/**}`); `accounting-models`, `-services`,
  `-dtos`, `-repositories`, `-outros`; `legalParameters`; `dp`; `dynamicTables-motor` (exceto `presets/**`);
  `dynamicTables-presets`; `sectorKits`; `accountingBinding`; `packages`; `sales`; `crm`; `analytics`; `chat-e-ia`;
  `outras-features`; `lib-fiscal`; `lib-outros`; `controllers`; `routes`; `jobs`; `server-outros`; `fe-pages`;
  `fe-features-accounting`; `fe-features-dashboard`; `fe-features-crm`; `fe-features-outros`; `fe-components`; `fe-lib`;
  `fe-types-gerados`; `fe-outros`; `scripts`.

## Saídas
`ocorrencias.tsv` (sem corte), `ambiguos.tsv`, `matriz-categoria-camada.tsv` (linhas distintas, por tipo),
`matriz-termo-camada.tsv` (só código), `arquivos-por-categoria.tsv`, `nucleo.tsv` (camadas `nucleo-razao`,
`escopo-e-primitivas`, `dynamicTables-motor`, `schema`), `locales.txt`, `descoberta.tsv` (400 tokens em português
frequentes fora da semente; **(v2)** exclua palavras-chave de SQL e siglas em inglês), `RESUMO.txt`.

## Conferência obrigatória (auto-teste)
Rode buscas independentes e compare com o TSV; divergência acima de 5% ⇒ corrija o script e diga o que estava errado.
Valores de 14/11/2026 (mudam com o código; use-os como ordem de grandeza):
- `'BRL'` em `server/src/{features,lib,controllers,jobs}` não-teste: 67 linhas em 28 arquivos.
- `America/Sao_Paulo` no mesmo recorte: 28 linhas em 23 arquivos.
- `export const` com `DESDE|INICIO|FIM|ULTIMO|ANO` igual a data ou ano em `features/accounting`: 11.
- **(v2)** Na camada `nucleo-razao`, liste no RESUMO toda ocorrência de código de DOCFISCAL, OBRIGACAO e REGIME (em 14/11:
  `lalur`, `lacs` e `ecd` em `PostingService.ts`).

## Entrega
Só: os caminhos dos arquivos, nº de arquivos varridos, totais por categoria (código / comentário / teste), o resultado da
conferência (esperado × obtido) e as limitações do script. Não cole listas na resposta.
