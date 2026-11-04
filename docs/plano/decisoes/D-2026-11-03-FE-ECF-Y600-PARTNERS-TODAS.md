---
id: "D-2026-11-03-FE-ECF-Y600-PARTNERS-TODAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Cadastro de sócios pela tela lista todas as vigências vivas: parâmetro novo todas=true no GET /accounting/partners"
estado: "decided"
autorizacao: "dono, chat, 2026-11-03: \"Param. novo no GET /partners\" — resposta à lacuna de spec do PR-2 do FE-INCR-ECF-Y600"
atualizado: "2026-11-03"
---
# D-2026-11-03-FE-ECF-Y600-PARTNERS-TODAS — lista de todas as vigências no cadastro de sócios

**Estado:** `decided`. **Autorização:** dono, chat, 03/11/2026: *"Param. novo no GET /partners"*.

**Lacuna (sessão de feature do [[FE-INCR-ECF-Y600]], PR-2):** o item 16 do BRIEF pede que a seção "Sócios" liste *todas*
as vigências vivas, não só as de hoje, com filtro de data opcional. Só que `GET /accounting/partners` devolvia apenas as
vigentes numa data (hoje por padrão; `PartnerService.list`), e nenhuma rota lia todas. Mexer no cadastro do
[[IRRF-DISTRIBUICAO]] estava fora do write_set do nó, então a sessão parou e perguntou.

**Caminhos apresentados:** (a) parâmetro novo no `GET /accounting/partners` que devolve todas as vigências vivas;
(b) a seção lista só as vigentes na data escolhida, o que diverge do texto do item 16.

**Decisão:** (a). `?todas=true` faz a lista trazer todas as vigências vivas, inclusive as encerradas e as futuras. `data`, a
soma e o aviso continuam calculados sobre as vigentes no dia, como antes. `todas` junto com `data` dá 400, para que nenhum
parâmetro seja aceito e ignorado. Sem `todas`, o comportamento é o mesmo de antes. Na tela, sem filtro a seção pede
`todas=true`; com data, pede as vigentes nela.
