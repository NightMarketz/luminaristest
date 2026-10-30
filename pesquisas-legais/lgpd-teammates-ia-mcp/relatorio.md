# Relatório de pesquisa legal — lgpd-teammates-ia-mcp

**Pergunta:** Teammates (agentes de IA) do Luminaris: papéis LGPD (controlador/operador/suboperador), transferência internacional (art. 33 + Res. CD/ANPD 19/2024), base legal (art. 7º) e obrigações do produto ao enviar dados de clientes do tenant a provedor de IA (BYOK) e a servidores MCP de terceiros
**Aberto em:** 2026-10-29T10:35:24-03:00 · **Atualizado em:** 2026-10-29T23:35:19-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Em duas linhas:** o envio é lícito se o tenant tiver base legal e um mecanismo válido de transferência
internacional, e esse mecanismo precisa estar no contrato **do tenant** com o provedor (BYOK), não no do
Luminaris. Contratos lidos em 29/10 (§6): **só o Google** traz as cláusulas-padrão da ANPD e processa na UE
(adequada pela Res. 32/2026), e isso vale também para o Claude pelo Google Cloud. A API direta da Anthropic e a da
OpenAI **não têm mecanismo pronto** para dado vindo do Brasil. Risco principal: ligar o piloto (PR-8) num adaptador
direto da Anthropic ou da OpenAI.

Graus: **verificado** = li o texto vigente; **inferido** = aplicação minha ao caso, sobre texto lido.

**Q1. Papéis.**
- **Tenant = controlador** dos dados dos clientes dele. É ele quem decide a finalidade (cobrar, conciliar), qual
  teammate roda, qual provedor e qual servidor MCP [D01 art. 5º VI]. A finalidade e a base legal ficam sempre com
  o controlador [D05 §37]. *Inferido.*
- **Luminaris = operador** do tenant: guarda os dados e executa o teammate "em nome do controlador"
  [D01 art. 5º VII; art. 39]. Vale enquanto o Luminaris não usar esses dados para fim próprio (treino, analytics
  entre tenants, benchmark). Para esse uso ele viraria controlador e precisaria de base legal própria. Pode decidir
  sozinho só os elementos "não essenciais", como software e medidas de segurança [D05 §36]. *Inferido.*
- **Provedor de IA com BYOK = operador contratado diretamente pelo tenant**, e não suboperador do Luminaris: o
  contrato, a chave e a cobrança são do tenant. Segundo o guia da ANPD, "A relação direta do suboperador é com o
  operador e não com o controlador" [D05 §65]. Para a responsabilidade, o rótulo pesa pouco: o suboperador "pode
  ser equiparado ao operador" [D05 §69]. Se os termos do provedor permitirem usar o dado de API para fim próprio,
  ele vira controlador quanto a esse fim (§4, A3). *Inferido.*
- **Servidor MCP de terceiro**: mesma lógica. Quem escolhe e contrata é o tenant, com o token do tenant (F-TM-13),
  então é operador do tenant. Pode ser controlador independente, conforme o serviço e os termos dele (Q5).
  *Inferido.*
- **Responsabilidade [D01 art. 42 §1º I]:** o operador responde junto com o controlador "quando descumprir as
  obrigações da legislação de proteção de dados ou quando não tiver seguido as instruções lícitas do controlador".
  Para o Luminaris, isso inclui mandar ao provedor ou ao MCP um campo que o tenant excluiu, ou chamar ferramenta
  sem a confirmação dele: nesses casos o Luminaris "equipara-se ao controlador". As travas de produto da Q4 são
  a defesa do Luminaris. *Verificado (texto) / inferido (aplicação).*

**Q2. Transferência internacional.**
- Mandar dado ao servidor do provedor no exterior é transferência internacional [D01 art. 5º XV; D03 Anexo I
  arts. 3º III–IV e 5º]. Não é "coleta internacional" [D03 art. 6º]: o dado foi coletado no Brasil pelo tenant e
  depois transmitido. *Verificado/inferido.*
- A transferência precisa de **duas coisas** [D03 art. 9º]: (I) uma base do art. 7º e (II) um mecanismo do
  art. 33. Os mecanismos que servem a um ERP privado:
  1. **Adequação (art. 33 I):** só a **União Europeia** (mais Islândia, Liechtenstein e Noruega) foi reconhecida
     [D09 Res. 32/2026 art. 1º; D06]. Se o provedor processar numa região da UE/EEE, não precisa de cláusula.
     *Verificado.*
  2. **Cláusulas-padrão da ANPD (art. 33 II b):** valem só com "adoção integral e sem alteração do texto
     disponibilizado no Anexo II, mediante instrumento contratual firmado entre o exportador e o importador"
     [D03 art. 16]. O prazo de adaptação dos contratos (12 meses da publicação de 23/08/2024) já venceu
     [D03 Res. art. 2º, par. ún.]. Cláusula estrangeira equivalente (como as SCC europeias) **só vale depois de
     reconhecida pela ANPD**, e nenhuma foi até hoje [D06; D03 art. 18]. *Verificado.*
  3. **Art. 33 IX** (transferência necessária para o art. 7º II, V ou VI): é leitura fraca para IA, que é
     conveniência e não necessidade, e a transferência deve se limitar "ao mínimo necessário" [D03 art. 9º
     par. ún.]. Ver §4, A2.
  4. **Consentimento específico (art. 33 VIII):** inviável na prática para a base de clientes de um ERP.
     *Inferido.*
- **Muda por a chave e o contrato serem do tenant? Sim, em dois pontos:**
  (a) quem prova o mecanismo é o controlador: "Cabe ao controlador verificar … se a operação de tratamento: …
  está amparada em hipótese legal e em mecanismo de transferência internacional válidos" [D03 art. 4º III].
  Com BYOK, o único contrato com o provedor é o do tenant, então as cláusulas têm de estar **nele**. A Opção A da
  Cláusula 4 do Anexo II (tenant exportador/controlador, provedor importador/operador) é a que cabe. A Opção B
  (operador→operador, com o tenant como "Terceiro Controlador") exigiria contrato Luminaris↔provedor, que no
  BYOK não existe. (b) Mesmo assim, o Luminaris tem dever próprio: "O operador prestará auxílio ao controlador
  mediante o fornecimento das informações de que dispuser" [D03 art. 4º §1º] e deve adotar medidas que comprovem
  o cumprimento [art. 4º §2º]. *Verificado (texto) / inferido (opção da Cláusula 4).* A dúvida sobre quem é o
  "exportador" (quem transmite é o servidor do Luminaris) está em §4, A1.
- **Transparência da transferência:** o controlador publica na internet, em português, a forma, a duração e a
  finalidade, o país de destino, os agentes e os direitos do titular [D03 art. 17 §2º; Anexo II Cl. 14]. Também
  entrega ao titular, se ele pedir, a íntegra das cláusulas em 15 dias [art. 17 §1º]. *Verificado.*

**Q3. Base legal do tenant (art. 7º).** O teammate é um **meio** de tratar o dado. A base é a da finalidade que
o tenant já tem, e a mesma base serve à transferência [D03 art. 9º I]. As que cabem: **V** (execução de contrato
com o titular: cobrar e conciliar o que o cliente comprou), **II** (obrigação legal: escrituração), **X**
(proteção do crédito: cobrança) e **IX** (legítimo interesse: gestão). Consentimento não é exigido, e dispensá-lo
não dispensa as demais obrigações [D01 art. 7º §6º]. Se o tenant usar **legítimo interesse**, vêm três ônus a mais:
só os dados "estritamente necessários" [art. 10 §1º], medidas de transparência [§2º] e possível pedido de relatório
de impacto [§3º]. O registro das operações [art. 37] vale "especialmente" nesse caso. *Verificado (texto) /
inferido (enquadramento).*

**Dado financeiro:** não é dado sensível. A lista do art. 5º II é fechada (origem racial, saúde, biometria etc.),
então o art. 11 não se aplica. *Verificado.* O sigilo bancário obriga "as instituições financeiras" [D11 LC 105
art. 1º], não o correntista: o tenant mandar o próprio extrato não viola sigilo bancário. *Inferido.* O extrato,
porém, traz dado de **terceiros que não são clientes** (quem mandou o Pix, fornecedores), que também é dado pessoal
e entra no mesmo dever de base legal e minimização. Dado financeiro pode tirar do tenant pequeno os benefícios da
Res. 2/2022 (§4, A4).

**Q4. O que o produto precisa entregar.**

*Obrigação do tenant (controlador). O Luminaris entrega ferramenta, não cumpre por ele:*
1. Base legal e finalidade de cada teammate [D01 art. 7º; art. 6º I].
2. Aviso ao titular: finalidade, uso compartilhado e responsabilidades dos agentes [D01 art. 9º I, V e VI], mais a
   página sobre a transferência internacional [D03 art. 17 §2º].
3. Mecanismo de transferência no contrato com o provedor (cláusulas-padrão ANPD ou região UE) [D03 arts. 9º e 16].
4. Registro das operações [D01 art. 37]. Pode ser o registro simplificado [D04 art. 9º] se for agente de pequeno
   porte e não fizer tratamento de alto risco.
5. Encarregado [D01 art. 41], ou, se for de pequeno porte, um canal de comunicação [D04 art. 11 §1º].
6. Atender ao titular [D01 art. 18] e comunicar incidente em 3 dias úteis [D10 Res. 15/2024 arts. 6º e 9º;
   D01 art. 48].
7. Dar instruções ao operador e verificar se ele as cumpre [D01 art. 39].

*Obrigação do Luminaris (operador), com o recurso de produto correspondente:*
| Obrigação | Fonte | O que o produto entrega |
|---|---|---|
| Tratar só conforme a instrução do tenant | [D01 art. 39; art. 42 §1º I] | Envio só do que o tenant configurou: provedor, região/país e **lista de campos permitidos por teammate**, com padrão conservador. Campo fora da lista não sai (trava no código, não no prompt). |
| Manter **registro das operações que realizar** (vale também para o operador) | [D01 art. 37] | Log por envio: quando, qual teammate e quem acionou, qual provedor ou servidor MCP e país, quais categorias de campo, quantos registros, finalidade. Exportável para o registro do tenant. Sem o conteúdo (OBS-R11/PII). |
| Minimização | [D01 art. 6º III; D03 art. 9º par. ún.] | Exclusão de campo por teammate. Pseudonimização opcional antes do envio (nome → id curto; CPF e conta mascarados). |
| Segurança desde a concepção | [D01 arts. 46 §2º, 47 e 49] | Chave BYOK cifrada (já no BRIEF); nada de dado do tenant em log de terceiro. |
| Auxiliar o controlador na transferência | [D03 art. 4º §1º] | Tela ou documento por provedor e por servidor MCP: país de destino, quem é o importador, onde achar o DPA/cláusulas do provedor. |
| Dar ciência ou obter autorização para suboperador | [D05 §§54, 67] (guia, não norma) | Lista pública de suboperadores do próprio Luminaris (VPS/hospedagem, e-mail etc.), com aviso de mudança. |
| Contrato de operador com o tenant | [D05 §55]: a LGPD não exige expressamente, o guia chama de "boa prática" | Termo de tratamento (DPA) Luminaris↔tenant: instruções, finalidade, suboperadores, **prazo para o Luminaris avisar o tenant de incidente** (menor que os 3 dias úteis do tenant [D10 art. 6º]), devolução e eliminação no fim do contrato, auxílio a pedidos de titular. |
| Transparência do controlador (é do tenant; o produto ajuda) | [D01 art. 9º; D03 art. 17 §2º] | Gerador de texto do aviso e da página de transferência a partir da configuração real (provedor, país, finalidade). |

**Q5. Servidor MCP de terceiro.** Vale a mesma análise das Q1–Q4, com quatro diferenças:
(i) **O conteúdo da chamada é escrito pelo modelo**, não pelo tenant, e pode levar mais dado do que o tenant quis.
A confirmação humana (F-TM-12) só cumpre o art. 39 se mostrar o **conteúdo literal** que vai sair e o servidor de
destino. Sem isso, a "instrução" do tenant é genérica. *Inferido.*
(ii) Servidor fora do Brasil = transferência internacional. O mecanismo, de novo, é do contrato tenant↔fornecedor
do MCP [D03 arts. 4º e 9º]. A lista de servidores MCP do tenant entra no aviso e no registro.
(iii) **Cadeia:** o dado vai ao provedor de IA (prompt), o provedor escreve a chamada, o Luminaris a envia ao
servidor MCP, e o resultado volta ao prompt. São dois destinatários por turno, e os dois entram no registro do
art. 37. Dado vindo de fora e tratado aqui segue sob a LGPD [D03 art. 8º]. *Inferido.*
(iv) Proibir stdio (F-TM-12) não muda nada na LGPD. Muda a segurança [D01 art. 46].

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Controlador | LGPD art. 5º VI | [D01] | "a quem competem as decisões referentes ao tratamento de dados pessoais" |
| Operador | LGPD art. 5º VII | [D01] | "que realiza o tratamento de dados pessoais em nome do controlador" |
| Instruções | LGPD art. 39 | [D01] | "O operador deverá realizar o tratamento segundo as instruções fornecidas pelo controlador" |
| Registro | LGPD art. 37 | [D01] | "O controlador e o operador devem manter registro das operações de tratamento de dados pessoais que realizarem" |
| Solidariedade | LGPD art. 42 §1º I | [D01] | "quando não tiver seguido as instruções lícitas do controlador, hipótese em que o operador equipara-se ao controlador" |
| Mecanismos | LGPD art. 33 I, II "b", VIII, IX | [D01] | "II - quando o controlador oferecer e comprovar garantias … b) cláusulas-padrão contratuais" |
| Base + mecanismo | Res. 19/2024 Anexo I art. 9º | [D03] | "desde que amparada em: I - uma das hipóteses legais previstas no art. 7º … e II - um dos seguintes mecanismos válidos" |
| Dever do controlador | Res. 19/2024 Anexo I art. 4º | [D03] | "Cabe ao controlador verificar … se a operação de tratamento" |
| Auxílio do operador | Res. 19/2024 Anexo I art. 4º §1º | [D03] | "O operador prestará auxílio ao controlador mediante o fornecimento das informações de que dispuser" |
| Cláusulas sem alteração | Res. 19/2024 Anexo I art. 16 | [D03] | "adoção integral e sem alteração do texto disponibilizado no Anexo II" |
| Página de transparência | Res. 19/2024 Anexo I art. 17 §2º | [D03] | "publicar em sua página na Internet documento contendo informações em língua portuguesa" |
| Prazo de adaptação | Res. 19/2024 art. 2º par. ún. | [D03] | "no prazo de até 12 (doze) meses, contados da data de publicação desta Resolução" |
| UE adequada | Res. 32/2026 art. 1º | [D09] | "Fica reconhecida a União Europeia como organismo internacional que proporciona grau de proteção de dados pessoais adequado" |
| Suboperador | Guia ANPD v2 §65 | [D05] | "A relação direta do suboperador é com o operador e não com o controlador" |
| Pequeno porte, alto risco | Res. 2/2022 Anexo art. 4º II "a" | [D04] | "uso de tecnologias emergentes ou inovadoras" |
| Sigilo bancário | LC 105/2001 art. 1º | [D11] | "As instituições financeiras conservarão sigilo em suas operações ativas e passivas" |

## 3. Vigência conferida
- **Alertas do acervo e como foram resolvidos.** [D01] LGPD compilada, cópia de 13/10/2026, sem alerta mecânico.
  Mas a Res. CD/ANPD 33/2026 do próprio acervo chama a ANPD de "Agência", e a cópia não traz isso: é evidência de
  texto mais novo. Conferi no Planalto [D02]: a **Lei 15.352/2026** mudou só a parte institucional (art. 5º VIII
  e XIX, art. 55-A e seguintes). Os trechos citados dos arts. 33, 35, 37, 39 e 42 e do art. 7º IX são iguais
  palavra por palavra no Planalto (conferido por busca literal). [D11] LC 105 compilada, sem alerta.
- **ANPD fora do acervo.** O acervo tem só resoluções administrativas da ANPD (12, 13, 14, 16, 20/2024;
  24–28/2025; 33/2026). Faltam as Res. 2/2022, 15/2024, 19/2024 e 32/2026, então fui à fonte oficial: [D03] e
  [D04] no portal gov.br/anpd; [D09] no DOU de 27/01/2026, p. 49 (PDF espelhado na Biblioteca Digital do MJ),
  com a versão oficial em inglês [D07]; [D10] na Biblioteca Digital do MJ. O `baixar` do in.gov.br deu 403, e o
  navegador embutido não tinha permissão para o domínio.
- **Redação atual.** Res. 19/2024: o portal da ANPD diz "Vigente com as alterações da RETIFICAÇÃO DE 18/08/2025"
  (itens 15.2 e 15.3 das cláusulas, prazos de resposta ao titular). O texto do portal [D03] declara essa
  retificação incorporada. Não uso os itens 15.2 e 15.3. Res. 2/2022: "Vigente com alterações pela Res. 15/2024"
  (incidente simplificado); os arts. 4º, 9º e 11 citados não estão entre os alterados, segundo a lista do portal
  (*inferido*: não li o texto da alteração). Res. 32/2026: vigente desde a publicação, com reavaliação em até
  4 anos [art. 4º §1º].
- **Regulamentação pendente ou norma mais específica.** O marco legal de IA (**PL 2338/2023**) **não é lei**: em
  agosto de 2026 aguardava votação na Câmara (Rádio Senado, 03/08/2026: <https://www12.senado.leg.br/radio/1/noticia/2026/08/03/conselho-de-comunicacao-social-debate-marco-legal-da-inteligencia-artificial>; ficha no LexML: <https://www.lexml.gov.br/urn/urn:lex:br:senado.federal:projeto.lei;pl:2023;2338>. Status lido no resultado de busca, sem abrir a ficha da Câmara: *inferido*). A ANPD não tem
  regulamento próprio de IA entre as resoluções listadas como vigentes no portal (consultado em 29/10/2026).

## 4. Ambiguidades (só o que precisa de decisão humana)

**A1. Com BYOK, quem é o "exportador": o tenant ou o Luminaris?**
- *Leitura 1:* o exportador é o tenant (controlador, dono do contrato e da chave), e o Luminaris é só o meio
  técnico. As cláusulas ficam no contrato tenant↔provedor (Opção A). O Luminaris não assina nada com o provedor.
- *Leitura 2:* o exportador é quem "transfere" [D03 art. 3º I], e quem transmite é o servidor do Luminaris
  (operador). Seria a Opção B, com o tenant como "Terceiro Controlador", o que exige um contrato
  Luminaris↔provedor que o BYOK não tem.
- *Mais segura:* Leitura 1 no produto (o tenant mostra o mecanismo dele), mais o dever de auxílio do art. 4º §1º.
  Se a Leitura 2 prevalecer, o BYOK puro não fecha, e o Luminaris precisa de conta própria com o provedor, o que
  reabre o F-TM-6.
- *Pergunta ao advogado:* "Num SaaS em que o cliente (controlador) contrata o provedor de IA estrangeiro com chave
  própria e o nosso servidor só transmite a chamada em nome dele, o exportador para a Res. CD/ANPD 19/2024 é o
  cliente ou nós? Bastam as cláusulas-padrão no contrato do cliente com o provedor (Opção A da Cláusula 4)?"

**A2. O art. 33 IX (com o art. 7º V) cobre o envio à IA sem cláusulas?**
- *Sim:* a cobrança e a conciliação executam o contrato com o titular, e a IA é o meio.
- *Não:* o inciso exige transferência "necessária". A conciliação existe sem IA, e o art. 9º par. ún. da Res. 19
  pede o mínimo necessário.
- *Mais segura:* não depender do IX. Usar região UE ou cláusulas-padrão.
- *Pergunta:* "O art. 33 IX da LGPD ampara o envio de dados de clientes a um modelo de IA no exterior para
  conciliar e cobrar, ou só a adequação e as cláusulas-padrão servem?"

**A3. O provedor de IA é só operador?** Depende de os termos de API do provedor permitirem uso do dado para fim
próprio (treino, retenção para monitorar abuso). Se permitirem, para esse fim ele é **controlador**: é
compartilhamento com outro controlador [D01 art. 9º V], com base legal própria. Isso é fato contratual de cada
provedor, não norma. **Lido em 29/10 (§6):** nos planos pagos, nenhum dos três treina com o dado de API
[D13 B; D16; D20]. Os três guardam os dados por um tempo limitado para monitorar abuso: OpenAI até 30 dias [D16],
Google "for a limited period of time" [D20], e a Anthropic pode reter "to combat harmful use" [D12 H.1.b]. Essa
retenção para segurança do próprio serviço é a zona cinzenta. A leitura mais segura é tratá-la como parte do
serviço de operador e citá-la no aviso ao titular. O **plano gratuito da Gemini API usa o dado para melhorar
produtos e pode ter revisão humana** [D20]: lá o Google é controlador, e o produto tem de recusar essa chave.

**A4. O tenant pequeno perde os benefícios da Res. 2/2022?** IA conta como critério específico de alto risco
("tecnologias emergentes ou inovadoras") [D04 art. 4º II "a"]. Falta um critério geral: larga escala, ou afetar
"significativamente" direitos [art. 4º I]. A cobrança automatizada pode afetar crédito e acesso a serviço
[§2º]. Se for alto risco, o tenant **não** tem registro simplificado nem dispensa de encarregado [art. 3º I].
*Leitura mais segura:* o produto não promete o regime simplificado ao tenant que usa teammate de cobrança. O
registro do art. 37 sai completo do log de qualquer forma.
- *Pergunta:* "Uma ME/EPP que usa agente de IA para conciliar extrato e redigir cobrança (sempre com envio
  confirmado por humano) faz 'tratamento de alto risco' pelo art. 4º da Res. CD/ANPD 2/2022?"

**A5. A lista padrão de campos enviados é "elemento essencial"?** Se o Luminaris define sozinho quais dados vão
à IA, pode estar decidindo a "natureza dos dados" [D05 §38], que é decisão de controlador. *Mais segura:* o
padrão vem conservador e é configurável, e o tenant confirma a lista ao ligar o teammate. Assim a escolha fica
dele. É desenho de produto, sem pergunta ao advogado.

## 5. Lacunas
- **L1. Contratos dos provedores: FECHADA em 29/10.** Resultado no §6. Ficam abertos dois pontos menores: (a) se o
  Claude pelo Google Cloud (modelo de parceiro) está sob o DPA do Google ou sob os termos da Anthropic. A
  residência na UE está verificada [D22]; a cobertura contratual é *inferida*, porque não achei cláusula que inclua
  nem que exclua os modelos de parceiro do CDPA [D18]. (b) Qual entidade do Google contrata com o tenant brasileiro:
  isso decide qual versão das BR SCCs se aplica [D18 Brazil 3.1].
- **L2. Hospedagem do próprio Luminaris (decisão do dono, ainda aberta):** o ADR-M2 deixa em aberto "qual
  VPS/provedor concreto". A LGPD não exige hospedar no Brasil: não há regra de localização de dado para ERP privado
  nas normas lidas. O que ela exige é o mecanismo do art. 33 para qualquer saída do país. Critério para a escolha,
  da mais simples para a mais trabalhosa:
  (1) **região no Brasil**: não há transferência internacional na hospedagem;
  (2) **região na UE/EEE**: adequada pela Res. 32/2026, sem cláusula [D09];
  (3) **qualquer outro país**: só se o contrato do provedor de VPS trouxer as BR SCCs integrais [D03 art. 16]. Se
  não trouxer, todo o ERP fica sem mecanismo, com ou sem teammate.
  Nos casos (2) e (3), o Luminaris (operador) é o exportador perante a hospedagem (suboperador), que é a Opção B da
  Cláusula 4 com o tenant como "Terceiro Controlador" [D03 Anexo II], e a hospedagem entra na lista de
  suboperadores e no aviso do tenant.
- **L3.** Res. CD/ANPD 18/2024 (encarregado) e o texto das alterações da Res. 15/2024 na Res. 2/2022 não foram
  lidos. Não mudam a conclusão, mas entram no DPA.
- **L4.** Não achei norma que fixe prazo para o **operador** avisar o controlador de incidente. A Res. 15/2024 fala
  só do controlador [D10 art. 6º]. O prazo vai para o contrato.
- **L5.** O guia da ANPD [D05] é a versão 2.0 de abril/2022 e não é vinculante. Não verifiquei se há versão mais
  nova.
- **Fora de escopo (achado):** o chat agente que já existe (I11, `OPENAI_API_KEY` do cliente, ADR-M2 decisão 3) já
  manda dado de tenant à OpenAI. A mesma análise vale para ele hoje, independente dos teammates. Pelo §6, a API
  direta da OpenAI não tem mecanismo pronto para dado vindo do Brasil.

## 6. Contratos dos provedores de IA (L1, lidos em 29/10/2026)

São documentos de fornecedor, não normas. Valem como prova do que cada contrato diz na data. Arquivos e SHA-256
estão na tabela de fontes de fornecedor abaixo.

| | **Google**: Gemini API paga e Vertex (Google Cloud) | **Anthropic**: API direta | **OpenAI**: API direta |
|---|---|---|---|
| Cláusulas-padrão **da ANPD** no contrato | **Sim.** O CDPA do Google Cloud tem a seção "Brazil", com BR SCCs controlador→operador e operador→operador [D18], e o texto é o da ANPD: "aprovadas pela Autoridade Nacional de Proteção de Dados (ANPD)" [D19 Cl. 1]. A Gemini API paga segue o DPA de operador do Google [D20], que tem a "PART C - ADDITIONAL TERMS FOR LGPD" com BR SCCs [D21]. | **Não.** O DPA (em vigor desde 24/02/2025) incorpora só as SCCs da UE (Módulos 2 e 3), o adendo do Reino Unido e o da Suíça [D12 I.1; Schedule 3]. Não menciona Brasil, LGPD nem ANPD. | **Não.** O DPA (em vigor desde 01/01/2026) trata só de "Dados do EEE e da Suíça" e "Dados do Reino Unido", com as SCCs da Comissão Europeia [D15 §4]. Não menciona Brasil, LGPD nem ANPD. |
| Processar na UE (adequada pela Res. 32/2026) | **Sim, no Vertex**: os endpoints multi-região UE mantêm o processamento na UE [D22]. Modelos Gemini 3.5–4 e **Claude (Haiku/Sonnet/Opus 4.5–5.5, Fable)** constam como "EU multi-region: Supported" [D22]. A Gemini API (ai.google.dev) guarda logs "in any country" [D20] e não tem residência. | **Não.** `inference_geo` só aceita "global" ou "us", e o armazenamento só "us": "Currently, "us" is the only available workspace geo" [D14]. | **Sim, com condições**: a região Europa (EEE + Suíça) existe, mas exige aprovação comercial, controles de monitoramento de abuso e uma emenda de retenção: "To use data residency with any region other than the United States, you must be approved for abuse monitoring controls, and execute a Modified Retention amendment" [D17]. |
| Processar no Brasil (sem transferência) | Só o **Gemini 2.5 Flash (128k)** em southamerica-east1 [D22]. Os modelos atuais não têm essa opção. | Não. | Não: a lista de regiões não tem o Brasil [D17]. |
| Treino com dado de API | Não, no plano pago [D20]. **O plano gratuito treina e pode ter revisão humana** [D20]. | Não: "Anthropic may not train models on Customer Content from Services" [D13 B]. | Não, por padrão [D16; D17]. |
| Retenção para abuso | Logs "for a limited period of time" [D20] | Pode reter "to combat harmful use of the Services" [D12 H.1.b] | Até 30 dias. Retenção zero (ZDR) só com aprovação [D16] |

**O que isso muda na conclusão (inferido sobre o que foi lido):**
1. **Caminho de menor atrito para o piloto (PR-8): Google Cloud.** Pode ser Gemini ou Claude pelo Vertex, no
   endpoint multi-região UE. Fica com dois amparos: adequação, porque o destino é a UE [D09 art. 1º], e as BR SCCs
   do CDPA como reserva [D18 Brazil 3.1]. A Gemini API paga também serve, com as BR SCCs [D21], mas sem residência.
2. **A API direta da Anthropic não tem mecanismo do art. 33 pronto.** Não traz BR SCCs, e não há região UE nem
   Brasil. Um tenant pequeno não consegue fazer a Anthropic assinar as cláusulas da ANPD integrais [D03 art. 16].
   Restariam o art. 33 IX (A2, leitura fraca) ou o consentimento específico (inviável). Para dado pessoal real, o
   adaptador direto da Anthropic **não deve ficar disponível** até a Anthropic publicar BR SCCs ou região UE. O
   Claude continua disponível pelo Google Cloud.
3. **A API direta da OpenAI** só fecha se o tenant for aprovado para a região Europa e assinar a emenda de retenção
   [D17]. Sem isso, a situação é a mesma da Anthropic. Isso alcança **o chat agente que já existe** (achado acima).
4. **Travas de produto novas:** (a) recusar chave Gemini sem projeto com faturamento [D20 "Unpaid Services"];
   (b) no Vertex, usar endpoint regional ou multi-região UE e nunca o global, que "don't provide regional isolation
   or data residency guarantees" [D22]; (c) a tela de destino da Q4 mostra provedor, região e mecanismo
   (adequação UE / BR SCCs / nenhum), e com "nenhum" o envio de dado pessoal fica bloqueado.
5. **Efeito no F-TM-9 (SDK oficial por provedor):** o Claude pelo Vertex usa o cliente Vertex do SDK oficial da
   Anthropic. Não pede adaptador novo de fora, mas pede o modo "Claude via Google Cloud" no adaptador Anthropic.
   Isso é decisão de produto e volta ao PRE-ADR, não a esta pesquisa.

### Fontes de fornecedor (não normativas)
| Id | Documento | Origem | Lido | SHA-256 |
|---|---|---|---|---|
| D12 | Anthropic Data Processing Addendum (efetivo 24/02/2025) | <https://www.anthropic.com/legal/data-processing-addendum> (curl) | 2026-10-29 | `42ee5e9feda6af923947ec2b2636a4ccea78f641b4d7584cb723c86cfb3cfc5e` |
| D13 | Anthropic Commercial Terms (efetivo 17/06/2025) | <https://www.anthropic.com/legal/commercial-terms> (curl) | 2026-10-29 | `e6ac4a73d651c69637ed0f7271aa835966a0fb901bad3c4d7899053ba5062c6f` |
| D14 | Anthropic — Data residency | <https://platform.claude.com/docs/en/build-with-claude/data-residency> (curl) | 2026-10-29 | `e4ce1eae50f36bffc1c9a95628c8457ccf2f5e9afd5c73f0668cbe1417eb0d25` |
| D15 | OpenAI DPA (vigente 01/01/2026), trechos | <https://openai.com/pt-BR/policies/data-processing-addendum/> (navegador; curl 403) | 2026-10-29 | `37ed1cfb3c123bf96fae176a799acaec41970011bdede878a1fcd38f26961405` |
| D16 | OpenAI Privacidade empresarial (08/01/2026), trechos | <https://openai.com/pt-BR/enterprise-privacy/> (navegador; curl 403) | 2026-10-29 | `d4b8d65e350b38c65c818860b15d4e685daf84b0489e13fae4b0c35788c25892` |
| D17 | OpenAI — Data controls / data residency | <https://developers.openai.com/api/docs/guides/your-data> (curl) | 2026-10-29 | `831eeab4c90b9d5ba19cea6beb2edc41bd06663466f0ab810b2a553666d1ab57` |
| D18 | Google Cloud Data Processing Addendum (CDPA), seção Brazil | <https://cloud.google.com/terms/data-processing-addendum> (curl) | 2026-10-29 | `b716fab82d99fcf1e1bdfdb87acb325536f6c0c340a05ae12b186b5113521639` |
| D19 | Google — BR SCCs (Controller-to-Processor) | <https://cloud.google.com/sccs/br-c2p?hl=pt-br> (curl) | 2026-10-29 | `8eb683efa2c71d519d2d789515d5ca216f8906400a0e0adb4217388e93de6ab3` |
| D20 | Gemini API Additional Terms (atualizado 28/04/2026) | <https://ai.google.dev/gemini-api/terms> (curl) | 2026-10-29 | `b6f41e84292f39299066fecaaf05ba1ebcac4a6c4300c15bfc878b7ac515efce` |
| D21 | Google Data Processing Addendum (processor terms), Part C LGPD | <https://business.safety.google/processorterms/> (curl) | 2026-10-29 | `2aa7653d04060f3e906cfb968c213d6549fbd2a1ae3e7f56797c906a19b45acb` |
| D22 | Vertex AI — Data residency (atualizado 28/10/2026) | <https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency> (curl) | 2026-10-29 | `6ab60506d6c91cfcf2f3ecfa1496734a9814a3cbb2bade4af2bcda9ef92d0485` |

Os `.txt` em `docs/` são a conversão do HTML para texto (D15 e D16: trechos copiados do `innerText` no navegador
embutido). A página do fornecedor muda sem aviso: confira a data de vigência antes de citar de novo.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.709 de 14/08/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://raw.githubusercontent.com/ctresb/leis/main/federal/leis-ordinarias/2018/lei-13709-2018-08-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T10:37:18-03:00 · arquivo local `docs/D01_lei-13709-2018-08-14.md` · SHA-256 `72d32431037ce85955c6f959f50f11d10971a8ec36f93cdae5ee3459ec66a4dd`
- **[D02]** L13709compilado — Presidência - legislação federal  
  Link oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>  
  Baixado em 2026-10-29T10:40:20-03:00 · arquivo local `docs/D02_l13709compilado-htm.html` · SHA-256 `448923dd27acc805c3815ecd424eee2b8bea225023faec1fdc793a3f1ebacbc3`
- **[D03]** Resolução CD/ANPD nº 19, de 23 de agosto de 2024Portal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024>  
  Baixado em 2026-10-29T10:40:59-03:00 · arquivo local `docs/D03_resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024.html` · SHA-256 `7d9ba0caae6ace4ea5a3ac907988616dbef35b437835778c40cb9c4efb131033`
- **[D04]** Resolução CD/ANPD nº 2, de 27 de janeiro de 2022Portal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022>  
  Baixado em 2026-10-29T10:41:00-03:00 · arquivo local `docs/D04_resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022.html` · SHA-256 `91a5c27919a7f6d4a6e9a9ff09f2401bc7aaa42eaddce0585f0e58fdc0d62584`
- **[D05]** D05_file — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/Segunda_Versao_do_Guia_de_Agentes_de_Tratamento_retificada.pdf/@@display-file/file>  
  Baixado em 2026-10-29T10:41:02-03:00 · arquivo local `docs/D05_file.pdf` · SHA-256 `3df770f01a744b52ee3c989efe1179a4008d115606dbf52ce7378419d078dc79`
- **[D06]** Transferência Internacional de DadosPortal Gov.br — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados>  
  Baixado em 2026-10-29T10:41:04-03:00 · arquivo local `docs/D06_transferencia-internacional-de-dados.html` · SHA-256 `8b19ba4900be8d24ce921a5f154244f6d96b249fa338695b6da664c0d922b961`
- **[D07]** D07_file — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/outros-documentos-e-publicacoes-institucionais/resolucao-no-32-decisao-de-adequacao-uniao-europeia-em-lingua-inglesa.pdf/@@display-file/file>  
  Baixado em 2026-10-29T10:42:39-03:00 · arquivo local `docs/D07_file.pdf` · SHA-256 `ab49c59f1bd94e6bf450be48fa6b08158c847d76bf3f93e5e3dbb69415ed19eb`
- **[D08]** DSpace MJ: Resolução n° 32, de 26 de janeiro de 2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://bibliotecadigital.mj.gov.br/handle/1/16638>  
  Baixado em 2026-10-29T10:42:39-03:00 · arquivo local `docs/D08_16638.html` · SHA-256 `8ba6fba4018ac207614a84e99ab1a0cdefee81bcf1b3a3d1f8fdfe1c4ef65e35`
- **[D09]** D09_RES_ANPD_2026_32-pdf — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://bibliotecadigital.mj.gov.br/bitstream/1/16638/2/RES_ANPD_2026_32.pdf>  
  Baixado em 2026-10-29T10:42:53-03:00 · arquivo local `docs/D09_RES_ANPD_2026_32-pdf.pdf` · SHA-256 `76426a2d8d2ed3465f9f20a5e9c5ba8f9ef308bfbb63b45eabebb3178d6b731f`
- **[D10]** SEI/MJ - 27699864 - Resolução nº — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://bibliotecadigital.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html>  
  Baixado em 2026-10-29T10:43:04-03:00 · arquivo local `docs/D10_RES_ANPD_2024_15-html.html` · SHA-256 `6cb59670af64123f857fce1f9ea4f6af5031f74d552960468fff39b758fbccbc`
- **[D11]** Lei Complementar nº 105 de 10/01/2001 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/1519d381c919632bf1f0b640f509ad916ad04fab/federal/leis-complementares/2001/lcp-105-2001-01-10.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2001-01-10;105> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-29T10:43:42-03:00 · arquivo local `docs/D11_lcp-105-2001-01-10.md` · SHA-256 `01ba671c03a308f6a83c7720ba6deb49ab1dad35d65425211580585c5c1d18b4`

## Registro de buscas
_Nenhuma busca registrada._
