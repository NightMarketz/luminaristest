# RUNBOOK: H2-DFE-MANUAL — Emissão manual de NFS-e pela tela (ficha espelho, retorno pelo XML, rejeição/reenvio, cancelamento)

> Preparado por agente em 2026-10-06 contra a branch `claude/fe-incr-dfe-pr2` (FE-INCR-DFE PR-2, BRIEF
> `docs/accounting/FE-INCR-DFE-brief.md` item 29 = item 18 do `BE-INCR-DFE-MANUAL-brief.md`). **Em branco de propósito:**
> EVIDÊNCIA, desfecho e assinatura são do executor humano — runbook sem assinatura é nulo
> (`docs/operating-manual/RUNBOOK-FORMAT.md`). Agente não preenche.
>
> **O que o agente já viu (não substitui nenhum passo abaixo):** em build de produção, com o server do commit da branch,
> `DFE_PARTNER=manual`, `DFE_PARTNER_ENV=homologacao` e um banco **descartável** (seed `db:seed:accounting`, tenant
> `seed-presumido`), o botão "Emitir NFS-e" apareceu na venda finalizada, o preview mostrou 1 documento e o total, e a
> ficha abriu nas 4 seções. Duas falhas do **BE** apareceram no caminho e estão nas pré-condições P8/P9: hoje elas
> impedem os passos 2 e 6 numa venda criada pela tela. O agente **não** foi ao portal, não baixou XML real e não
> enviou retorno — é isso que este runbook fecha.

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-10-06 — "Executa o PR-2 do FE-INCR-DFE — sessao-feature; emissão real fora; merge só com meu
OK" (nó `FE-INCR-DFE`, BRIEF item 29). A execução deste runbook (emissão no portal) é decisão do dono — **emissão real
sai daqui, não do PR**. Rastreio a atualizar no fim: nota `docs/plano/nos/FE-INCR-DFE.md` (`estado_detalhe`) e o item de
sign-offs de browser do Bloco A (`docs/plano/gates/H2.md`).

---

## Pré-condições (verificar TODAS antes do passo 1)

| # | Pré-condição | Como verificar | OK? |
|---|---|---|---|
| P1 | Código = o PR-2 do FE-INCR-DFE **mergeado em `main`** (ou a branch checada, se o sign-off for pré-merge — anote qual) | `git log origin/main --oneline -3` ou `git branch --show-current` | [ ] |
| P2 | Server no ar, do commit exato (servidor velho serve código velho), com `DFE_PARTNER=manual` e `DFE_PARTNER_ENV` = o ambiente que você vai usar no portal (`homologacao` = produção restrita; `producao` = nota com valor fiscal) | `curl -s -H "Authorization: Bearer <token>" http://localhost:3001/api/nfe/dfe/status` → `enabled: true`, `partner: "manual"`, `ambiente` = o esperado | [ ] |
| P3 | Front em **build de produção** (`cd my-app && npm run build && npm run start`), não `next dev` | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → `200` | [ ] |
| P4 | Perfil fiscal da unidade **completo** (aba Contabilidade → "Perfil fiscal": selo "Perfil da unidade completo") e a unidade com **CNPJ** | `GET /api/accounting/fiscal-profile?unitId=…` → `emissao.completo: true` | [ ] |
| P5 | O serviço da venda com **perfil fiscal de serviço** (`cTribNac` da lista nacional) | Aba "Perfil fiscal" → linha do serviço sem o selo "sem perfil" | [ ] |
| P6 | Cliente com **CPF/CNPJ válido**; venda **finalizada e contabilizada**, só com serviço(s) | Detalhe da venda: status "Finalizada"; Razão com o lançamento da venda | [ ] |
| P7 | Acesso ao **Emissor Nacional** (`https://www.nfse.gov.br/EmissorNacional`) com o certificado/login do emitente; DevTools aberto (console + Network, filtro `nfe/dfe`) | — | [ ] |
| P8 | **[BLOQUEIA o passo 2 hoje]** A venda grava `date` como ISO (`2026-10-06T00:00:00.000Z`) e a emissão a usa crua como `dCompet` → `POST /nfe/dfe/documents` responde **400** `infDPS.dCompet` fora de `AAAA-MM-DD` (achado do agente em 06/10, lacuna nova do PR-2). Só siga com a correção do BE em `main` | `POST /api/nfe/dfe/documents` da venda → `200` (não `400 VALIDATION_ERROR` com `path: infDPS.dCompet`) | [ ] |
| P9 | **[BLOQUEIA o passo 6 hoje]** `reenviar` de um documento `REJECTED` responde `emissao_bloqueada: já existe documento vivo (status REJECTED)` — a remontagem conta o próprio documento como "vivo" (achado do agente em 06/10). Só siga com a correção do BE em `main` | No passo 6, o clique em "Reenviar" abre a ficha da tentativa 2 (não a mensagem `emissao_bloqueada`) | [ ] |

## Passos

Cada passo tem três campos. EVIDÊNCIA é obrigatória e é sempre um artefato colado ou anexado (screenshot, linha do
Network, o XML, a chave da nota) — nunca uma frase descrevendo que deu certo.

1. Na lista de vendas, abrir a venda de P6. Clicar **"Emitir NFS-e"** (ao lado de Devolver/Pagar).
   Resultado esperado: modal "Emitir NFS-e" com "Documentos a emitir: 1" (um por código de serviço) e o total da venda;
   sem aviso de diferença com o razão. Se houver pendência, a lista do servidor aparece e não há "Confirmar".
   EVIDÊNCIA: [screenshot do modal]

2. **Nota 1** — "Confirmar". A ficha "Ficha para o Emissor Nacional — tentativa 1" abre. No portal, Emissão Completa:
   copiar campo a campo na ordem das seções (1. Pessoas → 2. Serviço → 3. Valores → 4. Emitir), seguindo as instruções
   da ficha. Emitir. "Baixar XML" (e o DANFSe). De volta à ficha, "Selecionar XML da NFS-e" (+ DANFSe) → "Registrar
   retorno".
   Resultado esperado: faixa verde "Releitura: a nota autorizada é igual ao que foi enviado"; o cartão em "Documentos
   fiscais" fica **Autorizada**, com o número da NFS-e e a chave. Recarregar a página e abrir a venda: a mesma faixa verde.
   EVIDÊNCIA: [screenshot da ficha aberta + screenshot do cartão depois de recarregar + a chave da nota]

3. **Nota 2** — outra venda (P6). Emitir pela tela e, no portal, digitar **de propósito** um valor diferente num campo
   marcado "conferido na volta" (ex.: o **Valor do Serviço**). Emitir, baixar o XML, registrar o retorno.
   Resultado esperado: faixa "Releitura: a nota autorizada DIVERGE…" com a tabela Campo | Enviado | Autorizado apontando
   o campo alterado; cartão **Autorizada com divergência** com a pendência "só sai cancelando e emitindo de novo".
   EVIDÊNCIA: [screenshot da tabela da releitura + do cartão]

4. **PV-1..PV-10** — uma linha por pendência de validação do BRIEF §5, com o que o portal mostrou:
   - PV-1 (o portal entrega o **XML do evento** de cancelamento?): EVIDÊNCIA: [ ]
   - PV-2 (formatos aceitos ao colar: data `DD/MM/AAAA`, valor sem milhar `1234,56`, CPF/CNPJ só dígitos, `cTribNac` `06.01.01`, NBS): EVIDÊNCIA: [ ]
   - PV-3 ("Tomador no Brasil" exige CEP e endereço?): EVIDÊNCIA: [ ]
   - PV-4 (a busca do município aceita o código IBGE?): EVIDÊNCIA: [ ]
   - PV-5 (como o portal pede o percentual aproximado dos tributos — Simples/regime normal): EVIDÊNCIA: [ ]
   - PV-6 (a "Emissão Simplificada" aparece para o Simples?): EVIDÊNCIA: [ ]
   - PV-7 (URL da homologação / "produção restrita"): EVIDÊNCIA: [ ]
   - PV-8 ("Código interno do contribuinte" é obrigatório?): EVIDÊNCIA: [ ]
   - PV-9 (rótulos dos combos de Regime de Apuração pelo SN [141] e Regime Especial de Tributação [142]): EVIDÊNCIA: [ ]
   - PV-10 (onde o portal pede CST/cClassTrib do IBS/CBS, se pedir): EVIDÊNCIA: [ ]
   Resultado esperado: cada linha com o print ou o texto do portal colado. Divergência do que a ficha diz **não é falha
   deste runbook**: é a medição que calibra `portalFormat.ts` e reabre o fork indicado no BRIEF §5.

5. **Rejeição** — numa 3ª venda, provocar no portal uma recusa (ex.: alíquota fora da faixa do município). No cartão
   (status "Aguardando retorno do portal"), "Registrar rejeição": copiar código e mensagem que o portal mostrou →
   "Registrar rejeição".
   Resultado esperado: cartão **Rejeitada**, com o código e a mensagem listados e o botão "Reenviar".
   EVIDÊNCIA: [screenshot do portal com a recusa + do cartão]

6. Corrigir a causa (perfil fiscal ou venda) e clicar **"Reenviar"** (depende de P9).
   Resultado esperado: a ficha abre como "tentativa 2", com a DPS remontada (o valor corrigido aparece). Emitir no portal
   e registrar o retorno como no passo 2.
   EVIDÊNCIA: [screenshot da ficha "tentativa 2" + do cartão autorizado]

7. **Cancelamento da nota 2** — no portal, usar **"Cancelar"** (não "Substituir"), com motivo e justificativa; baixar o
   **XML do evento** (PV-1). No cartão da nota 2, "Cancelar": mesmo motivo, mesma justificativa (15 a 255 caracteres),
   XML do evento → "Registrar cancelamento".
   Resultado esperado: cartão **Cancelada**. Se o portal **não** entregar o XML do evento (só HTML — Guia p. 80), marcar
   BLOQUEADO neste passo e colar o que o portal ofereceu: o dono reabre o F-MAN-5 com isso (F-FE-DFE-9).
   EVIDÊNCIA: [screenshot do portal no cancelamento + o XML do evento (ou o HTML) + o cartão]

8. **(F-MCE-1 a, 02/10)** O portal envia a nota ao tomador quando o e-mail dele está no cadastro?
   Resultado esperado: só medição — a entrega segue fora do produto (o operador baixa e repassa).
   EVIDÊNCIA: [o que o portal mostrou ou enviou — print da tela de envio ou do e-mail recebido]

9. Em produção (`DFE_PARTNER_ENV=producao`), no cartão autorizado: "Baixar XML" e "Baixar DANFSe".
   Resultado esperado: os arquivos `nfse-<número>.xml` / `.pdf` baixam e abrem; em homologação os botões **não**
   aparecem (o anexo só é guardado em produção).
   EVIDÊNCIA: [os dois arquivos ou o print da pasta de downloads]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha da nota FE-INCR-DFE / gate H2 atualizada com o desfecho + data]
- Assinatura do executor: ____________
