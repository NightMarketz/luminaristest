---
id: "D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA"
tipo: "decisao"
dominio: "governanca"
titulo: "Forks F-KS-1..7 do PRE-ADR-NUCLEO-KIT-DE-SETOR decididos pela prática de referência (Odoo/OCA/Business Central)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-07: \"O que vc não souber em arquitetura e estrutura, pesquise em projetos consolidados\" + \"Pode revisar as decisões dos forks anteriores de acordo com essa prática de referência\" + \"Sim, mas precisa de questionário em vez de já corrigir com a referência?\" — só decisão, sem 'executa'"
atualizado: "2026-10-07"
---
# D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA — forks decididos pela referência

**Estado:** `decided` — 9/9. F-KS-1..7 e R1 foram decididos pela referência. **F-KS-0** e **R4** foram decididos pelo dono por questionário (abaixo), porque nenhuma referência os decide: um é ordem de trabalho, o outro contraria uma decisão explícita dele.
**Não é "executa"** (ORCH-006).

Documento dos forks: [`PRE-ADR-NUCLEO-KIT-DE-SETOR.md`](../../adr/PRE-ADR-NUCLEO-KIT-DE-SETOR.md) §4, com a evidência em §2.4/§2.5.

## Regra do dono sobre o critério (07/10)

Sobre arquitetura e estrutura, a fonte é a prática de projetos consolidados, e não um questionário. É o mesmo padrão de
[[D-2026-10-07-SIMPLES-FORKS]] ("decide-se pela lei"). Vale só onde a referência responde. Onde ela não responde, ou
contraria uma decisão explícita do dono, o ponto volta para ele.

## Cédulas

| Fork | Decisão | Base |
|---|---|---|
| F-KS-1 | (a) nó novo `KIT-SETOR`, termo "kit de setor" | Protocolo do vault: o [[P1]] fechou com prova própria. O termo evita a colisão com o pacote pré-pago ([[PACOTE-VALIDADE]]) |
| F-KS-2 | (a) kit em código → binding do tenant compilado (dado) | Odoo: modelo em código no módulo, copiado como registros da empresa (§2.4); ADR-P1 §5 |
| F-KS-3 | (a) canônico base + extensão aditiva por setor | Odoo: modelo pai/filho; a recarga casa conta pelo código (`chart_template.py` 17.0, ~l.355-375) |
| F-KS-4 | (a) ajuste papel→conta por escopo, como entrada da compilação | Odoo: `_pre_reload_data` descarta as `property_*` (~l.248-250); BC: a matriz de lançamento é dado da empresa |
| F-KS-5 | (b) passo do deploy + **R2**: *instalar* ≠ *atualizar*; atualizar nunca toca papéis e grava dry-run antes | Odoo: carga (`_load`) ≠ recarga (`reload_template` + `_pre_reload_data`); BC: mecanismo distinto para empresa em produção |
| F-KS-6 | (a) fronteira dentro do monorepo; extração quando houver 2º projeto | Odoo: núcleo `account`, localizações e módulos de negócio são addons separados no **mesmo** repositório, ligados por dependência declarada |
| F-KS-7 | (a) referencial no kit + **R3**: só ano sem ECD/ECF entregue; ano entregue → conflito (c) | Odoo: a recarga atualiza só a classificação (tags) de conta existente; o limite por ano entregue vem do fato de a escrituração entregue ser imutável |
| R1 (§2.5) | Binding de evento **novo** = nível (b), não (a) | Odoo: a recarga não muda o comportamento de lançamento |

## Decididos pelo dono (questionário, 07/10)

| Ponto | Resposta literal | Decisão |
|---|---|---|
| F-KS-0 | *"Pausa só a LAC-B (Recommended)"* | (b): nada novo entra antes do [[KIT-SETOR]]; a [[LAC-B]] pausa; os outros `inflight` seguem (lei/regime, governança, F5, W3, PACOTE-VALIDADE) |
| R4 | *"Mantém automático (Recommended)"* | A decisão 2 fica: atualização automática, com as proteções do Odoo + R1/R2/R3. Divergência consciente da prática de referência, registrada no PRE-ADR §2.5 e nos Riscos |
