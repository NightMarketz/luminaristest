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

10. **(EMENDA 2026-10-29 — MEI, F-XP-4 → b)** Pré-condição: uma empresa com o perfil da empresa no regime **MEI** no ano
    corrente, e a unidade com `regEspTrib = 0`, sem ISS retido e sem IBS/CBS. O `codMun` da unidade precisa ser o
    município do endereço do CNPJ do MEI (RN E0041 — o Luminaris não confere isso). Emitir uma venda de serviço dessa
    unidade.
    Resultado esperado: a ficha mostra "2 — Optante MEI", "Sem tributação federal na nota do MEI — não informe." e
    "Valor aproximado dos tributos: Não informe — facultativo para o MEI.", sem alíquota e sem "Regime de Apuração
    Tributária pelo SN". O portal autoriza a nota, e o XML devolvido pelo retorno manual é aceito sem divergência
    (`cStat 107`, NFS-e MEI).
    EVIDÊNCIA: [print da ficha + resposta do retorno manual]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha da nota FE-INCR-DFE / gate H2 atualizada com o desfecho + data]
- Assinatura do executor: ____________

---

## Execução 2026-11-04 — AI tester — BLOQUEADO (P4, P5, P6 e P7)

Executor: agente claude-opus-5-5, AI tester           Data: 2026-11-04 (13:24–13:46 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-04: *"Pode disparar uma sessão pra corrigir os achados e outra para
cada não feito"*; regra de assinatura em `docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira.

**Ambiente:** build de produção do commit `5acacc5de` (= `origin/main` no início da execução): server `npm run build`
(exit 0) e `node dist/server.js` em `:4100`; my-app `next build` com `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4100/api`
(✓ Compiled successfully) e `next start -H 127.0.0.1 -p 3100`. O `server/.env` da worktree é cópia do `.env` local com
`DATABASE_URL` absoluto para o dev.db **real** (`server/prisma/prisma/dev.db`), `PORT=4100`,
`ALLOWED_ORIGIN=http://127.0.0.1:3100`, `DFE_PARTNER=manual` e `DFE_PARTNER_ENV=homologacao`. `prisma migrate status`:
"Database schema is up to date!". Backup antes da 1ª escrita: `server/prisma/prisma/dev.db.bak-dfe-manual-2026-11-04`
(API de backup do SQLite, `integrity_check -> ok`). Usuário `seed-presumido`, unidade `seed-unit-presumido`
(`cmuw4yqxg001jcii0iz2yb9rw`). Runner Puppeteer com um Chromium headless, sob a trava de tela (tomada às 13:24, apagada
depois de derrubar server e app, com 3100/4100 livres). Senha redigida no log. P7 (DevTools) trocado pelo log de rede do runner.

### Pré-condições

| # | Resultado | Evidência |
|---|---|---|
| P1 | Pré-merge não se aplica: o PR-2 do FE-INCR-DFE está em `main`. Rodou o commit `5acacc5de`. | `git log origin/main --oneline -1` → `5acacc5de docs: fold do X10a …` |
| P2 | **OK** | `GET /api/nfe/dfe/status -> 200` com `"enabled":true,"partner":"manual","ambiente":"homologacao"` ([rede](runbook-evidence/DFE-MANUAL-2026-11-04/P2-P4-net.txt)) |
| P3 | **OK** | `curl http://127.0.0.1:3100/` → `200`, `next start` sobre o `next build` |
| P4 | **NÃO** se sustenta: perfil incompleto e unidade sem CNPJ | ver abaixo |
| P5 | **NÃO** se sustenta: o serviço tem perfil (`cTribNac 010701`), mas falta o cNBS | passo 1, abaixo |
| P6 | **NÃO** se sustenta: o cliente não tem CPF/CNPJ válido | passo 1, abaixo |
| P7 | **NÃO** se sustenta para o agente: o acesso ao Emissor Nacional com o certificado do emitente é dado externo | — |
| P8 | Não exercitada: o `POST /nfe/dfe/documents` só sai no "Confirmar", que a tela não ofereceu. Há correção em `main` (`6f95e2a50`, #549, "L-PR2-1 (dCompet ISO UTC)"). Grau: inferido pelo git log, sem tela. | — |
| P9 | Não exercitada: depende de um documento `REJECTED` (passo 5). Mesma correção (#549, "L-PR2-2 (reenvio REJECTED)"). Grau: inferido. | — |

**P4, estado encontrado:**
```text
GET /api/accounting/fiscal-profile?unitId=cmuw4yqxg001jcii0iz2yb9rw -> 200
   emissao={"completo":false,"faltantes":["pTotTribEstCent","pTotTribMunCent","ibsCbsCst","ibsCbsClassTrib"],"pendingExternalValidation":[],"opSimpNac":1} codMun=3550308 regEspTrib=0 issAliquotaBp=200
(tela) Perfil da unidade incompleto — Tributos aproximados — estadual (%) · municipal (%) · IBS/CBS — CST · IBS/CBS — cClassTrib
```
[print](runbook-evidence/DFE-MANUAL-2026-11-04/P4-perfil-fiscal-antes.png) ·
[texto](runbook-evidence/DFE-MANUAL-2026-11-04/P4-perfil-fiscal-antes.txt)

**Desvio de dado (feito e desfeito):** para medir até onde a tela ia, preenchi pela aba "Perfil fiscal" estes valores:
estadual 0,00, municipal 2,00 (= a alíquota de ISS já gravada), CST 000 e cClassTrib 000001. Salvei: `PUT -> 200`, e
`emissao.completo` virou `true`, com o selo "Perfil da unidade completo"
([print](runbook-evidence/DFE-MANUAL-2026-11-04/P4-perfil-fiscal-completo.png)). O passo 1 mostrou, porém, faltas que são
dado do dono (CNPJ, CPF/CNPJ do cliente, NBS). Por isso **desfiz** o desvio pela mesma tela: `PUT -> 200` com os quatro campos
`null`, e a resposta voltou às mesmas 4 faltas ([print](runbook-evidence/DFE-MANUAL-2026-11-04/P4-perfil-fiscal-revertido.png)).
Conferência no banco (só leitura), linha `fiscal_profiles` da unidade, dev.db × backup:
`[('updatedAt', 1793744562116, 1793809938865)]`. É a única diferença. As contas de PIS/COFINS que o corpo do PUT não leva
seguem gravadas, porque o servidor mescla. `fiscal_documents`: 0 linhas antes e depois. Rede literal em
[P2-P4-net.txt](runbook-evidence/DFE-MANUAL-2026-11-04/P2-P4-net.txt).

### Passos

**Passo 1 — BLOQUEADO (P4/P5/P6).** O ramo de pendência confere com o esperado. O ramo feliz não foi alcançado.
Usei a venda de 04/11/2026: Cliente H2, Finalizada, R$ 80,00, um item `Service | Corte H2 | 1 | R$ 80,00`, sem documento
fiscal. "Emitir NFS-e" aparece ao lado de Devolver/Pagar
([print do detalhe](runbook-evidence/DFE-MANUAL-2026-11-04/passo1-00-venda-detalhe.png)). O clique, ainda com o desvio
do P4 aplicado, deu:
```text
POST /api/nfe/dfe/preview -> 200  req: {"unitId":"cmuw4yqxg001jcii0iz2yb9rw","saleId":"cmw1o7icf002kci40qh1g7ttk","kind":"NFSE"}
   res: {"success":true,"data":{"ok":false,"faltantes":["serviço 'cmvtxuu71000tci9chpnj578o': falta cNBS (obrigatório com ibsCbsInformar, E0322)","cliente 'cmvtxuu6b000pci9c3yk4b6n2': taxId ausente ou inválido por dígito verificador","CNPJ da unidade ausente ou inválido (cadastre em 'units')"],"competenciaAlerta":false,"payloads":[],"tieOut":{"vServCents":"0","ledgerCents":"0","matches":false}}}
(modal) Emitir NFS-e · A venda ainda não pode emitir. Falta: [as 3 linhas acima] · botões: Fechar | Fechar
```
[print do modal](runbook-evidence/DFE-MANUAL-2026-11-04/passo1-01-modal-emitir.png) ·
[texto](runbook-evidence/DFE-MANUAL-2026-11-04/passo1-01-modal-emitir.txt) ·
[rede](runbook-evidence/DFE-MANUAL-2026-11-04/passo1-net.txt)

O roteiro prevê exatamente isto: "Se houver pendência, a lista do servidor aparece e não há 'Confirmar'". O modal "Documentos a
emitir: 1" com o total só aparece com P4–P6 de pé. Os três dados que faltam são do emitente e do cliente: CNPJ real da unidade
(o mesmo do certificado), CPF/CNPJ do cliente e NBS do serviço. Não os inventei. Caso adversarial: a falta seria efeito do meu
desvio? Não. O desvio só preencheu campos do perfil, e as 3 faltas são de outras tabelas (`units.data.cnpj`, cliente, perfil do
serviço). Sem o desvio, o perfil incompleto somaria uma 4ª causa. Grau: verificado (tela + rede). Isso corrige a leitura de
partida ("passo 1 rodável"): no dev.db real, o passo 1 roda mas para na lista de pendências.

**Passos 2–10 — BLOQUEADOS, não executados.**
- 2, 3, 5, 6 e 10: dependem do "Confirmar" (P4–P6) e de emitir no Emissor Nacional com o certificado do emitente (P7, dado
  externo). O 6 depende também de P9, e o 10 de uma empresa MEI com o município do CNPJ.
- 4 (PV-1..PV-10): é medição do portal, que só existe dentro do Emissor Nacional (P7).
- 7 (cancelamento): depende da nota 2 (passo 3) e do XML do evento baixado no portal (P7).
- 8: o portal envia ao tomador? Medição no portal (P7).
- 9: exige `DFE_PARTNER_ENV=producao` e uma nota autorizada, com valor fiscal. Fica a critério do dono.

### Desfecho (execução 2026-11-04)
[x] BLOQUEADO — as pré-condições P4 (perfil fiscal da unidade incompleto e unidade sem CNPJ), P5 (serviço sem cNBS), P6
(cliente sem CPF/CNPJ válido) e P7 (Emissor Nacional, dado externo) não se sustentavam. A tela foi aberta só no passo 1, que
parou no ramo de pendência previsto. Nenhum passo de emissão começou e nenhum documento fiscal foi criado.

### Registro (execução 2026-11-04)
- **Para destravar (dado do dono):**
  1. no registro da unidade `seed-unit-presumido` (tabela `units`), o CNPJ do emitente, o mesmo do certificado;
  2. no perfil fiscal da unidade, tributos aproximados estadual/municipal, CST e cClassTrib do IBS/CBS;
  3. no perfil do serviço, o NBS. O `cTribNac` atual, `010701`, é "Suporte técnico em informática…", incoerente com "Corte H2";
     confira o código antes de emitir;
  4. no cliente da venda, CPF/CNPJ válido;
  5. acesso ao Emissor Nacional (homologação = produção restrita) com o certificado do emitente.

  Depois disso, o passo 1 pode ser refeito na mesma venda (`cmw1o7icf002kci40qh1g7ttk`), que segue sem documento fiscal.
- **DFE-1 (texto)**: as pendências do preview citam o id interno em vez do nome, o que impede o operador de saber o que
  cadastrar: "serviço 'cmvtxuu71000tci9chpnj578o'" e "cliente 'cmvtxuu6b000pci9c3yk4b6n2'"
  (`server/src/features/accounting/services/FiscalDocumentEmissionService.ts:816` e `:839`; mesmas mensagens em `:1278`). "CNPJ
  da unidade ausente ou inválido (cadastre em 'units')" (`:879`, `:1117`, `:1299`) cita o nome da tabela, não a tela. É a mesma
  classe do IMO-3 (RUNBOOK-H2-IMOBILIZADO). Instrumentação → correção: teste do preview com serviço sem cNBS e cliente sem taxId
  que exija o nome do serviço e do cliente na mensagem. Hoje ele reprova, porque a mensagem traz o id.
- **P8/P9**: não exercitadas. A reexecução confere na tela o `POST /nfe/dfe/documents -> 200` do passo 2 e o "Reenviar" do passo 6.
- Desvio de dado: o perfil fiscal da unidade foi alterado e restaurado pela tela, e só o `updatedAt` mudou. Fora isso, nada foi
  criado no dev.db.
- Rastreio: a nota `FE-INCR-DFE` e o `docs/plano/gates/H2.md` ficam para o fold do dono.
- Assinatura do executor: agente claude-opus-5-5, AI tester, sob autorização do dono (chat, 2026-11-04). A assinatura atesta a
  execução e a conferência da evidência. Não substitui oráculo externo (Emissor Nacional, XML real).

---

## Execução 2026-11-11 — AI tester — BLOQUEADO no passo 2 (P7: Emissor Nacional)

Executor: agente claude-sonnet-5-5, AI tester           Data: 2026-11-11 (17:10–17:45 -03:00)
Autorização (citada literalmente): dono, chat, 2026-11-11: *"rode todos os runbooks que são possíveis"*; regra de assinatura em
`docs/operating-manual/RUNBOOK-FORMAT.md` §Fronteira (emenda de 2026-10-29), só neste runbook e nesta execução.

**Ambiente:** commit `54e5086d0` (= `origin/main` no início, branch `claude/rb-dfe-w7-318a11`). `server`: `npm run build` + `node dist/server.js` em `:4271`.
Front: `next build` (`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4271/api`) + `next start -H 127.0.0.1 -p 3271`. Ambos dos arquivos desta worktree.
Banco **descartável novo** (`file:./prisma/kro-rb.db`): `prisma migrate deploy`, `seed-accounting --i-have-a-backup` e `activate-salon-binding.mjs` nas duas
unidades. `DFE_PARTNER=manual`, `DFE_PARTNER_ENV=homologacao`. O dev.db real não foi tocado. Tenant `seed-presumido`, unidade `seed-unit-presumido`
(`cmwcjzhrz004mci2s6n27tv5f`). Runner `scripts/runbook-tela.mjs` (Chromium sem janela). Desvio de ambiente: as portas 3150/3160/4150/4160 já estavam
ocupadas por processos de outras sessões (um deles ligado ao dev.db real); desisti delas e usei 3271/4271. Minhas chamadas de escrita foram todas para 4271.

### Dados preparados (P4–P6), pela API do próprio app, com valores de teste

| Dado | Como | Valor de teste |
|---|---|---|
| CNPJ da unidade | `PUT /dynamic-tables/<Units>/data/<unit>` | `11222333000181` (CNPJ fictício de DV válido) |
| Perfil fiscal da unidade | `PUT /accounting/fiscal-profile` | `codMun 3550308`, ISS 2,00 % (`issAliquotaBp 200`), tributos aprox. fed/est 0,00 e mun 2,00, CST `000`, cClassTrib `000001` |
| Cliente | `POST /dynamic-tables/<Customers>/data` | "Cliente DFE Teste", `taxId 52998224725` (CPF fictício de DV válido), id `cmwck7300000hcitkz237l1dv` |
| Serviço | `POST /dynamic-tables/<Services>/data` + `PUT /accounting/service-fiscal-profiles/<id>` | "Corte DFE Teste" R$ 80,00, `cTribNac 060101` (Barbearia, cabeleireiros…), `cNBS 123456789` (fixture dos testes do projeto) |
| Venda | `POST` Sales (Rascunho) + `POST` Sale Items (`Service`) + `PUT` status `Finalized`; `date` ISO UTC como a tela grava | `cmwck7e1j000ucitkxoraz7le`, R$ 80,00 |

### Pré-condições

| # | Resultado | Evidência |
|---|---|---|
| P1 | Pré-merge não se aplica: código = `main` (`54e5086d0`) | `git rev-parse --short HEAD` → `54e5086d0` |
| P2 | **OK** | `GET /api/nfe/dfe/status -> 200` com `"enabled":true,"partner":"manual","ambiente":"homologacao"` |
| P3 | **OK** | `curl http://127.0.0.1:3271/` → `200`, `next start` sobre `next build` |
| P4 | **OK** (depois do preparo) | `GET /api/accounting/fiscal-profile?unitId=cmwcjzhrz004mci2s6n27tv5f` → `{"emissao":{"completo":true,"faltantes":[],"pendingExternalValidation":[],"opSimpNac":1},"codMun":"3550308","regEspTrib":0,"issAliquotaBp":200}`; o CNPJ `11222333000181` aparece como emitente na ficha |
| P5 | **OK** | `PUT /accounting/service-fiscal-profiles/cmwck730n000lcitkx2dnte5o -> 200` `{"cTribNac":"060101","cTribNacDescricao":"Barbearia, cabeleireiros, manicuros, pedicuros e congêneres.","cNBS":"123456789",…}` |
| P6 | **OK** | detalhe da venda: Finalizada, 1 item `Service`, cliente com CPF; lançamento da venda no razão (`GET /accounting/entries` → `Receita…`, id `cmwck7e3s0018citkm4bh4oaz`). [print](runbook-evidence/DFE-MANUAL-2026-11-11/passo1-00-venda-detalhe.png) |
| P7 | **NÃO se sustenta** para o agente: o acesso ao Emissor Nacional com certificado/login do emitente é dado externo; o CNPJ da unidade é fictício e não existe no portal | — |
| P8 | **OK** (exercitada) | `POST /api/nfe/dfe/documents -> 200`, não `400 infDPS.dCompet`, com a venda de `date` ISO: [rede](runbook-evidence/DFE-MANUAL-2026-11-11/passo2-net.txt) |
| P9 | Não exercitada: depende de documento `REJECTED` (passo 5, portal) | — |

### Passos

**Passo 1 — PASSOU.** Venda aberta pela lista (Financeiro → Vendas → "Ver Detalhes"), clique em "Emitir NFS-e". O modal mostra "Documentos a emitir (um por
código de serviço): 1" e "Total dos serviços: R$ 80,00", botões Cancelar | Confirmar, sem lista de pendências e sem aviso de diferença com o razão.
```text
POST /api/nfe/dfe/preview -> 200  req: {"unitId":"cmwcjzhrz004mci2s6n27tv5f","saleId":"cmwck7e1j000ucitkxoraz7le","kind":"NFSE"}
(modal) Emitir NFS-e · Documentos a emitir (um por código de serviço): 1 · Total dos serviços: R$ 80,00 · Cancelar | Confirmar
```
[print do detalhe](runbook-evidence/DFE-MANUAL-2026-11-11/passo1-00-venda-detalhe.png) ·
[print do modal](runbook-evidence/DFE-MANUAL-2026-11-11/passo1-01-modal-emitir.png) ·
[texto](runbook-evidence/DFE-MANUAL-2026-11-11/passo1-01-modal-emitir.txt) · [rede](runbook-evidence/DFE-MANUAL-2026-11-11/passo1-net.txt)

**Passo 2 — metade feita; a outra metade BLOQUEADA (P7).** "Confirmar" executado: `POST /api/nfe/dfe/documents -> 200` e a ficha "Ficha para o Emissor
Nacional — tentativa 1" abriu com as 4 seções (1. Pessoas, 2. Serviço, 3. Valores, 4. Emitir NFS-e). Os valores batem com o preparo: data `11/11/2026`,
emitente `11222333000181`, município `3550308`, tomador CPF `52998224725` "Cliente DFE Teste", `06.01.01`, NBS `123456789`, valor `80,00`, alíquota `2,00`,
tributos aprox. `0,00 / 0,00 / 2,00`, CST `000`, cClassTrib `000001`, e o botão "Registrar retorno".
[print da ficha](runbook-evidence/DFE-MANUAL-2026-11-11/passo2-00-ficha.png) · [texto](runbook-evidence/DFE-MANUAL-2026-11-11/passo2-00-ficha.txt) ·
[rede](runbook-evidence/DFE-MANUAL-2026-11-11/passo2-net.txt). A parte que exige o portal (emitir, baixar o XML, "Registrar retorno", faixa verde de
"Releitura") **não foi executada**: sem certificado do emitente, e um XML sintético não seria retorno do portal. Nada foi colado como retorno. O portal
não foi aberto, então não há o que colar de F-FE-DFE-9.

**Passos 3–10 — BLOQUEADOS, não executados** (dependem do Emissor Nacional, P7, ou de decisão do dono):
- 3 (divergência), 5 (rejeição), 6 (reenvio; depende também de P9) e 7 (cancelamento, XML do evento, PV-1/F-FE-DFE-9): precisam emitir ou recusar no portal.
- 4 (PV-1..PV-10): é medição do portal.
- 8: o portal envia ao tomador? Medição no portal.
- 9: exige `DFE_PARTNER_ENV=producao` e nota autorizada, com valor fiscal. Decisão do dono.
- 10 (MEI): exige empresa MEI e o município do CNPJ real no portal.

### Desfecho (execução 2026-11-11)
[x] BLOQUEADO — no passo 2: o passo 1 passou e o "Confirmar" gerou a ficha corretamente (P8 fechada), mas a pré-condição P7 (acesso ao Emissor Nacional
com o certificado do emitente, dado externo) não se sustenta. A emissão no portal e tudo que dela depende (passo 2, parte do portal, e passos 3–10) não foi
executado. Um documento fiscal em `AWAITING` (tentativa 1, id `cmwcke3aw0001cig04aq9qwh4`) ficou no banco descartável.

### Registro (execução 2026-11-11)
- **Verificado agora, e que a execução de 04/11 não alcançou:** P4–P6 e P8 de pé; passo 1 (modal "Documentos a emitir: 1"); ficha da tentativa 1 com os campos certos.
  Ficam para o dono: o portal (P7), PV-1..PV-10, o XML do evento e o passo 9.
- **Para destravar o resto:** acesso ao Emissor Nacional (homologação = produção restrita) com o certificado de um emitente real e o CNPJ dele na unidade.
  Depois, repete-se o preparo acima com esse CNPJ e segue-se do passo 2.
- Achados no caminho: (i) as portas 3150/3160/4150/4160 estavam com servidores de outras sessões, um deles ligado ao dev.db real. O `next start`/`node` da segunda sessão morre com
  EADDRINUSE e quem testa passa a conversar com o servidor errado; só notei porque o login devolveu um usuário criado em 24/09.
- Lacunas registradas: 0 (a) e 3 na execução do W7 desta mesma sessão. `scripts/lacunas.mjs` ainda não está em `origin/main` (só no commit `cf863ba72`, branch `claude/lacunas-debitos-tecnicos-7fc8e5`); usei o script desse commit. O achado acima (portas) é de ambiente, não de código, e vai só no corpo do PR.
- Rastreio: `docs/plano/nos/FE-INCR-DFE.md` (`estado_detalhe`) atualizado nesta execução; `docs/plano/gates/H2.md` fica para o fold do dono.
- Assinatura do executor: agente claude-sonnet-5-5, AI tester, sob autorização do dono (chat, 2026-11-11). A assinatura atesta a execução e a conferência da
  evidência. Não substitui oráculo externo (Emissor Nacional, XML real).
