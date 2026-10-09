# BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI — piso de 2% do ISS com benefício municipal + ocupações do MEI (Anexo XI) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código. Nenhum fork deste documento se auto-ratifica.
> **Autorização:** dono, chat, 2026-10-10: *"abre o BRIEF dos dois"* (repassada pelo orquestrador). Cobre **só** o
> BRIEF dos dois blocos abaixo. **Não** cobre código, `executa` nem ratificação de fork.
> **Nó no vault:** [`SIMPLES-PISO-ANEXO-XI`](../plano/nos/SIMPLES-PISO-ANEXO-XI.md) (`planned`, depende de [[X14]]).
> **Base:** `origin/main` `0f05a8b2` (re-fetch 2026-10-09).
> **Graus:** **V-corpus** = li o artigo no corpus versionado `docs/accounting/fontes-oficiais/` nesta sessão ·
> **V-web** = li na fonte oficial da web nesta sessão · **I** = inferido · **A** = assumido.

## 0. Concorrência e ordem (ler antes de tudo)

Outra sessão executa X14 F-PR4-8/10/12 na branch `origin/claude/x14-pr4-forks-8-10-12` (sem PR mergeado na base
acima). Ela acrescenta `CompanyFiscalProfile.simplesRegimeApuracao` **no mesmo ponto do schema** (logo após
`meiTransportadorCargas`) e toca os mesmos arquivos que este incremento tocaria: `schema.prisma`,
`CompanyFiscalProfileDto.ts` (+ `.gen.ts`), `__dto-shapes__.json`, `auditCanonical.ts`,
`CompanyFiscalProfileService.ts`, `ICompanyFiscalProfileRepository.ts`, `SimplesApuracaoService.ts` (V — `git diff
--stat origin/main...origin/claude/x14-pr4-forks-8-10-12`).

**Ordem obrigatória:** nenhum PR deste BRIEF abre antes de o PR de F-PR4-8/10/12 estar mergeado em `main`; o
executor parte de `main` posterior a ele. Este BRIEF foi lido só sobre `main`; os números de linha citados podem
andar. A recomendação de F-PI-1 (tabela própria, fora do `CompanyFiscalProfile`) também reduz a colisão do bloco 1.

## 1. Contexto fixo (fato consumado no repo)

- `SimplesApuracaoService.aliquotas()` (`server/src/features/accounting/services/SimplesApuracaoService.ts`
  ~l.574-640) sugere o % de ISS da retenção pela faixa; **sem piso no percentual da tabela** (F-PR4-5 → (a),
  `docs/plano/decisoes/D-2026-10-09-X14-PR4-FORKS.md:26`). O aviso `AVISOS_ALIQUOTA` (~l.117-120) diz que
  "isenção ou redução municipal do ISS não entra nesta sugestão (art. 27 § 1º)". V (lido).
- `FiscalProfile.issAliquotaBp` (por unidade) aceita 0..máximo de `ISS_LIMITE`; **mínimo de 2% não validado** —
  pendência D-4 do `BE-INCR-LEGAL-PARAMS-brief.md` §2 ("pendência de contador — não corrigida",
  `FiscalProfileDto.ts:79-80`). V.
- MEI: `CompanyFiscalProfile.meiContribuinteIcms` / `meiContribuinteIss` / `meiTransportadorCargas` (declarados,
  X14 PR-4); `limiteMei()` (~l.496-530) usa `SIMPLES_LIMITE`/`MEI` ou `MEI_TAC`. CNAE: `declarante.cnaeFiscal`
  (7 dígitos, `CompanyFiscalProfileDto.ts:57`) e `FiscalProfile.cnae` por unidade. **Nenhuma validação contra o
  Anexo XI.** V.
- Padrão de tabela legal de plataforma: `LegalParameter` (`tabela`, `chave`, `discriminador`, `valorJson`,
  `fonte`, `fonteUrl`, `fonteSha256`, `vigenteDesde/Ate`, `status`) — exemplar `DEPRECIACAO_ANEXO_III` (#574,
  `dc6fb361`: chave = `sourceRow`, tudo no `valorJson`, fixture gerada com sha). V.

## 2. Base legal lida

### 2.1 Piso de 2% (bloco 1)

| # | Claim | Fonte | Grau |
|---|---|---|---|
| L1 | A alíquota mínima do ISS é 2% (caput, incl. LC 157/2016). | LC 116 art. 8º-A caput — planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm | V-web |
| L2 | O ISS não pode ter isenção, redução de base, crédito presumido ou benefício "sob qualquer outra forma" que resulte em carga menor que 2%, **exceto subitens 7.02, 7.05 e 16.01**. | LC 116 art. 8º-A § 1º (incl. LC 157/2016) | V-web |
| L3 | É nula a lei municipal que desrespeite o mínimo **quando o tomador/intermediário está em outro Município**; o prestador tem direito à restituição perante o Município infrator. | LC 116 art. 8º-A §§ 2º–3º | V-web |
| L4 | Município pode conceder isenção/redução de ISS à ME/EPP do Simples (art. 31 I) ou valor fixo (II); **quanto ao ISS, esses benefícios não podem resultar em percentual menor que 2%, exceto 7.02, 7.05 e 16.01**. | Res. CGSN 140 art. 31 I-II e p.ú. | V-corpus |
| L5 | O benefício é concedido **como redução do percentual efetivo do ISS** dos Anexos I–V; pode ser diferenciado por ramo de atividade (art. 32 II) e por faixa de receita (§ 2º); a lei municipal traz as condições e o % de redução por faixa ou para todas (§ 3º). | Res. CGSN 140 art. 32 II, §§ 1º–3º | V-corpus |
| L6 | Na retenção, a prestadora com isenção/redução municipal informa no documento a alíquota aplicável **e a legislação concessiva**. | Res. CGSN 140 art. 27 § 1º | V-corpus |
| L7 | O piso **não** se aplica ao % efetivo puro da tabela (ex. 1,92%): a regra de 2% do art. 31 p.ú. recai sobre o resultado do **benefício**. | F-PR4-5 (a) ratificado + leitura de L4/L5 | I (ratificado) |
| L8 | LC 214 inseriu art. 8º-B na LC 116: redução proporcional das alíquotas municipais de 2029 a 2032 (transição ao IBS). Interação com o piso de 2% não lida. | LC 116 art. 8º-B | V-web (existência); I (efeito) → §6 |

### 2.2 Anexo XI (bloco 2)

| # | Claim | Fonte | Grau |
|---|---|---|---|
| M1 | MEI exerce, de forma independente e exclusiva, **apenas** as ocupações do Anexo XI; receita até R$ 81.000,00. | Res. CGSN 140 art. 100 caput | V-corpus |
| M2 | É vedado ao MEI exercer ocupação não prevista no Anexo XI. | art. 100 § 1º-C I | V-corpus |
| M3 | Transportador autônomo de cargas com ocupação **exclusiva** da Tabela B: R$ 251.600,00; início = R$ 20.966,67 × meses. | art. 100 § 1º-A I-II | V-corpus (já implementado como `MEI_TAC`) |
| M4 | Qualquer ocupação fora da Tabela B no ano ⇒ limites do caput/§ 1º (R$ 81.000) e parcela do art. 101 I "b". | art. 100 § 1º-B | V-corpus |
| M5 | A parcela ICMS/ISS do DAS-MEI segue o enquadramento do Anexo XI + CNAE/endereço do CNPJ na 1ª geração do DAS do mês de início ou do 1º mês do ano. | art. 101 § 1º I-II | V-corpus |
| M6 | Alteração do rol: ocupação incluída ⇒ opção a partir do ano de efeitos; ocupação excluída ⇒ art. 115 (desenquadramento; comunicação até o último dia útil do mês do impedimento, efeitos no 1º dia do mês de efeitos da alteração). | art. 101 § 3º I-II; art. 115 (l. 2967) | V-corpus |
| M7 | CNAE incluído no CNPJ fora do Anexo XI ⇒ desenquadramento de ofício. | art. 116 (l. 2973) II | V-corpus |
| M8 | O Anexo XI vigente é o binário **id 81177** ("Anexo XI.pdf"; 8 versões anteriores marcadas `[REVOGADO]`). Título: *"Ocupações Permitidas ao MEI - Tabelas A e B"*; colunas OCUPAÇÃO · CNAE · DESCRIÇÃO SUBCLASSE CNAE · ISS (S/N) · ICMS (S/N). | corpus `Res-CGSN-140-2018.txt` l.3921-3948 + PDF baixado de `normasinternet2…/ato/92278/anexo/81177` (sha256 `cb3845804f3c14cb9cb1320aee19bf14498cf15988cd9263fd4618d8faaab8b6`, 568.798 bytes) | V-web |
| M9 | Tabela A ≈ 467 pares ocupação×CNAE (350 CNAEs distintos; a mesma subclasse serve várias ocupações); Tabela B = 2 ocupações agrupadas × 4 CNAEs (4930-2/01..04), com ISS/ICMS por CNAE. Contagem por regex em `pdftotext -layout` — **não** é a contagem do parser final. | PDF id 81177 | V-web (aproximado) |
| M10 | O PDF tem quebra de linha dentro de células (ocupação e descrição em 2–3 linhas, flags ISS/ICMS deslocados) — transcrição exige parser com regra nominal por anomalia. | PDF id 81177 | V-web |
| M11 | A compilação RFB do corpus vai até a Res. CGSN 183/2025; **a 191/2026 não está compilada** — se ela mexeu no Anexo XI, o id 81177 pode não ser o vigente. | `fontes-oficiais/MANIFEST.md:54` | V-corpus → §6 |

## 3. Checklist numerado de comportamentos

### Bloco 1 — piso de 2% com benefício municipal (F-PI-*)

1. **Cadastro do benefício municipal** (forma pendente F-PI-1; recomendação: model Prisma first-class
   `IssBeneficioMunicipal` por escopo, ligado à unidade/`codMun`). Campos: `codMun` (IBGE 7), `cTribNacPrefixos`
   (lista; vazia = todos os serviços — art. 32 II), `tipo` (`ISENCAO` | `REDUCAO_PERCENTUAL` | `VALOR_FIXO`),
   `reducaoBpPorFaixa` (6 posições, ou uma para todas — art. 32 §§ 2º–3º), `legislacao` (texto obrigatório — art.
   27 § 1º), `vigenteDesde`/`vigenteAte`. Cadeia Route→Controller→Service→Repository→Prisma + Policy, Factory, DTO
   Zod `.strict()`, soft-delete, auditoria (eventType novo no `auditCanonical.ts` na mesma mudança). Teste: CRUD +
   policy + soft-delete.
2. **Regra de aplicação** (função pura `issComBeneficio`, em `models/`): dado `issTabelaBp` (% efetivo do ISS da
   faixa), o benefício vigente e o `cTribNac`, devolve `issAplicadoBp = min(issTabelaBp, max(reduzido, 200))`, onde
   `reduzido = issTabelaBp × (1 − redução)` (isenção ⇒ 0). Base: L4/L5 (V-corpus). O `min` com a tabela é **F-PI-2**
   (o piso não pode elevar o ISS acima do que a tabela daria — L7). Testes de tabela: 1,92% sem benefício ⇒ 1,92%
   (guarda de regressão de F-PR4-5); 3,5% com redução de 50% ⇒ 2,00%; 3,5% com redução 20% ⇒ 2,80%; isenção ⇒ 2,00%
   (ou 1,92% se a tabela é 1,92%, F-PI-2).
3. **Exceções 7.02, 7.05, 16.01** (L2/L4, V): sem piso — `issAplicadoBp = reduzido`. Identificação pelo `cTribNac`:
   os 4 primeiros dígitos = item+subitem (`0702`, `0705`, `1601`) — **I** (formato do `cTribNac` em
   `lc116ListaNacional.ts` não conferido; o executor confirma no arquivo e no leiaute DPS antes de codar). Teste por
   subitem.
4. **Retenção (`aliquotas()`)**: cada atividade com benefício vigente na competência M devolve `issRetencao` =
   `issAplicadoBp`, mais `beneficioMunicipal: { legislacao, tipo, pisoAplicado: boolean } | null` (art. 27 § 1º
   exige a legislação no documento). O aviso de `AVISOS_ALIQUOTA[1]` muda de "não entra" para a regra nova. O ramo
   `INICIO_ATIVIDADE` (2% fixo, art. 27 II) **não muda** — F-PI-4.
5. **Apuração do DAS (parcela ISS)** — **F-PI-3** (escopo): recomendação (b) aplicar o mesmo `issAplicadoBp` à parcela
   ISS da atividade no `montar()` (art. 32 § 1º: o benefício é redução do % efetivo dos Anexos). Se (a), o item sai
   do checklist e vira achado fora de escopo.
6. **`VALOR_FIXO` (art. 31 II / art. 33)**: fora do cálculo — só alerta informativo `ISS_VALOR_FIXO_MUNICIPAL`
   apontando a legislação (**F-PI-5**).
7. **Escopo territorial do piso** (L3): o piso vale sempre (art. 31 p.ú. não distingue), e a nulidade do § 2º só
   gera direito de restituição — **F-PI-6**; recomendação: aplicar sempre, sem ramo por domicílio do tomador.
8. **D-4 do LEGAL-PARAMS** (`FiscalProfile.issAliquotaBp` sem mínimo): **fora** deste incremento — o campo é a
   alíquota do regime normal / NFS-e, não o % do Simples. Registrado em §8.
9. Gates do diff: snapshot de shape dos DTOs (novo DTO + `AliquotasSimples`), paridade i18n se houver mensagem
   nova, `auditCanonical.ts`, path-count do openapi (rotas novas do item 1), `tsc` limpo.

### Bloco 2 — Anexo XI (F-AX-*)

10. **Fixture transcrita**: `server/src/features/accounting/fixtures/anexo-xi-res-cgsn-140-2018.json` gerada por
    script (`scripts/` — padrão `anexo-iii-in-1700-2017.json`) a partir do PDF id 81177, com `fonteSha256`
    `cb384580…aab8b6`, contagens asseridas por tabela (A/B) e regra nominal por anomalia de layout (M10). Método:
    **F-AX-1**. "Diff vazio é o teste": rerodar o script reproduz o JSON byte a byte.
11. **Tabela de plataforma `MEI_ANEXO_XI`** em `LegalParameter` (semente versionada como `DEPRECIACAO_ANEXO_III`):
    `chave` = ordinal da linha na fonte (`A-0001`, `B-0001`…), **nunca** o CNAE (repete — M9); `discriminador` =
    `A` | `B`; `valorJson` = `{ ocupacao, cnae, descricaoCnae, iss: boolean, icms: boolean }`; `fonte` = "Res. CGSN
    140/2018 Anexo XI (id 81177)"; `vigenteDesde` = **F-AX-5**. Enum de `tabela` e `formatoLinha.ts` ganham o tipo.
12. **Declaração da ocupação no perfil** (**F-AX-2**; recomendação (a)): `CompanyFiscalProfile.meiOcupacoes` =
    lista de chaves do Anexo XI (1..N; principal + secundárias), obrigatória quando `regime = MEI` (ano ≥ ano de
    publicação da tabela). DTO rejeita (400) chave inexistente ou fora da vigência no ano. Coluna nova colide com
    o PR de F-PR4-12 — §0.
13. **Consistência ICMS/ISS** (M5, **F-AX-3**; recomendação (b) alerta): se as ocupações declaradas implicam
    `iss`/`icms` diferente de `meiContribuinteIss`/`meiContribuinteIcms`, alerta `MEI_ENQUADRAMENTO_DIVERGE` na
    apuração — não sobrescreve o declarado.
14. **Tabela B × `meiTransportadorCargas`** (M3/M4): `meiTransportadorCargas = true` exige **todas** as ocupações
    na Tabela B; ocupação da Tabela A junto ⇒ `limiteMei` usa `MEI` (R$ 81.000), não `MEI_TAC`, e alerta
    `MEI_TAC_COM_OCUPACAO_A` (§ 1º-B). Teste de tabela: só B ⇒ MEI_TAC; B+A ⇒ MEI; flag true sem B ⇒ 400 ou alerta
    (**F-AX-4**).
15. **CNAE do CNPJ fora do Anexo XI** (M2/M7): `declarante.cnaeFiscal` e `FiscalProfile.cnae` das unidades sem
    correspondência em nenhuma linha vigente ⇒ alerta `MEI_CNAE_FORA_ANEXO_XI` (desenquadramento de ofício, art.
    116 II). Formato: o CNAE do perfil tem 7 dígitos sem máscara; o do Anexo vem `0000-0/00` — normalizar. Bloqueio ×
    alerta: **F-AX-4**.
16. **Ocupação que deixou de constar** (M6): ocupação declarada sem linha vigente no ano ⇒ alerta
    `MEI_OCUPACAO_EXCLUIDA` citando art. 101 § 3º II / art. 115. Depende de F-AX-5 (vigência por linha).
17. Gates: semente + teste de contagem, snapshot de shape, `auditCanonical.ts` (campo novo do perfil), i18n,
    `tsc` limpo.

## 4. Contratos (esboço Zod — materializa a `sessao-feature`)

```ts
// Bloco 1 — dtos/IssBeneficioMunicipalDto.ts
export const ISS_BENEFICIO_TIPO = ['ISENCAO', 'REDUCAO_PERCENTUAL', 'VALOR_FIXO'] as const;
export const IssBeneficioMunicipalCreateDto = z.object({
  unitId: z.string().min(1),
  codMun: z.string().regex(/^\d{7}$/),
  cTribNacPrefixos: z.array(z.string().regex(/^\d{4}(\d{2})?$/)).max(50).default([]), // [] = todos
  tipo: z.enum(ISS_BENEFICIO_TIPO),
  // 6 faixas (Anexos III/IV/V) ou 1 valor para todas; bp de 0..10000 (redução sobre o % efetivo — art. 32 § 1º)
  reducaoBpPorFaixa: z.array(z.number().int().min(0).max(10000)).min(1).max(6).nullable(),
  legislacao: z.string().trim().min(3).max(300), // art. 27 § 1º
  vigenteDesde: dateOnly, vigenteAte: dateOnly.nullable().default(null),
}).strict()
  .refine(v => v.tipo !== 'REDUCAO_PERCENTUAL' || v.reducaoBpPorFaixa !== null, { path: ['reducaoBpPorFaixa'] })
  .refine(v => v.reducaoBpPorFaixa === null || [1, 6].includes(v.reducaoBpPorFaixa.length), { path: ['reducaoBpPorFaixa'] });

// models/issBeneficio.ts — função pura
export function issComBeneficio(i: { issTabelaBp: number; faixa: number; cTribNac: string;
  beneficio: { tipo: 'ISENCAO' | 'REDUCAO_PERCENTUAL'; reducaoBpPorFaixa: number[] | null } | null }):
  { issAplicadoBp: number; pisoAplicado: boolean; excecaoPiso: boolean };

// Saída de aliquotas(): acréscimo por atividade
beneficioMunicipal: { legislacao: string; tipo: IssBeneficioTipo; pisoAplicado: boolean; excecaoPiso: boolean } | null

// Bloco 2 — linha MEI_ANEXO_XI (valorJson)
export const MeiAnexoXiLinha = z.object({
  ocupacao: z.string().min(1),
  cnae: z.string().regex(/^\d{4}-\d\/\d{2}$/),
  descricaoCnae: z.string().min(1),
  iss: z.boolean(), icms: z.boolean(),
}).strict();
// CompanyFiscalProfileDto — acréscimo
meiOcupacoes: z.array(z.string().regex(/^[AB]-\d{4}$/)).min(1).max(20).nullable().default(null),
// superRefine: regime === 'MEI' ⇒ meiOcupacoes !== null; chave deve existir/vigorar (checagem no service, não no DTO)
// Alertas novos (AlertaSimples.codigo): 'MEI_ENQUADRAMENTO_DIVERGE' | 'MEI_TAC_COM_OCUPACAO_A' |
//   'MEI_CNAE_FORA_ANEXO_XI' | 'MEI_OCUPACAO_EXCLUIDA' | 'ISS_VALOR_FIXO_MUNICIPAL'
```

## 5. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-PI-1** | Onde mora o benefício municipal? | (a) campos no `CompanyFiscalProfile` (por ano); (b) campos no `FiscalProfile` (por unidade); (c) campos no `ServiceFiscalProfile` (por serviço); (d) **model próprio `IssBeneficioMunicipal`** por escopo, chave unidade/`codMun` + prefixos de `cTribNac` + vigência | **(d)** — o benefício é lei do Município, varia por ramo (art. 32 II) e por faixa (§ 2º) e tem vigência própria; (a) não carrega município nem serviço, (b) não separa ramo, (c) duplica a lei em cada serviço. (d) também não colide com a coluna nova do PR F-PR4-12. |
| **F-PI-2** | O piso pode **elevar** o ISS acima do % puro da tabela? (ex. tabela 1,92% + isenção) | (a) `min(tabela, max(reduzido, 2%))` — nunca acima da tabela; (b) `max(reduzido, 2%)` — 2% mesmo quando a tabela dá menos | **(a)** — benefício não pode agravar; e F-PR4-5 já fixou que o % puro abaixo de 2% é válido. **I** — confirmar com a leitura do dono (§6 item 1). |
| **F-PI-3** | Escopo do benefício | (a) só a sugestão de retenção (`aliquotas()`); (b) retenção **e** parcela ISS do DAS no `montar()` | **(b)** — art. 32 § 1º define o benefício como redução do % efetivo dos Anexos, que é o DAS; só a retenção deixaria o DAS a maior. Pode ir em 2 PRs (retenção primeiro). |
| **F-PI-4** | Mês de início de atividade (2% fixo, art. 27 II) com benefício | (a) manter 2% fixo; (b) aplicar o benefício também | **(a)** — o inciso II fixa 2% sem ressalva, e 2% já é o piso. |
| **F-PI-5** | Valor fixo de ISS (art. 31 II / 33) | (a) alerta informativo, sem cálculo; (b) modelar valor fixo no DAS | **(a)** — o art. 33 limita a ME até R$ 360 mil e exige regime de estimativa municipal; caso raro, sem fonte de valor no repo. |
| **F-PI-6** | Piso por domicílio do tomador (LC 116 art. 8º-A § 2º) | (a) piso sempre; (b) piso só quando tomador em outro Município | **(a)** — art. 31 p.ú. da Res. 140 não distingue; o § 2º trata de nulidade e restituição, não de alíquota permitida. |
| **F-AX-1** | Transcrição do Anexo XI | (a) script `pdftotext -layout` + parser com contagens asseridas e regra nominal por anomalia; (b) transcrição manual revisada; (c) fonte alternativa (planilha CNAE×ocupação do Portal do Empreendedor) | **(a)** — padrão do #574 e da memória "tabela transcrita de lei"; (c) não é a norma. |
| **F-AX-2** | Granularidade da validação | (a) **ocupação declarada** (chave do Anexo) no perfil, CNAE derivado; (b) só CNAE (aceita se algum par existir) | **(a)** — ISS/ICMS e Tabela B dependem da ocupação; o mesmo CNAE aparece em várias ocupações (M9). |
| **F-AX-3** | ICMS/ISS do Anexo × declarado (`meiContribuinteIcms/Iss`) | (a) derivar e sobrescrever o declarado; (b) alerta de divergência | **(b)** — art. 101 § 1º II usa o CNPJ na 1ª geração do DAS, que o sistema não vê; o declarado continua mandando. |
| **F-AX-4** | Consequência de ocupação/CNAE fora do Anexo | (a) 400 no perfil; (b) alerta na apuração; (c) 400 para chave inexistente + alerta para CNAE do CNPJ fora | **(c)** — escolher fora da lista é erro de dado; CNAE fora é fato a desenquadrar (art. 116), não erro do sistema. |
| **F-AX-5** | `vigenteDesde` da semente e histórico | (a) só a versão vigente (id 81177), `vigenteDesde` = data de efeito da resolução que a publicou; (b) transcrever também as 8 versões revogadas | **(a)** — sem PDF anterior não há cálculo retroativo a sustentar; a data exata depende de §6 item 3. |

## 6. Pendente de validação externa

1. **F-PI-2 (piso × tabela abaixo de 2%)** — nenhuma fonte lida diz se a isenção municipal sobre tabela de 1,92% leva
   a 1,92% ou 2%. **I**.
2. **LC 116 art. 8º-B (LC 214)** — redução das alíquotas municipais 2029–2032; efeito sobre o piso de 2% e sobre o %
   do Simples não lido. Fora do horizonte do incremento até 2029.
3. **Res. CGSN 191/2026** não compilada no corpus (M11) — conferir se alterou o Anexo XI antes do seed; definir a
   data de efeito da versão id 81177.
4. Formato do `cTribNac` × subitem da LC 116 (item 3) — **I**, conferir no leiaute DPS.
5. Pesquisa do dono (colada no chat, não conferida) — ver §9.

## 7. Insumos ausentes

- Lista de leis municipais de benefício (a do Município do salão-piloto) — sem ela o item 1 não tem caso real; o
  teste usa leis fictícias rotuladas.
- PDFs das versões revogadas do Anexo XI (só se F-AX-5 → (b)).

## 8. Achados fora de escopo

- **D-4 do LEGAL-PARAMS** (mínimo de 2% em `FiscalProfile.issAliquotaBp`, regime normal) continua aberto; o piso
  do Simples (este BRIEF) não o resolve.
- **Res. CGSN 191/2026 fora da compilação** afeta todo o X14, não só o Anexo XI.
- Art. 8º-B da LC 116 (transição do ISS) não tem nó no vault.

## 9. Pesquisa do dono × fonte oficial

| Claim da pesquisa | Resultado |
|---|---|
| Piso só com benefício municipal | **Confirma** no Simples (Res. 140 art. 31 p.ú., V-corpus). **Nuance:** a LC 116 art. 8º-A caput (V-web) fixa 2% como alíquota mínima em geral; no Simples o % efetivo vem das tabelas da LC 123, e o piso aparece como limite ao benefício. |
| Exceções 7.02, 7.05, 16.01 | **Confirma** (LC 116 art. 8º-A § 1º; Res. 140 art. 31 p.ú.). |
| Anexo XI rol taxativo | **Confirma em substância** — "apenas as ocupações constantes do Anexo XI" (art. 100 caput) e vedação expressa (§ 1º-C I). A palavra "taxativo" não aparece. |
| Tabela A teto R$ 81.000 | **Confirma com ressalva** — o caput fixa R$ 81.000 para o MEI em geral (não nomeia a Tabela A); a Tabela B é a exceção do § 1º-A. Início de atividade: R$ 6.750 × meses (§ 1º). |
| Tabela B R$ 251.600 | **Confirma** (§ 1º-A I) e acrescenta R$ 20.966,67 × meses no início (II) e a regra do § 1º-B (qualquer ocupação fora da B ⇒ limite geral). |
| (não citado pela pesquisa) | Benefício é redução do % efetivo, por ramo e por faixa (art. 32); legislação concessiva no documento (art. 27 § 1º); art. 8º-B LC 116; Res. 191/2026 não compilada. |
