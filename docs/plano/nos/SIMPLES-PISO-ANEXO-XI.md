---
id: "SIMPLES-PISO-ANEXO-XI"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Simples: piso de 2% do ISS com benefício municipal + ocupações do MEI pelo Anexo XI da Res. CGSN 140 (BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI)"
estado: "done"
estado_detalhe: "BRIEF escrito; forks F-PI-1..6 e F-AX-1..5 RATIFICADOS 10/10. Bloco 1 = #618 (em main; as 5 escolhas do executor ratificadas pelo dono 10/10: Município = o da unidade; vigente no 1º dia; redução 0 = sem benefício; depois do teto; sobreposição ⇒ 409). Bloco 2 = #619: itens 10-11 (Anexo XI transcrito, MEI_ANEXO_XI) + itens 12-15 (meiOcupacoes opcional no perfil, 400 para chave inexistente; SIMEI bloqueia sem ocupações (MEI_OCUPACOES_NAO_DECLARADAS) e com CNAE do CNPJ fora do Anexo (SIMEI_CNAE_FORA_ANEXO_XI); alertas MEI_ENQUADRAMENTO_DIVERGE e MEI_TAC_COM_OCUPACAO_A; MEI_ANEXO_XI em TABELAS_MIGRADAS). Decisões do dono 10/10 em BRIEF §5.1 (citações do F-AX-4 trocadas com OK do dono: art. 115 § 2º II b c/c § 3º II, § 4º II, § 2º II c). ABERTO: item 16 PARADO — a decisão 6 (exclusão só em 1º/01 do ano seguinte) diverge da Res. CGSN 140 art. 101 § 3º II + art. 115 § 2º II c (BRIEF §5.2 D1); sub-parte 'retroativo' do item 14 diverge do art. 115 § 2º II a (D2); fluxo guiado MEI→ME é FE, fora do #619"
depende_de: []
autorizacao: "dono, chat, 2026-10-10: \"abre o BRIEF dos dois\" — só o BRIEF (sessao-planejamento); sem código, sem 'executa', sem ratificar fork; dono, chat, 2026-10-10, questionário: F-PI-1..6 e F-AX-1..5 ratificados (F-PI-2 e F-AX-4 com texto próprio do dono) — sem 'executa' · dono, chat, 2026-10-10: \"A execução do nó SIMPLES-PISO-ANEXO-XI (PR #607) deve ser disparada exclusivamente após o merge do PR #603 (X14) na main\" — EXECUTA (sessao-feature), condição cumprida (#603 = 46d6489c); PR sem merge · dono, chat, 2026-10-10: \"sim, redispara os itens 12–16\" — EXECUTA itens 12–16 no PR #619, sem merge; decisões 1–6 do mesmo chat (BRIEF §5.1)"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: ["#618", "#619"]
---
# SIMPLES-PISO-ANEXO-XI — piso do ISS com benefício municipal + Anexo XI do MEI

**Estado:** `done` — BRIEF escrito; forks F-PI-1..6 e F-AX-1..5 RATIFICADOS 10/10. Bloco 1 = #618 (em main; as 5 escolhas do executor ratificadas pelo dono 10/10: Município = o da unidade; vigente no 1º dia; redução 0 = sem benefício; depois do teto; sobreposição ⇒ 409). Bloco 2 = #619: itens 10-11 (Anexo XI transcrito, MEI_ANEXO_XI) + itens 12-15 (meiOcupacoes opcional no perfil, 400 para chave inexistente; SIMEI bloqueia sem ocupações (MEI_OCUPACOES_NAO_DECLARADAS) e com CNAE do CNPJ fora do Anexo (SIMEI_CNAE_FORA_ANEXO_XI); alertas MEI_ENQUADRAMENTO_DIVERGE e MEI_TAC_COM_OCUPACAO_A; MEI_ANEXO_XI em TABELAS_MIGRADAS). Decisões do dono 10/10 em BRIEF §5.1 (citações do F-AX-4 trocadas com OK do dono: art. 115 § 2º II b c/c § 3º II, § 4º II, § 2º II c). ABERTO: item 16 PARADO — a decisão 6 (exclusão só em 1º/01 do ano seguinte) diverge da Res. CGSN 140 art. 101 § 3º II + art. 115 § 2º II c (BRIEF §5.2 D1); sub-parte 'retroativo' do item 14 diverge do art. 115 § 2º II a (D2); fluxo guiado MEI→ME é FE, fora do #619  
**Autorização:** BRIEF (10/10) → executa após #603 (10/10) → itens 12–16 no #619 (10/10, "sim, redispara os itens 12–16").  
**Depende de:** [[X14]] (apuração do Simples e perfil fiscal do MEI).

## Escopo

- Bloco 1: benefício municipal de ISS (isenção/redução) com piso de 2%, exceto 7.02, 7.05 e 16.01 (LC 116 art. 8º-A; Res. CGSN 140 arts. 27 § 1º, 31 p.ú., 32).
- Bloco 2: Anexo XI (Tabelas A e B) como tabela de plataforma `MEI_ANEXO_XI` e validação da ocupação do MEI (Res. CGSN 140 arts. 100, 101, 115, 116).

## Docs

- [`docs/accounting/BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md`](../../accounting/BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md) — BRIEF + forks
