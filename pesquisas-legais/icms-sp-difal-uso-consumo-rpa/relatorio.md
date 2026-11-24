# Relatório de pesquisa legal — icms-sp-difal-uso-consumo-rpa

**Pergunta:** Regra do DIFAL de ICMS do material de uso e consumo adquirido de outro estado por contribuinte do regime periódico de apuração (RPA) em SP: alíquota interestadual, base, apuração e prazo (Lei 6.374, RICMS/SP)
**Aberto em:** 2026-11-24T01:20:24-03:00 · **Atualizado em:** 2026-11-24T01:32:26-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Vale para o salão **contribuinte do ICMS** (inscrito, porque também revende) no **regime periódico de apuração (RPA)**, isto é, no Lucro Presumido ou no Real. Ele compra de outro estado um material de **uso e consumo** (tinta, luva, produto aplicado no serviço). O salão só de serviço, sem inscrição, não é contribuinte e não recolhe DIFAL; nesse caso o DIFAL fica com o remetente (dossiê `insumos-salao-sp`, fora deste PR).

1. **Fato gerador e o que se paga.** O fato gerador é a entrada em SP de mercadoria de outro estado, comprada por contribuinte e destinada a uso ou consumo [D05 RICMS art. 2º VI, red. Dec. 66.559/2022; D07 LC 87 art. 12 XV]. Paga-se a diferença entre a alíquota interna e a interestadual [D05 art. 2º § 5º; D07 art. 13 § 3º]. Grau: **verificado**.
2. **Alíquota interna (a de SP para a mercadoria).**
   - **18%** é a regra geral [D01 RICMS art. 52 I].
   - **25%** vale para perfumes e cosméticos das posições 3303, 3304, 3305 e 3307, salvo as exceções do próprio inciso: 3305.10 (xampu), 3307.20, 3307.10.0100, 3307.90.0500, antissolar e bronzeador [D01 art. 55 IV].

   Grau: **verificado**.
3. **Alíquota interestadual: a real da operação, que para SP é 12% ou 4%.**
   - A regra geral é **12%** [D08 Res. Senado 22/1989 art. 1º caput]. Os 7% do parágrafo único valem só para mercadoria que sai do Sul ou do Sudeste para o N, NE, CO ou ES. Para uma entrada em SP, qualquer que seja a origem, a interestadual é 12%.
   - Mercadoria importada do exterior paga **4%** [D09 Res. Senado 13/2012 art. 1º].

   Diferente do optante, o RPA não usa uma alíquota fixada pelo RICMS. Ele credita **"o valor do imposto pago em outro Estado"** [D06 art. 117 I], o ICMS destacado na nota, que em regra é 12% ou 4% do valor. Exceção: se o remetente for do Simples, o crédito é calculado a 12% (ou 4% para a mercadoria da Res. 13/2012), e não pelo valor da nota [D06 art. 117 §§ 5º e 6º]. Grau: **verificado** quanto aos textos. Que a entrada em SP não tenha 7% é **inferido** da leitura do art. 1º da Res. 22/1989.
4. **Base de cálculo: "por dentro" com a alíquota de SP (base dupla).**
   - A base é "o valor da operação sujeito ao imposto neste Estado" [D03 art. 37 VI].
   - Ela se forma com a **alíquota interna de SP** [D03 art. 37 § 11; D07 LC 87 art. 13 § 6º II].
   - O imposto integra a própria base, também na hipótese do art. 2º VI [D03 art. 49].

   A Sefaz-SP lê esses dispositivos em conjunto como uma "recomposição do valor da operação sujeito ao imposto neste Estado" pela alíquota interna [D10 RC 34252/2026 itens 10 e 14]. A fórmula operacional que sai disso é:
   - `base_SP = (valor − ICMS_origem) / (1 − alíq_interna)`
   - `DIFAL = base_SP × alíq_interna − ICMS_origem`

   Grau: **inferido**. A RC confirma a recomposição pela alíquota interna, mas não valida números: "meio impróprio para homologar ou validar os cálculos" [D11 item 19]. Ver a Ambiguidade 1.
5. **Apuração: dentro da conta mensal do ICMS, sem guia própria.** No mês da entrada, o salão no RPA lança no Registro de Apuração (EFD) [D06 art. 117 caput, I e II; § 1º]:
   - **crédito** do ICMS pago ao outro estado, com a expressão "Inciso I do Art. 117 do RICMS";
   - **débito** de alíquota interna × base_SP, com a expressão "Inciso II do Art. 117 do RICMS".

   O efeito líquido é o DIFAL. Ele entra no saldo do mês junto com o débito da revenda e os créditos das compras para revenda. As RC 33094/2026 e 34252/2026 [D11 ementa I; D10 item 9] mandam seguir exatamente esse procedimento. Há duas exceções, que pagam por guia de recolhimentos especiais: contribuinte em regime de **estimativa** e contribuinte **não obrigado à escrituração** [D06 art. 117 § 2º]. Grau: **verificado**.
6. **Prazo: o do saldo do ICMS do estabelecimento.** É o **CPR 1200, até o dia 20 do mês seguinte** à entrada, para o CNAE 96025 [D12 Anexo IV art. 2º VI e art. 3º V; art. 112]. Se o dia 20 cair sem expediente bancário, o prazo passa ao dia útil seguinte (RICMS art. 596 § 2º, dossiê `ricms-sp-art566-vencimento` deste PR). Grau: **inferido**. O art. 117 põe o DIFAL na apuração do período, e o saldo da apuração vence no CPR. Nenhum texto lido dá prazo próprio ao DIFAL do RPA.
7. **Custo, não crédito.** O ICMS do material de uso e consumo só dá crédito para entradas a partir de 1º/1/2033 [D07 LC 87 art. 33 I]. O DIFAL do RPA é custo do salão, como no Simples. O "crédito" do art. 117 I é só a técnica para chegar à diferença. Grau: **verificado**.

**Diferença para a regra do optante (RICMS art. 115 XV-A "a" [D02]), que é a que o simulador aplica hoje em todos os regimes:**

| | Optante do Simples (S, SR) | RPA (PR, RE) |
|---|---|---|
| Conta | "percentual correspondente à diferença entre a alíquota interna e a interestadual" × base [D02 XV-A "a"] | débito interno "por dentro" − ICMS pago na origem [D06 art. 117 I e II; D03 art. 37 § 11, art. 49] |
| Interestadual | fixa: 12%, ou 4% na Res. 13/2012 [D02 § 8º] | a paga na origem (12% ou 4% para SP) [D06 art. 117 I] |
| Onde | guia de recolhimentos especiais (GARE) à parte [D02 caput] | dentro da apuração mensal, compensando com créditos [D06 art. 117] |
| Prazo | último dia do 2º mês seguinte à entrada [D02 XV-A caput] | dia 20 do mês seguinte (CPR 1200) [D12] |

**Casos para o teste 20c**, com valor de R$ 1.000,00 na nota e a fórmula inferida do item 4:

| Mercadoria | Optante (por fora) | RPA (base dupla) |
|---|---|---|
| Cosmético a 25%, origem 12% | 1.000 × 13% = **130,00** | base 880 / 0,75 = 1.173,33; 293,33 − 120 = **173,33** |
| Cosmético a 25%, importado a 4% | 210,00 | base 1.280,00; 320 − 40 = **280,00** |
| Material a 18%, origem 12% | 60,00 | base 1.073,17; 193,17 − 120 = **73,17** |
| Material a 18%, importado a 4% | 140,00 | base 1.170,73; 210,73 − 40 = **170,73** |

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Fato gerador | RICMS/SP art. 2º VI | [D05] | "na entrada, no território deste Estado, de bem ou mercadoria oriunda de outro Estado ... adquirida por contribuinte do imposto e destinada a uso ou consumo" |
| Paga a diferença | RICMS/SP art. 2º § 5º | [D05] | "será devido a este Estado o imposto correspondente à diferença entre a alíquota interna e a alíquota interestadual" |
| Idem na LC | LC 87 art. 12 XV; art. 13 IX "b" e § 3º | [D07] | "o imposto a pagar ao Estado de destino será o valor correspondente à diferença entre a alíquota interna do Estado de destino e a interestadual" |
| Base no destino | RICMS/SP art. 37 VI | [D03] | "quanto às entradas aludidas no inciso VI, o valor da operação sujeito ao imposto neste Estado" |
| Alíquota interna forma a base | RICMS/SP art. 37 § 11; LC 87 art. 13 § 6º II | [D03], [D07] | "deverá ser utilizada a alíquota interna deste Estado para estabelecer a base de cálculo" |
| Imposto por dentro | RICMS/SP art. 49 | [D03] | "O montante do imposto, inclusive na hipótese dos incisos IV, VI, XIV, XVII e XVIII do artigo 2º, integra sua própria base de cálculo" |
| Recomposição pela interna | RC 34252/2026 itens 10 e 14 | [D10] | "esse é o percentual a considerar na recomposição do valor da operação sujeito ao imposto neste Estado" |
| Procedimento do RPA | RICMS/SP art. 117 caput, I, II | [D06] | "como crédito ... o valor do imposto pago em outro Estado" / "como débito ... o valor do imposto decorrente da aplicação da alíquota interna sobre a base de cálculo correspondente ao valor da operação ... sujeito ao imposto neste Estado, observado o disposto no artigo 49" |
| Remetente do Simples | RICMS/SP art. 117 §§ 5º e 6º | [D06] | "aplicação da alíquota interestadual sobre a base"; "4% ... Resolução do Senado Federal nº 13 ... 12% ... nas demais operações" |
| Exceções com guia | RICMS/SP art. 117 § 2º | [D06] | "enquadrado no regime de estimativa"; "não obrigado à escrituração fiscal" |
| Confirmação da Sefaz | RC 33094/2026 ementa I | [D11] | "devendo ser adotado o procedimento previsto no artigo 117, incisos I e II e § 1º, do RICMS/2000" |
| Interna 18% | RICMS/SP art. 52 I | [D01] | "nas operações ou prestações internas ... 18% (dezoito por cento)" |
| Interna 25% cosmético | RICMS/SP art. 55 IV | [D01] | "perfumes e cosméticos, classificados nas posições 3303, 3304, 3305 e 3307, exceto as posições 3305.10 e 3307.20 ..." |
| Interestadual 12% | Res. Senado 22/1989 art. 1º | [D08] | "nas operações e prestações interestaduais, será de doze por cento"; 7% só "realizadas nas Regiões Sul e Sudeste, destinadas às Regiões Norte, Nordeste e Centro-Oeste e ao Estado do Espírito Santo" |
| Interestadual 4% importado | Res. Senado 13/2012 art. 1º | [D09] | "nas operações interestaduais com bens e mercadorias importados do exterior, será de 4%" |
| Prazo do saldo | RICMS/SP Anexo IV art. 2º VI, art. 3º V | [D12] | "CPR 1200 - até o dia 20 do mês subseqüente ao da ocorrência do fato gerador"; CNAE "96025" no CPR 1200 |
| Regra do optante | RICMS/SP art. 115 XV-A "a" e § 8º | [D02] | "até o último dia do segundo mês subsequente ao da entrada"; "o valor resultante da multiplicação do percentual correspondente à diferença entre a alíquota interna e a interestadual pela base de cálculo" |
| Uso e consumo sem crédito | LC 87 art. 33 I | [D07] | "somente darão direito de crédito as mercadorias destinadas ao uso ou consumo do estabelecimento nele entradas a partir de 1º de janeiro de 2033" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:**
  - O RICMS/SP não está no acervo. Foi lido no portal oficial da Sefaz-SP [D01]–[D03], [D05], [D06], [D12], baixado hoje. As redações citadas são as vigentes na página, com as notas de "Redação dada".
  - A base dupla (art. 2º VI, art. 37 VI e § 11, art. 49, art. 117 II) é toda do Decreto 66.559/2022, em vigor desde 14/03/2022, que segue a LC 190/2022.
  - A Lei 6.374 do acervo [D04] veio como "atualizada", não compilada. Não foi usada como fonte de trecho: cada dispositivo citado tem o correspondente no RICMS oficial.
  - As Res. Senado 22/1989 [D08] e 13/2012 [D09] estão em versão original, sem revogação expressa. São textos curtos, sem alteração conhecida no artigo citado.
  - A LC 87 [D07] está compilada, sem alerta.
- **Redação atual:** as RC 33094/2026 e 34252/2026 [D11], [D10] são deste ano e aplicam o art. 117 vigente.

## 4. Ambiguidades (só o que precisa de decisão humana)
1. **A fórmula numérica da base dupla.** O texto diz "recomposição" pela alíquota interna [D10], mas nenhum ato lido traz a conta.
   - **Leitura (a), a adotada:** tira o ICMS da origem e embute a alíquota de SP: `(V − ICMS_origem)/(1 − aInt)`.
   - **Leitura (b):** embute a alíquota de SP sobre o valor cheio, sem tirar o ICMS da origem: `V/(1 − aInt)`. Dá DIFAL maior.

   A (a) é a que decorre da LC 87 art. 13 § 6º. A § 6º manda usar a interestadual para a base da origem e a interna para a do destino, o que pressupõe tirar uma e pôr a outra. A (a) é também a fórmula que o consulente da RC 33094 descreve ("retirar o ICMS interestadual da base, embutir ... a alíquota interna") [D11 item 5.3]. A Sefaz não a desmentiu, só não homologou números.
   - **Pergunta ao contador:** "Salão em SP no Lucro Presumido, contribuinte do ICMS, compra cosmético de MG por R$ 1.000 com 12% destacado, para uso no serviço. Pelo art. 117 II e o art. 37 § 11 do RICMS, o débito é 25% × (1.000 − 120)/0,75 = R$ 293,33, com DIFAL líquido de R$ 173,33?"
2. **Optante: base por fora.** Para o optante o dossiê `insumos-salao-sp` lê a base "por fora", com RC citadas lá. O § 11 do art. 37, porém, não distingue o regime do adquirente. Este dossiê não reabre essa conta. Se o motor quiser uma regra só, a pergunta vai ao contador: "O § 11 do art. 37 do RICMS (base dupla) alcança também o DIFAL do optante do art. 115 XV-A?"

## 5. Lacunas
- Nenhum texto dá prazo próprio ao DIFAL do RPA. O prazo é o do saldo da apuração (item 6), por inferência do art. 117.
- Não foi lida a regra de transição do ICMS para o IBS de 2029 a 2032. O motor precisa dela para os anos de transição, e ela fica fora deste dossiê.
- O dossiê `insumos-salao-sp` (relatório, item 2, "Alíquota interestadual da conta") diz que a interestadual real vinda do N/NE/CO/ES é 7%. Pela Res. Senado 22/1989 [D08], os 7% são da saída do S/SE para essas regiões. A entrada em SP é 12%. Para o optante a conta não muda, porque a alíquota é fixa (§ 8º), mas o texto daquele dossiê está errado. Registrado na caixa de lacunas.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** RICMS - Artigo 52 a 56 C
						
SEÇÃO II - DA ALÍQUOTA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art052.aspx>  
  Baixado em 2026-11-24T01:26:01-03:00 · arquivo local `docs/D01_art052-aspx.html` · SHA-256 `0ec3581720e55e1a169926c32a16ac6efa26dd2a647a786b33fcf9d3dcdf3252`
- **[D02]** RICMS - Artigo 115
						
SEÇÃO III - DO PAGAMENTO POR GUIA DE RECOLHIMENTOS ESPECIAIS — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art115.aspx>  
  Baixado em 2026-11-24T01:26:02-03:00 · arquivo local `docs/D02_art115-aspx.html` · SHA-256 `e44b136ff63143b8f722b9e76eac9b070a718ce51cbec543ec60a8750e5acdca`
- **[D03]** RICMS - Artigo 37 a 51
						
CAPÍTULO II - DO CÁLCULO DO IMPOSTO — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art037.aspx>  
  Baixado em 2026-11-24T01:26:04-03:00 · arquivo local `docs/D03_art037-aspx.html` · SHA-256 `d6a069fe6e264b5f5a36c650d98f5e03fef79f683ed77471c5c093c8e005c263`
- **[D04]** Lei nº 6.374, de 01/03/1989 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/a04d818af03dd02ec234f777e89fc809126702e5/estaduais/SP/leis-ordinarias/1989/lei-6374-1989-03-01-id25030.md>  
  Fonte oficial declarada: <https://www.al.sp.gov.br/norma/25030> · versao_texto: atualizada · cópia de 2026-10-13  
  Lido em 2026-11-24T01:26:07-03:00 · arquivo local `docs/D04_lei-6374-1989-03-01-id25030.md` · SHA-256 `419917e3106054a23498fa31fdd8030acc29517f69b657b4d108999b2cded724`  
  ⚠ versao_texto = 'atualizada' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ consta como revogada (situacao='Sem revogação expressa', revogada=false)
- **[D05]** RICMS - Artigo 1º a 4º
						
CAPÍTULO I - DA INCIDÊNCIA — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art001.aspx>  
  Baixado em 2026-11-24T01:26:18-03:00 · arquivo local `docs/D05_art001-aspx.html` · SHA-256 `83960f1c04ebb3aaae394b1fec521ba47e7a8838f41c80d0ab3d4d4a22a77109`
- **[D06]** RICMS - Artigo 116 a 118
						
SEÇÃO IV - OUTRAS FORMAS DE PAGAMENTO — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/art116.aspx>  
  Baixado em 2026-11-24T01:26:25-03:00 · arquivo local `docs/D06_art116-aspx.html` · SHA-256 `31d3b3e9f3cf31e41d96d5331382c39422fbc2fb72facff0938bed2e6ef22c2e`
- **[D07]** Lei Complementar nº 87 de 13/09/1996 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/0ee2fd30e01d0fb9cb3fb42d7ede8de312ea77e4/federal/leis-complementares/1996/lcp-87-1996-09-13.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:1996-09-13;87> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-11-24T01:29:25-03:00 · arquivo local `docs/D07_lcp-87-1996-09-13.md` · SHA-256 `9467cc843bf7020babf5400b56dbaadd1b7ee2464dc756c2ba1462afc72f43b8`
- **[D08]** Resolução nº 22, de 1989 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/resolucoes-senado/1989/rsf-22-1989-05-19.md>  
  Fonte oficial declarada: <https://www2.camara.leg.br/legin/fed/ressen/1989/resolucao-22-19-maio-1989-481183-publicacaooriginal-1-pl.html> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-11-24T01:29:36-03:00 · arquivo local `docs/D08_rsf-22-1989-05-19.md` · SHA-256 `d9ca5a31d845bbdf2c8e4b1b9bc107685dec953fd0b360997011fc89524907a4`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ consta como revogada (situacao='Não consta revogação expressa', revogada=false)
- **[D09]** Resolução nº 13, de 2012 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/6b9308d1da378562fa53395b5c2e9cd311bf86cc/federal/resolucoes-senado/2012/rsf-13-2012-04-25.md>  
  Fonte oficial declarada: <https://www2.camara.leg.br/legin/fed/ressen/2012/resolucao-13-25-abril-2012-612768-publicacaooriginal-135841-pl.html> · versao_texto: original · cópia de 2026-10-15  
  Lido em 2026-11-24T01:29:37-03:00 · arquivo local `docs/D09_rsf-13-2012-04-25.md` · SHA-256 `4b24e80069ebce6a595a10c63295c8fed8b539adc1f47a17a738ff48d621aa30`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)  
  ⚠ consta como revogada (situacao='Não consta revogação expressa', revogada=false)
- **[D10]** RC 34252/2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC34252_2026.aspx>  
  Baixado em 2026-11-24T01:30:17-03:00 · arquivo local `docs/D10_RC34252_2026-aspx.html` · SHA-256 `b5df2bc3e9d99baff10e15bb6ccde298bf3a529e64738a0714af192b1f13040f`
- **[D11]** RC 33094/2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC33094_2026.aspx>  
  Baixado em 2026-11-24T01:30:18-03:00 · arquivo local `docs/D11_RC33094_2026-aspx.html` · SHA-256 `62e268ab5596010420b36be7df9b120fdd49862652dd64a4a1e7c831adc89d18`
- **[D12]** RICMS - Anexo IV - Artigo 1º ao 3º
						
ANEXO IV - PRAZOS DE RECOLHIMENTO DO IMPOSTO — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/l6an4.aspx>  
  Baixado em 2026-11-24T01:30:56-03:00 · arquivo local `docs/D12_l6an4-aspx.html` · SHA-256 `323abf14c591d85b07ba981e167e160cc0815c85dfa1d0d04ff83bb95be3d83d`

## Registro de buscas
_Nenhuma busca registrada._
