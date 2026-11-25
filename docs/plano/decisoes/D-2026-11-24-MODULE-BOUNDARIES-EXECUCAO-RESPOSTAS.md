---
id: "D-2026-11-24-MODULE-BOUNDARIES-EXECUCAO-RESPOSTAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Respostas do dono às lacunas de spec achadas na execução do BRIEF MODULE-BOUNDARIES (PR-2, PR de users/public e PR-2b) — questionários de 24/11"
estado: "decided"
autorizacao: "dono, 2026-11-24, chat: \"Executa o BRIEF inteiro\" (fork novo para o nó e vira pergunta). Questionário (AskUserQuestion) da sessão de feature do PR-2, três perguntas, respostas literais: lint de public/ → \"No PR-2 (Recommended)\"; skill job-generator × J1 → \"Regra agora (Recommended)\"; como users expõe IUser e Role → \"Tudo em user.types.ts (Recommended)\". Questionário (AskUserQuestion) da sessão de feature do PR de users/public e do PR-2b, duas perguntas, respostas literais: a regra nova de public/*.types.ts mede 1 → \"Mover BindingScope já (Recommended)\"; mover o JobWatermarkRepository cria aresta J1 nova → \"Job pede à factory (Recommended)\". Dono, 2026-11-24, chat da mesma sessão, sobre os itens em aberto do relatório (entre eles 'BRIEF e decisoes/ não registram as duas respostas novas'): \"pode seguir o handoff\""
atualizado: "2026-11-24"
---
# D-2026-11-24-MODULE-BOUNDARIES-EXECUCAO-RESPOSTAS — respostas do dono durante a execução do BRIEF

**Estado:** `decided`
**Autorização:** dono, 2026-11-24, dois questionários (respostas literais no cabeçalho). Escopo: **cada resposta fecha
uma lacuna de spec** que a sessão de feature achou e não podia escolher sozinha. Não ratifica fork novo do BRIEF além
dos cinco pontos abaixo.

Base: [`MODULE-BOUNDARIES-brief.md`](../../architecture/MODULE-BOUNDARIES-brief.md) §2 e §5.3 (emenda no §13) e
[`ADR-MODULE-BOUNDARIES.md`](../../adr/ADR-MODULE-BOUNDARIES.md) §11.4 e §11.5. Nó: [[MODULE-BOUNDARIES]]. Forks do
BRIEF: [[D-2026-11-24-MODULE-BOUNDARIES-BRIEF-FORKS]].

## Respostas

| # | Lacuna de spec | Resposta literal | Efeito | Onde foi executado |
|---|---|---|---|---|
| 1 | O F-MBE-3 (a) pede lint de `public/` (`export *` e import por efeito colateral), e nenhum PR do BRIEF era dono dele (`L-20261124-193620-f833`) | "No PR-2 (Recommended)" | Regra R6 no `server/eslint.config.mjs`, no job de lint que já roda; baseline 0 | PR-2 (#1380) |
| 2 | A skill `job-generator` mandava o job usar o Prisma direto, o contrário da `J1` (`L-20261124-193622-4901`) | "Regra agora (Recommended)" | `JOB-005`, o contrato de geração, o eval `happy-2` e o controle passam a mandar o job pelo `getFactory()` | PR-2 (#1380) |
| 3 | As skills mandam service e policy importarem `IUser` e `Role` de `users/models/`, que a `M1` barra; `Role` é enum, valor (`L-20261124-194301-a802`) | "Tudo em user.types.ts (Recommended)" | `users/public/user.types.ts` reexporta o tipo `IUser` e o enum `Role`. O arquivo `public/<nome>.types.ts` passa a valer para tipo, enum e constante de `models/` e `dtos/`, com regra nova que o impede de importar outra pasta (`M4`). PR próprio na pilha, antes do PR-3.x | PR de `users/public` (#1384) |
| 4 | A regra nova da resposta 3 não nascia em 0: media 1, porque `accountingBinding/public/bindingScope.types.ts` (PR-0) reexportava de `scope/`, pasta que só viraria `models/` no PR-3.x (`L-20261124-201656-6a27`) | "Mover BindingScope já (Recommended)" | `accountingBinding/scope/BindingScope.ts` vai para `models/` no #1384, antecipado do PR-3.x dessa feature. A `M4` nasce em 0. Opções recusadas: 1 entrada no known-violations; exceção nomeada na regra | PR de `users/public` (#1384) |
| 5 | Só mover `JobWatermarkRepository.ts` para `jobs/repositories/` não dava `J1` 16 → 15: nascia a aresta `accountingSyncReconcile.job.ts → jobs/repositories/JobWatermarkRepository`, que a `J1` barra (`L-20261124-201825-23c5`) | "Job pede à factory (Recommended)" | A `lib/factory.ts` registra o repositório e o expõe por `getJobWatermarkRepository()`; o job o pede ao `getFactory()`. `J1` 16 → 15 sem entrada nova. O PR deixa de ser verde: vermelho, revisor obrigatório. Opções recusadas: trocar a entrada no baseline; deixar para o PR-7.x | PR-2b (#1385) |

## Consequências

- **`*.types.ts` não é mais "só tipo".** Policy, model e dto de outra feature importam por ele um enum (valor em
  runtime). O que segura o arquivo é a `M4`: só `models/` e `dtos/` da própria feature. A `M4` é literal: não aceita o
  `*.types.ts` de outra feature nem pacote externo.
- **O PR-3.x do `accountingBinding` encolhe:** a linha `scope/` da tabela §5.3 do BRIEF já está paga.
- **O PR-7.x do `accountingSyncReconcile` começa de 5 arestas `J1`** (4 repositórios e `lib/prisma`), não de 6, e tem
  onde se apoiar: o teste `accountingSyncReconcile.factoryWiring.integration.test.ts` roda o job com a factory real.
- **A classe prevista no BRIEF mudou em dois PRs:** o PR de `users/public` não existia na tabela §2 (vermelho, revisor
  obrigatório) e o PR-2b saiu vermelho com revisor obrigatório.

## O que esta decisão não faz

- Não registra a resposta "Vai para o service" do PR-1a (#1369), que revoga a L-8 do BE-INCR-LEGAL-PARAMS: ela tem
  lacuna própria (`L-20261124-182555-0bd2`) e toca outro BRIEF e outro ADR.
- Não decide quem grava controle e `REPORT.md` do `skill-audit` (`L-20261124-201658-b9e7`, `L-20261124-203827-1f72`):
  a pasta `.claude/skills/skill-audit/**` é negada para escrita de agente no `.claude/settings.json`.
- Não liga a `M2` nem move outra pasta de feature.
