# Mapa do que não está mapeado: contabilidade e financeiro (10/10/2026)

**Pedido do dono (chat, 10/10):** "mapeia o que tem em contabilidade que não está mapeado ainda no app" e "mapeia o que tem em financeiro que não está mapeado ainda no app".
**Base:** `origin/main` 845d79ce + os documentos de hoje ainda não commitados (BRIEF ADN, emenda NFC-e, BRIEF da tela de cobrança, PRE-ADR folha/eSocial/Reinf, PRE-ADR ICMS/IPI). Documento de leitura, sem decisão e sem nó novo.

**Em duas linhas:** o núcleo contábil e financeiro está construído. O que falta está no entorno operacional do dia a dia do salão e do Simples em SP: agenda de vencimentos, caixa do balcão, maquininha, comissões e repasse do profissional. Nada disso tem nó.
**Risco principal:** 83 das 265 rotas contábeis, fiscais e financeiras não têm tela. Então "não mapeado no app" tem duas camadas: o que não existe em lugar nenhum, e o que já existe no backend mas o usuário não alcança.

## Os três mapas

| Arquivo | Pergunta | Resultado |
|---|---|---|
| [dominio-contabil.md](dominio-contabil.md) | O que um sistema contábil completo cobre e o Luminaris não tem nem no código nem no plano? | 115 itens: 41 em código · 20 no plano · 4 lacunas registradas sem nó · 7 só no destino · **39 não mapeados** (4 não se aplicam ao público) · 4 rejeitados |
| [dominio-financeiro.md](dominio-financeiro.md) | Mesma pergunta para financeiro, tesouraria e gestão | 95 itens: 40 em código · 8 no plano · 4 citados em ADR sem nó · 10 só no destino · **31 não mapeados** · 2 rejeitados |
| [backend-sem-tela.md](backend-sem-tela.md) | O que já existe no backend e nenhuma tela chama? | 265 rotas: 175 com tela · 5 só no service do FE · **83 sem tela** · 2 webhooks · 0 chamadas órfãs do FE |

Classes usadas: **CÓDIGO**, **PLANO** (nó, gate, diferido, ADR, PRE-ADR ou BRIEF), **citado sem nó** (aparece num ADR ou PRE-ADR como "fora do MVP" ou "não planejado", sem nó nem autorização; na prática é lacuna), **SÓ DESTINO** (só no catálogo de `docs/plano/destino/`), **REJEITADO**, **NÃO MAPEADO**.

## Lacunas que pesam para o 1º cliente (Simples, SP capital, salão/clínica)

### Contabilidade e obrigações
| Item | Classe | Por que pesa |
|---|---|---|
| **Agenda de vencimentos e prazos de entrega, com alerta** (DAS dia 20, NFTS dia 5, DEFIS, DMED) | NÃO MAPEADO | `obrigacoesPorRegime.ts` diz *quais* obrigações valem, mas não *quando* vencem. É a lacuna mais cara do lado contábil. |
| **DMED** (só clínica com profissional de saúde) | NÃO MAPEADO | Obrigação da PJ prestadora de serviço de saúde. Não achei dispensa para o Simples; fonte secundária, IN vigente não conferida. |
| **Distribuição de lucros** (registro, limite isento, IRRF da Lei 15.270/2025) | citado sem nó | `PRE-ADR-SIMPLES-NACIONAL-CALCULO.md:554` diz "Não planejado". |
| NFTS de SP (nota do tomador de serviço de fora do município) e retenção de ISS como tomador | NÃO MAPEADO | Manual NFTS v3.1/2026: devida mesmo sem retenção. |
| Capital social no plano-semente | NÃO MAPEADO | O PL do fixture é só 2.3 / 2.3.1 Lucros Acumulados (`ChartOfAccountsFixture.ts:56-57`). |
| Baixa do tributo apurado como título a pagar; guias com código de barras | NÃO MAPEADO | Apuração existe; o pagamento não fecha o ciclo (inferido: os serviços de apuração não referenciam `Payable`). |
| Lançamento recorrente/modelo, PDD, despesa antecipada, composição de saldo de conta, DLPA, DMPL, notas explicativas | NÃO MAPEADO / citado sem nó | Rotina mensal de escritório. |
| CND/CPEN, caixa postal e-CAC/DTE, parcelamentos | NÃO MAPEADO | Dependem de RFB/PGFN; o canal natural (Integra Contador/Serpro) está adiado pela R5. |

### Financeiro
| Item | Classe | Por que pesa |
|---|---|---|
| **Caixa do balcão** (abertura, fechamento, sangria, suprimento, conferência diária) | SÓ DESTINO | Só existe a conta 1.1.3 Caixa. É a lacuna mais cara do lado financeiro. |
| **Conciliação da maquininha** (baixa do recebível de cartão, taxa MDR, D+30) | citado sem nó | O "Incremento F" do ADR-D01 nunca virou nó. A 1.1.4 acumula o bruto sem baixa (`card.payout` = 0 no código e no vault). |
| **Extrato do profissional** (comissões, repasses, saldo) e **regras de comissão sobre o líquido** | NÃO MAPEADO | A comissão é gerada na venda, mas sem efeito financeiro. |
| **Parcelamento** de compra (N títulos a pagar) e de venda (N títulos a receber) | NÃO MAPEADO | |
| Recorrência no AP e no AR | citado sem nó | `ADR-INCR-AP`/`ADR-INCR-AR` F3. |
| Régua de cobrança (e-mail/WhatsApp) | SÓ DESTINO | O server não tem SMTP. |
| Sinal de agendamento, gorjeta, vale-presente, crédito do cliente, cashback | NÃO MAPEADO | Próprios do salão. |
| Cobrança por cartão/link, antecipação de recebíveis, split comercial na adquirente | NÃO MAPEADO | Dependem de provedor ou adquirente. |
| Rateio por centro de custo no título a pagar, empréstimos SAC/Price, fatura do cartão corporativo, vale ao profissional | NÃO MAPEADO | |

### Backend pronto sem tela (o usuário não alcança)
| Grupo | Rotas | BRIEF de FE |
|---|---|---|
| Apuração IRPJ/CSLL e PIS/Cofins, MIT, Simples (apuração, histórico, segregação, parcerias, DAS) | 19 | `FE-INCR-TAX-ASSESSMENT` (#585), **nunca executado** |
| Cobrança Mercado Pago | 12 | `FE-INCR-PAYMENT-PROVIDER` (hoje, sem commit) |
| Ativação do binding | 4 | `FE-INCR-BINDING-ACTIVATION` + `-screen`; LAC-B bloqueado pelo KIT-SETOR |
| Simples: alíquotas, DASN-SIMEI, DEFIS | 5 | **sem BRIEF** (o #585 não cita) |
| Perfil fiscal da empresa por ano, obrigações, ECF transmitida, signatários | 11 | **sem BRIEF** |
| Benefício municipal de ISS | 5 | **sem BRIEF** |
| Destinação de produto · pendências do reconcile · reconciliação AP/AR × razão · anexo/documento-fonte (escrita) · dispensa da ECF retificadora · tie-out avulso · autoria referencial | 18 | **sem BRIEF** |
| CLIs que o usuário final precisaria pela tela: instalar kit/ativar binding, `accounting:reconcile` | — | instalar kit não tem rota; o reconcile tem rota sem tela |

## Riscos registrados pelos mapas
- **KPIs de gestão leem a DynamicTable, não o razão** (inferido pela leitura dos templates): fluxo, margem e prazo médio vêm de `sales`/`expenses`; despesa lançada só no contas a pagar não aparece no KPI.
- **Contas a pagar com retenção registra o bruto como líquido** (achado do PRE-ADR folha): pode deixar o saldo de fornecedores errado.
- **Nota F5 do vault desatualizada:** diz que o #609 está sem merge; o `git log` de main tem #609, #615, #621 e #623. Pede fold.
- **Texto do PRE-ADR do Simples desatualizado:** diz que o livro-caixa não está na matriz, mas `obrigacoesPorRegime.ts:21` tem `LIVRO_CAIXA`.

## Grau e limites
- **Verificado:** cada classe cita arquivo ou grep; a contagem das tabelas foi feita por script; as rotas foram cruzadas entre `routes/index.ts`, `public/openapi.json` (265 × 260: as 5 que faltam no openapi são falha de documentação) e os services do FE.
- **Inferido:** "com tela" quer dizer que um componente montado chama a rota, não que o fluxo foi testado no navegador. A relevância para o 1º cliente é julgamento.
- **Assumido:** os checklists de referência de mercado vêm de conhecimento geral sobre Domínio, Alterdata, Fortes, Questor, Protheus, Conta Azul, Omie, Nibo, Bling, Granatum, Odoo e ERPNext; nenhum site de fornecedor foi aberto.
- **Casos adversariais:**
  - "Provisão de férias/13º" saiu como não mapeado porque a regex acentuada falhou em silêncio no Windows; refeita em UTF-8, achou o PRE-ADR de folha e o item virou PLANO.
  - "Comissão", "despesa por categoria" e "metas" pareciam lacunas, mas vivem na DynamicTable/presets.
  - `GET /reports/tie-out` parecia consumida, mas o painel usa o `tieOut` embutido no aging.
- **Não exaustivo:** os não mapeados dependem de busca por termo (2 a 6 sinônimos por item). A lista é forte, não completa.

## Próximo passo
Nenhum item daqui vira nó sem autorização citável do dono (ORCH-006). Pela regra do vault, item que só existe no destino vira nó depois de PRE-ADR ratificado.
