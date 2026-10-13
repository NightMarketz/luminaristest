# BE-INCR-KIT-SETOR — EMENDA 1 (conteúdo dos kits já, nos dois setores)

> `sessao-planejamento`, 2026-10-13, base `origin/main` `9f6477d8`. **Emenda** ao BRIEF
> [`BE-INCR-KIT-SETOR-brief.md`](BE-INCR-KIT-SETOR-brief.md) (nó [`KIT-SETOR`](../plano/nos/KIT-SETOR.md)). O BRIEF
> original não foi reescrito; ganhou só um aviso no topo. Sem código. **Cada PR exige "executa" próprio** (ORCH-006).
>
> **Autorização, literal:** dono, chat, 2026-10-13: *"Grava as decisões e abre as 4 emendas"*, sobre as cédulas
> F-KB-6R *"Próxima versão completa já"* e F-KB-9R *"Clínica v2 alcança o salão"*
> ([[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]]). Cobre só este documento.
>
> **Em duas linhas:** a clínica ganha o v2 com o mesmo referencial 2025 que o salão já tem (PR-K1, tudo com fonte,
> pronto para "executa"). Depois, os dois setores ganham contas de imposto, padrões fiscais por serviço e o
> referencial dessas contas novas (PR-K2), que ainda dependem de 2 forks e de 2 fontes. **Risco principal:** sem o
> PR-4 (atualização), todo esse conteúdo só chega a instalação nova; quem já instalou fica no v1/v2.

## 0. Fatos consumados (lidos nesta sessão em `origin/main`)

| # | Fato | Fonte |
|---|---|---|
| F1 | PR-1 (#580) e PR-2 (#584) do BRIEF estão em `main`. O v1 dos dois setores é literal e está travado por hash | `server/src/features/sectorKits/kits/*/published.json` |
| F2 | O salão tem v2 = v1 + referencial 2025 das 15 folhas (Presumido e Real), #632 | `kits/beautySalon/kit.v2.ts` |
| F3 | Versão publicada nunca se edita; versão nova é arquivo novo (item 5 do BRIEF) | cabeçalho de `kit.v2.ts` |
| F4 | O binding da clínica usa as **mesmas** 11 contas do salão (1.1.1–1.1.4, 1.1.6, 2.1.1, 3.1–3.4, 4.2) | `accountingBinding/fixtures/clinicBinding.ts` × `saleBinding.ts` (grep) |
| F5 | O canônico **não tem** conta de imposto: 20 contas, sem IRPJ/CSLL/PIS/COFINS | `accounting/fixtures/ChartOfAccountsFixture.ts:21-82` |
| F6 | A emenda 3.3 já reserva 3.5.1–3.5.3, 4.3.1–4.3.3, 4.4.1–4.4.2 e leva as 9 folhas num kit v3 do salão (F-HR-4 a) | `BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md:311-312`; `BE-INCR-H1-REFERENCIAL-3-4-brief.md` F-HR-4 |
| F7 | O gate da ECD conta **toda** folha ativa sem mapeamento; folha nova sem referencial derruba a prontidão | `BE-INCR-H1-REFERENCIAL-3-4-brief.md:172` (cita `ReferentialMappingService.ts:326`) |
| F8 | O schema do kit já tem os campos: `roleDefaults.fiscalProfile` (11 contas), `serviceFiscalDefaults` (`serviceRef`, `cTribNac`, `cNBS`, `cIndOp`) | `sectorKits/dtos/SectorKitDto.ts` |
| F9 | PR-4 (atualização em 3 níveis) **não existe**; o v2 do salão "alcança só instalação nova" | nota do nó, 11/10 |

## 1. O que muda no BRIEF

- A decisão de 08/10 (F-KB-6 a, F-KB-9 a) **continua valendo para o que já foi feito** (v1 literal; salão primeiro).
  Para a frente, a de 13/10 substitui a regra "um PR por setor, depois do PR-4" por "**conteúdo já, nos dois setores**".
- O §9 do BRIEF ("o F-KB-6 (a) adia o valor visível") deixa de valer.
- A ordem dos PRs passa a ser: PR-K1 → (PR-3, PR-4, PR-5, PR-6 do original, cada um com "executa") ‖ PR-K2. O PR-K2
  **não depende** do PR-4.

## 2. Checklist

### PR-K1 — clínica v2 (pronto para "executa")

1. **Referencial compartilhado.** Arquivo novo `kits/_shared/referencial2025Canonico.ts` com as 15 entradas do
   canônico. O `kit.v2.ts` do salão **não é editado** (F3). *Teste:* deep-equal entre o compartilhado e
   `BEAUTY_SALON_KIT_V2.referential[0].entries` — trava a divergência sem tocar no publicado.
   Justificativa (reuse): o de-para é do **canônico**, não do setor (F4); copiar as 15 linhas seria clone.
2. **`kits/aestheticClinic/kit.v2.ts`** = v1 + `referential` PRESUMIDO e REAL `2025` com as entradas do item 1.
   `changelog` com a fonte (a mesma do salão v2: PROPOSTA-REFERENCIAL-D1-2026-10-10 §0 e §1.1; D-1 de 10/10 e
   decisão (b) de 11/10). Registro em `registry.ts`; hash novo em `published.json`.
3. **Teste de integração** no molde de `kitV2Referencial.integration.test.ts`: instalar a clínica v2 grava os 15
   mapeamentos `2025` e a prontidão da ECD não reclama de folha do binding sem mapeamento.
4. **Regressão:** `registry.test.ts`, `kitContract.test.ts`, as suítes de `accountingBinding` verdes.

> Ressalva (inferido, não verificado): a 3.4 → `.98` veio de delegação do contador para o **salão**. Para a clínica,
> a conta é a mesma do canônico e a linha referencial descreve a natureza da receita, não o setor. Se o contador
> discordar para a clínica, é uma versão nova da clínica.

### PR-K2 — conteúdo fiscal (depende de F-KE-1, F-KE-2 e do §4)

5. **`chartExtension`** com as contas de imposto, nos códigos do F-KE-1, **com referencial de cada uma no mesmo kit**
   (F7). Teste: instalar ⇒ nenhuma folha ativa sem mapeamento `2025`.
6. **`roleDefaults.fiscalProfile`** apontando para as contas do item 5 (`irpjRecolher`, `csllRecolher`,
   `pisRecolher`, `cofinsRecolher` e as de despesa/dedução do F-KE-2). Regra F13 já em `main`: só preenche campo nulo.
   Teste: perfil com campo preenchido pelo usuário não é sobrescrito.
7. **`serviceFiscalDefaults`** por `serviceRef` do preset do setor (insumo ausente do BRIEF §6: ler o preset
   `services` de `beautySalon`/`aestheticClinic`), com `cTribNac`/`cNBS` **só com a fonte do §4**. Serviço sem fonte
   fica fora da lista (não entra palpite).
8. **Versões:** salão = próxima livre; clínica v3. **Coordenação com a emenda 3.3 (F6):** quem chegar primeiro em
   `main` usa o número; o outro vira o seguinte e herda o conteúdo do anterior. As duas versões são cumulativas.
9. **Gates:** snapshot de shape (o DTO não muda); `kitContract.test.ts` valida folha e não colisão com o canônico.

## 3. Contrato (sem campo novo)

```ts
// kits/_shared/referencial2025Canonico.ts — PR-K1
export const REFERENCIAL_2025_CANONICO: readonly { accountCode: string; referentialCode: string; label: string }[];
// kits/aestheticClinic/kit.v2.ts
export const AESTHETIC_CLINIC_KIT_V2: SectorKitV1; // kitVersion 2; referential = [{PRESUMIDO,'2025'},{REAL,'2025'}]
// PR-K2: chartExtension: CanonicalAccount[]; roleDefaults.fiscalProfile; serviceFiscalDefaults — shapes de F8
```

## 4. Forks — RATIFICAÇÃO PENDENTE

### F-KE-1 — Códigos das contas de imposto na extensão
- **(a)** Passivo: 2.1.3 IRPJ a recolher, 2.1.4 CSLL a recolher, 2.1.5 PIS a recolher, 2.1.6 COFINS a recolher.
  Resultado: 4.5.1 IRPJ, 4.5.2 CSLL (fora de 4.3/4.4, reservados pela emenda 3.3, F6).
- **(b)** Grupo próprio 2.2 "Obrigações tributárias" com 2.2.1–2.2.4.
- **Recomendação: (a).** Não cria nível sintético novo e não colide com F6. Risco: escopos que já criaram contas à mão
  nesses códigos — insumo ausente 1.

### F-KE-2 — Onde caem PIS/COFINS sobre o faturamento
- **(a)** Redutora da receita (natureza `Revenue`, ex.: 3.6.1 PIS, 3.6.2 COFINS), como dedução da receita bruta.
- **(b)** Despesa (4.5.3, 4.5.4), como o nome do campo `pisDespesaAccountCode` sugere.
- **Recomendação: (a)**, por ser dedução da receita bruta. **Fonte conferida em 13/10**
  (`pesquisas-legais/pis-cofins-deducao-receita/relatorio.md`): a receita líquida é a bruta diminuída dos "tributos
  sobre ela incidentes" (DL 1.598/77 art. 12 §1º III, redação da Lei 12.973/2014), e a DRE discrimina as deduções e
  os impostos antes da receita líquida (Lei 6.404/76 art. 187 I–II). **RATIFICAÇÃO PENDENTE.**

## 5. Pendente de validação externa

- `cTribNac`/`cNBS` de cada serviço do salão e da clínica (LC 116 lista + NBS 2.0). O X14 cita 060101/060201/060301
  para beleza; a clínica estética não tem fonte ainda. Pesquisa por fonte oficial antes do PR-K2.
- Linha referencial 2025 de cada conta nova do F-KE-1/F-KE-2 (catálogo RFB já no banco; o de-para é enquadramento).

## 6. Insumos ausentes

1. Códigos já usados por contas criadas à mão em escopos reais (o kit só acrescenta; colisão vira erro de instalação).
2. `serviceRef` dos presets (herdado do BRIEF §6).

## 7. Achados fora de escopo

- Quem já instalou o v1/v2 só recebe o conteúdo com o PR-4. Se o dono quiser alcançar os escopos existentes antes,
  é um batch de runbook (como o F-HR-4 a fez com o RUNBOOK-H1) — frente nova, não planejada aqui.

## 8. Perfil previsto

| PR | Perfil | Por quê |
|---|---|---|
| PR-K1 | opus-baixo | Dado com fonte + teste no molde do salão v2 |
| PR-K2 | opus-medio | Contas novas + referencial + coordenação de versão com a emenda 3.3 |
