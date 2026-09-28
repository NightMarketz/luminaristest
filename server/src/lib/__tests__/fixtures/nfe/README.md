# Fixtures NF-e 4.00 (BE-INCR-NFE / F0-3)

Estes XMLs alimentam a suite do parser `lib/nfe.ts` e dos serviços de ingestão.

## Estado atual: SINTÉTICO (merge travado)

Os arquivos `*.SYNTHETIC.xml` foram construídos à mão, **ancorados campo-a-campo** em
[`docs/accounting/BE-INCR-NFE-layout-transcription.md`](../../../../../../docs/accounting/BE-INCR-NFE-layout-transcription.md)
(F0-2, MOC 7.0 oficial). Eles provam a **mecânica** do parser (rateio, cStat, chave, multi-item),
**não** o leiaute real — lição **I052** / `sintetico-nao-cobre-formato-de-dado-real`.

`nfe-fixture-provenance.test.ts` **falha** enquanto qualquer fixture carregar o marcador
`SYNTHETIC-FIXTURE-NOT-REAL`. Como o check `Server – typecheck & test` é obrigatório na branch
protection do `main`, **o merge fica travado** até a nota real entrar.

## Como destravar (F0-3 real)

1. Obtenha **1 NF-e 4.00 de compra** (XML que um fornecedor/distribuidor emite quando você compra
   produto — CFOP de entrada 1102/2102…) e **1 de venda**, se você emitir produto.
2. **Anonimize:** troque `CNPJ`/`CPF`/`xNome`/endereço/`IE`. **Preserve** toda a
   estrutura e os **números** (`vProd`/`vDesc`/`vFrete`/`vIPI`/`vST`/`vNF`, `qCom`, `cStat`, e o
   formato da chave de 44 díg. — `@Id` = `NFe` + `chNFe`, idênticos).
3. **Re-assine com a chave de teste** (SIG-NFE, F-SIG-4 b). `parseNfe` recusa nota sem assinatura válida e
   não tem modo que pule a verificação. Anonimizar muda o `<infNFe>`, então a assinatura original **nunca**
   confere depois. O helper troca a `<Signature>` por uma feita com chave e certificado de teste (CNPJ do
   `emit` no OtherName 2.16.76.1.3.3):
   ```bash
   cd server && npx ts-node --transpile-only test/helpers/nfeSignature.ts src/lib/__tests__/fixtures/nfe/<arquivo>.xml
   ```
   Rode de novo sempre que editar um fixture. **Antes** de anonimizar, confirme que a nota real passa em
   `verifyNfeSignature` com a assinatura original. É a prova do §4.3 do `BE-INCR-NFE-SIGNATURE-brief.md` de que
   o verificador aceita uma NF-e autorizada de verdade. Se reprovar, é achado de domínio (emenda), não hotfix.
4. Substitua os `*.SYNTHETIC.xml` (ou adicione os reais e apague os sintéticos) e **remova o comentário
   marcador**. O teste passa, o CI fica verde, o merge destrava.

> Enquanto for sintético, todo resultado de teste prova o meu entendimento do leiaute, não o leiaute.
