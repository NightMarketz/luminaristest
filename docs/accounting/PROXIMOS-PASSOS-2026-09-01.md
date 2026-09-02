# Próximos passos — 2026-09-01

> **Substitui** `PROXIMOS-PASSOS-2026-08-31.md`, que segue válido como registro histórico. O que mudou
> em um dia: a auditoria completa do fluxo venda→SPED (sessão fluxo-salao-beleza, doc vivo "Do Corte
> ao SPED") encontrou **cinco lacunas verificadas linha a linha** que a fila não conhecia — e uma delas
> está **na frente de um gate humano já ratificado**.
>
> **A frase que resume:** *agora HÁ trabalho de agente executável* — e ele não compete com o gargalo
> humano: ele o **barateia** (a LAC-A remove um FALHOU garantido do H2).
>
> **Autorização citável:** o dono, nesta sessão (2026-09-01): *"Adicione nos momentos corretos de
> acordo com as dependências essas lacunas no nosso plano total"* — ratifica a **posição na fila**
> das cinco lacunas (LAC-A/B/C/D/E, registradas no Bloco A do `ACCOUNTING-MASTER-MAP.md` §5.1).
> **Não ratifica forks internos de nenhuma delas** (ORCH-006): cada item entra por
> `sessao-planejamento` (BRIEF com forks numerados) antes de qualquer código.

---

## 1. A ordem — gates humanos inalterados, com uma pré-condição nova e uma faixa de agente

| # | Gate | Runbook / ciclo | Por que nesta posição |
|---|---|---|---|
| 1 | **B-4** — ensaio de restauração | `RUNBOOK-B4-RESTORE-REHEARSAL.md` | Inalterado (emenda de 31/08): pré-condição P2 do H1; o backup **é** o rollback. |
| 2 | **X2** — import do referencial RFB | `RUNBOOK-X2-RFB-REFERENCIAL.md` | Inalterado. Arquivo oficial já baixado (emenda de 31/08); mesmas ressalvas (XLSX × conversor pipe; ano-calendário 2025 × exercício do H1). |
| 3 | **H1** — PVA | `RUNBOOK-H1-PVA.md` | Inalterado. Nota nova: a **LAC-D não bloqueia o H1** — o PVA valida estrutura, não margem; o arquivo com CMV faltando passa. O I355 entregue, porém, superavalia resultado — ver LAC-D abaixo. |
| A1 | **LAC-A (+C)** — ações da venda pela tela | `sessao-planejamento` → `sessao-instrumentacao` → `sessao-correcao` | **NOVA, agente-executável, pré-condição do H2.** Pagar **sempre falha** pela tela (PUT genérico × `immutableAfter`), Cancelar não estorna pós-finalização, Devolver não existe na UI — com as 3 rotas backend vivas e testadas. Sem isto, o passo 4 queima a sessão humana num vermelho conhecido. A LAC-C (saldo de pacote + método `Package Balance`) entra de carona no mini-modal de pagamento. Pode rodar **em paralelo** com os passos 1–3 (não toca razão nem dev.db real). |
| 4 | **H2** — sign-off de browser | `RUNBOOK-H2-BROWSER-SIGNOFF.md` | **Ganha pré-condição: LAC-A fechada.** O runbook inclui "fluxo de salão pós-swap da prensa de binding" — hoje esse fluxo tem botão Pagar 100% quebrado. Sign-off antes da LAC-A = desfecho FALHOU garantido. |
| A2 | **LAC-D** — valoração da compra pela tela | `sessao-planejamento` (reabre o diferimento "CRUD de estoque") | **NOVA, antes do M2.** A tela de estoque coleta custo/fornecedor e descarta → venda posta **receita sem CMV**, silenciosamente. Fork central do dono no BRIEF: destino do `MovementModal` em `reason='Purchase'` (criar Payable junto × bloquear com aviso — o ADR-INCR-INVENTORY já declara a Payable origem única de valoração). Backfill do já-entrado = migração de dado com gate próprio (classe S6), fora deste item. |
| 5 | **M2** — 1º deploy real | `RUNBOOK-M2-DEPLOY-SMOKE.md` | Inalterado no alvo (VPS, 1 instância/cliente, BYOK). **Não deve preceder a LAC-D**: operar cliente real com a compra não-valorada acumula distorção de margem diariamente. |

**Faixa paralela, sem posição fixa (pode começar hoje):**

| Item | Ciclo | Por quê |
|---|---|---|
| **LAC-E** — tie-out de estoque físico×contábil | `sessao-planejamento` → instrumentação → correção | Backend puro, área coberta por teste, zero dependência de gate. É o **termômetro da LAC-D**: check `'inventory'` no `TieOutDiagnosticService` + passada warn-only no reconcile + chamador p/ `reconcileInventory` + validação de `inventoryProductRef`. Instrumento antes de correção — e fortalece a evidência do H1/H2. |

**Permanece diferida (agora com registro):** **LAC-B** — UI da Prensa. O CLI atende até onboarding
self-service/P2. Registrada no Bloco A do master map para ter dono; vira bloqueio no primeiro cliente
que se instala sozinho.

---

## 2. O que esta emenda NÃO muda

1. **B-4 → X2 → H1 mantêm ordem e conteúdo.** Nenhuma lacuna os bloqueia; a dependência B-4→H1
   (backup é rollback) continua forçada.
2. **A regra da bancada segue intacta.** Nada aqui é aparato de auditoria: a LAC-E é código de
   produto (família do check de AR já existente em `GET /reports/tie-out`); LAC-A/C/D são telas/costuras
   de produto. Os 4 oráculos do Bloco A continuam sendo o gargalo real, e as LAC-A/D **reduzem** o custo
   deles (H2 sem FALHOU conhecido; M2 sem passivo de correção acumulando).
3. **Nenhum fork se auto-ratifica.** Esta emenda fixa posições na fila; os forks de cada lacuna
   (UX do mini-modal, destino do MovementModal, shape do check warn-only) nascem no BRIEF respectivo
   e esperam sinal do dono.

---

## 3. Insumos que mudaram desde 31/08

- **Resíduo do comentário `SALON_BINDING_V1`** em `scripts/activate-salon-binding.mjs`: **FECHADO**
  (PR #257, já em `origin/main`) — o único item executável que a varredura de 31/08 tinha achado.
- **Anatomia completa das 5 lacunas** (evidência por arquivo:linha, DTOs, whitelists, precedentes de
  fechamento): registrada no doc vivo **"Do Corte ao SPED"** (artefato da sessão fluxo-salao-beleza)
  e resumida nas linhas LAC-* do master map. Cobertura de teste medida: **backend das 5 lacunas 100%
  testado; frontend 0%** — a instrumentação da LAC-A cria o primeiro teste de
  `my-app/features/dashboard/category-views/finance`.

---

## 4. Próxima ação concreta

Duas frentes podem partir imediatamente, cada uma por `sessao-planejamento` com autorização já citável
(§ acima): **"planeja a LAC-A"** e/ou **"planeja a LAC-E"**. A LAC-D espera o BRIEF ser aberto quando
o dono quiser decidir o fork do MovementModal; a LAC-C não tem sessão própria (carona na LAC-A).
