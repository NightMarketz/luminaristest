# BE-INCR-H1-REFERENCIAL-3-4: a 3.4 na receita bruta (ECF/X7/X8) + kit v2 do salão com o referencial. BRIEF

> **Estado legal verificado em 17/10/2026** (dossiê `pesquisas-legais/verif-2026-10-17-contabil-ecd/relatorio.md` (PR #754); [Dnn] = fonte do dossiê). Este documento é histórico; onde ele cita outra coisa, vale o que está abaixo.
>
> - **Manual da ECD L9:** a edição vigente é a **atualização de maio/2026** (sha `bc63f0a893ce`) [D07], não a de janeiro/2026 (`7ddf47755f61`). Ver [[D-2026-10-17-MANUAL-ECD-L9-MAIO]]. Em geral as páginas avançam 1 ou 2; o mapa está na nota. O conteúdo de J801, J930, J932 e `REGRA_VALIDA_NIVEL_CONTAS` confere.
> - **Lei 6.404/76** [D03]: grupos do BP no art. 178 §§1º-2º (confere). As deduções da receita bruta estão no **art. 187 I**, não no II; a citação foi corrigida no PR #756.
> - **IN RFB 2.003/2021** art. 3º (obrigados, dispensas, ECD facultativa): confere na visão vigente do Sijut2; só a IN 2.142/2023 a alterou.

> **Sessão:** `sessao-planejamento`, 2026-10-11, base `origin/main` `3af9a6b5`. **Sem código.**
>
> **Em duas linhas:** o H1 está parado no P5 por dois gates.
> - **A ECD** dá 400 porque a 3.4 não tem I051. Isso se resolve com dado: o mapeamento entra pelo RUNBOOK nos escopos que
>   já existem e pelo kit v2 nos novos.
> - **A ECF Presumido** dá 400 porque `receitaBrutaPorAtividade` só aceita 3.1 e 3.3. Isso se resolve com código: a 3.4
>   passa a somar na receita de serviço.
>
> **Risco principal:** a mudança está numa função única, que alimenta a ECF, o X7 (trimestral e anual) e o PIS/Cofins
> cumulativo. Os quatro passam a tributar a 3.4, e isso é intencional e precisa de teste em cada leitor.

## 0. Contexto fixo

- **Item:** itens 1 e 2 da fila de agente da continuação de 11/10. Gate [[H1]] (`docs/plano/gates/H1.md`, "parado no P5").
  RUNBOOK em `docs/accounting/RUNBOOK-H1-PVA.md:448-465`.
- **Autorização (citável):** [`D-2026-10-11-QUESTIONARIO-DONO`](../plano/decisoes/D-2026-10-11-QUESTIONARIO-DONO.md).
  - Decisão (b): "Receita bruta .98 (Recomendado)".
  - "Executa" marcado para "1+2 H1: referencial + ECF". A opção marcada dizia: *"Planejamento curto (BRIEF) que junta:
    aplicar a PROPOSTA-REFERENCIAL-D1 nos escopos (+ kit v2 se quiser) com as 9 folhas da emenda 3.3, e a 3.4 aceita no
    PRESUNCAO_ACCOUNT_CODES conforme (b). Depois sessao-feature."*
  - **Cobertura:** exata para a 3.4 e para a ECF. O kit v2 ficou condicionado a "se quiser", e por isso é o fork F-HR-1.
    As 9 folhas da emenda 3.3 não existem no fixture (a emenda não tem "executa"), então entram só como obrigação
    registrada (§2, item 13, e F-HR-4), não como código deste incremento.
- **Insumos:**
  - [`PROPOSTA-REFERENCIAL-D1-2026-10-10.md`](PROPOSTA-REFERENCIAL-D1-2026-10-10.md): §0 (os 14 mapeamentos que já
    existem), §1.1 (3.4), §1.2 (9 folhas da emenda), §3 (por que `.98` e qual presunção) e §4 (onde aplicar).
  - [`D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO`](../plano/decisoes/D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO.md): D-1
    (delegação) e "gate da ECD mantido".
  - Código lido: `server/src/features/accounting/services/receitaBrutaPorAtividade.ts`, todo;
    `SpedEcfGenerationService.ts:83-95`; `StatementMappingFixture.ts:27` (a DRE já põe a 3.4 em `grossRevenue`);
    `ChartOfAccountsFixture.ts:74,123` (`RECEITA_NAO_USO_CODE = '3.4'`); `sectorKits/kits/beautySalon/kit.v1.ts`;
    `sectorKits/registry.ts`; `sectorKits/dtos/SectorKitDto.ts:66-86,135-140`; `KitInstallService.ts:278-299`
    (`stepReferential`).
  - Teste que trava o comportamento de hoje: `SpedEcfGenerationService.test.ts:137-150`. Ele espera que movimento na 3.4
    reprove o gate "até o PE-2". Com a decisão (b), a PE-2 fica fechada por delegação.
- **Nós vizinhos:**
  - Consome [[PACOTE-VALIDADE]] (a 3.4 e a ponte `sale.package.expired`) e [[KIT-SETOR]] (contrato do kit; os PR-1, PR-2
    e PR-5 estão em `main`, mas o PR-4, de upgrade, não existe).
  - Os leitores de `receitaBrutaPorAtividade` são [[X7]] (`TaxAssessmentService.ts:760,832`; `taxAssessmentCalcAnual.ts`)
    e [[X8]] (`PisCofinsAssessmentService.ts:368`).
  - Destrava o P5 do [[H1]].
  - Ponto de contato com a emenda 3.3 de [[F7]]/[[X4]] (`BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md`, E1/E26).

## 1. Esqueleto

| # | Comportamento | PR | Classe |
|---|---|---|---|
| 1–8 | A 3.4 tem campo próprio (`naoUsoCents` e a linha `RECEITA_NAO_USO`) e entra na base de serviço. O gate deixa de recusá-la | PR-1 | direto (decisão b, F-HR-3 b) |
| 9–12 | Kit v2 do salão com o referencial 2025 das 15 folhas canônicas | PR-2 | fork F-HR-1 / F-HR-2 |
| 13 | Obrigação para o PR-1 da emenda 3.3: mapear as 9 folhas no mesmo PR | — (registro) | fork F-HR-4 |
| 14 | Emenda do RUNBOOK-H1: comando do P5 com o código da 3.4 | PR-1 (docs) | direto |
| 15 | Fold | PR-1 e PR-2 | direto |

## 2. Checklist

### PR-1: a 3.4 na receita bruta de serviço (`receitaBrutaPorAtividade`)

1. **Mapa código → atividade.** `PRESUNCAO_ACCOUNT_CODES` vira `ATIVIDADE_POR_CODIGO: ReadonlyMap<string, 'servico' |
   'revenda'>` = `{3.1 → servico, 3.3 → revenda, 3.4 → servico}`. O 3.4 vem de `RECEITA_NAO_USO_CODE`, importado de
   `ChartOfAccountsFixture`, sem literal novo. O gate de exaustividade passa a usar `!ATIVIDADE_POR_CODIGO.has(code)`.
   - *Teste:* movimento só em 3.1, 3.3 e 3.4 → sem `ValidationError`. Movimento em 3.2 → continua 400 com
     `unmappedRevenueAccounts: [3.2]`. Hoje esse caso não tem teste, e ele é a guarda de que o mapa não virou "toda
     receita".
   - *Origem da regra:* decisão (b), D-2026-10-11, e PROPOSTA §3 itens 1 a 4 (DL 1.598 art. 12 IV; Lei 9.249 art. 15
     §1º III a).
2. **Campo próprio da 3.4 (F-HR-3 → b, ratificado 11/10).** `ReceitaPorAtividade` ganha `naoUsoCents`. É um tipo
   interno de serviço, não DTO.
   - Valores: `servicoCents = max(0, net(3.1))`, sem mudança; `naoUsoCents = net(3.4)`, **com sinal**; `revendaCents`
     sem mudança.
   - Quem calcula usa a **base de serviço** = `max(0, servicoCents + naoUsoCents)`, num helper único
     `baseServicoCents(r)` no model.
   - *Por quê do piso na soma:* um débito líquido na 3.4 é estorno de vencimento e tem de reduzir a base de serviço.
     Piso só na 3.4 esconderia o estorno.
   - Com a 3.4 sem movimento, `naoUsoCents = 0` e todos os números ficam iguais aos de hoje.
   - *Teste:* 3.1 = 1.000 e 3.4 = −200 → `baseServicoCents` = 800.
2a. **Linha de memória `RECEITA_NAO_USO`** ("Receita por não uso de pacote (conta 3.4), presunção de serviço"), emitida
   pelos três calcs ao lado de `RECEITA_SERVICO`: `taxAssessmentCalc.ts:445`, `taxAssessmentCalcAnual.ts:172` e
   `pisCofinsCalc.ts:191`.
   - `RECEITA_SERVICO` continua sendo só a 3.1. O rótulo "(conta 3.1)" fica verdadeiro.
   - A linha sai só quando `naoUsoCents ≠ 0`, para que a memória de quem não tem pacote vencido não mude.
   - A memória já viaja na prévia, na confirmação e no `EXPORT_TAX_ASSESSMENT_MEMO`. A linha aparece lá sem contrato novo,
     porque `codigo` é string livre (a sessão de feature confere no DTO e no snapshot de shape).
2b. **Leitura de memórias confirmadas antigas.** Os leitores que somam `RECEITA_SERVICO` de períodos anteriores passam a
   somar também `RECEITA_NAO_USO`. São eles: `taxAssessmentCalc.ts:231,398,467` e `taxAssessmentCalcAnual.ts:241`, com a
   acumulada do 16% e da LC 224.
   - O `valorLinha` **lança** quando a linha falta (`taxAssessmentCalc.ts:94-97`). Por isso a leitura nova usa
     `temLinha(...) ? valorLinha(...) : 0n`. Memória confirmada antes deste PR não tem a linha e vale 0.
   - *Teste:* uma apuração confirmada sem a linha seguida de uma prévia do período seguinte → sem 400, e a acumulada igual
     à de hoje.
3. **Mensagem do 400** passa a citar "3.1 serviço / 3.4 receita por não uso (serviço) / 3.3 revenda". O `details` não
   muda de forma.
4. **ECF Presumido.** Inverter `SpedEcfGenerationService.test.ts:137-150`: movimento na 3.4 gera o arquivo, e a receita
   dela aparece no P200 linha 8 (32% IRPJ) e no P400 linha 4 (32% CSLL) do trimestre do movimento.
   - *Teste de invariância (golden):* escopo sem movimento na 3.4 gera o arquivo byte a byte igual ao de antes, com a
     mesma fixture do teste de 26 k da Fase B (`D-2026-10-05-X7-FASE-B-PR4-LACUNAS`).
5. **X7 trimestral (Presumido).** `TaxAssessmentService` com 3.4 no trimestre: a base de IRPJ e CSLL de serviço inclui a
   3.4.
   - *Teste* no serviço (repo falso) e no `.integration.test.ts` que já cobre a prévia do trimestre.
   - Lembrete [[repositorios-de-contabilidade-nao-sao-exercitados]]: o teste de integração é o que conta.
6. **16% do prestador exclusivo** (`declaraNaoProfissaoRegulamentada`, PRESUMIDO-16). A 3.4 entra na receita de serviço que
   o teto de R$ 120 mil mede (`baseServicoCents`), e isso é consequência direta do item 2.
   - *Teste:* um escopo com 3.1 = 110 mil e 3.4 = 15 mil no ano fica acima do teto, e o comportamento de estouro é o que
     já existe.
   - **Não** se mexe aqui no bloqueio por esteticista (D-4), que é item 5 da fila.
7. **X7 anual (Real, estimativa por receita bruta)** e **X8 cumulativo.** `taxAssessmentCalcAnual` e
   `PisCofinsAssessmentService` herdam a 3.4 pela mesma função.
   - *Teste:* um em cada, com 3.4 no mês. Na estimativa, ela entra pela `baseServicoCents` e pela linha `RECEITA_NAO_USO`. No PIS/Cofins cumulativo, entra na
     base.
   - *Origem:* receita bruta da atividade (art. 12 IV) é base do PIS/Cofins cumulativo (Lei 9.718 art. 3º). PROPOSTA §3,
     "Tensão nomeada": *"gera PIS/Cofins cumulativo"*.
8. **Contrato.**
   - `ReceitaPorAtividade` ganha `naoUsoCents` (interno).
   - A ECF não muda de forma: `EcfQuarter.servicoCents` recebe `baseServicoCents`, porque o P200 não tem linha própria.
   - Nenhuma rota ou evento muda. A memória ganha um `codigo` novo (`RECEITA_NAO_USO`).
   - Se o `codigo` da memória for enum em algum DTO ou snapshot, o PR atualiza o snapshot de shape e afirma isso no corpo.
     Senão, o PR afirma "snapshot e openapi iguais" com a saída do check.

### PR-2: kit v2 do salão com o referencial (condicional ao F-HR-1 a)

9. **`kits/beautySalon/kit.v2.ts`.** Igual ao v1 em `binding`, `operationalSchema`, `chartExtension` vazio,
   `roleDefaults` e `serviceFiscalDefaults`. Muda só `referential`, que ganha dois blocos, `{regime: 'PRESUMIDO',
   mappingVersion: '2025', entries}` e `{regime: 'REAL', …}`, com as **mesmas 15 entradas** abaixo (PROPOSTA §0 e §1.1:
   "igual" no L e no P):

   | accountCode | referentialCode | label (descrição oficial) |
   |---|---|---|
   | 1.1.1 | 1.01.01.02.01 | conforme catálogo |
   | 1.1.2 | 1.01.02.02.01 | idem |
   | 1.1.3 | 1.01.01.01.01 | idem |
   | 1.1.4 | 1.01.02.02.01 | idem |
   | 1.1.5 | 1.01.02.02.01 | idem |
   | 1.1.6 | 1.01.03.01.01 | idem |
   | 2.1.1 | 2.01.01.05.01 | idem |
   | 2.1.2 | 2.01.01.03.01 | idem |
   | 2.3.1 | 2.03.04.01.01 | idem |
   | 3.1 | 3.01.01.01.01.06 | idem |
   | 3.2 | 3.01.01.01.02.01 | idem |
   | 3.3 | 3.01.01.01.01.05 | idem |
   | **3.4** | **3.01.01.01.01.98** | Outras Receitas da Atividade Geral |
   | 4.1 | 3.01.01.09.01.99 | idem |
   | 4.2 | 3.01.01.03.01.02 | idem |

   - O `label` é a descrição oficial da linha, lida da tabela da RFB (sha `366b8d9030a0…`, PROPOSTA §0). A fixture do
     catálogo do sistema não tem descrição, só código e tipo.
   - O `changelog` cita *"referencial 2025 das 15 folhas canônicas; 3.4 → .98 por delegação do contador via dono
     (D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO D-1; D-2026-10-11 (b))"*.
10. **Registro e publicação.**
    - `KIT_REGISTRY.beautySalon = [V1, V2]`.
    - `published.json` ganha `{kitVersion: 2, sha256}` pelo mesmo processo do v1 (BRIEF KIT-SETOR, item 5).
    - O v1 não se edita.
11. **Testes.**
    - O `kitReferentialCatalog.test.ts` já confere existência e tipo A no catálogo 2025 e cobre o v2 sem mudança. Se não
      cobrir, estende-se para todas as versões do registro.
    - Integração: instalar o v2 em escopo novo com regime PRESUMIDO e ano 2025, depois `coverage(version 2025)` →
      `ready: true`, 15/15. Mesmo teste com REAL.
    - Escopo que já tem mapeamento numa conta: o kit não sobrescreve (`mapped.has(accountId)` em
      `KitInstallService.ts:293`).
12. **O que o v2 não faz.**
    - Não alcança escopos já instalados com o v1 nem o seed do H1, porque o upgrade (KIT-SETOR PR-4) não existe.
    - O alcance é só instalação nova. Isso é o motivo do item 14.

### Obrigação registrada para a emenda 3.3 (não é código deste incremento)

13. **O PR-1 da emenda 3.3 (E1 + E26) leva no mesmo PR o referencial das 9 folhas novas**, com os códigos da PROPOSTA §1.2:
    - 3.5.1, 3.5.2 e 3.5.3 → `3.01.01.05.01.05`;
    - 4.3.1 e 4.3.3 → `3.01.01.09.01.08`;
    - 4.3.2, 4.4.1 e 4.4.2 → `3.01.01.07.01.22`;
    - 4.5 → `3.01.01.07.01.04`.

    O caminho depende do F-HR-4. **Por quê:** o gate da ECD conta **toda** folha ativa (`ReferentialMappingService.ts:326`,
    PROPOSTA §3). Sem o mapeamento, a ECD volta a dar 400 em todos os escopos, inclusive no H1.

### Documentação

14. **Emenda do RUNBOOK-H1, passo P5** (`RUNBOOK-H1-PVA.md:465`). A linha "Com o código…" ganha o código e o comando
    literal nas duas unidades do seed:
    `PUT /api/accounting/referential/mappings` com `{unitId, version: '2025', accountCode: '3.4', referentialCode:
    '3.01.01.01.01.98'}` (formato exato conferido no DTO na sessão de feature).
    - Esperado: `coverage` 15/15 e `ready: true` → ECD 200 → passo 3.
    - Para a ECF (passo da ECF), o pré-requisito passa a ser o PR-1 mergeado.
    - **Quem executa é o dono**, ou o agente sob comando literal dele no chat, colando a saída na EVIDÊNCIA (CLAUDE.md,
      regra do runbook). Desfecho e assinatura são do dono.
15. **Fold** no próprio PR:
    - `estado_detalhe` do [[H1]]: o P5 passa a esperar o passo do dono, não o contador.
    - [[PACOTE-VALIDADE]]: PE-2 fechada por delegação.
    - [[KIT-SETOR]] (PR-2): primeiro kit com conteúdo.
    - `plano-vault.mjs fold <NÓ> --pr <n>` + `check` = 0.

## 3. Contratos

```ts
// receitaBrutaPorAtividade.ts (PR-1). A interface pública não muda.
type Atividade = 'servico' | 'revenda';
const ATIVIDADE_POR_CODIGO: ReadonlyMap<string, Atividade> = new Map([
  [SERVICO_ACCOUNT_CODE, 'servico'],   // '3.1'
  [RECEITA_NAO_USO_CODE, 'servico'],   // '3.4': decisão (b) 2026-10-11, DL 1.598 art. 12 IV
  [REVENDA_ACCOUNT_CODE, 'revenda'],   // '3.3'
]);
export interface ReceitaPorAtividade {
  servicoCents: number;  // max(0, net 3.1): inalterado
  revendaCents: number;  // max(0, net 3.3): inalterado
  naoUsoCents: number;   // net 3.4 COM sinal (F-HR-3 b)
}
// gate: Revenue ∧ acceptsEntries ∧ net≠0 ∧ !ATIVIDADE_POR_CODIGO.has(code) ⇒ ValidationError{unmappedRevenueAccounts}
// model: baseServicoCents(r) = max(0, servicoCents + naoUsoCents): único ponto que soma
// memória: linha('RECEITA_NAO_USO', 'Receita por não uso de pacote (conta 3.4), presunção de serviço', naoUso, fonte)
//          só quando naoUso ≠ 0; leitura de anteriores: temLinha ? valorLinha : 0n
```

```ts
// kit.v2.ts (PR-2). Formato do SectorKitDto, sem mudança de schema.
referential: [
  { regime: 'PRESUMIDO', mappingVersion: '2025', entries: ENTRIES_2025 },
  { regime: 'REAL',      mappingVersion: '2025', entries: ENTRIES_2025 },
] // ENTRIES_2025: Array<{accountCode, referentialCode, label}> × 15 (tabela do item 9)
```

## 4. Forks

> **Ratificados em 11/10** (dono, chat, questionário, [[D-2026-10-11-QUESTIONARIO-DONO]]):
> - F-HR-1 → (a);
> - F-HR-2 → (a);
> - **F-HR-3 → (b), contra a recomendação.** Os itens 2, 2a, 2b e 8 e os contratos já foram reescritos para (b).
> - F-HR-4 → (a).
>
> Nenhum fork pendente. O texto abaixo é o registro das opções.

- **F-HR-1. Kit v2 neste incremento?**
  - (a) Sim, PR-2 com o referencial das 15 folhas (salão; F-KB-9 a já elegeu o salão para o primeiro v2).
  - (b) Não. Só o PR-1 e o runbook. O kit v2 espera a emenda 3.3 para sair com 24 folhas de uma vez.

  **Recomendação: (a).** É o primeiro conteúdo real do kit, como o próprio BRIEF do KIT-SETOR prevê, e todo escopo novo
  nasce com a ECD pronta. Custo: quando a emenda 3.3 entrar, vem um v3 com as 9 folhas. Versão nova é o mecanismo
  previsto e não se edita versão publicada.
- **F-HR-2. Regimes cobertos no v2.**
  - (a) PRESUMIDO e REAL.
  - (b) Também SIMPLES e MEI, com os mesmos códigos.

  **Recomendação: (a).** A ECD é facultativa no Simples, e o `COD_PLAN_REF` do Simples não foi conferido (insumo
  ausente, §6). Custo: o primeiro cliente (Simples) instala sem referencial e, se gerar ECD, mapeia pela tela.
- **F-HR-3. Forma da 3.4 na segregação.**
  - (a) Soma em `servicoCents`, sem mudança de contrato.
  - (b) Campo novo `receitaNaoUsoCents`, somado ao serviço só no cálculo e exposto na memória e na prévia.

  **Recomendação: (a).** O P200 não tem linha própria para ela, e a DRE já a mostra separada
  (`dre.gross_rev_breakage`). (b) muda o DTO da prévia do X7 e o snapshot de shape sem um consumidor que tenha pedido.
- **F-HR-4. Como as 9 folhas da emenda 3.3 chegam mapeadas aos escopos.**
  - (a) O PR-1 da emenda leva as 9 entradas num kit v3 (instalação nova) e uma emenda do RUNBOOK-H1 com o batch nas
    unidades do seed. Escopo antigo fica com a ECD em 400 até o mapeamento pela tela ou API.
  - (b) Defaults canônicos em código: `CANONICAL_REFERENTIAL_DEFAULTS` por versão e um passo idempotente que preenche
    folha canônica **sem** mapeamento em escopo que **já** tem a versão. Serve à 3.4 e às 9.
  - (c) Esperar o upgrade do KIT-SETOR (PR-4).

  **Recomendação: (a).** Não há cliente em produção (M2 aberto), então "escopo antigo" é só o dev.db. (b) escreve dado
  contábil do tenant sem gesto humano e duplica o papel do upgrade do kit. (c) amarra a emenda 3.3 a um PR grande sem
  "executa".

## 5. Pendente de validação externa

- **Revisão do contador** dos códigos (PROPOSTA §5). É validação, não bloqueio (triagem §4, D-1).
- **Oráculo do número:** a ECF com a 3.4 no P200 linha 8 só se prova no PVA, no passo da ECF do H1. É do dono.

## 6. Insumos ausentes

- `COD_PLAN_REF` e plano referencial aplicável à ECD de PJ do Simples: não conferido. Afeta só o F-HR-2 (b).
- Formato exato do corpo do `PUT /referential/mappings` (DTO): conferir na sessão de feature, antes de escrever o item 14.

## 7. Achados fora de escopo (não planejados)

1. **3.2 Devoluções e 3.5.x (emenda 3.3) com movimento seguem derrubando a ECF Presumido.** Já registrado no BRIEF da
   emenda 3.3, §8 item 1. O conserto são as linhas de "demais receitas" do P200/P400 (art. 25 II) e é frente do nó da ECF.
   Este PR mantém o 400 da 3.2 de propósito (item 1).
2. **O kit da clínica** (`aestheticClinic`) usa a mesma 3.4 (`clinicBinding.ts:33`) e ficaria sem v2 pelo F-KB-9 (a). O
   referencial dela é um PR irmão, com pedido próprio.
3. **Simples (X14)** não lê `receitaBrutaPorAtividade`. A 3.4 no DAS segue a leitura própria do X14, que não foi lida
   aqui.

## Grau

- **Verificado (leitura):**
  - a função, os 4 leitores (grep `receitaBrutaPorAtividade`) e o teste que trava a 3.4;
  - a DRE já põe a 3.4 em receita bruta;
  - o kit v1 tem `referential: []`;
  - `stepReferential` não sobrescreve conta já mapeada;
  - o upgrade do kit não existe (grep `upgradeSectorKits`/`kit_upgrade_runs` vazio).
- **Inferido:** o PIS/Cofins cumulativo herda a 3.4 só pela função comum. A fórmula do `pisCofinsCalc` não foi relida
  linha a linha. Fica coberto pelo item 7.
- **Caso adversarial:** "e se o mapa virar 'toda Revenue'?" Então a 3.2, que é redutora, entraria como receita. O item 1
  exige o teste com a 3.2 ainda em 400.
