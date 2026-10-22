# Relatório de pesquisa legal — open-finance-acesso

**Pergunta:** Um ERP (Luminaris) pode se conectar ao Open Finance Brasil? Quem pode ser participante, ITP, e como terceiros acessam dados/iniciam pagamento
**Aberto em:** 2026-10-22T13:12:55-03:00 · **Atualizado em:** 2026-10-22T13:25:26-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
O Luminaris não pode ser participante direto do Open Finance. Participantes são instituições autorizadas pelo BCB
([D02] art. 1º; art. 6º). Uma entidade não autorizada só acessa dados por **parceria** contratada por uma instituição
participante, com consentimento prévio e expresso do cliente ([D02] art. 36, caput e § 1º; arts. 32 e 37).
A iniciação de pagamento é prestada por instituição iniciadora (ITP) participante, que não detém os fundos
([D02] art. 2º, VI; art. 6º, II, "b"). Caminho prático: um agregador/ITP autorizado como parceiro.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Quem implementa | Res. Conj. 1/2020, art. 1º | [D02] | "instituições financeiras, instituições de pagamento e demais instituições autorizadas a funcionar pelo Banco Central do Brasil" |
| Parceria com não autorizado | art. 36 | [D02] [D03] | "É admitida a contratação de parceria [...] com entidades não autorizadas a funcionar pelo Banco Central do Brasil" |
| Consentimento | art. 36, § 1º | [D02] | "pressupõe prévio e expresso consentimento do cliente" |
| ITP | art. 2º, VI | [D02] | "sem deter em momento algum os fundos transferidos" |

## 3. Vigência conferida
- Alerta do acervo: [D02] e [D01] são publicação original. Conferido no BCB ([D03]): `Revogado: false`; alterada pelas
  Res. Conj. 2/2020, 3/2021, 4/2022, 7/2023, 10/2024 e 15/2025.
- **Compilada v9 lida ([D05]).** Art. 1º e art. 36 caput com redação da Res. Conj. 4/2022 (só troca "Open Banking" →
  "Open Finance"); sentido mantido. Art. 36 § 5º: vedada a parceria "I - entre instituições autorizadas" e "II - com o
  objetivo de que o parceiro contratado atue em nome da instituição contratante para fins de compartilhamento".
  Arts. 37–38: a instituição contratante faz due diligence do parceiro (segurança, auditoria independente, registros de
  consentimento) e o contrato dá ao BCB acesso aos contratos e dados (art. 38, VII).
  Art. 6º, II (Res. Conj. 10/2024): ITP participa obrigatoriamente da iniciação de pagamento.
- **Res. BCB 80/2021, compilada (página do BCB, [D04]):** `Revogado: false`. Art. 3º, IV: ITP é a IP que inicia pagamento
  "sem gerenciar conta de pagamento" e "sem deter em momento algum os fundos". Art. 4º: vedado ao ITP armazenar a
  credencial do usuário, pedir dado além do necessário, usar o dado para outra finalidade, alterar o valor.
  Art. 9º (Res. BCB 494/2025): toda IP pede autorização ao BCB **antes** de iniciar o serviço. Art. 17, II (Res. BCB
  407/2024): capital social integralizado e PL mínimos de R$ 1.000.000,00 para ITP. Art. 5º: sociedade limitada ou
  anônima, sem pessoa natural como sócio único.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma para a pergunta "o Luminaris pode ser participante direto?" (não pode sem autorização + R$ 1 mi).
Para contratar agregador: quem é o controlador LGPD e como o consentimento é registrado (art. 36 § 1º; art. 37 § 2º, I)
→ pergunta ao advogado: "No contrato com o agregador, o Luminaris é controlador ou operador dos dados de extrato do
cliente, e quem guarda o registro de consentimento exigido pelo art. 37 § 2º da Res. Conj. 1/2020?"

## 5. Lacunas
O "acesso direto" (credencial do usuário, fora do Open Finance) oferecido por agregadores não é regido pela Res. Conj.
1/2020; não pesquisei norma específica sobre ele.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** RESOLUÇÃO BCB Nº 80, DE 25 DE MARÇO DE 2021 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/207390262912b4e7e8c1cbbf6c700ce9a2f13ca3/reguladores/bcb/resolucoes/2021/resolucao-bcb-n-80-de-25-de-marco-de-2021-310910168.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-bcb-n-80-de-25-de-marco-de-2021-310910168> · versao_texto: publicação original · cópia de 2026-10-21  
  Lido em 2026-10-22T13:13:17-03:00 · arquivo local `docs/D01_resolucao-bcb-n-80-de-25-de-marco-de-2021-310910168.md` · SHA-256 `488ec97b08cacafb432cbb2178090e45e53692123d646ded21a2731519275d51`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D02]** RESOLUÇÃO CONJUNTA Nº 1, DE 4 DE MAIO DE 2020 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/207390262912b4e7e8c1cbbf6c700ce9a2f13ca3/reguladores/bcb/resolucoes/2020/resolucao-conjunta-n-1-de-4-de-maio-de-2020-255165055.md>  
  Fonte oficial declarada: <https://www.in.gov.br/web/dou/-/resolucao-conjunta-n-1-de-4-de-maio-de-2020-255165055> · versao_texto: publicação original · cópia de 2026-10-21  
  Lido em 2026-10-22T13:13:23-03:00 · arquivo local `docs/D02_resolucao-conjunta-n-1-de-4-de-maio-de-2020-255165055.md` · SHA-256 `b972f950fb1ca3a776686b2e30d14821609e2fcc2913e12385543fce4bf0bda2`  
  ⚠ versao_texto = 'publicação original' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** D03_exibenormativo — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.bcb.gov.br/api/conteudo/app/normativos/exibenormativo?p1=Resolu%C3%A7%C3%A3o%20Conjunta&p2=1>  
  Baixado em 2026-10-22T13:13:39-03:00 · arquivo local `docs/D03_exibenormativo.html` · SHA-256 `2b2cb01808f133401df76b28201934d5856c3f84bd8941bd32dc4eabf9f623e5`
- **[D04]** D04_exibenormativo — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.bcb.gov.br/api/conteudo/app/normativos/exibenormativo?p1=Resolu%C3%A7%C3%A3o%20BCB&p2=80>  
  Baixado em 2026-10-22T13:23:20-03:00 · arquivo local `docs/D04_exibenormativo.html` · SHA-256 `6cd2feff9a91532a1b65a1e7544d1e110f9b0c59eb7e4e3316912a6f52eb1b04`
- **[D05]** Resolução Conjunta Nº 1 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://normativos.bcb.gov.br/Lists/Normativos/Attachments/51028/Res_Conj_0001_v9_L.pdf>  
  Baixado em 2026-10-22T13:23:43-03:00 · arquivo local `docs/D05_Res_Conj_0001_v9_L-pdf.pdf` · SHA-256 `319d0f45ceaaf79e660b5a6a490d649a10dfc3ec1a2d4dd476c673147d393fde`

## Registro de buscas
_Nenhuma busca registrada._
