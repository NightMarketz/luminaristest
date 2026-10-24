---
id: "D1f"
tipo: "dado-externo"
dominio: "externo"
titulo: "Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)"
estado: "human-open"
estado_detalhe: "15/10 (fold): alíquota DECIDIDA por delegação do contador — ISS SP 5% padrão, retenção configurável por nota (D-3 de D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO); ressalva INFERIDA, não verificada: no Simples o ISS vai no DAS pela faixa do Anexo III (LC 123), então os 5% valem fora do Simples — conferir por fonte oficial · cClassTrib: o contador respondeu 000001 ('tributadas integralmente pelo IBS e CBS') + indOp 030101 em 10/10 (TRIAGEM-RESPOSTA-CONTADOR-2026-10-10 I-1/II-1), grau secundário — falta conferir na tabela oficial (pesquisa do agente pelo método legal, não pergunta ao contador); cTribNac/NBS já conferidos em fonte oficial (pesquisas-legais/ctribnac-salao-clinica: 060101/060201/060301). O follow-up de 26/09 foi SUPERSEDIDO pelo pedido único de 10/10 (enviado e respondido) · 27/09: Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib; pedidos no follow-up de 26/09 (item 3), não enviado"
depende_de: ["[[D1]]"]
ancora_sdd: "§III.2"
atualizado: "2026-10-24"
---
# D1f — Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)

**Estado:** `human-open` — 15/10 (fold): alíquota DECIDIDA por delegação do contador — ISS SP 5% padrão, retenção configurável por nota (D-3 de D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO); ressalva INFERIDA, não verificada: no Simples o ISS vai no DAS pela faixa do Anexo III (LC 123), então os 5% valem fora do Simples — conferir por fonte oficial · cClassTrib: o contador respondeu 000001 ('tributadas integralmente pelo IBS e CBS') + indOp 030101 em 10/10 (TRIAGEM-RESPOSTA-CONTADOR-2026-10-10 I-1/II-1), grau secundário — falta conferir na tabela oficial (pesquisa do agente pelo método legal, não pergunta ao contador); cTribNac/NBS já conferidos em fonte oficial (pesquisas-legais/ctribnac-salao-clinica: 060101/060201/060301). O follow-up de 26/09 foi SUPERSEDIDO pelo pedido único de 10/10 (enviado e respondido) · 27/09: Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib; pedidos no follow-up de 26/09 (item 3), não enviado  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[D1]]  
**Desbloqueia:** [[X10b]]  
**Âncora no SDD consolidado:** §III.2

## Evidência

- `docs/SDD-LUMINARIS.md:1606` → D1f["D1f Itens 5a-5f do contador"]:::ext
- `docs/SDD-LUMINARIS.md:1685` → D1 --> D1f
- `docs/SDD-LUMINARIS.md:1753` → | **X10b → X10a → X10i → X11** | blocked | ~~D-NFSE~~ (✅ corpus 10/09, §0.4) · D1f · D5 · **M2 (agora aresta escrita: conta por unidade, R8)** — regra "não X10b/emissão" **inalterada** (só o dono reverte); D1f (item LC 116, alíquota ISS, `cClassTrib` do 1b) pode virar campo obrigatório do `FiscalProfile` (técnica X6 — dado configurável em vez de espera) — **decisão do dono** | cédula #318 §2 R8; fold 17/09 |

## Fold 25/09 (Fase 6 do PLANO-POS-CONTADOR)

- Fold 25/09 — [triagem 23/09](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) 5a: LC 116 **6.01** cabelo/manicure/barbearia, **6.02** estética/depilação, **6.03** massagem; ISS no estabelecimento prestador. **Faltam:** alíquota municipal e `cClassTrib` (não respondidos).

## Fold 15/10 — o que já chegou

- **Alíquota:** decidida por delegação em 10/10 — D-3 de [[D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO]]: ISS SP 5%
  padrão, retenção configurável por nota. Ressalva **inferida, não verificada**: para optante do Simples o ISS é
  recolhido no DAS pela faixa do Anexo III (LC 123); o 5% municipal vale fora do Simples. Conferir por fonte oficial.
- **cClassTrib:** resposta do contador em 10/10 = **000001** + indOp **030101**
  ([`TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md) I-1/II-1),
  grau secundário. Falta conferir na tabela oficial — pesquisa do agente, não nova pergunta ao contador.
- **cTribNac/NBS:** conferidos em fonte oficial (Anexo B v1.01 + LC 116) no dossiê
  `pesquisas-legais/ctribnac-salao-clinica` — 060101 / 060201 / 060301.
- O follow-up de 26/09 (item 3) foi supersedido pelo pedido único de 10/10, que foi enviado e respondido.

## Fold 24/10 — pesquisa pelo método legal (dossiê `pesquisas-legais/gates-humanos-lei`)

- **Ressalva do Simples: agora VERIFICADA em fonte oficial** (era inferida). LC 123 art. 13 VIII e Anexo III incluem o ISS no DAS; o
  5% de SP vale **fora** do Simples (Lei SP 13.701 art. 16 IV, item 6.01–6.03; leitura do dossiê de 10/10, não relida agora).
  LC 116 art. 8º-A fixa piso de 2% de ISS. Texto da LC 227/2026 não foi lido quanto a mudanças no art. 13 / Anexo III: **aberto**.
- **cClassTrib 000001: continua SEM fonte oficial.** Li a IT 2025.002 **v1.31** (a tabela está no anexo); versões posteriores (1.50+) só
  apareceram em fonte secundária; não confirmei nenhuma em domínio oficial. Quem confere é o agente, na tabela da versão vigente, não o contador. Grau: o 000001 segue **secundário**.
- Estado e autorização **não mudam**.
