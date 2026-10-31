# X10a EMENDA-4 — os achados fora de escopo, pesquisados para decisão (30/10/2026)

**Pedido do dono (chat, 30/10/2026):** *"Pode ratificar todos e vamos abordar os que estao fora do escopo como decidir,
pesquise"*. Os forks F-AL-0..11 estão em [[D-2026-10-30-X10A-EMENDA-4-FORKS]]. Esta cédula trata só do §9 do
[BRIEF](../../accounting/BE-INCR-NFCE-EMENDA-4-assinador-local-brief.md). **Nada aqui está decidido**: cada item
termina numa pergunta ao dono. Não é `executa`.

**Fontes:** todas já estão em dossiês com hash, baixados entre 27/10 e 30/10. A cópia tem menos de 90 dias e não há
"Redação dada" nova no trecho citado, então não houve download novo (método `VERIFICACAO-LEGAL.md`, passo 3).

| Ref | Documento | Dossiê |
|---|---|---|
| [N1] | Res. CGSN 140 art. 59 § 1º, redação da Res. CGSN 191/2026, visão multivigente oficial da RFB (normasinternet2) | `pesquisas-legais/emissao-mei-me-por-tipo` [D04], baixado em 29/10 |
| [N2] | FAQ NFS-e v1.1 (gov.br/nfse, 22/09/2026), item 17.7 | `pesquisas-legais/nfse-adn-certificado-numeracao` [D01] |
| [N3] | Decreto 12.955 arts. 124–130 (Planalto) | idem [D02] |
| [R1] | FAQ oficial da EFD-Reinf (gov.br/receitafederal), itens 1.3, 1.10 e 8.1 | `pesquisas-legais/fila-2026-10-27-bloco2-reinf` [D05], baixado em 27/10 |
| [C1] | Ajuste SINIEF 19/16 cl. 11ª e Portaria SRE 40/2024 art. 6º | `pesquisas-legais/nfce-sp-contingencia` [D01][D02] |

## 1. NFS-e pelo mesmo assinador — o fato novo é forte

**O que a pesquisa achou (verificado):**

- A NFS-e do Simples é emitida "pelo Emissor Nacional da NFS-e, por meio das seguintes versões: I - emissor de NFS-e
  web; e II - serviço de comunicação do tipo Interface de Programação de Aplicativos (API)" [N1]. Vale desde
  01/11/2026 (Res. 191 art. 3º I). **A API é caminho de emissão previsto para o Simples, não só o portal.**
- A FAQ diz que "a assinatura da DPS e a autenticação mTLS na API exigem obrigatoriamente o certificado digital
  ICP-Brasil (e-CNPJ ou e-CPF) pertencente ao próprio prestador emissor do serviço", sem procuração [N2, 17.7].
- O motivo da decisão de 22/10 ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]) foi esse: sem guardar o certificado do
  cliente, o Luminaris não tinha como fazer o mTLS.

**Leitura (inferida):** com o assinador local, quem assina a DPS e abre o mTLS **é o token do próprio prestador**. É
exatamente o que a FAQ exige, e o Luminaris continua sem guardar nada. A trava de 22/10 cai. Duas diferenças em
relação à NF-e:
- a Sefin compara o CNPJ do certificado com o `emit` da DPS por inteiro, e matriz e filial são "entidades distintas"
  [N2, 17.2 e 28.2]. Cada estabelecimento precisaria do seu e-CNPJ (na NF-e, a raiz basta);
- o caminho de guarda do `BE-INCR-DFE-ADN-EMISSOR` está arquivado. Boa parte dele (montagem e assinatura da DPS,
  cliente da Sefin) seria reaproveitada, mas a guarda do PFX sai e entra o assinador.

**Não verificado:** se o 1º cliente quer que o Luminaris emita no lugar dele, e quantos estabelecimentos ele tem.

**Opções para o dono:**
- **(a) Reabrir a NFS-e automática pelo assinador local:** planejar uma emenda do BRIEF ADN que troca a guarda pelo
  assinador. O portal segue valendo até ela ficar pronta.
- **(b) Manter o portal agora** e reabrir quando o assinador da NF-e/NFC-e estiver rodando no 1º cliente.
- **(c) Manter o portal** sem data, como em 22/10.
- **Recomendação: (b).** A regra permite e o desenho serve, mas o assinador ainda não existe nem foi testado com token.
  Planejar a NFS-e em cima dele antes do runbook A3 é planejar sobre uma premissa inferida. O ganho de (a) é pequeno
  agora, porque o cliente já emite pelo portal desde 01/11.

## 2. EFD-Reinf pelo mesmo assinador

**O que a pesquisa achou (verificado):**

- Os eventos da PJ "deverão ser assinados digitalmente utilizando o e-CNPJ do contribuinte ou o e-CPF de seu
  representante legal ou o e-CPF ou e-CNPJ de seu procurador" [R1, 1.3].
- A procuração eletrônica no perfil "EFD-REINF-Geral" vale "tanto via Webservice, quanto via Portal Web" [R1, 1.10].
- "É necessário apenas um certificado digital", que pode ser do representante legal ou do procurador [R1, 8.1].
- O MEI e o Simples "com até um empregado" podem assinar sem certificado, com conta gov.br prata ou ouro, pelo portal
  no e-CAC [R1, 1.3].

**Leitura (inferida):** a Reinf, ao contrário da NFS-e, **aceita procurador**. Há três caminhos sem guarda:
- o token do cliente pelo assinador local, via webservice;
- o contador como procurador, com o certificado dele;
- o portal Reinf Web, à mão (e com gov.br, se o cliente tiver até um empregado).

O Luminaris como procurador exigiria um e-CNPJ do Luminaris, e isso contraria [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]].

**Contexto:** o `ADR-INCR-EFD-REINF` é Proposed, com F-REINF-1..5 pendentes. O certificado do transmissor é um deles.
Na fase 1, o relatório do produto pode ser digitado no portal (dossiê bloco 2, P-REINF-5).

**Opções para o dono:**
- **(a)** Registrar o assinador local como o transmissor da Reinf no ADR-EFD-REINF (emenda), com o portal manual e o
  contador procurador como alternativas.
- **(b)** Reinf pelo portal ou pelo contador; o Luminaris só gera o relatório e o XML.
- **(c)** Não decidir agora; fica para a ratificação do ADR-EFD-REINF.
- **Recomendação: (c).** O ADR da Reinf ainda está com os forks abertos e este ponto é um deles. Decidir aqui seria
  ratificar um fork de outro nó por tabela. Fica anotado no ADR como opção nova (procuração + assinador).

## 3. Contingência com o caixa totalmente off-line (F-AL-4 b)

**O que a pesquisa achou (verificado):** a contingência é obrigatória quando, por problema técnico, não dá para
transmitir a NFC-e ou obter a resposta [C1, Portaria SRE 40/2024 art. 6º → Aj. 19/16 cl. 11ª]. Em SP, ela é a
off-line `tpEmis=9`, com transmissão até o 1º dia útil seguinte [C1].

**Leitura (inferida):** a norma não diz onde a nota é gerada. Gerar no caixa, sem o servidor, é lícito. A questão é
de produto: o F-AL-4 (a), ratificado, diz que sem o Luminaris não há venda pelo Luminaris. Se o cliente vender sem
internet, ele precisa de outro emissor no balcão, ou vende sem nota, o que é irregular (cl. 11ª; dossiê
`nfce-sp-contingencia`).

**Opções para o dono:**
- **(a)** Manter o F-AL-4 (a) e documentar no onboarding: sem internet, sem venda pelo Luminaris; o cliente mantém
  alternativa (4G no caixa).
- **(b)** Abrir uma frente nova: o assinador monta e numera a NFC-e off-line (série própria) e sincroniza depois.
- **Recomendação: (a).** (b) leva regra fiscal para o desktop e duplica a numeração (risco de número repetido, vedado
  pela cl. 11ª §2º). Um 4G de reserva custa menos que essa frente.

## 4. FE do assinador (pareamento e estado no balcão)

Sem pergunta de lei. É a tela que o AL-3 e o AL-12 pedem: gerar o código, ver se o assinador está ligado, revogar,
e um aviso no balcão quando ele cai. Sem ela, o pareamento só sai por API.

- **(a)** Abrir o `FE-INCR-NFCE-ASSINADOR` (BRIEF de FE) junto com o AL-PR-2.
- **(b)** Deixar como dívida planejada (a regra da casa: tela faltando = dívida, não lacuna) até o runbook A3.
- **Recomendação: (a).** O runbook A3 tem o passo "parear o assinador" feito pelo dono na tela. Sem a tela, o passo vira
  `curl`, o que foge do formato do runbook.

## 5. Pendência do template da `sessao-planejamento` (regra 1 × fold na nota do nó)

Sem pergunta de lei. A regra 1 diz "saída é um documento novo, nada mais"; esta sessão fez o fold curto na nota do
X10a porque a sessão de origem pediu. A pendência 2 do template já propõe permitir isso.

- **Recomendação:** ratificar a pendência 2 do template (fold curto na seção "Docs" da nota, sem tocar `estado`).
  É mudança em `.claude/skills/**` e roda o `skill-audit` antes de fechar.
