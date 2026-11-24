# Coleta bruta: módulos de DP / Folha / RH (Brasil, CLT, eSocial)

Data da coleta: 2026-11-14. Leitura apenas. Sem classificação nem comparação.
Legenda de fonte: "oficial" = página/doc do próprio fornecedor ou repositório oficial; "secundária" = blog, review, imprensa ou terceiro; "snippet" = trecho visto só no resultado de busca, página não aberta; "não encontrado" = não apareceu nas fontes lidas.

---

## 1. Odoo + OCA l10n-brazil

- `l10n_br_hr` ("Brazilian Localization HR"), versão 18.0.1.6.0 — https://github.com/OCA/l10n-brazil (oficial, tabela "Available addons" do README, branch 18.0)
- `l10n_br_hr_contract` ("Brazilian Localization HR Contract"), versão 18.0.1.3.0 — https://github.com/OCA/l10n-brazil (oficial, README)
- `l10n_br_hr_contract`: campos eSocial para tipo de admissão, vínculo, dados sindicais e rescisão — https://odoo-modules.trobz.com/oca/l10n-brazil/18.0/l10n_br_hr_contract.html (secundária: página de terceiro que indexa o módulo)
- `l10n_br_resource`: "Define a Brazilian calendar and some tools to compute dates used in financial and payroll modules" — https://github.com/OCA/l10n-brazil (oficial, descrição na tabela de addons; não é módulo de folha)
- `l10n_br_esocial`: "integration with the eSocial S-1.3 layout", mantido pela KMEE — https://apps.odoo.com/apps/modules/16.0/l10n_br_esocial (listagem Odoo Apps; autor KMEE, fornecedor terceiro)
- KMEE afirma que o eSocial está migrando para `OCA/l10n-brazil` (versão 16.0) e que payroll para 17/18 vem depois — https://kmee.com.br/en/payroll-odoo-brazil/ (fonte do fornecedor KMEE, não verificada no repositório)
- KMEE afirma que as XMLs do eSocial são assinadas com certificado ICP-Brasil A1 pelo módulo `l10n_br_fiscal_certificate` — https://kmee.com.br/en/payroll-odoo-brazil/ (fornecedor KMEE, não verificada)
- Addon de folha de pagamento (payroll) no OCA/l10n-brazil: não encontrado. Lista de addons de RH na raiz do repositório (branch 19.0 e 18.0) contém só `l10n_br_hr` e `l10n_br_hr_contract` — https://github.com/OCA/l10n-brazil
- 13º, férias, rescisão/TRCT, ponto, SST, benefícios, consignado, pensão, PLR, DCTFWeb/FGTS/Reinf, contabilização como addon OCA: não encontrado.

Observação de leitura: a busca indicou branch padrão `19.0` na página do repositório, sem confirmação explícita de "padrão".

Itens coletados: 6 (3 oficiais/OCA, 3 de terceiros ou fornecedor KMEE).

---

## 2. Frappe HRMS

- Employee Lifecycle: "managing promotions and transfers", onboarding e entrevista de desligamento — https://docs.frappe.io/hr/introduction (oficial, fetch)
- Leave e Attendance: "pull regional holidays with a click"; check-in/check-out com geolocalização — https://docs.frappe.io/hr/introduction (oficial, fetch)
- Expense Claim e Advances: "configure multi-level approval workflows" — https://docs.frappe.io/hr/introduction (oficial, fetch)
- Appraisal: "make managing appraisal cycles easy" — https://docs.frappe.io/hr/introduction (oficial, fetch)
- Payroll & Taxation: "Create salary structures, configure income tax slabs, run standard payroll" — https://github.com/frappe/hrms (oficial, README, fetch)
- Payroll: pagamentos adicionais e fora de ciclo; detalhamento de rendimentos no holerite (salary slip) — https://github.com/frappe/hrms (oficial, README, fetch)

Localização brasileira (CLT, eSocial, FGTS, INSS, 13º, férias, ponto Portaria 671, SST): não encontrado no README do GitHub nem na introdução da documentação oficial. Busca genérica não trouxe app de localização brasileira oficial para Frappe HRMS (resultados foram só guias de payroll no Brasil de terceiros).

Itens coletados: 6 (todos oficiais, nenhum específico de Brasil).

---

## 3. Senior (Gestão de Pessoas / HCM)

- HCM GO UP - eSocial: "sistema de RH para PME"; pacote que inclui Administração de Pessoal (folha), eDocs eSocial, Segurança do Trabalho, Medicina Ocupacional, Benefícios, Análise de Impacto eSocial, Painel de Gestão e app Wiipo — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/6.10.3/esocial-hcm-go-up.htm (oficial, snippet de busca; versão mínima 6.2.35.67)
- Soluções para o eSocial: Administração de Pessoal, Benefícios, Segurança do Trabalho, Medicina Ocupacional, Jurídico — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Ferramentas: eDocs, Motor eSocial, Ferramenta de Análise de Impacto, Migrador eSocial — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Leiautes citados por código: S-1000, S-1005, S-1010, S-1020, S-1070; S-2190 a S-3000 (não periódicos); S-1200, S-1202, S-1210, S-1260, S-1270, S-1280, S-1298, S-1299 (periódicos); S-2500, S-2501, S-3500 (processo trabalhista) — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Eventos citados por nome: "S-2200 Admissão / Ingresso de Trabalhador"; "S-2206 Alteração do Contrato de Trabalho"; "S-2240 Condições Ambientais do Trabalho"; "S-2245 Treinamentos, Capacitações e Simulados"; "S-2260 Convocação para Trabalho Intermitente"; "S-2299 Desligamento"; "S-1299 Fechamento dos Eventos Periódicos" — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Segurança do Trabalho: "CAT, PGR"; Medicina Ocupacional: "Deficiências, ASO, Monitoramento biológico" — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Benefícios: "Planos de Saúde (titulares e dependentes)" — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Módulos adicionais de RH: Cargos e Salários; Recrutamento e Seleção; Treinamento; Jurídico — https://documentacao.senior.com.br/gestao-de-pessoas-hcm/esocial/solucoes/solucoes.htm (oficial, fetch)
- Página de produto de folha: "Cálculo da Folha de Pagamento Rápido e Preciso"; "Férias sem complicações"; "Processamento simplificado de rescisões"; "eConsignado prático, ágil e 100% em conformidade" (webservice integrado à folha); "Ponto Eletrônico: Integre horas extras e faltas à folha"; "Saúde e Segurança do Trabalho (SST)" dentro do Compliance Hub; "Conexão com as exigências do eSocial"; "Integridade nos dados para o Contábil"; "Autoatendimento de colaboradores com IA" (assistente Sara Corporativa) — https://www.senior.com.br/solucoes/gestao-de-pessoas-hcm/sistema-folha-de-pagamento (oficial, fetch)
- Na página de folha: 13º aparece só como pergunta da assistente Sara, sem recurso próprio — https://www.senior.com.br/solucoes/gestao-de-pessoas-hcm/sistema-folha-de-pagamento (oficial, fetch)
- Não encontrado nas fontes lidas: PLR, pensão alimentícia, estabilidades como módulo próprio, banco de horas como nome de módulo.

Itens coletados: 17 (todos oficiais; 14 linhas de conteúdo do pacote/solução e 3 de página de produto).

---

## 4. Domínio Folha (Thomson Reuters)

- "Domínio One: Inclui módulos de Contabilidade, Folha, Fiscal e portais para compartilhamento de arquivos" — https://dominiosistemas.com.br/ (oficial, fetch)
- Domínio Portal do Empregado (em "Módulos adicionais") — https://dominiosistemas.com.br/ (oficial, fetch)
- Calendário Contábil: eSocial, EFD-Reinf, FGTS Digital, DIRBI — https://dominiosistemas.com.br/ (oficial, fetch, menu)
- Benefícios (em "Serviços Financeiros", sem descrição) — https://dominiosistemas.com.br/ (oficial, fetch)
- Domínio Folha descrito como módulo de DP e RH com foco em reduzir cálculo manual; Portal do Empregado como complemento em nuvem — https://toexceed.com.br/blog/?p=9518 (secundária)
- Onvio Folha de Pagamento: cadastro de funcionários e envio ao eSocial — https://toexceed.com.br/blog/2026/09/06/onvio-folha-de-pagamento-como-funciona-e-quais-sao-os-principais-recursos/ (secundária)
- Mastersaf eSocial (lâmina): geração de arquivos, mensageria e consistência prévia para transmissão ao eSocial — https://www.thomsonreuters.com.br/content/dam/openweb/documents/pdf/Brazil/ONESOURCE%20Mastersaf/produtos/LAM2_TR_Mastersaf_eSocial_L%C3%A2minaeSocial_InHouse_Digital_14291.pdf (oficial Thomson Reuters, snippet; produto Mastersaf, pode não ser o Domínio Folha)
- Material sobre migração para FGTS Digital (e-book 2024) — https://dominiosistemas.com.br/wp-content/themes/dominio2021/contents/calendario-contabil/FGTS-Digital-Ebook-2024-Thomson-Reuters.pdf (oficial, snippet)
- Central de Soluções Domínio (suporte): não aberta — https://suporte.dominioatendimento.com/central/faces/index.html
- Não encontrado no site oficial: Departamento Pessoal como nome de módulo, férias, rescisão, 13º, ponto, SST, admissão digital.

Itens coletados: 9 (5 oficiais de site ou PDF, 2 secundárias e 1 snippet de PDF de linha que pode não ser o Domínio Folha; contagem inclui o e-book FGTS Digital).

---

## 5. TOTVS RM / Protheus (Gestão de Pessoas)

RM:
- Folha de Pagamento > etapa eSocial > Configurações Gerais, acessada pelo módulo Gestão de Pessoas, aba Gestão Organizacional — https://tdn.totvs.com/download/attachments/223162854/FOP_BT_eSocial_BR_RFOP002.pdf (oficial TDN, snippet)
- Seleção do leiaute S-1.2 em RH | Folha de Pagamento | Configurações | Parametrizador | eSocial — https://tdn.totvs.com.br/download/attachments/840389446/Suporte_Responde_Folha_Pagamento_Dicas_Gerais_Ago-24_Linha-RM.pdf (oficial TDN, snippet)
- Eventos S-1200 e S-1210 (valores tributados da folha); S-1299 fecha a folha e retorna S-5011 — https://tdn.totvs.com.br/download/attachments/840389446/Suporte_Responde_Folha_Pagamento_Dicas_Gerais_Ago-24_Linha-RM.pdf (oficial TDN, snippet)
- Processos trabalhistas pelo submenu S-2500 — https://tdn.totvs.com.br/download/attachments/840389446/Tira_D%C3%BAvidas_Processos_Trabalhistas_Jun-24_Linha-RM.pdf (oficial TDN, snippet)
- Lançamento financeiro DCTFWeb — https://tdn.totvs.com/download/attachments/840389446/Suporte_Responde_Lan%C3%A7amento_Financeiro_DCTFWEB_Out_24_Linha-RM.pdf (oficial TDN, snippet)
- Relatórios de conferência de RH RM — https://tdn.totvs.com/download/attachments/840389446/Suporte%20Responde%20-%20RH%20RM%20-%20Relat%C3%B3rios%20de%20Confer%C3%AAncia.pdf (oficial TDN, snippet)
- Complemento do 13º salário na folha e eSocial — https://tdn.totvs.com.br/download/attachments/758497581/Complemento%2013%C2%B0%20Salario%20na%20Folha%20e%20e-Social.pdf (oficial TDN, snippet)
- Desoneração da folha (boletim de 2012, rotina GPEM013) — https://tdn.totvs.com.br/download/attachments/59441854/GPE_BT_Desoneracao_Folha_%20BRA_TFJWCN.pdf (oficial TDN, snippet; documento antigo)
- Página raiz de Folha de Pagamento RM (FOP): HTTP 403, não lida — https://tdn.totvs.com/display/public/LRM/FOP

Protheus (SIGAGPE):
- SIGAGPE cobre funcionários, verbas, funções, transferências e marcações de ponto — https://tdn.totvs.com.br/download/attachments/547228040/Integracao%20Gestao%20de%20Pessoal%20Protheus%20X%20TOP%20Mobile%20-%20Versao%2012.pdf (oficial TDN, snippet)
- Contabilização de RH Protheus (conceito e prática; LP x Cadastro de Verba) — https://tdn.totvs.com.br/download/attachments/758498250/Tira%20Duvidas%20Suporte%20RH%20Protheus%20-%20Contabiliza%C3%A7%C3%A3o%20RH%20120922.pdf (oficial TDN, snippet)
- Cálculos brasileiros de vale-refeição, seguro de vida, cesta básica e assistência médica (guia v1.0, plano informado no cadastro) — URL de origem exata não identificada na busca (documento oficial TDN, snippet)
- Eventos eSocial documentados em "eSocial | Protheus - Entregas Legais" — https://tdn.totvs.com/x/T_JUE (oficial TDN, snippet de árvore de páginas)
- Folha de Pagamento para Gestão Pública (manual V12) — https://tdn.totvs.com.br/download/attachments/391545716/Manual%20Usuario%20-%20V12%20_Folha%20de%20Pagamento%20para%20Gest%C3%A3o%20P%C3%BAblica_v03.pdf (oficial TDN, snippet; escopo público, não privado)
- Portal Gestão Capital Humano (Protheus 12) — https://tdn.totvs.com/x/Ey4xHQ (oficial TDN, snippet)
- App Meu RH no Protheus (funcionalidades e configurações) — https://tdn.totvs.com.br/download/attachments/550307175/Tira%20Duvidas%20Suporte%20RH%20Protheus%20-%20Funcionalidades%20e%20Configura%C3%A7%C3%B5es%20do%20app%20Meu%20RH%20no%20Protheus%20230523.pdf (oficial TDN, snippet)
- Smart View SIGAGPE e Painel de Gestão / indicadores DW SIGAGPE — https://tdn.totvs.com/download/attachments/799276486/Suporte%20Responde%20_%20Smart%20View%20SIGAGPE.pdf?api=v2 (oficial TDN, snippet)
- Página comercial de folha (totvs.com/rh/folha-de-pagamento/): HTTP 402, não lida — https://www.totvs.com/rh/folha-de-pagamento/

Não encontrado nas fontes lidas: lista oficial atual de módulos RM e Protheus; férias, rescisão, ponto/Portaria 671 e SST como nomes de módulo com fonte oficial aberta. Muitos documentos são de 2012 a 2014.

Itens coletados: 18 (todos oficiais TDN, quase todos só como snippet de busca).

---

## 6. Alterdata (Pack / Folha)

- Gerenciador Alterdata Pack; cadastro "Departamento Pessoal Empresa" vincula empresas ao DP — https://ajuda.alterdata.com.br/wdp/empresa-29297038.html (oficial, ajuda Alterdata, snippet)
- Pré-requisito do cálculo: calcular férias e rescisão antes da folha; lançar faltas, horas extras, comissões — https://ajuda.alterdata.com.br/wdp/calculo-da-folha-31295485.html (oficial, ajuda, snippet)
- Cadastro de Áreas de Recursos Humanos é obrigatório para transmissão ao eSocial; caminho Social > Folha de Pagamento > Cadastros — https://ajuda.alterdata.com.br/prosoftsocial/fp3218-importacao-de-dados-esocial-infomacoes-gerais-236411950.html (oficial, ajuda, snippet; origem aproximada, verificar a página)
- FP3218: importação de dados de XML do eSocial para a base da folha após carga inicial aceita pelo SERPRO — https://ajuda.alterdata.com.br/prosoftsocial/fp3218-importacao-de-dados-esocial-infomacoes-gerais-236411950.html (oficial, ajuda, snippet)
- FP140+ eSocial passo a passo — https://ajuda.alterdata.com.br/display/BDCSN/FP140+-+eSocial+-+Passo+a+Passo (oficial, ajuda, snippet)
- FP3347: envio do evento S-2306 (alteração do salário mínimo de sócios) — https://ajuda.alterdata.com.br/nps/folha-de-pagamento-2025-320307353.html (oficial, ajuda, snippet; origem aproximada)
- Ponto: "banco de horas automático"; "Controle de Jornada e Gestão de Ponto" — https://www.alterdata.com.br/contabil/ponto-eletronico (oficial, snippet)
- Não encontrado: página comercial com lista de módulos vendidos no Pack Folha; nomes oficiais de 13º, rescisão, SST, benefícios, consignado, PLR, pensão como módulos.

Itens coletados: 8.

---

## 7. Fortes Pessoal (Fortes Tecnologia, Fortaleza-CE)

- Fortes Pessoal: "gerenciar a folha de pagamento de forma automatizada e estratégica" — https://www.fortestecnologia.com.br/?p=5554 (oficial, snippet de busca; página não aberta)
- Colabore (app do colaborador): "exclusivamente para funcionários de empresas clientes que usam Fortes Pessoal e/ou Fortes Ponto" — https://apps.apple.com/us/app/id1457030048 (oficial, listagem da loja; app de terceiros para a empresa Fortes, verificar)
- FortesPay: integração de pagamento com a gestão de folha, em parceria com Somapay (late 2023) — https://www.latamfintech.co/articles/brazilian-fintech-somapay-and-fortes-tecnologia-join-forces-to-integrate-payments-into-payroll-management (secundária, imprensa)
- Fortes processa e fecha pagamentos e transmite informações ao eSocial — https://finsidersbrasil.com.br/negocios-em-fintechs/cearenses-somapay-e-fortes-tecnologia-se-unem-para-integrar-pagamentos-a-gestao-de-folha (secundária, imprensa)
- Fortes Ponto: citado como produto (sem página lida) — https://apps.apple.com/us/app/id1457030048 (oficial loja, snippet)
- Não acessível: fortes.com.br. O domínio retorna a Cerâmica Fortes (fabricante de telhas e tijolos), outra empresa; não usado.
- Não encontrado: lista de módulos Fortes Pessoal (cadastro, admissão, 13º, férias, rescisão, eSocial, ponto, SST, benefícios etc.).

Itens coletados: 5 (1 oficial de site, 1 oficial de loja, 2 secundárias de imprensa, 1 citação de Fortes Ponto).

---

## 8. Questor

- "Folha de Pagamento | Questor Docs" — https://docs.questor.com.br/pt-br/Produtos/Gest%C3%A3oCont%C3%A1bil/FolhadePagamento/ (oficial, fetch; só o título foi visível, sem itens)
- Transferência de funcionários entre empresas (registra data e hora da transferência) — https://docs.questor.com.br/pt-br/Produtos/Gest%C3%A3oCont%C3%A1bil/FolhadePagamento/Transfer%C3%AAncia/transferencia-entre-empresas (oficial, snippet)
- Não acessível: questor.com.br (site institucional) não foi aberto.
- Não encontrado: módulos de DP, eSocial, ponto, SST, benefícios etc.

Itens coletados: 1.

---

## 9. Sankhya Gestão de Pessoas

- sankhya.com.br/gestao-de-pessoas/: HTTP 404, não acessível — https://www.sankhya.com.br/gestao-de-pessoas/
- Sankhya criou ferramenta de folha de pagamento desenvolvida internamente e a integrou a Pontel (ponto), Mindsight (performance) e Vixting (SST) — https://www.baguete.com.br/noticias/sankhya-acelera-no-mercado-de-rh (secundária, imprensa)
- Pontotel (ponto) passou a integrar o grupo Sankhya após parceria em 2022 — https://pontotel.com.br/sobre-nos/ (oficial da Pontotel, não da Sankhya; citação para contexto)
- Mindsight: people analytics, avaliação de desempenho, recrutamento e pesquisas — https://itforum.com.br/noticias/sankhya-adquire-a-mindsight/amp/ (secundária, imprensa)
- Vixting: saúde ocupacional e admissão digital, operando de forma independente (aquisição ago/2024) — https://www.baguete.com.br/public/noticias/sankhya-compra-vixting (secundária, imprensa)
- Lista de módulos de RH do grupo: ponto, recrutamento, admissão, performance e folha — https://startups.com.br/negocios/ma/mais-um-ma-sankhya-compra-a-startup-vixting-de-rh/ (secundária, imprensa)
- Foco declarado em empresas médias a partir de 150 funcionários — https://startups.com.br/negocios/exclusivo-sankhya-lanca-braco-de-rh-sob-comando-de-ex-solides/ (secundária, imprensa)
- Não encontrado: site oficial de Gestão de Pessoas da Sankhya; módulos de folha e eSocial com fonte oficial; férias, 13º, rescisão, SST, benefícios.

Itens coletados: 7 (todos secundários ou de imprensa, exceto a menção à Pontotel).

---

## 10. Convenia

Site oficial (convenia.com.br, fetch):
- Folha de Pagamento (menu Departamento Pessoal, marcado "NOVO") — https://www.convenia.com.br/ (oficial)
- "Gestão de folha de pagamento e distribuição de holerites"; "Distribuição de holerites" — https://www.convenia.com.br/ (oficial)
- "Admissão / desligamento"; "Processamento de admissão e desligamento" — https://www.convenia.com.br/ (oficial)
- "Férias"; "Férias flexíveis"; "Gestão de férias e benefícios" — https://www.convenia.com.br/ (oficial)
- "Benefícios" — https://www.convenia.com.br/ (oficial)
- "Ponto"; "Ponto digital (integração nativa)" — https://www.convenia.com.br/ (oficial)
- "Portal do colaborador" (item mais próximo de autoatendimento; a palavra "autoatendimento" não aparece) — https://www.convenia.com.br/ (oficial)
- Não encontrado no site oficial: eSocial, FGTS, DCTFWeb, consignado, 13º, rescisão como nome de item.

Fontes secundárias e blog do fornecedor:
- Folha: "processamento de rotinas" e integração do sistema contábil ao e-Social — https://www.b2bstack.com.br/empresa/convenia (secundária, review)
- Convenia RH: da contratação ao desligamento, incluindo férias e benefícios — https://www.b2bstack.com.br/empresa/convenia (secundária, review)
- Produtos listados: Convenia RH, Convenia Clube, Convenia Benefícios, folha — https://www.b2bstack.com.br/empresa/convenia (secundária, review)
- Acompanhamento de ciclo de pagamento e cálculos por colaborador; equipe de especialistas em folha — https://blog.convenia.com.br/esocial/ (fornecedor, blog)
- Preço não publicado no site — https://www.b2bstack.com.br/empresa/convenia (secundária)

Itens coletados: 15 (8 oficiais, 6 secundárias ou blog; 1 linha de "não encontrado" fora da contagem).

---

## 11. Pontomais / Tangerino (ponto)

- Pontomais: não encontrado em nenhuma busca; pontomais.com.br não foi aberto.
- Tangerino: www.tangerino.com.br não acessível (erro de certificado TLS na leitura). Não lido.
- Portaria 671 (texto de terceiros): substituiu portarias 1510 e 373; modalidades REP-C, REP-A e REP-P; aplicativo de celular permitido; comprovante e espelho exigidos — https://pontotel.com.br/controle-ponto/ e https://flashapp.com.br/blog/lei-do-ponto-eletronico (secundária; texto oficial MTE não aberto)
- Pontotel (fora da lista pedida, citada como alternativa de ponto): funcionalidades de jornada e banco de horas (regras configuradas, limite de acúmulo, aprovação pelo gestor) — https://pontotel.com.br/funcionalidades/ (oficial da Pontotel, snippet)
- Pontotel: "Software de ponto eletrônico homologado na Portaria 671" — https://www.pontotel.com.br/lp/software-de-ponto (oficial da Pontotel, snippet)
- Pontotel: módulo de Departamento Pessoal / folha — https://www.pontotel.com.br/sistema-de-folha-de-pagamento/ (oficial da Pontotel, snippet)
- Banco de horas automático (Alterdata, ponto) — https://www.alterdata.com.br/contabil/ponto-eletronico (oficial Alterdata, snippet)

Itens coletados: 6 (inclui 3 de Pontotel e Alterdata, citados como referência de ponto; zero de Pontomais e Tangerino).

---

## 12. Solides e Gupy (só admissão e folha)

Solides:
- Folha Digital: "calcula a folha em minutos, funciona 100% na nuvem e integra com o eSocial em tempo real" — https://solides.com.br/produtos/folha-digital/ (oficial, snippet; termos de marketing, não verificados)
- Admissão digital: colaborador preenche dados e anexa documentos online; dados aprovados exportados para a folha — https://solides.com.br/llm/folha-digital-solides-fechamento-integrado-ao-ponto-e-a-admissao.html (oficial, snippet; depoimento de cliente na página)
- Admissão, ponto e férias são registrados na plataforma e entram na folha automaticamente — https://solides.com.br/llm/folha-digital-solides-fechamento-integrado-ao-ponto-e-a-admissao.html (oficial, snippet)
- Ponto digital; controle de faltas e atrasos; banco de horas; autoatendimento para funcionários; previsibilidade de caixa — https://solides.com.br/folhai/ (oficial, snippet)
- "A folha digital integra-se diretamente ao eSocial, automatizando o envio de informações trabalhistas" — https://solides.com.br/blog/folha-de-pagamento-e-esocial/ (fornecedor, blog)
- Não encontrado nas fontes lidas: 13º, férias como módulo próprio, rescisão, PLR, consignado, pensão, SST, benefícios como itens separados.

Gupy:
- Gupy Admissão: pré-colaborador faz a qualificação cadastral no eSocial e envia certificados na plataforma — https://gupy.io/blog/esocial-admissao (fornecedor, blog)
- Após aprovação do ATS, dados são enviados à admissão digital e, após conferência, injetados na folha — https://www.gupy.io/integracao/fluxo-admissao-sistema-folha (fornecedor)
- Conectores de folha: Metadados — https://www.gupy.io/integracao/folha-pagamento-metadados ; Senior — https://www.gupy.io/integracao/folha-pagamento-senior ; ADP via módulo eXpert Connection — https://www.gupy.io/integracao/folha-pagamento-adp (fornecedor)
- Para outros sistemas de folha, a integração exige desenvolvimento com middleware — https://www.gupy.io/integracao/fluxo-admissao-sistema-folha (fornecedor)
- Envio oficial ao eSocial depende de sistema de folha, segundo a Senior — https://www.senior.com.br/?p=813818 (concorrente, secundária)
- Gupy não tem folha de pagamento como módulo documentado nas fontes lidas.

Itens coletados: Solides 5, Gupy 5 (total 10).

---

## Não acessível / não encontrado (resumo)

- Odoo OCA: payroll addon não encontrado.
- Frappe HRMS: localização brasileira não encontrada.
- TOTVS: totvs.com/rh/folha-de-pagamento/ (HTTP 402) e tdn.totvs.com/display/public/LRM/FOP (HTTP 403) não lidos.
- Sankhya: sankhya.com.br/gestao-de-pessoas/ (HTTP 404).
- Fortes: fortes.com.br aponta para outra empresa (Cerâmica Fortes); site certo é fortestecnologia.com.br (lido só por snippet).
- Questor: questor.com.br não aberto; docs.questor.com.br com só título.
- Pontomais: não encontrado. Tangerino: erro de certificado TLS.
- Domínio: central de suporte não aberta.
- Alterdata: página comercial com módulos do Pack não encontrada.
- Convenia: eSocial, FGTS, consignado, 13º não aparecem no site oficial (aparecem só em blog e review).
- Muitas fontes TOTVS e Alterdata foram lidas só por snippet de busca, sem abrir a página completa.
