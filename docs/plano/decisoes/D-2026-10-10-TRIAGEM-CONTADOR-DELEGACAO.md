---
id: "D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Pedido único ao contador, triagem da resposta, decisões por delegação D-1..D-10 e revisão de D-5/D-6 pela jurisprudência"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: \"Acato a sugestão. Devemos montar um pedido único\"; \"o contador disse que o resto é vc que decide\"; questionários de ratificação (D-1 sim, D-2..D-10 aceito todas, gate da ECD mantido, proveniência = contador com ferramenta; D-5 configurável por cliente; D-6 (c) incluir com alerta)"
atualizado: "2026-10-10"
---
# D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO

**Estado:** `decided`. Documentos de origem:
- [`PEDIDO-CONTADOR-2026-10-10-UNICO.md`](../../accounting/PEDIDO-CONTADOR-2026-10-10-UNICO.md) (v3);
- [`TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md);
- [`pesquisa-lei-2026-10-10/`](../../accounting/pesquisa-lei-2026-10-10/);
- [`pesquisa-juris-2026-10-10/`](../../accounting/pesquisa-juris-2026-10-10/README.md);
- [`PROPOSTA-REFERENCIAL-D1-2026-10-10.md`](../../accounting/PROPOSTA-REFERENCIAL-D1-2026-10-10.md).

## Cédulas

| Item | Decisão do dono | Efeito |
|---|---|---|
| Pedido ao contador | Pedido único (substitui follow-up 23/09, PE-1..5, #331, passo 11h, lista 29/09, D8) | rascunhos antigos marcados SUPERSEDIDO |
| D-1 | Agente propõe códigos referenciais e contas pelo catálogo RFB, como delegação do contador | proposta escrita (42 contas; 3.4 → `3.01.01.01.01.98`). **Aplicar exige BRIEF + "executa"** (kit v2 / `PUT /referential/mappings`) |
| D-2 | Pacote vencido: mantém F-PV-9 (b) (NFS-e + ISS no vencimento) | reforçado pela SC SF/DEJUG 11/2020 item 9.4.1 |
| D-3 | ISS SP 5% padrão; retenção configurável por nota | — |
| D-4 | 16% só IRPJ, opção; **bloqueado para a PJ inteira** quando há esteticista (SC Disit 25/37/2013); ano de início proporcional (conservador, sem fonte) | entra no PRESUMIDO-16 |
| D-5 | **Configurável por cliente** (revisto após SC Cosit 496/2017): padrão sem crédito no monofásico usado como insumo; o contador liga | X8 / ITEM-DESTINATION |
| D-6 | (a) virada do caixa não automatizada; **(c) juros e multa de mora entram na receita bruta do Simples em 2027, com alerta** (revisto após SC Cosit 59/2026) | X14 |
| D-7 | Pró-labore: alerta de ausência, separação lucro × trabalho, sem mínimo | PRE-ADR pessoal (F-PES-7) |
| D-8 | Tomador do Simples retém IRRF 1,5% (RIR 714), salvo prestador do Simples ou IR ≤ R$ 10 | BRIEF de retenções no AP (futuro) |
| D-9 | Aviso: PER/DCOMP de saldo negativo só depois da ECF (IN 2.055) | X7 |
| D-10 | IBS/CBS: antes do fornecimento = cancelamento; depois = devolução | PRE-ADR IBS/CBS, X11 |
| Gate da ECD | **Mantido**; a 3.4 entra pelo mapeamento | sem mudança de código |
| Proveniência | Resposta do contador escrita com ferramenta | confirmações (III-4, III-7a, III-8, III-9, CST 02) **sem assinatura**; pedir assinatura |

## Pendentes do dono (não decididos aqui)
- **F-ADN-1 / F-NFCE-E1-1:** novo caminho do certificado. Guarda de chave por terceiro só por PSC (DOC-ICP-04
  6.1.1.8); A1 extinto (Res. CG ICP-Brasil 211/2024); PAA (NT 2026.001) cobre NF-e/NFC-e, não NFS-e; o TJSP
  responsabiliza o titular pelas notas emitidas pelo terceiro.
- **3.4 no Presumido:** receita bruta (`3.01.01.01.01.98`) × demais receitas (`3.01.01.05.01.99`).
- **Gate da ECF Presumido** só aceita receita em 3.1/3.3 (`PRESUNCAO_ACCOUNT_CODES`): mesmo mapeada, a 3.4 trava a ECF
  do H1. Exige código (PE-2 + "executa").
- **Ação humana antes de 15/10:** conferir o Portal do Simples (pendência/exclusão).
