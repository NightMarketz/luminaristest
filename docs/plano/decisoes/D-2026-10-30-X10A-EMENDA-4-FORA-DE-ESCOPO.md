---
id: "D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Achados fora de escopo da EMENDA-4: NFS-e reaberta pelo assinador local, Reinf pelo portal ou contador, NFC-e off-line no caixa vira frente nova (F-AL-4 → b), FE junto do AL-PR-2"
estado: "decided"
autorizacao: "dono, chat, 2026-10-30, questionário (AskUserQuestion) sobre a cédula X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30: NFS-e → \"Reabrir já\"; Reinf → \"Portal ou contador\"; off-line → \"Abrir frente nova\"; FE → \"Junto do AL-PR-2 (Recomendado)\"; abre planejamento, não é 'executa' de nada nem autoriza merge"
atualizado: "2026-10-30"
---
# D-2026-10-30-X10A-EMENDA-4-FORA-DE-ESCOPO

**Estado:** `decided`. **Autorização:** dono, chat, 30/10/2026, questionário (citação no frontmatter). Contexto e
fontes: [`X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md`](../gates/X10A-EMENDA-4-FORA-DE-ESCOPO-2026-10-30.md).
**Não é `executa`** (ORCH-006). Três respostas foram **contra a recomendação** (NFS-e, Reinf, off-line).

## Decisões

1. **NFS-e → reabrir já (contra a recomendação "portal agora, reabrir depois").** Planejar uma emenda do
   `BE-INCR-DFE-ADN-EMISSOR-brief.md` que troca a guarda do certificado pelo assinador local da EMENDA-4: a DPS é
   assinada e o mTLS da Sefin é feito com o token do próprio prestador (FAQ NFS-e v1.1 item 17.7), pela API que a
   Res. CGSN 140 art. 59 § 1º II (red. Res. 191/2026) prevê para o Simples. **O portal segue valendo** até a emenda
   ficar pronta e implementada. Supera, só no ponto "emissão automática de NFS-e só com o PAA", o item 2 do §1 de
   [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]. O item 3 dela (o Luminaris não guarda certificado) **continua**.
   Consequência declarada: na NFS-e, cada estabelecimento precisa do próprio e-CNPJ (CNPJ inteiro, FAQ 17.2/28.2),
   diferente da NF-e (raiz).
2. **EFD-Reinf → portal ou contador (contra a recomendação "deixar para o ADR").** O Luminaris gera o relatório de
   conferência e o XML. Quem transmite é o cliente no portal Reinf Web, ou o contador como procurador (perfil
   EFD-REINF-Geral, FAQ Reinf 1.3, 1.10 e 8.1). No `ADR-INCR-EFD-REINF`, isso responde o **F-REINF-2 → (b)**: porta
   nomeada, sem adaptador de transmissão. Os F-REINF-1, 3, 4 e 5 seguem pendentes.
3. **NFC-e com o caixa totalmente off-line → abrir frente nova (contra a recomendação).** O F-AL-4 da EMENDA-4 muda de
   (a) para **(b)**: o assinador passa a montar e numerar a NFC-e off-line (série própria de contingência) quando o
   caixa não alcança o Luminaris, e sincroniza depois. A frente precisa de BRIEF próprio (planejamento), com os riscos
   já nomeados: regra fiscal no desktop e número repetido (vedado pelo Aj. SINIEF 19/16 cl. 11ª § 2º).
4. **FE do assinador → junto do AL-PR-2 (a recomendação).** Abrir o `FE-INCR-NFCE-ASSINADOR` (pareamento, estado,
   revogação, aviso no balcão) para andar junto do pareamento no servidor.

## Efeitos

- [[D-2026-10-30-X10A-EMENDA-4-FORKS]]: F-AL-4 deixa de ser (a); os outros 11 forks não mudam.
- Planejamentos a abrir (cada um pede sessão de planejamento; a autorização é esta decisão): emenda do BRIEF ADN
  (NFS-e pelo assinador), BRIEF da NFC-e off-line no caixa, BRIEF de FE do assinador.
- A pendência do template da `sessao-planejamento` (item 5 da cédula) não foi perguntada e segue aberta.
