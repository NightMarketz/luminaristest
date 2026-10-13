---
id: "D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Questionário de 13/10 sobre os BRIEFs quase prontos: KIT-SETOR (conteúdo já, clínica alcança o salão), I4 (F-I4-4 a, F-I4-5 b), LAC-B (F-BA-2 b), cobrança (F-FE-COB-1..8), NFC-e (F-NFCE-E1-1..4, 6..9)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário (AskUserQuestion), 6 rodadas; depois: \"Grava as decisões e abre as 4 emendas\". Só decisão e emenda de BRIEF; nenhuma é 'executa'"
atualizado: "2026-10-13"
---
# D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS

**Estado:** `decided`. **Autorização:** dono, chat, 13/10/2026, questionário. **Não é "executa"** (ORCH-006).
Emendas abertas na mesma sessão (`sessao-planejamento`):
[`BE-INCR-KIT-SETOR-EMENDA-1`](../../accounting/BE-INCR-KIT-SETOR-EMENDA-1-brief.md) ·
[`FE-INCR-BINDING-ACTIVATION-EMENDA-1`](../../accounting/FE-INCR-BINDING-ACTIVATION-EMENDA-1-brief.md) ·
[`FE-INCR-PAYMENT-PROVIDER-EMENDA-1`](../../accounting/FE-INCR-PAYMENT-PROVIDER-EMENDA-1-brief.md) ·
[`BE-INCR-NFCE-EMENDA-2`](../../accounting/BE-INCR-NFCE-EMENDA-2-brief.md).

## Erro de processo registrado (do agente, não do dono)

A lista inicial dos forks pendentes saiu do `estado_detalhe` das notas de nó, e **duas notas estavam sem fold**:
- **KIT-SETOR:** F-KB-6 e F-KB-9 já estavam decididos em [[D-2026-10-08-KIT-SETOR-FORKS-KB6-KB9]] (ambos (a)), e o
  PR-1 (#580), o PR-2 (#584) e o kit v2 do salão (#632) já estão em `main`. A 1ª pergunta de hoje (F-KB-6 (b) "v1 já
  com conteúdo", F-KB-9 (c)) foi feita sobre o estado velho. **Ela foi refeita** sobre o estado real (cédulas
  F-KB-6R/F-KB-9R abaixo); as respostas da 1ª rodada valem só como intenção ("conteúdo agora; os dois setores").
- **X10i / X10a:** o F-ADN-1 já estava **superado** pela decisão (a) de 11/10 ([[D-2026-10-11-QUESTIONARIO-DONO]],
  `EMENDAS-BRIEF-2026-10-11.md` §8) e pelo F-E8-1R = (a) de 11/10 (`BE-INCR-DFE-ASSINATURA-PLANEJAMENTO-2026-10-11.md`,
  PR #635): **certificado em nuvem num PSC para os 3 DF-e; o Luminaris não guarda A1**. As respostas de hoje a
  F-ADN-1 ("pausar o ADN; pesquisar PSC"), F-ADN-2 (a) e F-ADN-3 (b) **não alteram nada**: o PSC já é o caminho, a
  pesquisa da LPSC foi feita em 11/10 (8 credenciados), e ADN-2/3 continuam sem objeto. Ver §ADN abaixo.

Lição para o fold: nota de nó com decisão posterior não refletida faz o questionário perguntar de novo o que já
foi decidido. Conferir `docs/plano/decisoes/` pelo ID do fork antes de perguntar.

## Cédulas

| Nó | Fork | Decisão | Contra a recomendação? |
|---|---|---|---|
| KIT-SETOR | **F-KB-6R** — o que fazer com "conteúdo já", dado o v1 publicado e travado por hash | **Próxima versão completa já:** salão v3 e clínica v2 trazem contas de imposto (`roleDefaults`), padrões fiscais por serviço e referencial, **sem esperar o PR-4**. Até o PR-4 existir, o conteúdo alcança só instalação nova | não |
| KIT-SETOR | **F-KB-9R** — "os dois juntos" com o salão já no v2 | **Clínica v2 alcança o salão** (mesmo referencial 2025 das 15 folhas); depois salão v3 + clínica v3 juntos com o resto do conteúdo | não |
| I4 | F-I4-4 — unidade recém-ativada lança sem reiniciar | **(a)** o controller do onboarding chama `initializeAccountingSyncFromBindings()` depois de `Active`, em série | não |
| I4 | F-I4-5 — o wizard mostra o resultado contábil | **(b)** PR-4: aviso não bloqueante quando vier `Draft` | não |
| LAC-B | F-BA-2 — volta ao dono, porque F-I4-4 ≠ (a′) | **(b)** o BRIEF da tela ganha item BE próprio: `/activate-default` recarrega depois de `Active` | — (a recomendação (a) dependia de (a′), que não foi escolhida) |
| F5 (FE) | F-FE-COB-1 | **(a)** aba nova `cobranca` no `AccountingView` | não |
| F5 (FE) | F-FE-COB-2 | **(b)** BE novo `GET /api/collection-charges` + lista global na aba Cobrança, **neste ciclo** | **sim** (rec. (c)) |
| F5 (FE) | F-FE-COB-3 | **(a)** cobranças do título carregadas ao abrir o painel/drawer | não |
| F5 (FE) | F-FE-COB-4 | **(a)** último estado do provedor + texto "atualizado por notificação ou re-consulta a cada 15 min" | não |
| F5 (FE) | F-FE-COB-5 | **(a)** URL do webhook montada no FE com aviso para não-`https`/`localhost` | não |
| F5 (FE) | F-FE-COB-6 | **(a)** presets 30 min, 1 h, 24 h (padrão), 3, 7, 30 dias | não |
| F5 (FE) | F-FE-COB-7 | **(a)** selo derivado "Vencida — aguardando o provedor" + Cancelar em destaque | não |
| F5 (FE) | F-FE-COB-8 | **card + tabela HTML + `GenericTable`**: contas = card (`GenericTable` só com > 1); cobranças do título = HTML no molde do painel do AR; lista global (COB-2 b) = `GenericTable` | não (estende a rec. à lista nova) |
| X10a | F-NFCE-E1-1 | **(a)** o emissor próprio cobre NF-e/NFC-e direto na SEFAZ — com assinatura pelo PSC (F-E8-1R de 11/10), não por A1 guardado | não |
| X10a | F-NFCE-E1-2 | **(a)** um `SefazNfeEmissor` para `NFE` e `NFCE` | não |
| X10a | F-NFCE-E1-3 | **(b)** tabela de webservices das **27 UF** agora | **sim** (rec. (a), só SP) |
| X10a | F-NFCE-E1-4 | **v3, com v2 condicional:** (a) só v3 sem CSC se a L-NFCE-1 confirmar que SP aceita; senão (c) v3 + v2/CSC por UF. A L-NFCE-1 é pesquisa do agente (método legal) | não |
| X10a | F-NFCE-E1-5 | **não perguntado** — a recomendação depende da L-NFCE-2 (pergunta de lei); vai para pesquisa por fonte oficial | — |
| X10a | F-NFCE-E1-6 | **(b)** BE entrega chave/QR/URL; o DANFE é do BRIEF de FE | não |
| X10a | F-NFCE-E1-7 | **(a)** transcrever o UB pela NT 2025.002 **v1.52**; **download do PDF oficial autorizado** | não |
| X10a | F-NFCE-E1-8 | **(b)** envia direto; status só sob demanda em `getStatus()` | não |
| X10a | F-NFCE-E1-9 | **(a)** o BRIEF irmão (NFS-e/ADN) vai primeiro e entrega o transporte; o PR-7 da NFC-e espera o PR-3 de lá | não |

## §ADN — o que fica do X10i

- F-ADN-1, F-ADN-2, F-ADN-3: **superados** em 11/10 (sem guarda de A1). As respostas de 13/10 ficam registradas só
  como histórico; **não reabrem** a guarda.
- F-ADN-4..13 **não foram perguntados**. Vários supõem PFX local (F-ADN-4, F-ADN-10, F-ADN-11) e precisam ser
  reescritos para o adaptador PSC antes de ir ao dono — trabalho de uma emenda do BRIEF ADN, **não aberta hoje**
  (fora das 4 autorizadas).

## Consequências

- **Prontos para "executa" depois desta nota:** BRIEF I4+I5 (`BE-INCR-ONBOARDING-ACTIVATION`), com a ressalva de que
  o PR-0 da LAC-B (emenda) e o item 13 do I4 compartilham a recarga (ver emenda da LAC-B §2).
- **Com emenda aberta hoje:** KIT-SETOR, LAC-B, FE da cobrança, NFC-e. Cada emenda lista o que ainda trava.
- **Risco novo levantado na emenda da NFC-e (inferido, não verificado):** SEFAZ e Sefin Nacional exigem TLS mútuo com
  o e-CNPJ. Com o certificado só no PSC, o Luminaris não tem a chave privada para o handshake. Se o PSC não oferecer
  sessão TLS ou assinatura do handshake, o transporte mTLS do BRIEF irmão não fecha. Vai para validação externa.

## 2ª rodada (13/10, depois da pesquisa legal — `pesquisas-legais/`)

| Nó | Fork | Decisão | Base |
|---|---|---|---|
| X10a | F-NFCE-E1-5 | **(b) contingência off-line** (`tpEmis=9`, QR assinado pelo PSC, transmissão até o 1º dia útil seguinte, guarda do XML no lugar da 2ª via). EPEC fora até a SEFAZ-SP ativar | Portaria SRE 40/2024 art. 6º; Ajuste SINIEF 19/16 cl. 11ª; RC 34105/2026 (`nfce-sp-contingencia`) |
| KIT-SETOR | F-KE-2 | **(a)** PIS/COFINS como redutoras da receita (3.6.1, 3.6.2) | DL 1.598/77 art. 12 §1º III; Lei 6.404 art. 187 (`pis-cofins-deducao-receita`) |
| KIT-SETOR | F-KE-1 | **(a)** 2.1.3 IRPJ, 2.1.4 CSLL, 2.1.5 PIS, 2.1.6 COFINS a recolher; 4.5.1 IRPJ, 4.5.2 CSLL | — (escolha de plano, não lei) |

Todas na recomendação. Não é "executa". Com isso, o PR-K2 do KIT depende só das fontes de `cTribNac`/`cNBS`; o PR-9 da NFC-e fica decidido.

## 3ª rodada (13/10, depois da pesquisa do cTribNac)

| Nó | Fork | Decisão |
|---|---|---|
| KIT-SETOR | F-KE-3 | **(b)** catálogo de sugestões no kit; o cadastro de serviço oferece e nada é gravado sozinho (dono: *"é o único caminho que não grava enquadramento por palpite"*) |
| KIT-SETOR | F-KE-4 | **pedido novo do dono:** *"criar um motor que pesquise caso existam serviços análogos com nome diferente e sugira também"* → **sinônimos versionados no kit + IA de reserva** presa ao enum do catálogo; **varredura em lote** dos serviços sem perfil fiscal. Só sugere. Vira o PR-K3 da emenda |

Não é "executa".
