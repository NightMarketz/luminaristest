# Relatório de pesquisa legal — dfe-mtls-psc

**Pergunta:** Certificado só em PSC (nuvem): a norma ICP-Brasil/DOC-ICP-17.01 e os webservices SEFAZ/Sefin exigem TLS mútuo com o e-CNPJ do contribuinte? Há como autenticar o transporte sem ter a chave privada?
**Aberto em:** 2026-10-13T00:55:35-03:00 · **Atualizado em:** 2026-10-13T00:59:51-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**NF-e/NFC-e: o risco de TLS mútuo está resolvido pela norma.** O certificado do TLS é o **do responsável pela
transmissão**, "que não será necessariamente o CNPJ/CPF da empresa emissora", e precisa ter EKU "Autenticação
Cliente" [D01] MOC 7.0 Visão Geral §4.2.x. O "CNPJ do transmissor [...] não necessita estar vinculado ao CNPJ do
estabelecimento emissor" [D01]. O Luminaris pode, então, usar **um e-CNPJ próprio** (do Luminaris, não do cliente)
para o transporte, e assinar o XML pelo PSC com o certificado do cliente. A assinatura continua presa ao CNPJ-base
do emitente (rej. 213). Só o transmissor recebe o resultado do processamento [D01].

**NFS-e nacional: só em parte.** Pelo manual da Sefin Nacional, a consulta `GET /dps/{id}` só devolve a chave "se a
identificação do usuário do certificado digital da conexão solicitante for um ator (Prestador, Tomador ou
Intermediário)" [D02] §1.4. O `HEAD /dps/{id}` aceita qualquer certificado válido [D02]. A distribuição do ADN exige
certificado de mesmo CNPJ raiz do contribuinte [D03]. **O manual não diz qual certificado o `POST` de emissão exige.**
Com o e-CNPJ do Luminaris no TLS: a recuperação por `GET /dps` (F-ADN-8) e a distribuição do ADN **não funcionam**;
o `HEAD` funciona.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| TLS 1.2 com autenticação mútua | MOC 7.0 VG | [D01] | "protocolo TLS 1.2 ou superior, com autenticação mútua" |
| Certificado de transmissão pode ser de terceiro | MOC 7.0 VG | [D01] | "que não será necessariamente o CNPJ /CPF da empresa emissora da NF -e" |
| Transmissor desvinculado do emissor | MOC 7.0 VG | [D01] | "não necessita estar vinculado ao CNPJ do estabelecimento emissor da NF -e" |
| GET /dps só para ator | Manual Emissor Público API v1.2 §1.4 | [D02] | "corresponda a um dos atores informados na DPS" |
| ADN: mesmo CNPJ raiz | Manual APIs ADN | [D03] | "certificado cujo CNPJ tenha o mesmo CNPJ Raiz do contribuinte" |

## 3. Vigência conferida
- MOC 7.0 Visão Geral no repositório do CONFAZ [D01]: confirmar no PR que não há NT posterior mudando a regra do
  transmissor. Manual Sefin v1.2 de out/2025 [D02] é a "documentação atual" do gov.br/nfse.
- DOC-ICP-17.01 (API dos PSC: OAuth 2.0, `/oauth/signature` assina **hash**): a versão vigente não foi baixada nesta
  sessão; a busca mostrou a v2.2 com IN revogada. Nada nela indica que o PSC faça handshake TLS pelo cliente.

## 4. Ambiguidades
- **NFS-e, `POST /nfse` com certificado de transmissão de terceiro.** Leituras: (i) aceito, e só a assinatura da
  DPS precisa ser do prestador; (ii) recusado, se o Sefin exigir que o certificado da conexão seja de ator. Com (i),
  o desenho NF-e serve; com (ii), a NFS-e por PSC não tem transporte e precisa de outra saída (procuração eletrônica,
  ou o cliente com certificado de transporte próprio). **Leitura mais segura: tratar como não verificado.** Quem
  responde: o **runbook de produção restrita** (enviar uma DPS assinada pelo PSC com o e-CNPJ do Luminaris no TLS) ou
  o suporte do Sistema Nacional NFS-e. Não é pergunta para contador ou advogado.

## 5. Lacunas
- DOC-ICP-17.01 vigente (versão e IN) não baixado.
- Swagger da Sefin (exige certificado) não lido.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** MOC 7.0 - Visão Geral — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf>  
  Baixado em 2026-10-13T00:58:08-03:00 · arquivo local `docs/D01_moc7-visao-geral-pdf.pdf` · SHA-256 `f664dcf94b77cabb32311620d85a7eb02cdf86adb2d4632ce178af2572dd2ad1`
- **[D02]** D02_manual-contribuintes-emissor-publico-api-sistema-nacional-nf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf>  
  Baixado em 2026-10-13T00:58:33-03:00 · arquivo local `docs/D02_manual-contribuintes-emissor-publico-api-sistema-nacional-nf.pdf` · SHA-256 `ac2f36e34ff565cc36d67c5d67415c33cc09f27b2dea006e8da9bcd2ddce5581`
- **[D03]** D03_manual-contribuintes-apis-adn-sistema-nacional-nfse-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf>  
  Baixado em 2026-10-13T00:58:33-03:00 · arquivo local `docs/D03_manual-contribuintes-apis-adn-sistema-nacional-nfse-pdf.pdf` · SHA-256 `9ffc97d8b1be4c80a440b3569b0027df61265b9e75ef69437f21f9481a9a1d6d`

## Registro de buscas
_Nenhuma busca registrada._
