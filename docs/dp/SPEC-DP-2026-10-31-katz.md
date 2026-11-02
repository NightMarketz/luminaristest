# Luminaris DP — Especificação Técnica do Módulo (insumo externo)

> **Insumo externo, NÃO ratificado.** Autor: @Katz. Data do documento: 31/10/2026. Recebido pelo dono e colado no
> chat em 02/11/2026. Transcrito aqui na íntegra para que as sessões seguintes do módulo DP o leiam pelo repositório.
>
> **Este texto não é decisão do projeto.** As decisões do DP estão em
> [`docs/adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md`](../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md), que adapta esta spec às
> decisões já fechadas do Luminaris (SQLite, `AccountingScope`, sem outbox, centavos, BYOK…). Onde os dois divergem,
> vale o PRE-ADR. As "decisões fixadas" da seção 1 abaixo são as do autor da spec, não as do dono.
>
> **Forma da transcrição:** o texto foi colado como texto corrido. As tabelas foram reconstituídas em Markdown a partir
> das linhas coladas, sem mudar palavra. Os blocos de código estão como vieram. Três figuras citadas no texto (o fluxo
> da competência no núcleo, a árvore de decisão por exceção e o fluxograma da competência) **não vieram** no texto
> colado; o lugar de cada uma está marcado.

---

Luminaris DP — Especificação Técnica do Módulo
31 de out. de 2026 · @Katz

Esta especificação define como construir o Departamento Pessoal do Luminaris como um contexto isolado: um núcleo obrigatório que cobre o mínimo legal de qualquer empregador, e submódulos que cada empresa ativa conforme a necessidade. O objetivo de produto é substituir o escritório contábil: o sistema executa todo o trabalho e o contador revisa as exceções e assina.

Para o agente que vai implementar: leia as seções 1 a 4 antes de qualquer código. Siga a ordem da seção 11. Toda regra legal citada aqui é premissa a validar com o contador responsável; quando uma regra não estiver clara, pare e registre a dúvida na seção 12 em vez de inventar.

## 1. Decisões fixadas

Estas decisões não estão em aberto; mudar qualquer uma exige um registro de decisão (ADR) novo e aprovação explícita do Raphael.

| # | Decisão | Consequência para a implementação |
|---|---|---|
| D1 | DP é um contexto isolado dentro do monorepo do Luminaris | Pacotes próprios, schema próprio no banco, comunicação com outros módulos só por contratos e eventos |
| D2 | Cliente = qualquer empresa; o produto substitui o escritório contábil | Hierarquia tenant → empresa (CNPJ/CPF/CAEPF) → estabelecimento; um tenant pode ter várias empresas (grupo) |
| D3 | O contador só revisa exceções e assina | Todo processo termina em fila de exceções + assinatura digital; nada vai ao governo sem assinatura registrada |
| D4 | TypeScript, Clean Architecture, portas e adaptadores, DI manual por factories | Domínio puro sem dependências de framework; adaptadores trocáveis |
| D5 | Postgres com isolamento por tenant via RLS | Toda tabela de negócio tem tenant_id e empresa_id; políticas RLS obrigatórias, testadas |
| D6 | Outbox transacional para todo efeito externo | Nenhuma chamada a governo, banco ou outro módulo dentro da transação de domínio |
| D7 | eSocial próprio (sem intermediário) | Geração de XML, assinatura XMLDSig com certificado ICP-Brasil, transmissão SOAP com TLS mútuo e leitura de retornos são código nosso |
| D8 | Cálculo determinístico | Decimal com escala fixa (proibido number para dinheiro), funções puras, data de corte como parâmetro, resultado reproduzível |
| D9 | Vigência bitemporal em todo dado que afeta cálculo | Cada versão tem valido_de/valido_ate (quando vale) e registrado_em (quando o sistema soube) |
| D10 | Núcleo obrigatório + submódulos opcionais ativados por empresa | Submódulo desligado é substituído por adaptador nulo; o núcleo nunca importa código de submódulo opcional |

## 2. Mapa de submódulos

O núcleo cobre o que todo empregador CLT é obrigado a fazer — cadastrar, calcular, transmitir, recolher, contabilizar e fechar com assinatura. Tudo o mais é opcional e se pluga por portas e eventos.

No núcleo, o fluxo de uma competência vai de cadastros ao motor, ao fechamento (onde o contador assina) e ao eSocial; os retornos do governo voltam ao fechamento para conciliação.

> _[Figura do fluxo da competência no núcleo — não veio no texto colado.]_

| Submódulo | Pacote | Obrigatório | Requer | Usa se ativo | Entrega |
|---|---|---|---|---|---|
| Fundação | kernel, legal-tables | Sim | — | — | Tipos puros, registro de módulos, tabelas legais com vigência |
| Cadastros | core | Sim | fundação | — | Empresa, lotação, CCT, rubricas, trabalhador, vínculo, afastamentos, férias (períodos) |
| Motor de folha | payroll | Sim | core | timekeeping, benefits, performance, special-categories | Folha mensal, adiantamento, férias, 13º, rescisão, complementar, retroativo, consignado, pensão |
| eSocial | esocial | Sim | core, payroll | ohs, onboarding | Eventos de tabela, não periódicos e periódicos; assinatura; transmissão; retornos |
| Guias e retornos | gov-guides | Sim | esocial | payments | Conciliação S-5001/5002/5003, DCTFWeb, FGTS Digital |
| Fechamento | closing | Sim | payroll, esocial, gov-guides | todos | Verificações, exceções, painel do contador, assinatura, reabertura |
| Ponte contábil | accounting-bridge | Sim | payroll, closing | — | Lançamentos, provisões e rateio para o contábil do Luminaris |
| Ponto e jornada | timekeeping | Opcional* | core | self-service | REP-P, tratamento, banco de horas, AFD/AEJ |
| Pagamentos | payments | Opcional | payroll, closing | — | CNAB, Pix em lote, retorno bancário |
| Benefícios | benefits | Opcional | core | self-service | VT, VR/VA, saúde, fornecedores, faturas |
| Admissão digital | onboarding | Opcional | core | documents, ohs | Coleta de dados, OCR, contrato assinado |
| App do colaborador | self-service | Opcional | core, closing | timekeeping, benefits, performance | API do app: holerite, férias, ponto, pedidos |
| Desempenho | performance | Opcional | core, payroll | timekeeping | Fatos, contratos de desempenho, prova, simulação |
| SST | ohs | Opcional* | core, esocial | documents | ASO, CAT, agentes nocivos, S-2210/2220/2240 |
| Documentos e GED | documents | Opcional | core | — | Pasta digital, modelos, assinatura eletrônica, temporalidade |
| Outras categorias | special-categories | Opcional | payroll | — | Intermitente, doméstico, rural, avulso, cooperado |
| Indicadores e BI | analytics | Opcional | closing | todos | Relatórios gerenciais, exportação para BI |

\* Opcional comercialmente, mas exigido por fato: o gate de obrigação legal (seção 3) bloqueia o fechamento se a empresa precisar do módulo e ele estiver desligado.

## 3. Mecanismo de seleção de submódulos

Cada submódulo se descreve por um manifesto estático; o núcleo lê os manifestos, resolve dependências e liga ou desliga capacidades por empresa. Ativar um submódulo nunca exige deploy.

```ts
// packages/dp-kernel/src/module/manifest.ts
export interface DpModuleManifest {
  id: DpModuleId;                    // 'dp.ponto', 'dp.beneficios', ...
  version: string;                   // semver do contrato público
  requires: DpModuleId[];            // dependências obrigatórias (núcleo implícito)
  enhances?: DpModuleId[];           // usa se ativo, funciona sem
  provides: PortBinding[];           // portas do núcleo que este módulo implementa
  subscribes: DomainEventType[];     // eventos que consome
  publishes: DomainEventType[];      // eventos que emite
  migrations: string;                // pasta de migrations do schema próprio
  permissions: PermissionDef[];      // permissões novas no RBAC
  esocialEvents?: EsocialEventType[];// eventos que passa a gerar (ex.: S-2240)
  rubricasSeed?: string;             // rubricas padrão que instala
  uiRoutes?: UiRouteDef[];           // telas que o builder do Luminaris expõe
}
```

**Regras do mecanismo**

1. Ativação por empresa, registrada com vigência (dp_modulo_ativacao: empresa, módulo, valido_de). Desativar não apaga dados; congela o módulo a partir da data.
2. Resolução de dependências no momento da ativação: falta um requires → ativação recusada com a lista do que falta. Ciclo de dependências → erro de build (checado em CI).
3. Adaptador nulo para cada porta opcional. O núcleo depende de portas, nunca de módulos. Exemplo: JornadaApuradaPort — com dp.ponto ativo, vem do tratamento de ponto; desligado, o adaptador nulo lê lançamentos manuais (horas extras e faltas digitadas).
4. Gate de obrigação legal. Alguns módulos não podem ficar desligados quando um fato existe: há empregado exposto a agente nocivo → dp.sst passa a ser exigido; empresa com mais de 20 empregados por estabelecimento → controle de jornada exigido (premissa a validar). O núcleo cria uma pendência bloqueante no fechamento, não liga o módulo sozinho.
5. Registro em tempo de execução: DpModuleRegistry monta, por empresa e competência, o conjunto de bindings (porta → implementação). O cálculo de uma competência antiga usa os módulos que estavam ativos naquela data.
6. Cobrança lê dp_modulo_ativacao — o plano comercial é derivado, não duplicado.

## 4. Estrutura do monorepo e regras de dependência

Um pacote por submódulo, todos com a mesma anatomia hexagonal. As regras de importação são verificadas em CI (dependency-cruiser ou equivalente); violação quebra o build.

```
packages/dp/
  kernel/            # tipos puros: Money(decimal), Competencia, Vigencia, IDs, Result, manifest, registry
  legal-tables/      # dados versionados: INSS, IRRF + redutor, salário mínimo, FGTS, feriados, tabelas eSocial
  core/              # empresa, estabelecimento, lotação, sindicato/CCT, cargo, rubrica, trabalhador, vínculo
  payroll/           # motor de cálculo + folhas (mensal, adiantamento, 13º, férias, rescisão, complementar)
  esocial/           # geração XML, validação XSD, assinatura, transmissão, retornos, máquina de estados
  gov-guides/        # DCTFWeb, FGTS Digital, conciliação de retornos S-5001/5002/5003
  closing/           # fechamento, auditoria automática, fila de exceções, sign-off do contador
  accounting-bridge/ # lançamentos contábeis e provisões para o módulo contábil do Luminaris
  payments/          # opcional: CNAB, Pix em lote, retorno bancário
  timekeeping/       # opcional: REP-P, tratamento de ponto, AFD/AEJ, banco de horas
  benefits/          # opcional: VT, VR/VA, saúde, fornecedores
  onboarding/        # opcional: admissão digital, OCR, assinatura de contrato
  ohs/               # opcional: SST — ASO, CAT, agentes nocivos (S-2210/2220/2240)
  performance/       # opcional: camada de desempenho determinístico
  self-service/      # opcional: API do app do colaborador e do gestor
  documents/         # opcional: GED, modelos, assinatura eletrônica, temporalidade
  special-categories/# opcional: intermitente, doméstico, rural, avulso, cooperado
  analytics/         # opcional: indicadores e exportação para BI
  testkit/           # cenários golden, builders de fixtures, oráculos de cálculo
```

**Anatomia de cada pacote**

```
<pacote>/
  manifest.ts
  domain/        # entidades, value objects, regras puras — sem I/O, sem data atual, sem framework
  application/   # casos de uso; orquestra domínio + portas; abre e fecha transação
  ports/         # interfaces que o pacote exige (out) e expõe (in)
  adapters/      # Postgres, HTTP, SOAP, filas, KMS — implementações das portas
  contracts/     # tipos públicos e eventos que outros pacotes podem importar
  index.ts       # exporta só contracts + factory de composição
```

**Regras de dependência (verificadas no CI)**

1. domain/ não importa nada fora de kernel e do próprio domain/.
2. Um pacote só importa de outro pacote o que estiver em contracts/.
3. core, payroll, esocial, gov-guides, closing e accounting-bridge formam o núcleo e nunca importam pacotes opcionais.
4. Pacotes opcionais podem importar contracts do núcleo e de outros opcionais declarados em requires.
5. Nenhum pacote lê tabela de schema alheio; dados de outro módulo chegam por porta ou evento.
6. legal-tables é só dado + leitores; mudança de tabela legal é migration de dados com vigência, nunca código.

## 5. Modelo de dados

Um schema Postgres por pacote (dp_core, dp_payroll, dp_esocial...). Três padrões valem para todas as tabelas de negócio: isolamento por tenant, vigência bitemporal e imutabilidade do que já foi calculado ou transmitido.

Padrão bitemporal — toda entidade que afeta cálculo é separada em identidade + versões:

```sql
create table dp_core.vinculo (
  id uuid primary key,
  tenant_id uuid not null,
  empresa_id uuid not null,
  trabalhador_id uuid not null,
  matricula text not null,
  categoria_esocial smallint not null,     -- 101 empregado geral, 103 aprendiz, 901 estagiário...
  data_admissao date not null,
  unique (empresa_id, matricula)
);

create table dp_core.vinculo_versao (
  id uuid primary key,
  tenant_id uuid not null,
  vinculo_id uuid not null references dp_core.vinculo(id),
  valido_de date not null,
  valido_ate date,                          -- null = vigente
  registrado_em timestamptz not null default now(),
  substituida_em timestamptz,               -- correção de dado já registrado
  cargo_id uuid not null, cbo char(6) not null,
  salario numeric(14,2) not null, tipo_salario text not null,  -- mensal | horista | diarista | tarefa
  jornada_id uuid not null, estabelecimento_id uuid not null,
  lotacao_id uuid not null, sindicato_id uuid, centro_custo_id uuid,
  origem_evento_id uuid                     -- fato que gerou a versão (admissão, alteração, dissídio)
);
-- leitura "como era em D, segundo o que sabíamos em T":
-- valido_de <= D and (valido_ate is null or valido_ate >= D)
-- and registrado_em <= T and (substituida_em is null or substituida_em > T)
```

Isolamento (RLS) — em toda tabela de negócio:

```sql
alter table dp_core.vinculo enable row level security;
create policy tenant_isolation on dp_core.vinculo
  using (tenant_id = current_setting('app.tenant_id')::uuid
         and empresa_id = any (current_setting('app.empresas_permitidas')::uuid[]));
```

O adaptador de repositório define app.tenant_id e app.empresas_permitidas por transação. Teste obrigatório: consulta sem contexto retorna zero linhas.

**Entidades principais por schema**

| Schema | Tabelas | Observação |
|---|---|---|
| dp_core | empresa, estabelecimento, lotacao, sindicato, cct_regra, cargo, jornada, rubrica + rubrica_versao, trabalhador, dependente, vinculo + vinculo_versao, afastamento, ferias_periodo, dp_modulo_ativacao | Cadastros com vigência |
| dp_legal | tabela_legal (tipo, vigência, payload JSON validado por schema), feriado | Somente leitura para o app; carga por migration |
| dp_payroll | lancamento (fato de entrada), execucao_calculo, resultado_linha, prova_calculo, folha (tipo, competência, estado) | resultado_linha e prova_calculo são imutáveis |
| dp_esocial | evento, evento_versao_xml, lote, retorno, recibo, certificado_ref | XML enviado é guardado byte a byte com hash |
| dp_guides | apuracao_dctfweb, guia_fgts, conciliacao, divergencia | Ligadas aos retornos do eSocial |
| dp_closing | competencia_fechamento, verificacao, excecao, aprovacao, assinatura | Trilha completa do sign-off |
| dp_outbox | outbox, inbox (idempotência de consumo) | Um por schema ou um compartilhado do Luminaris |

**Regras de dados**

- Dinheiro em numeric(14,2); quantidades e taxas em numeric(18,6); arredondamento só no ponto declarado pela regra.
- Nada calculado ou transmitido é atualizado: correção = nova versão, novo cálculo, evento de retificação.
- Toda tabela tem tenant_id; tabelas de fatos têm também competencia (date, primeiro dia do mês) e índice por (empresa_id, competencia).
- Particionamento de resultado_linha e prova_calculo por competência quando o volume justificar (previsto, não necessário no MVP).

## 6. Motor de cálculo (payroll)

Um único motor calcula todos os tipos de folha; o que muda entre mensal, férias, 13º e rescisão é o roteiro (conjunto de rubricas e regras ativadas). O motor é uma função pura: calcular(snapshot) → resultado + prova.

**Pipeline de uma execução**

1. Snapshot — carrega, para (empresa, competência, roteiro, data de corte): versões de vínculo, rubricas, tabelas legais, CCT, lançamentos, afastamentos, férias, módulos ativos. Tudo lido "como era na competência, segundo o que se sabia na data de corte". O snapshot é serializado e recebe hash.
2. Fatiamento — se algo mudou no meio do período (salário, jornada, afastamento), a competência vira fatias com dias e valores proporcionais.
3. Grafo de rubricas — cada rubrica é uma expressão que referencia variáveis e outras rubricas. O motor monta o grafo, ordena topologicamente e falha na configuração se houver ciclo.
4. Avaliação — calcula proventos e descontos; bases (INSS, IRRF, FGTS) somam as rubricas pela incidência vigente; calculadoras legais aplicam as tabelas.
5. Pós-processamento — limite de descontos, ordem de prioridade, saldo devedor para a competência seguinte, arredondamento final.
6. Persistência — grava resultado_linha e prova_calculo (árvore com valor de cada nó) e publica FolhaCalculada no outbox.

Linguagem de expressão das rubricas — árvore de sintaxe (AST) interpretada; proibido eval ou código arbitrário:

```ts
type Expr =
  | { k: 'num'; v: string }                       // decimal em string
  | { k: 'var'; name: VarName }                   // 'salario_contratual', 'dias_trabalhados', 'horas_extras_50'...
  | { k: 'ref'; rubrica: RubricaCode }            // valor de outra rubrica
  | { k: 'base'; base: 'inss' | 'irrf' | 'fgts' | string }
  | { k: 'op'; op: '+' | '-' | '*' | '/'; a: Expr; b: Expr }
  | { k: 'fn'; fn: 'min' | 'max' | 'se' | 'arred' | 'media' | 'tabela'; args: Expr[] };

interface RubricaVersao {
  code: RubricaCode; natureza_esocial: string; tipo: 'provento' | 'desconto' | 'informativa';
  incidencias: { cp: string; irrf: string; fgts: string; sind?: string };
  formula: Expr; entra_em_medias: MediaRule[]; vigencia: Vigencia;
}
```

Calculadoras legais — funções puras, uma por regra, com a tabela como parâmetro:

```ts
interface LegalCalculators {
  inssEmpregado(base: Money, tabela: TabelaInss, outrosVinculos: Money): CalcNode;
  irrfMensal(base: Money, deducoes: DeducoesIrrf, tabela: TabelaIrrf, redutor: TabelaRedutorIrrf): CalcNode;
  irrfExclusivo(tipo: '13' | 'plr', base: Money, tabela: TabelaIrrf): CalcNode;
  fgts(base: Money, categoria: CategoriaEsocial): CalcNode;
  dsrSobreVariaveis(variaveis: Money, diasUteis: number, dsr: number): CalcNode;
  // ... cada uma devolve valor + nós filhos para a prova
}
```

Retroativo — quando chega um fato com competência passada (dissídio, alteração de salário com data anterior, afastamento informado tarde):

1. O motor recalcula as competências afetadas com a data de corte atual, sem sobrescrever nada.
2. Compara com o resultado original e gera rubricas de diferença na competência corrente (ou folha complementar, conforme a regra).
3. Diferenças de acordo ou dissídio coletivo saem no S-1200 com as informações de períodos anteriores; demais casos geram retificação do evento original. A escolha é regra declarada, não decisão do código.

Integração com a camada de desempenho — performance não calcula encargo: entrega lancamento com rubrica, valor, título legal e referência à prova dela. O motor trata como qualquer outro lançamento.

Desempenho operacional — cálculo por vínculo é independente, então a execução paraleliza por vínculo em workers; meta de referência: 1.000 vínculos em menos de 60 s em hardware comum (a medir, não premissa).

## 7. eSocial próprio (esocial)

O pacote transforma fatos do domínio em eventos XML, assina, transmite em lotes, acompanha o processamento e grava recibos e retornos. Detalhes técnicos abaixo devem ser conferidos no Manual de Orientação do eSocial (MOS), nas notas técnicas e nos XSDs oficiais da versão vigente antes de codificar.

**Componentes**

| Componente | Responsabilidade |
|---|---|
| XsdRegistry | Guarda os XSDs por versão de leiaute; tipos TypeScript gerados a partir deles no build |
| EventBuilder (um por evento) | Função pura: fato de domínio + snapshot → objeto do evento. Sem I/O |
| XmlSerializer | Objeto → XML canônico; gera o Id do evento de forma determinística |
| Validator | Validação XSD + regras de negócio do MOS implementadas como regras nossas (mensagem em linguagem de DP) |
| SignerPort | Assinatura XMLDSig envelopada (RSA-SHA256). Adaptadores: A1KmsSigner (certificado A1 guardado cifrado; chave privada nunca sai do serviço de assinatura) e A3LocalAgentSigner (agente local no computador do contador, para token/cartão) |
| DependencyScheduler | Grafo de dependência por empresa: S-1000 antes de tudo; tabelas (S-1005, S-1010, S-1020) antes de quem as referencia; S-2200 antes de remuneração do trabalhador; S-1299 só depois de todos os S-1200/S-1210 da competência |
| BatchAssembler | Agrupa eventos assinados em lotes do mesmo empregador e grupo (tabelas, não periódicos, periódicos), respeitando o limite de eventos por lote do MOS |
| Transmitter | Cliente SOAP com TLS mútuo; envia lote (assíncrono) e recebe protocolo. Ambientes: produção restrita (testes) e produção |
| Poller | Consulta o protocolo com backoff até o processamento; grava recibo por evento ou ocorrências de erro |
| ReturnIngestor | Lê totalizadores (S-5001, S-5002, S-5003, S-5011, S-5012, S-5013) e publica para gov-guides conciliar |
| Rectifier | Retificação (mesmo evento com indicativo e número do recibo original) e exclusão (S-3000) |

**Máquina de estados de um evento**

```
RASCUNHO → VALIDADO → AGUARDANDO_ASSINATURA → ASSINADO → EM_LOTE → ENVIADO
  ENVIADO → PROCESSADO (recibo gravado) | REJEITADO (ocorrências gravadas)
  REJEITADO → RASCUNHO (nova versão corrigida)
  PROCESSADO → RETIFICADO (por evento de retificação) | EXCLUIDO (por S-3000)
Regras: transições só por caso de uso; cada transição gera linha de auditoria;
XML assinado é imutável e guardado com hash; reenvio do mesmo Id é idempotente.
```

**Garantias**

- Idempotência: o Id do evento deriva de dados estáveis; reprocessar o outbox nunca cria evento duplicado no governo.
- Nada sai sem assinatura registrada em dp_closing.assinatura (ver seção 8), exceto eventos marcados como "transmissão automática autorizada" pelo contador (ex.: S-2200 com prazo antes do início das atividades).
- Prazos como dado: cada tipo de evento tem prazo legal configurado em legal-tables; o scheduler gera alertas e pendências bloqueantes.
- Certificado: suporte a certificado do próprio empregador e do contador como procurador; validade monitorada com alerta de 30 dias.
- Observabilidade: painel por empresa com contagem por estado, lotes pendentes há mais de X horas e taxa de rejeição por tipo de evento.

## 8. Fechamento e assinatura do contador (closing)

É aqui que o escritório contábil é substituído: o sistema faz todo o trabalho e entrega ao contador só o que exige julgamento, com a assinatura como último passo. A medida de sucesso é o número de exceções por empresa por mês — a meta é tender a zero.

**Fluxo de uma competência**

```
ABERTA → CALCULADA → VERIFICADA → (EXCEÇÕES_PENDENTES) → PRONTA_PARA_ASSINAR
  → ASSINADA → TRANSMITIDA → CONCILIADA → FECHADA
Reabertura: FECHADA → REABERTA (exige motivo + papel autorizado) → CALCULADA ...
```

Verificações automáticas (cada uma é uma regra pura com severidade bloqueia ou alerta):

- Consistência: salário abaixo do mínimo/piso, líquido negativo, rubrica sem incidência eSocial, dependente duplicado, conta/Pix inválido, vínculo sem jornada.
- Variação: diferença por vínculo e por rubrica acima do limite configurado em relação às 3 últimas competências.
- Legal: estabilidade violada em desligamento, férias vencendo em dobro, ASO vencido com submódulo SST ativo, prazo de evento eSocial estourado.
- Conciliação: retornos S-5001/5002/5003 × cálculo próprio; débito da DCTFWeb × apurado; guia FGTS × apurado.

Painel do contador — carteira de empresas com estado de cada competência; por empresa, só a lista de exceções (com a prova de cálculo do item) e um botão de aprovação. Ações possíveis por exceção: aceitar com justificativa, corrigir dado (gera novo cálculo), ou devolver ao cliente com pergunta.

Decisão por exceção — cada verificação que falha percorre a mesma árvore; o contador só entra quando não há correção determinística nem dado faltando do cliente.

> _[Figura da árvore de decisão por exceção — não veio no texto colado.]_

**Assinatura**

- A aprovação do contador é registrada em dp_closing.assinatura: quem, quando, hash do conjunto aprovado (snapshot + resultados + XMLs), certificado usado.
- Os XMLs do eSocial da competência são assinados com o certificado do contador como procurador (ou do empregador), via SignerPort.
- Qualquer mudança após a assinatura invalida o hash e devolve a competência para CALCULADA.

**Papéis (RBAC)**

| Papel | Pode |
|---|---|
| Cliente (dono/RH da empresa) | Lançar fatos, aprovar férias e movimentações, responder perguntas do contador, ver relatórios |
| Contador responsável | Revisar exceções, aprovar, assinar, reabrir competência |
| Operador interno (suporte Luminaris) | Ver estado e logs; nunca assinar nem alterar valores |
| Colaborador | Ver os próprios dados, holerite e prova de cálculo das próprias variáveis |

**Fluxograma da competência**

O ciclo mensal completo, do lançamento do cliente ao fechamento, em simbologia de fluxo de processo. O contador só aparece em três pontos — tratar exceção, assinar e tratar divergência de conciliação; todo o resto é do sistema.

> _[Fluxograma da competência — não veio no texto colado.]_

Os dois laços são os pontos de controle: exceção volta ao cálculo antes da assinatura; divergência com o governo volta à transmissão como retificação, sem reabrir a competência inteira.

## 9. Eventos de domínio e integração com o Luminaris

Toda comunicação entre pacotes e com o resto do Luminaris passa por eventos no outbox (assíncrono) ou por portas de consulta (síncrono, só leitura). Nenhum pacote chama caso de uso de outro diretamente.

**Envelope padrão**

```ts
interface DomainEvent<T> {
  id: string;              // uuid v7
  type: string;            // 'dp.vinculo.admitido.v1'
  tenantId: string; empresaId: string;
  occurredAt: string;      // quando o fato aconteceu (competência)
  recordedAt: string;      // quando foi registrado
  causationId?: string; correlationId: string;
  payload: T;              // versionado pelo sufixo do type
}
```

Consumidores gravam o id em inbox antes de processar (idempotência). Mudança incompatível de payload = novo sufixo .v2, com as duas versões publicadas durante a transição.

**Eventos publicados pelo núcleo**

| Evento | Publicado por | Consumido por |
|---|---|---|
| dp.vinculo.admitido | core | esocial (S-2200), benefits, ohs, timekeeping, self-service |
| dp.vinculo.alterado | core | esocial (S-2205/2206), payroll (gatilho de retroativo), benefits |
| dp.afastamento.registrado | core | esocial (S-2230), timekeeping (abono), performance (dias elegíveis) |
| dp.desligamento.solicitado | core | payroll (rescisão), benefits, documents |
| dp.folha.calculada | payroll | closing, accounting-bridge (prévia) |
| dp.competencia.assinada | closing | esocial (liberar transmissão), payments, accounting-bridge |
| dp.esocial.evento.processado | esocial | gov-guides, closing |
| dp.retorno.totalizador.recebido | esocial | gov-guides (conciliação) |
| dp.competencia.fechada | closing | accounting-bridge (definitivo), analytics, self-service (holerite) |

**Integração com outros módulos do Luminaris**

| Módulo | Direção | Contrato |
|---|---|---|
| Cadastro de empresas/pessoas | entra | Porta EmpresaDirectory: CNPJ, endereço, regime tributário, CNAE — DP não duplica esses dados |
| Contábil | sai | accounting-bridge publica lançamentos (folha, encargos, provisões, rateio por centro de custo) no formato do razão do Luminaris |
| Financeiro | sai | Contas a pagar para líquidos, DARF, guia FGTS, sindicato, pensão e consignado |
| Fiscal | sai | Retenções de serviços tomados (cessão de mão de obra) quando aplicável |
| Atendimento (Lumine) | entra/sai | Opcional: colaborador consulta holerite, saldo e férias pelo WhatsApp via API do self-service |
| Builder de telas | entra | uiRoutes dos manifestos registram telas e permissões no builder |

## 10. Estratégia de testes

Como o código será escrito majoritariamente por agente, os testes não podem vir da mesma fonte que o código sem um oráculo externo. A regra: todo cenário de cálculo tem valor esperado conferido por humano (contador) antes de virar teste.

| Camada | O que testa | Ferramenta / forma | Oráculo |
|---|---|---|---|
| Calculadoras legais | INSS, IRRF + redutor, FGTS, DSR, médias | Vitest, tabela de casos | Exemplos oficiais e casos conferidos pelo contador |
| Cenários golden de folha | Folha completa de um vínculo em situações típicas e de borda | testkit: arquivo YAML por cenário (entradas + resultado esperado por rubrica) | Contador assina o arquivo do cenário (campo conferido_por) |
| Propriedades | Determinismo (mesmo snapshot → mesmo hash de resultado), idempotência do outbox, soma das fatias = período | Property-based (fast-check) | Invariantes, não valores |
| Retroativo | Recalcular competência passada não altera resultado gravado; diferença = novo − antigo | Golden + propriedade | Contador |
| eSocial — esquema | Todo XML gerado valida no XSD oficial da versão | Validador XSD no CI | XSD oficial |
| eSocial — integração | Envio, consulta, recibo, rejeição, retificação | Ambiente de produção restrita, certificado de teste | Resposta do governo |
| RLS | Consulta sem contexto ou com outro tenant retorna zero | Testes de integração com Postgres real | Política |
| Arquitetura | Regras de importação da seção 4 | dependency-cruiser no CI | Regras |
| Módulos | Núcleo calcula com todos os opcionais desligados (adaptadores nulos) | Matriz de CI: núcleo sozinho + combinações principais | Golden do núcleo |

Catálogo mínimo de cenários golden do núcleo (cada um vira arquivo no testkit): mensalista simples; admissão no meio do mês; horista com HE e adicional noturno; comissionista com DSR e complemento de mínimo; afastamento por doença atravessando competências; férias com abono e adiantamento de 13º; 13º com médias; rescisão sem justa causa com aviso indenizado; pedido de demissão; acordo (art. 484-A); dissídio retroativo de 3 meses; pensão alimentícia; consignado CLT acima da margem; aprendiz; estagiário; empregado com dois vínculos (INSS somado).

## 11. Plano de implementação para o Claude Code

Ordem obrigatória, uma fase por vez; cada fase só começa quando os critérios de aceite da anterior passam no CI. Regras de trabalho: um pacote por PR; nenhum valor legal inventado (sem fonte ou cenário conferido → parar e registrar na seção 12); toda decisão nova vira ADR curto em docs/adr/dp/.

1. **F0 — Fundação (kernel, infraestrutura)**
   - Money decimal, Competencia, Vigencia, Result, IDs; DpModuleManifest e DpModuleRegistry; schemas com RLS; outbox/inbox; regras de dependência no CI.
   - Aceite: testes de propriedade do Money; teste de RLS (sem contexto = zero linhas); build falha ao violar regra de importação.
2. **F1 — Cadastros e tabelas legais (core, legal-tables)**
   - Empresa, estabelecimento, lotação, sindicato/CCT, cargo, jornada, rubrica com incidências, trabalhador, vínculo bitemporal, afastamento; carga das tabelas 2026.
   - Aceite: consulta "como era em D segundo o que se sabia em T" coberta por testes; tabelas 2026 conferidas pelo contador.
3. **F2 — Motor mensal (payroll)**
   - Snapshot, fatiamento, grafo de rubricas, linguagem de expressão, calculadoras legais, prova de cálculo, folha mensal e adiantamento.
   - Aceite: cenários golden de mensalista, horista e comissionista; propriedade de determinismo.
4. **F3 — Folhas especiais (payroll)**
   - Férias, 13º, rescisão, complementar, retroativo, pensão, consignado CLT, limite de descontos.
   - Aceite: todo o catálogo golden da seção 10 passando.
5. **F4 — eSocial próprio (esocial)**
   - XSDs e tipos gerados, builders (tabelas, não periódicos, periódicos, S-3000), validador, A1KmsSigner, scheduler, lotes, transmissor, poller, retornos.
   - Aceite: ciclo completo em produção restrita — S-1000 até S-1299 com recibos — e uma retificação e uma exclusão bem-sucedidas.
6. **F5 — Fechamento ponta a ponta (gov-guides, closing, accounting-bridge)**
   - Conciliação de retornos, DCTFWeb, FGTS Digital, verificações automáticas, painel de exceções, assinatura, lançamentos contábeis.
   - Aceite: uma empresa de teste fecha uma competência inteira — calculada, verificada, assinada, transmitida, conciliada, contabilizada — com zero intervenção fora do painel do contador.
7. **F6 — Submódulos opcionais**, nesta ordem: timekeeping → payments → benefits → self-service → onboarding → performance → ohs → documents → special-categories → analytics.
   - Aceite de cada um: manifesto válido; núcleo segue passando com o módulo desligado; cenários golden próprios; ativação e desativação por empresa testadas.

## 12. Questões em aberto

Itens que o agente não deve resolver sozinho; cada um precisa de resposta antes da fase indicada.

- [ ] Antes de F1 — Quem é o contador responsável que confere tabelas e cenários golden, e como o aceite dele fica registrado?
- [ ] Antes de F1 — Quais CCTs entram primeiro (define o formato de cct_regra com casos reais)?
- [ ] Antes de F4 — Guarda do certificado A1: serviço de KMS/HSM escolhido, quem tem acesso e como é a política de rotação.
- [ ] Antes de F4 — O contador assina como procurador do empregador em todos os clientes? Isso define o modelo de procuração eletrônica e o contrato de responsabilidade.
- [ ] Antes de F4 — Agente local para certificado A3: entra na primeira versão ou fica só A1?
- [ ] Antes de F5 — DCTFWeb: há canal automatizado viável para transmitir e emitir o DARF, ou a primeira versão gera o débito e orienta a emissão? Pesquisar antes de decidir.
- [ ] Antes de F5 — FGTS Digital: verificar se existe API para emissão automatizada de guias; sem API, definir o fluxo assistido.
- [ ] Antes de F5 — Formato exato do lançamento contábil esperado pelo módulo contábil do Luminaris.
- [ ] Antes de F6 — Precificação por submódulo (alimenta a leitura de dp_modulo_ativacao).
- [ ] Contínuo — Validação jurídica das regras legais citadas na especificação e no documento de mapa funcional.
