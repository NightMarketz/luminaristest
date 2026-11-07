# ADR-ASSINADOR-LOCAL — Assinatura e transmissão da NF-e/NFC-e num assinador local, na máquina do cliente, com o certificado do próprio cliente

- **Data:** 2026-11-07
- **Status:** **Accepted 2026-11-07** — as decisões abaixo são os forks **F-AL-0..11 ratificados pelo dono em
  2026-10-30** ([`D-2026-10-30-X10A-EMENDA-4-FORKS`](../plano/decisoes/D-2026-10-30-X10A-EMENDA-4-FORKS.md)) mais as
  quatro lacunas de 07/11 ([`D-2026-11-07-X10A-EMENDA-4-LACUNAS`](../plano/decisoes/D-2026-11-07-X10A-EMENDA-4-LACUNAS.md)).
  Nenhuma decisão nova neste documento. O BRIEF pedia "Proposed com os forks"; como todos os forks já estavam
  ratificados quando o ADR foi escrito, ele nasce `Accepted`.
- **Autorização (ORCH-006):** AL-PR-0 do [`BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md`](../accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md)
  §5, dentro do `executa` do dono, chat, 2026-11-07: *"Pode disparar então o que precisa seguir"* (resposta à mensagem
  que dizia que os `executa` do X10a e do X11 continuavam com ele). Sem merge fora da classe de risco.
- **Nó:** [`X10a`](../plano/nos/X10a.md). Consome [[X10b]] (a porta) e [[D5]] (a credencial); desbloqueia [[X10i]].
- **Origem da mudança:** [`D5-DECISAO-2026-10-30.md`](../plano/gates/D5-DECISAO-2026-10-30.md) §8.5 item 3 e
  [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]: o Luminaris não contrata PSC nem e-CNPJ; quem assina e quem transmite é o
  próprio cliente.
- **Related:** [`ADR-INCR-DFE-EMISSAO-PARCEIRO`](ADR-INCR-DFE-EMISSAO-PARCEIRO.md) §14 (a emenda que tira a
  transmissão do servidor), [`ADR-M2-deploy-topology`](ADR-M2-deploy-topology.md) (uma instância por cliente — o
  assinador fala com a instância do próprio cliente), [`ADR-ARCH-BOUNDARIES`](ADR-ARCH-BOUNDARIES.md) §5 (fronteira
  que o `check:arch` não alcança), [`ADR-OBSERVABILIDADE`](ADR-OBSERVABILIDADE.md) (eventos e alerta de scheduler).

## TLDR (2 linhas)

O servidor continua montando, numerando e decidindo o estado da nota; um **assinador local** (.NET 8 no Windows do
caixa) só assina rsa-sha1 com a chave do token do cliente, depois de reconferir o conteúdo, e abre o mTLS com a SEFAZ
com o mesmo certificado. **Risco principal (inferido, não testado):** a pilha Windows do token precisa assinar PKCS#1
v1.5 com SHA-1 **e** servir de chave cliente no TLS; só o runbook A3 prova.

## 1. Contexto

Até 30/10 o desenho era: assinatura no PSC por OAuth (`PscAssinador`) e mTLS com o e-CNPJ do Luminaris
(`DFE_TRANSMISSOR_CERT`). A decisão de 30/10 tirou os dois contratos. O MOC 7.0 §4.2.3 aceita que o transmissor seja
o próprio emitente [D05 do dossiê `pesquisas-legais/d5-byok-psc`]. O token A3 do cliente fica no caixa; o PIN é digitado
ali, no driver do fabricante. Nada disso pode morar na VPS do cliente.

## 2. Decisões

| # | Decisão | Fork |
|---|---|---|
| D1 | **ADR próprio** para o assinador, além da emenda §14 do ADR-DFE: as decisões são duráveis e fora do domínio fiscal. | F-AL-0 (a) |
| D2 | **Plataforma: .NET 8 (C#), Windows.** `X509Store` (`CurrentUser\My`) vê A1 e A3 pelo mesmo caminho (minidriver/CNG/CSP); `RSA.SignHash` SHA-1 PKCS#1; o certificado do store vira certificado cliente do `HttpClientHandler`/`SslStream` sem engine extra; `XmlDsigC14NTransform` reconfere o digest. Grau: **inferido** (documentação de plataforma; nada testado com token real). | F-AL-1 (a) |
| D3 | **Canal: long-poll HTTPS saindo do caixa.** Nenhuma porta aberta no cliente; reusa o Express; o próprio poll é o heartbeat. | F-AL-2 (a) |
| D4 | **Autenticação: código de pareamento de uso único + token de dispositivo** (só o hash SHA-256 no banco). O certificado é conferido no pareamento (CNPJ-raiz = unidade, validade) e de novo em cada `ASSINAR` (CNPJ do emitente). **Um assinador ativo por unidade**; um dispositivo serve N unidades da mesma raiz. | F-AL-3 (a) |
| D5 | **Contingência:** a do servidor (SEFAZ fora do ar) segue igual; o assinador assina inclusive o QR v3 off-line. O caixa sem Luminaris é frente própria, fora deste ADR ([`BE-INCR-NFCE-OFFLINE-CAIXA-brief.md`](../accounting/BE-INCR-NFCE-OFFLINE-CAIXA-brief.md), F-AL-4 reaberto → b em 30/10). | F-AL-4 |
| D6 | **O assinador confere o conteúdo antes de assinar:** recalcula o `DigestValue` do elemento (c14n 2001 + sha1), confere com o do `SignedInfo`, confere CNPJ-raiz e `tpAmb`, grava um diário local. Um servidor comprometido não assina nota falsa em nome do cliente. | F-AL-5 (b) |
| D7 | **Assinador indisponível ⇒ `PENDING_SIGNATURE`** (estado do PR-7), pré-voo nomeia o faltante `assinador local`, retomada automática no primeiro poll e `reenviar` manual. **Não liga contingência:** assinador fora não é falha de comunicação com a SEFAZ. | F-AL-6 (a) |
| D8 | **PSC continua como 2º adaptador da `AssinadorRemotoPort`, atrás de `DFE_ASSINADOR=psc`, desligado por padrão.** O transporte com o e-CNPJ do Luminaris (`DFE_TRANSMISSOR_CERT`) sai. | F-AL-7 (a) |
| D9 | **Distribuição:** binário sem assinatura de código, servido pela própria instância com SHA-256 na tela; atualização consultando a versão mínima na instância (426 `dfe_signer_versao_antiga`). Microsoft Store pesquisada antes do 2º cliente. | F-AL-8 (a) |
| D10 | **Selo Eletrônico (02/03/2029):** vigilância datada em 03/2028; o assinador lê o store, então o SE-H em token entra sem mudança de desenho (inferido). | F-AL-9 (a) |
| D11 | **O pedido do operador espera o assinador até 20 s** (`DFE_ASSINADOR_TIMEOUT_MS`), resultado síncrono; estourou ⇒ o ciclo de polling continua. | F-AL-10 (a) |
| D12 | **Ordem:** empilha depois de #984, #986 e #992 em `main` (cumprido em 02/11). | F-AL-11 (a) |

## 3. Fronteira

```
caixa do cliente (Windows)                VPS do cliente (server/)                   SEFAZ
assinador local  ── long-poll HTTPS ──▶  /api/dfe-assinador/v1/*  (Bearer de dispositivo)
  - store do Windows (A1/A3)              DfeSignerTask (fila Prisma)
  - PIN no driver, nunca no assinador     SefazNfeEmissor (inalterado; recebe signer + transporte)
  - ASSINAR (confere e assina)
  - TRANSMITIR (mTLS com o mesmo cert) ─────────────────────────────────────────▶  NFeAutorizacao4…
```

- O assinador conhece **duas primitivas**: `ASSINAR` e `TRANSMITIR`. Toda regra fiscal (montagem, numeração, chave,
  QR, `cStat`, máquina de estados, contingência) fica no servidor.
- **Pacote próprio** `assinador-local/` na raiz do monorepo, fora de `server/` e `my-app/`. O `check:arch` não o
  alcança (ADR-ARCH-BOUNDARIES §5); a fronteira é mantida por: (a) o contrato servidor ⇄ assinador ser só o JSON
  Schema gerado do Zod (`server/src/features/accounting/dtos/dfeSigner.schema.json`), commitado e conferido nos dois
  lados; (b) o assinador não importar nada de `server/` nem de `my-app/`; (c) o teste de contrato de ida e volta (a
  fixture assinada no assinador passa no `verifyNfeSignature` do servidor).
- **Autenticação das rotas do dispositivo** é um middleware próprio (Bearer de dispositivo, hash em tempo constante,
  limite de taxa por dispositivo), separado da sessão de usuário. Rota de usuário com token de dispositivo ⇒ 401.
- **PII:** o certificado e o subject não são gravados (o e-CNPJ traz o CPF do responsável). O banco guarda CNPJ-raiz,
  CNPJ de 14 dígitos (F-ADL-3/5 a, para a NFS-e), validade e impressão digital SHA-256. Log e auditoria nunca levam
  XML, envelope, token ou URL com query (OBS-R7).
- **PIN:** quem pede é o driver ou a janela do Windows. O assinador não tem campo de PIN, não guarda nem repassa PIN.

## 4. Persistência

Prisma first-class (infraestrutura de emissão, não tabela que o usuário desenha — ADR-PERSISTENCE-BOUNDARY):
`DfeSignerDevice`, `DfeSignerDeviceUnit`, `DfeSignerPairingCode`, `DfeSignerTask`, como no BRIEF §4.3, com o
`certCnpj` de 14 dígitos (F-ADL-3/5). O payload da tarefa é apagado ao concluir.

## 5. Lacunas resolvidas na execução (07/11)

[`D-2026-11-07-X10A-EMENDA-4-LACUNAS`](../plano/decisoes/D-2026-11-07-X10A-EMENDA-4-LACUNAS.md), todas pela
recomendação:

1. **L-AL-1:** o resultado `ASSINAR` traz `certificadoDerB64`; o servidor confere o SHA-256 contra o `certThumbprint`
   do pareamento e usa o certificado só em memória para o `KeyInfo`.
2. **L-AL-2:** o 2º vínculo nasce de um código da unidade nova trocado com o Bearer do dispositivo já pareado e o
   mesmo certificado.
3. **L-AL-3:** o `DELETE` revoga só o vínculo da unidade; o último vínculo leva o dispositivo junto.
4. **L-AL-4:** o TLS do assinador confia só nas raízes de um `ca-icpbrasil.pem` embarcado (`CustomRootTrust`), que
   entra vazio (EXT) até as raízes oficiais chegarem; sem ele, `TRANSMITIR` falha fechado.

## 6. Riscos e vieses nomeados

- **Token × SHA-1 × TLS no Windows** (inferido): algum minidriver pode recusar SHA-1 ou não servir de chave cliente no
  Schannel. Se acontecer, o caminho A3 cai para aquele fabricante. Prova: runbook A3, passos 2 e 3.
- **EKU "Autenticação Cliente"** no e-CNPJ A3 vendido hoje (MOC §4.2.3): conferir no certificado real (runbook P4).
- **Viés de ancoragem no PSC:** o desenho reusa a porta do PSC (`AssinadorRemotoPort`) porque ela já assina hash; o
  assinador local, além do hash, recebe o conteúdo (D6). A porta ganhou o parâmetro opcional `conteudo`, que o PSC
  ignora.
- **Viés de otimismo na latência:** os 20 s de espera (D11) são proposta, a medir no runbook.

## 7. O que este ADR não decide

- NFS-e pelo mesmo assinador ([`BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md`](../accounting/BE-INCR-DFE-ADN-EMENDA-ASSINADOR-LOCAL-brief.md), F-ADL-1..5).
- NFC-e com o caixa totalmente off-line (F-AL-4 b, BRIEF próprio).
- EFD-Reinf (pelo portal ou contador, F-REINF-2 b).
