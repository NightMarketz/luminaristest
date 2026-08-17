---
name: sessao-correcao
description: Sessão de CORREÇÃO de lacuna mapeada — faz o teste-guarda vermelho passar com o diff mínimo, sem tocar em arquivo fora da localização e sem consertar nada além. Exige teste-guarda já falhando. Triggers "corrige a lacuna", "faz o teste-guarda passar", "sessão de correção", "fix mínimo da lacuna", "conserta o que o teste prova".
argument-hint: "[linha da lacuna no GAP-MAP + caminho do teste-guarda que falha]"
allowed-tools: Read, Grep, Glob, Edit, Bash
metadata:
  governance-skill-id: "SKL-SESS-FIX"
  governance-version: "1.0.0"
  governance-status: "validated"
  governance-owner: "engineering"
---

# Sessão de correção — o teste-guarda é o limite, não o começo

Esta é a sessão mais estreita das quatro: entra com um teste vermelho, sai com ele verde, e **nada mais
muda**. Achado não é tarefa.

> **Por que esta skill não tem `Write`:** criar arquivo novo é, por definição, tocar fora da lista de
> localização — o que a regra 1 manda reportar em vez de fazer. A ausência da ferramenta é a regra 1
> materializada. Se o fix mínimo exigir arquivo novo, **PARE e reporte**.

## Roteamento — quando NÃO é esta sessão

| Situação | Sessão correta |
|---|---|
| Não existe teste-guarda, ou ele não falha | `sessao-instrumentacao` |
| O teste falha por setup/import/fixture, não pela asserção | `sessao-instrumentacao` (o teste está errado) |
| O comportamento nunca existiu — é feature ausente | `sessao-planejamento` → `sessao-feature` |
| A causa raiz está fora da localização listada | **Nenhuma** — regra 3: reporte a divergência |

---

## O formulário — preencher ANTES de executar

> Pré-requisito: este prompt só é preenchível para lacuna que já tem
> teste-guarda escrito e falhando. Sem teste-guarda, a sessão correta é a
> de INSTRUMENTAÇÃO, não esta.

### Contexto fixo (não rediscutir)
> Regra de preenchimento: todo campo abaixo deve conter conteúdo real do
> repositório. Campo que não se aplica ao repo deve ser APAGADO antes de
> abrir a sessão — placeholder ou exemplo deixado no formulário conta como
> decisão não coberta e dispara pausa imediata (regra 5).

- Lacuna: [descrição, nível e tipo conforme o GAP-MAP — linha exata]
- Autorização: [referência à decisão do dono que priorizou esta lacuna —
  linha do GAP-MAP + data da decisão]
- Localização: [arquivo(s) e função(ões) exatos identificados no censo]
- Teste-guarda: [caminho do teste que hoje FALHA e reproduz a lacuna]

### Definição de pronto (única)
O teste-guarda acima passa, e nenhum teste que passava antes quebrou.
Nada além disso.

### Regras de escopo — invioláveis
1. Modifique SOMENTE os arquivos listados na localização. Se a correção
   correta exigir tocar arquivo fora dessa lista, PARE e reporte — não
   toque.
2. Se durante a correção você encontrar OUTRA lacuna, defeito ou melhoria
   possível: registre em uma seção "Achados fora de escopo" no relatório
   final e NÃO corrija. Achado não é tarefa. (Nota: registrar achado
   observado durante a correção não viola moratória de censo — moratória
   suspende rodadas de descoberta, não o relato do que apareceu no
   caminho.)
3. Se a lacuna se revelar diferente do descrito (causa raiz em outro
   lugar, teste-guarda testando a coisa errada), PARE e reporte a
   divergência — não reinterprete a tarefa.
4. Não adicione verificação, refatoração, comentário, renomeação ou
   "limpeza" além do mínimo necessário pra fazer o teste-guarda passar.
   Você já verifica seu próprio trabalho por padrão; não adicione camadas
   extras de checagem.
5. Qualquer decisão não coberta por este documento — mesmo que pareça
   rotineira ou de baixo risco — deve ser documentada e a execução
   pausada nesse ponto. Nunca escolha um caminho por conta própria.

### Sequência obrigatória
1. Rode o teste-guarda e confirme que ele falha pelo motivo descrito.
   Se passar ou falhar por outro motivo, PARE e reporte.
2. Implemente a correção mínima.
3. Rode o teste-guarda (deve passar) e a suíte relacionada (nada novo
   pode quebrar).
4. Relatório final: o que mudou (diff resumido), por que é a correção
   mínima, e a seção "Achados fora de escopo" (mesmo que vazia).

---

## Notas de operação neste repo (aditivas — não alteram as regras acima)

**Comandos do passo 1 e 3:**

```bash
cd server && npm run test:integration
```

Nunca `npx jest --selectProjects integration` cru — 29 de 41 suítes colidem no mesmo SQLite sem o
`--runInBand` que o `npm run` passa. Para unit, `npx jest <caminho>`. O `tsc` é gate:
`cd server && npx tsc --noEmit` e `cd my-app && npx tsc --noEmit` — não avance vermelho.

**Worktree novo:** `npm ci` + `.env` com `OPENAI_API_KEY=ci-dummy-openai-key`, senão o passo 1 falha por
motivo espúrio e você reporta divergência que não existe.

**Gates que o diff aciona não são "verificação extra" da regra 4** — são consequência mecânica da
mudança, e o CI cobra: snapshot de shape dos DTOs Zod (se o fix tocar DTO), allowlist do
`auditCanonical.ts` (se emitir eventType novo), guard de path-count do openapi (se tocar rota), paridade
i18n (se tocar string de UI). Atualizá-los **é** parte da correção mínima; deixá-los quebrados não é
minimalismo, é diff incompleto.

**Cuidado com a classe do achado.** Bug de chave de idempotência, de data-only e de renderização de data
são **classes** neste repo, não casos isolados — mas varrer a classe inteira é trabalho de outra sessão.
Aqui: conserte o caso do teste-guarda, e registre a suspeita de classe em "Achados fora de escopo".
