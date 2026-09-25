---
id: "D-2026-09-24-FISCAL-OBLIGATION-PROFILE"
tipo: "decisao"
dominio: "fiscal"
titulo: "Perfil de obrigações por empresa (regime × porte) — 10 forks ratificados"
estado: "decided"
autorizacao: "dono, 2026-09-24 (chat: \"Ratifico todos os forks na recomendação e pode disparar aqui já\")"
atualizado: "2026-09-24"
---
# D-2026-09-24-FISCAL-OBLIGATION-PROFILE — Perfil de obrigações por empresa (regime × porte)

**Estado:** `decided`  
**Autorização:** dono, 2026-09-24  
**Depende de:** —  
**Desbloqueia:** [[X13]]  

## Decisão

PRE-ADR [`ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md`](../../adr/ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md)
aceito com os 10 forks na recomendação:

- **F-OBP-0 → (c) híbrido.** O **modelo** (perfil, matriz, captura) nasce para MEI, Simples, Presumido e Real já;
  o cálculo específico do Simples/MEI (PGDAS-D, DAS, DEFIS, DASN-SIMEI) continua na Onda 3. **Emenda a tensão
  "regime-alvo Lucro Real × edição Essencial"** (`destino/03` e `destino/19`): o regime-alvo continua ordenando o
  que se constrói, e deixa de limitar o que o modelo aceita.
- F-OBP-1 → (a) model novo por empresa (instância = CNPJ raiz, [[R8]]) · F-OBP-2 → (a) `MEI` no enum ·
  F-OBP-3 → (a) matriz em const TS com vigência e fonte · F-OBP-4 → (a) 4 estados · F-OBP-5 → (c) porte declarado +
  aviso · F-OBP-6 → (c) wizard pergunta regime/porte, o resto vai no formulário · F-OBP-7 → (a) prefill + sobrescrita +
  400 em regime divergente · F-OBP-8 → (a) perfil por ano-calendário · F-OBP-9 → (a) `CompanySigner`.

**Não autoriza código.** "Pode disparar" foi lido como: aceitar o PRE-ADR, criar o nó e escrever o BRIEF
(CLAUDE.md: sem "executa" não há código).
