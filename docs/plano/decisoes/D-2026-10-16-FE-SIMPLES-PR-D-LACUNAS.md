---
id: "D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec do PR-D das telas do Simples Nacional (de onde vem o sócio da DEFIS; onde ficam as alíquotas) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-16, questionário na sessão de feature do PR-D — sócio da DEFIS: 'Tabela à escolha (Recomendado)'; alíquotas: 'Seção no detalhe (Recomendado)'"
atualizado: "2026-10-16"
---
# D-2026-10-16-FE-SIMPLES-PR-D-LACUNAS — lacunas de spec do PR-D do [[FE-INCR-SIMPLES]]

**Estado:** `decided` (2 cédulas, as 2 na recomendação).
**Autorização:** dono, chat, 16/10/2026, questionário, na sessão de feature do PR-D (o "executa" do PR-D é do mesmo
dia: *"Cria também a sessão filha de PR-D do FE-INCR-SIMPLES"*, repassado pela sessão que abriu esta).

Origem: `docs/accounting/FE-INCR-SIMPLES-brief.md` itens 14 e 15 (e o §6 "Insumos ausentes", que já dizia que o
seletor de contato dos sócios seria localizado na execução). A sessão parou antes de escolher (regra 2).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 14 (sócio da DEFIS = "contato canônico") | O BE guarda só `contactId` (`SimplesDefisSocioSchema`, sem CPF/nome) e não diz de qual cadastro ele vem. Não existe cadastro de sócios: `AccountingContact` é só de contadores (exige CRC), `crmContacts` só existe com o CRM instalado, as parcerias usam `employees` | **Tabela à escolha**: `RelationSelector` canônico sobre uma tabela que o usuário escolhe entre as instaladas; ao reabrir, a tela procura a tabela que contém todos os ids gravados (tabelas de pessoa primeiro: `crmContacts`, `clients`, `customers`, `contacts`, `employees`) | não |
| Item 15 (onde ficam as alíquotas sugeridas) | O BRIEF descreve o conteúdo, não o lugar | **Seção do detalhe da competência** (ano SIMPLES), carregada ao abrir o mês, com o selo "Sugestão", a `regra` e os `avisos[]` do BE | não |

## Leituras que não viraram cédula (a spec ou uma decisão anterior já cobria)

- **Campos novos da DEFIS (#713):** além do que o item 14 lista, o `SimplesDefisUpsertSchema` atual exige ganhos de
  capital, exportação direta, exportação via comercial exportadora e doações eleitorais (o PUT é `.strict()` e todos
  são obrigatórios). Entram no formulário pelo **F-6 (a) "formulários completos"** (herdado do FE-INCR-TAX-ASSESSMENT).
- **Soma = 100% (F-FS-8 c):** a regra está no BE (`soma(socios.participacaoBp) + cotasTesourariaBp === 10000` quando
  há sócio). A tela mostra a soma e não bloqueia; o 400 do BE aparece com o texto dele.
- **DEFIS indisponível:** ano ≥ 2027 **e** ano sem mês apurado (DAS registrado) dão 400 no GET; a tela mostra o texto do
  BE no lugar do formulário nos dois casos (o item 14 só nomeava o primeiro).
- **Onde ficam DASN-SIMEI e DEFIS:** botão no cabeçalho do ano da aba Apuração, conforme o regime (**F-FS-6 a**).
- **Dinheiro vazio = 0** nos campos de valor da DEFIS (o portal parte de zero); empregados e participação do sócio são
  obrigatórios.

## Consequências

- `features/accounting/components/SimplesDasnSimeiModal.tsx`, `SimplesDefisModal.tsx`, `SimplesAliquotasSection.tsx`;
  `lib/defisSocios.ts` (detecção da tabela); mappers `toDefisForm`/`toDefisUpsert` em `lib/simplesForms.ts`.
- Trocar a tabela dos sócios limpa o sócio escolhido em cada linha (o id gravado é de uma linha da tabela anterior).
- Sócio gravado cujo id não está em nenhuma tabela (linha apagada): a tela não acha a tabela e cai na primeira tabela
  de pessoa; o seletor não mostra o nome dele, e salvar sem trocar mantém o id gravado (o BE não confere o id).
- Abrir a DEFIS carrega as linhas de cada tabela candidata até achar a dos sócios (um GET por tabela, parando na
  primeira que serve).
