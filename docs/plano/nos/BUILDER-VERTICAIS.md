---
id: "BUILDER-VERTICAIS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Builder de verticais — preset como manifesto serializável, montado pelos módulos canônicos; ponte para o marketplace do P5"
estado: "planned"
estado_detalhe: "Registrado a pedido do dono (15/10), sem PRE-ADR e sem autorização de código. Próximo passo, quando pedido: PRE-ADR (preset TS → manifesto; verticais fora do molde 'venda'; separação camada operacional × kit contábil)"
depende_de: ["[[W5]]", "[[KIT-SETOR]]"]
ancora_sdd: "§IV.1 Fase P5"
atualizado: "2026-10-15"
---
# BUILDER-VERTICAIS — Builder de verticais (ponte para o marketplace do P5)

**Estado:** `planned` — Registrado a pedido do dono (15/10), sem PRE-ADR e sem autorização de código. Próximo passo, quando pedido: PRE-ADR (preset TS → manifesto; verticais fora do molde 'venda'; separação camada operacional × kit contábil)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006). O registro do nó foi pedido no chat
em 15/10: *"Registra o builder de verticais como nó no vault (depende de W5 e KIT-SETOR), sem autorizar código ainda."*  
**Depende de:** [[W5]], [[KIT-SETOR]]  
**Desbloqueia:** [[P5]] (marketplace de presets — horizonte)  
**Âncora no SDD consolidado:** §IV.1 Fase P5

## O que é

Uma ferramenta **interna** (o dono e a IA do wizard) que monta um vertical novo a partir dos módulos canônicos de
`presets/modules/` e do kit de setor, e grava o resultado como **manifesto serializável e versionado**. O
marketplace (P5) vem depois e usa esse mesmo formato.

Ordem combinada no chat (15/10): W5 (fonte única de presets) → fechar o KIT-SETOR → preset vira manifesto → builder → P5.

## Estado medido no código (15/10)

- Os presets são **código TS**, não dado: `server/src/features/dynamicTables/presets/systems/*.ts` importa os
  módulos. O vertical 2 (`AestheticClinicPreset.ts`, 72 linhas) é só composição mais um módulo novo.
- O kit contábil já é dado versionado: `server/src/features/sectorKits/` + `accountingBinding/`.
- `presets/modules/registry.ts` tem `aiDescription` sem consumidor ([[W5]]).

## Perguntas que o PRE-ADR tem de responder

1. **Formato:** preset TS → manifesto (Zod) sem quebrar o salão e a clínica.
2. **Verticais fora do molde "venda":** as pontes contábeis acham a tabela pelo `internalName` `sales`/`saleItems`
   (invariante do [[P2]]). Locação, obra, assinatura etc. pedem arquétipo + ponte novos — **código revisado**, nunca
   preset ([[T10]], [[R-motor-regras]]).
3. **Duas camadas:** operacional (tabelas, campos, telas — risco baixo) × kit contábil/fiscal (binding, plano,
   referencial — exige validador determinístico + aceite do contador, como no [[KIT-SETOR]]).
4. **Quem publica:** só o dono (catálogo) ou terceiros (marketplace). A resposta muda revisão, versão e isolamento.

## Riscos

- Os gates humanos (Bloco A) seguem como gargalo; um 3º vertical antes do [[H3]] amplia o que fica sem validação.

## Achado 2026-10-19 (sem mudança de estado — [[D-2026-10-19-ACHADOS-NA-FILA]])

- **Só o CRM é "módulo"**: `MODULE_REGISTRY` tem 5 chaves (CRM-0, 1, 2A, 2B, 3). As 17 tabelas do salão são compostas à mão
  na suíte; "ligar depois", `freeSelects`, `moduleViews` e remoção por módulo só existem para CRM; o resto remove tabela a
  tabela por `meta`. Dois mecanismos para a mesma pergunta — o PRE-ADR deve decidir se o manifesto unifica.
- **Customização pós-instalação com perda**: o sync de preset só propaga campos, opções de select e `immutableAfter`
  (`lifecycle`, `deleteConstraints`, `noOverlap`, `compositeUnique` nunca chegam a tenant instalado; o sync desfaz
  `selectOverrides` — GAP-MAP #397).
- **E-commerce de produto físico hoje**: não há vertical; o mais perto é o salão aparado no Controle Total, com o kit
  contábil do salão. Faltam pedido/frete/rastreio, variantes, canal/marketplace, devolução como fluxo. É o caso de uso
  que este nó descreve.
