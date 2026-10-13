---
id: "D-2026-10-13-KIT-SETOR-PR-K3-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacunas do PR-K3 do KIT-SETOR (catálogo + motor de sugestão fiscal por serviço) decididas por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13: \"Executa o PR-K3 do KIT-SETOR\" + questionário de lacunas na mesma sessão"
atualizado: "2026-10-13"
---
# D-2026-10-13-KIT-SETOR-PR-K3-LACUNAS

Spec: `BE-INCR-KIT-SETOR-EMENDA-1-brief.md` §4, PR-K3 (itens 7a–7g). Lacunas achadas ao executar, antes de código.

| # | Lacuna | Fato que a abriu | Decisão (literal) |
|---|---|---|---|
| L1 | IA de reserva (7c) | A spec cita `OpenAIService.extractStructuredData`, que é o extrator de **tabelas** de documento (prompt fixo, sem schema/enum) | *"Método novo no OpenAIService"*: `response_format` `json_schema` strict com o enum das `key` (modelo `gpt-4o-mini`, o `FALLBACK` do config — o `CHAT` 3.5 não suporta structured outputs); Zod por cima |
| L2 | Contrato do catálogo (7a) e passo 6 | O passo 6 grava perfil por `serviceRef`; "nunca grava" (7d); a lista LC 116 vive em `features/accounting`, fora da fronteira do `sectorKits` | *"Troca no lugar + passo 6 vazio"*: o item de `serviceFiscalDefaults` vira o catálogo; v1–v3 têm `[]` (hash igual); o passo 6 vira no-op e a `KitServiceFiscalPort` sai; "cTribNac ∈ LC 116 vigente" vira teste de build do kit |
| L3 | Catálogo da unidade | O catálogo mora no kit (por unidade); a tabela `services` é do dono | *"Usa o kit instalado; sem kit ⇒ 400"*; "serviços sem perfil" = linhas de `services` do dono sem `ServiceFiscalProfile` nesta unidade |
| L4 | Conteúdo por setor | "a tabela do relatório" × "a clínica traz as duas entradas" | *"Os dois com a tabela inteira"*: salão v4 e clínica v4 com as 7 linhas do relatório `ctribnac-salao-clinica` |

Assumido sem cédula (constante, troca sem migração): teto de 20 serviços por chamada da IA na varredura (`?ia=1`, 7e).
