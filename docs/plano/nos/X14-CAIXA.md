---
id: "X14-CAIXA"
tipo: "regua"
dominio: "fiscal"
titulo: "Simples Nacional ME/EPP: base do DAS pela receita recebida (regime de caixa) — registro de recebíveis e gatilhos do art. 20"
estado: "planned"
estado_detalhe: "Nasceu da D2 (c) de D-2026-10-10-X14-PROXIMOS-PASSOS: separado do X14, que fechou no cálculo por competência. Sem BRIEF, sem autorização. Hoje o perfil já guarda simplesRegimeApuracao (#603), mas só o alerta NFSE_DIVERGE_RECEITA lê o campo; a base do DAS continua por competência"
depende_de: ["[[X14]]", "[[D-2026-10-10-X14-PROXIMOS-PASSOS]]"]
autorizacao: ""
ancora_sdd: "—"
atualizado: "2026-10-10"
prs: []
---
# X14-CAIXA — base do DAS por recebimento (regime de caixa)

**Estado:** `planned` — sem BRIEF, sem autorização (o campo vazio não roteia).  
**Autorização:** nenhuma. Planejar exige uma frase do dono pedindo; o código exige `executa`.  
**Depende de:** [[X14]] (cálculo por competência, perfil com `simplesRegimeApuracao`).

## Escopo legal (conferido em [[D-2026-10-10-X14-PROXIMOS-PASSOS]], Res. CGSN 140)

1. Base mensal = receita **recebida**. RBT12, limites, sublimites e alíquota seguem **por competência** (art. 19 p.ú.).
2. Opção irretratável no ano (art. 16 § 1º), registrada na apuração de nov/dez/início (art. 19 I–III).
3. Parcela a prazo não vencida entra na base até o último mês do ano seguinte ao da prestação/operação (art. 20 I).
4. Receita não recebida antecipada no encerramento, no retorno à competência e no mês anterior à exclusão (art. 20 II).
5. Impedimento do art. 12 com caixa mantido: a receita não recebida vai ao ICMS/ISS direto ao ente (art. 20 IV).
6. Registro dos valores a receber no modelo do Anexo IX (arts. 20 III e 77). O Anexo IX ainda não foi lido.
7. Devolução e cancelamento deduzem só o valor efetivamente devolvido (arts. 17 p.ú. e 18 § 1º).

## Docs
- [[D-2026-10-10-X14-PROXIMOS-PASSOS]] — D2 (c)
- [`BE-INCR-SIMPLES-NACIONAL-brief.md`](../../accounting/BE-INCR-SIMPLES-NACIONAL-brief.md)
