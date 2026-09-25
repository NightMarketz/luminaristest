---
id: "D1f"
tipo: "dado-externo"
dominio: "externo"
titulo: "Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)"
estado: "human-open"
estado_detalhe: "Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib"
depende_de: ["[[D1]]"]
ancora_sdd: "§III.2"
atualizado: "2026-09-25"
---
# D1f — Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)

**Estado:** `human-open` — Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib  
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
