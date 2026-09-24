# PRE-ADR-FISCAL-OBLIGATION-PROFILE — Perfil de obrigações por empresa (regime × porte), capturado no onboarding

- **Data:** 2026-09-24
- **Status:** **Accepted — RATIFICADO PELO DONO EM 2026-09-24, os 10 forks na recomendação** (chat: *"Ratifico
  todos os forks na recomendação e pode disparar aqui já"*). F-OBP-0 → (c) · F-OBP-1 → (a) · F-OBP-2 → (a) ·
  F-OBP-3 → (a) · F-OBP-4 → (a) · F-OBP-5 → (c) · F-OBP-6 → (c) · F-OBP-7 → (a) · F-OBP-8 → (a) · F-OBP-9 → (a).
  Nó **[[X13]]**; decisão `docs/plano/decisoes/D-2026-09-24-FISCAL-OBLIGATION-PROFILE.md`; BRIEF
  `docs/accounting/BE-INCR-FISCAL-OBLIGATION-PROFILE-brief.md`. **Código NÃO autorizado** (falta "executa").
- **Autorização:** dono, chat de 24/09: *"Pode verificar mais a fundo e planejar para deixar mais completo"* —
  resposta ao diagnóstico "o módulo fiscal não está planejado para empresas de micro a médio porte".
  **Divergência registrada (passo 1 da `sessao-planejamento`):** o pedido é "planejar"; o item, porém, só existe
  em `docs/plano/destino/` (§3 edições, §6.10, §18 Onda 3 — PROPOSTO), e o protocolo do vault diz que proposta
  só vira nó depois de **PRE-ADR ratificado** (`docs/plano/README.md`, última linha). Por isso a saída é este
  PRE-ADR, não um BRIEF. O BRIEF (`BE-INCR-FISCAL-OBLIGATION-PROFILE-brief.md`) nasce depois da ratificação.
- **Autor:** `sessao-planejamento` (agente). Forks decididos pelo dono, fora desta sessão.

## TLDR

O produto promete três edições (MEI/Simples → Presumido → Real), mas o módulo fiscal só sabe gerar **um**
cenário de cada vez e não guarda **quem a empresa é para o Fisco**: regime, porte e dados do livro são
digitados a cada geração de ECD/ECF, e nada decide quais obrigações se aplicam. Proposta: um **perfil fiscal
da empresa por ano-calendário** (Prisma first-class), uma **matriz de obrigações por regime como dado versionado
com fonte citada** (não motor de regras), e **captura em duas camadas** — regime e porte no onboarding, o resto
completado depois, com gate de "perfil incompleto" antes de gerar SPED.

---

## 1. Objetivo (sob a letra)

A letra do pedido é "perfil SPED por empresa". O objetivo é outro, maior: **o mesmo Luminaris precisa servir um
MEI e uma média empresa do Lucro Real sem que o operador saiba de cor quais obrigações tem.** Para isso o
sistema precisa (1) saber o regime e o porte de cada empresa, por ano; (2) derivar daí o que se aplica; (3) guardar
uma vez os dados cadastrais que hoje são redigitados; (4) esconder do MEI o que não é dele. Este PRE-ADR cobre
(1)–(4). **Não** cobre calcular tributo do Simples/MEI (PGDAS-D, DAS) — isso é X7/Onda 3 (§8).

## 2. Evidência

Grau: **verificado** = lido no arquivo/norma nesta sessão · **lembrado** = conhecimento do agente ou do contador,
não conferido em fonte do corpus · **inferido** = dedução.

### 2.1 O plano

| Claim | Grau | Evidência |
|---|---|---|
| Três edições prometidas: Essencial (MEI/Simples), Gestão (Simples/Presumido), Avançado (Real) — PROPOSTO | verificado | `docs/plano/destino/03-edicoes-e-empacotamento.md:12-14` |
| O plano já registra a tensão com o regime-alvo Lucro Real e pede "ADR de regime antes de vender a Essencial" | verificado | `destino/03…:16-17`, `destino/19-riscos-e-premissas.md:17` |
| Simples (PGDAS-D, fator R) e MEI (DAS) são PROPOSTO; Onda 3 exige PRE-ADR | verificado | `destino/06-catalogo…:85-86`, `destino/18-caminho.md:19` |
| Nenhum nó da fila trata regime, porte ou aplicabilidade de obrigações | verificado | `docs/plano/_INDEX.md` (fila inteira) |
| O onboarding (I1) cria a unidade só com `{name, cnpj?, type?}`; nenhum nó I*/W* pede dado fiscal | verificado | `docs/plano/nos/I1.md:27`; `docs/accounting/ONBOARDING-WIZARD-plano-grafo-brief.md` §2 |
| O contador mandou uma "tabela de obrigações por cliente" (item 1/10), hoje destinada só ao ADR do X7 | verificado (a triagem) | `docs/accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md:54`; `PLANO-POS-CONTADOR-2026-09-23.md:89` |

### 2.2 O código

| Claim | Grau | Evidência |
|---|---|---|
| `FiscalProfile` é **por unidade** (`@@unique([userId, unitId])`) e tem `regimeTributario` = `SIMPLES \| PRESUMIDO \| REAL` — **sem MEI** | verificado | `server/prisma/schema.prisma:1303-1347` |
| O regime do `FiscalProfile` só alimenta emissão de NFS-e e crédito PIS/COFINS da NF-e; nenhuma geração SPED o lê | verificado | grep `regimeTributario` em `server/src` (FiscalProfileDto/Service, FiscalDocumentEmissionService) |
| ECF Presumido: regime **fixo no código**; `indAliqCsll` (9%/15%) e `indRecReceita` (caixa/competência) vêm no corpo de cada requisição | verificado | `server/src/features/accounting/dtos/SpedEcfDto.ts:19-20, 50-58` |
| ECF Real: rota/serviço separados; `formaTrib`/`formaTribPer` no corpo | verificado | `SpedEcfRealDto.ts:13-40` |
| ECD: `indGrandePorte`, `indNire`, `numOrd`, `natLivr`, `nire`, signatários — todos no corpo de cada geração | verificado | `SpedEcdDto.ts:94-149` |
| **Correção ao diagnóstico anterior:** o signatário **contador** (COD_ASSIN 900) **já é persistido** em `AccountingContact` (CPF, CRC, UF, certidão) e pré-preenche o J930 no pacote ao contador | verificado | `schema.prisma:1688-1713`; `AccountingDeliveryDto.ts:52` |
| O representante legal (sócio/administrador) **não** cabe em `AccountingContact`: `crcNumber`/`crcUf` são obrigatórios | verificado | `schema.prisma:1699-1700` |
| `units` é tabela DynamicTable (não model Prisma); o CNPJ da unidade mora lá | verificado | `FiscalDocumentEmissionService.ts:489-494` |

### 2.3 A norma (corpus local `docs/accounting/fontes-oficiais/`)

| Claim | Grau | Evidência |
|---|---|---|
| ECD obrigatória a quem mantém escrituração pela lei comercial; **dispensados**: Simples Nacional, inativas, Presumido que cumpre art. 45 p.ú. da Lei 8.981 (livro caixa) | verificado | `IN-RFB-2003-2021-ECD.txt` art. 3º §1º I, III, V |
| As dispensas do Simples e do Presumido **caem** para ME/EPP com aporte de investidor-anjo (LC 123 arts. 61-A–61-D) | verificado | IN 2.003 art. 3º §2º |
| A dispensa do Presumido **cai** se distribuir lucro isento acima da base presumida menos tributos | verificado | IN 2.003 art. 3º §3º |
| Quem não é obrigado pode entregar a ECD de forma facultativa | verificado | IN 2.003 art. 3º §6º |
| ECF obrigatória a todas as PJ, **centralizada pela matriz**; dispensados Simples e inativas | verificado | `IN-RFB-2004-2021-ECF.txt` art. 1º caput e §1º |
| Retificação de ECF **não pode mudar o regime** (salvo arbitramento) | verificado | IN 2.004 art. 7º §2º (linha 77 do txt) |
| MEI é, por definição, "optante pelo Simples Nacional" → herda as dispensas de ECD/ECF | **verificado** (Planalto, baixado 24/09) | LC 123/2006 art. 18-A §1º (redação LC 188/2021) |
| Grande porte: ativo total > R$ 240 mi **ou** receita bruta anual > R$ 300 mi **no exercício social anterior**, contando o conjunto sob controle comum | **verificado** (Planalto, baixado 24/09) | Lei 11.638/2007 art. 3º p.ú. |
| EFD-Contribuições: Presumido e Real obrigados; Simples dispensado | **lembrado** (Guia v1.35 é binário fora do git) | — |
| NFS-e: o leiaute distingue MEI (2) de ME/EPP (3) no emitente (`opSimpNac` [140]); MEI está fora do MVP da emissão | verificado (no código, transcrito do Anexo I pelo X10b) | `server/src/features/accounting/dtos/DpsPayloadDto.ts:38` |

## 3. Colisões verificadas

| Trilho / decisão | Colide? | Por quê |
|---|---|---|
| Regime-alvo = Lucro Real (02/09, §M5) | **sim, parcial** → F-OBP-0 | O regime-alvo ordena a construção; este PRE-ADR não pede construir Simples, mas pede que o **modelo** aceite todos os regimes desde já |
| `R-motor-regras` (rule engine rejeitado) | não, se F-OBP-3 → (a) | A matriz é tabela de dado com vigência (precedente `models/lc116ListaNacional.ts`, `models/pisCofinsMonofasicoNcm.ts`), não engine em runtime |
| `R-torre-multiempresa` / AccountingScope | não | Um escopo = uma pessoa jurídica (CNPJ raiz); o perfil é **do escopo**, não cria Organization/LegalEntity |
| DynamicTable × Prisma (§2.1) | não | Invariante legal → Prisma first-class; nenhum dado do perfil vai para preset |
| X7 (apuração, "só ADR") | fronteira | X7 **calcula**; este perfil **diz o que se aplica** e com quais parâmetros. A tabela do contador (item 1/10) alimenta os dois |
| Grafo do onboarding (I1→I3→I4, W1–W7) | toca | Acrescenta uma etapa; não muda contrato de I1 (F-OBP-6) |

## 4. Decisões propostas e forks (todos PENDENTES)

**F-OBP-0 — Escopo de produto (decisão do dono).**
(a) Reabrir o regime-alvo: multi-regime é alvo imediato, Simples/MEI entram na fila agora.
(b) Manter o regime-alvo Real/Presumido e **só registrar** a tensão como nó futuro.
(c) Híbrido: o **modelo** (perfil + matriz + captura) nasce para todos os regimes agora; funções específicas do
Simples/MEI (PGDAS-D, DAS, DEFIS, DASN-SIMEI) continuam na Onda 3.
**Recomendação: (c).** O custo de modelar os quatro regimes é o mesmo de modelar dois, e o onboarding que
perguntar só Presumido/Real terá de ser refeito. Não antecipa trabalho fiscal pesado.

**F-OBP-1 — Onde vive o perfil da empresa.**
(a) Model novo `CompanyFiscalProfile` por escopo (CNPJ raiz); `FiscalProfile` por unidade segue para emissão.
(b) Ampliar o `FiscalProfile` (por unidade).
**Recomendação: (a).** ECD e ECF são da matriz (IN 2.004 art. 1º); guardar regime por filial abre divergência entre
filiais do mesmo CNPJ. Consequência: `FiscalProfile.regimeTributario` passa a ser **derivado/validado** contra o da
empresa (ver F-OBP-7).

**F-OBP-2 — MEI no enum.**
(a) `MEI` como valor próprio do regime da empresa.
(b) `SIMPLES` + flag `simei: boolean`.
**Recomendação: (a).** As obrigações do MEI (DASN-SIMEI, DAS fixo) não são as do Simples ME/EPP (PGDAS-D, DEFIS),
e a matriz fica legível. A emissão mapeia MEI → a categoria do leiaute NFS-e (pendente de validação, §7).

**F-OBP-3 — Forma da matriz de obrigações.**
(a) Const TypeScript versionada por vigência, com fonte citada por linha.
(b) Tabela seedada no banco.
**Recomendação: (a).** Mesma técnica das tabelas legais já no repo; mudança de lei = PR revisável; sem colisão com
`R-motor-regras`.

**F-OBP-4 — Status de aplicabilidade.** A norma tem obrigações condicionais (Presumido com livro caixa; aporte de
investidor-anjo; distribuição acima da base).
(a) Quatro estados: `OBRIGATORIA`, `CONDICIONAL` (com a condição em texto e a pergunta que a resolve),
`FACULTATIVA`, `NAO_SE_APLICA`.
(b) Booleano obrigatória/não.
**Recomendação: (a).** O booleano força o sistema a decidir o que depende de fato que ele não tem. A geração de ECD
continua disponível para todos (IN 2.003 art. 3º §6º).

**F-OBP-5 — Porte.**
(a) Declarado pelo operador/contador.
(b) Calculado do razão (ativo/receita).
(c) Declarado, com **aviso** quando o razão indica o contrário.
**Recomendação: (c).** Os limiares não estão no corpus (§7). O razão pode estar incompleto no 1º ano.

**F-OBP-6 — Onde se captura.**
(a) Nova etapa da entrevista do wizard (InterviewService).
(b) Formulário "Perfil fiscal" pós-onboarding, com gate.
(c) As duas coisas: o wizard pergunta **só regime e porte** (2–3 perguntas, com "não sei — o contador informa"); o
resto (livro, NIRE, signatários, CSLL, critério de receita) é completado no formulário, e a geração SPED exige o
perfil completo.
**Recomendação: (c).** O dono do salão sabe se é MEI; não sabe o número de ordem do livro.

**F-OBP-7 — Relação perfil × corpo da geração SPED.**
(a) O perfil pré-preenche; o corpo pode sobrescrever; divergência de **regime** entre perfil e rota = 400.
(b) O perfil é autoritativo; o corpo não aceita esses campos.
(c) Só pré-preenche; nada bloqueia.
**Recomendação: (a).** Não quebra quem gera hoje e fecha o erro caro (gerar ECF Presumido para empresa do Real).
Casa com a memória "param aceito-e-ignorado é bug": sobrescrita explícita, nunca ignorada.

**F-OBP-8 — Regime no tempo.**
(a) Perfil por ano-calendário, `(scope, ano)` único; o regime do ano fica imutável depois da ECF transmitida.
(b) Perfil único, histórico só na auditoria.
**Recomendação: (a).** A opção de regime é anual e a retificação não pode mudá-la (IN 2.004 art. 7º §2º). O seed
multi-exercício (SEED-MY) já precisa de dois anos.

**F-OBP-9 — Signatário representante legal.**
(a) Model novo `CompanySigner` (nome, CPF, qualificação SPED, e-mail, fone, `indRespLegal`), por escopo.
(b) Generalizar `AccountingContact` com `papel` e CRC anulável.
**Recomendação: (a).** `AccountingContact` carrega invariantes do contador (CRC obrigatório, pacote de entrega);
afrouxá-lo enfraquece o J930 do COD_ASSIN 900 que o C12 acabou de fechar.

## 5. Comportamentos candidatos do futuro BRIEF (esqueleto — não é checklist executável)

1. Model `CompanyFiscalProfile` por `(escopo, anoCalendario)` + migração + cadeia Route → Controller → Service →
   Repository → Prisma + Policy + Factory + DTO Zod `.strict()` + soft-delete (F-OBP-1/8).
2. Matriz `models/obrigacoesPorRegime.ts`: `regime × obrigação → status + condição + fonte + vigência` (F-OBP-3/4).
3. `GET /api/accounting/fiscal-profile/company/:ano/obligations` → lista derivada da matriz + respostas das condições.
4. Etapa do wizard: regime + porte, com "não sei" (F-OBP-6).
5. Formulário completo + `faltantes[]` por obrigação aplicável (mesmo padrão de `fiscalProfileEmissaoStatus`).
6. `CompanySigner` (F-OBP-9).
7. Geração ECD/ECF lê o perfil: pré-preenche; rejeita regime divergente (F-OBP-7).
8. `FiscalProfile.regimeTributario` validado contra o da empresa (F-OBP-1).
9. Auditoria: eventos novos na allowlist `auditCanonical.ts` **sem PII** de signatário (memória de allowlist PII).
10. Gates: snapshot de shape dos DTOs, paridade i18n pt/en, path-count do openapi.
11. FE (incremento separado, `FE-INCR-FISCAL-OBLIGATION-PROFILE`): esconder da UI a geração que não se aplica.

## 6. Contratos esboçados

```ts
// models/regimeEmpresa.ts
export const REGIMES_EMPRESA = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL'] as const; // F-OBP-2 (a)

// models/obrigacoesPorRegime.ts — dado, não engine (F-OBP-3 a)
type StatusObrigacao = 'OBRIGATORIA' | 'CONDICIONAL' | 'FACULTATIVA' | 'NAO_SE_APLICA'; // F-OBP-4 a
interface LinhaMatriz {
  obrigacao: 'ECD' | 'ECF' | 'EFD_CONTRIBUICOES' | 'DCTFWEB' | 'PGDAS_D' | 'DEFIS' | 'DASN_SIMEI' /* … */;
  regime: (typeof REGIMES_EMPRESA)[number];
  status: StatusObrigacao;
  condicao?: { chave: 'APORTE_INVESTIDOR_ANJO' | 'LIVRO_CAIXA_SEM_ESCRITURACAO' | 'DISTRIBUICAO_ACIMA_BASE'; efeito: StatusObrigacao };
  fonte: string;          // ex. "IN RFB 2.003/2021 art. 3º §1º V" — obrigatória por linha
  vigenteDesde: string;   // date-only
  vigenteAte?: string;
}

// DTO — CompanyFiscalProfile (por ano)
z.object({
  anoCalendario: z.number().int().min(2014),
  regime: z.enum(REGIMES_EMPRESA),
  grandePorte: z.boolean().nullable(),                 // null = "não sei" (F-OBP-5/6)
  condicoes: z.object({
    aporteInvestidorAnjo: z.boolean().nullable(),
    livroCaixaSemEscrituracao: z.boolean().nullable(), // só PRESUMIDO
    distribuicaoAcimaBase: z.boolean().nullable(),     // só PRESUMIDO
  }).strict(),
  ecd: z.object({ indNire: z.enum(['0','1']), nire: z.string().optional(), numOrd: z.string(), natLivr: z.string().max(80) })
        .strict().optional(),
  ecf: z.object({ indAliqCsll: z.enum(['1','4']), indRecReceita: z.enum(['1','2']) }).strict().optional(), // só PRESUMIDO/REAL
  contadorContactId: z.string().optional(),            // AccountingContact existente (COD_ASSIN 900)
  representanteLegalSignerId: z.string().optional(),   // CompanySigner (F-OBP-9)
}).strict()
  .superRefine(/* ecf/condições só nos regimes em que cabem; MEI/SIMPLES rejeitam bloco ecf */);

// Resposta de obrigações
{ ano: number; regime: string; obrigacoes: Array<{ obrigacao: string; status: StatusObrigacao; fonte: string;
  perguntaPendente?: string; faltantes: string[] }> }
```

## 7. Pendente de validação externa (não entra em checklist até ter fonte)

1. ~~MEI herda as dispensas de ECD/ECF~~ — **resolvido 24/09** (LC 123 art. 18-A §1º, §2.3).
2. ~~Limiares do grande porte~~ — **resolvido 24/09** (Lei 11.638 art. 3º p.ú., §2.3).
3. Aplicabilidade de EFD-Contribuições, EFD ICMS/IPI (por UF), DCTFWeb, eSocial/Reinf, DEFIS, DASN-SIMEI por regime — a
   tabela do contador (item 1/10) cobre parte; falta a fonte oficial de cada linha.
4. ~~Categoria do MEI no leiaute NFS-e~~ — **resolvido 24/09** (`opSimpNac` = 2, `DpsPayloadDto.ts:38`).
5. **Pergunta ao contador (junto do D8):** *"Para empresas do Simples e do Presumido que você atende, em quais casos
   você entrega a ECD?"* — calibra os estados `CONDICIONAL` com a prática, não só com a letra da IN.

## 8. Insumos ausentes

- O **texto bruto** da "tabela de obrigações" do contador (item 1/10) não está no repo; só o resumo da triagem.
- Os binários do corpus (Guia EFD-Contribuições, Manuais ECD L9/ECF L12, Anexo I NFS-e) não estão no worktree;
  só os `.txt` das IN 1.700/2.003/2.004.

## 9. Achados fora de escopo (registrados, não planejados)

- Cálculo de DAS/PGDAS-D, fator R e Anexos do Simples → X7 / Onda 3.
- IBS/CBS no Simples só em 2027 e NFS-e do Simples obrigatória em 01/11/2026 (triagem P7) → X10i/D7.
- O pedido D8 atual continua sendo o que destrava o H1; ele preenche a **primeira instância** deste perfil, mas não
  depende dele.

## 10. Como entra na fila (depois da ratificação)

1. Dono ratifica F-OBP-0..9 (cédula).
2. Nota nova em `docs/plano/nos/` (id sugerido **X13**, domínio fiscal), `depende_de: []`, consumidores: I4 (onboarding),
   geração ECD/ECF, X7. Nota em `decisoes/` para F-OBP-0.
3. `sessao-planejamento` escreve `BE-INCR-FISCAL-OBLIGATION-PROFILE-brief.md` a partir do §5–§6.
4. `node scripts/plano-vault.mjs index && node scripts/plano-vault.mjs check`.

## Riscos desta proposta (incluindo os vieses do autor)

- **Viés de completude:** o agente tende a modelar tudo de uma vez. F-OBP-0 (c) limita isso ao modelo; se o dono
  preferir (b), o §5 encolhe para os itens 1, 2 e 7.
- **Letra da lei × prática:** as condições do §4 F-OBP-4 vêm da IN; a prática do contador pode divergir (§7 item 5).
- **Quatro claims são "lembrado"** (§2.3); nenhum entra no checklist até ter fonte.
