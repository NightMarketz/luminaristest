> **TRANSPORTADO da `claude/nfe-fase-b` em 2026-08-28** (`git show`, conteúdo íntegro — só este bloco
> foi acrescentado e o link relativo da linha 8 foi reapontado, porque o arquivo saiu de
> `server/src/lib/__tests__/fixtures/nfe/` para `docs/accounting/`). Vivia **apenas na branch**.
>
> **Por que este arquivo foi resgatado:** ele é o **runbook do gate humano** do BE-INCR-NFE — o
> protocolo de anonimização do XML real, que é o único oráculo capaz de destravar o item. Com o
> F-D1 ratificado em **(a) apagar e refazer** (entrevista de 2026-08-28), perdê-lo custaria
> exatamente o gate que bloqueia o incremento há mais tempo. Leia junto com
> [BE-INCR-NFE-fase-b-spec.md](BE-INCR-NFE-fase-b-spec.md) e
> [BE-INCR-NFE-destino-brief.md](BE-INCR-NFE-destino-brief.md).
>
> **Os caminhos citados abaixo são os da branch** (`server/src/lib/__tests__/fixtures/nfe/`,
> `lib/nfe.ts`, `nfe-fixture-provenance.test.ts`). Sob (a) eles serão **recriados**, não editados —
> a sequência de reconstrução está na [spec §8](BE-INCR-NFE-fase-b-spec.md).

# Fixtures NF-e 4.00 (BE-INCR-NFE / F0-3)

Estes XMLs alimentam a suite do parser `lib/nfe.ts` e dos serviços de ingestão.

## Estado atual: SINTÉTICO (merge travado)

Os arquivos `*.SYNTHETIC.xml` foram construídos à mão, **ancorados campo-a-campo** em
[`docs/accounting/BE-INCR-NFE-layout-transcription.md`](BE-INCR-NFE-layout-transcription.md)
(F0-2, MOC 7.0 oficial). Eles provam a **mecânica** do parser (rateio, cStat, chave, multi-item),
**não** o leiaute real — lição **I052** / `sintetico-nao-cobre-formato-de-dado-real`.

`nfe-fixture-provenance.test.ts` **falha** enquanto qualquer fixture carregar o marcador
`SYNTHETIC-FIXTURE-NOT-REAL`. Como o check `Server – typecheck & test` é obrigatório na branch
protection do `main`, **o merge fica travado** até a nota real entrar.

## Como destravar (F0-3 real)

1. Obtenha **1 NF-e 4.00 de compra** (XML que um fornecedor/distribuidor emite quando você compra
   produto — CFOP de entrada 1102/2102…) e **1 de venda**, se você emitir produto.
2. **Anonimize:** troque `CNPJ`/`CPF`/`xNome`/endereço/`IE` e zere `<Signature>`. **Preserve** toda a
   estrutura e os **números** (`vProd`/`vDesc`/`vFrete`/`vIPI`/`vST`/`vNF`, `qCom`, `cStat`, e o
   formato da chave de 44 díg. — `@Id` = `NFe` + `chNFe`, idênticos).
3. Substitua os `*.SYNTHETIC.xml` (ou adicione os reais e apague os sintéticos) e **remova o comentário
   marcador**. O teste passa, o CI fica verde, o merge destrava.

> Enquanto for sintético, todo resultado de teste prova o meu entendimento do leiaute, não o leiaute.
