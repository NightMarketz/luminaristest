# Cédula de decisão — 2026-09-10 — respostas da entrevista de fechamento

> **O que este doc é:** o registro citável (ORCH-006) das respostas do dono às perguntas 1–23 da
> [entrevista de fechamento](https://claude.ai/code/artifact/a44e9c4e-4ecd-4f96-b667-b164dd3fa955),
> montada para cobrir os 10 nós abertos dos três módulos. **O que não é:** decisão de agente — nenhuma
> opção foi escolhida por agente, e as perguntas sem recomendação escrita seguem abertas (§3).
>
> **Mudança de natureza que esta cédula registra:** as perguntas 1–8 foram formuladas para **o contador
> desta empresa**; o dono as respondeu como **requisito de produto** ("são diferentes empresas que vão
> usar", "temos que cobrir todas as possibilidades"). Isso é coerente com a tese do produto (builder de
> sistemas: módulo incompleto não é comercializável) e **expande o escopo dos nós**, não só o resolve —
> ver §4. O pedido ao contador continua valendo, mas muda de papel: deixa de ser gate de existência do
> trilho e vira **verificação a posteriori** (CTD-002).

## 1. Sinal do dono (literal, sessão de 2026-09-10)

Três sinais na mesma sessão, em ordem:

1. **"ratifico os forks novos do CONTADOR-DELIVERY"** — cobre os dois forks novos do BRIEF #290:
   **Fork Novo A → (a)** (`year` explícito no DTO de entrada) e **Fork Novo B → (c)** (não implementar
   o gate defensivo F-CD8-b). Lido como "com a recomendação escrita em cada um", conforme o precedente
   da cédula de 07/09. **[REGISTRADO AQUI por achado do review de dependência 2026-09-10]** — antes
   desta linha, a única menção citável dessa ratificação era um comentário dentro de
   `AccountingDeliveryDto.ts`, o que deixava autorização de ORCH-006 fora do vault de governança.
2. **As respostas 1 a 23** da entrevista, fechando com *"Segue o recomendado para todas as minhas
   respostas"* (§2).
3. **A ratificação dos 4 forks novos** abertos pelas próprias respostas (§3) — três na recomendação,
   F-BANK-1 contra ela.

## 2. Decisões ratificadas

| # | Pergunta (a quem era) | Resposta do dono | Consequência |
|---|---|---|---|
| 1 | Contador assina escrituração que não conduziu? | **100% automatizado de ponta a ponta; contabilidade é determinística, não há camada interpretativa** | **F-Z0 FECHADO pelo produto, não pelo contador.** O trilho contábil deixa de depender do item 0; a rodada 9 (entrega ao contador) está descondicionada — já era, pelo sinal de hoje mais cedo |
| 2 | Fronteira software × serviço com CRC | **O profissional assina e verifica as etapas automatizadas, podendo editar após a geração** | **Nó NOVO, não existe nos 49:** camada de revisão profissional com edição pós-geração + trilha de quem editou o quê. Abre o fork **F-EDIT-1** (§3) |
| 3 | Dados do declarante e signatários (D8) | **Nada aproximado — tudo com máscara para não deixar erro passar** | Todo campo de identidade (CPF, CNPJ, CRC, código de qualificação J930) valida por máscara/enum do manual, não por `string`. **Atinge código não commitado de hoje** (§5) |
| 4 | Regime e adições/exclusões reais | **Todas as possíveis — são empresas diferentes** | Bloco M/e-Lalur cobre o universo dos Anexos I/II da IN 1.700, não o recorte de uma empresa. Abre **F-COB-1** (§3) |
| 5 | ICMS entra no custo ou é crédito | **Cobrir todas as possibilidades** | O custo D3 vira configuração por tenant (contribuinte/não, ST, monofásico), não uma fórmula fixa. Emenda o `ADR-INCR-NFE §D3` sem depender do contador |
| 6 | Taxas de depreciação aplicáveis | **Preenchível, com documento de apoio para conferir — isso muda muito** | Tabela de taxas **editável por tenant**, semeada do Anexo III da IN 1.700/2017, com link da fonte na tela. Não hardcode |
| 7 | Como retifica na prática | **Preservar o anterior com certeza; cobrir diferentes culturas de empresa** | Retificação **versionada**: o arquivo entregue anteriormente é preservado e permanece consultável. Fecha o escopo da pergunta 28 |
| 8 | O que compõe o pacote ao contador | **Faltam todos esses e mais — temos que ter todos os possíveis** | **F-CD3 REABERTO e ampliado:** balancete, razão, conciliação, amostra e demais demonstrativos entram no pacote, configurável. **[CORREÇÃO 2026-09-10, achado do review de dependência]** a frase original desta linha dizia "o schema não muda; muda o conteúdo" — é **falsa**: `AccountingDeliveryLog` tem DUAS colunas fixas de hash e DOIS FKs de job, com `@@unique([ecdJobId, ecfJobId, contactId])`. Pacote de N documentos exige **tabela filha + migração**, não só conteúdo |
| 9 | Um adaptador para NFS-e e NF-e? | **Adaptador diferente para cada tipo de nota — são muitas diferenças** | `EmissorPort` com **uma implementação por modelo** (NFS-e, NF-e 55, e os demais quando entrarem), não um adaptador polimórfico |
| 10 | Onde vive o certificado A1 | **No meu ambiente** | **Responde o R4:** custódia local, uma instância por cliente, coerente com o BYOK da chave de IA |
| 11 | Homologação | **Ambiente separado do servidor real** | Emissão de teste nunca compartilha processo com produção |
| 12 | Formato do retorno do emissor | **Qualquer formato — cobrir todos** | O parser de retorno aceita XML, JSON e PDF; o que persiste é `SourceDocument` |
| 13 | Eventos suportados | **Todos, de acordo com os prazos da Receita** | Cancelamento, substituição e carta de correção com o prazo legal validado no comando |
| 14 | SLA e queda do ambiente | **Só mensagem de fallback "ambiente fora do ar"** | **Simplificação explícita:** sem fila de retentativa, sem outbox. Coerente com o não-objetivo T11 |
| 15 | IBS/CBS | **O adaptador já nasce com os campos** | `cClassTrib` e campos da reforma desde a primeira versão |
| 16 | Multi-tenant no emissor | **Uma conta por CNPJ** | Provisionamento do M2 cria a conta junto com a instância |
| 17 | Qual leiaute bancário vale | **Temos que extrair informações de qualquer documento** | **Ambíguo — abre F-BANK-1 (§3).** Duas leituras com custo muito diferente |
| 18 | Convênio e arquivo real de fixture | **Concordo** | Segue como dado externo D6 — o único item do banco que ninguém substitui |
| 19 | Homologação do arquivo bancário | **Ambiente de teste para os arquivos antes** | Gera e valida sem transmitir |
| 20 | Retorno bancário dá baixa? | **Contas a pagar e a receber NÃO têm baixa automática** | **Restringe a rodada 16:** o retorno nunca liquida sozinho. Abre **F-BAIXA-1** (§3) |
| 21 | Pix na mesma via? | **API separada para Pix** | Remessa e Pix são dois nós, não um |
| 22 | Encargos (multa/juros) | **O valor do encargo chega pelo retorno** | O encargo não nasce no razão; entra quando o banco informa |
| 23 | Forks abertos do dono | **"Segue o recomendado"** | **F-PS8 → (a)**, **F-PS9 → (a)**, **F-PS10 → (b)** rota-irmã; **2 `reasonCode` novos → (a)**. Abre a rodada 8 (baixa parcial) para `sessao-feature` |

## 3. O que este sinal NÃO cobre

**Perguntas sem recomendação escrita** — não foram respondidas por "segue o recomendado", porque não
havia recomendação a seguir:

1. **Pergunta 25 — fork T0 do P2** (perímetro do zero-diff). Aberto desde 07/09.
2. **Pergunta 26 — forks 2/3/4 da ECF Fase 3.** O manual do leiaute 12 agora está localizado; os forks
   voltam ao dono na leitura do BRIEF emendado.
3. **Pergunta 29 — ordem de execução** (manter contábil → financeiro → fiscal, ou puxar a emissão pelo
   prazo de 01/10). Vale a ordem F-M6 até sinal em contrário.
4. **Pergunta 30 — contratar o Integra Contador do Serpro** (é o que dá acesso às APIs do MIT).

**Contradição ABERTA entre esta cédula e um ADR já Accepted** (achado do review de dependência
2026-09-10, não decidida aqui): a resposta 16 diz **"uma conta por CNPJ"**, e o `ADR-INCR-DFE`
ratificou **F-DFE-2 → (a)**, cuja justificativa escrita é *"1 chave para N unidades… os parceiros
aceitam N CNPJs por conta"*. A resposta nova derruba a premissa que sustentou aquela escolha **e** o
critério de seleção do parceiro (D5). Precisa de emenda do ADR ou de reversão da resposta — decisão do
dono, não do agente.

**Forks NOVOS abertos pelas próprias respostas — RATIFICADOS na mesma sessão** (segundo sinal do dono,
2026-09-10, logo após a leitura desta cédula). Três seguiram a recomendação; **F-BANK-1 foi ratificado
CONTRA ela**, e o registro precisa dizer isso:

- **F-EDIT-1 — o que o profissional edita (resposta 2 × resposta 1).** (a) edita o **dado** e o sistema
  regera o arquivo — preserva a determinística da resposta 1; (b) edita o **arquivo gerado** — quebra a
  determinística e a cadeia de hash do manifesto; (c) edita por **lançamento de acerto** e regera.
  **Recomendação do par: (a) + (c)** — nunca (b). ✅ **RATIFICADO (a)+(c)**: edita o dado ou lança o
  acerto, e o sistema regera; o arquivo gerado nunca é editado à mão. A determinística da resposta 1
  sobrevive.
- **F-COB-1 — como "todas as possibilidades" é implementado (respostas 4, 5, 8).** (a) código por caso,
  bloco a bloco; (b) **tabela de configuração dirigida por dado** (o universo vira linha de catálogo,
  não `if`). **Recomendação: (b)** — "todas as adições e exclusões" é tabela; virar código faz o
  incremento crescer sem fim e sem gate. ✅ **RATIFICADO (b)**: "universo de adições/exclusões é
  catálogo, não `if`".
- **F-BANK-1 — o que "extrair de qualquer documento" quer dizer (resposta 17).** (a) suportar **N
  leiautes bancários** por configuração (CNAB 240 padrão + divergência por banco); (b) **extração
  genérica de documento arbitrário** (IA/parser adaptativo sobre PDF do manual do banco). São ordens de
  grandeza diferentes de custo e de risco. **Recomendação: (a)** agora, (b) como frente própria.
  ⚠️ **RATIFICADO (b) — CONTRA a recomendação**: extração genérica de documento arbitrário por IA.
  Consequências que o registro precisa carregar: (i) vira **frente de plataforma com ADR próprio**, não
  um detalhe da remessa; (ii) a remessa financeira passa a **depender** dela; (iii) é a primeira peça do
  módulo cujo acerto é **estatístico, não determinístico** — o que colide de frente com a resposta 1
  ("contabilidade é determinística, sem camada interpretativa") se o resultado da extração entrar no
  razão sem conferência humana. O ADR tem de fixar onde fica essa fronteira (sugestão do par: extração
  propõe, humano confirma, razão só aceita o confirmado).
- **F-BAIXA-1 — o que o retorno bancário faz, então (respostas 20 × 22).** Se não há baixa automática
  mas o encargo chega pelo retorno: (a) o retorno cria **item de conciliação pendente** que o humano
  confirma (reusa a tabela de pendências da rodada 3); (b) o retorno só registra o encargo e nada mais.
  **Recomendação: (a)**. ✅ **RATIFICADO (a)** — "retorno vira item de conciliação pendente para
  confirmar (reusa a tabela da rodada 3)".

  **[CORREÇÃO 2026-09-10 — o review de dependência mediu isto no código e a nota original subestimava.]**
  A primeira versão desta linha dizia que bastava "o `reasonCode` distinguir a origem". Não basta. O
  que o reuso da tabela realmente arrasta, verificado em disco:
  1. **O comando de resolução re-executa o job errado.** `ReconcilePendingService.rescan` manda cada
     item não resolvido para `retryOneReconcilePendingItem` (`accountingSyncReconcile.job.ts`), que
     re-roda `book/sync/reverse` sobre `(sourceType, sourceId)` de **venda/CRM**. Um item de origem
     bancária não se resolve re-rodando o reconcile de venda.
  2. **Não existe semântica de "confirmação humana" na tabela** — só `rescan`. F-BAIXA-1 pede
     exatamente isso, e é comportamento novo, não configuração.
  3. **A chave e o vocabulário são do produtor único:** `@@unique([userId, unitId, sourceType, sourceId])`
     e o enum de `sourceType` enumeram eventos de venda/CRM.
  4. **A policy muda de natureza:** `canManageReconcilePending` passaria a autorizar efeito financeiro.

  Consequência: o BRIEF do nó precisa decidir **reusar a tabela com essas quatro emendas** ou **criar
  tabela irmã** — e essa é decisão de desenho, não detalhe de implementação.

**Gates humanos e dado externo seguem intactos:** B-4, X2, H1, H2, H3, M2, XML real (D2), convênio do
banco (D6), parceiro emissor + certificado (D5).

## 4. Efeito no tamanho da fila

**Re-baseline FEITO em 2026-09-10** e gravado no §7.1 do master map, com a regra de contagem declarada
(1 nó = 1 ciclo SDD; nó que só cresce não vira nó novo; capacidade de plataforma fica fora da régua dos
três módulos; o numerador não muda por re-baseline).

| Módulo | Antes | Depois | Nós novos |
|---|---|---|---|
| Contábil | 16/19 (84%) | **16/22 (73%)** | revisão profissional editável · pacote ampliado · máscaras de identidade do SPED |
| Financeiro | 15/17 (88%) | **15/19 (79%)** | Pix como frente própria · retorno → conciliação pendente |
| Fiscal | 7/13 (54%) | **7/16 (44%)** | adaptador por tipo de documento · eventos com prazo legal · catálogo de adições/exclusões |
| **Total** | 38/49 (78%) | **38/57 (67%)** | **+8** |

**Fora da régua:** a extração genérica por IA (F-BANK-1 → b) é frente de plataforma e **não recebe
número de nó até ter ADR** — inventar denominador para frente sem spec é o que a regra 1 proíbe.

**A leitura honesta do percentual:** nenhuma linha de código foi perdida e o numerador não mudou. 78% e
67% medem alvos diferentes; a frase correta é "38 nós fechados, de 49 que o plano previa em 08/09 e de
57 que ele prevê em 10/09".

## 5. Consequência imediata sobre código não commitado

✅ **FEITO em 2026-09-10, na mesma branch, antes do review.** O `crc` era
`z.string().trim().min(1).max(20)` com um comentário dizendo que o formato "não tem fonte citável".
A resposta 3 derrubou essa premissa, e a fonte foi obtida: **Manual de Orientação do Leiaute 9 da ECD**
(Anexo ao ADE Cofis nº 01/2026), **registro J930, campos 06/09/10/11** — baixado de
<http://sped.rfb.gov.br/arquivo/show/7990> e lido nas páginas 199-205.

O campo virou **quatro**, espelhando o que o J930 exige do signatário `COD_ASSIN = 900`:

| J930 | Campo | Validação implementada | Fonte da regra |
|---|---|---|---|
| 06 `IND_CRC` | `crcNumber` | normalizado (caixa alta/trim), **sem máscara** | o manual **não declara formato** — inventar uma rejeitaria inscrição legítima em silêncio |
| 09 `UF_CRC` | `crcUf` | enum das 27 UFs | `REGRA_TABELA_UF` |
| 10 `NUM_SEQ_CRC` | `crcCertificate` | máscara `UF/AAAA/NÚMERO` + UF na tabela (o piso de ano da 1ª versão era regra inventada — removido no fix 9a113cec, review F9) | `REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC` |
| 11 `DT_CRC` | `crcCertificateValidUntil` | date-only real (`isValidDateOnly`) | campo N(008) do manual |

Gates re-rodados depois da mudança: `tsc` limpo · **2.423 testes unit** · **558 de integração** ·
snapshot de shape dos DTOs regenerado · `docs:generate` (156 paths / 185 operações, inalterado). A
migração foi **emendada no lugar** em vez de ganhar uma segunda — ela nunca rodou fora de banco de
teste, e `prisma migrate diff` continua "No difference detected".

**Fica aberto, fora desta branch:** o código de qualificação do signatário (`IDENT_QUALIF`/`COD_ASSIN`)
na geração do SPED continua `string` livre; virar enum do manual é o nó "endurecimento dos campos de
identidade" contado no re-baseline (§4).
