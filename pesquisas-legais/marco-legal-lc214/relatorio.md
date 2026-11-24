# Relatório de pesquisa legal — marco-legal-lc214

**Pergunta:** Datas: art. 517 LC214 (RBT12 Simples a partir de 2027-01) e artigo que fundamenta principal/acessorio 2027-01-01
**Aberto em:** 2026-11-24T09:10:59-03:00 · **Atualizado em:** 2026-11-24T09:24:51-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **#10 (confirmado):** a redação da LC 123 art. 18 § 1º que conta o RBT12 pelos "doze meses antecedentes ao mês anterior ao do período de apuração" é dada pela LC 214/2025 **art. 517** [D02] e produz efeitos **a partir de 01/01/2027** pelo **art. 544 III** [D02] (redação da LC 227/2026, que mantém o art. 517 na lista). Marco = `2027-01-01` → linha `MARCO_LEGAL/INICIO_LC214_RBT12`.
- **#11 (NÃO confirmado):** o art. 7º II e § 2º da LC 214 (acessório = "condição ou meio" do principal) existe [D02], mas **nenhum artigo fixa 2027-01-01 para ele**: o art. 544 não o lista nos incisos I–V, então vale o inciso VI (efeitos desde 01/01/2026). O 2027 do código é decisão de produto (BRIEF/ADR EFICIENCIA-FISCAL, I-7), sem norma citável. Fica em código; lacuna na caixa (fork do dono).

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Janela do RBT12 | LC 214 art. 517 → LC 123 art. 18 § 1º | [D02] | "o sujeito passivo utilizará a receita bruta acumulada nos doze meses antecedentes ao mês anterior ao do período de apuração" |
| Efeitos 2027 | LC 214 art. 544 III | [D02] | "a partir de 1º de janeiro de 2027, em relação aos arts. 450, exceto os §§ 1º e 5º, 461, 467, 499, 500, 502, 504 a 507, 509 a 515, 517, 519 a 534 e 542" |
| Demais dispositivos | LC 214 art. 544 VI | [D02] | "a partir de 1º de janeiro de 2026, em relação aos demais dispositivos" |
| Principal/acessório | LC 214 art. 7º II e § 2º | [D02] | "algum dos fornecimentos puder ser considerado principal e os demais seus acessórios" |

## 3. Vigência conferida
- Alerta do acervo: [D01] é só a republicação (versao_texto = republicação/retificação). Resolvido lendo o texto no Planalto [D02], baixado em 24/11/2026 (sha256 f352e0ad…ddfe90).
- Redação atual: art. 544 III com redação da LC 227/2026 (marcado no texto do Planalto); o art. 517 permanece na lista.
- Regulamentação pendente: nenhuma lida que altere a data.

## 4. Ambiguidades (só o que precisa de decisão humana)
- Data de `PRINCIPAL_ACESSORIO_DESDE`: (a) 2027-01-01 como decisão de produto do dono, (b) 2026-01-01 pela lei (art. 544 VI), (c) manter literal. Leitura mais segura para o contribuinte: depende do contador (IBS/CBS só se exigem em 2027, mas a norma de classificação vale desde 2026). Pergunta ao contador: "o art. 7º II da LC 214 já se aplica a fornecimentos de 2026 para fins de classificação, mesmo que IBS/CBS só sejam cobrados em 2027?".

## 5. Lacunas
- Res. CGSN 190/2026 art. 9º (2% no mês seguinte ao início; efeitos 01/01/2027) não está no acervo e não foi relida nesta pesquisa.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei Complementar nº 214 de 16/01/2025 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/571468687b4dc8d8f1a3b1dbd5f958ff85fad0cf/federal/leis-complementares/2025/lcp-214-2025-01-16.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2025-01-16;214> · versao_texto: republicação/retificação · cópia de 2026-10-13  
  Lido em 2026-11-24T09:11:04-03:00 · arquivo local `docs/D01_lcp-214-2025-01-16.md` · SHA-256 `f1f80d77a11f96d8eaf7777d647e577d04abd0fc28420ec22664be7a76ed8851`  
  ⚠ versao_texto = 'republicação/retificação' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-11-24T09:11:09-03:00 · arquivo local `docs/D02_lcp214-htm.html` · SHA-256 `f352e0adf358fbdcf82a10b57b7ddb22d3be19197d816605402e617e8bddfe90`

## Registro de buscas
_Nenhuma busca registrada._
