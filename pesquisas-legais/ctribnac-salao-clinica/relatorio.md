# Relatório de pesquisa legal — ctribnac-salao-clinica

**Pergunta:** cTribNac (lista nacional NFS-e) e cNBS de cada serviço do preset do salão de beleza e da clínica estética
**Aberto em:** 2026-10-13T01:23:34-03:00 · **Atualizado em:** 2026-10-13T01:28:37-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O enquadramento legal dos serviços do setor tem resposta direta na LC 116/2003 [D02] e na Lista de Serviço Nacional
+ NBS 2.0 do Sistema Nacional NFS-e (Anexo B v1.01, 22/01/2026) [D01]. O SHA-256 bate com o do MANIFEST do repo
(`e74b0be8ad20`).

| Serviço típico | Subitem LC 116 [D02] | `cTribNac` [D01] | NBS 2.0 [D01] | `cNBS` (9 díg.) |
|---|---|---|---|---|
| Corte, escova, coloração, barba (cabeleireiro/barbeiro) | 6.01 "Barbearia, cabeleireiros, manicuros, pedicuros e congêneres" | **060101** | 1.2602.10.00 cabeleireiros e barbeiros | 126021000 |
| Manicure, pedicure | 6.01 | **060101** | 1.2602.20.00 manicure, pedicure e tratamento cosmético | 126022000 |
| Estética, limpeza de pele, depilação | 6.02 "Esteticistas, tratamento de pele, depilação e congêneres" | **060201** | 1.2602.20.00 (tratamento cosmético) | 126022000 |
| Massagem, banho, sauna | 6.03 "Banhos, duchas, sauna, massagens e congêneres" | **060301** | 1.2602.30.00 bem-estar físico | 126023000 |
| Centro de emagrecimento, spa | 6.05 | **060501** | 1.2602.90.00 | 126029000 |
| Procedimento médico em clínica (toxina, preenchimento por médico) | 4.01 "Medicina e biomedicina" | **040101** (medicina) / 040102 (biomedicina) | 1.2301.22.00 médicos especializados | 123012200 |

**Achado de desenho (não é de lei):** o preset não tem lista fixa de serviços. A tabela `services` é preenchida pelo
usuário, a `category` é texto livre (`ServiceModule.ts:28-33`) e o `serviceRef` do `ServiceFiscalProfile` é a linha
do tenant (`ServiceFiscalProfileService.ts:28-31`). Por isso **não existe `serviceRef` estável** para o
`serviceFiscalDefaults` do kit apontar. O conteúdo acima é o dado; onde ele entra é o fork F-KE-3 da emenda do KIT.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Cabeleireiro/manicure | LC 116 lista, 6.01 | [D02] | "Barbearia, cabeleireiros, manicuros, pedicuros e congêneres." |
| Estética | LC 116 lista, 6.02 | [D02] | "Esteticistas, tratamento de pele, depilação e congêneres." |
| Massagem | LC 116 lista, 6.03 | [D02] | "Banhos, duchas, sauna, massagens e congêneres." |
| Medicina | LC 116 lista, 4.01 | [D02] | "Medicina e biomedicina." |
| Códigos nacionais | Anexo B, aba LISTA.SERV.NAC. | [D01] | 60101 / 60201 / 60301 / 60501 / 40101 / 40102 |
| NBS | Anexo B, aba LISTA.NBS_v2.0 | [D01] | 1.2602.10.00 / .20.00 / .30.00 / .90.00; 1.2301.22.00 |

## 3. Vigência conferida
- LC 116 no compilado do Planalto [D02]. Os subitens 6.01–6.03 e 4.01 mantêm a redação original; o 6.06 foi incluído
  pela LC 157/2016. Anexo B v1.01 é a "documentação atual" do gov.br/nfse [D01].
- O `cNBS` de 9 dígitos é o código NBS sem pontos (formato do campo [198] da DPS). A correlação oficial item ↔ NBS
  (outro anexo) não foi baixada; os pares acima são casamento por descrição.

## 4. Ambiguidades
- **Clínica estética: 6.02 ou 4.01?** Depende de **quem executa e do quê**. Procedimento estético não invasivo por
  esteticista cai em 6.02; ato médico (toxina, preenchimento, laser médico) feito por médico cai em 4.01. Implicação:
  a alíquota e o local de incidência podem mudar, e no Simples o anexo também. **Leitura mais segura:** o kit não
  escolhe um único código para a clínica. Cada serviço recebe o seu na hora do cadastro, com 060201 como sugestão
  para os não médicos. Pergunta ao contador: *"Na clínica estética do cliente, quais procedimentos são executados por
  médico/biomédico (subitem 4.01) e quais por esteticista (6.02)?"*
- **cNBS por casamento de descrição:** a escolha entre 1.2602.20.00 e .90.00 para estética é leitura nossa; a
  tabela de correlação oficial resolveria.

## 5. Lacunas
- Tabela oficial de correlação cTribNac ↔ NBS não baixada.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** D01_anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122-xl — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx>  
  Baixado em 2026-10-13T01:23:34-03:00 · arquivo local `docs/D01_anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122-xl.html` · SHA-256 `e74b0be8ad204e458932efb1716225a3fb5703a84e5475ce5c4c6789d1c61b1a`
- **[D02]** Lcp 116 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm>  
  Baixado em 2026-10-13T01:23:35-03:00 · arquivo local `docs/D02_lcp116-htm.html` · SHA-256 `9e47381b0dcd79e943ea8117fa61828058f6a9beb9730d52b448a65a5e05e55b`

## Registro de buscas
_Nenhuma busca registrada._
