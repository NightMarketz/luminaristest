# Plano da emissão fiscal — 2026-09-27

> **⚠️ ESTADO VIVO NÃO MORA AQUI.** A fonte única de estado e fila é o vault [`docs/plano/`](../plano/README.md);
> este documento guarda a ordem, os critérios de pronto e o texto dos forks. Divergência entre este doc e o
> frontmatter de uma nota → **a nota vence**.
>
> | Fase | Onde vive no vault |
> |---|---|
> | 0 registro e insumos | [`ENVIO-PEDIDO-CONTADOR`](../plano/gates/ENVIO-PEDIDO-CONTADOR.md) · [`D1f`](../plano/gates/D1f.md) · este doc |
> | A–B releitura + modo manual (BE) | [`DFE-MANUAL`](../plano/nos/DFE-MANUAL.md) |
> | C tela | [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md) |
> | D prova humana do modo manual | runbook a preparar (sem nó — gate humano do `DFE-MANUAL`) |
> | E Focus | [`X10i`](../plano/nos/X10i.md) · [`D5`](../plano/gates/D5.md) · [`M2`](../plano/gates/M2.md) |
> | F tipo de documento + NFC-e | [`X10a`](../plano/nos/X10a.md) |
> | G compra via NF-e recebidas | [`D2`](../plano/gates/D2.md) · [`E9`](../plano/gates/E9.md) |
> | H prazos e vigilância | [`D7`](../plano/gates/D7.md) · [`X10i`](../plano/nos/X10i.md) |

> Pedido do dono (27/09): *"Certo, planeje com granularidade e atualize a documentação com nossas decisões do
> fiscal"*. Insumos: a entrevista dos gates de 26/09 ([`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md)),
> a emenda §11 do [`ADR-INCR-DFE-EMISSAO-PARCEIRO`](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) e o
> [`BE-INCR-DFE-MANUAL-brief.md`](BE-INCR-DFE-MANUAL-brief.md).
>
> **Este plano ordena o trabalho; ele não autoriza código (ORCH-006).** Cada passo diz a sessão que o executa e o que
> ainda falta. Os forks estão **PENDENTES**, com recomendação.

## Ordem e porquê

| Fase | O quê | Por que nesta posição |
|---|---|---|
| **0** | Registro das decisões + insumos (contador, corpus, prints) | Sem código. Tudo o que as fases seguintes precisam de fora do repo começa a andar aqui, em paralelo |
| **A–B** | Releitura + modo manual (backend) | **Não depende de D5.** A releitura é a peça que o caminho Focus também usa: construída uma vez, serve aos dois |
| **C** | Tela (ficha espelho, botão, upload do XML) | Precisa dos forks do BRIEF; as telas a imitar vêm do guia oficial do emissor web. Sem tela, o modo manual não é usável |
| **D** | Prova humana do modo manual | Gate humano: uma nota real com releitura igual. Agente prepara, dono executa e assina |
| **E** | Adaptador da Focus | Espera D5 (conta + contrato + A1) e o "executa" da emissão real; reusa A–B |
| **F** | NFC-e e roteamento por tipo | Depende do dono decidir a dúvida D-2 do `X10a`; só via parceiro |
| **G** | Compra via NF-e recebidas | Fork pendente; fecharia o D2 com o 1º cliente |
| **H** | Prazos e vigilância | Registro: datas conferidas no ato oficial e o que elas implicam |

**A–B e E correm em paralelo** quando o D5 fechar. **01/10/2026 chega antes de qualquer fase de código:** o salão em
regime normal que começar a emitir antes disso emite no portal público, fora do Luminaris (ver Fase H).

## Fase 0 — Registro e insumos (sem código)

| # | Passo | Quem / sessão | Saída | Critério de pronto |
|---|---|---|---|---|
| 0.1 | ✅ Registrar as decisões de 26/09 | esta sessão (27/09) | nota de decisão, ADR §11, este plano, BRIEF, nó `DFE-MANUAL`, notas D2/D5/D6/D7/E9/X10a/X10i/FE-INCR-DFE/M2 | `node scripts/plano-vault.mjs check` sai 0 |
| 0.2 | ✅ Conferir os prazos no ato oficial | esta sessão (27/09) | ADR §11.3 | cada data com o dispositivo do Ato Conjunto 4 citado |
| 0.3 | Enviar o follow-up ao contador (itens 1–5) | **dono** | [`PEDIDO-CONTADOR-2026-09-23-followup.md`](PEDIDO-CONTADOR-2026-09-23-followup.md) | enviado; resposta volta como "triagem do que o contador mandou" |
| 0.4 | ✅ (27/09) Rebaixar o corpus da NFS-e (Anexo I, Anexo II, XSD) | **dono autoriza o download**; agente roda `node scripts/baixar-fontes-oficiais.mjs` | binários locais | sha256 igual ao do `MANIFEST.md` (senão: fonte reeditada → reconferir o BRIEF X10b) |
| 0.5 | ✅ (27/09, TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md) Transcrever `infNFSe` [1]–[101] + RN E0010 + evento `e101101` | planejamento/insumo | `fontes-oficiais/TRANSCRICAO-NFSe-…md` | item 1 do BRIEF `BE-INCR-DFE-MANUAL` |
| 0.6 | ✅ ~~Prints do portal~~ → Guia oficial do Emissor Público Nacional Web v1.2 (104 p., com as telas e a tabela de campos) | agente (27/09) | citado no BRIEF (insumos, §5 F-MAN-4, §6, §7) | prints do dono só se o portal ao vivo divergir do guia |
| 0.7 | ~~FAQ gov.br v1.1~~ dispensável — o guia fechou o login sem certificado (p2) e a numeração (F-MAN-4) | — | — | — |

## Fases A–B — Releitura + modo manual (backend) · nó [`DFE-MANUAL`](../plano/nos/DFE-MANUAL.md)

| # | Passo | Sessão | Saída | Critério de pronto |
|---|---|---|---|---|
| A.1 | ✅ BRIEF | planejamento (27/09) | [`BE-INCR-DFE-MANUAL-brief.md`](BE-INCR-DFE-MANUAL-brief.md) | checklist 1–18, contratos, forks F-MAN-1..5 |
| A.2 | ✅ Ratificar F-MAN-1..5 (27/09; sub-fork F-MAN-2b pendente) | **dono** (questionário) | registro no BRIEF §5 + nota de decisão | 5 escolhas registradas |
| A.3 | "executa" | **dono** | campo `autorizacao` do nó | frase citável |
| A.4 | ✅ PR-0: transcrição (item 1) — 27/09 | planejamento/insumo | doc de transcrição | depende 0.4 |
| A.5 | PR-1: `parseNfseAutorizada` + `compareNfseWithDps` + registro sem PII (itens 2, 3, 5) | feature | `lib/nfse.ts`, `lib/nfseReadback.ts` + testes puros | fixture NFS-e completa → campos; mutação de 1 campo → 1 divergência |
| A.6 | PR-2: adaptador manual + adaptador por documento + job (itens 7–10, 17) | feature | porta, factory, lifecycle | documento manual com env trocado não é consultado pelo adaptador errado |
| A.7 | PR-3: rotas manuais + guardas de identidade + audit + OpenAPI (itens 4, 6, 11–16) | feature | 4 rotas novas | upload válido autoriza 1 vez; XML de outro prestador ou anterior ao documento → 422 |

## Fase C — Tela · nó [`FE-INCR-DFE`](../plano/nos/FE-INCR-DFE.md)

| # | Passo | Sessão | Critério de pronto |
|---|---|---|---|
| C.1 | BRIEF `FE-INCR-DFE` | planejamento — depois de A.2 | seções da ficha = os 4 passos do guia (Pessoas, Serviço, Valores, Emitir NFS-e), campo a campo pela tabela do guia |
| C.2 | Botão "Emitir NFS-e" na venda: preview → lista do que falta → emitir | feature | venda incompleta mostra o que falta e não cria documento |
| C.3 | Ficha espelho: seções na ordem do portal, um botão de copiar por campo, **formato do portal** (máscara, vírgula decimal, data) | feature | cada campo copiado cola no portal sem edição |
| C.4 | Retorno: arrastar o XML → releitura na tela (igual / divergente campo a campo) | feature | divergência aponta o campo e os dois valores (sem gravar PII) |
| C.5 | Rejeição/reenvio e cancelamento manual | feature | cancelamento pede a prova do F-MAN-5 |
| C.6 | Gates do FE: build de produção (`withAuth`), paridade i18n pt/en, `neutral-*`/`rounded-2xl` | feature | verificação contra `next build`, não `next dev` |

## Fase D — Prova humana do modo manual (gate, sem sessão de agente)

| # | Passo | Quem | Critério |
|---|---|---|---|
| D.1 | `RUNBOOK-H2-DFE-MANUAL.md` em branco (`RUNBOOK-FORMAT`) | agente prepara | pré-condições, passos, campos EVIDÊNCIA vazios |
| D.2 | 1 NFS-e pela ficha com releitura `IGUAL` + 1 com erro de digitação proposital apontado pela releitura | **dono** executa, cola evidência e assina | runbook sem assinatura é nulo |

## Fase E — Adaptador da Focus · nó [`X10i`](../plano/nos/X10i.md)

| # | Passo | Quem / sessão | Critério |
|---|---|---|---|
| E.1 | D5: conta Focus (token de homologação), contrato conferido (empresas, NFC-e, NFS-e nacional e municipal, NF-e recebidas, **preço**), A1 de teste | **dono** | os 4 itens com evidência |
| E.2 | "executa" da emissão real — supera a regra "não abrir X10b/emissão" (`PROXIMOS-PASSOS-2026-09-14.md:78`; nota do X10i), que **só o dono** reverte | **dono** | frase citável |
| E.3 | BRIEF `BE-INCR-DFE-FOCUS` | planejamento | mapa DPS → JSON da Focus; `POST /nfsen?ref=`; `ref` única por token e presa após autorização; webhook com segredo em cabeçalho (comparação em tempo constante); polling obrigatório (retentativas param em 24 h); XML/PDF pelo retorno; **pré-voo de validade do A1**; LGPD: o CPF do tomador vai à Focus por instrução do cliente (termos de uso); releitura da Fase A |
| E.4 | Adaptador | feature | releitura `IGUAL` em homologação |
| E.5 | H2-DFE em homologação da Focus | **dono** (runbook) | assinado |
| E.6 | [`M2`](../plano/gates/M2.md) (1º deploy na VPS) + 1ª nota em produção com releitura `IGUAL` | **dono** | evidência colada |

## Fase F — Tipo de documento + NFC-e · nó [`X10a`](../plano/nos/X10a.md)

| # | Passo | Quem | Critério |
|---|---|---|---|
| F.1 | Decidir a dúvida D-2 do `DUVIDAS-INVENTARIO` (o X10a "materializou no X10b" ou é nó aberto?) | **dono** | registro na nota do X10a |
| F.2 | **F-PLAN-2** (abaixo): NFC-e na porta + roteamento por tipo | **dono** ratifica | registro |
| F.3 | NF-e 55 de saída (Fase E do BRIEF X10b) | segue [pendente-insumo]: MOC 7.0 de saída fora do corpus (F-DFE-13 a) | — |

## Fase G — Compra via "NF-e recebidas" · [`D2`](../plano/gates/D2.md) / [`E9`](../plano/gates/E9.md)

| # | Passo | Quem | Critério |
|---|---|---|---|
| G.1 | **F-PLAN-3** (abaixo) | **dono** ratifica | registro |
| G.2 | Se (a): emenda do `ADR-INCR-NFE` (2ª origem do import) → BRIEF depois do D5 → feature; evento `nfe_recebida` do webhook | planejamento → feature | 1ª nota recebida passa pelo `parseNfe` (assinatura verificada, #403) |
| G.3 | E9: a 1ª nota real recebida vira fixture anonimizada e **re-assinada com a chave de teste** (README das fixtures, #403) | feature | a ponta solta da nota fictícia de 26/09 fecha; o verificador do SIG-NFE vê a 1ª assinatura ICP real |

## Fase H — Prazos e vigilância (registro)

| Fato | Fonte | Consequência |
|---|---|---|
| NFS-e do salão (LC 116 fora das alíneas a–c) obrigatória a partir de **01/10/2026** | Ato Conjunto RFB/CGIBS 4/2026, art. 1º III d (PDF oficial lido 27/09) | Nenhuma fase de código fica pronta até lá: o 1º cliente em regime normal emite no portal, fora do Luminaris, até a Fase C ou E existir |
| Simples: **01/01/2027** (§ 1º) × **01/11/2026** (contador, P7) | Ato 4 × triagem 23/09 | Pergunta 5 do follow-up. Até a resposta, a nota do [`D7`](../plano/gates/D7.md) carrega as duas datas |
| NFC-e e NF-e 55: desde 03/08/2026 (regime normal) | Ato 4, art. 1º I e II | Reforça o F-PLAN-2 |
| PNCT: correção até 31/12/2026 com contador responsável | triagem 23/09 (5f) — Ato 5 só em fonte secundária | Vigilância nasce com a 1ª nota (D7) |

## Forks do plano — ✅ RATIFICADOS 2026-09-27 (F-PLAN-1 contra a recomendação — ver [`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md))

### F-PLAN-1 — O nó `DFE-MANUAL` entra na régua fiscal?

- **(a)** Não: nasce `subno` (a régua não muda — hoje fiscal 11/19).
- **(b)** Sim: vira nó de régua (denominador fiscal +1), como o SIG-NFE em 25/09.
- **Recomendação: (a).** É a evolução de um nó já fechado (X10b), não capacidade fiscal nova; a capacidade que a
  régua mede — emitir de verdade — continua no X10i. **PENDENTE.**

### F-PLAN-2 — NFC-e na porta e roteamento por tipo de documento (X10a)

- **(a)** Sim, via parceiro: `DfeKind` ganha `NFCE`; a seleção passa a ser por `kind` (cada tipo pode ter um adaptador);
  BRIEF próprio depois da D-2.
- **(b)** Não por enquanto: o salão emite NFC-e fora do Luminaris.
- **Recomendação: (a).** A NFC-e é obrigatória desde 03/08/2026 para o regime normal (Ato 4, II), e a triagem de 23/09
  (P3) registra que o salão vende no balcão. Só via parceiro — não conheço portal público de NFC-e com a mesma função
  do Emissor Nacional (grau: não verificado). **PENDENTE.**

### F-PLAN-3 — "NF-e recebidas" da Focus como 2ª origem do import de compra

- **(a)** Sim: emenda do `ADR-INCR-NFE`; a compra passa a chegar também pela API (e por push, evento `nfe_recebida`),
  além do upload; D2 fecha quando o 1º cliente conectar a chave dele.
- **(b)** Não: o import segue só por upload.
- **Recomendação: (a).** Tira do cliente o trabalho de caçar XML, traz a nota assinada como o fisco a vê (o que o
  SIG-NFE precisa e nunca testou) e fecha D2/E9 sem depender de alguém mandar arquivo. Custo: depende do D5. **PENDENTE.**

### F-PLAN-4 — Ordem entre A–B (modo manual) e E (Focus)

- **(a)** A–B primeiro; E começa quando D5 fechar, em paralelo.
- **(b)** E primeiro; A–B depois.
- **Recomendação: (a).** A–B não depende de nada externo além do download do corpus, e a releitura é pré-requisito da
  precisão no caminho Focus. **PENDENTE.**

## Achados fora de escopo

1. **F5/F6 com Mercado Pago** (financeiro, dono 26/09: "MP agora, banco CNAB depois") — muda a premissa dos dois ADRs;
   a autorização F-M3 cobre abrir o ADR, não código. Frase para abrir: "abre o ADR do F5/F6 com Mercado Pago".
2. **Evidência do P4** — o dono mostrou os prints dos validadores em chat (26/09: ECF 12.2.6, Contábil 10.4.1), mas o
   campo `EVIDÊNCIA P4` do `RUNBOOK-H1-PVA.md` só vale colado pelo executor (RUNBOOK-FORMAT).
3. **Datas "27/09" escritas no vault antes de 27/09** — notas de 25/09 citam 27/09 (ex.: X6 dizia combustíveis fechados
   "27/09"; o merge do #387 é de 25/09 23:04). A do X6 foi corrigida neste registro; as demais (ex.: `GOV-CONTADOR`) não.
4. **Registro de 02/10 — [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](MAPA-COBERTURA-EMISSAO-2026-10-02.md).** Três pontos que este plano não cobria, cada um com fork do dono
   (**✅ ratificados 02/10:** F-COB-1 → a, F-COB-2 → b, F-COB-3 → a —
   [`D-2026-10-02-MAPA-COBERTURA-FORKS`](../plano/decisoes/D-2026-10-02-MAPA-COBERTURA-FORKS.md)): entregar a nota ao tomador (F-COB-1, toca a Fase C); captura de NFS-e tomadas e busca sem parceiro
   (F-COB-2, toca a Fase G: o passo G.2 só usa o evento `nfe_recebida`); e como o A1 do cliente chega à Focus
   (F-COB-3, insumo do BRIEF do passo E.3). O mapa também mede o que faltaria para emitir direto no Emissor
   Nacional (§3.4), **sem** reabrir a decisão 2 de 26/09.
