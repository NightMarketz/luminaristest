# PACOTE DO PEDIDO AO CONTADOR — 2026-09-03 — pronto para o dono enviar

> **O que este doc é:** o rascunho do pedido ao contador, montado pelo `luminaris-contador-liaison`
> a partir das decisões do dono de 2026-09-03 ([cédula de módulos](CEDULA-DECISAO-2026-09-03-modulos.md)
> F-M2/F-M5 e [cédula de integração](CEDULA-DECISAO-2026-09-03-integracao.md) E9/E10).
> **Quem envia é o dono** (CTD-001). Resposta do contador **não é sign-off** — cada item vira artefato
> checável no trilho próprio (CTD-002). Nada com CNPJ/nome real entra no repositório (CTD-003).
>
> **Ancoragem na fila (CTD-004):** o arquivo RFB "PJ em Geral" **NÃO está no pedido** (baixado
> direto em 2026-08-31, `RUNBOOK-X2`). Validação profissional de BP/DRE/ECD/ECF **NÃO está no pedido**
> — entra só quando o H1 (PVA) chegar lá.
>
> **EMENDA 2026-09-15 (Passo 11):** itens **6–13** acrescentados ao fim deste doc (encargo/desconto F7,
> PIS/COFINS X6 + CST 02, linhas E do e-Lalur, reforço 1/1b, revisão C11, pacote C6b, imobilizado C8). O texto dos itens 0–5
> continua valendo; o item 1 já pedia a tabela de depreciação — o 13 a detalha.

---

## Texto do pedido (copiar e enviar)

> Olá, [nome]. Estamos fechando o módulo fiscal do sistema para operar empresa no **Lucro Real** e
> preciso de quatro coisas suas (três, se eu conseguir a nota fiscal por outro caminho). Nenhuma é
> urgente para hoje, mas a primeira decide se o resto faz sentido, então quanto antes melhor.
>
> **0. A pergunta que vem antes de todas: você assina ECD e ECF geradas por um sistema que você não
> opera?** A ideia do produto é a escrituração inteira nascer no sistema — lançamentos, depreciação,
> encerramento, ECD e ECF prontas — e chegar a você para revisar e assinar como responsável técnico,
> em vez de você escriturar do zero. Sob que condições você assina isso, e o que precisa ver antes de
> assinar (balancete? razão? conciliação bancária? amostra de lançamentos? tudo?). Se a resposta for
> "só revisando lançamento a lançamento", quero saber também, porque muda o desenho. E uma segunda,
> ligada a essa: para você, um sistema que faz isso continua sendo software que o seu cliente usa
> com você como responsável técnico, ou em algum ponto vira prestação de serviço contábil, que é
> atividade do CRC? Onde você traça essa linha?
>
> **1. Lista de obrigações de uma empresa no Lucro Real (serviços + revenda de produtos, porte
> pequeno).** Preciso da relação do que ela entrega e paga, por periodicidade, na sua prática atual:
> apurações mensais/trimestrais (IRPJ e CSLL — estimativa mensal ou trimestral?; PIS e COFINS
> não-cumulativos; ISS; ICMS se houver revenda), e as declarações/escriturações acessórias
> (EFD-Contribuições, DCTFWeb, EFD ICMS/IPI, e o que mais couber). Para cada uma: nome, periodicidade,
> qual programa/validador da Receita ela usa (PVA, e-CAC, etc.) e se você a gera a partir de arquivo
> que o sistema do cliente exporta ou lança à mão no portal. Se tiver um checklist que já usa com
> clientes de Lucro Real, ele serve. Inclua também o que a reforma do consumo já exige em 2026:
> destaque de IBS/CBS nos documentos, classificação tributária dos produtos (`cClassTrib`) e a DeRE,
> com as fases que você conhece. E, como a empresa vai ter imobilizado (cadeiras, equipamentos,
> ar-condicionado), a **tabela de taxas de depreciação** que você pratica para esse tipo de bem.
>
> **2. Custo de mercadoria comprada com nota fiscal, no Lucro Real — posição de risco, não regra.**
> Já sei o que o fisco diz: ICMS próprio recuperável sai do custo; ICMS-ST não gera crédito de
> PIS/COFINS (STJ, repetitivo); e a IN 2.121/2022 tira o IPI da base do crédito, com decisões
> judiciais em sentido contrário. O que preciso de você é **a posição que você adota** para os seus
> clientes de Lucro Real: (a) a empresa é contribuinte de ICMS e a saída é tributada, ou seja, o ICMS
> da compra vira crédito mesmo? (b) sobre o IPI na base do crédito de PIS/COFINS, você segue a IN ou
> contesta? (c) para fornecedor do Simples, como você trata o crédito de ICMS e de PIS/COFINS? É
> escolha de exposição sua com o advogado, e o sistema vai refletir a que você indicar.
>
> **3. Uma nota fiscal eletrônica de compra e uma de venda, em XML, anonimizadas.** É o arquivo XML da
> NF-e modelo 55 (não o PDF/DANFE), **obrigatoriamente autorizada depois de 03/08/2026**, já com os
> grupos de IBS/CBS. Pode ser de qualquer cliente seu, desde que a anonimização siga estas regras,
> senão o arquivo deixa de ser uma NF-e válida: (a) troque **CNPJ, CPF, nomes, endereços e inscrição
> estadual** por valores fictícios **com dígito verificador correto**; (b) como a chave de 44 dígitos
> embute o CNPJ do emitente, **reconstrua a chave** com o CNPJ fictício e **recalcule o dígito final**
> (`cDV`), mantendo `@Id` e `chNFe` iguais; (c) **não apague** a tag `<Signature>` — substitua o
> conteúdo por um bloco de assinatura fictício mas bem-formado. O resto fica como está: valores,
> quantidades, CFOP, situação (`cStat`), impostos por item. Uma com mais de um item ajuda mais.
> *Se for mais fácil, uma NF-e de compra da própria empresa serve igual — o destinatário tem direito ao
> XML.*
>
> ~~4. Manual da ECF~~ *(retirado em 2026-09-03: o PDF vigente, de 20/05/2026, tem link direto no
> índice oficial do SPED — não precisa do contador. Item 3 também pode sair se o dono usar o XML de
> compra da própria empresa, que é o caminho preferido: precisa ser nota de agosto/setembro de 2026.)*
>
> **5. Emissão da nota de serviço (NFS-e) e da NF-e de venda pelo sistema, via parceiro emissor** — o
> sistema vai montar a nota e entregar a um emissor por API; a obrigação da NFS-e nacional para serviços
> de beleza começa em **01/10/2026** (Ato Conjunto RFB/CGIBS nº 4/2026, art. 1º III "d"). Preciso de você:
> **(a)** o item da lista de serviços da LC 116/2003 em que os serviços do salão se enquadram (6.01/6.02?)
> e a regra de onde o ISS é devido (estabelecimento prestador?) — a alíquota em si eu pego quando o
> município do 1º cliente estiver definido; **(b)** quando há **ISS retido** pelo tomador (só PJ? quais
> casos) — pretendo deixar retenção fora da 1ª versão; **(c)** num **pacote pré-pago** de serviços (o
> cliente paga hoje e consome ao longo dos meses), o fato gerador do ISS é na venda do pacote ou em cada
> prestação? Vou emitir a nota **no consumo**, não na venda do pacote — confirme; **(d)** em 2026 a nota
> **destaca** IBS/CBS (ano-teste, 0,1% + 0,9%) mas não há recolhimento para quem cumpre as acessórias —
> confere? Não vou escriturar IBS/CBS de teste no razão; **(e)** para **optante do Simples**, o que muda na
> nota nacional (ISS dentro do DAS, sem destaque de IBS/CBS?) e se a emissão antes de 01/01/2027 é
> facultativa; **(f)** consequência prática de emitir a nota **no mês seguinte** ao da prestação (competência
> × emissão) dentro do programa de conformidade (PNCT 2026, Ato nº 5).
>
> Obrigado!

---

## Itens pedidos — visão interna (não vai no texto)

| # | Item | Formato exigido | Anonimização | Critério de aceite NOSSO | Trilho quando chegar |
|---|---|---|---|---|---|
| **0** | **Premissa do F-Z0: o contador assina ECD/ECF que não conduziu?** + fronteira software × serviço contábil (CRC) | Resposta livre; o que importa é a **condição** (assina / assina revisando X / não assina) e a **linha** que ele traça | n/a | **C3×D5** — sem saída interna. Aceite = condição nomeada e checável (ex.: "assino com balancete + conciliação + amostra de 30 lançamentos"). Resposta "não" ou "só lançamento a lançamento" **reabre o F-Z0** e todo o trilho contábil autorizado por ele (imobilizado, retificação, e-mail) | **crítica** → cédula de módulos §B (F-Z0 passa de "ratificado" a "ratificado sob premissa testada" ou reabre); item **Z0-a** na lista de abertos ao lado de T1b |
| 1 | Lista de obrigações do Lucro Real | Texto/checklist, por obrigação: nome · periodicidade · validador · origem (arquivo × portal) | n/a | Cada obrigação nomeada vira **linha ⚫ ou ⏳ no master map §5** com validador identificado. Sem validador nomeado, a linha não abre ADR | **dado** → insumo dos ADRs `ADR-INCR-TAX-ASSESSMENT`, `ADR-INCR-EFD-CONTRIBUICOES`, `ADR-INCR-DCTFWEB` (cédula de módulos §E, fiscal) |
| 2 | Regra de custo D3 por tributo no Lucro Real | Tabela tributo → "compõe custo" / "vira crédito" | n/a | Regra por tributo, sem "depende" sem condição nomeada. Vira **flag de regime** no `lib/nfe.ts` (ADR-INCR-NFE §D3 já exige guarda de regime antes de reusar a fórmula fora do molde salão) | **crítica** → emenda ADR-INCR-NFE §D3 + fork de implementação (recuperabilidade por tenant); fecha o E10 |
| 3 | 2 XML NF-e 4.00 (compra + venda), **autorizadas ≥ 03/08/2026** (grupos IBS/CBS — senão testa o formato que está saindo de circulação) | XML, modelo 55, `cStat` 100 preferível | CNPJ/CPF/xNome/endereço/IE trocados **com DV válido**; **chave reconstruída** com o CNPJ fictício e `cDV` recalculado (`@Id` = `NFe`+`chNFe`); `<Signature>` **substituída por bloco sintético bem-formado**, não zerada; **preservar** `vProd`/`vDesc`/`vFrete`/`vIPI`/`vST`/`vNF`, `qCom`, `cStat`, impostos por item. *(Corrigido 2026-09-03 — [triagem simulada §B.2](TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md); a versão anterior mandava zerar a assinatura e não falava em `cDV`.)* | `nfe-fixture-provenance.test.ts` volta de `it.todo` a `it` e passa; `nfe.test.ts` verde contra o real **incluindo a asserção nova chave×CNPJ×`cDV`** (T4 da triagem); **se vier PII real, não commitar** (CTD-003), devolver o passo. **Alternativa sem contador:** XML de compra da própria empresa ou fixture open source com proveniência por commit | **dado** → item **E9** do Bloco A (trocar fixture sintético); fecha a dívida F-I2 |
| 4 | Manual ECF Leiaute 12 (PDF) | PDF do Anexo ao ADE Cofis 2/2026 | n/a | Carimbo de "Atualização" no PDF confere com **20/05/2026** (vigente no [índice oficial](http://sped.rfb.gov.br/pasta/show/1644), verificado 2026-09-03; a pendência anterior dizia 23/07 por fonte secundária — corrigida); seções L/M/N legíveis | **dado** → destrava Forks 2/3/4 da ECF Fase 3 (BRIEF `BE-INCR-SPED-ECF-FASE3`) |
| 1b | Complemento ao item 1: destaque IBS/CBS, `cClassTrib`, DeRE | idem item 1 | n/a | Mesmo critério do item 1: obrigação nomeada → linha no §5 com validador. Ato Conjunto RFB/CGIBS nº 4/2026 já localizado ([PDF](https://cgibs.gov.br/upload/arquivos/202607/31091735-20260730-16h30-ato-conjunto-rfb-cgibs-na-c2-ba-4-260731-090909.pdf)) | **dado** → linha "Reforma tributária IBS/CBS" do master map §5 |
| **5a** | **[EMENDA 2026-09-08 — ADR-INCR-DFE-EMISSAO-PARCEIRO, parecer gate 2]** Item da lista LC 116 dos serviços do salão + regra de onde o ISS é devido (estabelecimento prestador) | Item numerado (ex.: 6.01) + frase da regra | n/a | Item nomeado vira `ServiceFiscalProfile.itemLc116`; a alíquota fica pendente até o município do 1º cliente (não muda o "não pedimos") | BRIEF `BE-INCR-DFE` (F-DFE-6) |
| **5b** | ISS retido pelo tomador — em que casos (PJ? município? serviço?) | Lista de condições | n/a | Confirma "retenção fora do MVP" ou nomeia o caso que o salão vive | ADR-DFE §9.2 item 3; `FiscalDocument.issRetido` default false |
| **5c** | Pacote pré-pago: fato gerador do ISS na venda ou na prestação? | Resposta binária + base legal | n/a | Se "prestação", F-DFE-9 (a) confirmado (emitir no consumo); se "venda", **reabre F-DFE-9** | ADR-DFE F-DFE-9 |
| **5d** | IBS/CBS 2026: destaque sem recolhimento para quem cumpre as acessórias? | Confirmação + base (LC 214 art. 348) | n/a | Confirma "nenhum lançamento de IBS/CBS de teste no razão" (ADR-DFE §9.2 item 1) | ADR-DFE; X7 |
| **5e** | Simples Nacional na NFS-e nacional: regras da DPS para optante (ISS no DAS; destaque IBS/CBS?) e emissão facultativa antes de 01/01/2027 | Texto/checklist | n/a | Vira `FiscalProfile.regime = SIMPLES` com regras próprias (F-DFE-8 → b); DAS continua fora | BRIEF `BE-INCR-DFE` |
| **5f** | Competência × emissão em mês seguinte: consequência no PNCT 2026 | Frase da regra + fonte (Ato nº 5) | n/a | Define o aviso da tela (ADR-DFE §9.2 item 4 d) | BRIEF do FE da emissão |

**O que NÃO estamos pedindo (para o dono não re-pedir):**
- Arquivo RFB "PJ em Geral" — já baixado (`RUNBOOK-X2`).
- Validação profissional de BP/DRE/ECD/ECF — só depois do H1 (PVA) rodar.
- Alíquotas municipais de ISS por cidade — só quando o 1º cliente real tiver município definido.
- ~~Opinião sobre o Simples Nacional~~ **[EMENDA 2026-09-08]** o Simples entrou pela **emissão** (F-DFE-8 → b,
  item 5e); o que segue fora é a **apuração** (DAS/PGDAS-D) — regime-alvo do razão continua Lucro Real.

**Quando a resposta chegar:** me chame com **"triagem do que o contador mandou"**. Cada item entra na
classificação dado / crítica / confirmação / fora do pedido, com trilho e executor nomeados.

---

## EMENDA 2026-09-15 — itens 6 a 13 (Passo 11 de `PROXIMOS-PASSOS-2026-09-14.md`)

> Montada pelo `luminaris-contador-liaison` em 2026-09-15. **Patch, não rewrite**: os itens 0–5 acima
> continuam valendo como estão (o item 1 já pedia a tabela de depreciação; o item 13 abaixo a detalha, não
> a repete). Ancoragem na fila (CTD-004): cada linha nova nasce de um BRIEF mergeado que a nomeou como
> "pendente de validação externa" — F7 §5 (#326), X6 §4 + ERRATA (#327/#328), 3B §4 item 7 (#311), C11 §5
> (#321), C6b §5 (#324); o item 13 nasce do ADR/BRIEF C8 **em PR #330 (aberto, não mergeado)** — o texto ao
> contador pede a prática dele, não depende do merge. **Quem envia é o dono.**

### Texto adicional (copiar e colar após o item 5)

> Desde o pedido anterior avançamos bastante, e apareceram mais oito perguntas — todas curtas, quase todas
> só da sua prática (a 9 aceita um exemplo, opcional). Se preferir responder em áudio ou numa ligação, eu
> transcrevo.
>
> **6. Contas para juros, multa e desconto na baixa de títulos.** O sistema vai fazer a baixa de contas a
> pagar e a receber a partir do retorno do banco, e o valor do retorno às vezes vem **maior** que o título
> (juros/multa) ou **menor** (desconto). O plano de contas que temos hoje não tem conta para isso. Preciso
> que você me diga: **(a)** em que conta lançar juros e multa **pagos** por nós (despesa financeira? qual
> código no seu plano de referência?); **(b)** juros e multa **recebidos** de cliente — receita financeira,
> ou você trata como redutor de despesa?; **(c)** desconto **obtido** de fornecedor e desconto **concedido**
> a cliente — contas próprias, ou vão para o mesmo lugar dos juros com sinal trocado?
>
> **7. PIS/COFINS na compra, para o cliente do Lucro Real.** Para cada empresa que entrar no sistema
> vamos precisar saber se ela está no **cumulativo ou no não-cumulativo**. No não-cumulativo, o sistema
> calcula o crédito de 1,65% + 7,6% sobre a compra, e hoje ele está no modo mais conservador (sem crédito)
> em quatro situações até você confirmar a posição que adota: **(a)** o ICMS destacado na nota **sai** da
> base do crédito (Lei 14.592/2023) — você já aplica assim?; **(b)** o IPI **entra** na base do crédito ou
> você segue a IN 2.121/2022 e tira?; **(c)** compra de fornecedor do **Simples Nacional** — dá crédito de
> PIS/COFINS (ADI SRF 15/2007) ou você não toma?; **(d)** produtos **monofásicos** (perfumaria, cosméticos,
> farmácia, autopeças) não dão crédito — a lista que o sistema reconhece hoje vem só das Leis **10.147**
> (higiene/perfumaria/farmácia) e **10.485** (veículos, máquinas e autopeças); **bebidas e combustíveis ainda
> ficam fora** da lista (quando a nota vem com CST 02 o sistema nega o crédito e avisa; com CST 01 ele **toma** o
> crédito — por isso pergunto). Tem algum grupo de produto que os seus clientes compram e que você
> trata como monofásico além desses — bebidas (Lei 13.097/2015)? combustíveis? — ou algum desses dois que
> você **não** trata assim?
>
> **8. Um caso concreto do item 7.** Nota de compra em que o fornecedor destacou PIS/COFINS com **CST 02**
> (alíquota diferenciada) num produto que **não está** nas listas de monofásico que temos. Hoje o sistema
> **não toma crédito** e avisa o operador. Na sua prática: há crédito nesse caso? Se sim, sobre qual base e
> a qual alíquota — a da nota ou a padrão?
>
> **9. Linhas de adição e exclusão do e-Lalur que você realmente usa.** O leiaute da ECF tem 374 linhas
> possíveis de adição/exclusão na Parte A (M300) e outras tantas para a CSLL. O sistema carrega todas, mas
> para a tela ficar usável quero destacar as que aparecem de verdade. Para os seus clientes de Lucro Real
> (serviços + revenda, porte pequeno), quais códigos de linha você usa numa apuração típica? Se tiver uma
> ECF de exemplo (só os códigos das linhas, sem valores nem identificação), serve.
>
> **10. Tributos — reforço do item 1.** Reitero o item 1 e o complemento 1b do pedido anterior: a lista de
> obrigações do Lucro Real por periodicidade e validador, e o que a reforma já exige em 2026 (IBS/CBS,
> `cClassTrib`, DeRE). É o insumo que decide a próxima frente de apuração; sem ela, ela não abre.
>
> **11. Como você prefere revisar.** Quando a escrituração estiver pronta para você assinar (item 0), você
> prefere **entrar no sistema** (login próprio, revisa e registra os acertos lá dentro) ou **receber o
> pacote** por fora (arquivos + relatórios) e devolver os achados por e-mail/mensagem? Muda o desenho da
> revisão, então quero fazer do jeito que você trabalha.
>
> **12. O que vai no pacote que chega a você.** Além da ECD e da ECF, quais demonstrativos você quer junto,
> e em que formato (CSV ou XLSX)? Balancete, razão, balanço, DRE, conciliação bancária e uma amostra de
> lançamentos já estão previstos — servem? Falta algo que você sempre pede e eu não listei?
>
> **13. Imobilizado e depreciação — detalhando o que o item 1 já pedia.** O sistema vai controlar o
> imobilizado (cadeiras, equipamentos, ar-condicionado, veículo, reforma do ponto) e lançar a depreciação
> mês a mês. Preciso de: **(a)** as taxas que você pratica — segue o Anexo III da IN 1.700/2017 (10% para
> móveis/instalações, 20% para computadores, 4% para edificações, 20% para veículos…) ou usa laudo/vida útil
> própria para algum bem?; **(b)** os **códigos das contas** no seu plano de referência para: imobilizado por
> grupo (móveis e utensílios, máquinas e equipamentos, instalações, veículos, edificações, terrenos),
> **depreciação acumulada** de cada grupo, **despesa de depreciação**, e **ganho/perda na alienação** de
> bem; **(c)** quando a depreciação contábil for diferente da fiscal (vida útil menor, valor residual), o
> sistema leva a diferença para a **Parte B do e-Lalur** — na tabela padrão da Receita há três contas com
> esse nome (as três valem para IRPJ e CSLL): **1071** (desde 2018), **2210** (desde 2018) e **3130** (art. 6º da
> IN 1.778/2017, desde 2023). Qual delas você usa, e em que caso cada uma?;
> **(d)** o ICMS da compra de um bem para o ativo (CFOP 1551/2551): você deixa **no custo do bem** ou
> controla o crédito em 48 parcelas (CIAP)? O desenho previsto deixa no custo. **(e)** Algum cliente seu usa
> depreciação **acelerada por turnos** (2 ou 3 turnos)? Se ninguém usa, deixo fora por enquanto.
>
> Obrigado de novo — e o item 0 continua sendo o que mais importa.

### Itens novos — visão interna (não vai no texto)

| # | Item | Formato exigido | Anonimização | Critério de aceite NOSSO | Trilho quando chegar |
|---|---|---|---|---|---|
| **6** | Contas de encargo pago/recebido e desconto obtido/concedido (F7 §5 itens 1–3) | 4 códigos de conta (ou "mesma conta, sinal trocado") + natureza (receita × redutor) | n/a | Cada código vira conta no chart do tenant e `AccountingScopeSettings.bankCharge{Expense,Income}AccountId` (já existem, #326) + 2 novos para desconto (se resposta (c) = contas próprias → **fork novo** no BRIEF F7 follow-up; se "mesma conta" → confirma, nada muda). Sem resposta, `confirm` com `chargeCents > 0` segue 400 nomeado | **dado** → configuração por tenant (F7 §5); desconto ≠ parcial = **crítica** → emenda `ADR-INCR-PARTIAL-SETTLEMENT` |
| **7** | Regime PIS/COFINS por tenant + posição nas 4 exceções + lista monofásica reconhecida (X6 §4 f5/f8, linha nova ao contador em `BE-INCR-NFE-COST-REGIME-brief.md`) | Por exceção: sim/não + base legal se divergir do default; lista de NCM/grupos monofásicos além das 3 leis | n/a | Cada resposta vira valor de `FiscalProfile.{pisCofinsRegime, pisCofinsCreditExcludesIcms, pisCofinsCreditIncludesIpi, pisCofinsCreditFromSimplesSupplier}` (já existem, #328) — **defaults conservadores continuam** até a resposta; NCM novo = linha em `pisCofinsMonofasicoNcm.ts` **com fonte legal citada** (lição da Lei 10.485: conferir redação **vigente**) | **dado** → configuração; NCM sem lei citável = **fora do pedido** (devolver) |
| **8** | CST PIS/COFINS 02 com NCM fora das listas: há crédito? (ERRATA X6 item 3) | Sim/não + base + alíquota | n/a | "Não" → **confirma** o default `UNKNOWN` (T5, nada muda). "Sim, alíquota da nota" → **crítica** → emenda ao BRIEF X6 item 11 + fork (crédito pela alíquota da nota × padrão) — nunca hotfix | confirmação ou crítica → BRIEF X6 |
| **9** | Linhas `E` do M300A/M350A que o parque usa (BRIEF 3B §4 item 7) | Lista de códigos de linha (ex.: `M300A/1`, `/24`…); ECF de exemplo **só com códigos**, sem valores/CNPJ | Se vier ECF: **sem identificação nem valores** — se vier com, não commitar (CTD-003) | Lista vira `favoritos`/ordenação no catálogo `ecf-l12-linhas.json` (FE-INCR-LALUR PR 2) — **não** filtra o catálogo (as 374 continuam) | **dado** → FE-INCR-LALUR PR 2 (ordenação); código inexistente no catálogo = **fora do pedido** |
| **10** | Reforço dos itens 1/1b (X7) | idem itens 1/1b | n/a | idem itens 1/1b | idem |
| **11** | Revisa **dentro** do sistema (login) ou **por fora** (pacote + achados)? (C11 §5 item 3) | Resposta binária + o que precisa ver | n/a | "Dentro" → F-C11-1 (b) `Role.ACCOUNTANT` exige ADR de auth antes do BRIEF C11 sair do papel; "por fora" → F-C11-1 (a) confirmado. **Decide o fork melhor que a recomendação** | **crítica ou confirmação** → BRIEF C11 §3 F-C11-1 |
| **12** | Composição e formato do pacote ampliado (C6b §5 item 1) | Lista de demonstrativos + formato por item | n/a | Itens já em `DELIVERABLE_EXPORT_KINDS` (BRIEF C6b §4 — ainda não em código) → confirma; item **fora** (ex.: DFC, notas explicativas) → **achado fora de escopo** do C6b, autorização própria; formato PDF → F-CD3 segue "sem PDF" salvo decisão do dono | **dado** → perfil por contato (F-C6b-2 a) |
| **13** | Imobilizado (C8): (a) taxas praticadas × Anexo III/laudo · (b) contas por grupo + acumulada + despesa + ganho/perda · (c) `COD_PB_RFB` da diferença de depreciação · (d) ICMS no custo × CIAP · (e) turnos | (a) tabela grupo→taxa ou "Anexo III"; (b) códigos; (c) código da PARTEB_PADRAO; (d) binário; (e) sim/não | n/a | (a) "Anexo III" → seed basta (BRIEF C8 A3), taxa própria → linha `CUSTOM` com `justification` = a resposta dele; (b) contas viram `FixedAssetClass.{cost,accumulatedDepreciation}AccountId` + `AccountingScopeSettings.{depreciationExpense,disposalGain,disposalLoss}AccountId` (BRIEF C8 A1/A5); (c) lista **fechada** da PARTEB_PADRAO (`ecf-l12-linhas.json`: 1071 · 2210 · 3130) → vira `depreciationParteBAccountId` (BRIEF C8 F24); código fora da lista = **fora do pedido**; sem ele, fechamento com diferença ≠ 0 é 400 nomeado; (d) "CIAP" → **achado fora de escopo** já nomeado no ADR (não reabre F-FA3); (e) "sim" → reabre F-FA2 para (b) — **decisão do dono**, não do agente | **dado** → BRIEF C8 (execução ainda não autorizada); (e) sim = **crítica** → fork |

**O que NÃO estamos pedindo (adições de 2026-09-15):**
- Manual/leiaute da ECD (Bloco 0/K) — baixamos direto do SPED (`scripts/baixar-fontes-oficiais.mjs`); insumo
  ausente do BRIEF C8 §6, não do contador.
- Validação das taxas do Anexo III em si — o Anexo está no corpus (versão compilada `43557`); o que pedimos é
  a **prática dele** (item 13a), não a norma.
- Alíquotas de ICMS por UF e o regime de bebidas (Lei 13.097) — só se o item 7(d) trouxer produto desse grupo.

**Quando a resposta chegar:** me chame com **"triagem do que o contador mandou"** — os itens 6–13 entram na
mesma classificação (dado / crítica / confirmação / fora do pedido) com o trilho da coluna acima.
