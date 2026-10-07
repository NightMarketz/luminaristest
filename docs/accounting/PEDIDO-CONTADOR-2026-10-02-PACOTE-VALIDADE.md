# PEDIDO AO CONTADOR — validade do pacote pré-pago (PE-1..PE-5) — 2026-10-02

> Rascunho preparado pelo agente (skill `luminaris-contador-liaison`). **O dono envia** (CTD-001). O agente não
> enviou nada.
> Escopo: **só PE-1..PE-5** do [`BE-INCR-PACOTE-VALIDADE-brief.md`](BE-INCR-PACOTE-VALIDADE-brief.md) §6
> (nó [[PACOTE-VALIDADE]]). O PE-6 (direito do consumidor) é do jurídico, em pedido separado:
> [`PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md`](PEDIDO-JURIDICO-2026-10-02-PACOTE-VALIDADE.md).
> **Prioridade do dono (02/10):** **PE-4** primeiro, porque o F-PV-9 (b) emite NFS-e no vencimento; depois o
> **PE-1 (iv)**, a norma que a empresa segue. Os outros vêm na mesma mensagem, mas podem chegar depois.

---

## Texto para enviar

> Olá, [nome do contador],
>
> Estamos colocando **prazo de validade nos pacotes pré-pagos** do salão (o cliente compra, por exemplo, um pacote de
> R$ 500 e vai usando em serviços). Quando o prazo vence com saldo sobrando, o saldo deixa de valer para o cliente.
> Antes de ligar isso, precisamos da sua leitura em cinco pontos. Os dois primeiros são os que mais pesam.
>
> **1. (Prioridade) ISS e nota fiscal sobre o saldo vencido — São Paulo capital**
> Hoje o salão está configurado para emitir a NFS-e **no consumo** (a nota sai quando o serviço é feito, não na venda
> do pacote). Do jeito que decidimos, quando um saldo vence sem uso, o sistema **emitiria uma NFS-e do valor vencido**
> automaticamente.
> - (a) O valor vencido sem uso (serviço que não foi prestado) **gera ISS / exige NFS-e** em São Paulo capital?
> - (b) Se sim: qual **código de tributação nacional (cTribNac, 6 dígitos da lista nacional)** e qual **código NBS
>   (9 dígitos)** devemos usar nessa nota? O mesmo código vale para a nota do pacote quando ela é emitida **na venda**
>   (para quem emite na venda)?
> - (c) Se não: confirma que **não** devemos emitir nota nenhuma no vencimento?
> - (d) Para quem emite a nota **na venda** do pacote (valor cheio): confirma que no vencimento nada muda?
>
> **2. (Prioridade) Qual norma contábil a empresa segue**
> CPC 47 completo, CPC PME (NBC TG 1000) ou NBC TG 1002 (microentidade)? Pergunto porque, se for a NBC TG 1002, o item
> 23.7 parece permitir reconhecer a receita **na emissão da nota** — e aí talvez nem precisemos manter o pacote como
> passivo até o consumo.
>
> **3. Tratamento contábil do saldo vencido**
> Nossa proposta: no vencimento, o saldo sai do passivo ("adiantamento de clientes") e vira **receita**, numa conta
> separada (receita por não uso de pacote), com data de competência no **dia seguinte ao último dia válido**.
> - (a) Concorda em reconhecer tudo no vencimento? Ou prefere o **método proporcional** (ir reconhecendo a parte que
>   se espera que não será usada ao longo do uso)?
> - (b) Em que conta e em que linha da DRE essa receita deve ficar (receita bruta de serviços, outras receitas
>   operacionais, outra)? E qual o **código da conta referencial da RFB** (Plano Referencial da ECD, ano-calendário
>   2025, PJ em geral) para essa conta? Hoje as nossas receitas estão assim: receita de serviços → 3.01.01.01.01.06;
>   revenda de mercadorias → 3.01.01.01.01.05. *(Incluído em 07/10: sem esse código a ECD não é gerada.)*
> - (c) A data de competência (dia seguinte ao último dia válido) está certa? Pacote válido até 31/12 viraria receita
>   de 01/01 do ano seguinte.
>
> **4. Simples Nacional**
> - (a) Esse valor vencido entra na receita bruta do PGDAS-D? Em qual anexo?
> - (b) A partir de 2027 (Res. CGSN 190/2026), o Simples passa a reconhecer a receita na emissão do documento fiscal.
>   Com a nota emitida no consumo, o saldo vencido nunca seria faturado — isso muda alguma coisa na sua resposta?
>
> **5. IBS/CBS (a partir de 2027) e Lucro Presumido/Real (para outros clientes)**
> - (a) IBS/CBS: o pacote que vence sem uso é "não fornecimento" (tratado como cancelamento, com estorno da
>   antecipação, LC 214 art. 10 § 5º e Decreto 12.955/2026 art. 57) ou é contraprestação tributável?
> - (b) Presumido/Real: essa receita entra na base presumida de **serviços** (32%) ou como **demais receitas** (100%
>   na base de IRPJ/CSLL)? Em qual linha da ECF?
>
> Se algum ponto depender de consulta à Prefeitura ou de uma decisão sua sobre a empresa, pode me dizer só isso — eu
> registro e voltamos depois.
>
> Obrigado!

---

## Itens pedidos — detalhe e critério de aceite INTERNO (não vai no texto)

Fonte das perguntas: BRIEF §6 (PE-1..PE-5), §5.1–§5.2 (ratificação de 02/10) e a
[pesquisa legal de 29/09](PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md).

| # no texto | PE | O que é, nos termos dele | Critério de aceite interno | O que a resposta move |
|---|---|---|---|---|
| 1a, 1c, 1d | **PE-4** | ISS/NFS-e sobre o vencido em `CONSUMO`; `VENDA` sem mudança | Resposta explícita **sim/não** para (a). "Depende" sem o critério → não fecha; volta ao contador | **"não"** → crítica contra o F-PV-9 (b), ratificado contra a recomendação. Vai ao **dono** como fork reaberto (voltar ao F-PV-9 a?). O agente não reverte. Até lá, o ponto de controle do §5.2 vale: sem `pacoteCTribNac` no perfil, nenhuma nota sai |
| 1b | **PE-4** + F-PV-9b | `cTribNac` (6 dígitos) e `cNBS` (9 dígitos) do pacote | `cTribNac` existe em `lc116ListaNacional.ts`; `cNBS` tem 9 dígitos; o contador diz se o mesmo par serve à venda (`VENDA`) e ao vencimento | **dado** → valor do `FiscalProfile.pacoteCTribNac`/`pacoteCNBS` (item 13a), preenchido pelo dono no perfil. Também destrava o pacote `VENDA` (`FiscalDocumentEmissionService.ts:437-445`) |
| 2 | **PE-1 (iv)** | Norma seguida: CPC 47 / NBC TG 1000 / NBC TG 1002 | Uma das três, nomeada | **NBC TG 1002 + adoção do 23.7** → frente nova (BRIEF §8), fork ao dono. **CPC 47 ou PME** → confirma o desenho (T5: "confirma, nada muda") |
| 3a | PE-1 (i) | Reconhecer no vencimento (B46, 2º ramo) × proporcional (B46, 1º ramo) | Uma das duas | **proporcional** → crítica: muda o modelo do F-PV-4/5; fork ao dono |
| 3b | PE-1 (ii) | Conta e linha da DRE **+ código referencial RFB da 3.4** (emenda 07/10) | Conta e seção nomeadas; código referencial existente no catálogo 2025 (`GET /referential/catalog`) e analítico | **dado** → mapeamento da folha 3.4 e regra DRE do item 13 (provisórios por desenho: F-PV-4 a). **Bloqueia o H1** (07/10): sem o código a cobertura fica 14/15 e `POST /sped/ecd/generate` dá 400 `unmappedAccounts: [3.4]` (os dois tenants do seed) |
| 3c | PE-1 (iii) | Competência `expiresOn + 1` | sim/não; se não, a data que ele quer | **não** → emenda do F-PV-5 pelo dono |
| 4a, 4b | PE-3 | Simples: receita bruta do PGDAS-D, anexo, efeito de 2027 | Sim/não + anexo | Insumo do PRE-ADR Simples/MEI da onda 3 (decisão 8); não muda o checklist |
| 5a | PE-5 | IBS/CBS no vencido | Leitura nomeada (cancelamento × contraprestação) | Insumo do PRE-ADR IBS/CBS (fork V5 do dossiê §4) |
| 5b | PE-2 | Presumido/Real: 32% × 100%, linha da ECF | Base e linha nomeadas | **dado** → `PRESUNCAO_ACCOUNT_CODES`; destrava a ECF que o item 13 bloqueia |

**Anonimização:** nenhum item pede documento do cliente. Se o contador mandar exemplo com dado real (nota, CPF),
ele **não** entra no repositório (CTD-003): o dono troca os dados antes ou descarta.

## O que NÃO estamos pedindo

- **PE-6** (validade da cláusula, prazo mínimo, como informar): é do jurídico. Vai em pedido separado.
- Itens de pedidos anteriores (D8 de 24/09, follow-up de 23/09, XMLs de NF-e): não se repetem aqui.
- Validação de BP/DRE/ECD/ECF gerados: entra quando o H1 chegar lá, não neste pedido.

## Quando a resposta chegar

Chame o agente com "triagem do que o contador mandou". Cada resposta vira **dado**, **crítica** (fork ao dono ou
emenda, nunca hotfix), **confirmação** ("confirma, nada muda") ou **fora do pedido**. A resposta não é sign-off
(CTD-002). Os PE só saem de "pendente" na nota de decisão quando a triagem registrar a resposta.
