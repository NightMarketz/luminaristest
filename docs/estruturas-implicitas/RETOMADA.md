# Retomada da auditoria de estruturas implícitas (prompt para a próxima sessão)

Escrito em 2026-11-11, quando a orquestração foi encerrada e as sessões arquivadas (dono, chat, 11/11: "feche tudo que você está
fazendo aqui, faça todos os merges possíveis [...] e recuperar o trabalho a partir de um prompt numa próxima sessão").
O estado é o `CORRECOES.md` (bloco "Encerramento de 11/11"). Este arquivo é só o ponto de partida: **confira tudo com `gh` e `git`
antes de agir**, porque foi medido em 11/11.

---

## Prompt

> Você é a orquestração da auditoria de estruturas implícitas. Comece com `git fetch` e leia, nesta ordem:
> `docs/estruturas-implicitas/RETOMADA.md` (este arquivo), o bloco "Encerramento de 11/11" do `docs/estruturas-implicitas/CORRECOES.md`
> e a seção "Estruturas implícitas — faixa 1" do `docs/operating-manual/GAP-MAP.md`. **Antes de tudo, veja que regra de processo vale
> hoje**: em 11/11 estavam abertos dois PRs que mudam o fluxo, o #1223 (método com Fable 5.2: vermelho com revisor PASS entra fora da
> lista dura) e o #1233 (lacuna fora do escopo vai à caixa da maestro, que abre a sessão que a resolve). Se tiverem entrado, eles
> mandam sobre o que está escrito aqui; se não, vale o `CLAUDE.md` da `main`. Depois, trate os itens A–E abaixo e mantenha o
> `CORRECOES.md` em dia (só você o edita, em PR só de docs).

### A. PRs abertos em 11/11 (só a maestro mergeia, salvo ordem do dono no chat)

| PR | ID | Classe | Situação em 11/11 |
|---|---|---|---|
| #1228 | F1-N3 (`useConfirmModal`) | verde | rebaseado para `main` em 11/11; CI rodando. Entra quando ficar verde |
| #1178 | INV F-42.1 (faixa 1) | vermelho | o PASS da rodada 1 é anterior ao commit `5133bd785` (A1, código): precisa de nova rodada do `revisor-independente` no SHA de cabeça; com PASS, entra pela D-2026-11-10-FAIXA1-MERGE-LIVRE |
| #1231 | INV F-37.1 (faixa 4) | vermelho | revisor rodada 1 PASS, CI verde: **lote do dono** |
| #1232 | SM F-16.1 (faixa 4) | vermelho | revisor rodada 1 PASS, CI verde: **lote do dono** |

Depois de cada merge: `[EM PR #n]` → `[CORRIGIDO dd/mm, #n]` no GAP-MAP e o Desfecho na Tabela do `CORRECOES.md`.

### B. Correções aprovadas e não começadas (autorização: `CORRECOES.md` §Aprovados, Dia 3)

- **Faixa 1:** F1-N2 (teste de controle da isenção de pacote; depois do #1178). SM F-01.2, lado AR (`assertTransition` do AR):
  destravado, porque o #1150 e o #1160 entraram.
- **Faixa 4** (teste-guarda determinístico, nunca concorrência real): INV F-06.1, INV F-12.1, INV F-15.2, INV F-16.4, SM F-21.1,
  EFX F-18.3 (conferir com o INV-39 antes), F4-N1. SM F-40.2 (+EFX F-15.1) só depois do merge do #1133.
- **Faixa 3** (ZP liberada só na execução daquele ID): EFX F-23.3, BRD F-54.2, BRD F-53.1 (espera o #1146 se tocar
  `AssinadorRemotoPort.ts`), BRD F-46.2, BRD F-71.2, BRD F-49.1, BRD F-64.1, EFX F-18.1 (só a metade CRM), EFX F-17.1, EFX F-02.1,
  SM F-06.1. Depois do merge do #1146: SM F-09.2, SM F-11.2, EFX F-09.1.

Antes de cada um: `git diff d3cf331e7 origin/main -- <arquivos citados>`; se mudou, reabra. Cada um vai pela `sessao-instrumentacao`
→ `sessao-correcao`, com a frase de autorização citada no brief.

### C. Achados fora de escopo relatados pelas sessões de 11/11 (triar; nenhum foi conferido pela orquestração)

1. **#1226:** o botão de seed de dev aparece com `NEXT_PUBLIC_ENABLE_DEV_SEED` **ou com `?devSeed=1` na URL**, então qualquer
   usuário chega a ele. Possível defeito de segurança/dado: triar primeiro.
2. **#1226:** a contagem da ficha BRD-73 (19 `catch` só `console`) não bate com os 17 de hoje, e o script do leitor não foi versionado.
3. **#1229:** os dois `useChatMessages` (`chat/hooks` × `shared/hooks`) e os dois `useChatInstance` são pares de cópias (um PR por
   par); `getLastChatInstanceId` (`shared/hooks/useChatInstances.ts`) não tem chamador (o cookie é gravado e nunca lido).
4. **#1230:** `DynamicTableService.updateTableData` lê `existingData` com `this.repository`, fora do repositório da tx, mesmo
   recebendo `options.tx` (perto da linha 788). **`DynamicTableService.ts` é zona proibida:** só registrar e perguntar ao dono.
5. **#1232:** o `setReversedBy` logo depois do `setStatus` grava sem condição (com o CAS ele não roda mais na corrida); o estorno
   que perde a corrida responde 409 genérico, e não o 400 "desfaça a conciliação".
6. Os "Fora de escopo" já anotados nas células da Tabela do `CORRECOES.md` (ex.: `MAX_IMPORT_CELLS` lança `Error` simples → 500,
   no BRD F-65.1): conferir se algum ainda não tem destino.

Para cada um: confirmar no código (o relato é da sessão, não prova), depois corrigir, virar linha nova ou registrar como
intencional. Vira pergunta ao dono só o que não for evidente.

### D. Decisões do dono (questionário com contexto; a leitura recomendada é a 1ª opção)

- `executa` do BRIEF do BRD F-01.1 (`BE-INCR-API-ERROR-ENVELOPE-brief.md`; forks F-ENV-0..10 ratificados; o F-ENV-10 libera a ZP no
  executa). Com ele, o BRIEF vai à `sessao-feature` e, no fim, destrava a faixa 2 (BRD F-04.3, F-73.1).
- Rodada das questões abertas da faixa 3: AUT Q-01..Q-07, EFX Q-02/Q-03/Q-05, BRD Q2 (o dono escolheu fazer essa rodada antes da
  aprovação por ID dos 35 restantes). O tema G espera oráculo externo: não perguntar.
- Metade Reinf do EFX F-18.1.
- Os achados da seção C que pedirem decisão (no mínimo o item 4, que é ZP).

### E. Fim

A auditoria fecha quando a seção da faixa 1 do GAP-MAP não tiver `[ABERTO]` nem `[EM PR #n]` (isso também encerra a D-FAIXA1), os
IDs aprovados das faixas 3 e 4 tiverem desfecho, os achados de C tiverem destino e as decisões de D estiverem respondidas ou
registradas como paradas no dono.
