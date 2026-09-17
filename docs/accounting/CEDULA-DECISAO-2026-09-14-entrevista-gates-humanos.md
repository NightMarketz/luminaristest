# Cédula de decisão — 2026-09-14 (fechar TODOS os gates humanos)

> **O que este doc é:** o registro da **entrevista de 2026-09-14** (sessão, `AskUserQuestion`, 4 rodadas,
> 15 perguntas) em que o dono declarou o estado de cada pré-condição dos 7 runbooks humanos e ratificou
> a sequência para fechá-los. Todo fato sobre a máquina do dono foi **verificado por comando nesta sessão**
> (seção C) — não lido de doc. `origin/main` = `6ec45d3c` na data.
>
> **O que não é:** execução nem sign-off. **Nenhum runbook foi preenchido, marcado ou assinado** aqui
> (`RUNBOOK-FORMAT.md`: evidência colada + assinatura são do executor humano). Os itens de agente da seção E
> citam a decisão que os autoriza (ORCH-006), mas cada um ainda exige o "vai" do dono na hora de abrir a sessão.

---

## 0. Reconciliação com `main` em 2026-09-17 (`85378005`, #343) — o que sobrevive como autorização

> Esta cédula foi escrita em 14/09 contra `6ec45d3c` e ficou **fora de `main`** por três dias (só num worktree);
> nesse intervalo `main` avançou #315–#343 e a cédula **irmã** `CEDULA-DECISAO-2026-09-14-gates-humanos.md`
> (#318, sessão paralela do mesmo dia, 16 perguntas sobre forks de BRIEF) entrou primeiro — por isso o sufixo
> `-entrevista-` no nome deste arquivo. A tabela abaixo diz, decisão a decisão, o que já aconteceu em `main`, o que
> foi **superado** e o que **ainda vale como autorização citável** (ORCH-006). Verificado por comando em 17/09
> (`git ls-tree origin/main`, `grep -c "\[x\]"` nos runbooks, `ls` na máquina do dono). Fold desta reconciliação:
> `PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md` item 1 (Fork F-PS-2 → a, ratificado 17/09).

| Decisão | O que dizia (14/09) | Estado em `main` 17/09 | Sobrevive? |
|---|---|---|---|
| **G-1** PVA (H1 · P4) | nenhum instalado; dono instala | **Instalados**: `C:\Arquivos de Programas RFB\Programas SPED\{SpedContabil,SpedECF}` existem; `.install4j/i4jparams.conf` diz `applicationVersion="10.4.1"` e `"12.2.6"` (conteúdo datado 19/05 e 01/09/2026 em `stats.properties`). **Não é evidência do P4** — o runbook pede o "Ajuda → Sobre" colado pelo dono; `RUNBOOK-H1-PVA.md` segue com 0 `[x]` | Sim, como fato: P4 deixa de ser "instalar" e vira "colar o Sobre" |
| **G-2** declarante fictício de CNPJ válido (H1 · P6) | aceito para a 1ª passada | Nenhuma passada do H1 rodou (0 `[x]`); C12 (`BE-INCR-SPED-IDENTITY-MASKS`, BRIEF #322 + transcrição #339) formaliza as máscaras — o fictício continua válido enquanto não houver contador | **Sim** (autorização viva para a 1ª passada) |
| **G-3** seed multi-ano (H1 · P0) | autoriza o agente a popular 2024/2025 | Virou **SEED-MY**: BRIEF `SEED-MULTI-EXERCICIO-brief.md` (#325), 2 forks ✅ 16/09 (F-SEED-2 a · F-SEED-3 b), alvo **2025+2026** (não 2024/2025 — a cédula #318 corrigiu o par); **bloqueado por B-4 assinado** | Superada pela forma mais nova (#318/#325); a intenção sobrevive lá |
| **G-4** B-4 é o 1º runbook | dono executa | O ensaio **rodou por referência** na sessão do #318 (cabeçalho: *"a sessão que executou o P0 de boot e o ensaio B-4"*), mas `RUNBOOK-B4-RESTORE-REHEARSAL.md` tem **0 `[x]`, sem evidência colada, sem assinatura** ⇒ pelo `RUNBOOK-FORMAT.md` é **nulo** | Sim: B-4 continua o 1º da fila e continua **não assinado** |
| **G-5** X2 nesta rodada | executável, arquivo em disco | `RUNBOOK-X2-RFB-REFERENCIAL.md` 0 `[x]`; arquivo no corpus; kit pronto desde 31/08 | **Sim** (humano; nada mudou) |
| **G-6** XML real de NF-e (E9) | autoriza baixar + anonimizar + trocar fixture (fonte pública `akretion/nfelib`, C.4) | `nfe-fixture-provenance.test.ts` ainda com o sentinel `SYNTHETIC-FIXTURE-NOT-REAL`; 3 `*.SYNTHETIC.xml` em `server/src/lib/__tests__/fixtures/nfe/`; **nenhum doc de `main` cita `nfelib`** (`git grep` vazio em 17/09) — esta cédula é a única autorização escrita | **Sim — e só aqui.** E9 = `sessao-correcao` (código); não roda na sessão docs-only de 17/09; entra na fila de código quando o dono chamar |
| **G-7** M2 adiado | sem VPS/domínio | Inalterado; `PROXIMOS-PASSOS-2026-09-17` lista M2 como gate humano em branco; cadeia crítica (emissão 01/10 ← M2) segue parada | Sim (datado 14/09; reabre com infra) |
| **G-8** H2-browser com fixture sintético | aceito | `RUNBOOK-H2-BROWSER-SIGNOFF.md` 0 `[x]` | Sim |
| **G-9** chave OpenAI colada no chat | incidente; dono revoga | Nada em `main` registra a revogação (e não deve — é ação fora do repo); H2-wizard não rodou | Sim, como **incidente aberto**: antes do H2-wizard, `grep -c "OPENAI_API_KEY=sk" server/.env` → 1 com chave **nova** |
| **G-10** autoriza P2 clínica agora | "não implementado" | **Estava errado já em 14/09:** P2 foi **mergeado 07/09** (#282 `60cced8d`, fold #292 `f6910777`); c.11 (T0 `onboardingCompletedAt`) mergeado #320 em 14/09. A pergunta partiu de memória stale do entrevistador | **Superada** — nada a autorizar; H3 (`RUNBOOK-H3-P2-CLINICA.md`) está **PRONTO para o dono** desde #320 |
| **G-11** ordem B-4 → X2 → seed → PVA → H1 → H2 → E9 → P2 → H3 | ratificada | Com G-10 superada e G-1 cumprida, a ordem viva é **B-4 → X2 → SEED-MY → H1 1ª → H2-browser → H2-wizard → H3 → H1 2ª** (humanos) e **E9** (agente, paralelo) — igual à tabela "gates humanos abertos" do `PROXIMOS-PASSOS-2026-09-17` | Sim, reduzida |
| **G-12** cédula + emenda no map sem commit | — | Cumprida agora: este arquivo entra em `main` pelo PR docs-only de 17/09; o fold no master map cita-o | Sim |

**Resumo em uma linha:** das 12 decisões, **2 superadas** (G-3 pela forma SEED-MY, G-10 por já estar em `main`),
**1 cumprida** (G-1 instalação, evidência ainda do dono) e **9 vivas** — a única que **só existe aqui** é **G-6**
(E9, XML real via fonte pública). Seções A–F abaixo estão **como escritas em 14/09** (registro histórico; §C são
medições reproduzíveis por comando).

---

## A. Pergunta de partida

Pedido: *"Me entreviste para fechar todos os gates humanos."* Os gates, todos com runbook **em branco e sem
assinatura** em `docs/accounting/` (verificado 14/09): **B-4** restore, **H1** PVA (1ª e 2ª passada),
**H2-browser**, **H2-wizard**, **H3** P2 clínica, **M2** deploy, **X2** referencial RFB — mais o dado
externo **X1/E9** (XML real de NF-e), que não tem runbook próprio (protocolo em `BE-INCR-NFE-fixtures-README.md`).

Objetivo sob a letra: **descobrir qual pré-condição trava cada gate e o que o dono decide sobre ela** —
porque "fechar" um gate é ato humano (executar + assinar), e o que o agente pode fazer é remover as
pré-condições que são dele e entregar o runbook pronto.

---

## B. Decisões — ✅ RATIFICADAS 2026-09-14 (dono, `AskUserQuestion`)

| # | Gate · pré-condição | Estado declarado / achado | Decisão do dono | Consequência |
|---|---|---|---|---|
| **G-1** | H1 · P4 (PVA ECD + ECF instalados) | **Nenhum instalado**; os dois instaladores **já estão em disco** (C.1) | *"Pode instalar pra mim"* → **recusado pelo agente** (runbook §P4: instalar/executar binário é do humano; regra dura do agente) | **Dono instala** (passos em §E.4). P4 fica ⏳ até o "Ajuda/Sobre" ser colado no runbook |
| **G-2** | H1 · P6 (declarante/livro/signatários) | **Só fictícios**; sem contador | Aceito: 1ª passada com **declarante fictício de CNPJ válido por dígito** | O PVA valida estrutura; validação de conteúdo por contador **não existe nesta rodada** — dívida datada |
| **G-3** | H1 · P0 (razão 100 % 2026; chart do seed sem `1.1.6/3.3/4.2`) | Confirmado bloqueio do preflight de 12/09 | **AUTORIZA `seed multi-ano`** (agente popula 2024/2025 + chart completo) **antes** de qualquer passada do H1 | Item de agente **novo** (E.3); é o que destrava P0 das duas passadas |
| **G-4** | B-4 · ensaio de backup/restore | **Nunca rodou** `db:backup` nem restauração | B-4 é o **1º runbook** da sequência (pré-condição P2 do H1) | Só lê o `dev.db`; ~30 min; runbook pronto em `RUNBOOK-B4-RESTORE-REHEARSAL.md` |
| **G-5** | X2 · arquivo oficial RFB "PJ em Geral" | *"Pode procurar no meu pc"* → **achado** (C.2), bytes batem com o runbook | **Executa nesta rodada**, 2º da fila | Único gate sem dependência externa; ativa a validação analytic-only que o H1 P5 usa |
| **G-6** | X1/E9 · XML real de NF-e 4.00 | O arquivo apontado (`Layout Emissão NFe 4.00 - NS.pdf`) é **layout**, não XML; **zero `.xml`** no perfil (C.3) | *"Pesquisa na internet um de exemplo real"* → **achados XMLs reais públicos** (C.4) → **AUTORIZA baixar + anonimizar + trocar fixture** | Item de agente (E.8), `sessao-correcao` sobre `nfe-fixture-provenance.test.ts` (reverter o `it.todo`); PR próprio |
| **G-7** | M2 · infra (VPS + domínio, decisão 22/08) | **Nada contratado** | *"Vamos resolver até chegar na ponta da chamada de API"* → **ADIADO** | M2 segue **BLOQUEADO em infra**, datado 14/09; nenhuma ação nesta rodada |
| **G-8** | H2-browser · extrato OFX/CNAB real | **Só fixtures sintéticos** | Aceito: H2 roda com fixture do repo | Dívida declarada, classe `sintetico-nao-cobre-formato-de-dado-real`; não bloqueia o sign-off |
| **G-9** | H2-wizard · `OPENAI_API_KEY` real | **Chave disponível** (dono a tem) | Roda nesta rodada, após H2-browser | ⚠️ A chave foi colada no chat → **agente não grava credencial**; dono revoga/gera nova e coloca no `server/.env` (E.7). Este doc **não** contém a chave |
| **G-10** | H3 · P3 (`BE-INCR-P2-VERTICAL-CLINICA` implementado) | **Não implementado** (BRIEF + 8 forks ratificados 25/08) | **AUTORIZA o P2 agora** (`sessao-feature`) | Item de agente (E.9); H3 só depois do merge |
| **G-11** | Ordem da rodada | proposta do agente | **Concorda** com B-4 → X2 → seed → PVA → H1 → H2-browser → H2-wizard → E9 → P2 → H3 | Seção E |
| **G-12** | Registro | — | **Cédula + emenda no master map, sem commit** até o dono pedir | Este doc + fold no topo do map |

Nenhuma decisão contra a recomendação, exceto **G-1 pedir que o agente instalasse** (recusado por regra,
não por escolha do dono) e **G-9 colar a chave** (tratado como incidente de credencial, não como decisão).

---

## C. Verificado nesta sessão (comando, não doc)

1. **PVA:** `ls Downloads/luminaris-gates/` → `SPEDContabil_w64-10.4.1.exe` (129.667.328 B) e
   `SpedEcf_w64-12.2.6.exe` (143.753.984 B) — **bytes idênticos** aos da tabela §P4 do `RUNBOOK-H1-PVA.md`.
   `ls "Program Files*" | grep -i sped|pva|rfb` → vazio ⇒ **não instalados**. Manual Leiaute 12 (6.410.931 B)
   e `Ato_Conjunto_RFB_CGIBS_4_2026.pdf` também na pasta.
2. **RFB:** `Downloads/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx` — **1.724.077 B**,
   igual ao registrado na EMENDA 2026-08-31 do `RUNBOOK-X2`.
3. **NF-e local:** `find ~ -iname "*.xml" -size +5k` fora de repos/AppData → **nenhum**. O PDF "Layout
   Emissão NFe 4.00 - NS" (311 KB, 14/09) é documentação de layout de um emissor (NS) — insumo de referência,
   não fixture.
4. **NF-e pública real:** `akretion/nfelib` (Apache/LGPL, GitHub) publica em
   `nfelib/nfe/samples/v4_0/leiauteNFe/` 17 XMLs; inspecionados **sem salvar** (curl → grep): `nfeProc versao="4.00"`,
   `tpAmb=1` (produção), `cStat=100` (autorizada), chave de 44 dígitos, `<Signature>` presente. Candidatos:
   - **compra** = `26180875335849000115550010000016871192213331-nfe.xml` — 3 itens, CFOP **6102**, `vNF` 5.780,00,
     `indFinal=0` (é a nota que o comprador **recebe** do fornecedor — o "1102/2102" do README é o CFOP de
     entrada que o comprador escritura, não o que vem no XML);
   - **venda** = `35180834128745000152550010000474281920007498-nfe.xml` — 6 itens, CFOP **6101**, `vNF` 347,28,
     `indFinal=1` (consumidor final).
   Ambos carregam **CNPJ/IE/nomes reais** ⇒ anonimização obrigatória (README §"Como destravar", passo 2:
   `CNPJ/CPF/xNome/endereço/IE` trocados, `<Signature>` zerada, **números e chave preservados**).
5. **Runbooks:** os 7 arquivos `RUNBOOK-*.md` têm `Executor: [nome — humano]` e `Assinatura: ____` em branco.
6. **PRs abertos:** #315 (FE-INCR-LALUR PR 1) e #316 (ECF 3C) — não são gates humanos, mas o seed multi-ano
   (E.3) e o H1 2ª passada leem o model do 3C; **ordem de merge: #316 antes do seed**.

---

## D. Classificação final dos gates (estado em 2026-09-14)

| Gate | Trava real | Quem destrava | Status pós-entrevista |
|---|---|---|---|
| **B-4** | nenhuma (nunca executado) | dono executa | **PRONTO para executar** |
| **X2** | nenhuma (arquivo em disco) | dono executa | **PRONTO para executar** |
| **H1 1ª passada** | P0 (seed) · P4 (PVA) · P2 (B-4) | agente (seed) + dono (instalar, B-4) | ⏳ 3 pré-condições, todas com dono nomeado |
| **H1 2ª passada** | tudo do H1 1ª + #316 mergeado | idem + merge | ⏳ atrás da 1ª |
| **H2-browser** | P3 build de produção | dono executa | **PRONTO** (fixture sintético aceito, G-8) |
| **H2-wizard** | chave no `.env` (dono) · usuário sem tabelas | dono | PRONTO após E.7 |
| **X1/E9** | XML real | agente (fonte pública, G-6) | ⏳ item de agente autorizado |
| **H3** | P3 = P2 clínica não implementado | agente (G-10) + dono executa | ⏳ atrás do P2 |
| **M2** | infra inexistente | dono (contratar) | ⛔ **ADIADO** (G-7) — único gate sem data |

---

## E. Sequência ratificada (G-11) — cada item cita sua autorização

Legenda: **[dono]** = executa e assina runbook; **[agente]** = sessão própria, exige "vai" na hora (ORCH-006).

1. **[dono] B-4** — `RUNBOOK-B4-RESTORE-REHEARSAL.md` inteiro (P1..P7 → passos → desfecho → assinatura). Autoriza: G-4.
2. **[dono] X2** — `RUNBOOK-X2-RFB-REFERENCIAL.md` com o xlsx de C.2 (conversor `rfb-referential-to-catalog.mjs`;
   conferir leiaute posicional contra o header ANTES de rodar, `--selfcheck` primeiro). Autoriza: G-5.
3. **[agente] `seed multi-ano`** — popular o `dev.db` de seed com AC 2024 e 2025 (razão + períodos fechados +
   chart com `1.1.6/3.3/4.2`, o que a LAC-D #259 exige), **após merge do #316**. Sem BRIEF ainda → primeiro
   `sessao-planejamento` (1 sessão), depois `sessao-feature`. Autoriza: G-3 (decisão A1 de 12/09 + esta).
4. **[dono] instalar PVA** — duplo-clique em `SPEDContabil_w64-10.4.1.exe` e `SpedEcf_w64-12.2.6.exe`
   (`Downloads\luminaris-gates\`), depois abrir cada um → Ajuda/Sobre → **screenshot da versão** = EVIDÊNCIA
   do P4. Se a versão do site já for maior, a página oficial é a verdade (runbook §P4). Autoriza: G-1.
5. **[dono] H1 1ª passada** — `RUNBOOK-H1-PVA.md` P0..P7 → ECD → Apuração → ECF, declarante fictício de
   CNPJ válido (G-2). Só depois de 1, 3 e 4. Autoriza: G-2/G-3.
6. **[dono] H2-browser** — `RUNBOOK-H2-BROWSER-SIGNOFF.md`, build de produção, fixtures OFX/CNAB do repo (G-8).
7. **[dono] H2-wizard** — antes: revogar a chave colada, gerar nova, `OPENAI_API_KEY=` no `server/.env`
   (`grep -c "OPENAI_API_KEY=sk" server/.env` → 1); usuário sem tabelas; `RUNBOOK-H2-WIZARD-ENTREVISTA.md`. Autoriza: G-9.
8. **[agente] E9 — XML real** — `sessao-correcao`: baixar os 2 XMLs de C.4 para `server/src/lib/__tests__/fixtures/nfe/`,
   anonimizar pelo README (script, não mão), apagar os `*.SYNTHETIC.xml`, reverter o `it.todo` de
   `nfe-fixture-provenance.test.ts` (teste vermelho → verde no mesmo PR), registrar a **proveniência** (repo,
   commit, chave original) no README. Pode correr em paralelo a 1–7. Autoriza: G-6.
9. **[agente] `BE-INCR-P2-VERTICAL-CLINICA`** — `sessao-feature` do BRIEF de 25/08 (8 forks já ratificados).
   Autoriza: G-10.
10. **[dono] H3** — `RUNBOOK-H3-P2-CLINICA.md` após o merge de 9 (P1..P10; P7 reusa o PVA de 4).
11. **[dono] H1 2ª passada** — `RUNBOOK-H1-PVA.md` §2ª passada (2P-1..2P-4) após 3 e o merge do #316.
12. **M2** — sem passo; reabre quando houver VPS (G-7).

---

## F. Risco principal e vieses (T8)

- **Risco principal:** a rodada tem **8 gates humanos em série** e um único executor. O histórico do projeto
  (`accounting-gargalo-is-human-validation`) é que o gate humano não anda; esta cédula não muda isso — só
  remove as desculpas de pré-condição. Se em 14 dias nenhum runbook estiver assinado, a regra do `CLAUDE.md`
  (moratória de aparato) continua valendo e o problema não é de processo.
- **Credencial no chat (G-9):** risco real e já materializado; mitigação = revogar. Registrado aqui de propósito
  para que a próxima sessão não "aproveite" a chave do transcript.
- **XML público como "real" (G-6):** é real (produção, autorizada), mas é **de terceiro** e de 2018/2022 —
  prova o leiaute 4.00, não o fornecedor do dono. A classe `sintetico-nao-cobre-formato-de-dado-real` fecha;
  a validação de conteúdo (custo D3/`vICMS`, E10) segue dívida de contador.
- **Viés do entrevistador:** as opções recomendadas foram todas aceitas — a entrevista pode ter induzido
  concordância. Contrapeso: nenhuma decisão aqui é irreversível (todas são "rodar um runbook" ou "abrir uma
  sessão"), e M2 — a única cara — foi adiada pelo dono contra a inércia da fila.
- **Checagem que teria falhado se eu estivesse errado:** C.1 (bytes dos instaladores × tabela §P4), C.2 (bytes
  do xlsx × EMENDA 08-31), C.4 (`tpAmb`/`cStat` lidos do XML, não do nome do arquivo).
