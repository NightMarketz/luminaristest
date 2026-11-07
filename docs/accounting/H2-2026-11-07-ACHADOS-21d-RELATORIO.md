# Achados novos da reexecução H2 de 07/11 — relatório (itens 1 a 4)

Autorização: dono, chat, 2026-11-07. Linhas no `docs/operating-manual/GAP-MAP.md` (H2-21d-1..4). Evidência de origem: `docs/accounting/runbook-evidence/H2-2026-11-07/` na branch `fix/h2-19-1-balancete-periodo` (PR #1139).

## 1. Mensagem da senha atual — CORRIGIDO
- Um só `throw` cobria senha ausente e errada (`UserService.ts:199-206`), em inglês e dizendo "obrigatória". O front mostra `err.message` cru (`error-handler.ts:20`, `profile.tsx:194`).
- Correção: duas mensagens PT sob o mesmo `CURRENT_PASSWORD_INVALID` (400): "A senha atual é obrigatória para trocar a senha ou o e-mail." (ausente) e "A senha atual está incorreta." (errada). Teste-guarda vermelho pela asserção da mensagem, depois verde (37/37); `tsc` do server limpo.
- Limite: a mensagem é fixa em PT; quem usa `locale=en` também a vê em PT (o servidor já mistura os dois idiomas).

## 2. Política de senha — pergunta ao dono
- Regra: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$` em `UserDto.ts:30` (update) e `:67` (create). Só aceita letras, dígitos e `@ $ ! % * ? &`; qualquer outro símbolo (`-`, `_`, `.`, espaço, `#`…) reprova.
- Mensagem (EN) fala só de maiúscula/minúscula/número (`UserDto.ts:31`, `:68`; `my-app/public/locales/en/common.json:55`). `H2-tmp-Senha-07!` tem os três e foi recusada só pelo `-`. Confirmado por leitura da regex (nenhum teste novo).
- Opções: **(A)** aceitar qualquer caractere imprimível (trocar a classe por `[^\s]` ou similar; exige alterar create e update juntos, e conferir que login/hash não dependem do conjunto); **(B)** manter o conjunto e dizer a lista na mensagem ("… e só use letras, números e @ $ ! % * ? &"), em PT.
- Recomendação: **A** — senha longa com hífen/underscore é o que gerenciadores geram; restringir o conjunto não dá segurança. B é o mínimo se o conjunto for decisão deliberada. Em qualquer caso a mensagem deveria sair em PT.

## 3. Senha do seed fora da política — causa confirmada
- `SEED_ACCOUNTING_PASSWORD` (valor não impresso; checagem por booleanos): 6 caracteres, tem minúscula e número, **não tem maiúscula**; todos os caracteres estão no conjunto permitido. Viola só a regra "uma maiúscula".
- Por que o seed aceita: `seedAccountingFixtureCli.ts:239` faz `bcrypt.hash` direto, sem passar pelo DTO.
- Caminho proposto (sem tocar em `.env` nem em senha): o dono troca o valor no `.env` por uma que cumpra a política e roda o seed de novo nos tenants desejados (`db:seed:accounting` regrava o hash); opcional, em PR próprio, o CLI validar a senha pelo mesmo schema e falhar cedo. Decisão do dono.

## 4. Aceite do pacote ao finalizar — pergunta ao dono
- Servidor: não impõe. Nenhuma regra de venda (`features/dynamicTables`, ponte `accounting/sync`) lê `PackageValidityAcceptance`; o `PUT status=Finalized` da tabela genérica passa sem aceite (como na evidência: 200). O 409 `PACKAGE_NOTICE_CHANGED` é só do `POST /api/package-acceptances`.
- Front: `SalesCreateModal.tsx:236-247` chama `submit(finalize)` e **depois** `packageAcceptancesService.create`; se falhar, só notifica e a venda fica finalizada com selo "aceite não registrado".
- Decisões já ratificadas que colidem: F-FE-PV-6 (a) — trava no FE + selo, **sem gate no servidor** (`FE-INCR-PACOTE-VALIDADE-brief.md:274`); F-PP-6 (a), 05/10 — aceite **antes** do `PUT Finalized`, condicionado a separar "criar + itens" de "finalizar" (`PACOTE-VALIDADE-PENDENCIAS-brief.md:155`).
- Leituras possíveis: **(1)** comportamento correto como está (F-FE-PV-6 a), o selo cobre — nada a fazer; **(2)** cumprir F-PP-6 (a) no front: gravar o aceite antes de finalizar, e só finalizar se ele existir (sem mexer no servidor); **(3)** gate no servidor (endpoint orquestrador de "finalizar venda de pacote", não o plugin — fere o §2.1 se for no plugin).
- Recomendação: **(2)**, que já está ratificado e fecha a lacuna do caminho normal; (3) só se o dono quiser fechar também venda feita pela API/tabela genérica.
