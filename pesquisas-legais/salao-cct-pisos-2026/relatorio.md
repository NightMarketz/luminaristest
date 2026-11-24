# Relatório de pesquisa legal — salao-cct-pisos-2026

**Pergunta:** Qual é o piso salarial de 2026/2027 por função na CCT SP006651/2026 (salões de beleza, SP capital), cl. 4ª e 5ª, no texto de 2026 registrado no Mediador? Barbeiro e pedicure ficam em qual grupo de piso?
**Aberto em:** 2026-11-24T01:27:04-03:00 · **Atualizado em:** 2026-11-24T01:32:55-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Os pisos de 01/06/2026 a 31/05/2027 estão no termo aditivo SP009373/2026, cl. 4ª e 5ª.** A CCT principal SP006651/2026 traz
os de 2025/2026. A tabela de 2026 tem só três linhas [D01, cl. 4ª e 5ª]. Grau: **verificado** no texto do Mediador lido hoje,
igual byte a byte ao de 20/11 (o `legal.py` marcou a captura como `IGUAL` à do parecer D58).

| Linha da tabela (texto literal) | Sem REPIS (cl. 5ª) | Com REPIS (cl. 4ª) |
|---|---|---|
| "Demais Empregados (em funções distintas sem descrição nesta tabela)" | R$ 2.185,00 | R$ 1.875,00 |
| "Cabeleireiros, Manicures, Depiladores, Maquiladores, Esteticistas" | R$ 2.380,00 | R$ 1.900,00 |
| "Gerente" | R$ 2.805,00 | R$ 2.227,20 |

Os pisos são para 220 horas por mês e ficam fixos até 31/05/2027, salvo se o salário mínimo os passar [D01, cl. 4ª §§ 2º e
3º; cl. 5ª §§ 1º e 3º]. O prazo de adesão ao REPIS 2026/2027 terminou em 30/09/2026 [D01, cl. 3ª § 2º].

**Barbeiro e pedicure não aparecem em nenhuma linha.** O texto não os nomeia na tabela de 2026, nem na de 2025/2026 [D02]. A
leitura literal os põe em "Demais Empregados" (R$ 2.185,00, ou R$ 1.875,00 com REPIS), porque a linha diz "funções distintas
sem descrição nesta tabela" [D01]. Grau: **inferido**. Não há regra que os coloque na linha do cabeleireiro, e a leitura
contrária tem apoio (seção 4). **A página publicada (v50) usa R$ 2.380,00 para os dois** (`PISO_SR` e `PISO_CR` com
`barb` e `pedi` no grupo do cabeleireiro). Isso é a leitura conservadora, não a literal.

**Comparação com 2025/2026** [D02, cl. 4ª e 5ª, de 01/06/2025 a 31/05/2026]. A tabela tinha oito linhas: auxiliares,
consultores de beleza, administrativos, manicures, depiladores e maquiladores, cabeleireiros e esteticistas, e gerente. Em 2026
o aditivo juntou tudo em três. As linhas de auxiliares e administrativos passaram para "Demais".

| Função | 2025/2026 sem REPIS [D02] | 2026/2027 sem REPIS [D01] |
|---|---|---|
| Demais / auxiliares / recepção | R$ 2.051,47 a R$ 2.060,58 | R$ 2.185,00 |
| Manicures; depiladores e maquiladores | R$ 2.097,48 | R$ 2.380,00 |
| Cabeleireiros, esteticistas | R$ 2.253,97 | R$ 2.380,00 |
| Gerente | R$ 2.646,31 | R$ 2.805,00 |

**Nenhuma outra convenção cobre barbeiro ou pedicure em SP.** A busca no Mediador de hoje, só com instrumentos vigentes e
registrados em SP, deu este resultado [D03]:
- por categoria "barbeiro" e por "pedicure": a SP006651/2026, a SP003636/2026 (estética) e convenções de outros setores
  (limpeza urbana; saúde em Piracicaba);
- termos aditivos com "cabeleireiro" ou "barbeiro": só o SP009373/2026 é deste setor.
Não há aditivo de pisos depois do SP009373/2026.

## 2. Fundamentação
| Ponto | Norma (cláusula) | Fonte | Trecho literal |
|---|---|---|---|
| Vigência do aditivo | Aditivo SP009373/2026 cl. 1ª | [D01] | "vigência do presente Termo Aditivo … no período de 01º de junho de 2026 a 31 de maio de 2027" |
| Piso sem REPIS | Aditivo cl. 5ª | [D01] | "Demais Empregados (em funções distintas sem descrição nesta tabela) R$ 2.185,00 / Cabeleireiros, Manicures, Depiladores, Maquiladores, Esteticistas R$ 2.380,00 / Gerente R$ 2.805,00" |
| Piso com REPIS | Aditivo cl. 4ª | [D01] | "… R$ 1.875,00 / … R$ 1.900,00 / Gerente R$ 2.227,20" |
| Jornada do piso | Aditivo cl. 5ª § 3º | [D01] | "estabelecidos para jornada de trabalho de 220 (duzentos e vinte) horas mensais" |
| Ninguém abaixo do piso | Aditivo cl. 5ª § 2º | [D01] | "Nenhum trabalhador da categoria profissional poderá perceber Salário inferior ao Piso Normativo … salvo às empresas enquadradas no regime especial de piso salarial (REPIS)" |
| Prazo do REPIS | Aditivo cl. 3ª § 2º | [D01] | "O PRAZO para as empresas aderirem ao REPIS 2026/2027 se encerrará no dia 30 DE SETEMBRO DE 2026" |
| Categoria em SP capital | Aditivo cl. 2ª; CCT cl. 2ª | [D01], [D02] | "Empregados em Institutos de Beleza e Cabeleireiros de Senhoras (Cabeleireiros, Manicures, Esteticistas, Maquiladores, Depiladores Ajudantes, Copeiros, Faxineiros Caixas, Gerentes e Recepcionistas) nos municípios de … São Paulo …" |
| Barbeiro e pedicure nomeados só na Baixada | Aditivo cl. 2ª | [D01] | "e a categoria profissional de: Cabeleireiro, Barbeiro, Esteticista, Manicure, Pedicure, Depilador e Maquiador, nos termos da Lei nº 12.592 … nos municípios de Bertioga, Cubatão, Guarujá, Itanhaém, Mongaguá, Peruíbe, Praia Grande, Santos e São Vicente" |
| Patronal inclui barbearias | Partes | [D01] | "SIND PATRONAL DOS INST E SALOES DE BEL, CABEL DE SENHORAS, CABEL UNISSEX, BARB, SALOES -PARCEIROS …" |
| As sete profissões da lei | Lei 12.592 art. 1º | [D04] | "Cabeleireiro, Barbeiro, Esteticista, Manicure, Pedicure, Depilador e Maquiador" |
| Pisos de 2025/2026 | CCT SP006651/2026 cl. 4ª e 5ª | [D02] | "A partir de 1.º de junho de 2025 … Cabeleireiros, Esteticistas R$ 2.253,97 … Gerente R$ 2.646,31" |

## 3. Vigência conferida
- **Instrumento de 2026.** É o aditivo SP009373/2026 (registro em 30/09/2026), vigente de 01/06/2026 a 31/05/2027 [D01]. A CCT
  principal (registro em 21/07/2026) vale de 01/06/2025 a 31/05/2027, e suas cláusulas que o aditivo não trocou continuam
  [D02]. O "D56 do parecer" é essa CCT principal, com os pisos de 2025/2026. Os de 2026 já estavam certos no parecer (§1.12,
  [D58] dele) e conferem com [D01].
- **Texto mudou desde 20/11?** Não. O `legal.py` comparou o texto das duas capturas: [D01] é `IGUAL` ao parecer D58 e
  [D02] é igual ao parecer D56 (sem diferença no `diff` dos `.txt`).
- **Aditivo posterior.** Nenhum registrado até 24/11/2026 [D03].

## 4. Ambiguidades (só o que precisa de decisão humana)
**A1. Barbeiro e pedicure: "Demais Empregados" (R$ 2.185) ou a linha do cabeleireiro e da manicure (R$ 2.380)?**
- **Leitura (i), literal:** a tabela lista cinco funções e manda o resto para "Demais, em funções distintas sem descrição"
  [D01]. O piso mínimo do barbeiro e da pedicure empregados é R$ 2.185,00 (R$ 1.875,00 com REPIS). Efeito no produto: o
  alerta "abaixo do piso" só aparece abaixo de R$ 2.185, e o custo mínimo da equipe é menor.
- **Leitura (ii), por similaridade:** barbeiro faz o mesmo serviço do cabeleireiro, e pedicure faz o da manicure. A Lei
  12.592 trata as sete profissões juntas [D04, art. 1º], e o quadro do art. 577 da CLT põe "Oficiais, barbeiros, cabeleireiros
  e similares" no mesmo grupo profissional (dossiê `salao-fpas-515` [D01]). Efeito: o piso é R$ 2.380,00, e é o que a página
  já usa.
- **O que as fontes omitem:** a CCT não define as funções nem diz como enquadrar quem não está na tabela, além do "Demais".
  Nenhuma das duas cita barbeiro ou pedicure para SP capital.
- **Leitura mais segura para o salão: (ii).** Pagar R$ 2.380 cumpre as duas leituras. Pagar R$ 2.185 só cumpre a (i) e abre
  risco de diferença salarial se um juiz equiparar a função à do cabeleireiro ou da manicure. Para o simulador, a (ii) avisa
  mais cedo.
- **No motor (kit setorial, F-SIM-6):** guardar a tabela literal de três linhas e um mapa função → linha, com barbeiro e
  pedicure na linha do cabeleireiro e da manicure, marcados "leitura conservadora (I)". A ficha mostra a nota: "a CCT não
  nomeia barbeiro e pedicure; o piso literal é o de Demais, R$ 2.185".
- **Pergunta exata ao contador ou ao sindicato** (opcional; a leitura segura não depende da resposta): *"Na CCT SP006651/2026
  e no aditivo SP009373/2026, o barbeiro e a pedicure empregados em São Paulo capital recebem o piso de 'Cabeleireiros,
  Manicures, Depiladores, Maquiladores, Esteticistas' (R$ 2.380,00) ou o de 'Demais Empregados' (R$ 2.185,00)?"*

## 5. Lacunas
- A CCT não traz o rol de funções de "Demais" nem uma definição de cada função. Não há outra fonte oficial que resolva a A1.
- A página está congelada (F-SIM-8) e usa a leitura (ii). Ela não precisa mudar. O mapa função → linha da seção 4 vai ao
  motor pelo item 19 do BRIEF de grupo, como requisito da lacuna f88e.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Mediador - Extrato Termo Aditivo de Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR060354%2F2026>  
  Baixado em 2026-11-24T01:27:06-03:00 · arquivo local `docs/D01_ResumoVisualizar.html` · SHA-256 `4cffc1b6614ca07abb662323161534275c85aa9dc79efd02a3983ad5acd943f6`
- **[D02]** Mediador - Extrato Convenção Coletiva — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/Resumo/ResumoVisualizar?NrSolicitacao=MR008673%2F2026>  
  Baixado em 2026-11-24T01:27:07-03:00 · arquivo local `docs/D02_ResumoVisualizar.html` · SHA-256 `fb294bbe5afb49233d701cd8fc6fe06c52fb5aa5f685c03ebf0a8ebf35ad02b6`
- **[D03]** Mediador (MTE) — Consultar Instrumentos Coletivos Registrados: buscas por categoria 'barbeiro' e 'pedicure' (convenções) e 'cabeleireiro'/'barbeiro' (termos aditivos), UF SP, vigentes, em 24/11/2026 — Órgãos federais (MTE - Mediador)  
  Link oficial: <https://mediador.trabalho.gov.br/sistemas/mediador/ConsultarInstColetivo>  
  Baixado em 2026-11-24T01:30:39-03:00 · arquivo local `docs/D03_mediador-busca-sp-vigentes-navegador.txt` · SHA-256 `97f8262cb524aaf70d28a1fb9192512a16157f691edeb5026f47ccf805e9ccb2`  
  ⚠ resultado das buscas lido no navegador embutido (innerText do bloco 'Resultado:'), espaços em branco normalizados; o SHA-256 foi calculado no navegador sobre o mesmo texto e conferido
- **[D04]** Lei nº 12.592 de 18/01/2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a31cf3cd12073c7b195933a53e733b85c00cfe02/federal/leis-ordinarias/2012/lei-12592-2012-01-18.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-18;12592> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:32:03-03:00 · arquivo local `docs/D04_lei-12592-2012-01-18.md` · SHA-256 `ae4c4aae44ba1bd08493c05fd82e366cdd2f3bf263b93383f93b1f936541fd00`

## Registro de buscas
_Nenhuma busca registrada._
