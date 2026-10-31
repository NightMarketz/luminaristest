# Relatório de pesquisa legal — vigilancia-2026-10-31-paa-nfse

**Pergunta:** Já existe ato oficial liberando emissor automático (PAA) para a NFS-e nacional? Mudou algo desde 22/10/2026?
**Aberto em:** 2026-10-31T12:14:32-03:00 · **Atualizado em:** 2026-10-31T12:47:28-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Nada mudou desde a leitura de 22/10. Não há ato nem documento oficial que libere emissor automático (PAA ou emissão
por terceiro sem o certificado do prestador) para a NFS-e nacional.** A trava do [[X10i]]/[[X11]] continua: NFS-e = portal
(Emissor Nacional + `ManualEmissor`).

- "Documentação Atual (Produção)" do gov.br/nfse: mesma lista de guias, manuais, XSD e anexos, "Atualizado em 15/08/2026" [D01].
- "Atualizações e Implantações" (atualizada 21/10/2026): só as evoluções da NT 009 em produção restrita (20/10) e itens
  anteriores; nada sobre PAA, procuração ou assinatura por terceiro [D02].
- Notícias do portal até 29/10/2026: nenhuma sobre PAA da NFS-e [D03]. O PAA segue sendo assunto da NF-e/NFC-e (NT 2026.001,
  Ajuste SINIEF 9/22), fora do escopo da NFS-e (leitura de 10/10, não refeita hoje).
- Páginas "RTC" e "Produção restrita": só notas técnicas de leiaute (NT 004 a 010) e anexos [D06][D07].

**O que apareceu de novo (29/10), sem mudar a trava:**
1. **Simples a partir de 01/11/2026** [D04]: ME/EPP do Simples "devem emitir a NFS-e exclusivamente pelo Emissor Nacional
   (Web ou API)". O critério é a **data de competência**: competência de 01/11/2026 em diante vai ao nacional, mesmo em
   município com emissor próprio; competência anterior (ex.: 30/10) continua no emissor municipal. Confirma a data da
   Res. CGSN 191 que o vault já usa ([[D7]], errata de 29/09).
2. **Leiaute em produção** [D05]: produção = NT 004 + domínio `tpRetPisConfins` da NT 007. O grupo IBS/CBS está "aberto" no
   ADN: se não vier, a nota não é rejeitada; se vier, tem de vir completo. A NT 009 entra em releases; "Os 'releases 1 a 3'
   deverão estar em produção em 01/12/2026". O release 1 (produção restrita, 20/10) reposiciona CST e cClassTrib no XML
   (item 2.16 da NT 009) [D02].
3. **indOp na NT 009** [D08]: o Anexo VII IndOp v1.03.00 (NT 009 v1.01) mantém o código **030101** com a mesma descrição
   ("Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física"). A conclusão do [[D1f]]
   (fold de 28/10) sobrevive à troca de leiaute.

## 2. Fundamentação
| Ponto | Norma / documento | Fonte | Trecho literal |
|---|---|---|---|
| Documentação vigente sem PAA | Portal NFS-e, Documentação Atual | [D01] | "Atualizado em 15/08/2026 09h58" |
| Simples no Emissor Nacional | Notícia CGNFS-e 29/10/2026 | [D04] | "devem emitir a NFS-e exclusivamente pelo Emissor Nacional (Web ou API)" |
| Critério de competência | idem | [D04] | "O critério fundamental [...] é a Data de Competência do serviço." |
| Grupo IBS/CBS aberto | Notícia CGNFS-e 29/10/2026 | [D05] | "caso o grupo de IBS/CBS não seja informado, o documento fiscal não sofrerá rejeição técnica" |
| NT 009 em produção | idem | [D05] | "Os 'releases 1 a 3' deverão estar em produção em 01/12/2026." |
| CST/cClassTrib mudam de lugar | Atualizações e Implantações | [D02] | "Reposicionamento dos campos CST e cClassTrib na estrutura do XML da nota fiscal (item 2.16 da Nota Técnica 009)" |
| indOp 030101 | Anexo VII IndOp v1.03.00 | [D08] | "030101" · "Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física" |

## 3. Vigência conferida
- Acervo ctresb/leis: não cobre documentação técnica nem notícias do portal NFS-e; fui direto à fonte oficial (gov.br/nfse).
- Todas as páginas baixadas em 31/10/2026 com hash (seção Fontes).
- O Ato Técnico Conjunto RFB/CGIBS 7/2026 (01/10) aprovou a NT 009 v1.01 [D03]; não li o texto do ato (só a notícia).

## 4. Ambiguidades
- Nenhuma que peça decisão humana. "Web ou API" [D04] **não** é PAA: a API do Emissor Nacional continua exigindo o
  certificado do próprio prestador no mTLS (FAQ NFS-e v1.1, item 17.7, lida em 13/10; **não relida hoje** — inferido que
  segue igual, porque a documentação de produção não mudou desde 15/08 [D01]).

## 5. Lacunas
- A ausência de PAA é conclusão por **varredura** das páginas oficiais listadas [D01–D07], não por um ato que negue.
- A FAQ (Perguntas e Respostas de 16/09) não foi relida hoje.
- **Achado a verificar (inferido):** o release 1 da NT 009 reposiciona CST e cClassTrib no XML [D02], com produção prevista
  para 01/12/2026 [D05]. Se o `retornoManual` do [[DFE-MANUAL]] lê esses campos pela posição do leiaute NT 004, ele pode
  quebrar com a nota do Emissor Nacional depois de 01/12. Não li o código do parser nesta sessão.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Documentação Atual — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual>  
  Baixado em 2026-10-31T12:40:17-03:00 · arquivo local `docs/D01_documentacao-atual.html` · SHA-256 `82328aa612f16271f3cc54bd1fa9ef31ae12dd44ecb6a5dd9563128a9d54ef06`
- **[D02]** Atualizações e Implantações — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/atualizacoes-e-implantacoes>  
  Baixado em 2026-10-31T12:40:17-03:00 · arquivo local `docs/D02_atualizacoes-e-implantacoes.html` · SHA-256 `0786832d6e2f10566d72f37f185e4ce658b2896bcb58ee2b977f242bbffd831c`
- **[D03]** Notícias — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/noticias>  
  Baixado em 2026-10-31T12:40:17-03:00 · arquivo local `docs/D03_noticias.html` · SHA-256 `0844a5508a7e92ccaac7781174f8dc1bdb41554fc0895d027d14c034f9b84490`
- **[D04]** NFS-e informa: diretrizes sobre a Obrigatoriedade da Emissão da NFS-e Nacional para Optantes do Simples Nacional — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/noticias/nfs-e-informa-diretrizes-sobre-a-obrigatoriedade-da-emissao-da-nfs-e-nacional-para-optantes-do-simples-nacional>  
  Baixado em 2026-10-31T12:40:45-03:00 · arquivo local `docs/D04_nfs-e-informa-diretrizes-sobre-a-obrigatoriedade-da-emissao-.html` · SHA-256 `12e04c1fa84a2d037e7e29ff8e514071b82bf75aed7cc54906b88f5f5bbcb435`
- **[D05]** NFS-e Nacional: confira as orientações sobre leiaute em produção, regras de preenchimento de IBS/CBS e status da Nota Técnica 009 — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/noticias/nfs-e-nacional-confira-oas-rientacoes-sobre-leiaute-em-producao-regras-de-preenchimento-de-ibs-cbs-e-status-da-nota-tecnica-009>  
  Baixado em 2026-10-31T12:40:45-03:00 · arquivo local `docs/D05_nfs-e-nacional-confira-oas-rientacoes-sobre-leiaute-em-produ.html` · SHA-256 `2d0b5e5796e922146a99f596b05aaae49522ba70de668ee8153bda5f9751c53f`
- **[D06]** RTC — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc>  
  Baixado em 2026-10-31T12:41:02-03:00 · arquivo local `docs/D06_rtc.html` · SHA-256 `f824b8cd299941c1c2594b33d20db9da648a3304e4f718eee53543428fbf05df`
- **[D07]** Documentação Técnica (Homologação/testes) — Portal da Nota Fiscal de Serviço eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/producao-restrita>  
  Baixado em 2026-10-31T12:41:02-03:00 · arquivo local `docs/D07_producao-restrita.html` · SHA-256 `38392b1f566b3cd74bfc90e80b9276ed9e81e96076821a79e71cead027818aea`
- **[D08]** D08_anexovii-indop_ibscbs_v1-03-00-nt009-xlsx — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/anexovii-indop_ibscbs_v1-03-00-nt009.xlsx>  
  Baixado em 2026-10-31T12:41:17-03:00 · arquivo local `docs/D08_anexovii-indop_ibscbs_v1-03-00-nt009-xlsx.html` · SHA-256 `95f30a44ee94adeea57fb92f3a0337b1e62fdc106f393e73894087889be9e5aa`

## Registro de buscas
_Nenhuma busca registrada._
