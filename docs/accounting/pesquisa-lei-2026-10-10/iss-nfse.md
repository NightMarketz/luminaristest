# Pesquisa em fonte primária: bloco ISS / NFS-e / PNCT / emissão (10/10/2026)

**Autorização:** dono, chat, 10/10: "Sim, roda a pesquisa para termos um questionário mais completo e assertivo".
**Escopo:** perguntas de `docs/plano/PERGUNTAS-DE-LEI-2026-10-10.md` §4 (bloco ISS/NFS-e), mais as linhas
correlatas do §1.6, do §3 (Prefeitura SP e Sistema Nacional) e da §9. **Fora do escopo:** as datas da NFS-e do
Simples (outro agente). Nenhum arquivo do repositório foi editado.

**Em duas linhas:** 12 de 21 itens se resolvem pela fonte primária. 9 ficam PARCIAIS, e nenhum ficou sem leitura.
O que mais destrava: (1) **em SP, o simples pagamento antecipado não é parâmetro para emitir NFS-e**. A
emissão é "por ocasião da efetiva prestação de cada serviço" (Lei SP 13.701 art. 6º; RISS art. 81; Solução de
Consulta SF/DEJUG 06/2018, sobre crédito pré-pago). Isso sustenta a tese de que o saldo vencido sem prestação
não gera ISS (PE-4), mas nenhuma norma trata da expiração em si. (2) **A alíquota de ISS em SP para os
subitens 6.01, 6.02 e 6.03 é 5%** (art. 16 IV), sem redução nem benefício. (3) **Nenhum tomador retém ISS dos
serviços do salão em SP.** (4) **O PNCT (Ato Conjunto 5) só alcança obrigações de IBS/CBS.** Ele não define
"inconsistência" e não alcança o Simples em 2026.
**Risco principal:** a tese do PE-4 continua sendo leitura (inferida) da letra da lei e de uma consulta sobre
outro serviço. Quem fecha é o contador ou uma consulta formal à SF/DEJUG.

## Fontes baixadas (todas em 10/10/2026, em `scratchpad/lei/`)

| Fonte | URL | Conferência |
|---|---|---|
| LC 116/2003 compilada | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm | 104.392 bytes, mesmo tamanho do MANIFEST (`lc-116-2003`) |
| CTN compilado | https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm | — |
| LC 214/2025 compilada (com a LC 227/2026) | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm | 5.403.613 bytes |
| Ato Conjunto RFB/CGIBS nº 5/2026 | https://www.cgibs.gov.br/upload/arquivos/202608/13065932-ato-conjunto-rfb-cgibs-n-c2-ba-5-2026-regulamenta-o-programa-nacional-de-conformidade-tributaria-docx-assinado.pdf | sha256 `251f7a8d886b…`. É idêntico ao PDF que circula em reformatributaria.com |
| Manual API Emissor Público v1.2, Manual APIs ADN, Anexo I v1.01, Anexo II v1.01, Anexo IV ADN v1.00, Anexo B v1.01, XSD v1.01, Guia Emissor Web v1.2 | gov.br/nfse/.../documentacao-atual/ (nomes no MANIFEST) | **os 8 sha256 batem com o MANIFEST** (ac2f36e34ff5, 9ffc97d8b1be, de5bc492959e, 5abe83d7e510, fa778d0b6e58, e74b0be8ad20, e7935cbd9470, 85982d1ee76b). A página "documentação atual" não tem versão mais nova |
| Manual Municípios API Emissor Público v1.2 | gov.br/nfse/.../manual-municipios-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out21025.pdf | sha256 `3b5e982be929…` (não estava no corpus) |
| Página "APIs – Prod. Restrita e Produção" | https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao | atualizada em 20/08/2026 |
| Lei SP 13.701/2003 (multivigente) | https://legislacao.prefeitura.sp.gov.br/leis/lei-13701-de-24-de-dezembro-de-2003 | catálogo oficial da Casa Civil de SP |
| Decreto SP 53.151/2012 (RISS, multivigente) | https://legislacao.prefeitura.sp.gov.br/leis/decreto-53151-de-17-de-maio-de-2012 | idem |
| Solução de Consulta SF/DEJUG 06/2018 | https://drive.prefeitura.sp.gov.br/cidade/upload/sc006-2018_1530720423.pdf | PDF oficial da prefeitura |
| Solução de Consulta SF/DEJUG 11/2020 | https://www.prefeitura.sp.gov.br/cidade/upload/sc_11-2020_1594393170.pdf | idem (lida só pela ementa e pelo resumo) |

**Limite de leitura:** o catálogo municipal mostra todas as redações de cada dispositivo, empilhadas. Tomei como
vigente a última redação listada. Uma alteração posterior a 2023 que o catálogo ainda não tenha incorporado
não aparece aqui. Os endpoints `adn.nfse.gov.br/parametrizacao` e o swagger da Sefin recusam conexão sem mTLS
(ECONNRESET/403), por isso **não li o conteúdo da API de parâmetros municipais**.

---

## 1. PNCT: Ato Conjunto RFB/CGIBS nº 5/2026 (o que é inconsistência, canal, prazo)
- **Status:** PARCIAL. O canal e o prazo estão resolvidos. O que conta como "inconsistência" o Ato não define.
- **Resposta:**
  - O Ato regula o PNCT só para 2026, com a finalidade de "adaptação assistida" às obrigações de **emissão de documentos fiscais de IBS/CBS**.
  - Fica enquadrado quem cumpre as obrigações acessórias de IBS/CBS. Quem não cumpre continua dentro se atender, cumulativamente, a quatro critérios: (i) aumento progressivo de documentos com IBS/CBS corretos; (ii) resposta tempestiva às intimações; (iii) retificação até 31/12/2026; (iv) contador responsável indicado.
  - Canal: as comunicações vão a um "sistema eletrônico que controle a habilitação legal" (procuração eletrônica) e podem ser compartilhadas com o contador indicado, se houver autorização expressa (art. 3º, § 1º).
- **Citação:**
  - art. 2º § 1º III: "promover, até 31 de dezembro de 2026, a retificação das inconsistências comunicadas pela administração tributária".
  - art. 2º § 2º I: as comunicações "não excluem a espontaneidade" se ficarem no cruzamento/monitoramento do art. 329 da LC 214.
- **Fonte:** CGIBS (URL acima), lida em 10/10/2026. Base legal: LC 214 arts. 471-A a 471-C (red. LC 227/2026), lidos no Planalto.
- **Grau:** primária. A conclusão de que o PNCT não alcança o Simples em 2026 é **inferida**: a LC 214 art. 348 III c diz que as alíquotas de teste "não serão aplicadas em relação às operações dos contribuintes optantes pelo Simples Nacional".
- **Pergunta reformulada (contador):** "Pelo Ato Conjunto RFB/CGIBS 5/2026, arts. 1º e 2º, e pela LC 214 art. 348 III c, entendemos que o PNCT de 2026 só cobra correção de campos de IBS/CBS em documentos fiscais e que um salão no Simples não tem inconsistência PNCT a corrigir em 2026. Confirma? Se não, qual norma estende o PNCT ao optante?" Para o regime regular: "O senhor aceita ser indicado como profissional responsável (art. 2º § 1º IV) e receber as comunicações por procuração eletrônica (art. 3º § 1º)?"

## 2. PAR-1: cruzamento ADN × ECF é inconsistência PNCT?
- **Status:** PARCIAL.
- **Resposta:** o Ato 5 não lista hipóteses de inconsistência. A LC 214 art. 329 I define "cruzamento de dados" de forma genérica, como confronto entre bases da administração. Nenhuma norma lida diz que a divergência entre ADN e ECF é, em si, uma inconsistência PNCT. O escopo do Ato é o documento fiscal de IBS/CBS, e a ECF é de IRPJ/CSLL.
- **Citação:** LC 214 art. 329 I: "o confronto entre as informações existentes na base de dados das administrações tributárias ou do Comitê Gestor do IBS".
- **Fonte:** Planalto, LC 214 compilada; Ato 5 (CGIBS), 10/10/2026.
- **Grau:** primária (texto); inferido (aplicação ao par ADN × ECF).
- **Pergunta reformulada (contador):** "Pelo Ato Conjunto 5/2026 (art. 2º § 2º I) e pela LC 214 art. 329, entendemos que uma divergência entre a receita das NFS-e no ADN e a ECF pode gerar comunicação de cruzamento, mas não é 'inconsistência PNCT', que trata de campos de IBS/CBS no documento. Confirma? Se não, qual ato publica os critérios de cruzamento?"

## 3. PAR-6: emissão em mês posterior ao da competência é inconsistência?
- **Status:** PARCIAL.
- **Resposta:** o leiaute aceita: a regra só rejeita competência **posterior** à emissão (E0015). `dCompet` deve ser a data da prestação, e o prazo para converter a DPS em NFS-e é municipal. Nenhuma regra nacional e nada no Ato 5 tratam a emissão tardia como inconsistência. Em SP, o RISS manda emitir "por ocasião da prestação" (art. 81). Para o RPS do sistema paulistano, o prazo é de 10 dias (art. 92).
- **Citação:**
  - Anexo I, campo [107]: "A data de competência deve ser única e ser a mesma que a data do fato gerador do tributo".
  - E0015: "A data de competência informada na DPS não pode ser posterior à data de emissão".
  - Guia Web v1.2: DPS "devendo ser convertido em NFS-e no prazo estipulado pela legislação tributária municipal".
- **Fonte:** Anexo I v1.01 (sha de5bc492959e); Guia Emissor Web v1.2 (sha 85982d1ee76b); RISS SP; 10/10/2026.
- **Grau:** primária.
- **Pergunta reformulada (prefeitura SP / contador):** "Pelo RISS-SP art. 81 e pelo Anexo I (campo dCompet, E0015), entendemos que a NFS-e nacional emitida em mês posterior ao da prestação, com `dCompet` = data da prestação, é aceita e só sujeita a multa por emissão fora do prazo municipal. Qual é esse prazo em SP para a NFS-e do Emissor Nacional? A multa é a da Lei 13.476/2002?"

## 4. PAR-7: lacuna na numeração da DPS é inconsistência?
- **Status:** RESOLVIDA, com parte inferida.
- **Resposta:**
  - Nenhuma regra de negócio rejeita salto na numeração. `nDPS` vai de 1 a 999999999999999.
  - A única trava é a duplicidade contra NFS-e **já gerada** (E0014).
  - A própria Sefin admite lacuna no número da NFS-e: ela "não irá reutilizar números inutilizados".
  - O Guia diz que a DPS tem "numeração sequencial crescente". Isso é orientação, sem regra de rejeição.
- **Citação:** E0014: "Conjunto de Série, Número, Código do Município Emissor e CNPJ/CPF informado nesta DPS já existe em uma NFS-e gerada a partir de uma DPS enviada anteriormente."
- **Fonte:** Anexo I v1.01, linhas 145 e [7] nNFSe; Guia Web v1.2 §9.2; 10/10/2026.
- **Grau:** primária. Que a lacuna "não é inconsistência PNCT" é **inferido**, porque o Ato 5 trata de IBS/CBS.

## 4-bis. L-ADN-2 (Sistema Nacional): número de DPS rejeitada pode ser reusado?
- **Status:** RESOLVIDA (inferido de texto primário).
- **Resposta:** sim. A duplicidade (E0014) só existe contra NFS-e já gerada a partir daquele Id. A DPS rejeitada não gerou NFS-e e o Anexo I não exige registro de inutilização.
- **Citação:** a mesma do E0014 acima ("já existe em uma NFS-e gerada").
- **Fonte / grau:** Anexo I v1.01; primária (texto), inferido (consequência). Confirmação barata: reenviar um número rejeitado na produção restrita.

## 5. P-C2 · PAR-2: local de incidência do ISS para 6.01/6.02/6.03
- **Status:** RESOLVIDA.
- **Resposta:** o ISS é do município do **estabelecimento prestador** (regra geral do art. 3º caput). Os subitens 6.01, 6.02 e 6.03 não estão em nenhum dos incisos I a XXV. O Anexo I confirma: para 060101, 060201 e 060301, a localidade de incidência é "EP" (estabelecimento do prestador). A exceção da lista é o serviço vindo do exterior (inciso I).
- **Citação:** LC 116 art. 3º: "considera-se prestado, e o imposto, devido, no local do estabelecimento prestador [...] exceto nas hipóteses previstas nos incisos I a XXV".
- **Fonte:** Planalto LC 116 (red. LC 157/2016 e LC 218/2025); Anexo I aba MUN.INCID_INFO.SERV. linhas 74–76; 10/10/2026.
- **Grau:** primária.

## 6. DFE-4 · PAR-3: tomador PJ retém ISS do salão? Venda a PF nunca retém?
- **Status:** RESOLVIDA para SP.
- **Resposta:**
  - A LC 116 art. 6º § 2º II lista os subitens com retenção obrigatória do tomador PJ, e 6.01 a 6.03 **não estão** lá.
  - Retenção fora dessa lista depende de lei municipal (art. 6º caput). A Lei SP 13.701 art. 9º também não lista 6.01 a 6.03.
  - Logo, **nenhum tomador estabelecido em SP retém o ISS do salão**.
  - PF: o art. 9º de SP só nomeia PJ, condomínios e entes públicos, então a **venda a PF em SP nunca tem retenção**.
  - Tomador PJ de outro município: o ISS é de SP (item 5), e o outro município não tem competência para exigir a retenção (inferido).
- **Citação:**
  - LC 116 art. 6º caput: "Os Municípios [...] mediante lei, poderão atribuir de modo expresso a responsabilidade".
  - Lei SP 13.701 art. 9º II: "as pessoas jurídicas [...] quando tomarem ou intermediarem os serviços" (lista sem item 6).
- **Fonte:** Planalto LC 116; catálogo SP, Lei 13.701 (última red. de cada inciso); 10/10/2026.
- **Grau:** primária (SP); inferido (tomador de outro município).

## 7. Salão como tomador em SP: retenção e NFTS
- **Status:** RESOLVIDA, com uma ressalva para o prefeito/contador.
- **Resposta:**
  - **Retenção:** o salão (PJ em SP) retém quando toma serviços do art. 9º II. Os mais prováveis num salão: **7.10** (limpeza e conservação de imóveis), **11.02** (vigilância), **17.05** (mão de obra temporária), 3.04, 7.09, 7.12 e 7.14 prestados em SP; e, de prestador de fora de SP, 7.02, 7.04, 7.05, 7.11, 7.15, 7.17, 16.01, 16.02 e 17.09.
  - **Dispensa:** não há retenção se o prestador for autônomo estabelecido em SP, sociedade uniprofissional, isento estabelecido em SP, imune ou **MEI** (art. 10).
  - **NFTS:** o salão emite "por ocasião da contratação" quando: (I) o prestador está **fora de SP**, mesmo sem retenção; (II) o prestador de SP obrigado a emitir NFS-e não emitiu; (III) o prestador desobrigado não deu recibo com os dados mínimos; (IV) o tomador rejeitou a NFS-e (RISS art. 117).
  - **Prazo da NFTS:** dia **10** do mês seguinte se houver retenção, dia **30** nos demais casos (art. 119). O MEI é dispensado de emitir NFTS. O Simples ME/EPP não é.
- **Citação:**
  - RISS art. 117 I: "quando os serviços tiverem sido tomados de prestador estabelecido fora do Município de São Paulo, ainda que não haja obrigatoriedade de retenção".
  - Lei SP 13.701 art. 9º § 4º: o responsável recolhe o imposto integral "independentemente da retenção".
- **Fonte:** catálogo SP (Lei 13.701 arts. 9º e 10; Decreto 53.151 arts. 82, 117 e 119); 10/10/2026. Manual NFTS v3.1 (fev/2026) em notadomilhao.sf.prefeitura.sp.gov.br, só localizado por busca, não baixado.
- **Grau:** primária.
- **Ressalva (PARCIAL dentro do item), pergunta reformulada (contador):** "A Lei SP 13.701 art. 9º-A § 2º ainda manda reter o ISS de prestador de fora de SP não inscrito no CPOM. Mas o caput foi reescrito pela Lei 17.719/2021 ('poderá proceder à sua inscrição'), e o STF, no Tema 1020, afastou a retenção por falta de CPOM (**fonte: conhecimento prévio, não relido nesta sessão**). Entendemos que hoje o salão-tomador não retém por falta de CPOM, só nas hipóteses do art. 9º. Confirma? E a NFTS continua exigida quando o prestador de fora emite NFS-e nacional, compartilhada no ADN?"

## 8. PAR-4: há recolhimento de IBS/CBS em 2026?
- **Status:** RESOLVIDA.
- **Resposta:** em 2026, quem cumpre as obrigações acessórias fica **dispensado do recolhimento** de IBS/CBS (art. 348 § 1º). O valor eventualmente recolhido se compensa com PIS/Cofins (inciso I). As alíquotas de teste **não se aplicam ao Simples** (inciso III c). Auto de infração por falta de acessória dá 60 dias para suprir a omissão, e o atendimento extingue a multa (§§ 3º e 4º, LC 227/2026).
- **Citação:** art. 348 § 1º: "Fica dispensado o recolhimento do IBS e da CBS relativo aos fatos geradores ocorridos no período [...] em relação aos sujeitos passivos que cumprirem as obrigações acessórias previstas na legislação."
- **Fonte:** Planalto LC 214 compilada, art. 348; 10/10/2026.
- **Grau:** primária.

## 9. RISS-SP: quando emitir a NFS-e do pacote pré-pago
- **Status:** RESOLVIDA (para SP).
- **Resposta:** em SP, a NFS-e é emitida **na prestação de cada serviço**, não no pagamento antecipado. A Lei 13.701 art. 6º e o RISS art. 81 dizem "por ocasião da prestação de cada serviço". A SF/DEJUG aplicou isso a **crédito pré-pago** (estacionamento): a venda antecipada não altera o momento da incidência. A SC 11/2020 (cursos pagos antes) vai na mesma linha, segundo o resumo; só a ementa foi lida.
  - **Consequência para o produto (inferida):** em SP, o modo `CONSUMO` do F-DFE 5c é o que confere com a regra municipal. O modo `VENDA` emite antes da prestação, contra o art. 6º.
- **Citação:**
  - SC SF/DEJUG 06/2018, item 7: "não é parâmetro para emissão da Nota Fiscal de Serviços Eletrônica (NFS-e) o mero pagamento antecipado correspondente a eventual prestação futura do serviço".
  - Item 5: a antecipação "não tem o condão de alterar o momento de incidência".
- **Fonte:** PDF oficial da SC 06/2018 (prefeitura.sp.gov.br); catálogo SP (Lei 13.701 art. 6º, red. Lei 15.406/2011; RISS art. 81); 10/10/2026.
- **Grau:** primária. A solução de consulta vincula só a consulente, mas mostra o entendimento da SF.
- **Achado que corrige o repo:** a `PESQUISA-LEGAL-PACOTE-VALIDADE-2026-09-29.md` §4 diz que **não localizou** no RISS a regra de quando emitir com pagamento antecipado. A regra é o art. 81, somado à SC 06/2018.

## 10. PE-4: o saldo vencido sem prestação gera ISS em SP?
- **Status:** PARCIAL.
- **Resposta:**
  - Pela letra, não: o fato gerador é a prestação (LC 116 art. 1º; Lei SP 13.701 art. 1º), e a SF trata a antecipação como irrelevante para a incidência (SC 06/2018).
  - Nenhuma norma ou consulta lida trata da **expiração** do crédito sem uso.
  - O contra-argumento é o Tema 581 do STF ("estar à disposição" como serviço, no plano de saúde), já registrado na pesquisa de jurisprudência de 29/09 e não relido.
  - Cuidado: a Lei SP 13.701 art. 1º § 4º V diz que a incidência "independe [...] do pagamento". Isso corta só num sentido: receber sem prestar não cria o fato gerador.
- **Citação:** LC 116 art. 1º: "tem como fato gerador a prestação de serviços constantes da lista anexa"; SC 06/2018 item 4: "O fato gerador [...] se materializa no momento da efetiva prestação do serviço".
- **Fonte:** Planalto LC 116; SC 06/2018; catálogo SP; 10/10/2026.
- **Grau:** primária (textos); inferido (aplicação ao vencido).
- **Pergunta reformulada (contador; alternativa formal: consulta à SF/DEJUG, Lei SP 14.107/2005 arts. 73–78):** "Pela LC 116 art. 1º, pela Lei SP 13.701 arts. 1º e 6º, pelo RISS art. 81 e pela SC SF/DEJUG 06/2018 (crédito pré-pago tributa só na fruição), entendemos que o valor de pacote que **vence sem nenhuma sessão prestada** não tem fato gerador de ISS em SP e **não leva NFS-e**. Isso vale tanto para o salão no Simples, cujo ISS vai no DAS, quanto no Presumido. Confirma? Se não, qual norma ou entendimento da SF trata a expiração como prestação (por exemplo, a disponibilidade do Tema 581)?" **Efeito no produto:** se a resposta for "confirma", o F-PV-9 (b) (NFS-e no vencimento) contraria a regra. Isso vai ao dono como fork reaberto; o agente não reverte.

## 11. DFE-7 / DFE-8: prazo de cancelamento × substituição; numeração da DPS
- **Status:** RESOLVIDA (estrutura). Os **valores** de SP estão no item 19.
- **Resposta:**
  - Os dois prazos são **parâmetros municipais distintos**. Cancelamento fora do prazo dá E0822. Substituição fora do prazo dá E0050, que tem teto parametrizável de **2 anos** e não se aplica quando cMotivo = 1 ou 2 (des/enquadramento no Simples).
  - O município também parametriza: valor máximo para cancelar (E0823); exigência de tomador identificado para cancelar (E0824) e para substituir (E0056); bloqueio quando há evento de tributos recolhidos (E0827/E0074).
  - Fora do prazo, o cancelamento vira "Solicitação de Análise Fiscal" (evento 101103).
  - A substituição gera um evento de cancelamento por substituição vinculado à nota original.
  - **Numeração:** a série vai até 5 dígitos, com faixas: **00001–49999 aplicativo próprio**, 50000–69999 emissor móvel, 70000–79999 web, 80000–89999 transcrição manual (E0010). `nDPS` tem até 15 dígitos e unicidade só contra NFS-e gerada (E0014).
- **Citação:** Anexo I [113] chSubstda: "O município conveniado [...] deverá parametrizar o prazo máximo permitido para que o emitente da NFS-e possa substituir [...] Prazo máximo parametrizável é 2 anos."
- **Fonte:** Anexo I v1.01 ([105], [106], [113], linhas 144/145/170/171); Anexo II v1.01 (linhas 25–28, cMotivo); Guia Web v1.2 §§5.2–5.3; 10/10/2026.
- **Grau:** primária.

## 12. DFE-TPAMB V2 / V3: "produção restrita" = tpAmb 2? Numeração separada por ambiente?
- **Status:** PARCIAL (V2 resolvida; V3 não documentada).
- **Resposta V2:** sim. O XSD só admite dois ambientes, "1 - Produção; 2 - Homologação". A página oficial de APIs rotula a coluna como "PRODUÇÃO RESTRITA (homologação/testes)". O E0006 rejeita `tpAmb` que diverge do ambiente que recebeu a DPS.
- **Resposta V3:** nenhuma fonte diz se a numeração é compartilhada ou separada. Os ambientes têm hosts distintos (`sefin.producaorestrita.nfse.gov.br` × `sefin.nfse.gov.br`). Separar a sequência é a escolha segura (inferido), mas não há exigência escrita.
- **Citação:**
  - XSD `TSTipoAmbiente`: "1 - Produção; 2 - Homologação".
  - Página gov.br: "PRODUÇÃO RESTRITA (homologação/testes)".
- **Fonte:** XSD v1.01 `tiposSimples_v1.01.xsd` linhas 57–63; página apis-prod-restrita-e-producao (atualizada em 20/08/2026); Anexo I E0006; 10/10/2026.
- **Grau:** primária (V2); inferido (V3).
- **Pergunta reformulada (CGNFS-e, canal de atendimento do gov.br/nfse; ou teste na produção restrita):** "Pelo Anexo I (E0014, unicidade de série+número+município+CNPJ contra NFS-e gerada) e pela existência de dois ambientes com host próprio, entendemos que a NFS-e gerada na produção restrita não conta para a unicidade da produção, e que a sequência da DPS pode recomeçar ou ser separada por ambiente. Confirma?"

## 13. IA-1 / IA-2: a API expõe parâmetros municipais de prazo? Anexo IV do ADN
- **Status:** PARCIAL (IA-1); RESOLVIDA (IA-2).
- **Resposta IA-1:** a API de Parâmetros Municipais existe. Endpoints: `GET /parametros_municipais/{codigoMunicipio}/convenio` ("parâmetros do convênio"), `/{codigoServico}` (alíquotas, regimes, deduções) e `/{CPF/CNPJ}` (retenções e benefícios). O manual **não lista** os campos do convênio, então não dá para afirmar que o prazo de cancelamento/substituição aparece ali. O swagger exige mTLS e não foi lido.
- **Resposta IA-2:** o Anexo IV (ADN v1.00) traz as regras de recepção de lote e a matriz de distribuição por NSU (eventos de cancelamento, substituição, análise fiscal, manifestação, bloqueio). O Manual de APIs do ADN expõe `GET /NFSe/{ChaveAcesso}/Eventos` e `GET /DFe/{NSU}`, aceitando certificado com **o mesmo CNPJ raiz**.
- **Citação:**
  - Manual Emissor API §1.2.1 a): "GET – /parametros_municipais/{codigoMunicipio}/convenio — Consulta os parâmetros do convênio de um município."
  - Manual ADN §1.1: consultas "podem ser realizadas utilizando um certificado cujo CNPJ tenha o mesmo CNPJ Raiz".
- **Fonte:** Manual Contribuintes Emissor API v1.2 (sha ac2f36e34ff5); Manual APIs ADN (sha 9ffc97d8b1be); Anexo IV ADN v1.00 (sha fa778d0b6e58); Manual Municípios v1.2; 10/10/2026.
- **Grau:** primária.
- **Próximo passo IA-1 (não é pergunta de lei; é medição):** no D5, com o A1 em homologação, chamar `GET /parametros_municipais/3550308/convenio` e colar o JSON. Ele diz se o prazo vem por API ou se a tela mostra só o erro (E0822/E0050).

## 14. `cTribNac`: formato × subitem
- **Status:** RESOLVIDA.
- **Resposta:** 6 dígitos, na ordem item(2) + subitem(2) + desdobro nacional(2). Para o salão: **060101** (6.01), **060201** (6.02), **060301** (6.03). Cada subitem tem um único desdobro "01".
- **Citação:** XSD `TSCodTribNac`: "6 dígitos numéricos sendo: 2 para Item (LC 116/2003), 2 para Subitem (LC 116/2003) e 2 para Desdobro Nacional", pattern `[0-9]{6}`.
- **Fonte:** XSD v1.01 linhas 1358–1367; Anexo B v1.01 linhas 123–128; Anexo I RN 398 (cita "060101, 060201"); 10/10/2026.
- **Grau:** primária. Atenção: a planilha grava `60101` como número, e quem a importar perde o zero à esquerda.

## 15. O leiaute da DPS tem e-mail e telefone do tomador?
- **Status:** RESOLVIDA.
- **Resposta:** sim, os dois opcionais (0-1). `toma/fone` [164], numérico com 6 a 20 dígitos (DDD + número); `toma/email` [165], até 80 caracteres, rejeitado se malformado (E0247).
- **Citação:** Anexo I [165]: "NFSe/infNFSe/DPS/infDPS/toma/ | email | E | C | 0-1 | 1-80 | E-mail do tomador."
- **Fonte:** Anexo I v1.01 linhas 644–645 e 1171; 10/10/2026.
- **Grau:** primária.

## 16. Guarda do XML de NFS-e cancelada
- **Status:** RESOLVIDA (regra); a contagem em anos é inferida.
- **Resposta:** guardar **até a prescrição** dos créditos das operações a que o documento se refere (CTN art. 195 p.ú.). SP repete a regra na Lei 6.989 art. 70 (red. Lei 13.701 art. 18) e no RISS art. 125. Não existe "5 anos" escrito. O prazo resulta da decadência (CTN art. 150 § 4º: 5 anos do fato gerador; ou art. 173 I: 5 anos do 1º dia do exercício seguinte) **somada** à prescrição (art. 174: 5 anos da constituição definitiva). Nada distingue nota cancelada de nota válida.
- **Citação:** CTN art. 195 p.ú.: "serão conservados até que ocorra a prescrição dos créditos tributários decorrentes das operações a que se refiram."
- **Fonte:** Planalto CTN compilado; catálogo SP (Lei 13.701 art. 18; RISS art. 125); 10/10/2026.
- **Grau:** primária (regra); inferido (que o prazo prático passa de 5 anos quando há lançamento ou discussão).

## 17. PAR-5: devolução na NFS-e
- **Status:** PARCIAL.
- **Resposta:** o leiaute não tem evento nem nota de "devolução" de serviço. Os instrumentos são: o **cancelamento**, com cMotivo 1 (erro), **2 (serviço não prestado)** ou 9 (outros), dentro do prazo municipal e sem tributo recolhido se o município bloquear; a **análise fiscal** fora do prazo; e a **substituição** (até 2 anos). O grupo `gReeRepRes` trata de reembolso e repasse de terceiros, não de devolução ao cliente. O efeito tributário de devolver dinheiro depois que o cancelamento não é mais possível é questão de lei municipal.
- **Citação:** Anexo II, e101101 cMotivo: "1 - Erro na Emissão; 2 - Serviço não Prestado; 9 - Outros".
- **Fonte:** Anexo II v1.01 linha 73; Anexo I [113] e RNs E0822/E0827; 10/10/2026.
- **Grau:** primária (leiaute).
- **Pergunta reformulada (contador):** "Pelo leiaute nacional (Anexo II, cancelamento com cMotivo 2 e análise fiscal fora do prazo), entendemos que reembolsar uma sessão já faturada exige cancelar ou substituir a NFS-e. Depois do prazo e com ISS pago (no DAS, no Simples), o caminho é pedir restituição ou compensar na prefeitura (RISS art. 94 § 1º). Uma 'NFS-e de devolução' não existe. Confirma? No Simples, o valor devolvido sai da receita bruta do PGDAS-D do mês da devolução ou exige retificação da competência original?"

## 18. DFE-9 · DFE p11: o e-CNPJ da matriz vale para as filiais?
- **Status:** PARCIAL.
- **Resposta:** depende da operação.
  - **Consulta no ADN:** vale, porque a API aceita certificado com o mesmo CNPJ raiz.
  - **Eventos:** vale. O autor é conferido "apenas o CNPJ base" (E0812).
  - **Assinatura da DPS:** o E0718 diz só "certificado digital do emitente da DPS", **sem** a ressalva de raiz que o NF-e tem (MOC 7.0, rejeição 213, que compara CNPJ-Base; corpus `TRANSCRICAO-MOC70`). Não há fonte primária que permita a DPS da filial assinada pelo A1 da matriz.
- **Citação:**
  - Anexo II, linha 160: "Verificar apenas o CNPJ base."
  - Anexo I E0718: "A assinatura deve ser feita com o certificado digital do emitente da DPS."
- **Fonte:** Anexo I v1.01 linha 1546; Anexo II v1.01 linha 160; Manual APIs ADN §1.1; 10/10/2026.
- **Grau:** primária (textos); a dúvida sobre o E0718 é de interpretação.
- **Pergunta reformulada (CGNFS-e; ou teste na produção restrita = runbook D5):** "O Anexo II (E0812) compara só o CNPJ base no evento, e o Manual do ADN aceita o CNPJ raiz na consulta. Entendemos que o E0718 (assinatura da DPS) exige o CNPJ completo do emitente, ou seja, a filial precisa de e-CNPJ próprio para emitir. Confirma, ou o E0718 também compara só a raiz?"

## 19. X11 PV-1: prazos de cancelamento e substituição em SP capital
- **Status:** PARCIAL.
- **Resposta:**
  - No **sistema paulistano**, o RISS art. 94 permite cancelar "antes do pagamento do Imposto". Depois do pagamento, o cancelamento vai por processo ou pelo sistema, "na forma e condições estabelecidas" pela SF. Não se pode cancelar nem substituir nota "recebida e aceita pelo responsável tributário" (§ 2º).
  - Fontes **secundárias** falam em 6 meses da emissão com ISS não pago. **Não verificado.**
  - Para a **NFS-e nacional** emitida por contribuinte de SP, os valores são os parâmetros que SP cadastrou no Sistema Nacional (item 11). Eles não foram lidos.
- **Citação:** RISS art. 94: "A NFS-e poderá ser cancelada pelo emitente, por meio do sistema da NFS-e, antes do pagamento do Imposto."
- **Fonte:** catálogo SP, Decreto 53.151 arts. 94–95 (red. Decreto 56.224/2015); 10/10/2026.
- **Grau:** primária (paulistano); secundária (6 meses).
- **Pergunta reformulada (prefeitura SP / contador; ou medição PV-1 no D5):** "Pelo Anexo I/II (E0822, E0050, E0824, E0056), os prazos da NFS-e nacional são parâmetros que SP cadastra no Sistema Nacional. Quais são, em dias, para cancelamento e substituição, e SP exige tomador identificado? O prazo do RISS art. 94 ('antes do pagamento do imposto') vale também para a nota nacional do optante pelo Simples, cujo ISS vai no DAS?"

## 20. Alíquota e benefício de ISS em SP para 6.01/6.02/6.03 (item A5 do pedido ao contador; D1f)
- **Status:** RESOLVIDA.
- **Resposta:**
  - **5%.** O art. 16 da Lei 13.701 dá 2% (inciso I) a uma lista que inclui 6.04 (ginástica), mas **não** 6.01, 6.02 ou 6.03. Esses subitens também não estão nos incisos II (2,5%) e III (2,9%). Caem no inciso IV: "5,0% para os demais serviços".
  - Não há benefício municipal para o item 6 na lei. A LC 116 art. 8º-A § 1º proíbe benefício que resulte em carga abaixo de 2%.
  - **Para o Simples**, o ISS do salão sai pela alíquota efetiva do Anexo da LC 123, dentro do DAS, e não por esses 5%. A alíquota municipal só importa se o salão sair do Simples, ultrapassar o sublimite ou for do Presumido ou Real (inferido da LC 123 art. 18, não relido nesta sessão).
- **Citação:** Lei SP 13.701 art. 16 IV: "5,0% (cinco por cento) para os demais serviços descritos na lista do 'caput' do art. 1°" (red. Lei 16.272/2015). O inciso I a) está na red. da Lei 18.066/2023, com lista sem o 6.01–6.03.
- **Fonte:** catálogo SP, Lei 13.701 art. 16 (todas as redações empilhadas, a última é de 2023); Planalto LC 116 art. 8º-A; 10/10/2026.
- **Grau:** primária. Limite: alteração posterior a 2023 que o catálogo ainda não mostre.
- **Para o pedido ao contador (A5), pergunta assertiva:** "Pela Lei SP 13.701 art. 16 IV, a alíquota de ISS em SP para 6.01/6.02/6.03 é 5%, sem benefício municipal. No Simples, vale a alíquota efetiva do Anexo da LC 123 no DAS. Confirma? Falta só o `cClassTrib` de IBS/CBS de cada serviço."

---

## Resumo

**Contagem (21 itens):**
- RESOLVIDA (12): 4, 4-bis, 5, 6, 7, 8, 9, 11, 14, 15, 16, 20.
- PARCIAL (9): 1, 2, 3, 10, 12, 13, 17, 18, 19.
- NÃO ALCANÇADA: 0.

**As que mais destravam:**
1. **PE-4 / RISS (itens 9 e 10):**
   - Em SP, a NFS-e sai na prestação, e o pagamento antecipado não é parâmetro de emissão (SC SF/DEJUG 06/2018, sobre crédito pré-pago).
   - O vencido sem prestação não tem fato gerador pela letra da lei. Nenhuma norma trata da expiração, e o Tema 581 continua como contra-argumento.
   - Se o contador confirmar, o F-PV-9 (b) (NFS-e no vencimento) contraria a regra, e o modo `VENDA` emite antes da prestação. As duas coisas vão ao dono.
2. **Alíquota de ISS em SP (item 20):** 5% para 6.01–6.03, sem benefício. No Simples vale o DAS. Isso fecha a metade "alíquota" do D1f/A5.
3. **Retenção (itens 6 e 7):** ninguém retém o ISS do salão em SP, e a PF nunca retém. Como tomador, o salão retém em 7.10, 11.02, 17.05 e outros, e emite NFTS para prestador de fora de SP. Os prazos são dia 10 com retenção e dia 30 sem.
4. **PNCT (item 1):** só alcança IBS/CBS em documento fiscal, com retificação até 31/12/2026 e contador indicado por procuração eletrônica. Pelo art. 348 III c (inferido), não alcança o Simples em 2026.

**Perguntas reformuladas (destino):**
- Contador: itens 1, 2, 7 (CPOM e NFTS × ADN), 10 (PE-4), 17 (devolução), 20 (confirmação do A5).
- Prefeitura SP: itens 3 (prazo de emissão tardia), 19 (prazos da nota nacional). O item 10 pode virar consulta formal à SF/DEJUG.
- CGNFS-e, ou teste na produção restrita / runbook D5: itens 12 (V3), 13 (JSON do convênio), 18 (E0718 × filial).

**Caso adversarial tentado:** procurei derrubar o "5%" buscando uma redação do art. 16 posterior a 2023 e
benefício para o item 6 em outro dispositivo da Lei 13.701. Não achei; a última alteração listada é a Lei
18.066/2023. Procurei também derrubar o "pré-pago não emite NFS-e" com a Lei 13.701 art. 1º § 4º V (a incidência
"independe do pagamento"): o dispositivo só reforça que receber não é o fato gerador. **Checagem que teria
falhado se eu estivesse errado:** os sha256 dos 8 documentos do gov.br/nfse batem com o MANIFEST. Se o órgão
tivesse reeditado algum, o hash teria mudado e a citação precisaria ser reconferida.
