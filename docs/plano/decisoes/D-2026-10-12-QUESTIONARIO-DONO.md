---
id: "D-2026-10-12-QUESTIONARIO-DONO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Questionário do dono de 12/10: forks das emendas de 11/10, PSC contratado pelo Luminaris (F-E8-2 b, F-E8-3 reaberto b) e blocos de 10/10 em lote"
estado: "decided"
autorizacao: "dono, chat, 2026-10-12, questionário (AskUserQuestion) — 3 rodadas; ratificação de forks, sem 'executa'"
atualizado: "2026-10-12"
---
> **SUPERADO EM 13/10 (dono, conciliação do PR #639):** vale [[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]] — **ADN pausado, pesquisar PSC**; a guarda do certificado pelo Luminaris (decisão de 12/10) não vale. Onde as respostas de 12/10 e 13/10 a F-NFCE-E1/F-FE-COB divergirem, vale 13/10. O achado da FAQ NFS-e v1.1 17.7 (mTLS exige o certificado do próprio prestador; PSC não cobre a conexão) continua de pé e fica para a pesquisa de PSC.

# D-2026-10-12-QUESTIONARIO-DONO

**Estado:** `decided`. Origem: conferência do relatório de próximos passos de 12/10 contra `origin/main`
(PR #639). **Nenhuma resposta é "executa"**: código continua precisando de pedido próprio.

## Cédulas

| Fork | Tema | Resposta do dono | Efeito |
| --- | --- | --- | --- |
| F-E8-2 | Quem contrata o PSC | "(b) Luminaris contrata e revende" — **contra a recomendação (a)** | O Luminaris é o contratante do PSC para NFS-e, NF-e e NFC-e; a pergunta ao advogado (§10.3) passa a ser a responsabilidade do Luminaris como contratante/revendedor |
| F-E8-3 | Critério do PSC | "Reabrir F-E8-3 → (b) lista curta" | Substitui o (a) de 11/10: o Luminaris homologa e contrata 1–2 PSCs |
| F-E2-1 | Detecção de esteticista (16%) | "(b) Declaração + alerta (Recomendado)" | Alerta por cTribNac 06.02 ou kit `aestheticClinic` |
| F-E2-2 | Proporcional no ano de início | "(a) Sim, proporcional (Recomendado)" | Memória: "decisão do dono D-4, sem fonte legal" |
| F-E4-1 | Feriados estaduais/municipais | "(a) Tabela em legal_parameters (Recomendado)" | Começa por SP capital; insumo ausente: lista oficial de SP |
| F-E5-1 | CAIXA na virada 2027 | "(a) Alerta + oferta (Recomendado)" | Sem automatizar (D-6 a) |
| F-E6-1 | Crédito do monofásico como insumo | "(a) Contador, via política (Recomendado)" | GOV-CONTADOR, política versionada |
| F-E7-1, F-E7-2 | Retenções no AP | "Ambas (a) (Recomendado)" | Folha `2.1.x IRRF a Recolher` no kit; Simples do prestador por campo no cadastro |
| F-NFCE-E1-2..9 | Emenda NFC-e | "Ratificar recomendações" | Recomendação de cada fork no `BE-INCR-NFCE-EMENDA-1-brief.md` |
| F-FE-COB-1..8 | Telas de cobrança MP | "Ratificar recomendações" | Todas (a), §4 do `FE-INCR-PAYMENT-PROVIDER-brief.md` |
| F-PES-0..13 | Folha/eSocial/Reinf | "Ratificar recomendações" (a recomendação da pergunta era adiar) | Recomendação de cada fork do PRE-ADR; o F-PES-0 segue condicionado ao fato comercial que o PRE-ADR descreve |
| F-ICMS-0..14 | ICMS/IPI/EFD | "Ratificar recomendações" (a recomendação da pergunta era adiar) | Recomendação de cada fork do PRE-ADR |

## F-PSC (emenda PSC do BRIEF ADN, 4ª rodada)

| Fork | Resposta | Efeito |
| --- | --- | --- |
| F-PSC-1 | "(a) A1 do Luminaris (Recomendado)" | mTLS com certificado do Luminaris (transmissor); produção depende da L-ADN-4 |
| F-PSC-2, F-PSC-3 | "Ambas (a) (Recomendado)" | Tabela `PscProvider` da plataforma; keyring `DFE_PSC_KEYS` próprio |
| F-PSC-4, 5, 6 | "Todas (a) (Recomendado)" | Aviso a 80% da cota; pré-voo bloqueia e avisa; `PENDING_SIGNATURE` sem consumir número |
| F-PSC-7, F-PSC-8 | "Ambas (a) (Recomendado)" | Contingência pelo portal se não houver resposta até 25/10; cobrança da revenda fora do BRIEF |

## 5ª rodada — pesquisa legal derrubou o F-PSC-1 (dossiê `pesquisas-legais/nfse-adn-certificado-numeracao`)

Pesquisa (protocolo de fonte oficial): a FAQ NFS-e v1.1 (gov.br, 22/09/2026) item 17.7 diz que "a assinatura da DPS e a
autenticação mTLS na API exigem obrigatoriamente o certificado … pertencente ao próprio prestador"; sem procuração para
integrador; PAA da NFS-e indisponível. Decreto 12.955 arts. 127–129 remetem à documentação técnica. L-ADN-1 (14 dígitos)
e L-ADN-4 (não) respondidas; L-ADN-2/3 com leitura segura no relatório.

| Pergunta | Resposta | Efeito |
| --- | --- | --- |
| Como emitir a NFS-e | "Reabrir guarda do A1" — **contra a recomendação** (portal + perguntar PSCs) | Decisão 2 de 26/09 reaberta: o Luminaris guarda o certificado do cliente |
| Escopo | "Os três DF-e com o certificado guardado" — **contra a recomendação** | PSC abandonado; F-E8-1R → (c); F-E8-2, F-E8-3 e F-PSC-1..8 **perdem o objeto**; emenda PSC SUPERADA |
| F-ADN-1..4, 10 | "Todas recomendadas" | 1 (a), 2 (a), 3 (b), 4 (a), 10 (a) |
| F-ADN-5, 6 | "Ambas (a)" | |
| F-ADN-7, 12, 13 | "Todas recomendadas" | 7 (c), 12 (a), 13 (a) |
| F-ADN-8, 9 | "Ambas (a)" | |
| F-ADN-11 | resolvido pela pesquisa → (a) | 14 dígitos (FAQ 17.7, 28.2) |

**Risco aberto (do dono, com advogado):** L-ADN-5 — custódia do certificado de terceiro. DOC-ICP-04 6.1.1.8 reserva a
guarda em hardware a PSC; a guarda em software não tem regra própria, mas choca com 6.1.1.6 "c" e DOC-ICP-05 9.3.3.3
(`docs/accounting/pesquisa-lei-2026-10-10/parceria-consumidor-a1.md` F-2). Bloqueia o 1º certificado de cliente em
produção, não o código em homologação.

## Já resolvidos antes (registro)
- F-E1-1 = (a), dono 11/10, implementado no #634.
- F-E8-1R = (a), dono 11/10 (#635); F-E8-1 e F-ADN-1 superados; F-ADN-2/3 sem objeto.

## Ainda pendentes
- Nenhum fork do emissor ADN. Pendente externo: L-ADN-5 (advogado) e o runbook do D5.
- F-E8-1 (PAA) ficou superado, não pendente.
