# BE-INCR-NFE-SIGNATURE — BRIEF (SIG-NFE, passo 2.3)

**Nó:** [`SIG-NFE`](../plano/nos/SIG-NFE.md) · **Plano:** [`PLANO-POS-CONTADOR-2026-09-23.md`](PLANO-POS-CONTADOR-2026-09-23.md) Fase 2, passo 2.3
**Autorização deste BRIEF:** dono em chat, 26/09. Depois do relatório que listava *"SIG-NFE: dá para escrever o BRIEF 2.3"*, veio a ordem *"Termina as pendências e depois segue no fiscal"*. A ordem cobre **só o planejamento**. Não é `executa` para o 2.4, e nenhum fork abaixo fica ratificado por ela.
**Estado:** BRIEF — **5 forks com RATIFICAÇÃO PENDENTE**. Sem código.

## 0. Fatos consumados (insumos lidos, não rediscutir)

| Fato | Onde |
|---|---|
| `parseNfe` é o funil puro dos 3 serviços de produção. Checa DTD, `mod`, `tpAmb`, chave, `cStat` e protocolo; **nunca lê `<Signature>`** | `server/src/lib/nfe.ts:270`; chamadores: `NfeImportService.ts:97`, `NfePreviewService.ts:37`, `NfeSaleReconciliationService.ts:86` |
| Precedente de "flag só de teste" no parser: `ParseNfeOptions.allowHomologacao` | `nfe.ts:101-104` |
| Teste-guarda vermelho: `<Signature>` bem-formada que não confere → hoje 201; esperado 400 e nenhum `payable` | `nfeController.purchase.signature.integration.test.ts` (`it.failing`, #391 `1e1e82b7`, GAP-MAP 14) |
| **Não existe lib XMLDSig nem de C14N** no servidor; o XML hoje só passa pelo `fast-xml-parser`, que não canonicaliza | `server/package.json:50` |
| O contador pede verificação **obrigatória em produção** e um **modo fixture que pule a verificação** | `TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md` item 3 (l. 31 e 63) |
| O README das fixtures manda **zerar `<Signature>`** ao anonimizar XML real (E9) | `server/src/lib/__tests__/fixtures/nfe/README.md:20` |
| Guarda "só em teste" por `NODE_ENV` vaza (as suítes mutam `NODE_ENV`); na casa usa-se `JEST_WORKER_ID` | memória `guarda-de-teste-por-NODE_ENV-vaza` |

## 1. Checklist de comportamentos (2.4 — implementação)

> Os parâmetros do algoritmo (C14N, digest, assinatura, alvo da Reference) dependem da transcrição do §4.1. Até ela existir, o **B0** trava os demais.

0. **B0 — insumo.** Transcrever o padrão de assinatura do MOC NF-e 4.00 para `docs/accounting/fontes-oficiais/`, com `sha256` no `MANIFEST.md`. A transcrição fixa: C14N, digest, SignatureMethod, as Transforms, Reference URI = `#` + `infNFe/@Id` e a exigência sobre o CNPJ do certificado. É gate dos B2–B5: o teste de cada um cita a chave da transcrição.
1. **B1 — dependência** (conforme o F-SIG-2). Lib instalada e fixada, com `npm audit` limpo registrado no PR.
2. **B2 — função pura `verifyNfeSignature(xml): SignatureCheck`** em `lib/nfe.ts` ou `lib/nfeSignature.ts`, sem Prisma, espelhando `parseNfe`. Recalcula o digest do `infNFe` canonicalizado e verifica o `SignatureValue` com o certificado do `KeyInfo`. Qualquer falha lança `ValidationError`, que vira 400 pela cadeia que já existe.
3. **B3 — defesa contra signature wrapping (XSW):**
   - exatamente 1 `<Signature>` sob `<NFe>`;
   - exatamente 1 `<Reference>`, com URI = `#` + o `@Id` do **mesmo** `infNFe` que o `parseNfe` lê;
   - Transforms exatamente = [enveloped, C14N do B0];
   - `@Id` único no documento.

   Cada item tem um caso de teste negativo.
4. **B4 — `parseNfe` chama o B2** antes de extrair qualquer campo. A verificação vive dentro do funil, então os 3 chamadores ficam cobertos sem mudança neles. Escopo por chamador: F-SIG-5.
5. **B5 — confiança no certificado**, conforme o F-SIG-3.
6. **B6 — nota sem `<Signature>`**, conforme o F-SIG-1: rejeita (a) ou avisa (b).
7. **B7 — modo de teste**, conforme o F-SIG-4. Nenhum caminho de produção desliga a verificação sem guarda de teste coberta por teste.
8. **B8 — o guarda do #391 vira `it`.** O controle "sem `<Signature>` → rejeita" só entra se o F-SIG-1 for (a).
9. **B9 — fixtures e README.** As 3 `*.SYNTHETIC.xml` passam a verificar pelo mecanismo do F-SIG-4. O `README.md:20` troca "zere `<Signature>`" pelo procedimento que o F-SIG-4 escolher: anonimizar invalida o digest, então uma nota real anonimizada **nunca** verifica com a assinatura original.
10. **B10 — gates da casa:** `tsc` limpo; `npm run test:integration` e os unitários de NF-e (81 no baseline do #391) verdes; GAP-MAP 14 → `FECHADO`. Sem rota ou DTO novos: openapi e snapshot de DTO ficam intocados (confirmar com `git diff --stat`). Sem `eventType` novo: a rejeição não grava nada.

## 2. Contratos

```ts
// lib/nfe.ts (ou lib/nfeSignature.ts) — puro
export interface SignatureCheck {
  status: 'valid' | 'absent';          // 'absent' só existe se F-SIG-1 = (b)
  certSubjectCnpj?: string;            // extraído do certificado (B5, se F-SIG-3 ≥ b)
  certNotBefore?: string;              // YYYY-MM-DD (reslice, nunca new Date → UTC-shift)
  certNotAfter?: string;
}
export function verifyNfeSignature(xml: string): SignatureCheck;   // lança ValidationError em inválida

export interface ParseNfeOptions {
  allowHomologacao?: boolean;          // já existe
  // F-SIG-4 (a): skipSignature?: boolean — aceito só se process.env.JEST_WORKER_ID; senão ValidationError
  // F-SIG-4 (b): trustAnchorsPem?: string[] — sem skip; fixtures assinadas com chave de teste
}
export interface ParsedNfe { /* …campos atuais… */ signature?: SignatureCheck }  // F-SIG-1 (b): vai p/ warnings
```

HTTP: sem rota nova. Assinatura inválida → **400** `ValidationError`, com mensagem `NF-e inválida: assinatura …`. O mesmo shape do erro de chave.

## 3. Forks — RATIFICAÇÃO PENDENTE (nenhum decidido aqui)

- **F-SIG-1 — nota sem assinatura válida** (fork do plano). (a) Rejeita toda nota com assinatura inválida **ou ausente**. (b) Só avisa em `warnings`.
  **Recomendação: (a).** É o que o contador pediu (triagem item 3: "obrigatória em produção"). Contabilizar a partir de XML adulterado é justamente o risco do nó. Custo: fixtures e E9 passam a depender do F-SIG-4.

- **F-SIG-2 — como canonicalizar.** (a) Dependência nova: `xml-crypto` + `@xmldom/xmldom`, a pilha usual de XMLDSig em Node. (b) C14N escrito à mão, restrito ao subconjunto da NF-e (sem DTD, que já é rejeitado, e sem comentários).
  **Recomendação: (a).** C14N à mão é exatamente o código que erra em borda (namespace herdado, ordem de atributo, escape) e que ninguém revisa bem. O `xml-crypto` já teve CVEs de signature wrapping; o B3 existe para não depender só da lib, e o B1 fixa a versão com `npm audit`.

- **F-SIG-3 — até onde confiar no certificado.**
  - (a) Só integridade: a assinatura confere com o certificado embutido.
  - (b) (a) + CNPJ-raiz do certificado = raiz do `emit/CNPJ` + `dhEmi` dentro da validade do certificado.
  - (c) (b) + cadeia até a raiz ICP-Brasil.

  **Recomendação: (b) agora, (c) como nó seguinte.** Limite, dito por escrito: sem (c), quem **re-assina** o XML adulterado com um certificado autoassinado que carregue o CNPJ passa. (a)/(b) pegam a edição sem re-assinatura, que é o cenário do guarda. Só (c) fecha a falsificação deliberada, e (c) precisa das raízes do ITI (dado externo, §4.2).

- **F-SIG-4 — modo de teste.**
  - (a) Flag `skipSignature` em `ParseNfeOptions`, aceita só sob `JEST_WORKER_ID`. As fixtures seguem como estão.
  - (b) Sem skip. Um helper de teste assina as fixtures com uma chave de teste, e a âncora de confiança de teste entra via factory. O caminho de verificação real roda em todo teste.

  **Recomendação: (b).** Com ela, produção não tem **nenhum** bypass, e o B9 fica resolvido: a nota real anonimizada é re-assinada com a chave de teste. Isso diverge da letra do contador ("pule a verificação"), mas atende ao objetivo dele (fixture não trava o teste). (b) depende do F-SIG-2 = (a), porque a mesma lib assina.

- **F-SIG-5 — quais chamadores verificam.** (a) Todos os 3: import de compra, conciliação de venda e preview. (b) Só os que escrevem (import e venda); o preview só mostra o status.
  **Recomendação: (a).** A verificação fica no funil, e um preview que aceita o que o import recusa confunde quem opera. Se o F-SIG-1 for (b), vale a (b) deste.

## 4. Pendente de validação externa

1. **padrão de assinatura do MOC NF-e 4.00** (algoritmos, alvo da Reference e regra do CNPJ do certificado). Não está em `fontes-oficiais/`. Os parâmetros que aparecem no guarda do #391 (c14n 2001, rsa-sha1, sha1) são **sintéticos**, não fonte.
2. **cadeia ICP-Brasil** (raízes do ITI), só se o F-SIG-3 = (c).
3. **XML real assinado (D2/E9).** É a prova de que uma nota autorizada de verdade **passa**. Sem ela, o risco é o mesmo do F-I2 da chave: um verificador que rejeita nota real. Se o XML real reprovar, é achado de domínio e vira emenda, nunca hotfix.

## 5. Insumos ausentes

- Transcrição do MOC (§4.1): trava o B0.
- NF-e real assinada (D2): não trava o 2.4; trava a prova do §4.3.

## 6. Achados fora de escopo

- **Consulta online do protocolo na SEFAZ** (`NFeConsultaProtocolo`): seria a prova forte de autorização sem precisar da cadeia ICP. Exige o certificado A1 (D5), então fica para depois do D5; aqui só se registra.
- **Assinatura da SEFAZ em `protNFe/infProt`** (e o `digVal`, que casa com o `DigestValue` da nota): só se verifica de verdade com a cadeia ICP, então vai junto com o F-SIG-3 (c).
