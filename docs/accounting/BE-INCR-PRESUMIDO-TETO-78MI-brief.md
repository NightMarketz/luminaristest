# BE-INCR-PRESUMIDO-TETO-78MI — BRIEF (nó PRESUMIDO-TETO-78MI)

> **Sessão:** `sessao-planejamento` (agente), 22/10/2026. Saída = este documento + dossiê legal + fold da nota do nó.
> **Sem código, sem `executa`, sem merge.** Base: `origin/main` em `65e1dd6b`.

## TLDR (2 linhas)

Um PR confere a receita total do ano anterior contra o teto do Presumido (R$ 78 mi, ou R$ 6,5 mi × meses de atividade) e
avisa no perfil e na prévia; a forma (avisar × bloquear), a fonte da receita e a medida são forks **PENDENTES** (F-PT-1..7).
**Risco principal:** "receita bruta total" (art. 13, opção) × "receita total" (art. 14 I, obrigação) é ambíguo na lei; a
recomendação segue a IN 1.700 (receita total nos dois) e espera a confirmação do contador (P-PT-1).

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `PRESUMIDO-TETO-78MI` — `docs/plano/nos/PRESUMIDO-TETO-78MI.md` (frente F1 em
  `docs/plano/FILA-ORDEM.md:89`; registrado pela verificação legal de 17/10, item 19 do dossiê IRPJ/CSLL).
- **Autorização:** dono, chat, 2026-10-22 (repassada pela sessão de origem): *"Precisamos agora de sessões para a falta de
  brief"*. Escopo: só o BRIEF (sessao-planejamento), só docs, sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** cobre exatamente o BRIEF deste nó. O campo `autorizacao` da nota cita só o registro de 17/10
    ("sem BRIEF, sem 'executa'"); este é o pedido de BRIEF. O fold (§9) acrescenta a citação de 22/10 ao campo, sem
    autorizar código.
- **Insumos (fato consumado):** nota do nó; nó [[X7]] (Fases A–C em `main`); dossiê de 17/10
  `pesquisas-legais/verif-2026-10-17-irpj-csll/relatorio.md` (item 19); dossiê novo
  `pesquisas-legais/presumido-teto-78mi/relatorio.md` [D01–D04]; código lido:
  `server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts:124,179-181` (`lucroRealObrigatorio` só no REAL),
  `services/CompanyFiscalProfileService.ts:159-200` (upsert), `:317-332` (copyFrom), `:337-383` (obligations, `avisos: []`
  sempre vazio), `services/TaxAssessmentService.ts:704-786` (`calcular` lê o regime do perfil do ano; ramo PRESUMIDO),
  `:288-353` (confirmação recalcula fora da tx e reconfere o perfil dentro), `services/receitaBrutaPorAtividade.ts`
  (segregação + gate, exclui o encerramento), `services/SimplesApuracaoService.ts:734-766` (precedente: limites do Simples
  como `WARNING`, proporcional por `13 − mês de início`), `models/taxAssessmentParams.ts:17-30` (chaves da tabela
  `TAX_ASSESSMENT`), `prisma/schema.prisma:1745-1751`.
- **Nós vizinhos:** consome [[X7]] (perfil fiscal da empresa, `TaxAssessmentService.calcular`, tabela `TAX_ASSESSMENT` em
  `legal_parameters`) e o razão (`IPostingRepository`). Consumido por: tela do perfil fiscal (FE, nó vizinho — fora deste
  BRIEF) e, no futuro, o simulador de regime (`PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md:197`, não é nó).

**Verificação legal (método do CLAUDE.md):** Lei 9.718 lida no acervo, compilada, sem alerta [D01]. RIR/2018 no acervo
veio `original` e sem corpo → conferido no Planalto [D03]. IN RFB 1.700 não está no acervo → lida no site da RFB pelo
navegador embutido [D04] (trecho literal com hash no dossiê). Conclusão e ambiguidades em
`pesquisas-legais/presumido-teto-78mi/relatorio.md`.

## 1. A regra (o que a lei diz — verificado)

| Regra | Fonte |
|---|---|
| Pode optar pelo Presumido em Y quem teve em Y−1 receita **≤ R$ 78.000.000,00**, ou ≤ **R$ 6.500.000,00 × meses de atividade** de Y−1 quando < 12 | Lei 9.718 art. 13 caput (red. Lei 12.814/2013, vigor 01/01/2014) [D01]; RIR art. 587 caput [D03]; IN 1.700 art. 214 caput [D04] |
| Acima disso, **obrigada ao Lucro Real** (e só quem não está obrigada pode optar) | Lei 9.718 art. 14 I [D01]; RIR arts. 257 I e 587 § 3º [D03]; IN 1.700 art. 59 I [D04] |
| "Receita total" = receita bruta + ganhos em bolsa/balcão + rendimentos de aplicações + demais receitas e ganhos de capital (+ incisos V–VI) | IN 1.700 art. 59 § 1º [D04] |
| Se Y−1 foi Presumido, mede-se pelo critério adotado (caixa × competência) | Lei 9.718 art. 13 § 2º [D01] |
| A opção vale para o ano todo; manifesta-se com o pagamento da 1ª quota do 1º período (ou do período de início, se começou a partir do 2º trimestre) | Lei 9.718 art. 13 § 1º [D01]; RIR art. 587 § 4º [D03]; IN 1.700 art. 214 §§ 2º–3º [D04] |
| Quem começa a atividade no próprio ano não tem Y−1: o teto não se aplica no ano de início | **inferido** de art. 13 caput ("ano-calendário anterior") + IN 1.700 art. 214 § 3º — confirmação em P-PT-3 |

**O que o código faz hoje (lido):** `lucroRealObrigatorio` existe só no REAL (`CompanyFiscalProfileDto.ts:179`) e serve
para escolher o código de receita (0220 × 3373, `taxAssessmentCalc.ts:582-585`). Nenhum caminho lê a receita de Y−1. O
PRESUMIDO é aceito no perfil e apurado em `calcular` qualquer que seja a receita do ano anterior.

## 2. Fatiamento

Um PR (backend). Pequeno o bastante para não fatiar; o FE do campo declarado é nó vizinho (§8).

## 3. Checklist numerado (cada item = ≥ 1 teste)

Caminhos relativos a `server/`. Padrão de camada (Contrato §2/§3): a leitura nova do razão entra no repositório, o cálculo
em função pura em `models/`, o serviço só orquestra. Itens marcados **[F-PT-n]** dependem do fork; o texto segue a
recomendação e muda se o dono escolher outro caminho.

1. **Parâmetros na tabela `TAX_ASSESSMENT` [F-PT-7]** (migração de dado com prólogo defensivo — SQLite não é
   transacional): `PRESUMIDO_TETO_ANO_REAIS` = 78.000.000 e `PRESUMIDO_TETO_MES_REAIS` = 6.500.000, `vigenteDesde`
   2014-01-01, `PUBLISHED`, `fonte` = "Lei 9.718/1998 art. 13 caput e art. 14 I (red. Lei 12.814/2013)". **Em reais, não
   centavos:** `LegalParameter.valorInt` é `Int` de 32 bits (`schema.prisma`, máx. 2.147.483.647) e R$ 78 mi em centavos
   (7,8 × 10⁹) não cabe; a leitura multiplica por `100n` em `bigint`. As duas chaves entram no union `ChaveParametro`
   (`models/taxAssessmentParams.ts`) e a versão da tabela sobe. A linha é lida na data `Y-01-01`. Sem linha vigente ⇒
   `SemLinhaVigenteError` (falha ruidosa, precedente F-PR4-7). Teste: leitura em 2014-01-01 e em 2026-01-01 devolve
   7.800.000.000n / 650.000.000n centavos; antes de 2014 ⇒ erro nomeado.
2. **Função pura `tetoPresumido`** (`models/presumidoTeto.ts`): entrada `{ ano, receitaTotalAnteriorCents: bigint | null,
   mesesAtividadeAnterior: number | null, inicioAtividadeNoAno: boolean, tabela }`; saída do §4.2. Regras: início no
   próprio ano ⇒ `NAO_SE_APLICA` (§1, última linha); receita desconhecida ⇒ `NAO_CONFERIDO`; meses < 12 ⇒ limite =
   `TETO_MES × meses`; senão `TETO_ANO`; `receita > limite` ⇒ `EXCEDIDO` (o caput do art. 13 admite **igual**). Testes:
   78.000.000,00 exato ⇒ `DENTRO`; +1 centavo ⇒ `EXCEDIDO`; 6 meses e R$ 39.000.000,01 ⇒ `EXCEDIDO`; início no ano ⇒
   `NAO_SE_APLICA`.
3. **Meses de atividade de Y−1 [F-PT-4]:** vem de `inicioAtividadeEm` (perfil de Y−1; na falta, o de Y se a data cair em
   Y−1). Início em Y−1 ⇒ `13 − mês` (o mês de início conta inteiro, como `SimplesApuracaoService.ts:748`); início antes de
   Y−1 ou sem data ⇒ 12, com aviso "meses de atividade de Y−1 não informados — usado o teto anual". Teste por caso.
4. **Receita total de Y−1 lida do razão [F-PT-2, F-PT-3, F-PT-6]:** método novo no repositório de postings, por **dono**
   (todas as unidades da PJ, como `unitIdsWithMovement`): Σ (crédito − débito) de toda conta analítica de natureza
   `Revenue` em `[Y−1-01-01, Y−1-12-31]`, status `LEDGER_STATUSES`, **sem** o lançamento de encerramento (mesma exclusão de
   `receitaBrutaPorAtividade`, D-2026-10-03-INTEGRACAO-REKEY-ECF-X7 §2) e **sem** as contas de dedução de PIS/COFINS do perfil
   fiscal de cada unidade (F-PCB-1R a). Devoluções (3.2) reduzem, como na receita bruta. Sem movimento em Y−1 ⇒ `null`.
   Teste com 2 unidades, conta financeira (3.5.x), devolução, encerramento e conta de dedução: só as certas entram.
5. **Campo declarado `receitaTotalAnoAnteriorCents` no perfil fiscal da empresa [F-PT-2]:** `BigInt?` (migração aditiva;
   memória "MAX_CENTS é política"), DTO `z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().default(null)` —
   **não** `MAX_CENTS` (`models/money.ts:20` = R$ 21.474.836,47, abaixo do próprio teto; com ele o 400 recusaria
   justamente quem passou dos R$ 78 mi) —, só em
   PRESUMIDO/REAL (`superRefine`: outro regime ⇒ 400 nomeado). Entra na allowlist de `company_fiscal_profile.updated`
   (`audit/auditCanonical.ts`, mesma mudança). `copyFrom` **zera** o campo (é do ano, não se copia). Teste: SIMPLES com o
   campo ⇒ 400; cópia de perfil ⇒ campo nulo; auditoria grava o valor.
6. **Valor usado = maior entre razão e declarado [F-PT-2]:** os dois nulos ⇒ `NAO_CONFERIDO`; os dois presentes e
   diferentes ⇒ usa o maior e avisa "receita de Y−1 no razão (R$ x) difere da declarada (R$ y)". Teste dos 4 casos.
7. **Critério de caixa em Y−1:** perfil de Y−1 PRESUMIDO com `ecf.indRecReceita = '1'` ⇒ o razão (competência) não é a
   medida da lei (art. 13 § 2º [D01]); vale só o declarado; sem declarado ⇒ `NAO_CONFERIDO` com o motivo. Teste.
8. **Serviço `PresumidoTetoService.avaliar(scope, ano)`** (lê perfis Y e Y−1, item 4, tabela; chama o item 2). Sem rota
   própria [F-PT-1]. Factory registra.
9. **Superfície [F-PT-1]:**
   a. `GET` de obrigações do perfil (`CompanyFiscalProfileService.obligations`): perfil PRESUMIDO ⇒ preenche o `avisos`
      que hoje volta sempre `[]` com `EXCEDIDO` / `NAO_CONFERIDO`. Sem mudar o shape.
   b. Prévia da apuração Presumido (`TaxAssessmentService.calcular`, ramo `PRESUMIDO`, Txx): o mesmo aviso em `avisos`.
   c. **Confirmação** da apuração Presumido com `EXCEDIDO` ⇒ 400 nomeado, citando Lei 9.718 art. 14 I e o valor/limite.
      Vale também para `confirmarPeloSistema` (recálculo por parâmetro legal): o job registra o 400 como falha nomeada.
      `NAO_CONFERIDO` não bloqueia (só avisa).
   d. O 400 de (c) nasce em `calcular`, fora da tx, como a receita do período; o campo declarado já está coberto pelo gate
      "perfil igual ao lido" dentro da tx (`TaxAssessmentService.ts:288`). Teste: declarar depois da prévia ⇒ 409 do gate
      existente, não confirmação com dado velho.
10. **REAL com `lucroRealObrigatorio = false` e receita de Y−1 `EXCEDIDO` ⇒ aviso [F-PT-5]** nas obrigações (o código
    deveria ser 0220 de obrigada). O inverso (`true` com receita dentro) é válido (outros incisos do art. 14) e não avisa.
11. **Gates do PR:** snapshot de shape do `CompanyFiscalProfileDto` (inserir só a entrada nova — memória "UPDATE do snapshot
    reordena"); `tsc` do server limpo (`tsconfig.test.json` também); `check:arch` sem violação nova; nenhuma rota nova (o
    guard de path-count do openapi não muda); i18n não se aplica (mensagens do backend em pt).

## 4. Contratos esboçados

### 4.1 Prisma

```prisma
model CompanyFiscalProfile {
  // ...
  // PRESUMIDO-TETO-78MI item 5 (F-PT-2): receita total do ano anterior declarada (IN 1.700 art. 59 § 1º), em centavos.
  // Só PRESUMIDO/REAL. Não é copiada para outro ano.
  receitaTotalAnoAnteriorCents BigInt?
}
```

### 4.2 Zod / TS

```ts
// dtos/CompanyFiscalProfileDto.ts — dentro do UpsertCompanyFiscalProfileSchema (.strict())
receitaTotalAnoAnteriorCents: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().default(null), // não MAX_CENTS (item 5)
// superRefine: regime ∉ {PRESUMIDO, REAL} && valor !== null ⇒ issue em ['receitaTotalAnoAnteriorCents']

// models/presumidoTeto.ts
export type SituacaoTeto = 'DENTRO' | 'EXCEDIDO' | 'NAO_CONFERIDO' | 'NAO_SE_APLICA';
export interface TetoPresumidoInput {
  ano: number;                                  // Y (ano da opção)
  receitaRazaoCents: bigint | null;             // item 4
  receitaDeclaradaCents: bigint | null;         // item 5
  razaoValido: boolean;                         // false no caixa em Y−1 (item 7)
  mesesAtividadeAnterior: number | null;        // item 3 (null ⇒ 12 + aviso)
  inicioAtividadeNoAno: boolean;                // início em Y ⇒ NAO_SE_APLICA
  tabela: TabelaApuracao;                       // PRESUMIDO_TETO_ANO_REAIS / _MES_REAIS na data Y-01-01 (× 100n)
}
export interface TetoPresumidoResultado {
  situacao: SituacaoTeto;
  receitaUsadaCents: bigint | null;
  limiteCents: bigint | null;
  mesesConsiderados: number | null;
  fonte: 'RAZAO' | 'DECLARADA' | null;
  avisos: string[];                             // textos com artigo citado
}

// repositories/IPostingRepository.ts
/** PRESUMIDO-TETO-78MI item 4: Σ(crédito − débito) das contas Revenue analíticas do DONO em [from, to], sem encerramento
 *  e sem as contas excluídas. null = nenhuma posting. */
sumRevenueNetByOwner(ownerUserId: string, statuses: string[], from: Date, to: Date, excludeAccountIds: string[]): Promise<bigint | null>;
```

### 4.3 Rotas

Nenhuma nova. Mudam só o conteúdo de `avisos` em `GET .../company-fiscal-profile/:ano/obligations` e na prévia da
apuração, e a confirmação ganha um 400.

## 5. Forks — **RATIFICAÇÃO PENDENTE** (nenhum se auto-ratifica)

| Fork | Caminhos | Recomendação | Por quê |
|---|---|---|---|
| **F-PT-1** Forma | (a) só avisar (perfil/obrigações + prévia); (b) 400 no `PUT` do perfil PRESUMIDO; (c) avisar no perfil/obrigações e na prévia **+ 400 na confirmação** da apuração Presumido | **(c)** | A confirmação é o efeito irreversível (provisão e DARF com código de Presumido) — memória "efeito irreversível antes do gate". Bloquear o `PUT` (b) trava o cadastro de dezembro, quando Y−1 ainda não fechou, e lançamentos retroativos de Y−1 mudam o número depois. (a) segue o precedente do Simples (`WARNING`), mas lá a exclusão depende de ato; aqui a obrigação é direta da lei (art. 14 I). |
| **F-PT-2** Fonte da receita de Y−1 | (a) só o razão; (b) só o valor declarado no perfil de Y; (c) o **maior** dos dois, com aviso se divergem; (d) declarado prevalece sobre o razão | **(c)** | O razão sozinho falha para quem migrou no meio de Y−1 (subestima); o declarado sozinho falha para quem esquece de preencher. O maior dos dois é conservador e não deixa o declarado esconder o razão (d). O histórico mensal do Simples (`SimplesHistoricoMensal`) não é reuso: é objeto do Simples, por mês (critério reuso × divergência). |
| **F-PT-3** Medida | (a) **receita total** (todas as contas `Revenue` analíticas, sem dedução de PIS/COFINS, sem encerramento); (b) só receita bruta (3.1/3.3/3.4, `receitaBrutaPorAtividade`) | **(a)** | É a leitura da RFB nos dois artigos (IN 1.700 arts. 59 I e 214) e a mais segura (ambiguidade 1 do dossiê). Fica sujeita a P-PT-1. (b) deixa fora receita financeira e ganho de capital. |
| **F-PT-4** Meses no ano de início em Y−1 | (a) mês de início conta inteiro (`13 − mês`, como o Simples); (b) só meses completos | **(a)** | Mesma regra que o código já usa no Simples; o efeito é nulo para salão/clínica (R$ 6,5 mi por mês). Sujeita a P-PT-2. |
| **F-PT-5** REAL × `lucroRealObrigatorio` | (a) avisar quando REAL + `false` + receita `EXCEDIDO`; (b) fora deste nó | **(a)** | Mesmo número, mesma leitura; o código de receita errado (3373 em vez de 0220) sai no DARF. Só aviso: a obrigação pode vir de outros incisos do art. 14. |
| **F-PT-7** Guardar R$ 78 mi na tabela legal (`valorInt` é `Int` 32 bits) | (a) chave em **reais** (`..._REAIS`, × 100n na leitura); (b) `valorTexto` com o `bigint` em string; (c) migrar `valorInt` para `BigInt` na tabela inteira | **(a)** | Valor redondo em reais, sem perda; (b) cria um segundo formato de número na tabela; (c) mexe em toda leitura de parâmetro legal (Simples, X7, PIS/COFINS) por causa de duas linhas. |
| **F-PT-6** Leitura multi-unidade | (a) método novo no repositório por **dono** (`sumRevenueNetByOwner`); (b) laço por unidade montando um `AccountingScope` para cada uma | **(a)** | O teto é da PJ (todas as unidades). Precedente de leitura por dono: `unitIdsWithMovement` (F-X7-7 a). (b) monta escopo de outra unidade fora do fluxo de autenticação. |

## 6. Pendente de validação externa (contador — não são forks)

| # | Pergunta | Trava | Quem |
|---|---|---|---|
| **P-PT-1** | Para o teto de R$ 78 mi vocês usam a receita total da IN 1.700 art. 59 § 1º (com financeiras e ganhos de capital) ou só a receita bruta? | F-PT-3 | contador |
| **P-PT-2** | No teto proporcional (R$ 6,5 mi × meses), o mês em que a empresa abriu conta como mês inteiro? | F-PT-4 | contador |
| **P-PT-3** | Confirma que no ano de início de atividade não há teto a conferir (não existe ano anterior)? | item 2 (`NAO_SE_APLICA`) | contador |

## 7. Insumos ausentes

1. A IN RFB 1.700 não está no acervo `ctresb/leis` — lida no site da RFB (visão "Multivigente"); se o dono quiser o texto
   compilado salvo, falta um download que funcione (o `legal.py baixar` trouxe só a casca JS).
2. Onde o produto lança **ganho de capital** na venda de imobilizado (conta `Revenue` ou líquido em outra natureza) — não
   varrido (regra 2). Se não for `Revenue`, o item 4 não o soma; o executor confere no C8 e registra.

## 8. Achados fora de escopo (não planejados)

1. **FE:** o campo `receitaTotalAnoAnteriorCents` e os avisos na tela do perfil fiscal (seção Presumido do #809) — nó FE
   vizinho, exige pedido próprio.
2. Os outros incisos do art. 14 (II–VII: atividade financeira, lucro do exterior, benefício fiscal, estimativa mensal,
   factoring, securitização) também obrigam ao Real e não são conferidos — fora do nó.
3. PIS/COFINS cumulativo e a ECF do Presumido também pressupõem a opção válida; não ganham o aviso neste PR.
4. Passagem de Presumido para Real no meio do ano (art. 214 § 3º-A, lucro do exterior; Lei 9.430 art. 26 §§ 3º–4º) —
   já registrada como fork em 10/10 no X7, não tocada aqui.

## 9. Fold desta sessão

`docs/plano/nos/PRESUMIDO-TETO-78MI.md`: `estado` continua `planned`; `estado_detalhe` ganha a entrada de 22/10 (BRIEF
escrito, PR deste BRIEF, forks F-PT-1..7 pendentes, P-PT-1..3 com o contador, próximo = ratificar forks e depois `executa`);
`autorizacao` ganha a citação de 22/10 (só BRIEF); "Docs" aponta para este arquivo e para o dossiê.

## 10. Invariantes (cada uma vira teste)

1. Receita = limite ⇒ `DENTRO` (o caput admite igual); limite + 1 centavo ⇒ `EXCEDIDO`.
2. Início de atividade em Y ⇒ `NAO_SE_APLICA`, nunca 400.
3. Sem receita de Y−1 (razão e declarado nulos, ou caixa sem declarado) ⇒ `NAO_CONFERIDO`, só aviso, nunca 400.
4. `EXCEDIDO` ⇒ 400 na confirmação do Presumido; prévia e obrigações só avisam [F-PT-1 c].
5. O encerramento de Y−1 e as contas de dedução de PIS/COFINS nunca entram na soma.
6. A soma cobre todas as unidades do dono.
7. `copyFrom` nunca leva o valor declarado para outro ano.
8. Nenhum caminho de MEI/SIMPLES lê o teto.
9. Declarar R$ 78.000.000,01 no perfil é aceito (nenhum teto de DTO abaixo do teto legal) e a soma acima de 2³¹ centavos
   não estoura (tudo em `bigint`).
