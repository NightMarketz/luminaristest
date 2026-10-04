# BRIEF — BE-INCR-UNIT-REKEY-VERIFY-V (nó I1b): regra (v) e cabeças do pré no `--verify` do re-key

> **Status:** ✅ **IMPLEMENTADO no PR #503** (`sessao-feature`, autorização do dono no chat em 2026-10-04: *"executa o
> código das L-RK-6/7"*). Itens 1–6 feitos; o item 7 (rastreio) foi feito no mesmo PR. Par vermelho→verde: os 2
> testes-guarda saem com exit 0 contra `93af35b1` e passam depois (14/14). **Forks: 0 abertos**; as duas direções foram
> ratificadas em [`D-2026-10-04-I1B-RESSALVAS-501`](../plano/decisoes/D-2026-10-04-I1B-RESSALVAS-501.md). Produzido em
> 2026-10-04, depois do merge do #501.

## 0. Contexto fixo

- **Item:** as duas ressalvas do review independente do PR #501 (veredito PASS-COM-RESSALVAS), que vieram das sondas F e G
  do revisor. Nenhuma das duas é desvio do BRIEF [`BE-INCR-UNIT-REKEY-LACUNAS-brief.md`](BE-INCR-UNIT-REKEY-LACUNAS-brief.md).
- **Insumo (fato consumado):** `verify` em `server/src/jobs/rekeyLegacyUnitCli.ts` como mergeado no #501 (`93af35b1`).
  Ele infere os pares pelo diff, aplica as regras (i)–(iv), compara o multiconjunto, confere a âncora e roda (e) para
  todo par. O teste é `server/src/jobs/__tests__/rekeyLegacyUnitCli.integration.test.ts`, com 12 testes.
- **Nós vizinhos:** nenhum muda. Sem DTO HTTP, rota, OpenAPI, i18n ou eventType novo.

## 1. Checklist de comportamentos

**L-RK-6 — regra (v): cada `to` vem de exatamente um `(dono, from)`** (ressalva 1, sonda F)

1. Depois de inferir os pares (item 5 do BRIEF das lacunas): se o mesmo `(dono, to)` aparece com **mais de um**
   `from`, falha `(b) … regra (v)`, citando os `from`s.
   - Hoje o caso passa quando os legados não têm trilha. O CLI cria uma unidade por invocação, então só se chega a ele
     por adulteração manual.
2. **Teste-guarda (vermelho contra o `main` atual):** dois legados sem trilha, A e B, do mesmo dono, e um `--apply` de A.
   Depois as linhas de B são movidas à mão para o `to` de A. O `--verify` sai com exit 1 e a falha cita a regra (v).

**L-RK-7 — `audit_chain_heads` do pré intacta por chave** (ressalva 2, sonda G; o buraco já existia no `main`)

3. Toda chave `(scopeUserId, unitId)` de `audit_chain_heads` no pré existe no pós, com a linha idêntica. Cabeça do pré
   ausente no pós é falha `(a) audit_chain_heads …: cabeça do pré sumiu`.
   - É a letra do item 17(a) do ADR ("pré intacto"). Hoje o código só confere as cabeças presentes no pós mais a
     contagem total.
4. Cabeça nova no pós só é válida como a cabeça `(dono, to)` de um par ancorado. Cabeça nova que não corresponda a
   par ancorado é falha.
5. **Teste-guarda (vermelho contra o `main` atual):** sem `--apply`, apagar uma cabeça do pré e criar uma falsa (a
   contagem fica igual). O `--verify` sai com exit 1 e a falha cita a cabeça que sumiu.

**Fechamento**

6. **Gates:**
   - `cd server && npx tsc --noEmit`;
   - `npx jest --selectProjects integration --runInBand --testPathPatterns rekeyLegacyUnitCli`;
   - `node scripts/rekey-legacy-unit.mjs --self-check`.
   - Par vermelho→verde no mesmo PR (`protocolo-conserto-de-gate`).
7. **Rastreio:** o GAP-MAP item 16 (L-RK-6/7) ganha status e comando, e o §10 do ADR registra "FECHADO" com o PR.
   Depois do merge vem o fold do nó I1b.

## 2. Contratos (delta)

Nenhum tipo exportado muda. `VerifyReport.failures` ganha as mensagens das regras (v) e da cabeça sumida.

## 3. Forks

Nenhum aberto. Ratificados em `D-2026-10-04-I1B-RESSALVAS-501`: ressalva 1 → regra (v) (o dono divergiu da
recomendação, que era só registrar) · ressalva 2 → lacuna nova + BRIEF.

## 4. Pendente de validação externa

Vazia. O `unitId` é chave de escopo, e nenhuma regra contábil, fiscal ou legal está em jogo.

## 5. Achados fora de escopo

- Sonda I do revisor: uma corrida **parcial** (só parte das tabelas esvaziada antes da tx) termina em `APPLIED`. Bate
  com a letra do item 2 do BRIEF das lacunas (Σ = 0) e não foi planejada aqui. O F-RK-10 (a) mitiga: servidor parado,
  um operador.
