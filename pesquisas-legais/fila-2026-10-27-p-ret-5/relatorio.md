# Relatório de pesquisa legal — fila-2026-10-27-p-ret-5

**Pergunta:** P-RET-5: quais serviços contratados por salão ou clínica (limpeza, vigilância, recepção, manutenção) sofrem a retenção de 11% do INSS como cessão de mão de obra ou empreitada (Lei 8.212 art. 31; IN RFB 2.110/2022)?
**Aberto em:** 2026-10-27T02:20:27-03:00 · **Atualizado em:** 2026-10-27T02:33:30-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **Só os serviços das listas dos arts. 111 e 112 sofrem os 11%, e as listas são exaustivas** [D01 arts. 110 e 113]. Para salão e clínica, os que entram:
  - **por cessão de mão de obra ou por empreitada** (art. 111): limpeza, conservação ou zeladoria (I); vigilância ou segurança (II), exceto monitoramento eletrônico (p.ú.); construção civil, incluindo reforma (III);
  - **só por cessão de mão de obra** (art. 112): copa (VI); hotelaria, inclusive o atendimento a paciente em clínica (VII); treinamento e ensino (X); manutenção de instalações, máquinas ou equipamentos, só quando indispensável ao funcionamento regular e com equipe à disposição (XIV); portaria e recepção (XIX); secretaria e expediente (XXII); saúde, quando a contratada é empresa da área da saúde que atende pacientes (XXIII); telefonia e telemarketing (XXIV).
- **Cessão exige serviço contínuo e trabalhador à disposição, em caráter não eventual**, nas dependências da contratante ou de terceiros, com ou sem poder de direção [D01 art. 108 §§ 1º e 2º]. Recepcionista terceirizada fixa é cessão; manutenção de ar-condicionado por chamado avulso não é (falta a "equipe à disposição" do art. 112 XIV).
- **O que zera a retenção:** empreitada nas dependências da contratada (art. 114 VI); contratante pessoa física (114 IV); 11% da nota abaixo do mínimo do documento de arrecadação (115 I); contratada sem empregados, serviço pessoal do sócio e faturamento do mês anterior até 2 tetos do salário de contribuição, com declaração (115 II e § 1º); profissão regulamentada (médico, fisioterapeuta, enfermeiro, biomédico, nutricionista, psicólogo, fonoaudiólogo, terapeuta ocupacional, massagista e outros) prestada pessoalmente pelos sócios, sem empregados, com declaração ou menção na nota (115 III, §§ 2º e 3º).
- **Simples dos dois lados:** o salão do Simples que contrata é obrigado a reter (art. 133). O prestador do Simples só sofre retenção se for tributado pelo Anexo IV, que é o de construção, vigilância, limpeza, conservação e advocacia (arts. 164 § 1º e 166); os demais optantes não sofrem (art. 167, Súmula 425 do STJ).
- **Efeito no produto:** o `inss` do perfil de retenção fica decidível por regra, com quatro dados do cadastro do fornecedor, nenhum do contador: (1) qual dos 30 serviços (é a Tabela 06 da Reinf, `inssTpServico`, que reproduz os arts. 111 e 112; dossiê `fila-2026-10-27-bloco2-reinf` [D07]); (2) cessão (contínuo, gente à disposição) ou empreitada (preço por resultado, só art. 111); (3) se o prestador é do Simples, e em qual anexo; (4) se ele entregou declaração de dispensa (115 II ou III).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| O que é cessão | IN RFB 2.110 art. 108 § 1º II | [D01] | "serviços contínuos, aqueles que constituem necessidade permanente da contratante" |
| 11% do bruto | IN RFB 2.110 art. 110 | [D01] | "deverá reter 11% (onze por cento) do valor bruto da nota fiscal ou fatura" |
| Listas fechadas | IN RFB 2.110 art. 113 | [D01] | "São exaustivas as relações dos serviços sujeitos à retenção constantes dos arts. 111 e 112." |
| Manutenção | IN RFB 2.110 art. 112 XIV | [D01] | "desde que mantida equipe à disposição da contratante" |
| Saúde | IN RFB 2.110 art. 112 XXIII | [D01] | "quando prestados por empresas da área da saúde e direcionados ao atendimento de pacientes" |
| Dispensa por profissão regulamentada | IN RFB 2.110 art. 115 III | [D01] | "desde que prestados pessoalmente pelos sócios, sem o concurso de empregados ou de outros contribuintes individuais" |
| Prestador do Anexo IV retém | IN RFB 2.110 art. 166 | [D01] | "tributadas na forma do Anexo IV da Lei Complementar nº 123, de 2006, estão sujeitas à retenção" |
| Demais optantes não | IN RFB 2.110 art. 167 | [D01] | "exceto nos casos previstos no art. 166, não estão sujeitas à retenção" |
| Tomador do Simples retém | IN RFB 2.110 art. 133 | [D01] | "a empresa optante pelo Simples Nacional [...] estão obrigados a efetuar a retenção" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** a IN 2.110 não está no acervo (não aparece em `reguladores/rfb/instrucoes-normativas/2022` nem como `rfb-sijut-126687` em `reguladores/rfb/2022`). Foi lida na fonte oficial, visão "Vigente" do SIJUT, em 27/10/2026. O download automático [D01] trouxe só a casca JS; os trechos lidos estão em `docs/D01_in-rfb-2110-arts-108-115-133-164-168-navegador.txt`, com o SHA-256 do texto completo da página (`2829fdd2…d543`).
- **Redação atual:** a página lista alterações pelas IN RFB 2.185/2024, 2.289/2025 (redação nova do art. 114 e do p.ú. do art. 167) e 2.321/2026. Os arts. 108 a 113, 115, 133, 166 e o caput do 167 não têm marca de redação nova na visão vigente.
- **Norma mais específica:** prestadora optante pela CPRB tem retenção de 3,5% até 2027 (dossiê `fila-2026-10-27-p-ret-6-8`).

## 4. Ambiguidades (só o que precisa de decisão humana)
- Nenhuma de lei. Sobra um fato por contrato: se o serviço é contínuo e com gente à disposição (cessão) ou não. É dado do cadastro do fornecedor, que o usuário informa; o texto de ajuda pode citar o art. 108 § 1º. Não é pergunta ao contador.

## 5. Lacunas
- O "limite mínimo estabelecido pela RFB para recolhimento em documento de arrecadação" (art. 115 I) não foi lido aqui. O BRIEF usa R$ 10 para DARF (Lei 9.430 art. 68); falta conferir se vale para o DARF da DCTFWeb.
- O teto do salário de contribuição de 2026 (art. 115 II) não foi lido.
- O art. 168 foi transcrito só na alínea que separa os Anexos I, II, III e V do Anexo IV.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Normas — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=126687&visao=compilado>  
  Baixado em 2026-10-27T02:20:27-03:00 · arquivo local `docs/D01_link-action.html` · SHA-256 `9f9413e20884b24680269927744a2abbf407243127ba5087a1489fd91fc8153a`

## Registro de buscas
_Nenhuma busca registrada._
