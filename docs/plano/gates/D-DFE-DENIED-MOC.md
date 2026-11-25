---
id: "D-DFE-DENIED-MOC"
tipo: "dado-externo"
dominio: "externo"
titulo: "Confirmar no MOC/contador: a NF-e/NFC-e denegada consome o número?"
estado: "human-open"
estado_detalhe: "Premissa assumida no código (DENIED consome o número e entra na lacuna de inutilização); sem oráculo — acervo ctresb/leis sem 'denegada'. Nada confirmado."
autorizacao: "dono, questionário 25/11/2026 (lacuna 9b9d): \"manter DENIED consome número (inferência) + gate humano 'confirmar MOC/contador'\""
depende_de: []
ancora_sdd: "§III.2"
atualizado: "2026-11-25"
---
# D-DFE-DENIED-MOC — A denegada consome o número?

**Estado:** `human-open` — premissa assumida no código, sem confirmação externa  
**Autorização:** dono, questionário 25/11/2026 — manter a lógica atual (DENIED consome o número) como **inferência** e abrir este gate para confirmar  
**Depende de:** —  
**Desbloqueia:** retirar a palavra "assumido" de `inutilizacao.ts` (`STATUS_QUE_OCUPAM_NUMERO`) — ou inverter a lógica, se a confirmação for contrária

## O que está assumido

`STATUS_QUE_OCUPAM_NUMERO` ([`server/src/features/accounting/models/inutilizacao.ts`](../../../server/src/features/accounting/models/inutilizacao.ts)) inclui `DENIED`
(uso denegado, cStat 110/301/302): a nota denegada recebe protocolo e **consome** o número, logo o número dela não entra na
faixa de inutilização e conta na guarda da rej. 241. O código cita o MOC 7.0 VG §5.1.6, Tab. 5-4 (cópia citada em
`inutilizacao.test.ts:132`), mas **essa citação não foi conferida no texto** e o acervo `ctresb/leis` tem 0 resultados para
"denegada". O texto mostrado ao operador é neutro (dono, 24/11); só a lógica assume o consumo.

## Pergunta para fechar

> Na NF-e/NFC-e com uso denegado (cStat 110, 301 ou 302), o número da nota fica consumido (não pode ser reutilizado nem
> inutilizado) como numa nota autorizada? Fonte: MOC 7.0 VG §5.1.6 / Tab. 5-4 ou orientação do contador.

## Como fechar (só o dono)

1. Conferir no MOC oficial (texto, não resumo) ou perguntar ao contador, citando a seção.
2. Colar abaixo a evidência literal e o desfecho; assinar. **Gate sem assinatura é nulo** — o agente não preenche.
3. Confirmado → trocar "ASSUMIDO" pela citação conferida no comentário de `inutilizacao.ts`; contrário → tirar `DENIED` de
   `STATUS_QUE_OCUPAM_NUMERO` e ajustar `inutilizacao.test.ts:132`.

## Evidência

_(em branco — do dono)_

## Desfecho

_(em branco — do dono: confirmado · contrário · inconclusivo)_
