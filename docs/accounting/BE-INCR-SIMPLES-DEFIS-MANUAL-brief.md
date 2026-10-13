# BE-INCR-SIMPLES-DEFIS-MANUAL — DEFIS: informações da ME/EPP completas pelo manual (§9.4.3.1) (BRIEF)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização:** dono, chat, 2026-10-12: *"Pode seguir por b"* (escopo (b): regra dos 100% + cotas em tesouraria +
> campos que faltam do §9.4.3.1 + condição do lucro contábil), confirmado no questionário do mesmo dia: *"Só os
> BRIEFs (Recomendado)"*. **Sem "executa".**
> **Por quê:** F-FS-8 (c) do [`FE-INCR-SIMPLES-brief.md`](FE-INCR-SIMPLES-brief.md): o PR-D espera esta correção.
> **Fora do escopo por decisão:** §9.4.3.2 (por estabelecimento) e §9.4.3.4 (por município) — continuam como o
> F-SN-9 (a) decidiu (DEFIS espelho mínima); só os estoques seguem no GET.
> **Base:** `origin/main` `9f6477d8`.

## 0. Fatos consumados

| Fato | Fonte | Grau |
|---|---|---|
| Manual do PGDAS-D e DEFIS, versão 17/06/2025, §9.4.3.1 itens 1–9 (lidos nesta sessão; texto extraído do PDF oficial) | sha `e73b2bfc7ede` = `fontes-oficiais/MANIFEST.md:56` | V |
| Item 7.3: "A soma do percentual de participação dos sócios ou titulares da pessoa jurídica deverá ser igual a 100%" | manual p. 92 | V |
| Item 8 (2º, p. 93): cotas em tesouraria; "A soma de todos os percentuais de sócios mais as cotas em tesouraria deve ser 100%" | manual p. 93 | V |
| Item 4: lucro contábil só "caso a ME/EPP mantenha escrituração contábil e tenha evidenciado lucro superior ao limite de que trata o §2º do art. 145" | manual p. 91 | V |
| Res. CGSN 140 art. 145 § 1º: isenção limitada aos percentuais do art. 15 da Lei 9.249 sobre a receita bruta, **menos** o IRPJ devido no Simples; § 2º: não se aplica a quem mantém escrituração e evidencia lucro maior | `Res-CGSN-140-2018.txt:3633-3637` | V |
| Itens 5 e 6: receita de exportação direta ("caso a PJ tenha informado no PGDAS-D") e via comercial exportadora (CNPJ + valor, várias) | manual p. 91 | V |
| Item 1: ganhos de capital (R$); item 9: doações à campanha eleitoral (o manual só traz o título e um botão "clique aqui" de CNPJ) | manual p. 91–92 | V (item 9: campos **não legíveis** no texto extraído) |
| Hoje: `SimplesDefisDigitadoSchema` = empregados início/fim, `ganhosRendaVariavelCents`, `socios[]` (`contactId`, isentos, tributáveis, `participacaoBp`, IRRF); refine soma ≤ 10000 | `dtos/SimplesDto.ts:188-213` | V |
| `lucroContabilCents` = resultado da DRE do ano, **sempre**; DEFIS só ≤ 2026 e anos com DAS registrado | `SimplesDeclaracaoService.ts:97-140` | V |
| Digitado gravado em `SimplesDeclaracaoAnual.dados` (Json) — campo novo sem migração; leitura usa `SimplesDefisDigitadoSchema.parse(row.dados)` (`.strict()`) | `schema.prisma:2708`; `SimplesDeclaracaoService.ts:113` | V |
| Tabela de presunção do IRPJ existe só para SERVICO/REVENDA (`PRESUNCAO_IRPJ`, `PRESUNCAO_IRPJ_REDUZIDA`) | `models/taxAssessmentParams.ts:23-36` | V |
| O Simples não registra exportação em lugar nenhum (grep vazio em `simples*.ts`/`SimplesDto.ts`) | — | V |

## 1. Checklist (um PR)

1. **Soma = 100%**: `SimplesDefisUpsertSchema` troca o refine para `soma(socios.participacaoBp) + cotasTesourariaBp
   === 10000` quando `socios.length > 0`; mensagem cita o manual (itens 7.3 e 8). Teste: 60%+40% ok; 60%+30% = 400;
   60%+30% + tesouraria 10% ok; 101% = 400.
2. **Cotas em tesouraria**: `cotasTesourariaBp: int 0..10000` (F-DM-2 para o default).
3. **Ganhos de capital** (item 1): `ganhosCapitalCents: cents`.
4. **Exportação direta** (item 5): `exportacaoDiretaCents: cents` (F-DM-3: digitado).
5. **Exportação via comercial exportadora** (item 6): `exportacaoComercial: Array<{ cnpj: CNPJ válido (DV); valorCents: cents > 0 }>.max(100)`,
   CNPJ sem repetir.
6. **Doações à campanha eleitoral** (item 9): ver F-DM-4 — campos não legíveis no manual extraído.
7. **Lucro contábil condicionado** (item 4 + art. 145): o GET devolve `lucroContabil: { valorCents, limiteIsencaoCents,
   informar: boolean, calculo: 'PRESUNCAO' | 'SEM_ESCRITURACAO' }` — `informar = escrituracaoContabil && valor >
   limite`; limite = Σ(receita bruta anual por atividade × presunção do IRPJ) − IRPJ devido no DAS do ano (soma da
   parcela IRPJ das apurações confirmadas). Forma do cálculo = F-DM-1.
8. **Compatibilidade das linhas antigas**: leitura com schema que aceita a falta dos campos novos (default 0 / [] só na
   leitura — **não** `.default()` no schema de escrita, memória zod4-partial); teste com uma linha gravada no formato
   antigo.
9. Gates: snapshot de shape dos DTOs (`dtoShapeSnapshot`), `SimplesDto.gen.ts` regenerado, openapi atualizado (sem rota
   nova), testes de integração em `simplesApuracao.integration.test.ts`/`simplesMei…` onde a DEFIS já é testada.

## 2. Contratos

```ts
const bp = z.number().int().min(0).max(10000);
export const SimplesDefisDigitadoSchema = z.object({
  empregadosInicio: z.number().int().min(0).max(1_000_000),
  empregadosFim: z.number().int().min(0).max(1_000_000),
  ganhosCapitalCents: cents,                                   // item 1
  ganhosRendaVariavelCents: cents,                             // item 8
  exportacaoDiretaCents: cents,                                // item 5
  exportacaoComercial: z.array(z.object({ cnpj: cnpjComDv, valorCents: cents.refine((v) => v > 0) }).strict()).max(100), // item 6
  cotasTesourariaBp: bp,                                       // item 8 (p. 93)
  socios: z.array(SimplesDefisSocioSchema).max(100),
  // doacoesEleitorais: F-DM-4
}).strict();
// refine no Upsert: socios.length === 0 || Σ participacaoBp + cotasTesourariaBp === 10000

export type SimplesDefisView = {
  ano: number; prazo: string; mesesApurados: string[];
  lucroContabil: { valorCents: number; limiteIsencaoCents: number | null; informar: boolean;
                   calculo: 'PRESUNCAO' | 'SEM_ESCRITURACAO' };   // substitui lucroContabilCents (F-DM-5)
  estoqueInicialCents: number; estoqueFinalCents: number;
  digitado: SimplesDefisDigitado | null;
};
```

## 3. Forks — RATIFICADOS (dono, chat, 2026-10-12, questionário — todos na recomendação)

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-DM-1** Limite do art. 145 § 1º | (a) o BE calcula: presunção do IRPJ (tabela existente SERVICO/REVENDA, por atividade da apuração) × receita do ano − IRPJ do DAS; `informar` derivado · (b) o usuário marca "lucro acima do limite" e o BE só mostra o valor · (c) sempre mostrar o lucro (hoje) com aviso do item 4 | **(a)**: os insumos existem no sistema (receita por atividade nas apurações, parcela IRPJ no DAS, tabela de presunção); limitação: atividades fora de SERVICO/REVENDA (ex. 1,6% combustível, 16% transporte) não estão na tabela → alerta e `limiteIsencaoCents: null`  — ✅ ratificada |
| **F-DM-2** Escrituração contábil | (a) presume-se que sim (o sistema É a escrituração) · (b) flag no perfil fiscal | **(a)**: quem usa o razão do Luminaris escritura; sem flag nova  — ✅ ratificada |
| **F-DM-3** Exportação direta | (a) digitada · (b) derivada das apurações (exige o Simples registrar exportação — frente nova) | **(a)**: o Simples não registra exportação hoje; o manual diz "caso tenha informado no PGDAS-D"  — ✅ ratificada |
| **F-DM-4** Doações eleitorais (item 9) | (a) fora até ler os campos na tela do PGDAS-D/DEFIS (o texto extraído só tem o título) · (b) modelar CNPJ + valor por analogia com o item 6 | **(a)**: não inventar campo sem fonte legível — vai a "Pendente de validação externa"  — ✅ ratificada |
| **F-DM-5** Mudança de shape do GET | (a) `lucroContabilCents` vira objeto `lucroContabil` (quebra; o FE da DEFIS ainda não existe) · (b) mantém `lucroContabilCents` e acrescenta campos | **(a)**: não há consumidor no FE (grep vazio); evita dois campos para a mesma coisa  — ✅ ratificada |

## 4. Pendente de validação externa

- **Item 9 (doações eleitorais) — nota de 12/10 (pesquisa colada pelo dono, conferida):** o STF declarou
  inconstitucional a doação eleitoral de pessoa jurídica (ADI 4650, set/2015) — grau I (conhecimento, não relido na
  fonte nesta sessão). Se confirmado, o campo só recebe valor de anos anteriores a 2016, e a DEFIS espelho (anos
  apurados aqui) o deixa vazio: reforça o F-DM-4 (a). Campos exatos — conferir na tela do módulo DEFIS do PGDAS-D (oráculo humano) ou em
  versão do manual com texto legível.
- **Oráculo do conjunto:** comparar com uma DEFIS real entregue (gate humano, como o X14-DAS).

## 5. Insumos ausentes

- Presunção do IRPJ para atividades além de SERVICO/REVENDA (IN RFB 1.700 art. 33 § 1º, conferido no corpus: 1,6%
  combustível; 8% hospitalar, transporte de **carga**, imobiliária, empreitada com material; 16% demais transportes e
  instituições financeiras; 32% serviços em geral) — não cadastradas;
  F-DM-1 (a) devolve `null` com alerta nesses casos.
- ~~Receita por atividade~~ **resolvido 12/10:** `SimplesApuracao.memoria` (Json) guarda o `ApuracaoSimples` inteiro
  (`schema.prisma`, model `SimplesApuracao`), com `atividades[]` (receita + tributos, inclusive IRPJ). O IRPJ do
  limite = soma da parcela IRPJ **calculada** das apurações CONFIRMED (o DAS oficial só tem o total).

## 6. Achados fora de escopo

- §9.4.3.2 (por estabelecimento: caixa/banco, aquisições, transferências, devoluções, despesas, interestaduais por UF,
  ISS retido por município, comunicação) e §9.4.3.4 (por município): fora pelo F-SN-9 (a); reabrir exige decisão do dono.
- DEFIS 2027+ (mensal, LC 214) — segue bloqueada no BE até a regulamentação.
