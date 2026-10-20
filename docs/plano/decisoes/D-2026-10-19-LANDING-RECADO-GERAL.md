---
id: "D-2026-10-19-LANDING-RECADO-GERAL"
tipo: "decisao"
dominio: "plataforma"
titulo: "Landing pública com recado geral (\"você cria, a IA constrói\", PMEs) e lista Founders com lastro; revoga a D-2026-10-15 (caminho a) inteira"
estado: "decided"
autorizacao: "dono, chat, 2026-10-19, questionário (AskUserQuestion): posicionamento \"Plataforma IA geral (v0.2)\"; alcance \"Revoga inteira\"; Founders \"Manter, com lastro\"; formulário \"Curto + 2 qualificadoras\"; deploy \"VPS com Docker\"; depois: \"Escreve o spec e a decisão que revoga a D-2026-10-15\". Decide posicionamento e desenho da landing; não cria nó no plano nem autoriza código no repo Luminaris"
atualizado: "2026-10-19"
---
# D-2026-10-19-LANDING-RECADO-GERAL: landing com recado geral; caminho (a) revogado

**Estado:** `decided`.
**Autorização:** dono, chat, 19/10/2026 (citação no frontmatter).

## Contexto

A D-2026-10-15-CAMINHO-A-CAMADA-CONTABIL apresentava o Luminaris como "a contabilidade do salão, ao lado do sistema
que ele já usa", com o texto de [`docs/mercado/LISTA-DE-ESPERA-2026-10.md`](../../mercado/LISTA-DE-ESPERA-2026-10.md).
Esse texto nunca foi publicado. A landing que existe é a v0.2, num repositório separado
(`C:\Meus Projetos\Landing Page v0.2\luminaris-landing`), com o recado "você cria, a IA constrói", para PMEs em geral,
e o programa Founders de 500 vagas.

## Decisão

1. **Posicionamento público:** recado geral da v0.2 ("você cria, a IA constrói", PMEs). A D-2026-10-15 fica
   **revogada inteira**: o produto deixa de se apresentar como camada contábil do salão em qualquer canal.
2. **Founders:** mantém o programa de 500 vagas, com lastro. O contador vem do banco, e os benefícios só aparecem
   depois de escritos pelo dono.
3. **Formulário:** nome, e-mail, WhatsApp opcional, segmento, primeiro módulo e consentimento LGPD versionado.
4. **Deploy:** VPS com Docker (Next standalone, Postgres sem porta exposta, Caddy).

O desenho completo está no repositório da landing:
`docs/superpowers/specs/2026-10-19-landing-waitlist-refino-design.md`.

## O que não muda

As travas legais do dossiê `pesquisas-legais/waitlist-lgpd-cdc` (CDC arts. 30 e 37 §1º; LGPD arts. 6º III, 7º I,
8º §§4º–5º e 9º), conferidas de novo em `pesquisas-legais/verif-2026-10-17-lgpd-cdc-obrigacoes` (linha 24), valem
para o recado geral do mesmo jeito.

## Consequências

- `LISTA-DE-ESPERA-2026-10.md` vira histórico.
- A lacuna "importar vendas do sistema do salão (Trinks)", aberta pela D-2026-10-15 sem nó, perde a motivação de
  posicionamento. Ela não é cancelada nem priorizada por esta decisão.
- **H1 → H2 → M2 não muda.** A landing roda fora do app e não depende do deploy M2.
- O que a landing diz que o produto faz tem de existir no app. O que não existe leva o rótulo "em construção"
  (spec §3 e §8).
