# Relatório de pesquisa legal — fila-2026-10-27-bloco5-cclasstrib

**Pergunta:** Bloco 5 da fila: cClassTrib vigente (IT 2025.002, versão em vigor em 27/10/2026) para os serviços de salão (6.01-6.03) e de clínica (4.01, consulta médica): confirmar 000001 (CST 000) e o código de redução de 60% (CST 200) em fonte oficial
**Aberto em:** 2026-10-27T11:30:31-03:00 · **Atualizado em:** 2026-10-27T11:41:38-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
- **O cClassTrib que o contador deu em 10/10 está certo para o salão: 000001, CST 000, tributação integral.**
  - A tabela oficial está publicada no Portal da Conformidade Fácil, do SVRS [D01]. A página traz a tabela inteira em JSON, com extrato em `docs/D01_cclasstrib-trechos.txt`.
  - O 000001 é "Situações tributadas integralmente pelo IBS e CBS.", sem redução, com uso permitido na NFS-e, na NF-e e na NFC-e. Vale desde 05/05/2025, sem data de fim.
  - Os serviços do salão (cabeleireiro, manicure, estética: NBS 1.2602) não estão em nenhum anexo de redução da LC 214: não constam do Anexo III [D02], e a esteticista não está na lista do art. 127 (redução de 30%) [D02].
- **Para a clínica, a consulta e o procedimento médico levam 200029, CST 200, com redução de 60% no IBS e na CBS** [D01]. É o "Fornecimento dos serviços de saúde humana (Anexo III)", e a tabela indica o art. 130 da LC 214.
  - O Anexo III inclui "Serviços de clínica médica" (NBS 1.2301.21.00) e "Serviços médicos especializados" (1.2301.22.00) [D02].
  - É o mesmo NBS que o dossiê `ctribnac-salao-clinica` atribuiu ao procedimento médico (código de tributação nacional 040101).
- **Versão vigente:** a tabela do SVRS tem linhas com data de publicação de 22/06/2026 (v1.60) e de 01/10/2026; a carga mais recente é de 05/10/2026 [D01]. Ela já inclui as linhas da v1.70 que a pista de mercado citava (000006, 200055 e 200056, "realizado por autônomo").
  - Nenhuma dessas linhas novas se aplica ao salão PJ.
  - O código 000006 seria o do profissional-parceiro autônomo que emita nota própria. Ele não é o emissor no Luminaris.
- **Efeito:** o cClassTrib deixa de ser "dado secundário" no D1f. As linhas `DRAFT` do F-IBS-10 podem sair do DRAFT com:
  - 000001 / CST 000 para os serviços 6.01, 6.02 e 6.03;
  - 200029 / CST 200 para os serviços médicos com NBS do Anexo III.
  - A linha DRAFT continua só para o que não for nenhum desses dois.

## 2. Fundamentação
| Ponto | Norma | Fonte | Trecho literal |
|---|---|---|---|
| Código do salão | Tabela cClassTrib (SVRS) | [D01] | "000001 \| 000 \| Situações tributadas integralmente pelo IBS e CBS. \| 0.0 \| 0.0 \| True" (redução IBS, redução CBS, NFS-e) |
| Código da saúde | idem | [D01] | "200029 \| 200 \| Fornecimento dos serviços de saúde humana (Anexo III) \| 60.0 \| 60.0 \| True" |
| Redução de 60% | LC 214, art. 130 | [D02] | "Ficam reduzidas em 60% (sessenta por cento) as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos serviços de saúde relacionados no Anexo III" |
| Médico no Anexo III | LC 214, Anexo III, itens 7 e 8 | [D02] | "7 Serviços de clínica médica 1.2301.21.00 8 Serviços médicos especializados 1.2301.22.00" |
| Esteticista fora dos 30% | LC 214, art. 127 | [D02] | "submetidas à fiscalização por conselho profissional: I - administradores; [...] XVIII - técnicos agrícolas" (a esteticista não consta) |

## 3. Vigência conferida
- **Alerta resolvido:** a dúvida de 24/10 era a ausência da tabela v1.50 ou posterior em domínio oficial. Agora a tabela vigente foi lida no SVRS, que é o portal oficial de DF-e. Ela tem publicação até 01/10/2026 e carga de 05/10/2026.
- A LC 214 [D02] é a compilada do Planalto, com a LC 227/2026 incorporada.
- A página do Portal NF-e com a lista de Informes Técnicos devolveu um redirecionamento em laço ao `legal.py`, e não foi lida. O PDF da IT 2025.002 v1.70 não foi baixado.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Procedimento estético feito por médico (toxina, preenchimento).** O 200029 vale para o serviço do Anexo III identificado pelo NBS.
  - Se o médico classificar o procedimento como 1.2301.22.00 (médicos especializados), a redução de 60% se aplica.
  - Se o procedimento for puramente cosmético, a Receita pode discutir que não é "serviço de saúde".
  - Leitura segura: o produto sugere o 200029 só para serviço com NBS do Anexo III marcado pela clínica, e mostra o risco no texto de ajuda.
  - A classificação de cada procedimento é do cliente, com o contador, e já está no dossiê `ctribnac-salao-clinica`, §4.

## 5. Lacunas
- PDF da IT 2025.002 v1.70 no Portal NF-e, não lido (redirecionamento em laço).
- O indicador de operação (indOp 030101) que o contador deu com o 000001 não foi conferido: é outra tabela, fora deste bloco.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Portal da Conformidade Fácil — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://dfe-portal.svrs.rs.gov.br/DFE/ClassificacaoTributaria>  
  Baixado em 2026-10-27T11:30:37-03:00 · arquivo local `docs/D01_ClassificacaoTributaria.html` · SHA-256 `0c2d7b19379f605e9d9a98b1045984e2da8c2ce7a57ba677e4057b401207cace`
- **[D02]** Lcp 214 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm>  
  Baixado em 2026-10-27T11:32:48-03:00 · arquivo local `docs/D02_lcp214-htm.html` · SHA-256 `f263c67b4ce6b975183450009b98882cff7c22d7d31a5bc341de48e303b870c3`

## Registro de buscas
_Nenhuma busca registrada._
