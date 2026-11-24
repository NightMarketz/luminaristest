---
id: "D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "ADR-PAIS-NA-BORDA ratificado: redação R1–R7 e forks F-PBA-1..7 e F-PNT-PB-1 (dono, questionário, 24/11)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-24, três questionários (AskUserQuestion) na sessão de planejamento do ADR, a pedido dele (\"faz o questionário dos forks F-PBA comigo\"). Ratifica o ADR e decide forks; não é 'executa' novo: o 'executa' dos BRIEFs emendados é o da D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §4, que vale para o BRIEF emendado (§6 de lá)"
atualizado: "2026-11-24"
---
# D-2026-11-24 — ADR-PAIS-NA-BORDA: redação e forks ratificados

**Estado:** `decided`. **Autorização:** dono, chat, 24/11/2026, por três questionários com contexto (AskUserQuestion)
pedidos por ele. A recomendada vinha primeiro em cada pergunta. Os rótulos abaixo são os que o dono escolheu.

| Fork | Resposta do dono (rótulo) | Decisão | Contra a recomendação? |
|---|---|---|---|
| F-PBA-1 alcance do inglês | "Novo em inglês" | (a) todo identificador novo em inglês; o que completa um conjunto antigo segue o conjunto até a fatia dele | não |
| F-PBA-2 língua da borda | "Termo da lei, como hoje" | (a) vocabulário da lei + sufixo de camada; satélite `Br<ModeloDoCentro>` com colunas em português | não |
| F-PBA-4 entrada do satélite pela API | "Rota da borda …/br" | (a) rota, DTO, serviço e repositório da borda sob o recurso do centro | não |
| F-PBA-5 legado BR que consome a borda | "Escopo LEGADO_BR" | (a) escopo nomeado na `P1`, só encolhe; entrada nova é emenda datada do ADR | não |
| F-PBA-3 borda fora de `features/` | "App no lugar, lib na borda" | (a) controller, rota e job onde o Contrato manda; lib pura nova de país em `paises/<cc>/models/` | não |
| F-PBA-7 tabela nova de `LegalParameter` | "Fatia F3 antes" | (a) a F3 (registro de formato por domínio e país) entra antes do PR-0 do ciclo e do PR-P0 da ponte | não |
| F-PBA-6 prazo e dono por fatia | "Aceito esses prazos" | (a) os prazos e o dono do ADR §5; o nó `PAIS-NA-BORDA` nasce neste fold | não |
| F-PNT-PB-1 rota do `BrUnit` (ponte do DP) | "Pelo fiscal-profile/br" | **(b)**: o CNPJ do estabelecimento entra pelo `PUT /accounting/fiscal-profile/br`, e o serviço do satélite grava também o `BrUnit` | **sim** (recomendada: `/units/:unitId/br`) |
| Redação R1–R7 | "Ratifico R1–R7" | o ADR passa a `Accepted` | não |

## Consequências

- `docs/adr/ADR-PAIS-NA-BORDA.md` passa a **Accepted 2026-11-24**. A guarda (`P1`, `P2`, G1–G5) entra como item 0 do PR-0
  do montador único, ou do primeiro PR de código emendado que andar antes.
- Os BRIEFs emendados do montador único, do CICLO-FISCAL, da NFSE-PAULISTANA e da ponte do DP ficam sem fork novo pendente.
  O `executa` deles (D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §4) volta a valer. O ciclo PR-0 e a ponte PR-P0 esperam a
  fatia F3 (F-PBA-7 a), e a ponte continua depois do PR-6 do F2.
- **F-PNT-PB-1 (b):** unidade sem perfil fiscal não recebe CNPJ. Para essa unidade, a pendência `CNPJ_ESTABELECIMENTO_AUSENTE`
  pede o perfil fiscal antes. O `BrUnit` continua sendo a tabela (cédula de 24/11 §2); só a rota mudou.
- O PR-0 da simulação segue sem `executa`, com F-SIM-9..15 pendentes (o F-SIM-13 ganhou o ramo (d) na emenda).
- Nó novo `PAIS-NA-BORDA` (`docs/plano/nos/PAIS-NA-BORDA.md`) com as fatias F0–F8. Cada fatia pede BRIEF e `executa` próprios.
