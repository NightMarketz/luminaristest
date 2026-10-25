# Relatório de pesquisa legal — iss-transicao-ibs-pr1

**Pergunta:** ISS-TRANSICAO-IBS PR-1: escala 10/20/30/40% do ISS 2029-2032, fim da LC 116 em 2033, máximo 5%, alíquotas de referência do IBS 2029-2032
**Aberto em:** 2026-10-24T17:12:22-03:00 · **Atualizado em:** 2026-10-24T17:23:41-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Os números do PR-1 vêm todos da lei, sem decisão humana pendente (verificado no Planalto compilado [D03], baixado em 24/10, e no acervo [D01]):

1. **Fator de redução do ISS:** 10% em 2029, 20% em 2030, 30% em 2031 e 40% em 2032, aplicado sobre a alíquota municipal vigente em 31/12/2028. Fonte: LC 116 art. 8º-B caput e incisos I–IV, incluído pela LC 214 art. 508 [D03]. Na tabela `ISS_TRANSICAO` isso vira 1000/2000/3000/4000 bp, com vigência de 01/01 a 31/12 de cada ano.
2. **Fim do ISS:** a LC 116 fica revogada a partir de 01/01/2033 (LC 214 art. 543 IV), com efeitos a partir dessa data (art. 544 V) [D03]. Por isso a linha `ISS_LIMITE/ALIQUOTA_MAX_BP` termina em 2032-12-31.
3. **Máximo de 5% de 2029 a 2032:** a LC 214 não altera o art. 8º II da LC 116 (5%) [D01]. O art. 508 só inclui o 8º-B [D03]. A linha continua com 500 bp até 2032-12-31 (F-ISS-2 a).
4. **IBS de 2029 a 2032:** as alíquotas de referência estadual e municipal são fixadas por resolução do Senado. A lei dá só o método: art. 361 (2029), 362 (2030), 363 (2031) e 364 (2032), com redação da LC 227/2026 [D03]. Sem número na lei, as 8 linhas UF/MUN nascem `DRAFT`, sem valor.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Redução 2029–2032 | LC 116 art. 8º-B caput (LC 214 art. 508) | [D03] | "as alíquotas do imposto serão reduzidas nas seguintes proporções das alíquotas previstas nas legislações dos Municípios ou do Distrito Federal, vigentes em 31 de dezembro de 2028" |
| Escala | art. 8º-B I–IV | [D03] | "I - 10% (dez por cento), em 2029; II - 20% (vinte por cento), em 2030; III - 30% (trinta por cento), em 2031; e IV - 40% (quarenta por cento), em 2032." |
| Revogação | LC 214 art. 543 IV | [D03] | "Ficam revogados a partir de 1º de janeiro de 2033: … IV - a Lei Complementar nº 116, de 31 de julho de 2003" |
| Efeitos | LC 214 art. 544 V e VI | [D03] | "V - a partir de 1º de janeiro de 2033, em relação aos arts. 518 e 543"; "VI - a partir de 1º de janeiro de 2026, em relação aos demais dispositivos." |
| Máximo 5% | LC 116 art. 8º II | [D01] | "II - demais serviços, 5% (cinco por cento)." |
| IBS 2029 | LC 214 art. 361 (red. LC 227/2026) | [D03] | "As alíquotas de referência estadual e municipal do IBS para 2029 serão fixadas com base na estimativa" |
| IBS 2032 | LC 214 art. 364 (red. LC 227/2026) | [D03] | "As alíquotas de referência estadual e municipal do IBS para 2032 serão fixadas com base na estimativa, para cada um dos anos-base de 2029 e 2030" |

## 3. Vigência conferida
- **LC 116 [D01]:** compilada, cópia de 13/10, sem alerta do `legal.py`. O art. 8º-B aparece só como "(Vide Lei Complementar nº 214, de 16/1/2025)", sem texto, e foi lido na LC 214 [D03]. Os arts. 8º II e 8º-A não têm marca de alteração.
- **LC 214 [D02]:** o acervo traz a republicação (alerta "não é texto compilado"). Foi resolvido no Planalto compilado [D03], baixado em 24/10, com as marcas da LC 227/2026. O art. 508 (8º-B), o art. 543 e o art. 544 V/VI não têm "Redação dada", "Incluído" nem "Vide" no trecho citado. Os arts. 361 a 364 têm a redação da LC 227/2026, que muda o método de cálculo da alíquota de referência, não a escala de 10–40% do ISS.
- O hash do [D03] mudou em relação ao do dossiê de 22/10 (`iss-transicao-ibs-2029`, `fbaed60b…` → `483daa05…`), mas o texto dos artigos citados é o mesmo do relatório de 22/10. A página do Planalto é regerada com frequência.
- **Regulamentação pendente:** as resoluções do Senado com as alíquotas de referência do IBS de 2029 a 2032 não existem. Por isso essas linhas ficam `DRAFT`.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma no PR-1. As ambiguidades da transição (piso de 2%, § 3º no Simples, pacote que cruza o ano) são as P-ISS-1..3 do BRIEF e do dossiê `iss-transicao-ibs-2029`. Elas travam só o PR-2 e seguem com o contador.

## 5. Lacunas
- As resoluções do Senado (arts. 361–364) ainda não foram editadas. Quando saírem, o operador publica as linhas pelo fluxo do LEGAL-PARAMS.
- O leiaute da DPS/NFS-e para 2029–2033 não foi lido. É assunto do PR-2 e do emissor, não deste PR.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 116 de 31/07/2003 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/ae234474cd3e1e3f6e871eaa102aeb862ec17541/federal/leis-complementares/2003/lcp-116-2003-07-31.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-24T17:12:28-03:00 · arquivo local `docs/D01_lcp-116-2003-07-31.md` · SHA-256 `ee5663cd6f75d06dc795b4b9b49b52e4a9d7ad9c2575d817375088a5ed3098b9`
- **[D02]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-10-24T17:12:32-03:00 · arquivo local `docs/D02_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-24T17:12:43-03:00 · arquivo local `docs/D03_lcp214-htm.html` · SHA-256 `483daa05ea28500a0557e1fa13c2cd90e18164651cb61cebe30dc51aab246d29`

## Registro de buscas
_Nenhuma busca registrada._
