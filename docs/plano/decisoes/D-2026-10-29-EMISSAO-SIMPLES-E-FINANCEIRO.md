---
id: "D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO"
tipo: "decisao"
dominio: "processo"
titulo: "Foco: fechar a emissão de nota para MEI, ME e Simples (NFS-e pelo portal; NF-e/NFC-e PR-7..PR-9 contra PSC falso) e o financeiro inteiro menos a prova real do pagamento"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29: \"Antes disso vamos focar em fechar emissão de nota para mei, me e simples nacional agora além de fechar tudo do financeiro menos o gate de pagamento\" + questionário (AskUserQuestion) no mesmo turno: NFS-e → \"Portal (Recomendado)\"; NF-e/NFC-e → \"Codar já (Recomendado)\"; financeiro → \"Só a prova real fora\"; autorização → \"Executa (sem merge)\""
atualizado: "2026-10-29"
---
# D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO

**Estado:** `decided`. **Autorização:** dono, chat, 29/10/2026 (citação no frontmatter).
**É `executa`** (ORCH-006) do que está no §2, dentro dos limites do §3. **Não autoriza merge fora da regra de classe de
risco** ([[D-2026-10-28-FLUXO-AUTONOMO]]): verde pela maestro, vermelho no lote diário do dono.

## 1. Perguntas e respostas

| # | Pergunta (resumo) | Resposta do dono | Recomendação |
|---|---|---|---|
| 1 | NFS-e de MEI/ME/Simples: o que é "fechar"? | **Portal** — mantém [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]: conferir MEI e ME na ficha do portal, RUNBOOK-H2-DFE-MANUAL, depois M2 | a mesma |
| 2 | NF-e/NFC-e: PR-7..PR-9 do [[X10a]] dependem de PSC + e-CNPJ ([[D5]]) | **Codar já** contra a API padrão do PSC (DOC-ICP-17.01, igual para os 8 PSCs), testado com PSC falso; prova em homologação SEFAZ quando o dono contratar | a mesma |
| 3 | Financeiro "menos o gate de pagamento": o que fica fora? | **Só a prova real fora** (sonda do M2). Entram os itens 16b/16c do [[F5]] e o adaptador CNAB 240 genérico (sem o banco do cliente, [[D6]]) | F5 e F6 fora (contra a recomendação) |
| 4 | Autorização | **Executa (sem merge)** | — |

## 2. O que este `executa` cobre

1. **NFS-e pelo portal (MEI, ME/EPP do Simples):** conferir que a ficha espelho do portal e a releitura do XML saem
   certas para `opSimpNac` 2 (MEI) e 3 (ME/EPP), com teste-guarda onde faltar; corrigir o que o teste provar
   (`sessao-instrumentacao` → `sessao-correcao`); preparar o preflight do `RUNBOOK-H2-DFE-MANUAL`. A obrigação de
   emitir por tipo de documento (MEI × NF-e/NFC-e) se confere pelo método legal antes de virar código.
2. **NF-e/NFC-e — [[X10a]] PR-7, PR-8 e PR-9** (`BE-INCR-NFCE-EMENDA-2-brief.md` §5): adaptador de assinatura pelo PSC
   (`BE-INCR-DFE-ADN-EMENDA-PSC-brief.md`, F-PSC ratificados em 12/10) + transporte SEFAZ com o e-CNPJ do Luminaris,
   QR Code v3 + v2/CSC (ramo (c) do E1-4) e contingência off-line (E1-5 b). Testes com PSC falso; nada transmite.
3. **Financeiro — [[F5]]:** PR-0 de BE (lista global de cobranças) + itens 16b/16c do
   `FE-INCR-PAYMENT-PROVIDER-EMENDA-1-brief.md`; **adaptador CNAB 240 genérico** (`CnabCollectionProvider`, ADR §6) —
   não tem BRIEF: abre pela `sessao-planejamento`, e os forks novos voltam ao dono antes do código.
4. **Financeiro — [[RETENCOES-FONTE]]:** o PR de dado que tira INSS e INSS/CPRB de DRAFT (fontes conferidas no fold de
   28/10); PR-3/PR-4 só se P-RET-4 estiver coberta (delegação D-1 de 10/10 ou resposta do contador) — senão, pergunta.
5. **Financeiro — [[PACOTE-VALIDADE]]:** só o que for código e estiver aberto no `PACOTE-VALIDADE-PENDENCIAS-brief.md`;
   o PE-6 (contador + jurídico) segue externo.

## 3. Fora

- Prova real do pagamento: boleto/Pix/CSV do Mercado Pago na sonda do [[M2]], chave do MP no ambiente.
- [[F6]] (Pix de saída): segue bloqueado pela decisão (i) cliente integrador × (ii) banco do cliente.
- Emissão automática de NFS-e e guarda do certificado do cliente (arquivada em 22/10).
- Transmissão real a SEFAZ ou PSC, contratação de PSC/e-CNPJ, credenciamento do estabelecimento — do dono.
- Fork novo que aparecer no caminho vira pergunta ao dono (regra de 28/10); não se auto-ratifica.
