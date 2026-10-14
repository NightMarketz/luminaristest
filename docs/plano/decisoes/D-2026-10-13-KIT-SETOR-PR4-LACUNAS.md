---
id: "D-2026-10-13-KIT-SETOR-PR4-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "5 lacunas do PR-4 do KIT-SETOR (atualização em 3 níveis): serviço fiscal fora do diff, conta sem partida forward, aceitar por motivo, Draft falha a unidade, referencial por ano"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13: \"Executa o PR-4 do KIT-SETOR\" + questionário (2 rodadas)"
atualizado: "2026-10-13"
---
# D-2026-10-13-KIT-SETOR-PR4-LACUNAS — lacunas do PR-4 do KIT-SETOR

Documento: [`BE-INCR-KIT-SETOR-brief.md`](../../accounting/BE-INCR-KIT-SETOR-brief.md) §12 (emenda do PR-4), sobre os
itens 26–40 do §2. Nó: [[KIT-SETOR]].

## Lacunas decididas por questionário (13/10)

| # | Lacuna | Resposta literal | Decisão |
|---|---|---|---|
| E-12.1 | Serviço fiscal no diff, depois do PR-K3 | *"Saem do diff + aviso (Recomendado)"* | Fora do diff; mudanças do catálogo em `notices`; `service_profile_edited` sai |
| E-12.2 | Conta da extensão mudada, sem partida | *"Aplica com aviso (forward)"* | Forward `changed_account`, relendo "sem partida" in-tx; só a conta que veio do kit e não foi mexida |
| E-12.3 | O que aceitar faz por motivo | *"Por motivo, ano congelado recusa (Recomendado)"* | Restaura+recompila / renomeia / grava por cima / troca o mapeamento; ano congelado ⇒ 422 |
| E-12.4 | Forward com compile `Draft` | *"Unidade falha (Recomendado)"* | Aditivos ficam, pendências criadas, versão não avança, CLI ≠ 0 |
| E-12.5 | Blocos de referencial comparados | *"Todo ano com regime igual (Recomendado)"* | Todo ano cujo regime da empresa (ou da unidade) é o do bloco; sem regime ⇒ aviso |
