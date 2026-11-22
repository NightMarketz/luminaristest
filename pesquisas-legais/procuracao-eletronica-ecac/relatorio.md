# Relatório de pesquisa legal — procuracao-eletronica-ecac

**Pergunta:** Procuração eletrônica no e-CAC (IN RFB vigente): o procurador pode transmitir declarações e emitir guias em nome do outorgante pelo Integra Contador? Validade, substabelecimento, serviços
**Aberto em:** 2026-11-22T00:10:48-03:00 · **Atualizado em:** 2026-11-22T00:12:27-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O que vale hoje é a **IN RFB nº 2.320/2026** [D03], publicada no DOU de 09/04/2026 e vigente na fonte. Ela revogou a IN
2.066/2022 [D02], que já tinha revogado a 1.751/2017. Pontos que entram no desenho:
1. A "procuração eletrônica" agora se chama **autorização de acesso**. Ela *"tem os mesmos efeitos de uma procuração"*
   (art. 6º p.ú.) e é concedida e cancelada **só pelo próprio usuário, na internet** (art. 7º I; art. 12).
2. O representante pode praticar os **atos relativos a confissões** (art. 7º § 1º II). Então o escritório procurador
   pode transmitir o PGDAS-D e encerrar o MIT pelo cliente.
3. A autorização lista **com exatidão** os serviços (art. 7º § 1º I) e vale **no máximo cinco anos** (art. 7º § 1º
   IV). O **substabelecimento é vedado** (art. 8º § 3º).
4. **O art. 13 veda automatizar a outorga, a alteração ou a revogação** da autorização por qualquer sistema de terceiros.
   O § 1º inclui *"interfaces de programação não oficializadas"*. O Luminaris **nunca** cria nem cancela a autorização:
   só orienta o cliente e lê o resultado pelo serviço oficial (`OBTERPROCURACAO41` do Integra Contador).
5. A Cogea pode fixar em ato próprio um **número máximo de autorizações por representante** (art. 15). Isso pode
   limitar o escritório com muitos clientes.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| efeito de procuração | IN 2.320/2026 art. 6º p.ú. | [D03] | "A autorização de acesso tem os mesmos efeitos de uma procuração" |
| confissão pelo representante | art. 7º § 1º II | [D03] | "os atos relativos a confissões ou desistências" |
| serviços exatos; 5 anos | art. 7º § 1º I e IV | [D03] | "estabelecerá, com exatidão, os serviços autorizados" |
| sem substabelecimento | art. 8º § 3º | [D03] | "É vedado o substabelecimento da autorização de acesso." |
| só o usuário emite e cancela | art. 12 | [D03] | "emitida e cancelada pelo usuário exclusivamente pela internet" |
| automação da outorga vedada | art. 13 caput e § 1º | [D03] | "interfaces de programação não oficializadas" |
| limite por representante | art. 15 | [D03] | "número máximo de autorizações de acesso ativas" |

## 3. Vigência conferida
- A norma não está no acervo `ctresb/leis` (as IN RFB ficam fora dele). Foi lida direto na fonte oficial, o Sijut
  (visão multivigente, situação "vigente").
- [D02], a IN 2.066/2022, aparece como **revogada** pela IN 2.320, de 06/04/2026, com vigência desde 09/04/2026.
- [D01] veio por engano: `rfb:2066` é o id interno do Sijut, não o número do ato. É o Ato Declaratório SRF 55/2000, que
  não é usado aqui.
- Uma anotação na visão multivigente da [D03] foi conferida: nenhuma redação dada nem agendamento nos artigos citados.

## 4. Ambiguidades
- **O art. 13 alcança o Integra Contador?** Leitura 1: não alcança, porque o art. 13 trata do *sistema das
  autorizações de acesso*, e a API do Serpro é a interface oficializada. Leitura 2: o "acesso intermediado" do § 1º
  vale para qualquer serviço digital. O caput restringe a "outorga, alteração ou revogação", então a leitura 1 é a do
  texto. **Mais segura:** não automatizar nada na outorga e só consumir a API oficial.

## 5. Lacunas
- O ato da Cogea do art. 15 (limite de autorizações por representante) não foi procurado.
- O vínculo entre os códigos de procuração do Serpro (`00146`, `00103`…) e a nomenclatura de serviço da autorização de
  acesso da IN 2.320 é inferido: a documentação do Serpro ainda fala em "procuração eletrônica do e-CAC".
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Ato Declaratório SRF nº 55, de 18 de julho de 2000 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/2066/visao/multivigente>  
  Baixado em 2026-11-22T00:10:48-03:00 · arquivo local `docs/D01_rfb-2066-multivigente.json` · SHA-256 `a17e106e48e5cfc3f68e57d42bbaabf52dddd2a75991f45595d6c07558de4858`
- **[D02]** Instrução Normativa RFB nº 2066, de 24 de fevereiro de 2022 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/123085/visao/multivigente>  
  Baixado em 2026-11-22T00:11:12-03:00 · arquivo local `docs/D02_rfb-123085-multivigente.json` · SHA-256 `9e563af6a384a514ed6d076d7503ea2e83d3792c14d35a48df2bf3c6f5abcc07`  
  ⚠ o ato consta como NÃO VIGENTE na fonte (revogado ou sem efeito)
- **[D03]** Instrução Normativa RFB nº 2320, de 6 de abril de 2026 — Receita Federal - Sistema Normas (API)  
  Link oficial: <https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/150461/visao/multivigente>  
  Baixado em 2026-11-22T00:11:26-03:00 · arquivo local `docs/D03_rfb-150461-multivigente.json` · SHA-256 `771bb41d6a1273470e873be256382fdd4ee29308b4076ca6256ad53b4eca41a3`

## Registro de buscas
_Nenhuma busca registrada._
