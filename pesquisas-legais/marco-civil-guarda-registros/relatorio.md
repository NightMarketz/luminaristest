# Relatório de pesquisa legal — marco-civil-guarda-registros

**Pergunta:** Provedor de aplicação (ERP SaaS) é obrigado a guardar registros de acesso? Por quanto tempo e com que conteúdo?
**Aberto em:** 2026-10-23T11:01:29-03:00 · **Atualizado em:** 2026-10-23T11:06:02-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Quando o Luminaris operar como pessoa jurídica, de forma organizada e com fins econômicos, numa aplicação acessada pela internet, ele é **provedor de aplicações de internet**. Nessa condição, **guarda os registros de acesso a aplicações por 6 meses**, sob sigilo, em ambiente controlado e de segurança ([D01] art. 15, caput).

- **O que é o registro:** data e hora de uso a partir de um endereço IP ([D01] art. 5º, VIII).
- **Porta de origem:** desde a alteração de 2026, o dever abrange também a **porta lógica de origem**, sempre que ela for necessária para identificar o terminal. Esse dever existe sem que ninguém precise requisitar ([D03]/[D04] art. 15-A, caput e § 1º).
- **Segurança da guarda:** controle estrito de quem acessa, autenticação (ex.: dupla), **inventário dos acessos aos próprios registros** e encriptação ou medida equivalente ([D03] art. 13, I a IV).
- **Formato:** interoperável e estruturado ([D03] art. 15).
- **Minimização:** reter o mínimo possível e excluir quando a finalidade for atingida ou o prazo legal acabar ([D03] art. 13, § 2º).

**Situação hoje:** o server não guarda IP nem porta por acesso, e o único arquivo persistido (erros e avisos) fica 14 dias. Enquanto não há operação, isso não é infração. Mas o requisito precisa entrar no desenho antes da implantação.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Dever e prazo | Lei 12.965/2014, art. 15 | [D01] | "pelo prazo de 6 (seis) meses, nos termos do regulamento" |
| O que é o registro | Lei 12.965/2014, art. 5º, VIII | [D01] | "data e hora de uso [...] a partir de um determinado endereço IP" |
| Porta de origem | Dec. 8.771/2016, art. 15-A (incluído pelo Dec. 12.975/2026) | [D03], [D04] | "abrangerá a porta lógica de origem associada sempre que necessário" |
| Segurança da guarda | Dec. 8.771/2016, art. 13, I–IV | [D03] | "inventário detalhado dos acessos aos registros" |
| Minimização | Dec. 8.771/2016, art. 13, § 2º | [D03] | "reter a menor quantidade possível de dados pessoais" |
| Formato | Dec. 8.771/2016, art. 15 | [D03] | "formato interoperável e estruturado" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos:** a Lei 12.965 [D01] está compilada, é recente e não teve alerta. O Dec. 8.771 do acervo [D02] é a versão `original` e **não traz** as alterações do Dec. 12.975/2026. Por isso conferi o texto compilado do Planalto [D03] e o próprio decreto que altera [D04].
- **Redação atual:** o art. 15-A e os arts. 16-A a 16-P foram incluídos pelo Dec. 12.975, de 20/05/2026, que entra em vigor 60 dias após a publicação ([D04] art. 2º). Em 23/10/2026 já está em vigor.
- **Regulamentação pendente:** o art. 13, § 1º encarrega o CGI.br de estudos e padrões por porte de provedor. Não pesquisei recomendação do CGI.br.

## 4. Ambiguidades (só o que precisa de decisão humana)
- **Arts. 16-A a 16-J, deveres incluídos em 2026.** O 16-A (sede e representante no País, canal de denúncia, segurança e transparência) vale para todo provedor de aplicações. Já o 16-B (e os deveres que dependem dele) trata da "intermediação de conteúdo gerado por terceiro". Num ERP B2B o conteúdo é do próprio cliente (lançamentos, cadastros), embora existam chat e anexos.
  - Leitura mais segura: o 16-A se aplica e os 16-B a 16-J não, porque não há difusão de conteúdo a terceiros.
  - Esse ponto **não é observabilidade**. Só aparece aqui porque a pesquisa passou por ele.
  - Pergunta ao advogado: *"Um ERP SaaS B2B, sem publicação de conteúdo a terceiros, está sujeito aos arts. 16-B a 16-J do Dec. 8.771 (redação do Dec. 12.975/2026)? E ao 16-A, II (canal de denúncia)?"*
- **Porta de origem atrás de proxy.** Atrás de balanceador ou CDN, o IP e a porta que chegam ao Express são os do proxy, não os do usuário. Quando a porta é "necessária para a identificação inequívoca" depende da topologia de implantação, que ainda não existe. A decisão é técnica e está no fork F-OBS-6 do PRE-ADR.

## 5. Lacunas
- Não li as recomendações do CGI.br sobre padrões de guarda (art. 13, § 1º).
- Não pesquisei a LGPD (registro das operações de tratamento, art. 37; segurança, art. 46) para este tema. Ela aparece só como vizinha no PRE-ADR.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 12.965 de 23/04/2014 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/304b3a90473b9f312cbbff04119cbc81dd492e3c/federal/leis-ordinarias/2014/lei-12965-2014-04-23.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-04-23;12965> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-23T11:01:38-03:00 · arquivo local `docs/D01_lei-12965-2014-04-23.md` · SHA-256 `3ab62009e0cbb77fa5c2113950e088852347108d8ec05c45f57dedff40923a38`
- **[D02]** Decreto nº 8.771 de 11/05/2016 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/39239e708b021186cea3d407a5fc7984f2c725f5/federal/decretos/2016/dec-8771-2016-05-11.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2016-05-11;8771> · versao_texto: original · cópia de 2026-10-16  
  Lido em 2026-10-23T11:01:53-03:00 · arquivo local `docs/D02_dec-8771-2016-05-11.md` · SHA-256 `c4787d3e96bc3e0c82b38a2dcf3e77107f3e0b5572e3cd0dfd7e6db73bd4b311`  
  ⚠ versao_texto = 'original' (não é texto compilado: alterações posteriores não aparecem)
- **[D03]** Decreto nº 8771 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm>  
  Baixado em 2026-10-23T11:01:59-03:00 · arquivo local `docs/D03_d8771-htm.html` · SHA-256 `180e261044c4b8ee32c27a0fc67d0be5f2acb1b82e62ad7b410a0e5020e77ac6`
- **[D04]** d12975 — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12975.htm>  
  Baixado em 2026-10-23T11:02:44-03:00 · arquivo local `docs/D04_d12975-htm.html` · SHA-256 `44345ad5f08654a08a7bed912caf39b83040a8d8abc6b9db99ef32dac9d9847c`

## Registro de buscas
_Nenhuma busca registrada._
