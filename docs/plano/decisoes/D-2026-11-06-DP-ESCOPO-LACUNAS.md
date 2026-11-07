---
id: "D-2026-11-06-DP-ESCOPO-LACUNAS"
tipo: "decisao"
dominio: "pessoal"
titulo: "DP (nó PES-4): lacunas de escopo achadas no cruzamento com lei e ERPs de referência — onde cada uma entra (06/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-06: \"Sim, registra e pergunta\" (resposta a \"Registro as lacunas na nota PES-4 e mando as dúvidas de núcleo × opcional por questionário?\") + questionário (AskUserQuestion) com as respostas literais da tabela — decide só o encaixe de escopo nos BRIEFs futuros; não é 'executa' nem BRIEF"
atualizado: "2026-11-06"
---
# D-2026-11-06-DP-ESCOPO-LACUNAS — lacunas de escopo do DP e o encaixe de cada uma (06/11/2026)

**Estado:** `decided`. **Autorização:** dono, chat, 06/11/2026 (frontmatter e tabela). Escopo: só **onde** cada
capacidade entra nos BRIEFs que ainda não existem (F3, F4, F5, SST). **Não** autoriza código nem escreve BRIEF; não
muda o BRIEF do F2. Contexto: [[PES-4]], [[D-2026-11-02-DP-PRE-ADR]], [[D-2026-11-06-DP-BRIEF-F2]].

## Como saiu

Pedido do dono (chat, 06/11): *"dispara subagents haiku para garantir que temos todos os módulos possiveis de
departamento pessoal"*. Três leitores (só coleta): inventário do repositório; módulos de ERPs de referência (Odoo +
OCA l10n-brazil, Frappe HRMS, Senior, Domínio, TOTVS, Alterdata, Fortes, Questor, Sankhya); obrigações do empregador
em fonte oficial (tabela de eventos do leiaute S-1.3 consolidado até a NT 07/2026, lida em gov.br/esocial). O
cruzamento foi da sessão principal: **lacuna = termo sem ocorrência** nos 6 docs do DP (PRE-ADR-DP, PRE-ADR de
pessoal, BRIEFs F0+F1 e F2, PRE-ADR-FOLHA-CONTABILIZACAO, spec katz) e na nota PES-4.

**Grau:** a lista é *verificada por busca de termo*, não por leitura integral — um item pode estar descrito com outra
palavra. Afora a tabela de eventos, as obrigações vieram de fonte secundária; **nenhuma regra aqui é conclusão
legal**. Cada item passa pelo método de verificação legal (`docs/operating-manual/VERIFICACAO-LEGAL.md`, acervo
`ctresb/leis`) no BRIEF que o receber.

## Obrigações gerais — entram sem fork (obrigação de qualquer empregador)

| # | Capacidade | Encaixe |
|---|---|---|
| L1 | Processo trabalhista no eSocial (S-2500, S-2501, S-3500; totalizadores S-5501, S-5503) | BRIEF do F4 |
| L2 | Documentos da rescisão: TRCT e requerimento de seguro-desemprego (Empregador Web) | BRIEF do F3 (TRCT) e F4 (seguro-desemprego) |
| L3 | Comprovante anual de rendimentos ao trabalhador | BRIEF do F5 |
| L4 | Opção de registro eletrônico de empregados (S-1000) × livro/ficha física | BRIEF do F4 (S-1000) |
| L5 | Contrato de experiência e por prazo determinado (vencimento, prorrogação) | BRIEF do F3 |
| L6 | Programas de SST além dos eventos: PGR (NR-1), PCMSO (NR-7), LTCAT, PPP eletrônico, ficha de EPI (NR-6) | BRIEF do SST |
| L7 | Eventos não periódicos que a lista do F4 ainda não nomeia: S-2190, S-2205, S-2206, S-2298 | BRIEF do F4 |

## Decisões do dono (questionário, 06/11)

| Pergunta | Resposta literal | Encaixe |
|---|---|---|
| Vale-transporte (Lei 7.418): hoje no opcional DP-BEN | "Núcleo (Recomendado)" | Desconto e rubrica de VT no **núcleo**, no BRIEF do F3; o DP-BEN fica com fornecedor, recarga e VR/VA/saúde |
| Quais entram no núcleo (F3/F5) | "Insalubridade/periculos., Estabilidades, Férias coletivas, Desconto sindical" | Todos no núcleo: adicionais (CLT 192/193) com grau/laudo como dado do vínculo; checagem de estabilidade provisória ao desligar; roteiro de férias coletivas; rubrica de contribuição/mensalidade sindical com autorização — BRIEF do F3 |
| Cota de aprendiz/PCD e Relatório de Transparência Salarial | "Alerta no núcleo (Recomendado)" | Pendência de obrigação legal no fechamento (BRIEF do F5), no molde do F-DP-7: avisa, não liga módulo |
| PLR (Lei 10.101) e gorjeta (Lei 13.419) | "Ambas no F3 (Recomendado)" | Rubricas do catálogo fechado no BRIEF do F3, com incidências próprias |

Efeito no código já em `main`: nenhum agora. O `DP-BEN` do `moduleRegistry.ts` continua `disponivel: false`; a
descrição dele muda quando o BRIEF do F6 abrir.

## Fora, sem pedido (produto, não lei)

Recrutamento, treinamento, reembolso de despesas, empréstimo ao empregado, simulação em lote de férias e rescisão.
Os ERPs de referência têm; nenhum foi pedido. Ficam só registrados.

## Já cobertos (o cruzamento conferiu, sem mudança)

Salário-maternidade e afastamento por acidente (F3/F4, BRIEF do F2 §F-DPF-5); consignado (Crédito do Trabalhador) e
pensão (F3); DCTFWeb e FGTS Digital (F5); Reinf (EFD-REINF); CAT, ASO e agentes nocivos (SST). Fora por desenho:
eventos de ente público (S-1202, S-1207, S-2231, S-24xx), rural PF (S-1260), avulso não portuário (S-1270, DP-CAT),
anotação judicial (S-8200/8299), exame toxicológico de motorista (S-2221, sem caso no setor-alvo), desoneração/CPRB
(NAO_SE_APLICA, PRE-ADR de pessoal §R-2060).
