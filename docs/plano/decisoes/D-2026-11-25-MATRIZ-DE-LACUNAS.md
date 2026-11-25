---
id: "D-2026-11-25-MATRIZ-DE-LACUNAS"
tipo: "decisao"
dominio: "processo"
titulo: "Lacuna da caixa recebe matriz de 6 eixos; a prioridade P0–P3 é derivada; meta do dreno = P0 + P1 + fiscal P2"
estado: "decided"
autorizacao: "dono, questionário no chat, 2026-11-25: eixos = '6 eixos'; meta = 'P0 + P1 + fiscal P2'; quem = 'Quem registra + maestro'; não-defeito = 'Sim, pelo custo de não ter'. Depois da revisão externa (§6), 'Perfeito pode seguir' sobre R1–R6 e as propostas de C2–C4; ordem dos PRs = 'Integração única' (integration/caixa-gravidade, com o #1408 como 1ª camada)."
atualizado: "2026-11-25"
---
# D-2026-11-25-MATRIZ-DE-LACUNAS

**Estado:** `decided`. Os 4 forks de forma, a calibração do piloto (C1–C4, com R1 resolvendo a C1) e as recomendações
R1–R6 da revisão externa foram aceitos pelo dono em 25/11. Implementação: `scripts/lacunas.mjs` v7. Emenda a [D-2026-11-11-LACUNA-VAI-AO-MAESTRO](D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md) e o item 2 da regra global
"Lacuna achada não fica para trás" (25/11), que hoje usa um rótulo só (`bug · gate · fiscal · melhoria · nit · estilo`).

**Por quê:** o rótulo único mistura três coisas: o tipo (bug, gate), o domínio (fiscal) e o tamanho do dano (nenhum dos
seis mede). No lote de 25/11 (244 abertas), "erro de rede em português" e "Simples soma só a unidade" saíram com o mesmo
peso de meta. Princípio já ratificado em [D-2026-11-06-REVISAO-CONVERGENCIA](D-2026-11-06-REVISAO-CONVERGENCIA.md): a
gravidade informa, e quem decide é outra regra. Aqui essa regra é a prioridade derivada e a meta.

## 1. Os 6 eixos

| Eixo | Pergunta | Valores |
|---|---|---|
| 1. Natureza (`classe`) | O que é? Decide a sessão | `defeito · debito · spec · feature · fork · gate`. O `gate` é só humano ou dado externo; um gate automático quebrado (teste instável, eval frouxa) é `defeito` do domínio engenharia |
| 2. Domínio | Onde dói? | `fiscal` (fiscal, legal, trabalhista) · `contabil` · `dados` (LGPD, segurança, segredo) · `operacao` (job, alerta, integração) · `produto` (tela, i18n, a11y) · `engenharia` (teste, CI, tooling, docs, arquitetura) |
| 3. Gravidade | Quanto dói em produção? | ver §2 |
| 4. Exposição | Quando acontece? | `E1` caminho comum · `E2` condição plausível (multiunidade, reinício, webhook fora, segmento de cliente) · `E3` corrida ou caso raro · `E4` latente (depois de um bump, de um merge ou de uma data futura) |
| 5. Detecção | Alguém percebe? | `silencioso` · `ruidoso` (erro, alerta, CI vermelho) |
| 6. Certeza | Quanto sei? | `verificado` (executei ou há teste) · `inferido` (li o código) · `assumido` (texto ou memória). Com `assumido`, a lacuna vai primeiro à instrumentação ou à leitura |

## 2. Gravidade: dois leitores, uma escala

| | Defeito ou débito (dano de ter) | Feature, spec, fork ou gate (custo de não ter) |
|---|---|---|
| `G1` | Dado ou obrigação errada persistida ou enviada, vazamento, irreversível | Cliente-alvo fica em descumprimento legal sem contorno |
| `G2` | Resultado errado visível ou fluxo travado sem contorno | Fluxo essencial impossível pelo produto, sem contorno |
| `G3` | Errado, mas com contorno ou recuperação | Há contorno manual fora do produto |
| `G4` | Ruído, mensagem, cosmético funcional | Conveniência |
| `G5` | nit / estilo | — |

## 3. Prioridade (derivada, nunca digitada)

- `P0`: G1 com E1 ou E2.
- `P1`: G1 com E3 ou E4; G2 com E1 ou E2.
- `P2`: G2 com E3 ou E4; G3.
- `P3`: G4.
- G5 fica fora da prioridade, e nit/estilo seguem no texto do PR.
- **Silencioso sobe um nível, só de P3→P2 e de P2→P1, e não em E4** (R1, que resolve a C1). Só G1 chega a P0.
- **G1 nunca fica abaixo de P1** (R2).
- **Gatilho dá piso P1** (R3): `--gatilho regressao,norma,vazamento,persistido` (um ou mais).
- **Prazo** (R4), contado da última classificação: P0 1 dia (o próximo ciclo do maestro), P1 7 dias, P2 30 dias. P3 e G5
  não têm prazo; o `pulso` conta as atrasadas.
- **Desempate** (R5): lacuna em dois domínios ou com duas leituras de nível fica com a mais alta.
- **Nome do nível** (R6): `--gravidade` em defeito e débito (dano de ter) e `--impacto` em spec, feature, fork e gate (custo
  de não ter). A escala e a tabela são as mesmas; o `pulso` conta a meta em `dano` e `falta` separadas.

**Meta do dreno:** P0 + P1 de qualquer domínio, mais P2 do domínio `fiscal`. Motivo: o oráculo fiscal é externo e caro
(PVA, RFB, contador). As outras lacunas contam, mas não são meta.

## 4. Quem preenche

- Quem registra preenche os 6 eixos no `add`, porque tem o código aberto. O script recusa o registro se faltar algum eixo.
- O maestro confere na triagem e pode reclassificar. A reclassificação entra no `historico`, com o motivo.
- Toda mudança de eixo fica registrada; nenhum eixo é sobrescrito sem rastro.

## 5. Piloto (20 lacunas do lote de 25/11, classificadas por leitura do texto)

| # | Lacuna | Matriz | P | Meta |
|---|---|---|---|---|
| 88 | Simples soma só a unidade (Res. CGSN 140 art. 16 § 2º) | defeito·fiscal·G1·E2·silencioso·inferido | P0 | sim |
| 238 | alert.failed loga URL do webhook com segredo | defeito·dados·G1·E2·silencioso·inferido | P0 | sim |
| 17 | Tabelas IRRF/DAS 2027 não conferidas na fonte | spec·fiscal·G1·E1·silencioso·assumido | P0 → leitura antes | sim |
| 164 | ISS/monofásico nunca expira com linha sem fim | defeito·fiscal·G1·E4·silencioso·inferido | P1 (+1 → P0?) | sim |
| 214 | postEntry × deleteAccount: partida em conta apagada | defeito·contabil·G1·E3·silencioso·inferido | P1 (+1 → P0?) | sim |
| 139 | Payload com CPF retido na fila do assinador | defeito·dados·G2·E1·silencioso·inferido | P1 (teto) | sim |
| 215 | Sintética com filhas apagável → PVA reprova | defeito·contabil·G2·E2·silencioso·inferido | P1 | sim |
| 157 | CNPJ alfanumérico perde as letras no formulário dinâmico | defeito·produto·G2·E2·silencioso·inferido | P1 | sim |
| 180 | Assinador desligado à noite faz o polling desistir | defeito·operacao·G2·E1·ruidoso·inferido | P1 | sim |
| 52 | H2 19c marcado PASSOU com evidência incompleta | gate·contabil·G2·E1·silencioso·verificado | P1 | sim |
| 75 | Sem NFS-e Paulistana (SP fora do Simples) | feature·fiscal·G3·E2·ruidoso·verificado | P2 | sim (fiscal) |
| 125 | Reler art. 45 quando sair o Regulamento IBS v2 | gate·fiscal·G2·E4·silencioso·verificado | P2 | sim (fiscal) |
| 140 | Cancelamento do JCP em 2 commits | defeito·contabil·G3·E3·silencioso·inferido | P2 (+1 → P1) | sim |
| 49 | Teste instável do CrmReportBuilder no CI | defeito·engenharia·G3·E1·ruidoso·verificado | P2 | não |
| 44 | OpenAPI com 0 paths no Windows | defeito·engenharia·G3·E1·ruidoso·verificado | P2 | não |
| 3 | Erro de rede em português com UI em inglês | defeito·produto·G4·E2·ruidoso·verificado | P3 | não |
| 26 | Mensagens do servidor em português fixo | feature·produto·G4·E1·ruidoso·verificado | P3 | não |
| 231 | Re-arme automático re-lista consulta inválida | fork·operacao·G4·E3·ruidoso·inferido | P3 | não |
| 35 | Snippet com dark:border-white/5 | debito·engenharia·G5 | — | não |
| 244 | `--gravidade` descartado em silêncio pelo script | defeito·engenharia·G3·E1·silencioso·verificado | P2 (+1 → P1) | sim |

A coluna P mostra a calibração anterior às recomendações. Com o R1 aceito, a 164 e a 214 ficam em P1, e a 140 e a 244
sobem a P1. Os testes `scripts/lacunas-matriz.test.mjs` fixam esses casos.

### Calibração que o piloto levantou (respondida em 25/11: R1 para a C1; C2–C4 como propostas)

- **C1. Silencioso + E4.** A 164 é latente: só dói se alguém publicar a linha sem fim. A regra "silencioso sobe" a leva a
  P0, junto da 88, que dói hoje em toda PJ com 2+ unidades.
  Proposta: o silencioso não sobe quando a exposição é E4.
- **C2. Assumido + G1.** A 17 (tabela não conferida) sai P0. Isso é coerente com a regra "agente não substitui oráculo",
  mas toda tabela legal ainda não conferida viraria P0.
  Proposta: manter P0 e rotear à leitura pelo método `VERIFICACAO-LEGAL`, que é barata.
- **C3. Contorno manual fora do produto conta como G3?** Na 75, a nota pode ser emitida no site da prefeitura. Pelo
  "custo de não ter", isso é G3. Com isso, a Paulistana fica em P2 e só entra na meta por ser fiscal.
- **C4. Go-live em 2027.** Hoje não há cliente. A gravidade se mede "como se estivesse em produção", e a exposição não
  rebaixa nada por falta de cliente.

## 6. Revisão externa: como outros projetos classificam (pesquisa de 25/11)

Lido nas buscas de 25/11; as páginas oficiais não foram abertas inteiras. As fontes estão no fim da seção.

| Fonte | O que separa | Escala | O que isso muda aqui |
|---|---|---|---|
| Mozilla / Firefox | Tipo, severidade e prioridade. A severidade foi separada da prioridade em 2020, porque a prioridade sozinha misturava as duas | S1 catastrófico · S2 sério (sem contorno satisfatório) · S3 normal (com contorno) · S4 pequeno/cosmético · **N/A só para task e enhancement**; defeito nunca é N/A. S1 e S2 vão à gerência de release | Confirma o eixo do contorno (G2 × G3) e a separação. Diverge do fork "não-defeito recebe gravidade" |
| GitLab | `type::`, `severity::1–4` e `priority::1–4`, em rótulos independentes | Blocker · Critical · Major · Low; um SLO por severidade; caiu em duas categorias, vale a mais alta | Regra de desempate; prazo por nível |
| Kubernetes | `kind/`, `priority/` e o estado `triage/` (needs-triage, accepted) | critical-urgent · important-soon · important-longterm · backlog | O estado de triagem fica separado da classificação, como o nosso eixo de certeza |
| Rust (compilador) | Gatilhos de priorização: regressão e `I-unsound` entram sozinhos no `I-prioritize` | P-critical · P-high · P-medium · P-low | **Regressão** é sinal próprio, e a nossa matriz não tem. Gatilho dá piso de prioridade |
| Chromium (segurança) | Severidade S0–S3 mapeada a uma prioridade padrão | S0→P0 (30 dias), S1→P1 (60 dias); exploração ativa = P0 **qualquer que seja a severidade**; `Security-Impact_None` sai do prazo | Gatilho que sobrepõe a matriz; latente fora do prazo (o nosso E4) |
| Debian | Severidade com um corte de "release-critical" | critical · grave · serious (= violação de um "must" da política) · important · normal · minor · wishlist | Violar norma obrigatória é bloqueante por definição. É o análogo do domínio fiscal |
| ITIL | Prioridade = impacto × urgência, por **tabela**; o impacto é do técnico e a urgência do usuário | Matriz de 4 ou 5 níveis, conforme a organização | A prioridade é tabela, não conta. É o que o §3 já faz |
| FMEA, AIAG-VDA 2019 | Severidade, ocorrência e detecção. O RPN (S×O×D) foi **trocado** pela tabela Action Priority, porque a multiplicação distorcia o risco | Peso: severidade > ocorrência > **detecção (a menor)**; severidade alta age qualquer que seja o resto | Os nossos G, E e detecção são o trio do FMEA. **Detecção não pode criar P0** (C1) |
| CVSS v4 | Base (intrínseco) · Threat (muda no tempo) · Environmental (do ambiente) · Supplemental (**nunca entra no escore**; quem consome decide o uso) | 0–10 | A gravidade é o "base" e a exposição é o "environmental". O domínio é "supplemental": não muda o P, só a regra de meta. É o desenho do §3 |

**O que a revisão confirma no rascunho:**
1. A separação natureza × gravidade × prioridade é o padrão (Mozilla, GitLab, Kubernetes).
2. A prioridade sai de uma tabela, nunca de uma multiplicação (ITIL, AIAG-VDA).
3. O contorno é o que separa G2 de G3 (Mozilla S2 × S3).
4. O domínio fica fora do escore e só pesa na regra de meta (CVSS supplemental).

**O que a revisão muda (recomendações R1–R6, ao dono):**
- **R1, resolve a C1.** A detecção tem o menor peso. O silencioso sobe um nível só de P3→P2 e de P2→P1. Não cria P0 e não
  se aplica a E4. Fonte: AIAG-VDA.
- **R2. Piso pela gravidade.** G1 nunca fica abaixo de P1, qualquer que seja a exposição. O §3 já faz isso; fica escrito
  como regra. Fonte: FMEA.
- **R3. Gatilhos que sobrepõem a matriz e dão piso P1.** São quatro:
  - regressão (funcionava e quebrou);
  - violação de norma obrigatória (o "must" do Debian);
  - vazamento de dado pessoal ou segredo;
  - dado errado já persistido no razão ou em documento fiscal.

  Fontes: Rust, Chromium, Debian. Na v7, os quatro entram pela flag `--gatilho`.
- **R4. Prazo por prioridade.** Exemplo: P0 no próximo ciclo do maestro, P1 em 7 dias, P2 em 30. O prazo dá ao dreno um
  critério de atraso, além da contagem. Fontes: Chromium, GitLab.
- **R5. Desempate.** Lacuna em dois domínios ou com duas leituras de gravidade fica com a mais alta. Fonte: GitLab.
- **R6. Não-defeito.** O padrão de mercado é N/A (Mozilla); o dono escolheu o "custo de não ter". Reconciliação proposta:
  - mesma escala G1–G5, mas com o nome **impacto** para feature, spec, fork e gate, e **gravidade** só para defeito e débito;
  - o P sai da mesma tabela;
  - a fila mostra as duas colunas separadas, e dano não se mistura com falta na mesma contagem.

**Fontes:**
- [Mozilla, Defect Severity](https://firefox-source-docs.mozilla.org/bug-mgmt/guides/severity.html)
- [Mozilla, Triage for Bugzilla](https://firefox-source-docs.mozilla.org/bug-mgmt/policies/triage-bugzilla.html)
- [BMO BugFields](https://wiki.mozilla.org/BMO/UserGuide/BugFields)
- [GitLab, Issue Triage](https://handbook.gitlab.com/handbook/product-development/how-we-work/issue-triage/)
- [GitLab, labels](https://docs.gitlab.com/development/labels/)
- [Kubernetes, Issue Triage](https://kubernetes.dev/docs/guide/issue-triage)
- [Rust, Prioritization](https://forge.rust-lang.org/compiler/prioritization.html)
- [Rust, Priority levels](https://forge.rust-lang.org/compiler/prioritization/priority-levels.html)
- [Chromium, Security Severity Guidelines](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/security/severity-guidelines.md)
- [Debian, Bugs/Developer](https://www.debian.org/Bugs/Developer)
- [Debian, RC policy](https://release.debian.org/trixie/rc_policy.txt)
- [InvGate, ITIL priority matrix](https://blog.invgate.com/itil-priority-matrix)
- [GLPI, priority matrix](https://github.com/glpi-project/doc/blob/develop/source/modules/assistance/prioritymatrix.rst)
- [AIAG-VDA FMEA 2019](https://aiag.org/about/news/2019/06/03/aiag-and-vda-release-new-automotive-fmea-handbook)
- [Durivage, adeus ao RPN](https://www.bioprocessonline.com/doc/is-it-time-to-say-goodbye-to-fmea-risk-priority-number-rpn-scores-0001)
- [PTC, RPNs](https://support.ptc.com/help/wrr/r12.0.1.0/en/wrr/PractitionersGuide/RPNs.html)
- [Qualys, CVSS v4](https://blog.qualys.com/product-tech/2023/11/02/cvss-v4-is-now-live-and-what-do-you-need-to-know)
- [OWASP Risk Rating](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)

## 7. Implementação e o que vem depois

**No PR da matriz (v7 do `scripts/lacunas.mjs`, empilhado sobre o #1408 em `integration/caixa-gravidade`):**
- `add` exige `--dominio`, `--gravidade` (defeito/débito) ou `--impacto` (o resto), `--exposicao`, `--deteccao` e
  `--certeza`, aceita `--gatilho` e valida tudo. G5 só pede o domínio, e defeito não aceita G5.
- `classificar <id> --motivo` reclassifica, em vez do `set`: o comando já existe no #1408 e não mexe em estado nem no relógio.
  - Mescla só os eixos dados e guarda o de → para de cada eixo.
  - O rótulo único antigo é tratado como sem matriz.
- `list --prioridade <P0|P1|P2|P3|meta|sem|atrasada>` substitui `--gravidade sem|meta`. A linha mostra o P e os eixos.
- `pulso` mostra a meta (dano · falta · sem matriz), as atrasadas e o G5.
- Fecha a lacuna L-20261125-123319-1ae3.

**Depois do merge na `main`:**
- `instalar`, para levar a v7 à cópia global.
- Reclassificação da caixa legada com `classificar`, feita pela sessão de fechamento. O rótulo gravado à mão em 25/11 foi
  retirado da caixa antes do PR.
- O item 2 da regra global (`~/.claude/CLAUDE.md`) troca o rótulo único pela matriz. É arquivo do dono, e quem edita é o dono.
