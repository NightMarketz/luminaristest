---
id: "D-2026-11-07-X10A-EMENDA-4-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "X10a EMENDA-4 (assinador local): 4 lacunas de spec achadas na execução, todas pela recomendação — certificado vem em cada assinatura, 2ª unidade por código + token atual, revogar só o vínculo, cadeia da SEFAZ embarcada e vazia"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, questionário (AskUserQuestion) da sessão de feature da EMENDA-4: Cert KeyInfo → \"Vem em cada assinatura (Recomendado)\"; 2ª unidade → \"Novo código + token atual (Recomendado)\"; Revogar → \"Só o vínculo da unidade (Recomendado)\"; Cadeia SEFAZ → \"Arquivo embarcado, vazio por ora (Recomendado)\"; dentro do executa de 07/11 (\"Pode disparar então o que precisa seguir\"), sem merge"
atualizado: "2026-11-07"
---
# D-2026-11-07-X10A-EMENDA-4-LACUNAS

**Estado:** `decided`. **Autorização:** dono, chat, 07/11/2026, questionário (citação no frontmatter). Origem: a
sessão de feature que executa o [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](../../accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md)
e o [`FE-INCR-NFCE-ASSINADOR-brief.md`](../../accounting/FE-INCR-NFCE-ASSINADOR-brief.md) achou quatro pontos que o
BRIEF não cobre (regra 2 da `sessao-feature`). Nenhum fork ratificado (F-AL-0..11, F-FEAS-1..7) muda.

## Decisões

1. **L-AL-1 — certificado no `KeyInfo`.** A NF-e assinada leva `KeyInfo/X509Data/X509Certificate` (`lib/dfeXmlSign.ts`),
   mas o §4.3 e o AL-16 proíbem gravar o certificado (o subject do e-CNPJ traz o CPF do responsável, OID
   2.16.76.1.3.4). **Decisão:** o resultado `ASSINAR` do assinador traz também `certificadoDerB64`; o servidor confere
   o SHA-256 do DER contra o `certThumbprint` do pareamento (divergente ⇒ `CONTEUDO_RECUSADO`), usa o certificado só em
   memória para o `KeyInfo` e não o grava fora do XML da própria nota. Muda o contrato §4.2 em um campo.
2. **L-AL-2 — 2º vínculo do mesmo dispositivo (AL-4).** **Decisão:** gera-se um código na unidade nova; o assinador já
   pareado troca esse código mandando o próprio `Authorization: Bearer` e o mesmo certificado ⇒ o servidor só
   acrescenta o vínculo ao dispositivo existente (sem token novo). Sem Bearer ⇒ dispositivo novo (e o anterior da
   unidade é revogado, AL-4). A raiz do CNPJ da unidade nova tem de ser a do dispositivo.
3. **L-AL-3 — alcance do `DELETE /api/accounting/dfe-assinador/:unitId`** (FE §7 item 1). **Decisão:** revoga só o
   vínculo da unidade (soft-delete); o dispositivo segue nas outras. Quando o último vínculo cai, o dispositivo é
   revogado e o token passa a dar 401. A tela diz quais unidades continuam.
4. **L-AL-4 — cadeia da SEFAZ no TLS do assinador** (insumo ausente §8 item 3, AL-20). **Decisão:** o assinador confia
   só nas raízes de um `ca-icpbrasil.pem` embarcado (`X509ChainTrustMode.CustomRootTrust`, sem o store de raízes do
   Windows). O arquivo entra vazio, com marcador EXT; os testes usam CA local. Sem o arquivo real, `TRANSMITIR` falha
   fechado com `TLS`. As raízes ICP-Brasil oficiais vêm do dono ou do runbook A3.

## Efeitos

- `ADR-ASSINADOR-LOCAL` §5 registra as quatro.
- AL-PR-2 implementa L-AL-2 e L-AL-3; AL-PR-3 implementa L-AL-1; AL-PR-5 implementa L-AL-4.
