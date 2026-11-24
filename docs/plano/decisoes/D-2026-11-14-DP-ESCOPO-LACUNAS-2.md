---
id: "D-2026-11-14-DP-ESCOPO-LACUNAS-2"
tipo: "decisao"
dominio: "pessoal"
titulo: "DP (nó PES-4): segunda rodada de lacunas de escopo — encaixe de cada uma pela lei, sem questionário (14/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-14: \"Faz questionário nenhum, todas as decisões tem como premissa leis, não tem nada de regra de negócio\" (resposta a \"quer que eu leve G1–G8 a você por questionário para fechar o encaixe de cada uma no PES-4?\") — decide só o encaixe de escopo nos BRIEFs futuros (F3, F4, F5, SST); não é 'executa' nem BRIEF"
atualizado: "2026-11-14"
---
# D-2026-11-14-DP-ESCOPO-LACUNAS-2 — lacunas de escopo do DP, 2ª rodada (14/11/2026)

**Estado:** `decided`. **Autorização:** dono, chat, 14/11/2026 (frontmatter). Escopo: **onde** cada capacidade entra nos
BRIEFs que ainda não existem. **Não** autoriza código, não escreve BRIEF e não muda o BRIEF do F2. Soma-se a
[[D-2026-11-06-DP-ESCOPO-LACUNAS]] (L1..L7 e as respostas do dono de 06/11, que continuam valendo). Contexto: [[PES-4]].

## Como saiu

Pesquisa de 14/11 (12 leitores só de coleta, 5 rodadas; cruzamento pela sessão principal): dossiê
`pesquisas-legais/dp-cobertura-100/` (`COBERTURA-DP.md`, coleta bruta e textos oficiais com SHA). **Lacuna = termo sem
ocorrência** nos 10 docs do DP (mesmo método de 06/11): a lista é *verificada por busca de termo*, não por leitura
integral.

**Regra de decisão (dono, 14/11):** a premissa de toda lacuna é a lei; não há regra de negócio a escolher. Por isso não
houve questionário: cada item entra no BRIEF cujo objeto é o da norma que o impõe (cálculo → F3; evento do eSocial → F4;
guia, guarda e comunicação → F5; segurança e saúde → SST), no núcleo, porque é obrigação de qualquer empregador.
**Grau:** os encaixes são decisão de escopo (verificada); cada norma abaixo foi lida no acervo `ctresb/leis` ou no texto
oficial do dossiê, salvo onde a coluna diz "a ler no BRIEF". Nenhuma linha é conclusão legal: cada BRIEF passa pelo
método de `docs/operating-manual/VERIFICACAO-LEGAL.md` antes de virar regra.

## Tabela

| # | Capacidade | Encaixe | Base lida | Observação para o BRIEF |
|---|---|---|---|---|
| G1 | Licença-paternidade e salário-paternidade | **F3** (afastamento remunerado, rubrica, incidências, estabilidade e férias) + **F4** (S-2230, motivo de licença-paternidade) | Lei 15.371/2026 arts. 2º-4º, 6º (CLT 131, 134 §§4º-5º, 392, 393, 473), 7º (Lei 8.212 art. 28 §9º a), 8º (Lei 8.213 arts. 73-A a 73-H), 11, 12 (+1/3 se a criança tem deficiência), 14; Lei 11.770/2008 art. 1º II | Vigência **01/01/2027** (art. 14). Duração por data de efeito, como `LegalParameter` (10 dias em 2027, 15 em 2028, 20 em 2029; a de 2029 condicionada à meta fiscal, art. 11 §§1º-2º). O salário-paternidade é **pago pela empresa** ao empregado, com reembolso "nos termos de regulamento" (art. 73-D §1º), e **integra** o salário-de-contribuição (art. 28 §9º a da Lei 8.212, após a Lei 15.371). O MOS S-1.3 §24 só inserirá os códigos de incidência da rubrica depois da regulamentação do pagamento: **dependência de regulamento**, registrar no BRIEF como pendência, sem inventar código. Entram na mesma entrega: estabilidade de 1 mês após o fim da licença (art. 4º), férias contínuas à licença (CLT 134 §4º) e a prorrogação de 15 dias da Empresa Cidadã (Lei 11.770 art. 1º II) |
| G2 | Riscos psicossociais no PGR (NR-1) | **SST** (núcleo, F-DP-13) | NR-1 consolidada (D34) itens 1.5.3.1.4, 1.5.3.2.1, 1.5.4.4.5.3, 1.5.4.4.6 (revisão a cada 2 anos); Portarias MTE 1.419/2024 e 765/2025 | **Em vigor desde 26/05/2026** (COBERTURA-DP.md §6, item 1). O BRIEF do SST cobre o registro do PGR e a data de revisão como pendência de obrigação, no molde de F-DP-7; não avalia risco |
| G3 | Eventos S-2306 e S-2555 | **F4** — S-2306 junto de S-2300/S-2399; S-2555 junto de S-2500/S-2501 | Sumário oficial do leiaute S-1.3 (NT 07/2026 rev. 20/10/2026) e MOS (D01, D02) | S-1280 **continua fora** (CPRB, `NAO_SE_APLICA`, PRE-ADR de pessoal §R-2060). Prazos e totalizadores: COBERTURA-DP.md e `coleta/dp-obrigacoes-r2b.txt` |
| G4 | Qualificação cadastral (CPF/NIS) | **F4**, como etapa anterior ao envio do S-2200, S-2205 e S-2300, pela mesma porta com adaptador nulo/manual do F-DP-3 | MOS S-1.3 §7.3 e §7.3.2 (ferramenta CQC) | Não é cálculo: é validação cadastral do trabalhador antes do evento |
| G5 | Aviso prévio, médias, rescisão complementar, férias proporcionais | **F3**, dentro da rescisão e das folhas especiais | CLT 146, 477 (§§1º-8º), 484-A, 487-491 (lidos no acervo); Lei 12.506/2011 (aviso proporcional) e CLT 142 (médias de férias): **a ler no BRIEF** | O TRCT e o seguro-desemprego já estão em L2 (F3/F4) |
| G6 | Contrato intermitente; teletrabalho | **F3** (intermitente: pagamento por convocação, com férias e 13º proporcionais no recibo) e **atributo do vínculo** no mesmo BRIEF (teletrabalho) | CLT 452-A (completo) e 75-A a 75-E (lidos); CLT 62 e EC 141 art. 8º (controle de jornada); MOS S-1.3 (teletrabalho só como local de trabalho) | S-2260 (convocação) **não está** no MOS nem na NT 07/2026: não gerar evento próprio; a convocação é dado do cálculo |
| G7 | Transferência de empregado entre estabelecimentos e sucessão de vínculo | **F4** | MOS S-1.3 (grupo `sucessaoVinc`, `remunSuc`, item 6.2 da remuneração no mês da transferência) ; CLT 10 e 448: **a ler no BRIEF** | O vínculo já tem `unitId` (estabelecimento) |
| G8a | Intervalo suprimido, sobreaviso e prontidão | **F3** (rubricas novas do catálogo fechado, com natureza e incidência) | CLT 71 lido; §4º e CLT 244 §§2º-3º: **a ler no BRIEF** | Não altera o BRIEF do F2 |
| G8b | Guarda e prescrição de documentos | **F5** (política de retenção no fechamento) | CF art. 7º XXIX (D32); Lei 8.036 art. 23 (lido); Decreto 3.048 art. 225 (lido no Planalto, D21) | Prazo de guarda do registro de ponto: **não achado** em texto oficial (Portaria 671 compilada e Consolidada MTE 1/2025 não o trazem); fica como pendência de leitura, não como regra |
| 15 | Folha complementar e diferenças retroativas de CCT/dissídio | **F3** | CLT 611 e seguintes (existência); retificação de S-1200/S-1210 no MOS; regras do dissídio: **a ler no BRIEF** | Hoje só na spec externa (Katz) |
| 41 | Simulação de rescisão e férias | **Fora** | Nenhuma norma a impõe | Segue o "Fora, sem pedido" de 06/11 |
| N1 | Informações ao empregado sobre campanhas de vacinação, HPV e cânceres, e sobre a falta para exames preventivos | **DP-APP** (comunicação obrigatória), não núcleo de cálculo | Lei 15.377/2026 arts. 1º-3º (CLT 169-A e 473 §3º); vigência **na data da publicação, 02/04/2026** (art. 3º) | Lacuna nova do cruzamento: já em vigor |

## Datas e ambiguidades resolvidas que os BRIEFs herdam

- **EC 141/2026:** 2 dias de repouso (art. 7º XV) e limite de 42 h valem de **16/12/2026**; limite de 40 h, de **16/12/2027**
  (LC 95 art. 8º §1º, aplicada às emendas pelo parágrafo único do art. 1º; COBERTURA-DP.md §6 item 2). Risco residual:
  contagem pelo Código Civil daria 17/12.
- **NR-1:** 26/05/2026. **Crédito do Trabalhador:** Lei 15.179/2025 é a conversão da MP 1.292/2025.
- **DCTFWeb:** prazo no último dia útil do mês seguinte desde 07/02/2025 (IN RFB 2.248/2025 art. 6º, lida no SIJUT).

## Pendências de leitura (não são decisão)

IN PRES/INSS 128/2022 (PPP/LTCAT; o DOU devolveu 403), Quadro I da NR-5 e Anexo II da NR-4 (tabelas ilegíveis na
extração), tabelas mensais do IRRF e alíquotas do DAS 2027 (PDFs não baixados), portarias do PAT, Notas Técnicas
EFD-Reinf 01-03/2026, holerite digital (sem norma achada do MTE). Detalhe e fonte: COBERTURA-DP.md §7.

## Efeito no código

Nenhum. O `DP-PONTO`, `DP-BEN` e os demais opcionais do `moduleRegistry.ts` continuam `disponivel: false`.

**Publicação (24/11):** escrito em 14–15/11 na worktree `claude/personal-dept-coverage-c7fea7` e publicado em 24/11 sem mudar o conteúdo, só com esta nota. Os forks do país na borda (F-PB-1..9) foram ratificados em 24/11 (`docs/plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md`, PR #1331), e a regra reescrita está em `docs/adr/ADR-PAIS-NA-BORDA.md` (PR da sessão de planejamento de 24/11, branch `claude/adr-pais-na-borda-emendas`). Lacuna de origem: `L-20261124-032018-f96d`.
