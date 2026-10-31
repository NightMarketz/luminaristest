# FECHAMENTO D1 e D1f — kit para o dono (2026-10-31)

> Preparado pelo agente sob comando do dono (chat, 31/10: "D1 e D1f: o conteúdo já foi conferido em fonte oficial ou
> decidido. Prepare o que eu preciso para fechá-los (evidência + texto do desfecho) — fechar é meu.").
> **O agente não marca desfecho nem fecha o gate.** A EVIDÊNCIA abaixo é saída literal de comando rodado pelo agente
> nesta sessão (worktree em `8fc95db2`, = `origin/main` de 31/10) ou de leitura de fonte oficial salva com hash.
> O desfecho, a autorização e a troca de `estado` são do dono.

## Pré-condição

- ✅ **O PR #994 (triagem de 30/10) foi mergeado em 31/10** (`d81ae797`, dono no chat: "Sim, OK no #994"). Os folds de
  30/10 do [[D1]] e do [[D1f]] ("do contador não falta nada") já estão em `main`. A pré-condição se sustenta.

## D1 — o que cada item da lista tem

| Item da lista "Faltam do contador" (26/09) | Resolvido por | Grau |
|---|---|---|
| Códigos do referencial (juros, multa, descontos, imobilizado) | Delegação D-1 de 10/10 ([`D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO`](../plano/decisoes/D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO.md)); proposta em [`PROPOSTA-REFERENCIAL-D1-2026-10-10.md`](PROPOSTA-REFERENCIAL-D1-2026-10-10.md) | decisão do dono |
| Alíquota do ISS + cClassTrib | [[D1f]] (abaixo) | verificado |
| COD_PB_RFB do M010 | Tabela dinâmica da ECF, Leiaute 12 (fold 28/10) | verificado (sentido 1xxx/2xxx inferido) |
| Crédito do monofásico como insumo | D-5 de 10/10: configurável por cliente, padrão sem crédito | decisão do dono |
| Data do Simples | Errata de 29/09 do [[D7]]; reconfirmada hoje no portal NFS-e (abaixo, E-5) | verificado |
| Assinatura nas confirmações de 10/10 (III-4, III-7a, III-8, III-9, III-10) | Conferidas em fonte primária em 30/10 (#994, dossiê `triagem-contador-2026-10-30`) | verificado |

**EVIDÊNCIA (saída literal, `git rev-parse --short HEAD` = `8fc95db2`):**

E-1 — COD_PB_RFB no código:
```
$ grep -n "'1071'\|'2210'" server/src/features/accounting/models/lalurBlocoF.ts
23:export type BlocoFConta = '1071' | '2210';
25:export const BLOCO_F_CONTAS: readonly BlocoFConta[] = ['1071', '2210'];
53:    push('161', '1071', realiza);
54:    push('161', '2210', d - realiza);
59:    push('86', '2210', realiza);
```

## D1f — o que cada item tem

| Item | Resposta | Fonte | Grau |
|---|---|---|---|
| Item da LC 116 | 6.01 / 6.02 / 6.03 (cTribNac 060101 / 060201 / 060301) | triagem 23/09 5a; dossiê `ctribnac-salao-clinica` | verificado |
| Alíquota do ISS | SP 5% fora do Simples (Lei SP 13.701 art. 16 IV); no Simples, ISS no DAS (LC 123 art. 13 VIII) | dossiê `gates-humanos-lei` (24/10) | verificado |
| cClassTrib | 000001 (CST 000); clínica com NBS do Anexo III → 200029 | tabela oficial SVRS (carga 05/10) | verificado |
| indOp | 030101 (art. 11 III da LC 214) | Anexo C v1.01 (28/10) **e Anexo VII v1.03.00 da NT 009 (31/10, novo)** | verificado |

**EVIDÊNCIA (saída literal):**

E-2 — cClassTrib no código:
```
$ grep -rn "000001\|200029" server/src/features/accounting/models/*.ts | grep -i classtrib
server/src/features/accounting/models/ibsCbsTabelas.ts:73:  { cst: '000', cClassTrib: '000001', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ...
server/src/features/accounting/models/ibsCbsTabelas.ts:114:  { cst: '200', cClassTrib: '200029', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ...
```

E-3 — indOp no código:
```
$ grep -n "IND_OP_DEFAULT_SALAO" server/src/features/accounting/models/indOp.ts
44:export const IND_OP_DEFAULT_SALAO = '030101';
```

E-4 — indOp na tabela que vem com a NT 009 (entra em produção até 01/12/2026), baixada hoje do gov.br/nfse:
```
$ sha256sum .../D08_anexovii-indop_ibscbs_v1-03-00-nt009-xlsx.html
95f30a44ee94adeea57fb92f3a0337b1e62fdc106f393e73894087889be9e5aa
$ (leitura do sharedStrings.xml da planilha)
54 030101
55 Servi�o prestado fisicamente sobre a pessoa ou fru�do presencialmente por pessoa f�sica
64 030102
```
(o `�` é só o terminal em cp1252; o texto é "Serviço … fruído … física"). Dossiê:
[`vigilancia-2026-10-31-paa-nfse`](../../pesquisas-legais/vigilancia-2026-10-31-paa-nfse/relatorio.md) [D08].

E-5 — data do Simples, portal NFS-e, notícia de 29/10/2026 (mesmo dossiê, [D04]):
> "A partir de 01/11/2026, as Microempresas (ME) e Empresas de Pequeno Porte (EPP) optantes do Simples Nacional devem
> emitir a NFS-e exclusivamente pelo Emissor Nacional (Web ou API)."

## O que o fechamento destrava (e o que não destrava)

- **D1** → [[F7]] (pontilhada), [[X7]], [[D8]] (já fechado), [[D1f]]. O X7 continua com a P-C1 aberta (pedido de 31/10).
- **D1f** → [[X10b]]. O X10b segue `blocked` por [[D5]] (sem PSC/e-CNPJ, decisão de 30/10), [[M2]] e pela regra "não
  X10b/emissão" que só o dono reverte. Fechar o D1f **não** libera emissão.

## Desfecho — marcar UM por gate (dono)

**D1**
[ ] FECHA — todos os itens da lista com resposta verificada ou decisão do dono (tabela acima)
[ ] NÃO FECHA — item __ ainda depende de: ____
[ ] ADIA — esperar: ____

**D1f**
[ ] FECHA — os quatro itens verificados em fonte oficial (tabela acima)
[ ] NÃO FECHA — item __ ainda depende de: ____
[ ] ADIA — esperar: ____

Assinatura do dono: ____________ Data: ____

## Texto sugerido para o chat (autorização citável)

> "Fecho o D1 e o D1f com o kit de 31/10 (FECHAMENTO-D1-D1f-2026-10-31). Faz o fold: estado done, só docs, sem merge."

Com essa frase, o fold que o agente faria nas duas notas:

- **D1** — `estado: "done"`; `autorizacao`: a frase acima, com data; `estado_detalhe` começando por
  "31/10: fechado pelo dono com o kit FECHAMENTO-D1-D1f-2026-10-31 — os 5 itens da lista de 26/09 e as 5 confirmações de
  10/10 têm resposta verificada ou decisão do dono; nada espera o contador · …" (o resto do texto atual fica).
- **D1f** — `estado: "done"`; mesma `autorizacao`; `estado_detalhe` começando por "31/10: fechado pelo dono — item LC 116,
  alíquota, cClassTrib e indOp verificados; indOp 030101 reconferido no Anexo VII v1.03.00 da NT 009 · …".
- Em nenhum dos dois o fold muda [[X10b]], [[X7]] ou [[F7]] de estado.
