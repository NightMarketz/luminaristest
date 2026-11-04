# Aprendizados de teste — régua para BRIEF (04/11/2026)

> Pedido do dono (chat, 04/11, sessão "Playwright: screenshot, CLI e DevTools"): *"Já vai atualizando todas os
> aprendizados nos locais onde são briefs, e onde já estiver implementado, você também já cria briefs de correção de
> acordo com o aprendizado."* Escopo desta frase: atualizar BRIEFs e escrever BRIEFs de correção. **Não autoriza código
> nem `executa`**, e nenhum fork daqui se ratifica sozinho.
>
> Fontes, todas em PR aberto (sem merge) em 04/11, lidas pela branch de cada um:
> - [T] `docs/operating-manual/TESTES.md` §1 — PR #1064;
> - [P1] `docs/operating-manual/PESQUISA-TESTES-2026-11-04.md` §7.1 — PR #1064;
> - [INV] `docs/operating-manual/INVENTARIO-TESTES-RUNBOOKS-2026-11-04.md` — PR #1065;
> - [P2] `docs/operating-manual/PESQUISA-TESTES-2-2026-11-04.md` — PR #1072;
> - [P3] `docs/operating-manual/PESQUISA-TESTES-3-PROJETOS-2026-11-04.md` — PR #1074.
>
> Este doc **não** cria gate, rodada nem revisor (regra ⛔ do CLAUDE.md). É texto que BRIEF cita na seção de testes. As
> propostas de CI das rodadas 2 e 3 (P1–P10, sequencer, banco por worker, baseline de print) seguem decisão do dono e
> ficam fora daqui.

## 1. A régua (A1–A8)

Cada item diz o que o BRIEF tem de escrever na seção de testes/aceite. A sigla entre colchetes é a fonte.

| # | Aprendizado | O que o BRIEF escreve |
|---|---|---|
| **A1** | **Cada coisa se prova uma vez, na camada mais barata que a enxerga.** Regra em unit; ligação (rota → serviço → repositório → SQLite: status, persistência, tx) em integração; ligação da tela em teste de tela. [T §1 regra 1] | Para cada comportamento, **uma** camada nomeada. Integração que repete os valores de um unit testa só o que o unit não vê. |
| **A2** | **"Existe teste" não é "cobre o caso": o estado montado tem de ser o estado do bug.** O IMO-1 passou por um teste de concorrência que existia, porque o bem estava pendente e o do caso real estava ativo (`fixedAssetController.integration.test.ts:127`). [T regra 2, INV §1] | Para cada guarda (CAS, status, período, soft-delete), o **estado de partida** do teste, escrito: "bem já ACTIVE + `version` velho", não só "version errado". |
| **A3** | **Ramo de erro, uma falta por vez, com o dado nomeado.** Remove um dado, espera **exatamente uma** pendência, restaura. A mensagem nomeia o dado pelo nome que o usuário vê, nunca por id interno nem por nome de tabela (DFE-1). [T regra 3, INV §4.3] | Lista das faltas, uma por linha, com o texto (ou o trecho) que a mensagem tem de conter **e o que não pode conter** (id, `cuid`, nome de tabela). |
| **A4** | **Pré-condição tem dono: seed de cenário em banco descartável.** "O banco precisa estar assim" sem dizer quem o põe assim é lacuna. Seis runbooks irmãos do H2 precisaram mexer no dado à mão em 04/11. Decisão do dono (chat, 04/11): seed em banco descartável, piloto no DFE-MANUAL. [T regra 4, P1 §7.1, INV §2] | A pré-condição como **comando** (o cenário do seed que a põe de pé) ou como linha "o dono põe de pé: …". O seed escreve pelos serviços, nunca por `prisma.*` no razão, e se autoconfere. |
| **A5** | **Runbook só para EXT / DEC / OPS; a saída do oráculo vira fixture.** Passo que a máquina prova vira teste e o runbook cita o teste. XML real, protocolo e resposta do portal viram fixture versionada (como no X1). [T regra 5, INV §2–3] | Separar no BRIEF: o que vira teste (AUTO), o que fica no runbook (EXT/DEC/OPS) e qual fixture a saída do oráculo vira. |
| **A6** | **Caminho feliz pela pilha real, com repositório real.** Pela HTTP (`makeApp` + `authHeader`), policy, auditoria e repositório reais, sobre o banco de integração. 41 dos 109 testes de serviço contábil usam repositório falso (pista, inferido); o critério certo é "rota ou serviço com teste de integração", medido por rota. Os bugs de 04/11 (VP-1, IMO-1/2/3, DFE-1) eram todos pegáveis assim. [INV §4.3, §4.7, P1 §7.1] | Ao menos **um** teste de integração por rota nova ou alterada, no caminho feliz, assertando a **segunda leitura** (o `GET` depois do `POST`), não só a resposta do `POST`. |
| **A7** | **Relatório contábil contra valores esperados fixos.** Balancete, DRE, apuração e arquivos (ECD/ECF/Reinf/MIT) se testam com cenário próprio e valores fixos de linha, subtotal e total, não só com "débito = crédito" (ERPNext `test_general_ledger.py`; Odoo cria a empresa do teste a partir do plano de template). [P3 lição 5, §6] | Uma tabela de esperados (conta/linha → valor em centavos) do cenário, e o teste que a compara inteira. |
| **A8** | **Seed com factories e data de referência fixa; cópia de banco pela API de backup do SQLite.** Factories tipadas com override, semente e `refDate` fixos (o seed de hoje usa o dia corrente e fica mais lento a cada mês, P2 §P3; teste de "hoje" quebra na janela UTC). Banco descartável copiado do modelo pela API de backup do SQLite, que é consistente; copiar arquivo aberto pode corromper. [P3 lição 3, §3; P2 P3] | A **data de referência** do cenário (literal, ex.: `2026-03-15`) e o fuso; e, se o BRIEF cria banco descartável, como o copia (modelo fechado ou API de backup). |

**Graus.** A1–A6 vêm da execução real dos runbooks de 04/11 e do inventário (verificado nas fontes onde estão marcados
verificados; os números 41/109 e "22 repositórios" são inferidos). A7 e A8 são padrão externo lido [P3], **portável
como padrão, não como código**; a tradução para cá é inferência.

## 2. Como aplicar num BRIEF (patch, não reescrita)

Cada BRIEF aberto recebe um bloco **"Régua de testes (APRENDIZADOS-TESTES-2026-11-04)"** na seção de testes/aceite,
com uma linha por aprendizado que **falta** nele (o que ele já tem não se repete). O bloco não muda checklist, contrato
nem fork ratificado; onde um aprendizado pediria mudar algo ratificado, ele vira pergunta ao dono (fork novo).

Lacuna em código já implementado que pede teste vermelho primeiro segue `sessao-instrumentacao` → `sessao-correcao`
(teste-guarda num PR vermelho de propósito, molde #1053; depois o fix mínimo).

## 3. Onde a régua foi aplicada

Ver a tabela do corpo do PR que introduziu este doc. Resumo por tipo:
- **BRIEFs abertos atualizados (13 + 1 encaixe):** TEAMMATES, RAG-DOCUMENTOS, WIZARD-LIVE-PREVIEW (W8),
  MODULOS-BASE-SUBMODULOS, ISS-TRANSICAO-IBS (PR-2), EFD-REINF (PR-4), DFE-ADN-EMISSOR, DFE-ADN-EMENDA-ASSINADOR-LOCAL,
  DFE-EVENTOS (PR-2/3), NFCE-OFFLINE-CAIXA, NFCE-EMENDA-4, FE-NFCE-ASSINADOR e CNAB-COLLECTION; mais a linha "régua do
  F2" nos encaixes do `BE-INCR-DP-F0-F1` (o BRIEF do F2 ainda não existe).
- **Fora do patch (já executados ou quase):** X7 EMENDA-RASTREIO (#1013), FE PAYMENT EMENDA-1 (#983), RETENCOES-FONTE,
  IRRF-DISTRIBUICAO, EFICIENCIA-FISCAL, MIT-EXPORT.
- **BRIEFs de correção novos:** `docs/accounting/FIX-TESTES-I1B-BOOT-POS-REKEY-brief.md`,
  `docs/accounting/FIX-TESTES-VENDA-PACOTE-TEXTOS-brief.md`, `docs/accounting/FIX-TESTES-REPO-FALSO-POR-ROTA-brief.md` e
  `docs/crm/FIX-TESTES-CRM-PIPELINE-PILHA-REAL-brief.md`.
- **Não duplicados (já têm dono):** PILOTO-DFE (#1067: seed DFE, DFE pela pilha real e DFE-1 já estão lá) e IMO-1
  (#1053 + sessão de correção autorizada no H2).

## 4. Para o PILOTO-DFE (#1067) — o que falta da régua

A sessão que escreveu o BRIEF não apareceu no `ListAgents` em 04/11; o recado fica aqui e no corpo do PR. O BRIEF
`docs/accounting/PILOTO-DFE-SEED-TESTES-brief.md` (branch `claude/brief-piloto-dfe`) já cobre A1–A6. Faltam dois
pontos de A8 e um de abrangência do DFE-1:
1. **Item 7 (vendas prontas) usa "data de hoje no fuso do escopo".** Pela A8, o cenário fixa uma data de referência
   (`opts.refDate`, padrão literal) e o teste a passa. Data corrente no seed é a classe "teste de hoje × janela UTC"
   (memória do projeto) e faz a competência do DPS mudar a cada mês.
2. **Item 13 (cópia do banco-modelo):** dizer que a cópia é do modelo **fechado** (ou pela API de backup do SQLite), não
   de arquivo aberto.

3. **DFE-1, abrangência (F-PIL-5 b):** no mesmo método, além de `:816/:819/:822/:839/:879`, duas mensagens carregam id
   interno e não estão na lista do F-PIL-5: `:897–898` (`… para a venda '${saleId}'`) e `:925–926` (`… (id ${clash.id})`).
   Verificado por leitura de `FiscalDocumentEmissionService.ts` em `origin/main` 66f2d5d97.

Os três são do BRIEF dele; esta sessão não edita a branch dele.

## 5. Casos adversariais tentados contra o inventário

- **"Users/auth: a troca de senha falhou no runbook (21 d), sem teste que a pegasse (inferido)"** [INV §5]. **Não se
  sustenta:** `fixAuthConta.integration.test.ts:61–81` (troca sem senha atual é recusada e o hash não muda) e
  `UserService.integration.test.ts:183–193` (senha atual errada → 400 `CURRENT_PASSWORD_INVALID`, não 401, achado 21-1 de
  03/11) existem. Por isso não há BRIEF de correção de auth. Grau: verificado por leitura do nome e da linha dos testes, sem
  rodar.
- **IMO-1** já tem teste-guarda vermelho (#1053) e sessão de correção autorizada. Um ponto da régua A2 fica para depois da
  correção: o teste "OPS-001 adversarial: 2 baixas CONCORRENTES" aceita `[400, 409]` e continua verde com ou sem o fix
  (registrado no próprio #1053, "Fora de escopo"). Apertá-lo é pergunta ao dono (corpo do PR).
- **"41/109 com repositório falso"** [INV §4.7]: a recontagem por outro critério deu 48 arquivos. Os dois números são pista.
  O BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA` mede por rota antes de escrever teste.
