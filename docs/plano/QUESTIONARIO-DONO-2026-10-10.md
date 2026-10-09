# Questionário do dono — 10/10/2026

Tudo o que espera decisão sua, num lugar só. Marque uma opção por pergunta, ou responda no chat
"Q1 a, Q2 a…". Cada resposta vira ratificação citável no vault e destrava o nó.
Fonte: pacote da persona contábil (09/10) + estado das notas em `docs/plano/nos/`.

**Aviso sobre a base legal:** os artigos do bloco A foram lidos na fonte em 09/10
(`docs/accounting/PESQUISA-X14-PR4-LACUNAS-2026-10-09.md`) e não foram conferidos de novo, porque o Planalto
estava fora do ar. A data de 01/11/2026 da Res. CGSN 191 é a mais frágil: veio só da notícia da RFB, não do texto da resolução.

---

## A. X14 — Simples Nacional (destrava o fechamento do nó)

### Q1 — F-PR4-8: falta a linha do teto do ISS (`SIMPLES_TETO_ISS`)
Hoje (`simplesCalc.ts:368`) o cálculo segue sem o teto e sem aviso, então a repartição pode sair errada sem ninguém saber.
- [ ] **(a) Erro, só no Anexo III/IV antes de 2033** — *recomendado*. Mesmo critério do F-PR4-7 (a), que já trava quando falta parâmetro legal. No Anexo V e de 2033 em diante a linha não existe por lei.
- [ ] (b) Erro sempre que faltar — dá falso erro em todo Anexo V e de 2033 em diante.
- [ ] (c) Manter como está (calado).

### Q2 — F-PR4-10: alerta de divergência da NFS-e no ME
O alerta só avisa e não muda imposto nem razão. Hoje soma a locação de bem móvel (cota do salão-parceiro), e por isso acusa divergência falsa todo mês.
- [ ] **(a) Tirar a locação da soma + documento municipal como informativo até 31/10/2026** — *recomendado*.
- [ ] (b) Locação e documento municipal viram informativo, com o motivo.
- [ ] (c) Manter.

### Q3 — F-PR4-12: optante pelo regime de caixa
O perfil fiscal não tem campo de opção caixa/competência do Simples. Se o cálculo inteiro do X14 é por competência,
o DAS de quem é de caixa pode estar errado, não só o alerta. Isso **não foi verificado**.
- **Q3.1 — O produto atende optante pelo caixa?**
  - [ ] Sim → **(b) campo novo no perfil + o alerta vira informativo para quem é de caixa** — *recomendado*. Exige conferir se a base do DAS também precisa da variante por recebimento.
  - [ ] Não → bloquear a opção "caixa" no perfil (a empresa de caixa não usa o X14).
  - [ ] Não sei → perguntar ao contador quantos clientes são de caixa (vira pedido externo).

## B. Governança do contador

### Q4 — F-GOV-1: consulta ao CRC-SP (software × serviço contábil)
A consulta está pronta em `docs/accounting/CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md`. **Sem recomendação**: o risco é
regulatório e comercial, e a decisão é sua. Pergunta 3 da consulta: o F-GOV-11 (a) deixa você reabrir período coberto pelo contador, o que contraria a condição que o contador pôs em 23/09.
- [ ] (a) Enviar agora e não vender "com contador incluso" até a resposta.
- [ ] (b) Vender sem consultar.
- [ ] (c) Enviar e vender em paralelo, com aviso no contrato.

## C. Autorizações de execução (nós prontos que esperam o seu "executa")

### Q5 — F5, cobrança Mercado Pago: PR-2 (cobrança + MP + webhook) e PR-3 (relatório + F7)
O PR-1 está em `main` (#484). O PR-3 só mergeia depois da sonda de colunas em produção (F-PPB-1 c), e o deploy exige a chave no env do M2.
- [ ] Executa o PR-2 e o PR-3, sem merge.
- [ ] Executa só o PR-2.
- [ ] Ainda não.

### Q6 — CSLL-LC224 (alíquotas da CSLL pela LC 224/2025)
BRIEF com forks ratificados. Falta conferir o texto da LC 224 publicado no DOU e a redação anterior (P-CA-1/2). Isso eu
consigo fazer sem você, se o site da fonte oficial responder. Também falta a regra do PVA para os códigos 7/8 e o rateio no Real anual (P-CA-3/4).
- [ ] Executa depois que eu conferir P-CA-1/2 na fonte; P-CA-3/4 ficam como aviso no PR.
- [ ] Só executa com P-CA-1..4 todas fechadas.
- [ ] Ainda não.

## D. Arrumação

### Q7 — PRs #588 e #590 (GAP-MAP do shard de integração)
Os dois registram como **aberta** a lacuna do banco-modelo frio, que o `main` já marca como **corrigida** (#591, `globalSetup` que
aquece o banco-modelo). Mergear exigiria resolver conflito e gravaria informação desatualizada.
- [ ] **Fechar os dois sem merge** — *recomendado*. A linha do `main` já tem o conteúdo, mais completo.
- [ ] Reescrever o #590 contra o `main` atual: dos 38 `beforeAll` sem timeout, ver quantos ainda ficam expostos com o banco-modelo aquecido.

---

## Fora do questionário — só você executa (gates humanos e dados externos)
- **PACOTE-VALIDADE:** sign-off de browser H2-PACOTE-VALIDADE + deploy (M2). O código está em `main`.
- **NFC-e (X10a → X10i → X11):** certificado A1 de teste + acesso ao ADN de homologação (D5).
- **F6, repasses:** o Mercado Pago aprovar a chave ed25519.
- **FE da política (GOV-CONTADOR):** sign-off de browser quando o PR da noite sair.
- **Pedidos já prontos para você enviar:** contador (PACOTE-VALIDADE PE-1..5), jurídico (PE-6), CRC-SP (Q4).
