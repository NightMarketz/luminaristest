---
id: "SIMPLES-PISO-ANEXO-XI"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Simples: piso de 2% do ISS com benefício municipal + ocupações do MEI pelo Anexo XI da Res. CGSN 140 (BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI)"
estado: "planned"
estado_detalhe: "BRIEF escrito; forks F-PI-1..6 e F-AX-1..5 pendentes; sem 'executa'. Ordem: só depois do PR de X14 F-PR4-8/10/12 (mesmo ponto do CompanyFiscalProfile)"
depende_de: ["[[X14]]"]
autorizacao: "dono, chat, 2026-10-10: \"abre o BRIEF dos dois\" — só o BRIEF (sessao-planejamento); sem código, sem 'executa', sem ratificar fork"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: []
---
# SIMPLES-PISO-ANEXO-XI — piso do ISS com benefício municipal + Anexo XI do MEI

**Estado:** `planned` — BRIEF escrito; forks F-PI-1..6 e F-AX-1..5 pendentes; sem 'executa'. Ordem: só depois do PR de X14 F-PR4-8/10/12 (mesmo ponto do CompanyFiscalProfile)  
**Autorização:** dono, chat, 2026-10-10 — só o BRIEF.  
**Depende de:** [[X14]] (apuração do Simples e perfil fiscal do MEI).

## Escopo

- Bloco 1: benefício municipal de ISS (isenção/redução) com piso de 2%, exceto 7.02, 7.05 e 16.01 (LC 116 art. 8º-A; Res. CGSN 140 arts. 27 § 1º, 31 p.ú., 32).
- Bloco 2: Anexo XI (Tabelas A e B) como tabela de plataforma `MEI_ANEXO_XI` e validação da ocupação do MEI (Res. CGSN 140 arts. 100, 101, 115, 116).

## Docs

- [`docs/accounting/BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md`](../../accounting/BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI-brief.md) — BRIEF + forks
