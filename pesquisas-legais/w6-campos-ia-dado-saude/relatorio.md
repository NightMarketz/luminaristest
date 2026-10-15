# Relatório de pesquisa legal — w6-campos-ia-dado-saude

**Pergunta:** Assistente de IA que cria/sugere campos de cadastro (ex.: ficha clínica) que guardarão dado de saúde: o que a LGPD exige do sistema que desenha o campo (dado sensível, necessidade/minimização, RIPD)?
**Aberto em:** 2026-10-15T15:52:31-03:00 · **Atualizado em:** 2026-10-15T15:53:07-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
A LGPD não tem regra específica para o software que *desenha* um campo; ela regula o *tratamento*. Mesmo assim, três dispositivos alcançam o desenho:
(i) campo de ficha clínica que guarda dado "referente à saúde" vinculado a pessoa natural é **dado pessoal sensível** [D01] art. 5º, II;
(ii) o tratamento de dado sensível só pode ocorrer nas hipóteses fechadas do [D01] art. 11, e a escolha da hipótese cabe ao **controlador** (o salão ou a clínica, [D01] art. 5º, VI); o Luminaris trata em nome dele, como **operador** ([D01] art. 5º, VII);
(iii) as medidas de segurança "deverão ser observadas desde a fase de concepção do produto" ([D01] art. 46, §2º), e o tratamento se limita "ao mínimo necessário" ([D01] art. 6º, III).
Consequência de produto (inferida, não literal): a IA não deve acrescentar sozinha um campo de categoria sensível. O campo fica marcado, e o controlador confirma de forma explícita na tela.

## 2. Fundamentação
- [D01] art. 5º, II: definição de dado sensível (inclui saúde, vida sexual, genético, biométrico, origem racial, religião, opinião política, filiação).
- [D01] art. 5º, VI e VII: controlador × operador.
- [D01] art. 6º, III: necessidade (minimização).
- [D01] art. 11, caput e I: hipóteses fechadas; consentimento "específico e destacado".
- [D01] art. 38: a ANPD pode exigir RIPD, "inclusive de dados sensíveis".
- [D01] art. 46, caput e §2º: segurança desde a concepção.

## 3. Vigência
Texto compilado do Planalto, baixado em 2026-10-15, já com a redação da Lei nº 15.352/2026 (art. 5º, VIII). Os arts. 5º, 6º, 11, 38 e 46 citados não trazem alteração recente nesse texto.

## 4. Ambiguidades
- **A lei não obriga, em texto literal, a marcar um campo como sensível nem a pedir confirmação para criá-lo.** Isso é leitura do art. 46, §2º (privacy by design) junto com o art. 6º, III. Leitura A: é boa prática e fica a critério do produto. Leitura B: o operador que oferece um gerador de campos sem salvaguarda falha o §2º. A leitura mais segura é a B, que custa um flag e uma confirmação.
- **Consentimento do titular (art. 11, I) é problema do controlador, não do desenho do campo.** O produto pode, no máximo, oferecer o campo de registro do consentimento. Fica como achado fora de escopo.
- Pergunta exata ao advogado, se o dono quiser: "Como operador SaaS, temos obrigação de impedir ou sinalizar que o cliente crie, por assistente de IA, campos de dado de saúde dos clientes dele, ou isso é decisão exclusiva do controlador?"

## 5. Lacunas
Não há regulamento da ANPD consultado sobre padrões técnicos mínimos ([D01] art. 46, §1º). Não pesquisei se existe resolução vigente aplicável a SaaS operador.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** L13709compilado — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>  
  Baixado em 2026-10-15T15:52:32-03:00 · arquivo local `docs/D01_l13709compilado-htm.html` · SHA-256 `eb9d184db1ae20b741a7aac27a01a2e22c568f4ffe66c8f094074cd1fdbca7b3`

## Registro de buscas
_Nenhuma busca registrada._
