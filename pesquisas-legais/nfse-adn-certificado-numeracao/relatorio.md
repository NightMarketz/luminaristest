# Relatório de pesquisa legal — nfse-adn-certificado-numeracao

**Pergunta:** NFS-e nacional (Sefin/ADN): L-ADN-1 certificado da matriz serve à filial; L-ADN-2 reuso do nº da DPS rejeitada; L-ADN-3 numeração por ambiente; L-ADN-4 transmissor com certificado próprio (mTLS)
**Aberto em:** 2026-10-12T23:57:20-03:00 · **Atualizado em:** 2026-10-12T23:58:46-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## Conclusão

- **L-ADN-4 (transmissor com certificado próprio): NÃO.** A FAQ oficial da NFS-e diz que "a assinatura da DPS e a
  autenticação mTLS na API exigem obrigatoriamente o certificado digital ICP-Brasil … pertencente ao próprio prestador";
  não há procuração para integradores, e o PAA da NFS-e está "em desenvolvimento, ainda indisponível" [D01, item 17.7].
  O Decreto 12.955 delega o protocolo à documentação técnica (arts. 127–129) e só admite atuar "em nome do emitente" pelo
  PAA habilitado (art. 129 §§ 1º–2º) [D02]. **Efeito:** o F-PSC-1 (a) — mTLS com A1 do Luminaris — não é aceito pela
  Sefin. Fork reaberto para o dono.
- **L-ADN-1 (A1 da matriz para a filial): NÃO.** O sistema "confronta o CNPJ/CPF do certificado digital com o CNPJ/CPF
  informado no grupo <emit>" (E0718) [D01, 17.7]; matriz e filiais são "entidades distintas, mesmo compartilhando a raiz"
  [D01, 28.2]. **F-ADN-11 = (a)** (14 dígitos) fica sustentado pela fonte.
- **L-ADN-2 (reuso do nº da DPS rejeitada):** é vedada a reutilização de numeração de **documento fiscal** já utilizada
  [D02, art. 124 § 3º], e o documento só vale após a autorização de uso [D02, art. 130]. O número oficial é o nNFSe,
  gerado pela Sefin; número perdido por timeout é descartado e "o sistema atribuirá o próximo" [D01, 18.4–18.5].
- **L-ADN-3 (numeração por ambiente):** buracos no nNFSe são aceitos por desenho [D01, 18.5]; produção restrita é ambiente
  de testes [D01, 19.5]. Nada exige continuidade do nDPS entre ambientes → separar por ambiente (F-ADN-9) é seguro.

## Ambiguidades
- L-ADN-2: a letra veda reusar número de *documento fiscal*; a DPS rejeitada não vira documento (art. 130). Leitura
  segura: reenviar a DPS rejeitada com o **mesmo** nDPS só depois de confirmar (HEAD /dps) que não gerou nota; na
  dúvida, número novo. Pergunta ao suporte NFS-e se quiser fechar.

## Grau
- FAQ v1.1 de 22/09/2026 é documento oficial do gov.br/nfse, mas é orientação, não norma. A norma (Decreto 12.955)
  remete à documentação técnica, e a FAQ é parte dela na prática. Vigência: Decreto 12.955 alterado pelo 13.075 [D03],
  que não toca os arts. 124–130.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** D01_perguntas-e-respostas-nfs-e-v-1-1-20260922-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/nfse/pt-br/perguntas-frequentes/perguntas-e-respostas-nfs-e-v-1-1-20260922.pdf>  
  Baixado em 2026-10-12T23:57:40-03:00 · arquivo local `docs/D01_perguntas-e-respostas-nfs-e-v-1-1-20260922-pdf.pdf` · SHA-256 `e1d84300a7fa870bb642366d3088a202c1bed008dd18ece79808c09e2a3b4641`
- **[D02]** d12955 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm>  
  Baixado em 2026-10-12T23:58:14-03:00 · arquivo local `docs/D02_d12955-htm.html` · SHA-256 `168eef3e5517ba49eef19a32350d805dbfdf47617f79a5ed5f65684747c0a24d`
- **[D03]** d13075 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13075.htm>  
  Baixado em 2026-10-12T23:58:14-03:00 · arquivo local `docs/D03_d13075-htm.html` · SHA-256 `238a8835781a4e4daf81006afc395df1dca26a66a06e861151ab6fb6d3c60f04`

## Registro de buscas
_Nenhuma busca registrada._
